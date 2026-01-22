import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const fieldTypes = [
	"text",
	"richText",
	"number",
	"boolean",
	"date",
	"datetime",
	"reference",
	"media",
	"json",
	"select",
	"multiSelect",
	"tags",
	"category",
] as const;

export const fieldTypeValidator = v.union(
	v.literal("text"),
	v.literal("richText"),
	v.literal("number"),
	v.literal("boolean"),
	v.literal("date"),
	v.literal("datetime"),
	v.literal("reference"),
	v.literal("media"),
	v.literal("json"),
	v.literal("select"),
	v.literal("multiSelect"),
	v.literal("tags"),
	v.literal("category"),
);

export const contentStatuses = [
	"draft",
	"published",
	"archived",
	"scheduled",
] as const;

export const contentStatusValidator = v.union(
	v.literal("draft"),
	v.literal("published"),
	v.literal("archived"),
	v.literal("scheduled"),
);

export const mediaTypes = [
	"image",
	"video",
	"audio",
	"document",
	"other",
] as const;

export const mediaTypeValidator = v.union(
	v.literal("image"),
	v.literal("video"),
	v.literal("audio"),
	v.literal("document"),
	v.literal("other"),
);

export const variantTypeValidator = v.union(
	v.literal("thumbnail"),
	v.literal("responsive"),
	v.literal("format"),
);

export const variantStatusValidator = v.union(
	v.literal("pending"),
	v.literal("processing"),
	v.literal("completed"),
	v.literal("failed"),
);

const baseFieldDefinition = {
	name: v.string(),
	label: v.string(),
	required: v.boolean(),
	searchable: v.optional(v.boolean()),
	localized: v.optional(v.boolean()),
	description: v.optional(v.string()),
	defaultValue: v.optional(v.any()),
};

export const textFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("text"),
	options: v.object({
		minLength: v.optional(v.number()),
		maxLength: v.optional(v.number()),
		pattern: v.optional(v.string()),
	}),
});

export const numberFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("number"),
	options: v.object({
		min: v.optional(v.number()),
		max: v.optional(v.number()),
		step: v.optional(v.number()),
		precision: v.optional(v.number()),
	}),
});

export const booleanFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("boolean"),
	options: v.object({
		trueLabel: v.optional(v.string()),
		falseLabel: v.optional(v.string()),
	}),
});

export const richTextFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("richText"),
	options: v.object({
		allowedBlocks: v.optional(v.array(v.string())),
		allowedMarks: v.optional(v.array(v.string())),
	}),
});

export const mediaFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("media"),
	options: v.object({
		mediaType: v.optional(mediaTypeValidator),
		allowedMimeTypes: v.optional(v.array(v.string())),
		maxFileSize: v.optional(v.number()),
	}),
});

export const selectFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("select"),
	options: v.object({
		options: v.optional(
			v.array(
				v.object({
					value: v.string(),
					label: v.string(),
				}),
			),
		),
	}),
});

export const tagsFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("tags"),
	options: v.object({
		taxonomyId: v.optional(v.id("taxonomies")),
		allowCreate: v.optional(v.boolean()),
		maxTags: v.optional(v.number()),
		minTags: v.optional(v.number()),
	}),
});

export const categoryFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("category"),
	options: v.object({
		allowMultiple: v.optional(v.boolean()),
	}),
});

export const jsonFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("json"),
	options: v.object({
		schema: v.optional(v.any()),
	}),
});

export const referenceFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("reference"),
	options: v.object({
		allowedContentTypes: v.optional(v.array(v.string())),
		multiple: v.optional(v.boolean()),
		minItems: v.optional(v.number()),
	}),
});

export const multiSelectFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("multiSelect"),
	options: v.object({
		options: v.optional(
			v.array(
				v.object({
					value: v.string(),
					label: v.string(),
				}),
			),
		),
	}),
});

export const dateFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("date"),
	options: v.object({
		min: v.optional(v.number()),
		max: v.optional(v.number()),
	}),
});

export const datetimeFieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	type: v.literal("datetime"),
	options: v.object({
		min: v.optional(v.number()),
		max: v.optional(v.number()),
	}),
});

export const fieldDefinitionValidator = v.union(
	textFieldDefinitionValidator,
	numberFieldDefinitionValidator,
	booleanFieldDefinitionValidator,
	richTextFieldDefinitionValidator,
	mediaFieldDefinitionValidator,
	selectFieldDefinitionValidator,
	tagsFieldDefinitionValidator,
	categoryFieldDefinitionValidator,
	jsonFieldDefinitionValidator,
	jsonFieldDefinitionValidator,
	referenceFieldDefinitionValidator,
);

