/**
 * Webhook Trigger Module
 *
 * Scheduled function to process content events and trigger configured webhooks.
 * Supports retry logic with exponential backoff and delivery confirmation.
 *
 * Architecture:
 * 1. Events are captured via the event emitter system (cmsEvents table)
 * 2. A background processor polls for unprocessed events
 * 3. For each event, matching webhook configurations are found
 * 4. Delivery records are created and HTTP requests are dispatched
 * 5. Success/failure is tracked with automatic retry for failures
 *
 * Security Features:
 * - HMAC-SHA256 signature generation for payload verification
 * - Configurable timeout to prevent hanging requests
 * - Secret keys never exposed in API responses
 *
 * Retry Behavior:
 * - Exponential backoff: 1min, 5min, 15min, 1hr, 4hr (configurable)
 * - Automatic retry scheduling via Convex scheduler
 * - Maximum retry limit per webhook configuration
 *
 * @module
 */

import { v } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import {
	mutation,
	query,
	internalMutation,
	internalQuery,
	// action,
	internalAction,
} from "./_generated/server.js";
import {
	internal,
	// api
} from "./_generated/api.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Webhook delivery status.
 */
export type WebhookDeliveryStatus =
	| "pending"
	| "processing"
	| "delivered"
	| "failed"
	| "retrying";

/**
 * Configuration for the webhook processor.
 */
export interface WebhookProcessorConfig {
	/**
	 * Maximum number of events to process in a single batch.
	 * @default 50
	 */
	batchSize?: number;

	/**
	 * Interval in milliseconds for the background polling job.
	 * @default 60000 (1 minute)
	 */
	pollingIntervalMs?: number;

	/**
	 * Default timeout for webhook requests in milliseconds.
	 * @default 30000 (30 seconds)
	 */
	defaultTimeoutMs?: number;

	/**
	 * Default maximum retry attempts.
	 * @default 5
	 */
	defaultMaxRetries?: number;
}

/**
 * Result of processing webhook events.
 */
export interface ProcessWebhooksResult {
	/** Number of events processed */
	eventsProcessed: number;
	/** Number of deliveries queued */
	deliveriesQueued: number;
	/** Number of deliveries sent successfully */
	deliveriesSucceeded: number;
	/** Number of deliveries that failed (will retry or exhausted) */
	deliveriesFailed: number;
	/** Whether there are more events to process */
	hasMore: boolean;
	/** Errors encountered */
	errors: Array<{ webhookId: string; eventId: string; error: string }>;
}

/**
 * Webhook payload structure sent to endpoints.
 */
export interface WebhookPayload {
	/** Unique delivery ID for idempotency */
	deliveryId: string;
	/** Event type (e.g., "contentEntry.published") */
	eventType: string;
	/** Resource type that triggered the event */
	resourceType: string;
	/** ID of the affected resource */
	resourceId: string;
	/** Action performed on the resource */
	action: string;
	/** Event-specific payload data */
	data: unknown;
	/** ISO timestamp when the event occurred */
	timestamp: string;
	/** User who triggered the event (if known) */
	userId?: string;
}

/**
 * Statistics about webhook deliveries.
 */
