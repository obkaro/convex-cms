/**
 * Centralized Error Handling Module
 *
 * Provides structured error codes, error classes, and helper functions
 * for consistent error handling across all mutation files.
 *
 * Error Format:
 * - code: Machine-readable error code (e.g., "CONTENT_TYPE_NOT_FOUND")
 * - category: Error category for routing (e.g., "NOT_FOUND", "DELETED")
 * - message: Human-readable description
 * - context: Additional data for debugging (resource IDs, states, etc.)
 */

// =============================================================================
// Error Categories
// =============================================================================

/**
 * High-level error categories for routing and handling.
 */
export type ErrorCategory =
  | "NOT_FOUND"
  | "DELETED"
  | "INACTIVE"
  | "STATE_CONFLICT"
  | "VALIDATION"
  | "PERMISSION"
  | "LOCK_CONFLICT"
  | "REFERENCE_CONFLICT"
  | "LIMIT_EXCEEDED"
  | "INTERNAL";

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Content Type Error Codes
 */
export const ContentTypeErrorCodes = {
  NOT_FOUND: "CONTENT_TYPE_NOT_FOUND",
  DELETED: "CONTENT_TYPE_DELETED",
  INACTIVE: "CONTENT_TYPE_INACTIVE",
  NAME_INVALID: "CONTENT_TYPE_NAME_INVALID",
  NAME_DUPLICATE: "CONTENT_TYPE_NAME_DUPLICATE",
  FIELD_VALIDATION_FAILED: "CONTENT_TYPE_FIELD_VALIDATION_FAILED",
  SLUG_FIELD_INVALID: "CONTENT_TYPE_SLUG_FIELD_INVALID",
  TITLE_FIELD_INVALID: "CONTENT_TYPE_TITLE_FIELD_INVALID",
  HAS_ENTRIES: "CONTENT_TYPE_HAS_ENTRIES",
  BREAKING_CHANGE: "CONTENT_TYPE_BREAKING_CHANGE",
} as const;

/**
 * Content Entry Error Codes
 */
export const ContentEntryErrorCodes = {
  NOT_FOUND: "CONTENT_ENTRY_NOT_FOUND",
  DELETED: "CONTENT_ENTRY_DELETED",
  NOT_DELETED: "CONTENT_ENTRY_NOT_DELETED",
  ALREADY_PUBLISHED: "CONTENT_ENTRY_ALREADY_PUBLISHED",
  NOT_PUBLISHED: "CONTENT_ENTRY_NOT_PUBLISHED",
  ARCHIVED: "CONTENT_ENTRY_ARCHIVED",
  VALIDATION_FAILED: "CONTENT_ENTRY_VALIDATION_FAILED",
  SLUG_CONFLICT: "CONTENT_ENTRY_SLUG_CONFLICT",
  LOCKED: "CONTENT_ENTRY_LOCKED",
  CREATE_FAILED: "CONTENT_ENTRY_CREATE_FAILED",
  UPDATE_FAILED: "CONTENT_ENTRY_UPDATE_FAILED",
} as const;

/**
 * Media Asset Error Codes
 */
export const MediaAssetErrorCodes = {
  NOT_FOUND: "MEDIA_ASSET_NOT_FOUND",
  DELETED: "MEDIA_ASSET_DELETED",
  NOT_DELETED: "MEDIA_ASSET_NOT_DELETED",
  HAS_REFERENCES: "MEDIA_ASSET_HAS_REFERENCES",
  CREATE_FAILED: "MEDIA_ASSET_CREATE_FAILED",
  UPDATE_FAILED: "MEDIA_ASSET_UPDATE_FAILED",
  UPLOAD_INVALID: "MEDIA_ASSET_UPLOAD_INVALID",
} as const;

/**
 * Media Folder Error Codes
 */
