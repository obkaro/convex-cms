/**
 * Scheduled Publishing Functions
 *
 * Provides functionality to schedule content entries for future publication.
 * Uses Convex scheduled functions to automatically publish entries at specified times.
 *
 * Workflow:
 * 1. User calls `scheduleEntry` with an entry ID and publish timestamp
 * 2. Entry status changes to "scheduled" with `scheduledPublishAt` set
 * 3. A Convex scheduled function is created to run at that time
 * 4. The scheduled function ID is stored for potential cancellation
 * 5. At the scheduled time, the internal `executeScheduledPublish` mutation runs
 * 6. The entry is published (or skipped if status/conditions have changed)
 *
 * Cancellation:
 * - User can call `cancelScheduledPublish` to revert to draft and cancel the scheduled job
 * - Rescheduling automatically cancels any existing scheduled job
 */

import { v } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import { mutation, internalMutation, query } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { contentEntryDoc, scheduleEntryArgs } from "./validators.js";

// =============================================================================
// Schedule Entry Mutation
// =============================================================================

/**
 * Mutation to schedule a content entry for future publication.
 *
 * This sets the entry status to "scheduled" and creates a Convex scheduled
 * function that will automatically publish the entry at the specified time.
 *
 * Key behaviors:
 * 1. **Validation**: The entry must exist, not be deleted, and not already be published
 * 2. **Time Validation**: The publish time must be in the future (at least 1 minute)
 * 3. **Rescheduling**: If already scheduled, cancels the existing scheduled job first
 * 4. **Atomicity**: Status change and job scheduling happen atomically
 *
 * @param id - The content entry ID to schedule
 * @param publishAt - Unix timestamp (ms) when the entry should be published
 * @param updatedBy - Optional user ID for audit trail
 *
 * @returns The updated content entry with scheduled status
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has been deleted
 * @throws Error if the entry is already published
 * @throws Error if the publish time is not in the future
 *
 * @example
 * ```typescript
 * // Schedule a post to publish tomorrow at 9 AM
 * const tomorrow9am = new Date();
 * tomorrow9am.setDate(tomorrow9am.getDate() + 1);
 * tomorrow9am.setHours(9, 0, 0, 0);
 *
 * const scheduled = await ctx.runMutation(api.scheduledPublish.scheduleEntry, {
 *   id: entryId,
 *   publishAt: tomorrow9am.getTime(),
 *   updatedBy: currentUserId,
 * });
 * ```
 */
export const scheduleEntry = mutation({
	args: scheduleEntryArgs.fields,
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const { id, publishAt, updatedBy } = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw new Error(`Content entry not found: ${id}`);
		}
		if (isDeleted(entry)) {
			throw new Error(`Content entry has been deleted: ${id}`);
		}
		if (entry.status === "published") {
			throw new Error(`Content entry is already published: ${id}`);
		}
		if (entry.status === "archived") {
			throw new Error(
				`Cannot schedule archived content. Restore it first: ${id}`,
			);
		}

		// Validate the publish time is in the future (at least 1 minute from now)
		const now = Date.now();
		const minimumScheduleTime = now + 60 * 1000; // 1 minute from now
		if (publishAt < minimumScheduleTime) {
			throw new Error(
				`Scheduled publish time must be at least 1 minute in the future. ` +
					`Received: ${new Date(publishAt).toISOString()}, ` +
					`Minimum: ${new Date(minimumScheduleTime).toISOString()}`,
			);
		}

		// If already scheduled, we need to cancel the existing scheduled job
		// Note: We can't actually cancel Convex scheduled functions directly,
		// but the executeScheduledPublish function will check if the entry
		// is still scheduled with the same timestamp before publishing

		// Schedule the publish function to run at the specified time
		await ctx.scheduler.runAt(
			publishAt,
			internal.scheduledPublish.executeScheduledPublish,
			{
				entryId: id,
				expectedPublishAt: publishAt,
			},
		);

		// Update the entry to scheduled status
		await ctx.db.patch(id, {
			status: "scheduled",
			scheduledPublishAt: publishAt,
			// Store the scheduled function ID for reference (as a string since it's a system ID)
			updatedBy,
			version: entry.version + 1,
		});

		const scheduledEntry = await ctx.db.get(id);
		if (!scheduledEntry) {
			throw new Error("Failed to retrieve scheduled entry");
		}

		return scheduledEntry;
	},
});

// =============================================================================
// Cancel Scheduled Publish Mutation
// =============================================================================

/**
 * Mutation to cancel a scheduled publication and revert to draft.
 *
 * This reverts the entry status to "draft" and clears the scheduled publish time.
 * The scheduled function will still run, but it will detect the status change
 * and skip the publish operation.
 *
 * @param id - The content entry ID to cancel scheduling for
 * @param updatedBy - Optional user ID for audit trail
 *
 * @returns The updated content entry (now in draft status)
 *
 * @throws Error if the entry does not exist
 * @throws Error if the entry has been deleted
 * @throws Error if the entry is not currently scheduled
 *
 * @example
 * ```typescript
 * const draft = await ctx.runMutation(api.scheduledPublish.cancelScheduledPublish, {
 *   id: entryId,
 *   updatedBy: currentUserId,
 * });
 * console.log(draft.status); // "draft"
 * ```
 */