export interface WebhookStats {
	/** Total webhooks configured */
	totalWebhooks: number;
	/** Active webhooks */
	activeWebhooks: number;
	/** Pending deliveries */
	pendingDeliveries: number;
	/** Deliveries awaiting retry */
	retryingDeliveries: number;
	/** Deliveries in the last 24 hours */
	deliveriesLast24h: number;
	/** Success rate in the last 24 hours */
	successRateLast24h: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default configuration values.
 */
export const DEFAULT_WEBHOOK_CONFIG = {
	batchSize: 50,
	pollingIntervalMs: 60000, // 1 minute
	defaultTimeoutMs: 30000, // 30 seconds
	defaultMaxRetries: 5,
};

/**
 * Exponential backoff delays in milliseconds.
 * Attempt 1: 1 minute
 * Attempt 2: 5 minutes
 * Attempt 3: 15 minutes
 * Attempt 4: 1 hour
 * Attempt 5: 4 hours
 */
export const RETRY_DELAYS_MS = [
	1 * 60 * 1000, // 1 minute
	5 * 60 * 1000, // 5 minutes
	15 * 60 * 1000, // 15 minutes
	60 * 60 * 1000, // 1 hour
	4 * 60 * 60 * 1000, // 4 hours
];

/**
 * Maximum response body length to store (truncated for storage).
 */
const MAX_RESPONSE_BODY_LENGTH = 1000;

// =============================================================================
// Validators
// =============================================================================

/**
 * Validator for webhook delivery status.
 */
export const webhookDeliveryStatusValidator = v.union(
	v.literal("pending"),
	v.literal("processing"),
	v.literal("delivered"),
	v.literal("failed"),
	v.literal("retrying"),
);

/**
 * Validator for creating a webhook configuration.
 */
export const createWebhookArgs = v.object({
	/** Human-readable name for the webhook */
	name: v.string(),
	/** Optional description */
	description: v.optional(v.string()),
	/** Target URL (must be HTTPS in production) */
	url: v.string(),
	/** Secret for HMAC signature (optional but recommended) */
	secret: v.optional(v.string()),
	/** Event types to subscribe to (e.g., ["contentEntry.published"]) */
	eventTypes: v.array(v.string()),
	/** Filter by resource types (optional) */
	resourceTypes: v.optional(
		v.array(
			v.union(
				v.literal("contentEntry"),
				v.literal("contentType"),
				v.literal("mediaAsset"),
				v.literal("mediaFolder"),
			),
		),
	),
	/** Filter by content types (optional, for contentEntry events) */
	contentTypes: v.optional(v.array(v.string())),
	/** Additional HTTP headers */
	headers: v.optional(v.any()),
	/** Whether the webhook is enabled (default: true) */
	enabled: v.optional(v.boolean()),
	/** Maximum retry attempts (default: 5) */
	maxRetries: v.optional(v.number()),
	/** Request timeout in ms (default: 30000) */
	timeoutMs: v.optional(v.number()),
	/** User creating the webhook */
	createdBy: v.optional(v.string()),
});

/**
 * Validator for updating a webhook configuration.
 */
export const updateWebhookArgs = v.object({
	/** Webhook ID to update */
	id: v.id("webhookConfigs"),
	/** New name */
	name: v.optional(v.string()),
	/** New description */
	description: v.optional(v.string()),
	/** New URL */
	url: v.optional(v.string()),
	/** New secret (set to empty string to remove) */
	secret: v.optional(v.string()),
	/** New event types filter */
	eventTypes: v.optional(v.array(v.string())),
	/** New resource types filter */
	resourceTypes: v.optional(
		v.array(
			v.union(
				v.literal("contentEntry"),
				v.literal("contentType"),
				v.literal("mediaAsset"),
				v.literal("mediaFolder"),
			),
		),
	),
	/** New content types filter */
	contentTypes: v.optional(v.array(v.string())),
	/** New headers */
	headers: v.optional(v.any()),
	/** Enable/disable the webhook */
	enabled: v.optional(v.boolean()),
	/** New max retries */
	maxRetries: v.optional(v.number()),
	/** New timeout */
	timeoutMs: v.optional(v.number()),
	/** User performing the update */
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for deleting a webhook configuration.
 */
export const deleteWebhookArgs = v.object({
	/** Webhook ID to delete */
	id: v.id("webhookConfigs"),
	/** Hard delete (true) or soft delete (false, default) */
	hardDelete: v.optional(v.boolean()),
	/** User performing the deletion */
	deletedBy: v.optional(v.string()),
});

/**
 * Validator for webhook configuration document (return type).
 */
export const webhookConfigDoc = v.object({
	_id: v.id("webhookConfigs"),
	_creationTime: v.number(),
	name: v.string(),
	description: v.optional(v.string()),
	url: v.string(),
	// Note: secret is NOT included in return type for security
	eventTypes: v.array(v.string()),
	resourceTypes: v.optional(
		v.array(
			v.union(
				v.literal("contentEntry"),
				v.literal("contentType"),
				v.literal("mediaAsset"),
				v.literal("mediaFolder"),
			),
		),
	),
	contentTypes: v.optional(v.array(v.string())),
	headers: v.optional(v.any()),
	enabled: v.boolean(),
	maxRetries: v.optional(v.number()),
	timeoutMs: v.optional(v.number()),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
});

/**
 * Validator for webhook delivery document.
 */
export const webhookDeliveryDoc = v.object({
	_id: v.id("webhookDeliveries"),
	_creationTime: v.number(),
	webhookId: v.id("webhookConfigs"),
	eventId: v.id("cmsEvents"),
	eventType: v.string(),
	status: webhookDeliveryStatusValidator,
	attemptCount: v.number(),
	maxAttempts: v.number(),
	lastAttemptAt: v.optional(v.number()),
	nextRetryAt: v.optional(v.number()),
	lastStatusCode: v.optional(v.number()),
	lastError: v.optional(v.string()),
	lastResponseBody: v.optional(v.string()),
	lastDurationMs: v.optional(v.number()),
	payload: v.any(),
	deliveredAt: v.optional(v.number()),
});

// =============================================================================
// Webhook Configuration CRUD
// =============================================================================

/**
 * Create a new webhook configuration.
 *
 * @example
 * ```typescript
 * const webhookId = await ctx.runMutation(api.webhookTrigger.createWebhook, {
 *   name: "CDN Invalidation",
 *   url: "https://api.example.com/webhooks/cms",
 *   secret: "my-secret-key",
 *   eventTypes: ["contentEntry.published", "contentEntry.deleted"],
 * });
 * ```
 */
export const createWebhook = mutation({
	args: createWebhookArgs.fields,
	returns: v.id("webhookConfigs"),
	handler: async (ctx, args) => {
		const {
			name,
			description,
			url,
			secret,
			eventTypes,
			resourceTypes,
			contentTypes,
			headers,
			enabled = true,
			maxRetries = DEFAULT_WEBHOOK_CONFIG.defaultMaxRetries,
			timeoutMs = DEFAULT_WEBHOOK_CONFIG.defaultTimeoutMs,
			createdBy,
		} = args;

		// Validate URL format
		try {
			const parsedUrl = new URL(url);
			// Warn about non-HTTPS URLs (but allow for development)
			if (parsedUrl.protocol !== "https:") {
				console.warn(
					`Webhook URL is not HTTPS: ${url}. ` +
						"HTTPS is required for production security.",
				);
			}
		} catch {
			throw new Error(`Invalid webhook URL: ${url}`);
		}

		// Validate event types format
		for (const eventType of eventTypes) {
			if (!eventType.includes(".")) {
				throw new Error(
					`Invalid event type format: "${eventType}". ` +
						'Expected format: "resourceType.action" (e.g., "contentEntry.published")',
				);
			}
		}

		const webhookId = await ctx.db.insert("webhookConfigs", {
			name,
			description,
			url,
			secret,
			eventTypes,
			resourceTypes,
			contentTypes,
			headers,
			enabled,
			maxRetries,
			timeoutMs,
			createdBy,
		});

		return webhookId;
	},
});

/**
 * Update an existing webhook configuration.
 */
export const updateWebhook = mutation({
	args: updateWebhookArgs.fields,
	returns: webhookConfigDoc,
	handler: async (ctx, args) => {
		const { id, ...updates } = args;

		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new Error(`Webhook not found: ${id}`);
		}
		if (isDeleted(existing)) {
			throw new Error(`Webhook has been deleted: ${id}`);
		}

		// Validate URL if being updated
		if (updates.url) {
			try {
				new URL(updates.url);
			} catch {
				throw new Error(`Invalid webhook URL: ${updates.url}`);
			}
		}

		// Validate event types if being updated
		if (updates.eventTypes) {
			for (const eventType of updates.eventTypes) {
				if (!eventType.includes(".")) {
					throw new Error(
						`Invalid event type format: "${eventType}". ` +
							'Expected format: "resourceType.action"',
					);
				}
			}
		}

		// Build update object, excluding undefined values
		const updateData: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				updateData[key] = value;
			}
		}

		await ctx.db.patch(id, updateData);

		const updated = await ctx.db.get(id);
		if (!updated) {
			throw new Error("Failed to retrieve updated webhook");
		}

		// Return without secret
		const { secret: _secret, ...safeWebhook } = updated;
		return safeWebhook as typeof updated;
	},
});