const contentTypeFields = {
	name: v.string(),
	displayName: v.string(),
	createdBy: v.string(),
	description: v.optional(v.string()),
	fields: v.array(fieldDefinitionValidator),
	icon: v.optional(v.string()),
	singleton: v.optional(v.boolean()),
	slugField: v.optional(v.string()),
	titleField: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	isActive: v.boolean(),
	deletedAt: v.optional(v.number()),
	updatedBy: v.optional(v.string()),
};

const contentEntryFields = {
	contentTypeId: v.id("contentTypes"),
	slug: v.string(),
	status: contentStatusValidator,
	data: v.any(),
	locale: v.optional(v.string()),
	primaryEntryId: v.optional(v.id("contentEntries")),
	version: v.number(),
	scheduledPublishAt: v.optional(v.number()),
	firstPublishedAt: v.optional(v.number()),
	lastPublishedAt: v.optional(v.number()),
	lockedBy: v.optional(v.string()),
	lockExpiresAt: v.optional(v.number()),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
	searchText: v.optional(v.string()),
};

const contentVersionFields = {
	entryId: v.id("contentEntries"),
	versionNumber: v.number(),
	data: v.any(),
	slug: v.string(),
	status: contentStatusValidator,
	changeDescription: v.optional(v.string()),
	createdBy: v.optional(v.string()),
	wasPublished: v.boolean(),
	publishedAt: v.optional(v.number()),
};

const mediaItemBaseFields = {
	name: v.string(),
	title: v.optional(v.string()),
	description: v.optional(v.string()),
	parentId: v.optional(v.id("mediaItems")),
	path: v.string(),
	tags: v.optional(v.array(v.string())),
	size: v.optional(v.number()),
	metadata: v.optional(v.record(v.string(), v.any())),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
	searchText: v.optional(v.string()),
};

const mediaAssetSpecificFields = {
	kind: v.literal("asset"),
	storageId: v.id("_storage"),
	mimeType: v.string(),
	// assetType: mediaTypeValidator,
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	duration: v.optional(v.number()),
	altText: v.optional(v.string()),
};

const mediaFolderSpecificFields = {
	kind: v.literal("folder"),
	sortOrder: v.optional(v.number()),
};

export const mediaAssetItemValidator = v.object({
	...mediaItemBaseFields,
	...mediaAssetSpecificFields,
});

export const mediaFolderItemValidator = v.object({
	...mediaItemBaseFields,
	...mediaFolderSpecificFields,
});

export const mediaItemValidator = v.union(
	mediaAssetItemValidator,
	mediaFolderItemValidator,
);

const mediaVariantFields = {
	assetId: v.id("mediaItems"),
	storageId: v.id("_storage"),
	variantType: v.union(
		v.literal("thumbnail"),
		v.literal("responsive"),
		v.literal("format"),
	),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	format: v.string(),
	mimeType: v.string(),
	size: v.number(),
	quality: v.optional(v.number()),
	preset: v.optional(v.string()),
	autoGenerated: v.boolean(),
	status: v.union(
		v.literal("pending"),
		v.literal("processing"),
		v.literal("completed"),
		v.literal("failed"),
	),
	errorMessage: v.optional(v.string()),
	processingStartedAt: v.optional(v.number()),
	processingCompletedAt: v.optional(v.number()),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
};

const taxonomyFields = {
	name: v.string(),
	displayName: v.string(),
	description: v.optional(v.string()),
	isHierarchical: v.boolean(),
	allowInlineCreation: v.boolean(),
	icon: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	isActive: v.boolean(),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
};

const taxonomyTermFields = {
	taxonomyId: v.id("taxonomies"),
	slug: v.string(),
	name: v.string(),
	description: v.optional(v.string()),
	parentId: v.optional(v.id("taxonomyTerms")),
	path: v.optional(v.string()),
	/** Depth in the hierarchy (0 for root terms) */
	depth: v.number(),
	color: v.optional(v.string()),
	icon: v.optional(v.string()),
	sortOrder: v.optional(v.number()),
	/** Cached count of content entries using this term */
	usageCount: v.number(),
	deletedAt: v.optional(v.number()),
	createdBy: v.optional(v.string()),
	updatedBy: v.optional(v.string()),
	searchText: v.optional(v.string()),
};

