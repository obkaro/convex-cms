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
  variantTypeValidator,
  variantStatusValidator,
} from "./schema.js";

// Field type validators and CRUD argument validators
export {
  // Field type constants (types only - use validators for runtime checks)
  // type FieldType,
  // type ContentStatus,
  // type MediaType,

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
  // updateMediaAssetArgs,
  deleteMediaAssetArgs,
  restoreMediaAssetArgs,
  createMediaFolderArgs,
  updateMediaFolderArgs,
  moveFolderArgs,
  deleteMediaFolderArgs,
  restoreMediaFolderArgs,

  // Query validators
  paginationArgs,
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
  // deleteMediaAssetResult,
  mediaAssetReference,

  // Media variant validators
  // type VariantType,
  // type VariantStatus,
  // variantFormats,
  // type VariantFormat,
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

  // Utilities
  paginatedResponseValidator,

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

  // Audit log validators
  auditResourceTypes,
  type AuditResourceType,
  auditActions,
  type AuditAction,
  auditResourceTypeValidator,
  auditActionValidator,
  auditLogDoc,
  getResourceAuditLogsArgs,
  getUserAuditLogsArgs,
  listAuditLogsArgs,
  getAuditLogStatsArgs,
  cleanupAuditLogsArgs,
  listAuditLogsResult,
  auditLogStatsResult,
  auditLogDiffResult,
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
//   - duplicateEntry: Clone an existing entry with a new unique slug (for templating workflows)
//
// Available bulk operation mutations (import from ./bulkOperations.js):
//   - bulkPublish: Publish multiple entries in a single transaction
//   - bulkUnpublish: Unpublish multiple entries (revert to draft)
//   - bulkDelete: Delete multiple entries (soft or hard delete)
//   - bulkUpdate: Update multiple entries with the same changes
//   - bulkRestore: Restore multiple soft-deleted entries
//
// Available mutation functions (import from ./contentTypeMutations.js):
//   - createContentType: Create a new content type with field definitions
//   - updateContentType: Update an existing content type (with breaking change detection)
//   - deleteContentType: Delete a content type (optionally cascade delete all entries)
//
// Available query functions (import from ./mediaAssets.js):
//   - get: Retrieve a media asset by ID with resolved URL and optimization hints
//
// Available mutation functions (import from ./mediaAssetMutations.js):
//   - createMediaAsset: Create a new media asset record after file upload
//   - updateMediaAsset: Update media asset metadata (filename, alt text, folder) without modifying the file
//   - deleteMediaAsset: Delete a media asset (soft or hard delete with reference checking)
//   - restoreMediaAsset: Restore a soft-deleted media asset
//   - findMediaAssetReferences: Query to find content entries referencing an asset
//
// Available mutation functions (import from ./mediaFolderMutations.js):
//   - createMediaFolder: Create a new media folder for organizing assets
//   - updateMediaFolder: Update folder name, description, or sort order
//   - moveMediaFolder: Move a folder to a different parent (with circular reference prevention)
//   - deleteMediaFolder: Delete a folder (soft or hard, optionally recursive)
//   - restoreMediaFolder: Restore a soft-deleted folder (optionally recursive)
//
// Available query functions (import from ./mediaFolderMutations.js):
//   - getMediaFolder: Get a single folder by ID
//   - listMediaFolders: List folders in a parent (or root folders)
//   - getMediaFolderByPath: Get a folder by its full path
//   - getFolderTree: Get all folders as a flat list for tree rendering
//
// Media reference utilities (exported above from ./lib/mediaReferenceResolver.js):
//   - resolveMediaReference: Resolve a single media asset ID to full asset data with URL
//   - resolveMediaReferences: Resolve multiple media IDs (gallery) in parallel
//   - isValidMediaReference: Check if a media ID is valid with optional MIME type constraints
//   - validateAllMediaReferences: Validate all media fields in content data
//   - extractMediaIds: Extract all media asset IDs from content entry data
//   - matchesMimeTypePattern: Check if a MIME type matches a pattern (supports "image/*")
//
// Available validation functions (import from ./contentEntryValidation.js):
//   - validateContentEntry: Internal query to validate content entry data against its content type
//   - validateEntry: Public query for client-side form validation
//   - validateContentEntryByTypeName: Internal query to validate by content type name
//
// Available mutation functions (import from ./mediaUploadMutations.js):
//   - generateUploadUrl: Generate a temporary URL for client-side file uploads
//
// Available version query functions (import from ./contentEntries.js):
//   - getVersionHistory: List paginated version history for a content entry
//   - getVersion: Retrieve a specific version by ID or version number
//   - compareVersions: Compare two versions and return field-level diff showing changes
//
// Available version mutation functions (import from ./versionMutations.js):
//   - rollbackVersion: Restore content entry to a previous version (creates new version with old content)
//
// Available internal version mutation functions (import from ./versionMutations.js):
//   - createVersionSnapshot: Create a complete snapshot of content entry state (internal)
//   - versionExists: Check if a specific version snapshot already exists (internal)
//   - createVersionSnapshotIfNotExists: Create snapshot only if not already captured (internal)
//
// Media metadata extraction utilities (exported above from ./lib/metadataExtractor.js):
//   - extractMetadata: Extract structured metadata from file information (MIME type, size, etc.)
//   - classifyMimeType: Classify a MIME type into media category (image/video/audio/document/other)
//   - calculateAspectRatio: Calculate aspect ratio from width/height dimensions
//   - formatDuration: Format duration in seconds to HH:MM:SS string
//   - validateDimensions: Validate that dimensions are positive integers
//   - validateDuration: Validate that duration is a non-negative number

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

// User context utilities are documented here:
//   - UserContext: Validated user information for CMS operations
//   - UserContextError: Error class for user context validation failures
//   - createUserContext(options): Create validated user context from input
//   - createUserContextSync(input): Create context synchronously when role is known
//   - resolveUserRole(userId, hook): Resolve user's CMS role via hook
//   - extractUserId(input): Extract user ID from various input formats
//   - extractUserIdFromAuth(authCtx): Extract user ID from Convex auth context
//   - buildAuthorizationContext(ctx, op, info): Build authorization hook context
//   - createAnonymousContext(): Create context for anonymous users
//   - createSystemContext(id): Create context for system operations
//   - isValidUserId(id): Check if user ID is valid
//   - isValidRole(role, custom): Check if role exists
//   - isAuthenticated(ctx): Check if context is authenticated
//   - hasUserRole(ctx, role): Check if context has specific role
//   - isSystemContext(ctx): Check if context is system operation
//   - getUserDisplayId(ctx): Get human-readable identifier
//   - validateUserContext(ctx, reqs): Validate context against requirements

// RBAC utilities are documented here:
//   - roleNames: Array of built-in role names ('admin', 'editor', 'author', 'viewer')
//   - DEFAULT_ROLES: Record mapping role names to their definitions
//   - hasPermission(role, permission): Check if a role has a specific permission
//   - getRolePermissions(role): Get all permissions for a role
//   - getRole(name): Get the full role definition by name
//   - isBuiltInRole(name): Check if a role name is a built-in role
//   - getResourcePermissions(role, resource): Get all permissions for a resource
//   - canAccessResource(role, resource): Check if a role can access a resource
//
// Authorization utilities are documented here:
//   - UnauthorizedError: Custom error class for authorization failures
//   - checkPermission(options): Check if a user has permission (returns result object)
//   - requirePermission(options): Require permission or throw UnauthorizedError
//   - isResourceOwner(userId, ownerId): Check if user owns a resource
//   - requireResourceOwnership(userId, ownerId, options): Require ownership or throw
//   - createAuthContext(userId, role): Create reusable authorization context
//   - canPerform(ctx, resource, action): Check permission using context
//   - mustPerform(ctx, resource, action): Require permission using context
//
// Available trash query/mutation functions (import from ./trash.js):
//   - getTrashConfig: Get current trash configuration (retention, auto-cleanup)
//   - updateTrashConfig: Update trash settings (retention days, auto-cleanup toggle)
//   - listTrash: List soft-deleted entries with pagination and filtering
//   - getTrashStats: Get trash statistics (counts, oldest/newest items)
//   - emptyTrash: Permanently delete items from trash (with optional filters)
//   - runTrashCleanup: Manually trigger cleanup of expired items
//   - scheduleTrashCleanup: Schedule periodic automatic cleanup
//   - executeTrashCleanup: Internal mutation for scheduled cleanup (not for direct use)
//
// Trash workflow:
//   1. Delete entry with deleteEntry() -> soft delete (deletedAt set)
//   2. Entry appears in listTrash() but hidden from normal queries
//   3. Restore with restoreEntry() OR permanently delete with emptyTrash()
//   4. After retention period, auto-cleanup permanently deletes old items

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

// Export/Import utilities are documented here:
//   - exportEntries: Query to export content entries to JSON format
//   - importEntries: Mutation to import entries from an export package
//   - getExportPreview: Query to preview what would be exported without exporting
//   - validateImportPackage: Query to validate an import package without importing
//
// Export/Import workflow:
//   1. Use getExportPreview() to see what entries match your filters
//   2. Use exportEntries() to create an export package
//   3. On target system, use validateImportPackage() to check compatibility
//   4. Use importEntries() with dryRun: true to validate the import
//   5. Use importEntries() with your conflict strategy to perform the import

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

// Content Type Migration utilities are documented here:
//
// Available migration mutation functions (import from ./contentTypeMigration.js):
//   - migrateContentType: Apply migration operations to content entries
//
// Available migration query functions (import from ./contentTypeMigration.js):
//   - previewMigration: Preview migration changes without applying them
//   - getTransformationTypes: Get list of available transformation types
//
// Supported migration operations:
//   - ADD_FIELD: Add a new field with a default value
//   - REMOVE_FIELD: Remove an existing field from entries
//   - RENAME_FIELD: Rename a field (preserves value)
//   - TRANSFORM_FIELD: Convert field values using built-in transformations
//   - SET_DEFAULT: Set default value for empty/null fields
//
// Built-in transformations:
//   - TEXT_TO_NUMBER: Convert text strings to numbers
//   - NUMBER_TO_TEXT: Convert numbers to strings
//   - TEXT_TO_BOOLEAN: Convert text to boolean (true/false, yes/no, etc.)
//   - BOOLEAN_TO_TEXT: Convert boolean to "true" or "false"
//   - TEXT_TO_DATE: Convert date strings to timestamps
//   - DATE_TO_TEXT: Convert timestamps to ISO date strings
//   - TEXT_TO_JSON: Parse JSON strings to objects
//   - JSON_TO_TEXT: Stringify objects to JSON text
//   - SINGLE_TO_ARRAY: Wrap single values in arrays
//   - ARRAY_TO_SINGLE: Extract first element from arrays
//   - SELECT_VALUE_REMAP: Remap select/multiSelect values
//
// Migration workflow:
//   1. Use previewMigration() to see what changes will be made
//   2. Review the changes and adjust operations if needed
//   3. Use migrateContentType() with dryRun: true for final validation
//   4. Use migrateContentType() with dryRun: false to apply changes
//   5. Version snapshots are created automatically for rollback capability

// Content Lock utilities are documented here:
//
// Available lock query functions (import from ./contentLock.js):
//   - checkLock: Query to check the lock status of a content entry
//   - listLockedEntries: Query to list all locked entries with pagination
//
// Available lock mutation functions (import from ./contentLock.js):
//   - acquireLock: Acquire a lock on a content entry for editing
//   - releaseLock: Release a lock when done editing (owner only)
//   - forceReleaseLock: Force release a lock (admin operation)
//   - renewLock: Extend the lock duration for continued editing
//
// Lock validation helper (exported above):
//   - validateLockForUpdate(entry, userId): Check if user can update locked entry
//
// Lock behavior:
//   - Only one user can hold a lock at a time
//   - Locks automatically expire after configured duration (default 30 minutes)
//   - Lock holder can update the locked entry (via updatedBy matching lockedBy)
//   - Admins can force-release locks when needed
//   - Expired locks allow any user to acquire
//
// Lock workflow:
//   1. User opens content for editing -> acquireLock()
//   2. User makes changes -> updateEntry() with updatedBy set
//   3. Lock auto-expires OR user finishes -> releaseLock()
//   4. For long editing sessions -> renewLock() periodically
//   5. Admin clearing stuck lock -> forceReleaseLock()

// Event Emitter utilities are documented here:
//
// Available event query functions (import from ./eventEmitter.js):
//   - listEvents: List recent events with optional filtering by type/action/processed
//   - getResourceEvents: Get all events for a specific resource (entry, type, asset)
//   - getUnprocessedEvents: Get events that haven't been processed yet
//
// Available event mutation functions (import from ./eventEmitter.js):
//   - markEventsProcessed: Mark events as processed after handling
//   - cleanupOldEvents: Remove old processed events beyond retention period
//   - internalEmitEvent: Internal mutation for scheduled functions to emit events
//
// Event emission helper (exported above):
//   - emitEvent(ctx, params): Emit an event within a mutation transaction
//
// Event type helpers (exported above):
//   - contentEntryEventType(action): Build event type like "contentEntry.created"
//   - contentTypeEventType(action): Build event type like "contentType.updated"
//   - mediaAssetEventType(action): Build event type like "mediaAsset.deleted"
//   - mediaFolderEventType(action): Build event type like "mediaFolder.created"
//
// Supported event actions:
//   - created: Resource was created
//   - updated: Resource was modified
//   - published: Content entry was published
//   - unpublished: Content entry was unpublished (reverted to draft)
//   - deleted: Resource was deleted (soft or hard)
//   - restored: Resource was restored from soft delete
//   - duplicated: Content entry was duplicated (cloned)
//   - scheduled: Content entry was scheduled for future publication
//
// Event workflow:
//   1. Mutations automatically emit events for content changes
//   2. Events are stored atomically with the mutation (same transaction)
//   3. External systems can poll getUnprocessedEvents() for new events
//   4. After handling, call markEventsProcessed() to mark as done
//   5. Use cleanupOldEvents() periodically to remove old processed events
//
// Event use cases:
//   - Audit logging: Track all content changes with user attribution
//   - Webhooks: Notify external systems of content changes
//   - Search indexing: Update search indexes when content changes
//   - Cache invalidation: Invalidate caches when content is published
//   - Analytics: Track content creation/update patterns

// Media Variant Types and Presets
export {
  // Default variant presets (thumbnail, small, medium, large, xlarge, webp, avif)
  DEFAULT_VARIANT_PRESETS,
} from "./mediaVariants.js";

// Media Variants utilities are documented here:
//
// Available media variant query functions (import from ./mediaVariants.js):
//   - get: Retrieve a single variant by ID with resolved URL
//   - list: List all variants for an asset with optional filtering
//   - getBestVariant: Find best matching variant for target dimensions
//   - getResponsiveSrcset: Generate srcset data for responsive images
//   - getPresets: Get available variant preset configurations
//   - getPendingVariants: Get variants awaiting processing (for job queue)
//   - getAssetWithVariants: Get asset with all its variants organized by type
//
// Available media variant mutation functions (import from ./mediaVariantMutations.js):
//   - createMediaVariant: Register a completed variant (after external processing)
//   - requestVariantGeneration: Queue a variant for async processing
//   - updateVariantStatus: Update processing status (pending -> processing -> completed/failed)
//   - deleteMediaVariant: Soft or hard delete a variant
//   - deleteAssetVariants: Delete all variants for an asset
//   - generateFromPresets: Queue multiple variants from preset configurations
//   - restoreMediaVariant: Restore a soft-deleted variant
//
// Internal mutations (for processing system):
//   - markVariantProcessing: Mark variant as processing (picked up by queue)
//   - completeVariant: Mark variant as completed with final storage/dimensions
//   - failVariant: Mark variant as failed with error message
//
// Variant types:
//   - thumbnail: Small preview images (typically square crop)
//   - responsive: Sized images for responsive layouts (maintains aspect ratio)
//   - format: Same dimensions but different format (e.g., WebP, AVIF conversion)
//
// Default presets:
//   - thumbnail: 150x150 WebP (square preview)
//   - small: 480w WebP (mobile)
//   - medium: 768w WebP (tablet)
//   - large: 1024w WebP (desktop)
//   - xlarge: 1440w WebP (large desktop)
//   - webp: WebP format conversion (original dimensions)
//   - avif: AVIF format conversion (original dimensions)
//
// Variant workflow:
//   1. Upload original image to mediaAssets
//   2. Call generateFromPresets() to queue variants for processing
//   3. External processor picks up pending variants from getPendingVariants()
//   4. Processor generates image, uploads to storage, calls completeVariant()
//   5. Frontend uses getBestVariant() or getResponsiveSrcset() for optimal delivery
//
// Responsive image usage:
//   const srcset = await ctx.runQuery(api.mediaVariants.getResponsiveSrcset, {
//     assetId, format: "webp"
//   });
//   // Use: <img src={srcset.src} srcset={srcset.srcset} sizes="100vw" />

// Audit Log - Comprehensive audit logging for all CMS operations
export {
  // Types
  type AuditResourceType as AuditLogResourceType,
  type AuditAction as AuditLogAction,
  type LogAuditEntryParams,
  type AuditLogEntry,
  type AuditLogFilters,

  // Validators (re-exported for convenience)
  auditResourceTypeValidator as auditLogResourceTypeValidator,
  auditActionValidator as auditLogActionValidator,
  auditLogDocValidator,

  // Audit logging helpers
  logAuditEntry,
  detectChangedFields,
  generateChangeSummary,

  // Convenience helpers for common scenarios
  logContentEntryAudit,
  logContentTypeAudit,
  logMediaAssetAudit,
  logMediaFolderAudit,
} from "./auditLog.js";

// Audit Log utilities are documented here:
//
// Available audit log query functions (import from ./auditLog.js):
//   - getResourceAuditLogs: Get all audit logs for a specific resource
//   - getUserAuditLogs: Get all audit logs by a specific user
//   - listAuditLogs: List audit logs with filtering and pagination
//   - getAuditLog: Get a single audit log entry by ID
//   - getAuditLogStats: Get statistics about audit logs
//   - getAuditLogDiff: Get the diff between previous and new state for an update
//
// Available audit log mutation functions (import from ./auditLog.js):
//   - internalLogAuditEntry: Internal mutation for scheduled functions
//   - cleanupOldAuditLogs: Remove old audit logs beyond retention period
//
// Audit logging helper (exported above):
//   - logAuditEntry(ctx, params): Create audit log entry within a mutation
//
// Convenience helpers for common scenarios (exported above):
//   - logContentEntryAudit(ctx, params): Log content entry operations
//   - logContentTypeAudit(ctx, params): Log content type operations
//   - logMediaAssetAudit(ctx, params): Log media asset operations
//   - logMediaFolderAudit(ctx, params): Log media folder operations
//
// Utility functions (exported above):
//   - detectChangedFields(prev, new): Detect which fields changed between two objects
//   - generateChangeSummary(action, type, fields): Generate human-readable summary
//
// Supported audit actions:
//   - created: Resource was created
//   - updated: Resource was modified
//   - published: Content entry was published
//   - unpublished: Content entry was unpublished (reverted to draft)
//   - deleted: Resource was deleted (soft or hard)
//   - restored: Resource was restored from trash
//   - duplicated: Content entry was duplicated
//   - scheduled: Content entry was scheduled for publication
//   - locked: Content entry was locked for editing
//   - unlocked: Content entry lock was released
//   - rolledBack: Content entry was rolled back to a previous version
//   - migrated: Content type migration was applied
//
// Audit log workflow:
//   1. Use logAuditEntry() or convenience helpers within mutations
//   2. Pass previousState (for updates/deletes) and newState (for creates/updates)
//   3. changedFields and changeSummary are auto-generated if not provided
//   4. Query audit logs with getResourceAuditLogs(), getUserAuditLogs(), or listAuditLogs()
//   5. Use getAuditLogDiff() to see detailed changes for update actions
//
// Audit log use cases:
//   - Compliance: Track all changes with complete before/after snapshots
//   - Security auditing: Track who changed what, when, and from where
//   - Debugging: Understand how content evolved over time
//   - Accountability: Identify who made specific changes
//   - Rollback investigation: Review changes before rolling back

// RAG Content Indexer - Background job system for vector index sync
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

// RAG Content Indexer utilities are documented here:
//
// Available RAG indexer query functions (import from ./ragContentIndexer.js):
//   - getIndexingStats: Get statistics about indexing state (published, pending, by type)
//   - needsReindexing: Check if an entry has unprocessed indexing events
//   - prepareEntryForIndexing: Extract and chunk content for a single entry
//   - prepareEntriesForIndexing: Batch prepare multiple entries for indexing
//
// Available RAG indexer mutation functions (import from ./ragContentIndexer.js):
//   - markIndexingEventsProcessed: Mark events as processed after indexing
//   - requestEntryReindex: Request reindexing of a specific entry
//   - requestBulkReindex: Request reindexing of all published content
//   - scheduleNextIndexingRun: Schedule the next background processing run
//
// Internal functions (for scheduler/action use):
//   - getIndexingBatch: Get batch of events to process (internal query)
//   - getUnprocessedIndexingEvents: Get unprocessed publish-related events
//   - triggerIndexingCheck: Check for pending events (called by scheduler)
//
// RAG Indexer workflow:
//   1. Content gets published -> contentEntry.published event created
//   2. Background job polls getIndexingBatch() for pending events
//   3. For each event, call prepareEntryForIndexing() to get chunks
//   4. Pass chunks to your vector index (e.g., @convex-dev/rag)
//   5. Call markIndexingEventsProcessed() to mark as done
//   6. Schedule next run with scheduleNextIndexingRun()
//
// Example action for processing:
//   ```typescript
//   export const runIndexer = action({
//     handler: async (ctx) => {
//       const batch = await ctx.runQuery(internal.ragContentIndexer.getIndexingBatch, {});
//
//       for (const item of batch.toIndex) {
//         const prepared = await ctx.runQuery(api.ragContentIndexer.prepareEntryForIndexing, {
//           entryId: item.entryId,
//         });
//         if (prepared) {
//           // Add to your vector index
//           await rag.add(ctx, {
//             namespace: prepared.metadata.namespace,
//             key: prepared.entryId,
//             chunks: prepared.chunks.map(c => c.text),
//           });
//         }
//       }
//
//       for (const item of batch.toRemove) {
//         // Remove from your vector index
//         await rag.remove(ctx, { key: item.entryId });
//       }
//
//       // Mark events as processed
//       const eventIds = [...batch.toIndex, ...batch.toRemove].map(i => i.eventId);
//       await ctx.runMutation(api.ragContentIndexer.markIndexingEventsProcessed, { eventIds });
//
//       // Schedule next run
//       if (batch.hasMore) {
//         await ctx.runMutation(api.ragContentIndexer.scheduleNextIndexingRun, { delayMs: 1000 });
//       } else {
//         await ctx.runMutation(api.ragContentIndexer.scheduleNextIndexingRun, {});
//       }
//     },
//   });
//   ```
//
// Supported indexing actions:
//   - published: Add/update entry in vector index
//   - restored: Add entry back to vector index
//   - unpublished: Remove entry from vector index
//   - deleted: Remove entry from vector index
//
// Configuration options:
//   - autoIndexOnPublish: Enable automatic indexing (default: true)
//   - autoRemoveOnUnpublish: Auto-remove on unpublish (default: true)
//   - autoRemoveOnDelete: Auto-remove on delete (default: true)
//   - batchSize: Events per batch (default: 50)
//   - pollingIntervalMs: Background job interval (default: 60000)
//   - includeContentTypes: Only index these types (empty = all)
//   - excludeContentTypes: Skip indexing these types
//   - namespacePrefix: Prefix for namespaces (default: "cms")

// Webhook Trigger - Scheduled function for delivering events to external systems
// export {
//   // Types
//   type WebhookDeliveryStatus,
//   type WebhookProcessorConfig,
//   type ProcessWebhooksResult,
//   type WebhookPayload,
//   type WebhookStats,

//   // Constants
//   DEFAULT_WEBHOOK_CONFIG,
//   RETRY_DELAYS_MS,

//   // Validators
//   webhookDeliveryStatusValidator,
//   createWebhookArgs,
//   updateWebhookArgs,
//   deleteWebhookArgs,
//   webhookConfigDoc,
//   webhookDeliveryDoc,
// } from "./webhookTrigger.js";

// Webhook Trigger utilities are documented here:
//
// Available webhook configuration mutations (import from ./webhookTrigger.js):
//   - createWebhook: Create a new webhook configuration
//   - updateWebhook: Update an existing webhook configuration
//   - deleteWebhook: Delete a webhook (soft or hard delete)
//   - restoreWebhook: Restore a soft-deleted webhook
//   - testWebhook: Send a test event to verify webhook configuration
//   - retryDelivery: Manually retry a failed delivery
//   - cleanupOldDeliveries: Remove old delivery records beyond retention
//
// Available webhook configuration queries (import from ./webhookTrigger.js):
//   - getWebhook: Get a single webhook configuration by ID
//   - listWebhooks: List all webhook configurations with filtering
//   - getWebhookStats: Get overall webhook delivery statistics
//   - getWebhookDeliveryStats: Get delivery statistics for a specific webhook
//   - listWebhookDeliveries: List recent deliveries for a webhook
//   - getDelivery: Get delivery details by ID
//
// Available scheduling mutations (import from ./webhookTrigger.js):
//   - scheduleNextWebhookRun: Schedule the next background processing run
//
// Internal functions (for scheduler use):
//   - processWebhooks: Main processing function (creates deliveries, triggers sends)
//   - processEventsForDelivery: Create deliveries for unprocessed events
//   - triggerPendingDeliveries: Send pending deliveries
//   - sendWebhookDelivery: Send a single webhook delivery (action)
//   - triggerWebhookCheck: Scheduler entry point
//
// Webhook workflow:
//   1. Content mutation emits event to cmsEvents table
//   2. Background job polls for unprocessed events
//   3. For each event, matching webhooks are found
//   4. Delivery records are created in webhookDeliveries table
//   5. HTTP POST requests are sent to webhook URLs
//   6. Success/failure tracked with automatic retry for failures
//
// Security features:
//   - HMAC-SHA256 signature: X-Webhook-Signature header for payload verification
//   - Configurable timeout: Prevent hanging requests
//   - Secrets not exposed: Secret keys never returned in API responses
//
// Retry behavior:
//   - Exponential backoff: 1min → 5min → 15min → 1hr → 4hr
//   - Configurable max retries per webhook (default: 5)
//   - Automatic scheduling via Convex scheduler
//
// Example webhook setup:
//   ```typescript
//   // Create a webhook
//   const webhookId = await ctx.runMutation(api.webhookTrigger.createWebhook, {
//     name: "CDN Invalidation",
//     url: "https://api.example.com/webhooks/cms",
//     secret: "my-secret-key",
//     eventTypes: ["contentEntry.published", "contentEntry.deleted"],
//   });
//
//   // Start background processing
//   await ctx.runMutation(api.webhookTrigger.scheduleNextWebhookRun, {});
//
//   // Test the webhook
//   await ctx.runMutation(api.webhookTrigger.testWebhook, { webhookId });
//   ```
//
// Webhook payload format:
//   ```json
//   {
//     "deliveryId": "abc123",
//     "eventType": "contentEntry.published",
//     "resourceType": "contentEntry",
//     "resourceId": "entry_id_here",
//     "action": "published",
//     "data": { "slug": "my-post", "contentTypeName": "blog_post", ... },
//     "timestamp": "2026-01-15T10:30:00.000Z",
//     "userId": "user_id_here"
//   }
//   ```
//
// Verifying webhook signatures (receiver side):
//   ```javascript
//   const crypto = require('crypto');
//
//   function verifySignature(payload, signature, secret) {
//     const expected = 'sha256=' + crypto
//       .createHmac('sha256', secret)
//       .update(payload)
//       .digest('hex');
//     return crypto.timingSafeEqual(
//       Buffer.from(signature),
//       Buffer.from(expected)
//     );
//   }
//   ```