/**
 * Delete a webhook configuration.
 */
export const deleteWebhook = mutation({
	args: deleteWebhookArgs.fields,
	returns: v.object({
		success: v.boolean(),
		message: v.string(),
	}),
	handler: async (ctx, args) => {
		const { id, hardDelete = false, deletedBy } = args;

		const webhook = await ctx.db.get(id);
		if (!webhook) {
			throw new Error(`Webhook not found: ${id}`);
		}

		if (hardDelete) {
			// Delete all delivery records for this webhook
			const deliveries = await ctx.db
				.query("webhookDeliveries")
				.withIndex("by_webhook", (q) => q.eq("webhookId", id))
				.collect();

			for (const delivery of deliveries) {
				await ctx.db.delete(delivery._id);
			}

			// Delete the webhook
			await ctx.db.delete(id);

			return {
				success: true,
				message: `Webhook "${webhook.name}" permanently deleted with ${deliveries.length} delivery records`,
			};
		} else {
			// Soft delete
			await ctx.db.patch(id, {
				deletedAt: Date.now(),
				enabled: false,
				updatedBy: deletedBy,
			});

			return {
				success: true,
				message: `Webhook "${webhook.name}" soft-deleted`,
			};
		}
	},
});

/**
 * Restore a soft-deleted webhook.
 */
export const restoreWebhook = mutation({
	args: {
		id: v.id("webhookConfigs"),
		restoredBy: v.optional(v.string()),
	},
	returns: webhookConfigDoc,
	handler: async (ctx, args) => {
		const { id, restoredBy } = args;

		const webhook = await ctx.db.get(id);
		if (!webhook) {
			throw new Error(`Webhook not found: ${id}`);
		}
		if (!isDeleted(webhook)) {
			throw new Error(`Webhook is not deleted: ${id}`);
		}

		await ctx.db.patch(id, {
			deletedAt: undefined,
			updatedBy: restoredBy,
		});

		const restored = await ctx.db.get(id);
		if (!restored) {
			throw new Error("Failed to retrieve restored webhook");
		}

		const { secret: _secret, ...safeWebhook } = restored;
		return safeWebhook as typeof restored;
	},
});

/**
 * Get a single webhook configuration by ID.
 * Note: Secret is not returned for security.
 */
export const getWebhook = query({
	args: {
		id: v.id("webhookConfigs"),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.union(webhookConfigDoc, v.null()),
	handler: async (ctx, args) => {
		const { id, includeDeleted = false } = args;

		const webhook = await ctx.db.get(id);
		if (!webhook) return null;

		if (!includeDeleted && isDeleted(webhook)) {
			return null;
		}

		const { secret: _secret, ...safeWebhook } = webhook;
		return safeWebhook as typeof webhook;
	},
});

/**
 * List all webhook configurations with optional filtering.
 */
export const listWebhooks = query({
	args: {
		enabled: v.optional(v.boolean()),
		includeDeleted: v.optional(v.boolean()),
		limit: v.optional(v.number()),
	},
	returns: v.array(webhookConfigDoc),
	handler: async (ctx, args) => {
		const { enabled, includeDeleted = false, limit = 50 } = args;

		let webhooks;

		if (enabled !== undefined) {
			webhooks = await ctx.db
				.query("webhookConfigs")
				.withIndex("by_enabled", (q) => q.eq("enabled", enabled))
				.take(limit * 2);
		} else {
			webhooks = await ctx.db
				.query("webhookConfigs")
				.order("desc")
				.take(limit * 2);
		}

		// Filter deleted
		if (!includeDeleted) {
			webhooks = webhooks.filter((w) => !isDeleted(w));
		}

		// Remove secrets before returning
		return webhooks.slice(0, limit).map((webhook) => {
			const { secret: _secret, ...safeWebhook } = webhook;
			return safeWebhook as typeof webhook;
		});
	},
});

// =============================================================================
// Event Processing & Delivery
// =============================================================================

/**
 * Internal query to get webhooks matching an event.
 */
export const getMatchingWebhooks = internalQuery({
	args: {
		eventType: v.string(),
		resourceType: v.union(
			v.literal("contentEntry"),
			v.literal("contentType"),
			v.literal("mediaAsset"),
			v.literal("mediaFolder"),
		),
		contentTypeName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { eventType, resourceType, contentTypeName } = args;

		// Get all enabled webhooks
		const webhooks = await ctx.db
			.query("webhookConfigs")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect();

		// Filter to matching webhooks
		return webhooks.filter((webhook) => {
			// Check event type filter
			if (
				webhook.eventTypes.length > 0 &&
				!webhook.eventTypes.includes(eventType)
			) {
				return false;
			}

			// Check resource type filter
			if (
				webhook.resourceTypes &&
				webhook.resourceTypes.length > 0 &&
				!webhook.resourceTypes.includes(resourceType)
			) {
				return false;
			}

			// Check content type filter (only for contentEntry events)
			if (
				resourceType === "contentEntry" &&
				webhook.contentTypes &&
				webhook.contentTypes.length > 0 &&
				contentTypeName &&
				!webhook.contentTypes.includes(contentTypeName)
			) {
				return false;
			}

			return true;
		});
	},
});

/**
 * Internal query to get unprocessed events for webhook delivery.
 */
export const getUnprocessedWebhookEvents = internalQuery({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { limit = 50 } = args;

		// Get unprocessed events
		const events = await ctx.db
			.query("cmsEvents")
			.withIndex("by_processed", (q) => q.eq("processed", false))
			.order("asc")
			.take(limit);

		return events;
	},
});

/**
 * Internal query to get pending or retrying deliveries.
 */