export const MediaFolderErrorCodes = {
  NOT_FOUND: "MEDIA_FOLDER_NOT_FOUND",
  DELETED: "MEDIA_FOLDER_DELETED",
  NOT_DELETED: "MEDIA_FOLDER_NOT_DELETED",
  NAME_INVALID: "MEDIA_FOLDER_NAME_INVALID",
  NAME_DUPLICATE: "MEDIA_FOLDER_NAME_DUPLICATE",
  DEPTH_EXCEEDED: "MEDIA_FOLDER_DEPTH_EXCEEDED",
  PATH_TOO_LONG: "MEDIA_FOLDER_PATH_TOO_LONG",
  HAS_CONTENTS: "MEDIA_FOLDER_HAS_CONTENTS",
  CIRCULAR_MOVE: "MEDIA_FOLDER_CIRCULAR_MOVE",
  PARENT_DELETED: "MEDIA_FOLDER_PARENT_DELETED",
  CREATE_FAILED: "MEDIA_FOLDER_CREATE_FAILED",
} as const;

/**
 * Version Error Codes
 */
export const VersionErrorCodes = {
  NOT_FOUND: "VERSION_NOT_FOUND",
  ENTRY_NOT_FOUND: "VERSION_ENTRY_NOT_FOUND",
  ENTRY_DELETED: "VERSION_ENTRY_DELETED",
  MISMATCH: "VERSION_MISMATCH",
  ROLLBACK_FAILED: "VERSION_ROLLBACK_FAILED",
} as const;

/**
 * General Error Codes
 */
