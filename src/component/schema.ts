import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Field type definitions supported by the CMS.
 * Each field type has specific validation rules and rendering behaviors.
 */
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

/**
 * Base field definition shared by all field types.
 */
const baseFieldDefinition = {
	/** Unique identifier for the field within the content type */
	name: v.string(),
	/** Human-readable label for the field */
	label: v.string(),
	/** The type of field (text, richText, number, etc.) */
	type: fieldTypeValidator,
	/** Whether this field is required */
	required: v.boolean(),
	/** Whether this field should be indexed for search */
	searchable: v.optional(v.boolean()),
	/** Whether this field should support localization */
	localized: v.optional(v.boolean()),
	/** Optional description/help text for the field */
	description: v.optional(v.string()),
	/** Default value for the field (type depends on field type) */
	defaultValue: v.optional(v.any()),
};

/**
 * Field-specific options for different field types.
 * This allows type-specific configuration like min/max for numbers,
 * allowed content types for references, etc.
 */
const fieldOptionsValidator = v.optional(
	v.object({
		// Text fields
		minLength: v.optional(v.number()),
		maxLength: v.optional(v.number()),
		pattern: v.optional(v.string()),

		// Number fields
		min: v.optional(v.number()),
		max: v.optional(v.number()),
		step: v.optional(v.number()),
		precision: v.optional(v.number()),

		// Reference fields
		allowedContentTypes: v.optional(v.array(v.string())),
		multiple: v.optional(v.boolean()),
		/** Minimum number of references required (only applies when multiple is true) */
		minItems: v.optional(v.number()),

		// Media fields
		allowedMimeTypes: v.optional(v.array(v.string())),
		maxFileSize: v.optional(v.number()),

		// Select fields
		options: v.optional(
			v.array(
				v.object({
					value: v.string(),
					label: v.string(),
				}),
			),
		),

		// Rich text fields
		allowedBlocks: v.optional(v.array(v.string())),
		allowedMarks: v.optional(v.array(v.string())),

		// Tag fields
		/** The taxonomy ID to use for this tag field */
		taxonomyId: v.optional(v.id("taxonomies")),
		/** Whether to allow creating new tags inline */
		allowCreate: v.optional(v.boolean()),
		/** Maximum number of tags that can be selected */
		maxTags: v.optional(v.number()),
		/** Minimum number of tags required */
		minTags: v.optional(v.number()),

		// Category fields
		/** Whether to allow selecting multiple categories */
		allowMultiple: v.optional(v.boolean()),
	}),
);

/**
 * Complete field definition including base fields and type-specific options.
 */
export const fieldDefinitionValidator = v.object({
	...baseFieldDefinition,
	options: fieldOptionsValidator,
});

/**
 * Content entry status for publishing workflow.
 */
export const contentStatusValidator = v.union(
	v.literal("draft"),
	v.literal("published"),
	v.literal("archived"),
	v.literal("scheduled"),
);

/**
 * Media asset type classification.
 */
export const mediaTypeValidator = v.union(
	v.literal("image"),
	v.literal("video"),
	v.literal("audio"),
	v.literal("document"),
	v.literal("other"),
);

/**
 * Media variant type classification.
 */
export const variantTypeValidator = v.union(
	v.literal("thumbnail"),
	v.literal("responsive"),
	v.literal("format"),
);

/**
 * Media variant generation status.
 */
export const variantStatusValidator = v.union(
	v.literal("pending"),
	v.literal("processing"),
	v.literal("completed"),
	v.literal("failed"),
);

/**
 * Core CMS Schema Definition
 *
 * Defines five main tables:
 * 1. content_types - Schema definitions for content
 * 2. content_entries - Actual content instances
 * 3. content_versions - Version history with snapshots
 * 4. media_assets - File storage records
 * 5. media_folders - Folder organization
 */