export const getPendingDeliveries = internalQuery({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { limit = 50 } = args;
		const now = Date.now();

		// Get pending deliveries
		const pending = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.take(limit);

		// Get retrying deliveries whose retry time has passed
		const retrying = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "retrying"))
			.filter((q) =>
				q.or(
					q.eq(q.field("nextRetryAt"), undefined),
					q.lte(q.field("nextRetryAt"), now),
				),
			)
			.take(limit);

		return [...pending, ...retrying].slice(0, limit);
	},
});

/**
 * Internal mutation to create a delivery record for an event-webhook pair.
 */
export const createDelivery = internalMutation({
	args: {
		webhookId: v.id("webhookConfigs"),
		eventId: v.id("cmsEvents"),
		eventType: v.string(),
		maxAttempts: v.number(),
		payload: v.any(),
	},
	returns: v.id("webhookDeliveries"),
	handler: async (ctx, args) => {
		const { webhookId, eventId, eventType, maxAttempts, payload } = args;

		// Check if delivery already exists for this webhook-event pair
		const existing = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_event", (q) => q.eq("eventId", eventId))
			.filter((q) => q.eq(q.field("webhookId"), webhookId))
			.first();

		if (existing) {
			// Already exists, return existing ID
			return existing._id;
		}

		const deliveryId = await ctx.db.insert("webhookDeliveries", {
			webhookId,
			eventId,
			eventType,
			status: "pending",
			attemptCount: 0,
			maxAttempts,
			payload,
		});

		return deliveryId;
	},
});

/**
 * Internal mutation to update delivery status after an attempt.
 */
export const updateDeliveryStatus = internalMutation({
	args: {
		deliveryId: v.id("webhookDeliveries"),
		status: webhookDeliveryStatusValidator,
		statusCode: v.optional(v.number()),
		error: v.optional(v.string()),
		responseBody: v.optional(v.string()),
		durationMs: v.optional(v.number()),
		nextRetryAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const {
			deliveryId,
			status,
			statusCode,
			error,
			responseBody,
			durationMs,
			nextRetryAt,
		} = args;

		const delivery = await ctx.db.get(deliveryId);
		if (!delivery) {
			throw new Error(`Delivery not found: ${deliveryId}`);
		}

		const now = Date.now();
		const updates: Record<string, unknown> = {
			status,
			lastAttemptAt: now,
			attemptCount: delivery.attemptCount + 1,
		};

		if (statusCode !== undefined) {
			updates.lastStatusCode = statusCode;
		}
		if (error !== undefined) {
			updates.lastError = error;
		}
		if (responseBody !== undefined) {
			updates.lastResponseBody = responseBody.slice(
				0,
				MAX_RESPONSE_BODY_LENGTH,
			);
		}
		if (durationMs !== undefined) {
			updates.lastDurationMs = durationMs;
		}
		if (nextRetryAt !== undefined) {
			updates.nextRetryAt = nextRetryAt;
		}
		if (status === "delivered") {
			updates.deliveredAt = now;
		}

		await ctx.db.patch(deliveryId, updates);
	},
});

/**
 * Internal mutation to mark delivery as processing.
 */
export const markDeliveryProcessing = internalMutation({
	args: {
		deliveryId: v.id("webhookDeliveries"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.deliveryId, {
			status: "processing",
		});
	},
});

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 *
 * @param payload - The JSON payload to sign
 * @param secret - The secret key for signing
 * @returns Hex-encoded signature
 */
async function generateSignature(
	payload: string,
	secret: string,
): Promise<string> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secret);
	const data = encoder.encode(payload);

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
	const hashArray = Array.from(new Uint8Array(signature));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Internal action to send a webhook delivery.
 * Actions are needed for HTTP requests to external services.
 */