export const GeneralErrorCodes = {
  BATCH_SIZE_EXCEEDED: "BATCH_SIZE_EXCEEDED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

/**
 * Union type of all error codes from all categories.
 * Use the specific error code objects (ContentTypeErrorCodes, etc.) to access values.
 */
export type ErrorCode =
  | (typeof ContentTypeErrorCodes)[keyof typeof ContentTypeErrorCodes]
  | (typeof ContentEntryErrorCodes)[keyof typeof ContentEntryErrorCodes]
  | (typeof MediaAssetErrorCodes)[keyof typeof MediaAssetErrorCodes]
  | (typeof MediaFolderErrorCodes)[keyof typeof MediaFolderErrorCodes]
  | (typeof VersionErrorCodes)[keyof typeof VersionErrorCodes]
  | (typeof GeneralErrorCodes)[keyof typeof GeneralErrorCodes];

/**
 * Combined object containing all error codes for reference.
 * Note: Due to key collisions (e.g., NOT_FOUND exists in multiple categories),
 * use the specific error code objects for accessing values in code.
 * This object is primarily useful for listing all possible error code values.
 */
export const ErrorCodes = {
  // Content Type Errors
  CONTENT_TYPE_NOT_FOUND: ContentTypeErrorCodes.NOT_FOUND,
  CONTENT_TYPE_DELETED: ContentTypeErrorCodes.DELETED,
  CONTENT_TYPE_INACTIVE: ContentTypeErrorCodes.INACTIVE,
  CONTENT_TYPE_NAME_INVALID: ContentTypeErrorCodes.NAME_INVALID,
  CONTENT_TYPE_NAME_DUPLICATE: ContentTypeErrorCodes.NAME_DUPLICATE,
  CONTENT_TYPE_FIELD_VALIDATION_FAILED: ContentTypeErrorCodes.FIELD_VALIDATION_FAILED,
  CONTENT_TYPE_SLUG_FIELD_INVALID: ContentTypeErrorCodes.SLUG_FIELD_INVALID,
  CONTENT_TYPE_TITLE_FIELD_INVALID: ContentTypeErrorCodes.TITLE_FIELD_INVALID,
  CONTENT_TYPE_HAS_ENTRIES: ContentTypeErrorCodes.HAS_ENTRIES,
  CONTENT_TYPE_BREAKING_CHANGE: ContentTypeErrorCodes.BREAKING_CHANGE,
  // Content Entry Errors
  CONTENT_ENTRY_NOT_FOUND: ContentEntryErrorCodes.NOT_FOUND,
  CONTENT_ENTRY_DELETED: ContentEntryErrorCodes.DELETED,
  CONTENT_ENTRY_NOT_DELETED: ContentEntryErrorCodes.NOT_DELETED,
  CONTENT_ENTRY_ALREADY_PUBLISHED: ContentEntryErrorCodes.ALREADY_PUBLISHED,
  CONTENT_ENTRY_NOT_PUBLISHED: ContentEntryErrorCodes.NOT_PUBLISHED,
  CONTENT_ENTRY_ARCHIVED: ContentEntryErrorCodes.ARCHIVED,
  CONTENT_ENTRY_VALIDATION_FAILED: ContentEntryErrorCodes.VALIDATION_FAILED,
  CONTENT_ENTRY_SLUG_CONFLICT: ContentEntryErrorCodes.SLUG_CONFLICT,
  CONTENT_ENTRY_LOCKED: ContentEntryErrorCodes.LOCKED,
  CONTENT_ENTRY_CREATE_FAILED: ContentEntryErrorCodes.CREATE_FAILED,
  CONTENT_ENTRY_UPDATE_FAILED: ContentEntryErrorCodes.UPDATE_FAILED,
  // Media Asset Errors
  MEDIA_ASSET_NOT_FOUND: MediaAssetErrorCodes.NOT_FOUND,
  MEDIA_ASSET_DELETED: MediaAssetErrorCodes.DELETED,
  MEDIA_ASSET_NOT_DELETED: MediaAssetErrorCodes.NOT_DELETED,
  MEDIA_ASSET_HAS_REFERENCES: MediaAssetErrorCodes.HAS_REFERENCES,
  MEDIA_ASSET_CREATE_FAILED: MediaAssetErrorCodes.CREATE_FAILED,
  MEDIA_ASSET_UPDATE_FAILED: MediaAssetErrorCodes.UPDATE_FAILED,
  MEDIA_ASSET_UPLOAD_INVALID: MediaAssetErrorCodes.UPLOAD_INVALID,
  // Media Folder Errors
  MEDIA_FOLDER_NOT_FOUND: MediaFolderErrorCodes.NOT_FOUND,
  MEDIA_FOLDER_DELETED: MediaFolderErrorCodes.DELETED,
  MEDIA_FOLDER_NOT_DELETED: MediaFolderErrorCodes.NOT_DELETED,
  MEDIA_FOLDER_NAME_INVALID: MediaFolderErrorCodes.NAME_INVALID,
  MEDIA_FOLDER_NAME_DUPLICATE: MediaFolderErrorCodes.NAME_DUPLICATE,
  MEDIA_FOLDER_DEPTH_EXCEEDED: MediaFolderErrorCodes.DEPTH_EXCEEDED,
  MEDIA_FOLDER_PATH_TOO_LONG: MediaFolderErrorCodes.PATH_TOO_LONG,
  MEDIA_FOLDER_HAS_CONTENTS: MediaFolderErrorCodes.HAS_CONTENTS,
  MEDIA_FOLDER_CIRCULAR_MOVE: MediaFolderErrorCodes.CIRCULAR_MOVE,
  MEDIA_FOLDER_PARENT_DELETED: MediaFolderErrorCodes.PARENT_DELETED,
  MEDIA_FOLDER_CREATE_FAILED: MediaFolderErrorCodes.CREATE_FAILED,
  // Version Errors
  VERSION_NOT_FOUND: VersionErrorCodes.NOT_FOUND,
  VERSION_ENTRY_NOT_FOUND: VersionErrorCodes.ENTRY_NOT_FOUND,
  VERSION_ENTRY_DELETED: VersionErrorCodes.ENTRY_DELETED,
  VERSION_MISMATCH: VersionErrorCodes.MISMATCH,
  VERSION_ROLLBACK_FAILED: VersionErrorCodes.ROLLBACK_FAILED,
  // General Errors
  BATCH_SIZE_EXCEEDED: GeneralErrorCodes.BATCH_SIZE_EXCEEDED,
  PERMISSION_DENIED: GeneralErrorCodes.PERMISSION_DENIED,
  INTERNAL_ERROR: GeneralErrorCodes.INTERNAL_ERROR,
} as const;

// =============================================================================
// Error Context Types
// =============================================================================

/**
 * Context for resource-related errors
 */
export interface ResourceErrorContext {
  resourceType: "contentType" | "contentEntry" | "mediaAsset" | "mediaFolder" | "version";
  resourceId?: string;
  resourceName?: string;
  currentState?: string;
  expectedState?: string;
}

/**
 * Context for validation errors
 */
export interface ValidationErrorContext {
  fields?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  details?: string;
}

/**
 * Context for lock-related errors
 */
export interface LockErrorContext {
  lockedBy?: string;
  lockedAt?: number;
  currentUser?: string;
}

/**
 * Context for reference-related errors
 */
export interface ReferenceErrorContext {
  referencingResources?: Array<{
    type: string;
    id: string;
    name?: string;
  }>;
  referenceCount?: number;
}

/**
 * Union type for all error contexts
 */
export type CMSErrorContext =
  | ResourceErrorContext
  | ValidationErrorContext
  | LockErrorContext
  | ReferenceErrorContext
  | Record<string, unknown>;

// =============================================================================
// CMS Error Class
// =============================================================================

/**
 * Custom error class for CMS operations.
 *
 * Provides structured error information including:
 * - Machine-readable error code
 * - Error category for routing
 * - Human-readable message
 * - Additional context for debugging
 *
 * @example
 * ```typescript
 * throw new CMSError(
 *   ErrorCodes.CONTENT_TYPE_NOT_FOUND,
 *   "NOT_FOUND",
 *   `Content type not found: ${id}`,
 *   { resourceType: "contentType", resourceId: id }
 * );
 * ```
 */
export class CMSError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly context?: CMSErrorContext;

  constructor(
    code: ErrorCode,
    category: ErrorCategory,
    message: string,
    context?: CMSErrorContext
  ) {
    // Format message to include code for easier debugging
    const formattedMessage = `[${code}] ${message}`;
    super(formattedMessage);
    this.name = "CMSError";
    this.code = code;
    this.category = category;
    this.context = context;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CMSError);
    }
  }

  /**
   * Convert error to a plain object for serialization.
   */
  toJSON(): {
    name: string;
    code: ErrorCode;
    category: ErrorCategory;
    message: string;
    context?: CMSErrorContext;
  } {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      context: this.context,
    };
  }
}