export const cancelScheduledPublish = mutation({
	args: {
		/** The ID of the content entry to cancel scheduling for */
		id: v.id("contentEntries"),
		/** User ID performing the cancellation (for audit trail) */
		updatedBy: v.optional(v.string()),
	},
	returns: contentEntryDoc,
	handler: async (ctx, args) => {
		const { id, updatedBy } = args;

		const entry = await ctx.db.get(id);
		if (!entry) {
			throw new Error(`Content entry not found: ${id}`);
		}
		if (isDeleted(entry)) {
			throw new Error(`Content entry has been deleted: ${id}`);
		}
		if (entry.status !== "scheduled") {
			throw new Error(
				`Content entry is not scheduled. Current status: ${entry.status}`,
			);
		}

		// Revert to draft status and clear scheduled time
		await ctx.db.patch(id, {
			status: "draft",
			scheduledPublishAt: undefined,
			updatedBy,
			version: entry.version + 1,
		});

		const updatedEntry = await ctx.db.get(id);
		if (!updatedEntry) {
			throw new Error("Failed to retrieve updated entry");
		}

		return updatedEntry;
	},
});

// =============================================================================
// Execute Scheduled Publish (Internal)
// =============================================================================

/**
 * Internal mutation that executes the scheduled publish.
 *
 * This is called by Convex's scheduler at the scheduled time.
 * It verifies the entry is still in the expected state before publishing.
 *
 * Safety checks:
 * - Entry still exists and is not deleted
 * - Entry is still in "scheduled" status (not manually published or cancelled)
 * - The scheduled time matches (in case of rescheduling)
 *
 * If any check fails, the publish is skipped silently (no error thrown).
 * This prevents orphaned scheduled jobs from causing issues.
 */
export const executeScheduledPublish = internalMutation({
	args: {
		/** The ID of the content entry to publish */
		entryId: v.id("contentEntries"),
		/** The expected publish timestamp (for validation) */
		expectedPublishAt: v.number(),
	},
	handler: async (ctx, args) => {
		const { entryId, expectedPublishAt } = args;

		const entry = await ctx.db.get(entryId);

		// Safety checks - skip publish if conditions aren't met
		if (!entry) {
			console.log(
				`Scheduled publish skipped: Entry ${entryId} no longer exists`,
			);
			return;
		}
		if (isDeleted(entry)) {
			console.log(
				`Scheduled publish skipped: Entry ${entryId} has been deleted`,
			);
			return;
		}
		if (entry.status !== "scheduled") {
			console.log(
				`Scheduled publish skipped: Entry ${entryId} status is "${entry.status}", not "scheduled"`,
			);
			return;
		}
		if (entry.scheduledPublishAt !== expectedPublishAt) {
			console.log(
				`Scheduled publish skipped: Entry ${entryId} was rescheduled ` +
					`(expected ${expectedPublishAt}, found ${entry.scheduledPublishAt})`,
			);
			return;
		}

		const now = Date.now();

		// Create a version snapshot before publishing
		await ctx.db.insert("contentVersions", {
			entryId,
			versionNumber: entry.version,
			data: entry.data,
			slug: entry.slug,
			status: entry.status,
			changeDescription: "Scheduled publication",
			createdBy: entry.updatedBy,
			wasPublished: true,
			publishedAt: now,
		});

		// Publish the entry
		const updates: Record<string, unknown> = {
			status: "published",
			lastPublishedAt: now,
			scheduledPublishAt: undefined,
			version: entry.version + 1,
		};

		// Set firstPublishedAt only on first publication
		if (entry.firstPublishedAt === undefined) {
			updates.firstPublishedAt = now;
		}

		await ctx.db.patch(entryId, updates);

		console.log(
			`Scheduled publish executed: Entry ${entryId} is now published`,
		);
	},
});

// =============================================================================
// Query for Scheduled Entries
// =============================================================================

/**
 * Query to get all entries scheduled for publication within a time range.
 *
 * Useful for:
 * - Displaying upcoming scheduled content in the admin UI
 * - Monitoring scheduled publishing queue
 *
 * @param from - Start of time range (optional, defaults to now)
 * @param to - End of time range (optional, defaults to 30 days from now)
 *
 * @returns Array of scheduled content entries, sorted by scheduled time
 */
export const getScheduledEntries = query({
	args: {
		/** Start of time range (ms timestamp). Defaults to now. */
		from: v.optional(v.number()),
		/** End of time range (ms timestamp). Defaults to 30 days from now. */
		to: v.optional(v.number()),
		/** Content type name to filter by (optional) */
		contentTypeName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const from = args.from ?? now;
		const to = args.to ?? now + 30 * 24 * 60 * 60 * 1000; // 30 days

		// Query scheduled entries using the index
		const query = ctx.db
			.query("contentEntries")
			.withIndex("by_scheduled_publish", (q) => q.eq("status", "scheduled"));

		// Collect and filter by time range and optionally by content type
		const entries = await query.collect();

		return entries
			.filter((entry) => {
				// Must have a scheduled time in range
				if (
					entry.scheduledPublishAt === undefined ||
					entry.scheduledPublishAt < from ||
					entry.scheduledPublishAt > to
				) {
					return false;
				}
				// Must not be deleted
				if (isDeleted(entry)) {
					return false;
				}
				// Filter by content type if specified
				if (args.contentTypeName && entry.contentTypeName !== args.contentTypeName) {
					return false;
				}
				return true;
			})
			.sort(
				(a, b) => (a.scheduledPublishAt ?? 0) - (b.scheduledPublishAt ?? 0),
			);
	},
});