const schema = defineSchema({
	/**
	 * Content Types Table
	 *
	 * Stores content type definitions including field schemas.
	 * Each content type defines a blueprint for creating content entries.
	 */
	content_types: defineTable({
		/** Unique machine-readable name for the content type (e.g., "blog_post") */
		name: v.string(),
		/** Human-readable display name (e.g., "Blog Post") */
		displayName: v.string(),
		/** Optional description of the content type */
		description: v.optional(v.string()),
		/** Array of field definitions that make up this content type */
		fields: v.array(fieldDefinitionValidator),
		/** Icon identifier for UI display */
		icon: v.optional(v.string()),
		/** Whether this content type is a singleton (only one entry allowed) */
		singleton: v.optional(v.boolean()),
		/** Field name to use for generating slugs (defaults to "title") */
		slugField: v.optional(v.string()),
		/** Field name to use as the title/display name in lists */
		titleField: v.optional(v.string()),
		/** Custom sort order for admin UI */
		sortOrder: v.optional(v.number()),
		/** Whether this content type is active/enabled */
		isActive: v.boolean(),
		/** Soft delete marker */
		deletedAt: v.optional(v.number()),
		/** User ID who created this content type (passed from parent app) */
		createdBy: v.optional(v.string()),
		/** User ID who last updated this content type */
		updatedBy: v.optional(v.string()),
	})
		// Index for looking up content types by name (must be unique)
		.index("by_name", ["name"])
		// Index for listing active content types
		.index("by_active", ["isActive"])
		// Index for filtering out soft-deleted types
		.index("by_deleted", ["deletedAt"]),

	/**
	 * Content Entries Table
	 *
	 * Stores actual content instances created from content types.
	 * Supports draft/publish workflow and localization.
	 */
	content_entries: defineTable({
		/** Reference to the content type this entry belongs to */
		contentTypeId: v.id("content_types"),
		/** URL-friendly slug for this entry (unique per content type) */
		slug: v.string(),
		/** Current status of the entry */
		status: contentStatusValidator,
		/** The actual content data (validated against content type schema at runtime) */
		data: v.any(),
		/** Locale code for this entry (e.g., "en-US") */
		locale: v.optional(v.string()),
		/** Reference to the primary entry if this is a localized variant */
		primaryEntryId: v.optional(v.id("content_entries")),
		/** Current version number */
		version: v.number(),
		/** Scheduled publish time (if status is "scheduled") */
		scheduledPublishAt: v.optional(v.number()),
		/** When the entry was first published */
		firstPublishedAt: v.optional(v.number()),
		/** When the entry was last published */
		lastPublishedAt: v.optional(v.number()),
		/** User ID who has locked this entry for editing */
		lockedBy: v.optional(v.string()),
		/** When the lock expires */
		lockExpiresAt: v.optional(v.number()),
		/** Soft delete marker */
		deletedAt: v.optional(v.number()),
		/** User ID who created this entry */
		createdBy: v.optional(v.string()),
		/** User ID who last updated this entry */
		updatedBy: v.optional(v.string()),
		/** Searchable text extracted from content for full-text search */
		searchText: v.optional(v.string()),
	})
		// Index for looking up entries by content type
		.index("by_content_type", ["contentTypeId"])
		// Index for looking up entries by slug within a content type
		.index("by_content_type_and_slug", ["contentTypeId", "slug"])
		// Index for filtering by status
		.index("by_status", ["status"])
		// Index for filtering by content type and status
		.index("by_content_type_and_status", ["contentTypeId", "status"])
		// Index for finding localized variants
		.index("by_primary_entry", ["primaryEntryId"])
		// Index for finding entries by locale
		.index("by_locale", ["locale"])
		// Index for filtering out soft-deleted entries
		.index("by_deleted", ["deletedAt"])
		// Index for scheduled publishing jobs
		.index("by_scheduled_publish", ["status", "scheduledPublishAt"])
		// Index for finding locked entries
		.index("by_locked", ["lockedBy"])
		// Search index for full-text search on content
		.searchIndex("search_content", {
			searchField: "searchText",
			filterFields: ["contentTypeId", "status", "locale"],
		}),

	/**
	 * Content Versions Table
	 *
	 * Stores version snapshots for content entries.
	 * Enables version history, comparison, and rollback.
	 */
	content_versions: defineTable({
		/** Reference to the content entry this version belongs to */
		entryId: v.id("content_entries"),
		/** Version number (incrementing) */
		versionNumber: v.number(),
		/** Snapshot of the content data at this version */
		data: v.any(),
		/** Snapshot of the slug at this version */
		slug: v.string(),
		/** Status when this version was created */
		status: contentStatusValidator,
		/** Optional description of changes in this version */
		changeDescription: v.optional(v.string()),
		/** User ID who created this version */
		createdBy: v.optional(v.string()),
		/** Whether this version was published */
		wasPublished: v.boolean(),
		/** When this version was published (if ever) */
		publishedAt: v.optional(v.number()),
	})
		// Index for listing versions of an entry
		.index("by_entry", ["entryId"])
		// Index for getting a specific version of an entry
		.index("by_entry_and_version", ["entryId", "versionNumber"])
		// Index for finding published versions
		.index("by_entry_and_published", ["entryId", "wasPublished"]),

	/**
	 * Media Assets Table
	 *
	 * Stores metadata for uploaded media files.
	 * Actual files are stored using Convex File Storage.
	 */
	media_assets: defineTable({
		/** Reference to the Convex storage file */
		storageId: v.id("_storage"),
		/** Original filename as uploaded */
		filename: v.string(),
		/** MIME type of the file */
		mimeType: v.string(),
		/** File size in bytes */
		size: v.number(),
		/** Classified media type (image, video, audio, document, other) */
		type: mediaTypeValidator,
		/** Human-readable title/alt text */
		title: v.optional(v.string()),
		/** Description/caption for the asset */
		description: v.optional(v.string()),
		/** Alt text for accessibility (images) */
		altText: v.optional(v.string()),
		/** Reference to the folder containing this asset */
		folderId: v.optional(v.id("media_folders")),
		/** Image dimensions (if applicable) */
		width: v.optional(v.number()),
		height: v.optional(v.number()),
		/** Duration in seconds (for video/audio) */
		duration: v.optional(v.number()),
		/** Additional metadata extracted from the file */
		metadata: v.optional(v.any()),
		/** Tags for organization and filtering */
		tags: v.optional(v.array(v.string())),
		/** Soft delete marker */
		deletedAt: v.optional(v.number()),
		/** User ID who uploaded this asset */
		createdBy: v.optional(v.string()),
		/** Searchable text for finding assets */
		searchText: v.optional(v.string()),
	})
		// Index for looking up assets by storage ID
		.index("by_storage_id", ["storageId"])
		// Index for listing assets in a folder
		.index("by_folder", ["folderId"])
		// Index for filtering by media type
		.index("by_type", ["type"])
		// Index for filtering by MIME type
		.index("by_mime_type", ["mimeType"])
		// Index for filtering out soft-deleted assets
		.index("by_deleted", ["deletedAt"])
		// Search index for finding assets by name/description
		.searchIndex("search_assets", {
			searchField: "searchText",
			filterFields: ["type", "folderId"],
		}),

	/**
	 * Media Variants Table
	 *
	 * Stores optimized variants of media assets (thumbnails, responsive sizes, format conversions).
	 * Each variant references a parent media asset and has its own storage file.
	 * Supports automatic generation of responsive image sets and format optimization.
	 */
	media_variants: defineTable({
		/** Reference to the parent media asset */
		assetId: v.id("media_assets"),
		/** Reference to the Convex storage file for this variant */
		storageId: v.id("_storage"),
		/**
		 * Type of variant:
		 * - thumbnail: Small preview image (typically square crop)
		 * - responsive: Sized for responsive images (maintains aspect ratio)
		 * - format: Same dimensions but different file format (e.g., WebP, AVIF)
		 */
		variantType: v.union(
			v.literal("thumbnail"),
			v.literal("responsive"),
			v.literal("format"),
		),
		/** Target width in pixels (null for format-only conversions that maintain original size) */
		width: v.optional(v.number()),
		/** Target height in pixels (null for format-only conversions that maintain original size) */
		height: v.optional(v.number()),
		/** Output format of the variant (e.g., "webp", "avif", "jpeg", "png") */
		format: v.string(),
		/** MIME type of the variant file */
		mimeType: v.string(),
		/** File size of the variant in bytes */
		size: v.number(),
		/** Quality setting used (0-100, applicable for lossy formats) */
		quality: v.optional(v.number()),
		/**
		 * Preset name if this variant was generated from a predefined preset.
		 * Common presets: "thumbnail", "small", "medium", "large", "webp", "avif"
		 */
		preset: v.optional(v.string()),
		/** Whether this variant was auto-generated vs manually created */
		autoGenerated: v.boolean(),
		/** Generation status for tracking async processing */
		status: v.union(
			v.literal("pending"),
			v.literal("processing"),
			v.literal("completed"),
			v.literal("failed"),
		),
		/** Error message if generation failed */
		errorMessage: v.optional(v.string()),
		/** Timestamp when processing started */
		processingStartedAt: v.optional(v.number()),
		/** Timestamp when processing completed */
		processingCompletedAt: v.optional(v.number()),
		/** Soft delete marker */
		deletedAt: v.optional(v.number()),
		/** User ID who created/requested this variant */
		createdBy: v.optional(v.string()),
	})
		// Index for listing all variants of an asset
		.index("by_asset", ["assetId"])
		// Index for finding specific variant by asset and type
		.index("by_asset_and_type", ["assetId", "variantType"])
		// Index for finding variants by preset
		.index("by_asset_and_preset", ["assetId", "preset"])
		// Index for finding variants by format
		.index("by_asset_and_format", ["assetId", "format"])
		// Index for finding pending/processing variants (for job queue)
		.index("by_status", ["status"])
		// Index for filtering out soft-deleted variants
		.index("by_deleted", ["deletedAt"]),

	/**
	 * Media Folders Table
	 *
	 * Provides folder hierarchy for organizing media assets.
	 * Supports nested folders for complex organization.
	 */
	media_folders: defineTable({
		/** Folder name */
		name: v.string(),
		/** Reference to parent folder (null for root folders) */
		parentId: v.optional(v.id("media_folders")),
		/** Full path from root (e.g., "/images/blog/2026") */
		path: v.string(),
		/** Description of the folder */
		description: v.optional(v.string()),
		/** Custom sort order */
		sortOrder: v.optional(v.number()),
		/** Soft delete marker */
		deletedAt: v.optional(v.number()),
		/** User ID who created this folder */
		createdBy: v.optional(v.string()),
	})
		// Index for listing child folders
		.index("by_parent", ["parentId"])
		// Index for looking up folders by path
		.index("by_path", ["path"])
		// Index for filtering out soft-deleted folders
		.index("by_deleted", ["deletedAt"]),

	/**
	 * Taxonomies Table
	 *
	 * Stores taxonomy definitions (tag groups, categories, topics, etc.).
	 * Each taxonomy defines a classification system that can be applied to content.
	 *
	 * A taxonomy can be:
	 * - Flat (like tags): Terms exist at the same level
	 * - Hierarchical (like categories): Terms can have parent-child relationships
	 */
	taxonomies: defineTable({
		/** Unique machine-readable name for the taxonomy (e.g., "tags", "categories", "topics") */
		name: v.string(),
		/** Human-readable display name (e.g., "Tags", "Categories", "Topics") */
		displayName: v.string(),
		/** Optional description of the taxonomy */
		description: v.optional(v.string()),
		/**
		 * Whether this taxonomy supports hierarchical terms.
		 * When true, terms can have parent-child relationships (like categories).
		 * When false, terms are flat (like tags).
		 */
		isHierarchical: v.boolean(),
		/**
		 * Whether users can create new terms inline when editing content.
		 * If false, only pre-defined terms can be used.
		 */
		allowInlineCreation: v.boolean(),
		/** Icon identifier for UI display */
		icon: v.optional(v.string()),
		/** Custom sort order for admin UI */
		sortOrder: v.optional(v.number()),
		/** Whether this taxonomy is active/enabled */
		isActive: v.boolean(),
		/** Soft delete marker */
		deletedAt: v.optional(v.number()),
		/** User ID who created this taxonomy */
		createdBy: v.optional(v.string()),
		/** User ID who last updated this taxonomy */
		updatedBy: v.optional(v.string()),
	})
		// Index for looking up taxonomies by name (must be unique)
		.index("by_name", ["name"])
		// Index for listing active taxonomies
		.index("by_active", ["isActive"])
		// Index for filtering out soft-deleted taxonomies
		.index("by_deleted", ["deletedAt"]),

	/**
	 * Taxonomy Terms Table
	 *
	 * Stores individual terms within a taxonomy (tags, categories, etc.).
	 * Terms can be hierarchical (with parent references) for category-like structures.
	 */
	taxonomy_terms: defineTable({
		/** Reference to the taxonomy this term belongs to */
		taxonomyId: v.id("taxonomies"),
		/** Unique slug for the term within its taxonomy (URL-friendly) */
		slug: v.string(),
		/** Human-readable name for the term */
		name: v.string(),
		/** Optional description of the term */
		description: v.optional(v.string()),
		/** Reference to parent term (for hierarchical taxonomies) */
		parentId: v.optional(v.id("taxonomy_terms")),
		/** Full path from root for hierarchical terms (e.g., "/parent/child/grandchild") */
		path: v.optional(v.string()),
		/** Depth level in hierarchy (0 = root, 1 = child, etc.) */
		depth: v.number(),
		/** Color code for visual display (hex color) */
		color: v.optional(v.string()),
		/** Icon identifier for UI display */
		icon: v.optional(v.string()),
		/** Custom sort order within siblings */
		sortOrder: v.optional(v.number()),
		/** Cached count of content entries using this term */
		usageCount: v.number(),
		/** Soft delete marker */
		deletedAt: v.optional(v.number()),
		/** User ID who created this term */
		createdBy: v.optional(v.string()),
		/** User ID who last updated this term */
		updatedBy: v.optional(v.string()),
		/** Searchable text for finding terms */
		searchText: v.optional(v.string()),
	})
		// Index for listing terms within a taxonomy
		.index("by_taxonomy", ["taxonomyId"])
		// Index for looking up terms by taxonomy and slug (unique combo)
		.index("by_taxonomy_and_slug", ["taxonomyId", "slug"])
		// Index for finding child terms
		.index("by_parent", ["parentId"])
		// Index for finding terms by path (efficient for hierarchical lookups)
		.index("by_taxonomy_and_path", ["taxonomyId", "path"])
		// Index for filtering out soft-deleted terms
		.index("by_deleted", ["deletedAt"])
		// Index for finding popular terms (by usage count)
		.index("by_taxonomy_and_usage", ["taxonomyId", "usageCount"])
		// Search index for finding terms by name
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
	content_entry_tags: defineTable({
		/** Reference to the content entry */
		entryId: v.id("content_entries"),
		/** Reference to the taxonomy term */
		termId: v.id("taxonomy_terms"),
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

	/**
	 * Trash Configuration Table
	 *
	 * Stores configuration settings for the trash/soft-delete feature.
	 * This is a singleton table - only one configuration record should exist.
	 */
	trash_config: defineTable({
		/**
		 * Retention period in days before soft-deleted items are permanently deleted.
		 * Default is 30 days. Set to 0 to disable automatic cleanup.
		 */
		retentionDays: v.number(),
		/** Whether automatic trash cleanup is enabled */
		autoCleanupEnabled: v.boolean(),
		/** Last time the auto-cleanup ran (for debugging/monitoring) */
		lastCleanupAt: v.optional(v.number()),
		/** Number of items deleted in last cleanup */
		lastCleanupCount: v.optional(v.number()),
		/** User ID who last updated the config */
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
	cms_events: defineTable({
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
	 * Unlike cms_events (which are for operational processing like webhooks),
	 * audit_logs are optimized for compliance, security auditing, and history retrieval.
	 *
	 * Key differences from cms_events:
	 * - Stores complete before/after state snapshots for diff analysis
	 * - Longer retention (typically permanent for compliance)
	 * - Rich filtering for audit trail queries
	 * - Includes IP address and user agent for security auditing
	 */
	audit_logs: defineTable({
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
	webhook_configs: defineTable({
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
	webhook_deliveries: defineTable({
		/**
		 * Reference to the webhook configuration.
		 */
		webhookId: v.id("webhook_configs"),
		/**
		 * Reference to the CMS event being delivered.
		 */
		eventId: v.id("cms_events"),
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
	content_types,
	content_entries,
	content_versions,
	media_assets,
	media_variants,
	media_folders,
	taxonomies,
	taxonomy_terms,
	content_entry_tags,
	cms_events,
	audit_logs,
	webhook_configs,
	webhook_deliveries,
} = schema.tables;