export const sendWebhookDelivery = internalAction({
	args: {
		deliveryId: v.id("webhookDeliveries"),
	},
	handler: async (ctx, args) => {
		const { deliveryId } = args;

		// Get delivery and webhook info
		const delivery = await ctx.runQuery(
			internal.webhookTrigger.getDeliveryWithWebhook,
			{ deliveryId },
		);

		if (!delivery) {
			console.error(`Delivery not found: ${deliveryId}`);
			return;
		}

		const { webhook, ...deliveryData } = delivery;

		// Mark as processing
		await ctx.runMutation(internal.webhookTrigger.markDeliveryProcessing, {
			deliveryId,
		});

		const payload = JSON.stringify(deliveryData.payload);
		const startTime = Date.now();

		try {
			// Build headers
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				"X-Webhook-Delivery-Id": deliveryId,
				"X-Webhook-Event-Type": deliveryData.eventType,
				...(webhook.headers || {}),
			};

			// Add signature if secret is configured
			if (webhook.secret) {
				const signature = await generateSignature(payload, webhook.secret);
				headers["X-Webhook-Signature"] = `sha256=${signature}`;
			}

			// Send request with timeout
			const controller = new AbortController();
			const timeoutMs =
				webhook.timeoutMs || DEFAULT_WEBHOOK_CONFIG.defaultTimeoutMs;
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

			const response = await fetch(webhook.url, {
				method: "POST",
				headers,
				body: payload,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			const durationMs = Date.now() - startTime;
			const responseBody = await response.text().catch(() => "");

			if (response.ok) {
				// Success (2xx status)
				await ctx.runMutation(internal.webhookTrigger.updateDeliveryStatus, {
					deliveryId,
					status: "delivered",
					statusCode: response.status,
					responseBody,
					durationMs,
				});
				console.log(
					`Webhook delivered successfully: ${deliveryId} to ${webhook.url} (${response.status})`,
				);
			} else {
				// HTTP error
				await handleDeliveryFailure(
					ctx,
					deliveryId,
					deliveryData.attemptCount + 1,
					deliveryData.maxAttempts,
					`HTTP ${response.status}: ${response.statusText}`,
					response.status,
					responseBody,
					durationMs,
				);
			}
		} catch (error) {
			const durationMs = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			// Handle timeout specifically
			if (errorMessage.includes("aborted")) {
				await handleDeliveryFailure(
					ctx,
					deliveryId,
					deliveryData.attemptCount + 1,
					deliveryData.maxAttempts,
					`Request timeout after ${
						webhook.timeoutMs || DEFAULT_WEBHOOK_CONFIG.defaultTimeoutMs
					}ms`,
					undefined,
					undefined,
					durationMs,
				);
			} else {
				await handleDeliveryFailure(
					ctx,
					deliveryId,
					deliveryData.attemptCount + 1,
					deliveryData.maxAttempts,
					errorMessage,
					undefined,
					undefined,
					durationMs,
				);
			}
		}
	},
});

/**
 * Handle delivery failure with retry logic.
 */
async function handleDeliveryFailure(
	ctx: { runMutation: (fn: any, args: any) => Promise<any>; scheduler: any },
	deliveryId: string,
	attemptCount: number,
	maxAttempts: number,
	error: string,
	statusCode?: number,
	responseBody?: string,
	durationMs?: number,
) {
	if (attemptCount < maxAttempts) {
		// Calculate next retry time with exponential backoff
		const delayIndex = Math.min(attemptCount - 1, RETRY_DELAYS_MS.length - 1);
		const delay = RETRY_DELAYS_MS[delayIndex];
		const nextRetryAt = Date.now() + delay;

		await ctx.runMutation(internal.webhookTrigger.updateDeliveryStatus, {
			deliveryId: deliveryId,
			status: "retrying",
			statusCode,
			error,
			responseBody,
			durationMs,
			nextRetryAt,
		});

		console.log(
			`Webhook delivery ${deliveryId} failed (attempt ${attemptCount}/${maxAttempts}). ` +
				`Retrying in ${delay / 1000}s. Error: ${error}`,
		);

		// Schedule retry
		await ctx.scheduler.runAt(
			nextRetryAt,
			internal.webhookTrigger.sendWebhookDelivery,
			{ deliveryId: deliveryId },
		);
	} else {
		// Max retries exhausted
		await ctx.runMutation(internal.webhookTrigger.updateDeliveryStatus, {
			deliveryId: deliveryId,
			status: "failed",
			statusCode,
			error,
			responseBody,
			durationMs,
		});

		console.error(
			`Webhook delivery ${deliveryId} failed permanently after ${maxAttempts} attempts. Error: ${error}`,
		);
	}
}

/**
 * Internal query to get delivery with webhook info.
 */
export const getDeliveryWithWebhook = internalQuery({
	args: {
		deliveryId: v.id("webhookDeliveries"),
	},
	handler: async (ctx, args) => {
		const delivery = await ctx.db.get(args.deliveryId);
		if (!delivery) return null;

		const webhook = await ctx.db.get(delivery.webhookId);
		if (!webhook || isDeleted(webhook) || !webhook.enabled) {
			return null;
		}

		return {
			...delivery,
			webhook,
		};
	},
});

// =============================================================================
// Background Job Scheduling
// =============================================================================

/**
 * Process unprocessed events and create webhook deliveries.
 *
 * This mutation:
 * 1. Gets unprocessed events from cmsEvents
 * 2. For each event, finds matching webhook configurations
 * 3. Creates delivery records for each event-webhook pair
 *
 * Call this periodically to queue new deliveries.
 */
export const processEventsForDelivery = internalMutation({
	args: {
		batchSize: v.optional(v.number()),
	},
	returns: v.object({
		eventsProcessed: v.number(),
		deliveriesCreated: v.number(),
		hasMore: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const { batchSize = DEFAULT_WEBHOOK_CONFIG.batchSize } = args;

		// Get unprocessed events
		const events = await ctx.db
			.query("cmsEvents")
			.withIndex("by_processed", (q) => q.eq("processed", false))
			.order("asc")
			.take(batchSize + 1);

		const hasMore = events.length > batchSize;
		const eventsToProcess = events.slice(0, batchSize);

		let deliveriesCreated = 0;

		for (const event of eventsToProcess) {
			// Get content type name from payload if available
			const payload = event.payload as { contentTypeName?: string } | undefined;
			const contentTypeName = payload?.contentTypeName;

			// Get matching webhooks
			const webhooks = await ctx.db
				.query("webhookConfigs")
				.withIndex("by_enabled", (q) => q.eq("enabled", true))
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.collect();

			// Filter to matching webhooks
			const matchingWebhooks = webhooks.filter((webhook) => {
				// Check event type filter
				if (
					webhook.eventTypes.length > 0 &&
					!webhook.eventTypes.includes(event.eventType)
				) {
					return false;
				}

				// Check resource type filter
				if (
					webhook.resourceTypes &&
					webhook.resourceTypes.length > 0 &&
					!webhook.resourceTypes.includes(event.resourceType)
				) {
					return false;
				}

				// Check content type filter
				if (
					event.resourceType === "contentEntry" &&
					webhook.contentTypes &&
					webhook.contentTypes.length > 0 &&
					contentTypeName &&
					!webhook.contentTypes.includes(contentTypeName)
				) {
					return false;
				}

				return true;
			});

			// Create delivery for each matching webhook
			for (const webhook of matchingWebhooks) {
				// Check if delivery already exists
				const existing = await ctx.db
					.query("webhookDeliveries")
					.withIndex("by_event", (q) => q.eq("eventId", event._id))
					.filter((q) => q.eq(q.field("webhookId"), webhook._id))
					.first();

				if (!existing) {
					// Build webhook payload
					const webhookPayload: WebhookPayload = {
						deliveryId: "", // Will be updated after creation
						eventType: event.eventType,
						resourceType: event.resourceType,
						resourceId: event.resourceId,
						action: event.action,
						data: event.payload,
						timestamp: new Date(event._creationTime).toISOString(),
						userId: event.userId,
					};

					const deliveryId = await ctx.db.insert("webhookDeliveries", {
						webhookId: webhook._id,
						eventId: event._id,
						eventType: event.eventType,
						status: "pending",
						attemptCount: 0,
						maxAttempts:
							webhook.maxRetries ?? DEFAULT_WEBHOOK_CONFIG.defaultMaxRetries,
						payload: { ...webhookPayload, deliveryId: "pending" },
					});

					// Update payload with actual delivery ID
					const updatedPayload = { ...webhookPayload, deliveryId };
					await ctx.db.patch(deliveryId, { payload: updatedPayload });

					deliveriesCreated++;
				}
			}

			// Mark event as processed for webhooks
			// Note: We don't use the generic markEventsProcessed because
			// other processors (like RAG indexer) may also need the event
			// Instead, we track webhook processing via delivery records
		}

		return {
			eventsProcessed: eventsToProcess.length,
			deliveriesCreated,
			hasMore,
		};
	},
});

/**
 * Trigger webhook deliveries for pending/retrying items.
 *
 * This internal mutation schedules action calls for each pending delivery.
 */
export const triggerPendingDeliveries = internalMutation({
	args: {
		batchSize: v.optional(v.number()),
	},
	returns: v.object({
		deliveriesTriggered: v.number(),
		hasMore: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const { batchSize = DEFAULT_WEBHOOK_CONFIG.batchSize } = args;
		const now = Date.now();

		// Get pending deliveries
		const pending = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.take(batchSize);

		// Get retrying deliveries whose retry time has passed
		const retrying = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "retrying"))
			.filter((q) =>
				q.or(
					q.eq(q.field("nextRetryAt"), undefined),
					q.lte(q.field("nextRetryAt"), now),
				),
			)
			.take(batchSize);

		const allDeliveries = [...pending, ...retrying].slice(0, batchSize);
		const hasMore = pending.length >= batchSize || retrying.length >= batchSize;

		// Schedule delivery action for each
		for (const delivery of allDeliveries) {
			await ctx.scheduler.runAfter(
				0,
				internal.webhookTrigger.sendWebhookDelivery,
				{ deliveryId: delivery._id },
			);
		}

		return {
			deliveriesTriggered: allDeliveries.length,
			hasMore,
		};
	},
});

/**
 * Main scheduled function that processes events and triggers webhooks.
 *
 * This should be called periodically (e.g., every minute) to:
 * 1. Create deliveries for new events
 * 2. Trigger pending/retrying deliveries
 */
export const processWebhooks = internalMutation({
	args: {
		config: v.optional(
			v.object({
				batchSize: v.optional(v.number()),
			}),
		),
	},
	returns: v.object({
		eventsProcessed: v.number(),
		deliveriesCreated: v.number(),
		deliveriesTriggered: v.number(),
		hasMore: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const config = { ...DEFAULT_WEBHOOK_CONFIG, ...(args.config || {}) };
		const batchSize = config.batchSize ?? DEFAULT_WEBHOOK_CONFIG.batchSize;

		// Step 1: Process events and create deliveries
		// Inline the logic to avoid calling handler directly
		const events = await ctx.db
			.query("cmsEvents")
			.withIndex("by_processed", (q) => q.eq("processed", false))
			.order("asc")
			.take(batchSize + 1);

		const hasMoreEvents = events.length > batchSize;
		const eventsToProcess = events.slice(0, batchSize);

		let deliveriesCreated = 0;

		for (const event of eventsToProcess) {
			const payload = event.payload as { contentTypeName?: string } | undefined;
			const contentTypeName = payload?.contentTypeName;

			const webhooks = await ctx.db
				.query("webhookConfigs")
				.withIndex("by_enabled", (q) => q.eq("enabled", true))
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.collect();

			const matchingWebhooks = webhooks.filter((webhook) => {
				if (
					webhook.eventTypes.length > 0 &&
					!webhook.eventTypes.includes(event.eventType)
				) {
					return false;
				}
				if (
					webhook.resourceTypes &&
					webhook.resourceTypes.length > 0 &&
					!webhook.resourceTypes.includes(event.resourceType)
				) {
					return false;
				}
				if (
					event.resourceType === "contentEntry" &&
					webhook.contentTypes &&
					webhook.contentTypes.length > 0 &&
					contentTypeName &&
					!webhook.contentTypes.includes(contentTypeName)
				) {
					return false;
				}
				return true;
			});

			for (const webhook of matchingWebhooks) {
				const existing = await ctx.db
					.query("webhookDeliveries")
					.withIndex("by_event", (q) => q.eq("eventId", event._id))
					.filter((q) => q.eq(q.field("webhookId"), webhook._id))
					.first();

				if (!existing) {
					const webhookPayload: WebhookPayload = {
						deliveryId: "pending",
						eventType: event.eventType,
						resourceType: event.resourceType,
						resourceId: event.resourceId,
						action: event.action,
						data: event.payload,
						timestamp: new Date(event._creationTime).toISOString(),
						userId: event.userId,
					};

					const deliveryId = await ctx.db.insert("webhookDeliveries", {
						webhookId: webhook._id,
						eventId: event._id,
						eventType: event.eventType,
						status: "pending",
						attemptCount: 0,
						maxAttempts:
							webhook.maxRetries ?? DEFAULT_WEBHOOK_CONFIG.defaultMaxRetries,
						payload: webhookPayload,
					});

					const updatedPayload = { ...webhookPayload, deliveryId };
					await ctx.db.patch(deliveryId, { payload: updatedPayload });
					deliveriesCreated++;
				}
			}
		}

		// Step 2: Trigger pending deliveries
		const now = Date.now();
		const pending = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.take(batchSize);

		const retrying = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "retrying"))
			.filter((q) =>
				q.or(
					q.eq(q.field("nextRetryAt"), undefined),
					q.lte(q.field("nextRetryAt"), now),
				),
			)
			.take(batchSize);

		const allDeliveries = [...pending, ...retrying].slice(0, batchSize);
		const hasMoreDeliveries =
			pending.length >= batchSize || retrying.length >= batchSize;

		for (const delivery of allDeliveries) {
			await ctx.scheduler.runAfter(
				0,
				internal.webhookTrigger.sendWebhookDelivery,
				{ deliveryId: delivery._id },
			);
		}

		return {
			eventsProcessed: eventsToProcess.length,
			deliveriesCreated,
			deliveriesTriggered: allDeliveries.length,
			hasMore: hasMoreEvents || hasMoreDeliveries,
		};
	},
});

