/**
 * Convex CMS Component - Internal Exports
 *
 * This file exports validators and utilities for use within the component.
 * External consumers should use the client API from convex-cms instead.
 */

// Schema and Convex validators
export { default as schema } from "./schema.js";
export {
  fieldTypeValidator,
  fieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
  variantTypeValidator,
  variantStatusValidator,
} from "./schema.js";

// Field type validators and CRUD argument validators
export {
  // Content type validators
  createContentTypeArgs,
  updateContentTypeArgs,
  deleteContentTypeArgs,

  // Content entry validators
  createContentEntryArgs,
  updateContentEntryArgs,
  publishEntryArgs,
  unpublishEntryArgs,
  scheduleEntryArgs,
  deleteContentEntryArgs,
  duplicateContentEntryArgs,

  // Version validators
  getVersionHistoryArgs,
  getVersionArgs,
  rollbackVersionArgs,
  createVersionSnapshotArgs,
  compareVersionsArgs,
  versionFieldDiff,
  compareVersionsResult,

  // Media validators
  createMediaAssetArgs,
  deleteMediaAssetArgs,
  restoreMediaAssetArgs,
  createMediaFolderArgs,
  updateMediaFolderArgs,
  moveFolderArgs,
  deleteMediaFolderArgs,
  restoreMediaFolderArgs,

  // Query validators
  contentQueryArgs,
  mediaQueryArgs,
  listMediaAssetsArgs,
  mediaSortFieldValidator,
  mediaSortDirectionValidator,

  // Document validators
  contentTypeDoc,
  contentEntryDoc,
  contentVersionDoc,
  mediaItemDoc,
  mediaVariantDoc,
  mediaVariantWithUrlDoc,
  mediaAssetReference,

  // Media variant validators
  createMediaVariantArgs,
  requestVariantGenerationArgs,
  updateVariantStatusArgs,
  deleteMediaVariantArgs,
  deleteAssetVariantsArgs,
  getMediaVariantArgs,
  listMediaVariantsArgs,
  getBestVariantArgs,
  variantPresetValidator,
  generateVariantsResult,
  srcsetEntryValidator,
  responsiveSrcsetResult,

  // Bulk operation validators
  BULK_OPERATION_BATCH_SIZE,
  bulkPublishArgs,
  bulkUnpublishArgs,
  bulkDeleteArgs,
  bulkUpdateArgs,
  bulkOperationItemResult,
  bulkOperationResult,

  // Trash operation validators
  DEFAULT_TRASH_RETENTION_DAYS,
  trashConfigDoc,
  updateTrashConfigArgs,
  listTrashArgs,
  emptyTrashArgs,
  emptyTrashResult,
  trashItemDoc,

  // Content lock validators
  DEFAULT_LOCK_DURATION_MS,
  MAX_LOCK_DURATION_MS,
  acquireLockArgs,
  releaseLockArgs,
  forceReleaseLockArgs,
  renewLockArgs,
  checkLockArgs,
  listLockedEntriesArgs,
  lockStatusDoc,
  lockAcquisitionResult,

  // Event validators
  eventResourceTypes,
  eventActions,
  eventResourceTypeValidator,
  eventActionValidator,
  cmsEventDoc,
  listEventsArgs,
  getResourceEventsArgs,
  markEventsProcessedArgs,
  cleanupEventsArgs,
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
  type LocalizedValidationOptions,
  type ContentValidationOptions,

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

  // Localized field validation
  validateLocalizedFieldValue,

  // Main validation functions
  validateFieldValue,
  validateContentData,
  applyFieldDefaults,

  // Utilities
  getFieldType,
  isFieldRequired,
} from "./validation.js";

// Locale-specific content field storage and resolution
export {
  // Types
  type LocalizedFieldValue,
  type FieldValue,
  type LocaleResolutionOptions,
  type LocaleResolutionResult,
  type ResolveContentDataOptions,
  type ResolvedContentData,
  type LocaleResolvedEntry,
  type ResolveLocaleOptions,

  // Type guards
  isLocalizedFieldValue,
  isFieldLocalized,

  // Field value operations
  getLocalizedValue,
  setLocalizedValue,
  removeLocale,
  mergeLocalizedValues,
  getAvailableLocales,
  hasLocale,

  // Content data operations
  resolveContentData,
  setLocalizedContentData,
  getTranslationStatus,

  // Locale content resolution (query enhancement)
  resolveLocaleContent,
  resolveLocaleContentBatch,
} from "./localeFields.js";

// Slug generator utilities
export {
  generateSlug,
  isValidSlug,
  generateUniqueSlug,
  type SlugOptions,
} from "./lib/slugGenerator.js";

// Media reference resolution utilities
export {
  // Types
  type SingleMediaReference,
  type MultipleMediaReferences,
  type MediaReferenceValue,
  type ResolvedMediaReference,
  type MediaResolveOptions,
  type MediaResolveResult,
  type MediaValidationResult,

  // Core resolution functions
  resolveMediaReference,
  resolveMediaReferences,

  // Validation functions
  isValidMediaReference,
  validateAllMediaReferences,

  // Utility functions
  extractMediaIds,
  getMediaMimeType,
  matchesMimeTypePattern,
  matchesAnyMimeTypePattern,
} from "./lib/mediaReferenceResolver.js";

// Deep reference resolution utilities (recursive with depth limiting)
export {
  // Types
  type FieldDefinitionForResolver,
  type DeepResolveOptions,
  type ResolvedContentEntry,
  type BatchResolveResult,

  // Core resolution functions
  resolveEntryReferences,
  resolveEntryReferencesBatch,

  // Utility functions
  findCircularReferenceMarkers,
  flattenResolvedReferences,
  countResolvedReferences,
} from "./lib/deepReferenceResolver.js";

