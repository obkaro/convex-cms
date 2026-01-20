/**
 * Shared validators for the CMS component.
 *
 * These validators can be imported and used in function definitions
 * to ensure type-safe arguments and return values.
 *
 * Provides:
 * - Field type validators for content type definitions
 * - Argument validators for CRUD operations
 * - Document validators for return types
 */

import { v } from "convex/values";
import schema, {
  fieldTypeValidator,
  fieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
} from "./schema.js";

// Re-export schema validators for convenience
export {
  fieldTypeValidator,
  fieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
};

// =============================================================================
// Field Type Constants
// =============================================================================

/**
 * All supported field types in the CMS
 */
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
] as const;

export type FieldType = (typeof fieldTypes)[number];

/**
 * Content status values
 */
export const contentStatuses = [
  "draft",
  "published",
  "archived",
  "scheduled",
] as const;

export type ContentStatus = (typeof contentStatuses)[number];

/**
 * Media type values
 */
export const mediaTypes = [
  "image",
  "video",
  "audio",
  "document",
  "other",
] as const;

export type MediaType = (typeof mediaTypes)[number];

// =============================================================================
// Content Type Validators
// =============================================================================

/**
 * Validator for content type creation arguments.
 */
export const createContentTypeArgs = v.object({
  name: v.string(),
  displayName: v.string(),
  description: v.optional(v.string()),
  fields: v.array(fieldDefinitionValidator),
  icon: v.optional(v.string()),
  singleton: v.optional(v.boolean()),
  slugField: v.optional(v.string()),
  titleField: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  createdBy: v.optional(v.string()),
});

/**
 * Validator for content type update arguments.
 */
export const updateContentTypeArgs = v.object({
  id: v.id("content_types"),
  displayName: v.optional(v.string()),
  description: v.optional(v.string()),
  fields: v.optional(v.array(fieldDefinitionValidator)),
  icon: v.optional(v.string()),
  singleton: v.optional(v.boolean()),
  slugField: v.optional(v.string()),
  titleField: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  isActive: v.optional(v.boolean()),
  updatedBy: v.optional(v.string()),
});

// =============================================================================
// Content Entry Validators
// =============================================================================

/**
 * Validator for content entry creation arguments.
 */
export const createContentEntryArgs = v.object({
  contentTypeId: v.id("content_types"),
  slug: v.optional(v.string()),
  data: v.any(),
  locale: v.optional(v.string()),
  primaryEntryId: v.optional(v.id("content_entries")),
  status: v.optional(contentStatusValidator),
  createdBy: v.optional(v.string()),
});

/**
 * Validator for content entry update arguments.
 */
export const updateContentEntryArgs = v.object({
  id: v.id("content_entries"),
  slug: v.optional(v.string()),
  data: v.optional(v.any()),
  status: v.optional(contentStatusValidator),
  scheduledPublishAt: v.optional(v.number()),
  updatedBy: v.optional(v.string()),
});

/**
 * Validator for publishing an entry.
 */
export const publishEntryArgs = v.object({
  id: v.id("content_entries"),
  changeDescription: v.optional(v.string()),
  updatedBy: v.optional(v.string()),
});

/**
 * Validator for scheduling an entry.
 */
export const scheduleEntryArgs = v.object({
  id: v.id("content_entries"),
  publishAt: v.number(),
  updatedBy: v.optional(v.string()),
});

/**
 * Validator for unpublishing an entry (reverting to draft).
 */
export const unpublishEntryArgs = v.object({
  id: v.id("content_entries"),
  updatedBy: v.optional(v.string()),
});

/**
 * Validator for deleting a content entry.
 * Supports both soft delete (default) and hard delete options.
 */
export const deleteContentEntryArgs = v.object({
  /** The ID of the content entry to delete */
  id: v.id("content_entries"),
  /** User ID performing the deletion (for audit trail) */
  deletedBy: v.optional(v.string()),
  /** If true, permanently deletes the entry and all versions. Default is soft delete. */
  hardDelete: v.optional(v.boolean()),
});

// =============================================================================
// Version Validators
// =============================================================================

/**
 * Validator for getting version history.
 */
export const getVersionHistoryArgs = v.object({
  entryId: v.id("content_entries"),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
});

/**
 * Validator for rolling back to a version.
 */
export const rollbackVersionArgs = v.object({
  entryId: v.id("content_entries"),
  versionNumber: v.number(),
  updatedBy: v.optional(v.string()),
});

// =============================================================================
// Media Asset Validators
// =============================================================================

/**
 * Validator for media asset creation arguments.
 */
export const createMediaAssetArgs = v.object({
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  size: v.number(),
  type: mediaTypeValidator,
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  altText: v.optional(v.string()),
  folderId: v.optional(v.id("media_folders")),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  duration: v.optional(v.number()),
  metadata: v.optional(v.any()),
  tags: v.optional(v.array(v.string())),
  createdBy: v.optional(v.string()),
});

/**
 * Validator for media asset update arguments.
 */
export const updateMediaAssetArgs = v.object({
  id: v.id("media_assets"),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  altText: v.optional(v.string()),
  folderId: v.optional(v.id("media_folders")),
  tags: v.optional(v.array(v.string())),
});

