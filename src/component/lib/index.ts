/**
 * Library utilities for the CMS component
 */

export {
  generateSlug,
  isValidSlug,
  generateUniqueSlug,
  type SlugOptions,
} from "./slugGenerator.js";

// Error handling exports
export {
  // Error class and types
  CMSError,
  isCMSError,
  hasErrorCode,
  isErrorCategory,
  // Error codes
  ErrorCodes,
  ContentTypeErrorCodes,
  ContentEntryErrorCodes,
  MediaAssetErrorCodes,
  MediaFolderErrorCodes,
  VersionErrorCodes,
  GeneralErrorCodes,
  // Error factory functions - Content Types
  contentTypeNotFound,
  contentTypeDeleted,
  contentTypeInactive,
  contentTypeNameInvalid,
  contentTypeNameDuplicate,
  contentTypeFieldValidationFailed,
  contentTypeSlugFieldInvalid,
  contentTypeTitleFieldInvalid,
  contentTypeHasEntries,
  contentTypeBreakingChange,
  // Error factory functions - Content Entries
  contentEntryNotFound,
  contentEntryDeleted,
  contentEntryNotDeleted,
  contentEntryAlreadyPublished,
  contentEntryNotPublished,
  contentEntryArchived,
  contentEntryValidationFailed,
  contentEntryLocked,
  contentEntryCreateFailed,
  contentEntryUpdateFailed,
  // Error factory functions - Media Assets
  mediaAssetNotFound,
  mediaAssetDeleted,
  mediaAssetNotDeleted,
  mediaAssetHasReferences,
  mediaAssetCreateFailed,
  mediaAssetUpdateFailed,
  // Error factory functions - Media Folders
  mediaFolderNotFound,
  mediaFolderDeleted,
  mediaFolderNotDeleted,
  mediaFolderNameInvalid,
  mediaFolderNameDuplicate,
  mediaFolderDepthExceeded,
  mediaFolderPathTooLong,
  mediaFolderHasContents,
  mediaFolderCircularMove,
  mediaFolderParentDeleted,
  mediaFolderCreateFailed,
  // Error factory functions - Versions
  versionNotFound,
  versionEntryNotFound,
  versionEntryDeleted,
  versionMismatch,
  versionRollbackFailed,
  // Error factory functions - General
  batchSizeExceeded,
  permissionDenied,
  internalError,
  // Types
  type ErrorCode,
  type ErrorCategory,
  type CMSErrorContext,
  type ResourceErrorContext,
  type ValidationErrorContext,
  type LockErrorContext,
  type ReferenceErrorContext,
} from "./errors.js";

export {
  checkSlugUniqueness,
  ensureUniqueSlug,
  findNextAvailableSlug,
  validateSlugFormat,
  type SlugUniquenessOptions,
  type SlugCheckResult,
  type SlugEntry,
  type SlugQueryFn,
  type SlugPrefixQueryFn,
} from "./slugUniqueness.js";

export {
  // Main API functions
  chunkContentEntry,
  extractContent,
  chunkText,
  chunkMultipleEntries,
  estimateChunkingStats,
  // Text extraction utilities
  extractTextFromRichText,
  extractTextFromJson,
  extractTextFromSelect,
  stripHtmlTags,
  // Configuration defaults
  DEFAULT_CHUNK_OPTIONS,
  DEFAULT_EXTRACTION_OPTIONS,
  // Types
  type ContentChunk,
  type ChunkMetadata,
  type ChunkSemanticType,
  type ChunkOptions,
  type RagExtractionOptions,
  type ExtractedContent,
  type ContentTypeInfo,
  type ContentEntryInfo,
  type ResolvedReferenceInfo,
  type FieldDefinition as RagFieldDefinition,
} from "./ragContentChunker.js";
