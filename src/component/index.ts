/**
 * Convex CMS Component - Internal Exports
 *
 * This file exports validators and utilities for use within the component.
 * External consumers should use the client API from @convex-cms/core instead.
 */

// Schema and Convex validators
export { default as schema } from "./schema.js";
export {
  fieldTypeValidator,
  fieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
} from "./schema.js";

// Field type validators and CRUD argument validators
export {
  // Field type constants
  fieldTypes,
  contentStatuses,
  mediaTypes,
  type FieldType,
  type ContentStatus,
  type MediaType,

  // Content type validators
  createContentTypeArgs,
  updateContentTypeArgs,

  // Content entry validators
  createContentEntryArgs,
  updateContentEntryArgs,
  publishEntryArgs,
  unpublishEntryArgs,
  scheduleEntryArgs,
  deleteContentEntryArgs,

  // Version validators
  getVersionHistoryArgs,
  rollbackVersionArgs,

  // Media validators
  createMediaAssetArgs,
  updateMediaAssetArgs,
  createMediaFolderArgs,
  updateMediaFolderArgs,
  moveFolderArgs,

  // Query validators
  paginationArgs,
  contentQueryArgs,
  mediaQueryArgs,

  // Document validators
  contentTypeDoc,
  contentEntryDoc,
  contentVersionDoc,
  mediaAssetDoc,
  mediaFolderDoc,

  // Utilities
  paginatedResponseValidator,
} from "./validators.js";

// Runtime validation functions
export {
  // Types
  type FieldOptions,
  type FieldDefinition,
  type ContentTypeSchema,
  type ContentData,
  type ValidationError,
  type ValidationErrorCode,
  type ValidationResult,

  // Individual field validators
  validateTextField,
  validateRichTextField,
  validateNumberField,
  validateBooleanField,
  validateDateField,
  validateReferenceField,
  validateMediaField,
  validateSelectField,
  validateMultiSelectField,
  validateJsonField,

  // Main validation functions
  validateFieldValue,
  validateContentData,
  applyFieldDefaults,

  // Utilities
  getFieldType,
  isFieldRequired,
} from "./validation.js";

// Slug generator utilities
export {
  generateSlug,
  isValidSlug,
  generateUniqueSlug,
  type SlugOptions,
} from "./lib/slugGenerator.js";

// Note: Content entry queries and mutations are exported directly from their
// respective files (contentEntries.ts, contentEntryMutations.ts) and are used
// by Convex at runtime. They are not re-exported here because they depend on
// generated types that are only available after `npx convex codegen` runs.
//
// Available query functions (import from ./contentEntries.js):
//   - get: Retrieve a content entry by ID
//   - getBySlug: Retrieve a content entry by slug and content type ID
//   - getBySlugAndTypeName: Retrieve a content entry by slug and content type name
//   - list: List content entries with filtering and pagination
//
// Available mutation functions (import from ./contentEntryMutations.js):
//   - createEntry: Create a new content entry (starts as draft by default)
//   - updateEntry: Update an existing content entry
//   - publishEntry: Publish a draft entry (transitions to published status)
//   - unpublishEntry: Unpublish a published entry (reverts to draft status)
//   - deleteEntry: Delete a content entry (soft or hard delete)
//   - restoreEntry: Restore a soft-deleted content entry
//
// Available mutation functions (import from ./contentTypeMutations.js):
//   - createContentType: Create a new content type with field definitions