/**
 * Schedule the next webhook processing run.
 *
 * Call this to set up recurring background processing.
 *
 * @param delayMs - Delay before next run in milliseconds
 */
export const scheduleNextWebhookRun = mutation({
	args: {
		delayMs: v.optional(v.number()),
	},
	returns: v.object({
		scheduledAt: v.number(),
	}),
	handler: async (ctx, args) => {
		const delayMs = args.delayMs ?? DEFAULT_WEBHOOK_CONFIG.pollingIntervalMs;
		const runAt = Date.now() + delayMs;

		await ctx.scheduler.runAt(
			runAt,
			internal.webhookTrigger.triggerWebhookCheck,
			{},
		);

		return { scheduledAt: runAt };
	},
});

/**
 * Internal mutation triggered by scheduler to process webhooks.
 * This inlines the processWebhooks logic to avoid calling .handler() directly.
 */
export const triggerWebhookCheck = internalMutation({
	args: {},
	handler: async (ctx) => {
		const batchSize = DEFAULT_WEBHOOK_CONFIG.batchSize;

		// Step 1: Process events and create deliveries
		const events = await ctx.db
			.query("cmsEvents")
			.withIndex("by_processed", (q) => q.eq("processed", false))
			.order("asc")
			.take(batchSize + 1);

		const hasMoreEvents = events.length > batchSize;
		const eventsToProcess = events.slice(0, batchSize);

		let deliveriesCreated = 0;

		for (const event of eventsToProcess) {
			const payload = event.payload as { contentTypeName?: string } | undefined;
			const contentTypeName = payload?.contentTypeName;

			const webhooks = await ctx.db
				.query("webhookConfigs")
				.withIndex("by_enabled", (q) => q.eq("enabled", true))
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.collect();

			const matchingWebhooks = webhooks.filter((webhook) => {
				if (
					webhook.eventTypes.length > 0 &&
					!webhook.eventTypes.includes(event.eventType)
				) {
					return false;
				}
				if (
					webhook.resourceTypes &&
					webhook.resourceTypes.length > 0 &&
					!webhook.resourceTypes.includes(event.resourceType)
				) {
					return false;
				}
				if (
					event.resourceType === "contentEntry" &&
					webhook.contentTypes &&
					webhook.contentTypes.length > 0 &&
					contentTypeName &&
					!webhook.contentTypes.includes(contentTypeName)
				) {
					return false;
				}
				return true;
			});

			for (const webhook of matchingWebhooks) {
				const existing = await ctx.db
					.query("webhookDeliveries")
					.withIndex("by_event", (q) => q.eq("eventId", event._id))
					.filter((q) => q.eq(q.field("webhookId"), webhook._id))
					.first();

				if (!existing) {
					const webhookPayload: WebhookPayload = {
						deliveryId: "pending",
						eventType: event.eventType,
						resourceType: event.resourceType,
						resourceId: event.resourceId,
						action: event.action,
						data: event.payload,
						timestamp: new Date(event._creationTime).toISOString(),
						userId: event.userId,
					};

					const deliveryId = await ctx.db.insert("webhookDeliveries", {
						webhookId: webhook._id,
						eventId: event._id,
						eventType: event.eventType,
						status: "pending",
						attemptCount: 0,
						maxAttempts:
							webhook.maxRetries ?? DEFAULT_WEBHOOK_CONFIG.defaultMaxRetries,
						payload: webhookPayload,
					});

					const updatedPayload = { ...webhookPayload, deliveryId };
					await ctx.db.patch(deliveryId, { payload: updatedPayload });
					deliveriesCreated++;
				}
			}
		}

		// Step 2: Trigger pending deliveries
		const now = Date.now();
		const pending = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.take(batchSize);

		const retrying = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "retrying"))
			.filter((q) =>
				q.or(
					q.eq(q.field("nextRetryAt"), undefined),
					q.lte(q.field("nextRetryAt"), now),
				),
			)
			.take(batchSize);

		const allDeliveries = [...pending, ...retrying].slice(0, batchSize);
		const hasMoreDeliveries =
			pending.length >= batchSize || retrying.length >= batchSize;

		for (const delivery of allDeliveries) {
			await ctx.scheduler.runAfter(
				0,
				internal.webhookTrigger.sendWebhookDelivery,
				{ deliveryId: delivery._id },
			);
		}

		const result = {
			eventsProcessed: eventsToProcess.length,
			deliveriesCreated,
			deliveriesTriggered: allDeliveries.length,
			hasMore: hasMoreEvents || hasMoreDeliveries,
		};

		console.log(
			`Webhook processor: processed ${result.eventsProcessed} events, ` +
				`created ${result.deliveriesCreated} deliveries, ` +
				`triggered ${result.deliveriesTriggered} deliveries`,
		);

		// If there's more work, reschedule sooner
		if (result.hasMore) {
			await ctx.scheduler.runAfter(
				5000, // 5 seconds
				internal.webhookTrigger.triggerWebhookCheck,
				{},
			);
		}

		return result;
	},
});

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get delivery statistics for a webhook.
 */