// =============================================================================
// Error Factory Functions
// =============================================================================

// -----------------------------------------------------------------------------
// Content Type Errors
// -----------------------------------------------------------------------------

export function contentTypeNotFound(id: string): CMSError {
  return new CMSError(
    ContentTypeErrorCodes.NOT_FOUND,
    "NOT_FOUND",
    `Content type not found. The content type with ID "${id}" does not exist.`,
    { resourceType: "contentType", resourceId: id }
  );
}

export function contentTypeDeleted(id: string, name?: string): CMSError {
  const identifier = name ? `"${name}" (${id})` : `"${id}"`;
  return new CMSError(
    ContentTypeErrorCodes.DELETED,
    "DELETED",
    `Content type ${identifier} has been deleted. Restore it first to perform this operation.`,
    { resourceType: "contentType", resourceId: id, resourceName: name, currentState: "deleted" }
  );
}

export function contentTypeInactive(id: string, name?: string): CMSError {
  const identifier = name ? `"${name}"` : `"${id}"`;
  return new CMSError(
    ContentTypeErrorCodes.INACTIVE,
    "INACTIVE",
    `Content type ${identifier} is not active. Activate it first to create entries.`,
    { resourceType: "contentType", resourceId: id, resourceName: name, currentState: "inactive" }
  );
}

export function contentTypeNameInvalid(name: string): CMSError {
  return new CMSError(
    ContentTypeErrorCodes.NAME_INVALID,
    "VALIDATION",
    `Invalid content type name "${name}". Name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores (1-64 characters).`,
    { details: `Provided name: "${name}"` }
  );
}

export function contentTypeNameDuplicate(name: string): CMSError {
  return new CMSError(
    ContentTypeErrorCodes.NAME_DUPLICATE,
    "STATE_CONFLICT",
    `A content type with name "${name}" already exists. Please choose a different name.`,
    { resourceType: "contentType", resourceName: name }
  );
}