// Content entry validation types
export type {
  ContentEntryValidationResult,
  ValidateContentEntryOptions,
} from "./contentEntryValidation.js";

// Media metadata extraction utilities
export {
  // Main extraction function
  extractMetadata,

  // Helper functions
  extractExtension,
  classifyMimeType,
  calculateAspectRatio,
  formatDuration,
  suggestImageFormat,
  categorizeDocument,
  canPreviewDocument,

  // Validation helpers
  validateDimensions,
  validateDuration,
  validateFileSize,

  // Types
  type BaseMetadata,
  type ImageMetadata,
  type VideoMetadata,
  type AudioMetadata,
  type DocumentMetadata,
  type OtherMetadata,
  type ExtractedMetadata,
  type MetadataExtractionInput,
} from "./lib/metadataExtractor.js";

// Field filter types and utilities for content queries
export {
  filterOperatorValidator,
  fieldFilterValidator,
  matchesFieldFilter,
  matchesAllFieldFilters,
  type FilterOperator,
  type FieldFilter,
} from "./contentEntries.js";

// Sort types and validators for content queries
export {
  sortDirectionValidator,
  sortFieldValidator,
  sortOptionsValidator,
  type SortDirection,
  type SystemSortField,
  type SortField,
  type SortOptions,
} from "./contentEntries.js";

// RBAC Default Roles and Permission Utilities
export {
  // Role constants
  roleNames,
  type RoleName,
  roleNameValidator,

  // Resource and action constants
  resources,
  type Resource,
  resourceValidator,
  actions,
  type Action,
  actionValidator,

  // Permission types
  type OwnershipScope,
  type Permission,
  permissionValidator,
  type RoleDefinition,

  // Default roles
  ADMIN_ROLE,
  EDITOR_ROLE,
  AUTHOR_ROLE,
  VIEWER_ROLE,
  DEFAULT_ROLES,
  DEFAULT_ROLES_LIST,

  // Permission check utilities
  hasPermission,
  getRolePermissions,
  getRole,
  isBuiltInRole,
  getResourcePermissions,
  canAccessResource,
} from "./roles.js";

// Authorization - Permission Checking and Enforcement
export {
  // Error types
  UnauthorizedError,
  type AuthorizationErrorCode,

  // Core permission checking
  checkPermission,
  requirePermission,
  type PermissionCheckOptions,
  type PermissionGranted,
  type PermissionDenied,
  type PermissionCheckResult,

  // Ownership validation
  isResourceOwner,
  requireResourceOwnership,

  // Authorization context helpers
  createAuthContext,
  canPerform,
  mustPerform,
  type AuthorizationContext,
} from "./authorization.js";

// User Context Handler - Functions to receive and validate user context from parent apps
export {
  // Types
  type UserContextInput,
  type UserContext,
  type CreateUserContextOptions,
  type UserContextValidationError,
  type UserContextValidationResult,

  // Error class
  UserContextError,

  // Validation functions
  isValidUserId,
  isValidRole,
  validateUserContextInput,

  // User context creation
  resolveUserRole,
  createUserContext,
  createUserContextSync,

  // User ID extraction
  extractUserId,
  extractUserIdFromAuth,

  // Authorization context builders
  buildAuthorizationContext,
  createAnonymousContext,
  createSystemContext,

  // Utility functions
  isAuthenticated,
  hasUserRole,
  isSystemContext,
  getUserDisplayId,
  validateUserContext,
} from "./userContext.js";

// Export/Import Types and Validators
export {
  // Types
  type ExportedEntry,
  type ExportedContentType,
  type ExportPackage,
  type ConflictStrategy,
  type ImportEntryResult,
  type ImportResult,

  // Validators
  exportedEntryValidator,
  exportedContentTypeValidator,
  exportPackageValidator,
  conflictStrategyValidator,
  importEntryResultValidator,
  importResultValidator,
} from "./exportImport.js";

// Content Lock Helper Function (for update validation)
export { validateLockForUpdate } from "./contentLock.js";

// Event Emitter - Internal event system for content changes
export {
  // Types
  type EventResourceType,
  type EventAction,
  type EventType,
  type ContentEntryEventPayload,
  type ContentTypeEventPayload,
  type MediaAssetEventPayload,
  type MediaFolderEventPayload,
  type EventPayload,
  type EmitEventParams,
  type CMSEvent,

  // Event emission helper
  emitEvent,

  // Event type builders
  contentEntryEventType,
  contentTypeEventType,
  mediaAssetEventType,
  mediaFolderEventType,
} from "./eventEmitter.js";

// Content Type Migration Types and Utilities
export {
  // Types
  type MigrationOperationType,
  type BuiltInTransformation,
  type MigrationOperation,
  type EntryMigrationResult,
  type FieldChange,
  type MigrationResult,

  // Core migration function (for testing/custom use)
  applyMigrations,

  // Validators
  migrationOperationValidator,
  migrateContentTypeArgs,
  migrationResultValidator,
} from "./contentTypeMigration.js";

// Media Variant Types and Presets
export {
  // Default variant presets (thumbnail, small, medium, large, xlarge, webp, avif)
  DEFAULT_VARIANT_PRESETS,
} from "./mediaVariants.js";

// RAG Content Indexer
export {
  // Types
  type RagIndexerConfig,
  type IndexEntryResult,
  type ProcessEventsResult,
  type IndexedEntryMetadata,
  type IndexingStats,

  // Default configuration
  DEFAULT_INDEXER_CONFIG,
} from "./ragContentIndexer.js";