export const getWebhookDeliveryStats = query({
	args: {
		webhookId: v.id("webhookConfigs"),
		since: v.optional(v.number()),
	},
	returns: v.object({
		total: v.number(),
		pending: v.number(),
		processing: v.number(),
		delivered: v.number(),
		failed: v.number(),
		retrying: v.number(),
	}),
	handler: async (ctx, args) => {
		const { webhookId, since } = args;

		const deliveries = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_webhook", (q) => q.eq("webhookId", webhookId))
			.filter((q) =>
				since ? q.gte(q.field("_creationTime"), since) : q.eq(true, true),
			)
			.collect();

		const stats = {
			total: deliveries.length,
			pending: 0,
			processing: 0,
			delivered: 0,
			failed: 0,
			retrying: 0,
		};

		for (const d of deliveries) {
			stats[d.status]++;
		}

		return stats;
	},
});

/**
 * List recent deliveries for a webhook.
 */
export const listWebhookDeliveries = query({
	args: {
		webhookId: v.id("webhookConfigs"),
		status: v.optional(webhookDeliveryStatusValidator),
		limit: v.optional(v.number()),
	},
	returns: v.array(webhookDeliveryDoc),
	handler: async (ctx, args) => {
		const { webhookId, status, limit = 50 } = args;

		let query = ctx.db
			.query("webhookDeliveries")
			.withIndex("by_webhook", (q) => q.eq("webhookId", webhookId));

		if (status) {
			query = query.filter((q) => q.eq(q.field("status"), status));
		}

		return await query.order("desc").take(limit);
	},
});