export function contentTypeFieldValidationFailed(
  errors: Array<{ fieldName: string; message: string; code?: string }>
): CMSError {
  const errorMessages = errors.map((e) => `${e.fieldName}: ${e.message}`).join("; ");
  return new CMSError(
    ContentTypeErrorCodes.FIELD_VALIDATION_FAILED,
    "VALIDATION",
    `Invalid field definitions: ${errorMessages}`,
    { fields: errors.map((e) => ({ field: e.fieldName, message: e.message, code: e.code })) }
  );
}

export function contentTypeSlugFieldInvalid(slugField: string, availableFields: string[]): CMSError {
  return new CMSError(
    ContentTypeErrorCodes.SLUG_FIELD_INVALID,
    "VALIDATION",
    `slugField "${slugField}" does not reference an existing field. Available fields: ${availableFields.join(", ")}`,
    { details: `Invalid slugField: "${slugField}"` }
  );
}

export function contentTypeTitleFieldInvalid(titleField: string, availableFields: string[]): CMSError {
  return new CMSError(
    ContentTypeErrorCodes.TITLE_FIELD_INVALID,
    "VALIDATION",
    `titleField "${titleField}" does not reference an existing field. Available fields: ${availableFields.join(", ")}`,
    { details: `Invalid titleField: "${titleField}"` }
  );
}

export function contentTypeHasEntries(id: string, name: string, entryCount: number): CMSError {
  return new CMSError(
    ContentTypeErrorCodes.HAS_ENTRIES,
    "REFERENCE_CONFLICT",
    `Cannot delete content type "${name}": it has ${entryCount} content ${entryCount === 1 ? "entry" : "entries"}. Delete all entries first or use force delete.`,
    {
      resourceType: "contentType",
      resourceId: id,
      resourceName: name,
      referenceCount: entryCount,
    } as ResourceErrorContext & { referenceCount: number }
  );
}

export function contentTypeBreakingChange(
  breakingChanges: Array<{ type: string; fieldName: string; message: string; affectedEntriesCount: number }>
): CMSError {
  const summary = breakingChanges
    .map((bc) => `- ${bc.fieldName}: ${bc.message} (affects ${bc.affectedEntriesCount} entries)`)
    .join("\n");
  return new CMSError(
    ContentTypeErrorCodes.BREAKING_CHANGE,
    "STATE_CONFLICT",
    `Cannot update content type due to breaking changes:\n${summary}\n\nUse allowBreakingChanges: true to force the update.`,
    { details: summary }
  );
}

// -----------------------------------------------------------------------------
// Content Entry Errors
// -----------------------------------------------------------------------------

export function contentEntryNotFound(id: string): CMSError {
  return new CMSError(
    ContentEntryErrorCodes.NOT_FOUND,
    "NOT_FOUND",
    `Content entry not found. The entry with ID "${id}" does not exist.`,
    { resourceType: "contentEntry", resourceId: id }
  );
}

export function contentEntryDeleted(id: string): CMSError {
  return new CMSError(
    ContentEntryErrorCodes.DELETED,
    "DELETED",
    `Content entry "${id}" has been deleted. Restore it from trash first to perform this operation.`,
    { resourceType: "contentEntry", resourceId: id, currentState: "deleted" }
  );
}

export function contentEntryNotDeleted(id: string): CMSError {
  return new CMSError(
    ContentEntryErrorCodes.NOT_DELETED,
    "STATE_CONFLICT",
    `Content entry "${id}" is not deleted. Only deleted entries can be restored.`,
    { resourceType: "contentEntry", resourceId: id, currentState: "active", expectedState: "deleted" }
  );
}

export function contentEntryAlreadyPublished(id: string): CMSError {
  return new CMSError(
    ContentEntryErrorCodes.ALREADY_PUBLISHED,
    "STATE_CONFLICT",
    `Content entry "${id}" is already published. Use update instead if you want to modify it.`,
    { resourceType: "contentEntry", resourceId: id, currentState: "published", expectedState: "draft" }
  );
}