// =============================================================================
// Media Folder Validators
// =============================================================================

/**
 * Validator for media folder creation arguments.
 */
export const createMediaFolderArgs = v.object({
  name: v.string(),
  parentId: v.optional(v.id("media_folders")),
  description: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  createdBy: v.optional(v.string()),
});

/**
 * Validator for media folder update arguments.
 */
export const updateMediaFolderArgs = v.object({
  id: v.id("media_folders"),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
});

/**
 * Validator for moving a folder.
 */
export const moveFolderArgs = v.object({
  id: v.id("media_folders"),
  newParentId: v.optional(v.id("media_folders")),
});

// =============================================================================
// Query/Pagination Validators
// =============================================================================

/**
 * Validator for legacy pagination options (cursor + limit format).
 * @deprecated Use paginationOptsValidator from convex/server for new implementations.
 */
export const paginationArgs = v.object({
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
});

/**
 * Validator for standard Convex pagination result.
 * This is the return type used by convex-helpers paginator.
 *
 * @example
 * ```typescript
 * // Define a query that returns paginated content entries
 * returns: paginationResultValidator(contentEntryDoc),
 * ```
 */
export const paginationResultValidator = <T>(itemValidator: T) =>
  v.object({
    /** Array of items for the current page */
    page: v.array(itemValidator as any),
    /** Cursor to continue fetching (null if no more results) */
    continueCursor: v.union(v.string(), v.null()),
    /** Whether this is the last page (no more results available) */
    isDone: v.boolean(),
  });

/**
 * Validator for content query filters.
 */
export const contentQueryArgs = v.object({
  contentTypeId: v.optional(v.id("content_types")),
  contentTypeName: v.optional(v.string()),
  /** Filter by a single status (for backward compatibility) */
  status: v.optional(contentStatusValidator),
  /** Filter by multiple statuses (e.g., ["draft", "scheduled"] for admin views) */
  statusIn: v.optional(v.array(contentStatusValidator)),
  locale: v.optional(v.string()),
  search: v.optional(v.string()),
  includeDeleted: v.optional(v.boolean()),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
});

/**
 * Validator for media query filters.
 */
export const mediaQueryArgs = v.object({
  folderId: v.optional(v.id("media_folders")),
  type: v.optional(mediaTypeValidator),
  mimeType: v.optional(v.string()),
  search: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  includeDeleted: v.optional(v.boolean()),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
});

// =============================================================================
// Document Validators (for return types)
// =============================================================================

/**
 * Document validators for return types.
 * These extend the schema validators with system fields.
 */
export const contentTypeDoc = v.object({
  _id: v.id("content_types"),
  _creationTime: v.number(),
  name: v.string(),
  displayName: v.string(),
  description: v.optional(v.string()),
  fields: v.array(fieldDefinitionValidator),
  icon: v.optional(v.string()),
  singleton: v.optional(v.boolean()),
  slugField: v.optional(v.string()),
  titleField: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  isActive: v.boolean(),
  deletedAt: v.optional(v.number()),
  createdBy: v.optional(v.string()),
  updatedBy: v.optional(v.string()),
});

export const contentEntryDoc = v.object({
  _id: v.id("content_entries"),
  _creationTime: v.number(),
  contentTypeId: v.id("content_types"),
  slug: v.string(),
  status: contentStatusValidator,
  data: v.any(),
  locale: v.optional(v.string()),
  primaryEntryId: v.optional(v.id("content_entries")),
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
});

export const contentVersionDoc = v.object({
  _id: v.id("content_versions"),
  _creationTime: v.number(),
  entryId: v.id("content_entries"),
  versionNumber: v.number(),
  data: v.any(),
  slug: v.string(),
  status: contentStatusValidator,
  changeDescription: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  wasPublished: v.boolean(),
  publishedAt: v.optional(v.number()),
});

export const mediaAssetDoc = v.object({
  _id: v.id("media_assets"),
  _creationTime: v.number(),
  storageId: v.id("_storage"),
  filename: v.string(),
  mimeType: v.string(),
  size: v.number(),
  type: mediaTypeValidator,
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  altText: v.optional(v.string()),
  folderId: v.optional(v.id("media_folders")),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  duration: v.optional(v.number()),
  metadata: v.optional(v.any()),
  tags: v.optional(v.array(v.string())),
  deletedAt: v.optional(v.number()),
  createdBy: v.optional(v.string()),
  searchText: v.optional(v.string()),
});

export const mediaFolderDoc = v.object({
  _id: v.id("media_folders"),
  _creationTime: v.number(),
  name: v.string(),
  parentId: v.optional(v.id("media_folders")),
  path: v.string(),
  description: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  deletedAt: v.optional(v.number()),
  createdBy: v.optional(v.string()),
});

// =============================================================================
// Paginated Response Validators
// =============================================================================

/**
 * Legacy paginated response shape.
 * @deprecated Use paginationResultValidator for new implementations.
 */
export const paginatedResponseValidator = <T>(itemValidator: T) =>
  v.object({
    items: v.array(itemValidator as any),
    cursor: v.optional(v.string()),
    hasMore: v.boolean(),
  });

// Export the schema for reference
export { schema };