const schema = defineSchema({
	contentTypes: defineTable({
		...contentTypeFields,
	})
		.index("by_name", ["name"])
		.index("by_active", ["isActive"])
		.index("by_deleted", ["deletedAt"]),
	contentEntries: defineTable({
		...contentEntryFields,
	})
		.index("by_content_type", ["contentTypeId"])
		.index("by_content_type_and_slug", ["contentTypeId", "slug"])
		.index("by_status", ["status"])
		.index("by_content_type_and_status", ["contentTypeId", "status"])
		.index("by_primary_entry", ["primaryEntryId"])
		.index("by_locale", ["locale"])
		.index("by_deleted", ["deletedAt"])
		.index("by_scheduled_publish", ["status", "scheduledPublishAt"])
		.index("by_locked", ["lockedBy"])
		.searchIndex("search_content", {
			searchField: "searchText",
			filterFields: ["contentTypeId", "status", "locale"],
		}),
	contentVersions: defineTable({
		...contentVersionFields,
	})
		.index("by_entry", ["entryId"])
		.index("by_entry_and_version", ["entryId", "versionNumber"])
		.index("by_entry_and_published", ["entryId", "wasPublished"]),
	mediaItems: defineTable(
		v.union(
			v.object({
				...mediaItemBaseFields,
				...mediaAssetSpecificFields,
			}),
			v.object({
				...mediaItemBaseFields,
				...mediaFolderSpecificFields,
			}),
		),
	)
		.index("by_parent", ["parentId"])
		.index("by_path", ["path"])
		.index("by_kind", ["kind"])
		.index("by_kind_and_parent", ["kind", "parentId"])
		.index("by_storage_id", ["storageId"])
		// .index("by_type", ["assetType"])
		.index("by_mime_type", ["mimeType"])
		.index("by_deleted", ["deletedAt"])
		.searchIndex("search_media", {
			searchField: "searchText",
			// filterFields: ["kind", "assetType", "parentId"],
		}),
	mediaVariants: defineTable({
		...mediaVariantFields,
	})
		.index("by_asset", ["assetId"])
		.index("by_asset_and_type", ["assetId", "variantType"])
		.index("by_asset_and_preset", ["assetId", "preset"])
		.index("by_asset_and_format", ["assetId", "format"])
		.index("by_status", ["status"])
		.index("by_deleted", ["deletedAt"]),
	taxonomies: defineTable({
		...taxonomyFields,
	})
		.index("by_name", ["name"])
		.index("by_active", ["isActive"])
		.index("by_deleted", ["deletedAt"]),
	taxonomyTerms: defineTable({
		...taxonomyTermFields,
	})
		.index("by_taxonomy", ["taxonomyId"])
		.index("by_taxonomy_and_slug", ["taxonomyId", "slug"])
		.index("by_parent", ["parentId"])
		.index("by_taxonomy_and_path", ["taxonomyId", "path"])
		.index("by_deleted", ["deletedAt"])
		.index("by_taxonomy_and_usage", ["taxonomyId", "usageCount"])
		.searchIndex("search_terms", {
			searchField: "searchText",
			filterFields: ["taxonomyId"],
		}),

	/**
	 * Content Entry Tags Table (Junction Table)
	 *
	 * Links content entries to taxonomy terms.
	 * Enables many-to-many relationships between entries and terms.
	 * This junction table approach supports efficient queries in both directions.
	 */
	contentEntryTags: defineTable({
		/** Reference to the content entry */
		entryId: v.id("contentEntries"),
		/** Reference to the taxonomy term */
		termId: v.id("taxonomyTerms"),
		/** Reference to the taxonomy (denormalized for efficient filtering) */
		taxonomyId: v.id("taxonomies"),
		/** The field name that holds this tag (supports multiple tag fields per entry) */
		fieldName: v.string(),
		/** Order of this tag within the field (for maintaining user's tag order) */
		sortOrder: v.optional(v.number()),
	})
		// Index for finding all tags on an entry
		.index("by_entry", ["entryId"])
		// Index for finding all entries with a specific term
		.index("by_term", ["termId"])
		// Index for finding entries by taxonomy
		.index("by_taxonomy", ["taxonomyId"])
		// Index for finding tags for a specific entry and field
		.index("by_entry_and_field", ["entryId", "fieldName"])
		// Compound index for finding entries with a specific term in a taxonomy
		.index("by_taxonomy_and_term", ["taxonomyId", "termId"]),
	trashConfig: defineTable({
		retentionDays: v.number(),
		autoCleanupEnabled: v.boolean(),
		lastCleanupAt: v.optional(v.number()),
		lastCleanupCount: v.optional(v.number()),
		updatedBy: v.optional(v.string()),
	}),

	/**
	 * CMS Events Table
	 *
	 * Stores events for content changes (created, updated, published, deleted).
	 * Events are stored for async processing by external systems, webhooks,
	 * audit logging, and other integrations.
	 *
	 * Events are immutable once created - they represent a historical record
	 * of what happened in the CMS.
	 */
	cmsEvents: defineTable({
		/**
		 * The type of event that occurred.
		 * Format: "{resource}.{action}" (e.g., "contentEntry.created")
		 */
		eventType: v.string(),
		/**
		 * The resource type this event relates to.
		 * One of: "contentEntry", "contentType", "mediaAsset", "mediaFolder"
		 */
		resourceType: v.union(
			v.literal("contentEntry"),
			v.literal("contentType"),
			v.literal("mediaAsset"),
			v.literal("mediaFolder"),
		),
		/**
		 * The ID of the affected resource (as a string for flexibility).
		 * This is the _id of the content entry, content type, media asset, etc.
		 */
		resourceId: v.string(),
		/**
		 * The action that was performed on the resource.
		 */
		action: v.union(
			v.literal("created"),
			v.literal("updated"),
			v.literal("published"),
			v.literal("unpublished"),
			v.literal("deleted"),
			v.literal("restored"),
			v.literal("duplicated"),
			v.literal("scheduled"),
		),
		/**
		 * Snapshot of key data at the time of the event.
		 * Structure varies by resource type but typically includes:
		 * - For contentEntry: { slug, contentTypeName, status, version }
		 * - For contentType: { name, displayName }
		 * - For mediaAsset: { filename, type, mimeType }
		 */
		payload: v.any(),
		/**
		 * User ID who triggered this event (from parent app).
		 */
		userId: v.optional(v.string()),
		/**
		 * Whether this event has been processed by async handlers.
		 * Can be used for at-least-once processing guarantees.
		 */
		processed: v.boolean(),
		/**
		 * Timestamp when the event was processed (if processed).
		 */
		processedAt: v.optional(v.number()),
		/**
		 * Optional correlation ID for grouping related events.
		 * Useful for tracking bulk operations or complex workflows.
		 */
		correlationId: v.optional(v.string()),
		/**
		 * Optional metadata for the event (e.g., IP address, user agent).
		 */
		metadata: v.optional(v.any()),
	})
		// Index for listing events by type
		.index("by_event_type", ["eventType"])
		// Index for finding events for a specific resource
		.index("by_resource", ["resourceType", "resourceId"])
		// Index for processing unprocessed events
		.index("by_processed", ["processed"])
		// Index for listing events by user
		.index("by_user", ["userId"])
		// Index for finding events by correlation ID
		.index("by_correlation_id", ["correlationId"]),

	/**
	 * Audit Logs Table
	 *
	 * Comprehensive audit logging for all CMS operations.
	 * Records user, action, timestamp, and before/after states.
	 * Unlike cmsEvents (which are for operational processing like webhooks),
	 * auditLogs are optimized for compliance, security auditing, and history retrieval.
	 *
	 * Key differences from cmsEvents:
	 * - Stores complete before/after state snapshots for diff analysis
	 * - Longer retention (typically permanent for compliance)
	 * - Rich filtering for audit trail queries
	 * - Includes IP address and user agent for security auditing
	 */
	auditLogs: defineTable({
		/**
		 * The type of resource that was affected.
		 * One of: "contentEntry", "contentType", "mediaAsset", "mediaFolder", "settings"
		 */
		resourceType: v.union(
			v.literal("contentEntry"),
			v.literal("contentType"),
			v.literal("mediaAsset"),
			v.literal("mediaFolder"),
			v.literal("settings"),
		),
		/**
		 * The ID of the affected resource (as a string for flexibility).
		 * This is the _id of the content entry, content type, media asset, etc.
		 */
		resourceId: v.string(),
		/**
		 * The action that was performed on the resource.
		 */
		action: v.union(
			v.literal("created"),
			v.literal("updated"),
			v.literal("published"),
			v.literal("unpublished"),
			v.literal("deleted"),
			v.literal("restored"),
			v.literal("duplicated"),
			v.literal("scheduled"),
			v.literal("locked"),
			v.literal("unlocked"),
			v.literal("rolledBack"),
			v.literal("migrated"),
		),
		/**
		 * User ID who performed this action.
		 * May be undefined for system-initiated operations.
		 */
		userId: v.optional(v.string()),
		/**
		 * Human-readable user display name or email (for easier log reading).
		 */
		userDisplayName: v.optional(v.string()),
		/**
		 * The complete state of the resource BEFORE the action.
		 * Null for "created" actions.
		 * Stores a serializable snapshot of the resource.
		 */
		previousState: v.optional(v.any()),
		/**
		 * The complete state of the resource AFTER the action.
		 * Null for "deleted" actions.
		 * Stores a serializable snapshot of the resource.
		 */
		newState: v.optional(v.any()),
		/**
		 * Summary of what changed (for quick log reading without full diff).
		 * e.g., "Updated title, status changed from draft to published"
		 */
		changeSummary: v.optional(v.string()),
		/**
		 * List of field names that were changed (for "updated" actions).
		 * Enables quick filtering for specific field changes.
		 */
		changedFields: v.optional(v.array(v.string())),
		/**
		 * IP address of the user who made the change (for security auditing).
		 */
		ipAddress: v.optional(v.string()),
		/**
		 * User agent string (for security auditing).
		 */
		userAgent: v.optional(v.string()),
		/**
		 * Session ID for correlating multiple actions in a single session.
		 */
		sessionId: v.optional(v.string()),
		/**
		 * Request ID for correlating actions in a single API request.
		 */
		requestId: v.optional(v.string()),
		/**
		 * Additional context or metadata about the action.
		 * e.g., { reason: "Scheduled publish", batchId: "..." }
		 */
		metadata: v.optional(v.any()),
		/**
		 * Content type name (for content entries, cached for filtering).
		 */
		contentTypeName: v.optional(v.string()),
		/**
		 * Entry slug (for content entries, cached for filtering).
		 */
		entrySlug: v.optional(v.string()),
	})
		// Index for listing audit logs by resource
		.index("by_resource", ["resourceType", "resourceId"])
		// Index for listing audit logs by user
		.index("by_user", ["userId"])
		// Index for listing audit logs by action type
		.index("by_action", ["action"])
		// Index for filtering by resource type
		.index("by_resource_type", ["resourceType"])
		// Index for filtering by content type (content entries only)
		.index("by_content_type", ["contentTypeName"])
		// Compound index for filtering by resource type and action
		.index("by_resource_type_and_action", ["resourceType", "action"])
		// Compound index for filtering by user and action
		.index("by_user_and_action", ["userId", "action"]),

	/**
	 * Webhook Configurations Table
	 *
	 * Stores webhook endpoint configurations that define how and when
	 * to deliver CMS events to external systems.
	 *
	 * Each webhook configuration specifies:
	 * - Target URL to receive events
	 * - Which event types to deliver
	 * - Authentication settings (secret for HMAC signing)
	 * - Retry behavior and rate limiting
	 */
	webhookConfigs: defineTable({
		/**
		 * Human-readable name for this webhook configuration.
		 * e.g., "Production CDN Invalidation", "Search Index Sync"
		 */
		name: v.string(),
		/**
		 * Optional description of what this webhook does.
		 */
		description: v.optional(v.string()),
		/**
		 * The target URL to receive webhook POST requests.
		 * Must be HTTPS in production for security.
		 */
		url: v.string(),
		/**
		 * Secret key for HMAC-SHA256 signature generation.
		 * Used to sign payloads so receivers can verify authenticity.
		 * Stored securely and never exposed in API responses.
		 */
		secret: v.optional(v.string()),
		/**
		 * Event types this webhook should receive.
		 * Format: ["contentEntry.published", "contentEntry.deleted", ...]
		 * If empty, receives all events (not recommended for production).
		 */
		eventTypes: v.array(v.string()),
		/**
		 * Resource types to filter (optional).
		 * If specified, only events for these resource types are delivered.
		 */
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
		/**
		 * Content types to filter (optional).
		 * If specified, only events for entries of these content types are delivered.
		 * Only applies to contentEntry events.
		 */
		contentTypes: v.optional(v.array(v.string())),
		/**
		 * Additional HTTP headers to include in webhook requests.
		 * e.g., {"Authorization": "Bearer token", "X-Custom-Header": "value"}
		 */
		headers: v.optional(v.any()),
		/**
		 * Whether this webhook configuration is currently active.
		 * Disabled webhooks don't receive events but retain configuration.
		 */
		enabled: v.boolean(),
		/**
		 * Maximum retry attempts for failed deliveries (default: 5).
		 * After exhausting retries, the delivery is marked as failed.
		 */
		maxRetries: v.optional(v.number()),
		/**
		 * Timeout in milliseconds for webhook requests (default: 30000).
		 * Requests exceeding this timeout are considered failed.
		 */
		timeoutMs: v.optional(v.number()),
		/**
		 * Soft delete marker.
		 */
		deletedAt: v.optional(v.number()),
		/**
		 * User ID who created this webhook configuration.
		 */
		createdBy: v.optional(v.string()),
		/**
		 * User ID who last updated this webhook configuration.
		 */
		updatedBy: v.optional(v.string()),
	})
		// Index for listing active webhooks
		.index("by_enabled", ["enabled"])
		// Index for filtering out soft-deleted webhooks
		.index("by_deleted", ["deletedAt"]),

	/**
	 * Webhook Deliveries Table
	 *
	 * Tracks delivery attempts for webhook events.
	 * Provides audit trail, debugging, and retry logic support.
	 *
	 * Each delivery record represents a single attempt to deliver
	 * an event to a webhook endpoint.
	 */
	webhookDeliveries: defineTable({
		/**
		 * Reference to the webhook configuration.
		 */
		webhookId: v.id("webhookConfigs"),
		/**
		 * Reference to the CMS event being delivered.
		 */
		eventId: v.id("cmsEvents"),
		/**
		 * The event type (copied for efficient querying).
		 */
		eventType: v.string(),
		/**
		 * Current delivery status:
		 * - pending: Queued for delivery
		 * - processing: Currently being sent
		 * - delivered: Successfully delivered (2xx response)
		 * - failed: All retry attempts exhausted
		 * - retrying: Will be retried
		 */
		status: v.union(
			v.literal("pending"),
			v.literal("processing"),
			v.literal("delivered"),
			v.literal("failed"),
			v.literal("retrying"),
		),
		/**
		 * Number of delivery attempts made.
		 */
		attemptCount: v.number(),
		/**
		 * Maximum attempts allowed (copied from config for consistency).
		 */
		maxAttempts: v.number(),
		/**
		 * Timestamp of the last delivery attempt.
		 */
		lastAttemptAt: v.optional(v.number()),
		/**
		 * Timestamp when the next retry should occur.
		 * Used for exponential backoff scheduling.
		 */
		nextRetryAt: v.optional(v.number()),
		/**
		 * HTTP status code from the last attempt.
		 */
		lastStatusCode: v.optional(v.number()),
		/**
		 * Error message from the last failed attempt.
		 */
		lastError: v.optional(v.string()),
		/**
		 * Response body snippet from the last attempt (truncated for storage).
		 */
		lastResponseBody: v.optional(v.string()),
		/**
		 * Duration of the last request in milliseconds.
		 */
		lastDurationMs: v.optional(v.number()),
		/**
		 * The payload that was/will be sent (snapshot for debugging).
		 */
		payload: v.any(),
		/**
		 * Timestamp when delivery was successfully confirmed.
		 */
		deliveredAt: v.optional(v.number()),
	})
		// Index for finding deliveries by webhook
		.index("by_webhook", ["webhookId"])
		// Index for finding deliveries by event
		.index("by_event", ["eventId"])
		// Index for finding deliveries by status (for processing queue)
		.index("by_status", ["status"])
		// Index for finding deliveries pending retry
		.index("by_next_retry", ["status", "nextRetryAt"])
		// Index for finding deliveries by webhook and status
		.index("by_webhook_and_status", ["webhookId", "status"]),
});

export default schema;

/**
 * Export the schema's table validators for use in other modules.
 * These can be extended for function return validators.
 */
export const {
	contentTypes,
	contentEntries,
	contentVersions,
	mediaItems,
	mediaVariants,
	taxonomies,
	taxonomyTerms,
	contentEntryTags,
	cmsEvents,
	auditLogs,
	webhookConfigs,
	webhookDeliveries,
} = schema.tables;