export function contentEntryNotPublished(id: string, currentStatus: string): CMSError {
  return new CMSError(
    ContentEntryErrorCodes.NOT_PUBLISHED,
    "STATE_CONFLICT",
    `Content entry "${id}" is not published. Current status: "${currentStatus}". Only published entries can be unpublished.`,
    { resourceType: "contentEntry", resourceId: id, currentState: currentStatus, expectedState: "published" }
  );
}

export function contentEntryArchived(id: string): CMSError {
  return new CMSError(
    ContentEntryErrorCodes.ARCHIVED,
    "STATE_CONFLICT",
    `Cannot publish archived content entry "${id}". Restore it from archive first.`,
    { resourceType: "contentEntry", resourceId: id, currentState: "archived" }
  );
}

export function contentEntryValidationFailed(
  errors: Array<{ field: string; message: string }>
): CMSError {
  const errorMessages = errors.map((e) => `${e.field}: ${e.message}`).join("; ");
  return new CMSError(
    ContentEntryErrorCodes.VALIDATION_FAILED,
    "VALIDATION",
    `Content validation failed: ${errorMessages}`,
    { fields: errors }
  );
}

export function contentEntryLocked(
  entryId: string,
  lockedBy: string,
  lockedAt: number,
  currentUser?: string
): CMSError {
  const lockedDate = new Date(lockedAt).toISOString();
  return new CMSError(
    ContentEntryErrorCodes.LOCKED,
    "LOCK_CONFLICT",
    `Content entry "${entryId}" is locked by user "${lockedBy}" since ${lockedDate}. Only the lock holder can modify this entry.`,
    { lockedBy, lockedAt, currentUser }
  );
}

export function contentEntryCreateFailed(contentTypeId: string): CMSError {
  return new CMSError(
    ContentEntryErrorCodes.CREATE_FAILED,
    "INTERNAL",
    `Failed to create content entry for content type "${contentTypeId}". The entry was not persisted.`,
    { resourceType: "contentEntry" }
  );
}

export function contentEntryUpdateFailed(id: string): CMSError {
  return new CMSError(
    ContentEntryErrorCodes.UPDATE_FAILED,
    "INTERNAL",
    `Failed to retrieve content entry "${id}" after update. The update may have failed.`,
    { resourceType: "contentEntry", resourceId: id }
  );
}

// -----------------------------------------------------------------------------
// Media Asset Errors
// -----------------------------------------------------------------------------

export function mediaAssetNotFound(id: string): CMSError {
  return new CMSError(
    MediaAssetErrorCodes.NOT_FOUND,
    "NOT_FOUND",
    `Media asset not found. The asset with ID "${id}" does not exist.`,
    { resourceType: "mediaAsset", resourceId: id }
  );
}

export function mediaAssetDeleted(id: string): CMSError {
  return new CMSError(
    MediaAssetErrorCodes.DELETED,
    "DELETED",
    `Media asset "${id}" has been deleted. Restore it first to perform this operation.`,
    { resourceType: "mediaAsset", resourceId: id, currentState: "deleted" }
  );
}

export function mediaAssetNotDeleted(id: string): CMSError {
  return new CMSError(
    MediaAssetErrorCodes.NOT_DELETED,
    "STATE_CONFLICT",
    `Media asset "${id}" is not deleted. Only deleted assets can be restored.`,
    { resourceType: "mediaAsset", resourceId: id, currentState: "active", expectedState: "deleted" }
  );
}

export function mediaAssetHasReferences(
  id: string,
  references: Array<{ type: string; id: string; name?: string }>
): CMSError {
  const refSummary = references
    .slice(0, 5)
    .map((r) => `${r.type}: ${r.name || r.id}`)
    .join(", ");
  const moreCount = references.length > 5 ? ` and ${references.length - 5} more` : "";
  return new CMSError(
    MediaAssetErrorCodes.HAS_REFERENCES,
    "REFERENCE_CONFLICT",
    `Cannot delete media asset "${id}": it is referenced by ${references.length} ${references.length === 1 ? "resource" : "resources"} (${refSummary}${moreCount}). Remove references first or use force delete.`,
    { referencingResources: references, referenceCount: references.length }
  );
}