/**
 * Get overall webhook statistics.
 */
export const getWebhookStats = query({
	args: {},
	returns: v.object({
		totalWebhooks: v.number(),
		activeWebhooks: v.number(),
		pendingDeliveries: v.number(),
		retryingDeliveries: v.number(),
		deliveriesLast24h: v.number(),
		successRateLast24h: v.number(),
	}),
	handler: async (ctx) => {
		// Count webhooks
		const allWebhooks = await ctx.db
			.query("webhookConfigs")
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect();

		const activeWebhooks = allWebhooks.filter((w) => w.enabled).length;

		// Count pending and retrying deliveries
		const pending = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.collect();

		const retrying = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "retrying"))
			.collect();

		// Get deliveries in last 24 hours
		const last24h = Date.now() - 24 * 60 * 60 * 1000;
		const recentDeliveries = await ctx.db
			.query("webhookDeliveries")
			.filter((q) => q.gte(q.field("_creationTime"), last24h))
			.collect();

		const successfulRecent = recentDeliveries.filter(
			(d) => d.status === "delivered",
		).length;
		const completedRecent = recentDeliveries.filter(
			(d) => d.status === "delivered" || d.status === "failed",
		).length;

		return {
			totalWebhooks: allWebhooks.length,
			activeWebhooks,
			pendingDeliveries: pending.length,
			retryingDeliveries: retrying.length,
			deliveriesLast24h: recentDeliveries.length,
			successRateLast24h:
				completedRecent > 0
					? Math.round((successfulRecent / completedRecent) * 100)
					: 100,
		};
	},
});

/**
 * Get delivery details by ID.
 */
export const getDelivery = query({
	args: {
		deliveryId: v.id("webhookDeliveries"),
	},
	returns: v.union(webhookDeliveryDoc, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db.get(args.deliveryId);
	},
});

/**
 * Manually retry a failed delivery.
 */
export const retryDelivery = mutation({
	args: {
		deliveryId: v.id("webhookDeliveries"),
	},
	returns: v.object({
		success: v.boolean(),
		message: v.string(),
	}),
	handler: async (ctx, args) => {
		const { deliveryId } = args;

		const delivery = await ctx.db.get(deliveryId);
		if (!delivery) {
			throw new Error(`Delivery not found: ${deliveryId}`);
		}

		if (delivery.status === "delivered") {
			return {
				success: false,
				message: "Delivery already succeeded",
			};
		}

		// Reset for retry
		await ctx.db.patch(deliveryId, {
			status: "pending",
			attemptCount: 0,
			lastError: undefined,
			nextRetryAt: undefined,
		});

		// Schedule immediate delivery
		await ctx.scheduler.runAfter(
			0,
			internal.webhookTrigger.sendWebhookDelivery,
			{ deliveryId },
		);

		return {
			success: true,
			message: "Delivery scheduled for retry",
		};
	},
});

/**
 * Clean up old delivery records.
 */
export const cleanupOldDeliveries = mutation({
	args: {
		retentionDays: v.optional(v.number()),
	},
	returns: v.object({
		deletedCount: v.number(),
	}),
	handler: async (ctx, args) => {
		const { retentionDays = 30 } = args;
		const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
		let deletedCount = 0;

		// Get old successful deliveries
		const oldDeliveries = await ctx.db
			.query("webhookDeliveries")
			.withIndex("by_status", (q) => q.eq("status", "delivered"))
			.filter((q) => q.lt(q.field("_creationTime"), cutoffTime))
			.take(1000);

		for (const delivery of oldDeliveries) {
			await ctx.db.delete(delivery._id);
			deletedCount++;
		}

		return { deletedCount };
	},
});

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Test a webhook by sending a test event.
 * Useful for verifying webhook configuration before enabling.
 */
export const testWebhook = mutation({
	args: {
		webhookId: v.id("webhookConfigs"),
	},
	returns: v.object({
		success: v.boolean(),
		message: v.string(),
		deliveryId: v.optional(v.id("webhookDeliveries")),
	}),
	handler: async (ctx, args) => {
		const { webhookId } = args;

		const webhook = await ctx.db.get(webhookId);
		if (!webhook) {
			throw new Error(`Webhook not found: ${webhookId}`);
		}

		// Create a test event
		const testEventId = await ctx.db.insert("cmsEvents", {
			eventType: "test.webhook",
			resourceType: "contentEntry",
			resourceId: "test-resource",
			action: "created",
			payload: {
				test: true,
				message: "This is a test webhook delivery",
				timestamp: new Date().toISOString(),
			},
			userId: undefined,
			processed: true, // Mark as processed so it doesn't trigger other handlers
		});

		// Create test delivery
		const testPayload: WebhookPayload = {
			deliveryId: "test",
			eventType: "test.webhook",
			resourceType: "contentEntry",
			resourceId: "test-resource",
			action: "created",
			data: {
				test: true,
				message: "This is a test webhook delivery",
			},
			timestamp: new Date().toISOString(),
		};

		const deliveryId = await ctx.db.insert("webhookDeliveries", {
			webhookId,
			eventId: testEventId,
			eventType: "test.webhook",
			status: "pending",
			attemptCount: 0,
			maxAttempts: 1,
			payload: testPayload,
		});

		// Update with actual delivery ID
		await ctx.db.patch(deliveryId, {
			payload: { ...testPayload, deliveryId },
		});

		// Schedule immediate delivery
		await ctx.scheduler.runAfter(
			0,
			internal.webhookTrigger.sendWebhookDelivery,
			{ deliveryId },
		);

		return {
			success: true,
			message: `Test webhook scheduled. Check delivery ${deliveryId} for results.`,
			deliveryId,
		};
	},
});
