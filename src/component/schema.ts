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
  v.literal("multiSelect")
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
        })
      )
    ),

    // Rich text fields
    allowedBlocks: v.optional(v.array(v.string())),
    allowedMarks: v.optional(v.array(v.string())),
  })
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
  v.literal("scheduled")
);

/**
 * Media asset type classification.
 */
export const mediaTypeValidator = v.union(
  v.literal("image"),
  v.literal("video"),
  v.literal("audio"),
  v.literal("document"),
  v.literal("other")
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
    /** Full path from root (e.g., "/images/blog/2024") */
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
  media_folders,
} = schema.tables;