export function mediaAssetCreateFailed(): CMSError {
  return new CMSError(
    MediaAssetErrorCodes.CREATE_FAILED,
    "INTERNAL",
    "Failed to create media asset. The asset was not persisted.",
    { resourceType: "mediaAsset" }
  );
}

export function mediaAssetUpdateFailed(id: string): CMSError {
  return new CMSError(
    MediaAssetErrorCodes.UPDATE_FAILED,
    "INTERNAL",
    `Failed to retrieve media asset "${id}" after update. The update may have failed.`,
    { resourceType: "mediaAsset", resourceId: id }
  );
}

// -----------------------------------------------------------------------------
// Media Folder Errors
// -----------------------------------------------------------------------------

export function mediaFolderNotFound(id: string): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.NOT_FOUND,
    "NOT_FOUND",
    `Media folder not found. The folder with ID "${id}" does not exist.`,
    { resourceType: "mediaFolder", resourceId: id }
  );
}

export function mediaFolderDeleted(id: string): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.DELETED,
    "DELETED",
    `Media folder "${id}" has been deleted. Restore it first to perform this operation.`,
    { resourceType: "mediaFolder", resourceId: id, currentState: "deleted" }
  );
}

export function mediaFolderNotDeleted(id: string): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.NOT_DELETED,
    "STATE_CONFLICT",
    `Media folder "${id}" is not deleted. Only deleted folders can be restored.`,
    { resourceType: "mediaFolder", resourceId: id, currentState: "active", expectedState: "deleted" }
  );
}

export function mediaFolderNameInvalid(name: string, reason: string): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.NAME_INVALID,
    "VALIDATION",
    `Invalid folder name "${name}": ${reason}`,
    { details: reason }
  );
}

export function mediaFolderNameDuplicate(name: string, parentPath?: string): CMSError {
  const location = parentPath ? ` at "${parentPath}"` : " at this location";
  return new CMSError(
    MediaFolderErrorCodes.NAME_DUPLICATE,
    "STATE_CONFLICT",
    `A folder named "${name}" already exists${location}. Please choose a different name.`,
    { resourceType: "mediaFolder", resourceName: name }
  );
}

export function mediaFolderDepthExceeded(maxDepth: number, currentDepth: number): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.DEPTH_EXCEEDED,
    "LIMIT_EXCEEDED",
    `Cannot create folder: maximum nesting depth of ${maxDepth} exceeded. Current depth would be ${currentDepth}.`,
    { details: `Max depth: ${maxDepth}, attempted depth: ${currentDepth}` }
  );
}

export function mediaFolderPathTooLong(maxLength: number, pathLength: number): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.PATH_TOO_LONG,
    "LIMIT_EXCEEDED",
    `Cannot create folder: path would exceed maximum length of ${maxLength} characters (would be ${pathLength}).`,
    { details: `Max length: ${maxLength}, attempted length: ${pathLength}` }
  );
}

export function mediaFolderHasContents(
  id: string,
  folderCount: number,
  assetCount: number
): CMSError {
  const contents: string[] = [];
  if (folderCount > 0) contents.push(`${folderCount} ${folderCount === 1 ? "subfolder" : "subfolders"}`);
  if (assetCount > 0) contents.push(`${assetCount} ${assetCount === 1 ? "asset" : "assets"}`);
  return new CMSError(
    MediaFolderErrorCodes.HAS_CONTENTS,
    "REFERENCE_CONFLICT",
    `Cannot delete folder "${id}": it contains ${contents.join(" and ")}. Delete contents first or use recursive delete.`,
    { resourceType: "mediaFolder", resourceId: id }
  );
}

export function mediaFolderCircularMove(id: string): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.CIRCULAR_MOVE,
    "VALIDATION",
    `Cannot move folder "${id}" into itself or one of its descendants. This would create a circular reference.`,
    { resourceType: "mediaFolder", resourceId: id }
  );
}

export function mediaFolderParentDeleted(id: string, parentId: string): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.PARENT_DELETED,
    "STATE_CONFLICT",
    `Cannot restore folder "${id}": parent folder "${parentId}" is still deleted. Restore the parent folder first.`,
    { resourceType: "mediaFolder", resourceId: id }
  );
}

export function mediaFolderCreateFailed(): CMSError {
  return new CMSError(
    MediaFolderErrorCodes.CREATE_FAILED,
    "INTERNAL",
    "Failed to create media folder. The folder was not persisted.",
    { resourceType: "mediaFolder" }
  );
}

// -----------------------------------------------------------------------------
// Version Errors
// -----------------------------------------------------------------------------

export function versionNotFound(entryId: string, versionNumber: number): CMSError {
  return new CMSError(
    VersionErrorCodes.NOT_FOUND,
    "NOT_FOUND",
    `Version ${versionNumber} not found for entry "${entryId}". Check if the version number is correct.`,
    { resourceType: "version", resourceId: entryId }
  );
}

export function versionEntryNotFound(entryId: string): CMSError {
  return new CMSError(
    VersionErrorCodes.ENTRY_NOT_FOUND,
    "NOT_FOUND",
    `Content entry "${entryId}" not found. Cannot create version snapshot for non-existent entry.`,
    { resourceType: "contentEntry", resourceId: entryId }
  );
}

export function versionEntryDeleted(entryId: string): CMSError {
  return new CMSError(
    VersionErrorCodes.ENTRY_DELETED,
    "DELETED",
    `Content entry "${entryId}" has been deleted. Cannot create version snapshot or rollback deleted entries. Restore the entry first.`,
    { resourceType: "contentEntry", resourceId: entryId, currentState: "deleted" }
  );
}

export function versionMismatch(entryId: string, versionId: string): CMSError {
  return new CMSError(
    VersionErrorCodes.MISMATCH,
    "VALIDATION",
    `Version "${versionId}" does not belong to entry "${entryId}". Ensure you're using the correct version for this entry.`,
    { resourceType: "version", resourceId: versionId }
  );
}

export function versionRollbackFailed(entryId: string): CMSError {
  return new CMSError(
    VersionErrorCodes.ROLLBACK_FAILED,
    "INTERNAL",
    `Failed to retrieve entry "${entryId}" after rollback. The rollback may have failed.`,
    { resourceType: "contentEntry", resourceId: entryId }
  );
}

// -----------------------------------------------------------------------------
// General Errors
// -----------------------------------------------------------------------------

export function batchSizeExceeded(maxSize: number, requestedSize: number): CMSError {
  return new CMSError(
    GeneralErrorCodes.BATCH_SIZE_EXCEEDED,
    "LIMIT_EXCEEDED",
    `Batch size exceeds limit. Maximum ${maxSize} items per batch, but ${requestedSize} were requested.`,
    { details: `Max: ${maxSize}, requested: ${requestedSize}` }
  );
}

export function permissionDenied(action: string, resource: string): CMSError {
  return new CMSError(
    GeneralErrorCodes.PERMISSION_DENIED,
    "PERMISSION",
    `Permission denied: you do not have access to ${action} ${resource}.`,
    { details: `Action: ${action}, resource: ${resource}` }
  );
}

export function internalError(message: string): CMSError {
  return new CMSError(
    GeneralErrorCodes.INTERNAL_ERROR,
    "INTERNAL",
    `Internal error: ${message}`,
    { details: message }
  );
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an error is a CMSError.
 */
export function isCMSError(error: unknown): error is CMSError {
  return error instanceof CMSError;
}

/**
 * Type guard to check if an error has a specific error code.
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return isCMSError(error) && error.code === code;
}

/**
 * Type guard to check if an error is in a specific category.
 */
export function isErrorCategory(error: unknown, category: ErrorCategory): boolean {
  return isCMSError(error) && error.category === category;
}
