/**
 * CMS Client Wrapper with typed method APIs.
 *
 * This module provides an ergonomic wrapper around the Convex CMS component
 * that offers typed methods for all CMS operations. Instead of calling
 * component functions directly, developers can use intuitive method calls.
 *
 * @example
 * ```typescript
 * import { createCmsClient } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * const cms = createCmsClient(components.convexCms);
 *
 * // In a mutation or query:
 * const type = await cms.contentTypes.create(ctx, {
 *   name: "blog_post",
 *   displayName: "Blog Post",
 *   fields: [...]
 * });
 * ```
 */

// Import Convex's native FunctionReference type for proper type safety
import type {
  FunctionReference as ConvexFunctionReference,
  OptionalRestArgs,
  FunctionReturnType,
} from "convex/server";

// Import the generated ComponentApi type which has full type information
import type { ComponentApi as GeneratedComponentApi } from "../component/_generated/component.js";

// =============================================================================
// Type-Safe API Call Helpers
// =============================================================================

/**
 * Helper to safely call a mutation with runtime type adaptation.
 *
 * The wrapper's public API uses simplified types (e.g., `string` for IDs,
 * optional cursor fields) while the generated Convex types use more specific
 * types (e.g., `Id<"table">`, required cursor fields with null value).
 *
 * This helper bridges that gap by allowing the wrapper's convenient API
 * while ensuring the call goes through to the typed Convex function.
 *
 * The `any` type for args is intentional - it allows the wrapper's argument
 * types to differ from the generated API's exact types at the boundary while
 * still maintaining type safety in the wrapper's public API signatures.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function callMutation<T extends ConvexFunctionReference<"mutation", "public" | "internal">, A = any>(
  ctx: ConvexContext,
  fn: T,
  args: A
): Promise<FunctionReturnType<T>> {
  return ctx.runMutation(fn, args as OptionalRestArgs<T>[0]);
}

/**
 * Helper to safely call a query with runtime type adaptation.
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function callQuery<T extends ConvexFunctionReference<"query", "public" | "internal">, A = any>(
  ctx: ConvexContext,
  fn: T,
  args: A
): Promise<FunctionReturnType<T>> {
  return ctx.runQuery(fn, args as OptionalRestArgs<T>[0]);
}

import type {
  ComponentConfig,
  ResolvedComponentConfig,
  FeatureFlags,
  LocaleCode,
  ContentType,
  ContentEntry,
  ContentVersion,
  MediaAsset,
  MediaFolder,
  FieldDefinition,
  ContentStatus,
  MediaType,
  PaginatedResponse,
  PaginationResult,
  PaginationOpts,
  ContentQueryOptions,
  MediaQueryOptions,
  GetUserRoleHook,
  GetUserRoleContext,
  GetUserRoleResult,
  AuthorizationHooks,
  AuthorizationHookContext,
  AuthorizationHookResult,
  CmsOperation,
  CustomRoleDefinition,
  VersionComparison,
  FieldChange,
  FieldChangeType,
  VersionHistoryOptions,
  VariantType,
  VariantStatus,
  MediaVariant,
  MediaVariantWithUrl,
} from "./types.js";

import { resolveConfig, AuthorizationNotConfiguredError, type CmsHookContext } from "./types.js";

// Import query builder
import { ContentQueryBuilder, createQueryBuilder } from "./queryBuilder.js";

// Import authorization hooks execution
import {
  executeAuthorizationHooks,
  contextToRbacOptions,
  operationToRbac,
  type ExecuteAuthorizationOptions,
  type AuthorizationResult,
} from "../component/authorizationHooks.js";

// Import rate limit hooks execution
import {
  requireRateLimit,
  createRateLimitContext,
  type RateLimitResult,
} from "../component/rateLimitHooks.js";

// Import RBAC utilities from component
import {
  hasPermission,
  hasContentTypePermission,
  getPermittedContentTypes,
  DEFAULT_ROLES,
  type Permission,
  type Resource,
  type Action,
  type OwnershipScope,
  type RoleDefinition,
  type ExtendedRoleDefinition,
} from "../component/roles.js";

// Import locale fallback chain utilities
import {
  resolveFallbackChain,
  getFallbackChain,
  buildLocaleResolutionOptions,
  parseLocale,
  getLocaleHierarchy,
  type LocaleFallbackConfig,
  type ResolvedFallbackChain,
  type ParsedLocale,
} from "../component/localeFallbackChain.js";

// Import locale resolution types and functions
import type { LocaleResolutionOptions } from "../component/localeFields.js";
import {
  resolveLocaleContent,
  resolveLocaleContentBatch,
  type LocaleResolvedEntry,
  type ResolveLocaleOptions,
} from "../component/localeFields.js";

/**
 * Options for resolving locale content in client wrapper methods.
 * Extends ResolveLocaleOptions but makes fields required since
 * they are needed for proper locale resolution.
 */
export type ResolveLocaleContentOptions = ResolveLocaleOptions;

// =============================================================================
// Authorization Helper Types
// =============================================================================

/**
 * Authorization helper interface passed to API classes.
 * This allows API methods to perform authorization checks before mutations.
 *
 * When authorization is not configured (getUserRole not provided), the helper
 * will be undefined and authorization checks will be skipped.
 */
export interface AuthorizationHelper {
  /**
   * Get the user's CMS role.
   * @param ctx - The Convex context (provides database and auth access to hooks)
   * @param userId - The user ID to look up
   * @returns The role name or null if user has no role
   */
  getUserRole(ctx: ConvexContext, userId: string): Promise<string | null>;

  /**
   * Perform authorization check and throw if denied.
   * @param ctx - The Convex context (provides database and auth access to hooks)
   * @param context - The authorization context
   * @throws UnauthorizedError if the operation is not allowed
   */
  requireAuthorization(ctx: ConvexContext, context: Omit<AuthorizationHookContext, 'ctx'>): Promise<AuthorizationResult>;

  /**
   * Whether RBAC should be skipped (from config.skipRbac).
   */
  skipRbac: boolean;
}

// =============================================================================
// Rate Limit Helper Types
// =============================================================================

/**
 * Rate limit helper interface passed to API classes.
 * This allows API methods to enforce rate limits before mutations.
 *
 * When rate limiting is not configured (no rateLimitHooks provided), the helper
 * will be undefined and rate limiting checks will be skipped.
 */
export interface RateLimitHelper {
  /**
   * Get the user's CMS role for rate limit context.
   * @param ctx - The Convex context (for database access)
   * @param userId - The user ID to look up
   * @returns The role name or null if user has no role
   */
  getUserRole(ctx: ConvexContext, userId: string): Promise<string | null>;

  /**
   * Enforce rate limit for an operation. Throws RateLimitedError if rate limited.
   * @param operation - The CMS operation being performed
   * @param options - Additional context for rate limiting
   * @throws RateLimitedError if the operation is rate limited
   */
  requireRateLimit(
    operation: CmsOperation,
    options: {
      userId?: string;
      role?: string | null;
      contentTypeId?: string;
      contentTypeName?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<RateLimitResult>;
}

// =============================================================================
// Context Types
// =============================================================================

/**
 * Minimal Convex context interface for running component functions.
 * This works with both MutationCtx and QueryCtx from Convex.
 *
 * Uses Convex's native FunctionReference type for full type safety.
 * The generic constraints match Convex's actual runMutation/runQuery signatures.
 */
export interface ConvexContext {
  runMutation<Mutation extends ConvexFunctionReference<"mutation", "public" | "internal">>(
    mutation: Mutation,
    ...args: OptionalRestArgs<Mutation>
  ): Promise<FunctionReturnType<Mutation>>;
  runQuery<Query extends ConvexFunctionReference<"query", "public" | "internal">>(
    query: Query,
    ...args: OptionalRestArgs<Query>
  ): Promise<FunctionReturnType<Query>>;
}

/**
 * @deprecated Use Convex's native FunctionReference from "convex/server" instead.
 * This type alias is kept for backwards compatibility but should not be used in new code.
 *
 * Function reference type for Convex component functions.
 * Maps to Convex's FunctionReference<Type, Visibility, Args, Result, Name>.
 */
export type FunctionReference<
  Type extends "mutation" | "query" | "action",
  _Args = unknown,
  _Result = unknown
> = ConvexFunctionReference<Type, "public" | "internal">;

// =============================================================================
// Component API Type
// =============================================================================

/**
 * The expected shape of the component API from `components.convexCms`.
 *
 * This type is an alias to the auto-generated ComponentApi from the Convex component,
 * which provides full type information for all component functions including
 * proper argument and return type inference.
 *
 * Using the generated type ensures:
 * 1. Full TypeScript type safety without `as any` casts
 * 2. IDE autocompletion for function arguments and return values
 * 3. Compile-time errors when function signatures change
 * 4. Consistent types between the component and client code
 */
export type TypedComponentApi = GeneratedComponentApi;

/**
 * @deprecated Use TypedComponentApi instead.
 * This interface is kept for backwards compatibility but the actual implementation
 * now uses the generated ComponentApi type for proper type safety.
 *
 * The mappings below document the expected structure but are not used at runtime.
 * They are preserved here for documentation purposes and to assist with migration.
 */
export interface LegacyTypedComponentApi {
  contentTypes: {
    create: FunctionReference<"mutation", CreateContentTypeArgs, ContentType>;
    update: FunctionReference<"mutation", UpdateContentTypeArgs, UpdateContentTypeResult>;
    delete: FunctionReference<"mutation", DeleteContentTypeArgs, DeleteContentTypeResult>;
    get: FunctionReference<"query", GetContentTypeArgs, ContentType | null>;
    list: FunctionReference<"query", ListContentTypesArgs, PaginationResult<ContentType>>;
  };
  contentEntries: {
    create: FunctionReference<"mutation", CreateContentEntryArgs, ContentEntry>;
    update: FunctionReference<"mutation", UpdateContentEntryArgs, ContentEntry>;
    delete: FunctionReference<"mutation", DeleteContentEntryArgs, ContentEntry>;
    get: FunctionReference<"query", GetContentEntryArgs, ContentEntry | null>;
    getBySlug: FunctionReference<"query", GetContentEntryBySlugArgs, ContentEntry | null>;
    list: FunctionReference<"query", ListContentEntriesArgs, PaginationResult<ContentEntry>>;
    publish: FunctionReference<"mutation", PublishEntryArgs, ContentEntry>;
    unpublish: FunctionReference<"mutation", UnpublishEntryArgs, ContentEntry>;
    schedule: FunctionReference<"mutation", ScheduleEntryArgs, ContentEntry>;
    restore: FunctionReference<"mutation", RestoreEntryArgs, ContentEntry>;
    // Version-related queries (defined in contentEntries module)
    getVersionHistory: FunctionReference<"query", GetVersionHistoryArgs, PaginationResult<ContentVersion> | null>;
    getVersion: FunctionReference<"query", GetVersionArgs, ContentVersion | null>;
  };
  // Version mutations (separate module)
  versionMutations: {
    rollbackVersion: FunctionReference<"mutation", RollbackVersionArgs, ContentEntry>;
  };
  // Legacy versions namespace (backwards compatibility)
  versions: {
    list: FunctionReference<"query", ListVersionsArgs, PaginatedResponse<ContentVersion>>;
    get: FunctionReference<"query", GetVersionArgs, ContentVersion | null>;
    getHistory: FunctionReference<"query", GetVersionHistoryArgs, PaginationResult<ContentVersion> | null>;
    rollback: FunctionReference<"mutation", RollbackVersionArgs, ContentEntry>;
  };
  mediaAssets: {
    create: FunctionReference<"mutation", CreateMediaAssetArgs, MediaAsset>;
    update: FunctionReference<"mutation", UpdateMediaAssetArgs, MediaAsset>;
    delete: FunctionReference<"mutation", DeleteMediaAssetArgs, MediaAsset>;
    get: FunctionReference<"query", GetMediaAssetArgs, MediaAsset | null>;
    list: FunctionReference<"query", ListMediaAssetsArgs, PaginatedResponse<MediaAsset>>;
  };
  mediaFolders: {
    create: FunctionReference<"mutation", CreateMediaFolderArgs, MediaFolder>;
    update: FunctionReference<"mutation", UpdateMediaFolderArgs, MediaFolder>;
    delete: FunctionReference<"mutation", DeleteMediaFolderArgs, MediaFolder>;
    get: FunctionReference<"query", GetMediaFolderArgs, MediaFolder | null>;
    list: FunctionReference<"query", ListMediaFoldersArgs, MediaFolder[]>;
    move: FunctionReference<"mutation", MoveFolderArgs, MediaFolder>;
  };
  // Additional module APIs for extended operations
  mediaUploadMutations: {
    generateUploadUrl: FunctionReference<
      "mutation",
      GenerateUploadUrlArgs,
      GenerateUploadUrlResult
    >;
  };
  mediaAssetMutations: {
    restoreMediaAsset: FunctionReference<
      "mutation",
      RestoreMediaAssetArgs,
      MediaAsset
    >;
    findMediaAssetReferences: FunctionReference<
      "query",
      FindMediaAssetReferencesArgs,
      MediaAssetReference[]
    >;
  };
  mediaFolderMutations: {
    restoreMediaFolder: FunctionReference<
      "mutation",
      RestoreMediaFolderArgs,
      MediaFolder
    >;
    getMediaFolderByPath: FunctionReference<
      "query",
      GetMediaFolderByPathArgs,
      MediaFolder | null
    >;
    getFolderTree: FunctionReference<"query", GetFolderTreeArgs, MediaFolder[]>;
  };
  // Bulk operations module
  bulkOperations: {
    bulkPublish: FunctionReference<"mutation", BulkPublishArgs, BulkOperationResult>;
    bulkUnpublish: FunctionReference<"mutation", BulkUnpublishArgs, BulkOperationResult>;
    bulkDelete: FunctionReference<"mutation", BulkDeleteArgs, BulkOperationResult>;
    bulkUpdate: FunctionReference<"mutation", BulkUpdateArgs, BulkOperationResult>;
    bulkRestore: FunctionReference<"mutation", BulkRestoreArgs, BulkOperationResult>;
  };
  // Content entry mutations module (for duplicateEntry)
  contentEntryMutations: {
    duplicateEntry: FunctionReference<"mutation", DuplicateEntryArgs, ContentEntry>;
  };
}

/**
 * Partial component API type for testing purposes.
 *
 * This type allows partial/mock implementations of the component API
 * for unit testing without requiring full type conformance.
 * In production, use TypedComponentApi instead.
 *
 * @example
 * ```typescript
 * // In test files
 * const mockApi: MockComponentApi = {
 *   contentEntries: {
 *     list: { _type: "query" } as any,
 *   },
 * } as MockComponentApi;
 * ```
 */
export type MockComponentApi = Partial<{
  [K in keyof TypedComponentApi]: Partial<TypedComponentApi[K]>;
}>;

// =============================================================================
// Argument Types for Component Functions
// =============================================================================

// Content Type Arguments
export interface CreateContentTypeArgs {
  name: string;
  displayName: string;
  description?: string;
  fields: FieldDefinition[];
  icon?: string;
  singleton?: boolean;
  slugField?: string;
  titleField?: string;
  sortOrder?: number;
  createdBy?: string;
}

export interface UpdateContentTypeArgs {
  id: string;
  displayName?: string;
  description?: string;
  fields?: FieldDefinition[];
  icon?: string;
  singleton?: boolean;
  slugField?: string;
  titleField?: string;
  sortOrder?: number;
  isActive?: boolean;
  updatedBy?: string;
  /**
   * If true, allow breaking changes that may affect existing content entries.
   * Breaking changes include: removing fields with data, changing field types,
   * making optional fields required, removing select options, etc.
   * @default false
   */
  force?: boolean;
}

/**
 * Describes a breaking change detected during content type update.
 */
export interface BreakingChange {
  /** Type of breaking change */
  type:
    | "FIELD_REMOVED"
    | "FIELD_TYPE_CHANGED"
    | "FIELD_MADE_REQUIRED"
    | "SELECT_OPTIONS_REMOVED"
    | "REFERENCE_TYPES_RESTRICTED"
    | "VALIDATION_TIGHTENED";
  /** The field name affected */
  fieldName: string;
  /** Human-readable description */
  message: string;
  /** Number of entries affected */
  affectedEntriesCount: number;
}

/**
 * Result from updating a content type, includes breaking changes if force=true was used.
 */
export interface UpdateContentTypeResult extends ContentType {
  /** Breaking changes that were detected (only present if force=true was used) */
  breakingChanges?: BreakingChange[];
}

export interface DeleteContentTypeArgs {
  id: string;
  /**
   * If true, delete all content entries of this type before deleting the type.
   * If false and entries exist, the operation will fail.
   * @default false
   */
  cascade?: boolean;
  /**
   * If true, permanently delete (hard delete).
   * If false, soft delete by setting deletedAt timestamp.
   * @default false
   */
  hardDelete?: boolean;
  deletedBy?: string;
}

/**
 * Result from deleting a content type.
 */
export interface DeleteContentTypeResult {
  /** Whether the deletion was successful */
  success: boolean;
  /** The ID of the deleted content type */
  deletedId: string;
  /** Number of content entries that were deleted (when cascade=true) */
  deletedEntriesCount: number;
  /** Number of content versions that were deleted (when cascade=true and hardDelete=true) */
  deletedVersionsCount: number;
  /** Whether this was a hard delete (permanent) or soft delete */
  wasHardDelete: boolean;
}

export interface GetContentTypeArgs {
  id?: string;
  name?: string;
  /** Whether to include soft-deleted content types */
  includeDeleted?: boolean;
}

export interface ListContentTypesArgs {
  /** Filter by active status: true = active only, false = inactive only, undefined = all */
  isActive?: boolean;
  /** Whether to include soft-deleted content types */
  includeDeleted?: boolean;
  /** Field to sort by */
  sortBy?: "name" | "createdAt";
  /** Sort direction */
  sortDirection?: "asc" | "desc";
  /** Pagination options (optional - if not provided, returns all results) */
  paginationOpts?: PaginationOpts;
}

// Content Entry Arguments
export interface CreateContentEntryArgs {
  contentTypeId: string;
  slug?: string;
  data: Record<string, unknown>;
  locale?: string;
  primaryEntryId?: string;
  status?: ContentStatus;
  createdBy?: string;
}

export interface UpdateContentEntryArgs {
  id: string;
  slug?: string;
  data?: Record<string, unknown>;
  status?: ContentStatus;
  scheduledPublishAt?: number;
  updatedBy?: string;
}

export interface DeleteContentEntryArgs {
  id: string;
  deletedBy?: string;
}

export interface GetContentEntryArgs {
  id: string;
}

export interface GetContentEntryBySlugArgs {
  contentTypeId?: string;
  contentTypeName?: string;
  slug: string;
  locale?: string;
}

export interface ListContentEntriesArgs extends ContentQueryOptions {}

export interface PublishEntryArgs {
  id: string;
  changeDescription?: string;
  updatedBy?: string;
}

export interface UnpublishEntryArgs {
  id: string;
  updatedBy?: string;
}

export interface ScheduleEntryArgs {
  id: string;
  publishAt: number;
  updatedBy?: string;
}

export interface RestoreEntryArgs {
  id: string;
  restoredBy?: string;
}

// Duplicate Entry Arguments
export interface DuplicateEntryArgs {
  /** The ID of the content entry to duplicate */
  sourceEntryId: string;
  /** Optional custom slug for the duplicated entry (auto-generated if not provided) */
  slug?: string;
  /** Whether to copy media references from the source entry (default: true) */
  copyMediaReferences?: boolean;
  /** Optional locale for the duplicated entry */
  locale?: string;
  /** User ID performing the duplication (for audit trail) */
  createdBy?: string;
}

// =============================================================================
// Bulk Operation Types
// =============================================================================

/**
 * Result of an individual item in a bulk operation.
 */
export interface BulkOperationItemResult {
  /** The content entry ID */
  id: string;
  /** Whether the operation succeeded for this entry */
  success: boolean;
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Result of a bulk operation on content entries.
 */
export interface BulkOperationResult {
  /** Total number of entries processed */
  total: number;
  /** Number of successful operations */
  succeeded: number;
  /** Number of failed operations */
  failed: number;
  /** Individual results for each entry */
  results: BulkOperationItemResult[];
}

/**
 * Arguments for bulk publishing content entries.
 */
export interface BulkPublishArgs {
  /** Array of content entry IDs to publish */
  ids: string[];
  /** Optional description for version history (applied to all entries) */
  changeDescription?: string;
  /** User ID performing the operation (for audit trail) */
  updatedBy?: string;
}

/**
 * Arguments for bulk unpublishing content entries.
 */
export interface BulkUnpublishArgs {
  /** Array of content entry IDs to unpublish */
  ids: string[];
  /** User ID performing the operation (for audit trail) */
  updatedBy?: string;
}

/**
 * Arguments for bulk deleting content entries.
 */
export interface BulkDeleteArgs {
  /** Array of content entry IDs to delete */
  ids: string[];
  /** User ID performing the deletion (for audit trail) */
  deletedBy?: string;
  /** If true, permanently deletes entries and all versions. Default is soft delete. */
  hardDelete?: boolean;
}

/**
 * Arguments for bulk updating content entries.
 */
export interface BulkUpdateArgs {
  /** Array of content entry IDs to update */
  ids: string[];
  /** Data to merge into each entry */
  data?: Record<string, unknown>;
  /** New status to apply to all entries */
  status?: ContentStatus;
  /** User ID performing the operation (for audit trail) */
  updatedBy?: string;
}

/**
 * Arguments for bulk restoring soft-deleted content entries.
 */
export interface BulkRestoreArgs {
  /** Array of content entry IDs to restore */
  ids: string[];
  /** User ID performing the operation (for audit trail) */
  restoredBy?: string;
}

// Version Arguments
export interface ListVersionsArgs {
  entryId: string;
  cursor?: string;
  limit?: number;
}

/**
 * Arguments for getting a specific version.
 * Supports lookup by version ID or version number.
 */
export interface GetVersionArgs {
  /** The content entry ID (required for ownership validation) */
  entryId: string;
  /** Direct lookup by version document ID */
  versionId?: string;
  /** Lookup by version number */
  versionNumber?: number;
}

/**
 * Arguments for getting version history with improved pagination.
 */
export interface GetVersionHistoryArgs {
  /** The content entry ID to get history for */
  entryId: string;
  /** Pagination options */
  paginationOpts: PaginationOpts;
}

export interface RollbackVersionArgs {
  entryId: string;
  versionNumber: number;
  updatedBy?: string;
}

/**
 * Arguments for comparing two versions.
 */
export interface CompareVersionsArgs {
  /** The content entry ID */
  entryId: string;
  /** The version number or ID to compare from (older) */
  fromVersion: number | string;
  /** The version number or ID to compare to (newer) */
  toVersion: number | string;
}

// Media Asset Arguments
export interface CreateMediaAssetArgs {
  storageId: string;
  filename: string;
  mimeType: string;
  size: number;
  type: MediaType;
  title?: string;
  description?: string;
  altText?: string;
  folderId?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdBy?: string;
}

export interface UpdateMediaAssetArgs {
  id: string;
  title?: string;
  description?: string;
  altText?: string;
  folderId?: string;
  tags?: string[];
  /** User ID performing the update (used for authorization) */
  updatedBy?: string;
}

export interface DeleteMediaAssetArgs {
  id: string;
  deletedBy?: string;
}

export interface GetMediaAssetArgs {
  id: string;
}

export interface ListMediaAssetsArgs extends MediaQueryOptions {}

// Media Folder Arguments
export interface CreateMediaFolderArgs {
  name: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
  createdBy?: string;
}

export interface UpdateMediaFolderArgs {
  id: string;
  name?: string;
  description?: string;
  sortOrder?: number;
  /** User ID performing the update (used for authorization) */
  updatedBy?: string;
}

export interface DeleteMediaFolderArgs {
  id: string;
  deletedBy?: string;
}

export interface GetMediaFolderArgs {
  id: string;
}

export interface ListMediaFoldersArgs {
  parentId?: string;
  includeDeleted?: boolean;
}

export interface MoveFolderArgs {
  id: string;
  newParentId?: string;
  /** User ID performing the move (used for authorization) */
  updatedBy?: string;
}

// Media Upload Arguments
export interface GenerateUploadUrlArgs {
  /** Optional maximum file size in bytes (default: 50 MB, max: 500 MB) */
  maxFileSize?: number;
  /** Optional array of allowed MIME type patterns (e.g., ["image/*", "video/mp4"]) */
  allowedMimeTypes?: string[];
  /** Optional user ID for audit purposes */
  requestedBy?: string;
}

export interface GenerateUploadUrlResult {
  /** The temporary upload URL. Valid for 1 hour. */
  uploadUrl: string;
  /** Expiration timestamp in milliseconds since epoch */
  expiresAt: number;
  /** Maximum file size in bytes that will be accepted */
  maxFileSize: number;
  /** Allowed MIME types for the upload (if specified) */
  allowedMimeTypes?: string[];
}

// Additional Media Asset Arguments
export interface RestoreMediaAssetArgs {
  id: string;
}

export interface FindMediaAssetReferencesArgs {
  /** The ID of the media asset to find references for */
  id: string;
  /** Maximum number of references to return */
  limit?: number;
}

/**
 * Reference to a content entry that uses a media asset.
 * Returned by findReferences to show which entries reference an asset.
 */
export interface MediaAssetReference {
  /** The ID of the content entry that references the asset */
  entryId: string;
  /** The slug of the content entry */
  slug: string;
  /** The name of the content type */
  contentTypeName: string;
  /** The field names that reference this asset */
  fields: string[];
}

// Additional Media Folder Arguments
export interface RestoreMediaFolderArgs {
  id: string;
  /** Whether to recursively restore contents */
  recursive?: boolean;
}

export interface GetMediaFolderByPathArgs {
  path: string;
  includeDeleted?: boolean;
}

export interface GetFolderTreeArgs {
  includeDeleted?: boolean;
}

// =============================================================================
// Media Variant Arguments (types imported from ./types.js)
// =============================================================================

/** Arguments for creating a media variant */
export interface CreateMediaVariantArgs {
  assetId: string;
  storageId: string;
  variantType: VariantType;
  width?: number;
  height?: number;
  format: string;
  mimeType: string;
  size: number;
  quality?: number;
  preset?: string;
  autoGenerated?: boolean;
  createdBy?: string;
}

/** Arguments for requesting variant generation */
export interface RequestVariantGenerationArgs {
  assetId: string;
  variantType: VariantType;
  width?: number;
  height?: number;
  format: string;
  quality?: number;
  preset?: string;
  requestedBy?: string;
}

/** Arguments for listing variants */
export interface ListMediaVariantsArgs {
  assetId: string;
  variantType?: VariantType;
  format?: string;
  preset?: string;
  status?: VariantStatus;
  includeDeleted?: boolean;
}

/** Arguments for getting the best variant */
export interface GetBestVariantArgs {
  assetId: string;
  targetWidth?: number;
  targetHeight?: number;
  preferredFormat?: string;
  fallbackToOriginal?: boolean;
}

/** Arguments for deleting a variant */
export interface DeleteMediaVariantArgs {
  id: string;
  hardDelete?: boolean;
  deletedBy?: string;
}

/** Arguments for deleting all variants of an asset */
export interface DeleteAssetVariantsArgs {
  assetId: string;
  hardDelete?: boolean;
  deletedBy?: string;
}

/** Arguments for generating variants from presets */
export interface GenerateFromPresetsArgs {
  assetId: string;
  presets: string[];
  requestedBy?: string;
}

/** Result of generating variants from presets */
export interface GenerateVariantsResult {
  total: number;
  succeeded: number;
  failed: number;
  results: {
    preset: string;
    success: boolean;
    variantId?: string;
    error?: string;
  }[];
}

/** Srcset entry for responsive images */
export interface SrcsetEntry {
  url: string;
  descriptor: string;
  width: number;
  format: string;
}

/** Result for responsive srcset data */
export interface ResponsiveSrcsetResult {
  src: string | null;
  srcset: string;
  entries: SrcsetEntry[];
  sizes?: string;
}

/** Variant preset configuration */
export interface VariantPreset {
  name: string;
  variantType: VariantType;
  width?: number;
  height?: number;
  format: string;
  quality?: number;
  description?: string;
}

/** Asset with all its variants */
export interface AssetWithVariants {
  original: {
    _id: string;
    _creationTime: number;
    filename: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    url: string | null;
  };
  variants: MediaVariantWithUrl[];
  variantsByType: {
    thumbnail?: MediaVariantWithUrl;
    responsive: MediaVariantWithUrl[];
    format: MediaVariantWithUrl[];
  };
}

// =============================================================================
// Content Types API Wrapper
// =============================================================================

/**
 * Wrapper for content type operations.
 *
 * Content types define the schema/blueprint for content entries in the CMS.
 * They specify what fields an entry can have, validation rules, and metadata.
 *
 * @example
 * ```typescript
 * // Create a blog post content type
 * const blogType = await cms.contentTypes.create(ctx, {
 *   name: "blog_post",
 *   displayName: "Blog Post",
 *   fields: [
 *     { name: "title", label: "Title", type: "text", required: true },
 *     { name: "content", label: "Content", type: "richText", required: true },
 *     { name: "category", label: "Category", type: "select", required: true, options: {
 *       options: [{ value: "tech", label: "Technology" }, { value: "news", label: "News" }]
 *     }},
 *   ],
 *   slugField: "title",
 *   titleField: "title",
 * });
 *
 * // Check if a type exists before creating
 * if (!(await cms.contentTypes.exists(ctx, "blog_post"))) {
 *   await cms.contentTypes.create(ctx, { ... });
 * }
 * ```
 */
export class ContentTypesApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: ResolvedComponentConfig,
    private readonly authHelper?: AuthorizationHelper,
    private readonly rateLimitHelper?: RateLimitHelper
  ) {}

  /**
   * Perform authorization check for content type operations.
   *
   * Authorization behavior:
   * - If `getUserRole` is not configured and `permissiveMode` is false: throws AuthorizationNotConfiguredError
   * - If `getUserRole` is not configured and `permissiveMode` is true: logs warning and allows operation
   * - If `skipRbac` is enabled: skips RBAC checks but still validates auth is configured
   * - If no `userId` is provided: same rules apply based on permissiveMode
   *
   * @param ctx - The Convex context (passed to authorization hooks for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   * @param resourceId - Optional resource ID (for update/delete operations)
   * @throws AuthorizationNotConfiguredError if authorization is not configured and permissiveMode is false
   */
  private async authorize(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined,
    resourceId?: string
  ): Promise<void> {
    // Check if authorization is configured
    if (!this.authHelper) {
      if (this.config.permissiveMode) {
        console.warn(
          `[ConvexCMS] Authorization not configured for "${operation}". ` +
          "Operations are allowed in permissiveMode, but this should NOT be used in production. " +
          "Configure getUserRole hook to enable proper authorization."
        );
        return;
      }
      throw new AuthorizationNotConfiguredError(operation);
    }

    // Skip RBAC checks if explicitly disabled
    if (this.authHelper.skipRbac) {
      return;
    }

    // Check if userId is provided
    if (!userId) {
      if (this.config.permissiveMode) {
        console.warn(
          `[ConvexCMS] Anonymous operation attempted for "${operation}". ` +
          "Operations without userId are allowed in permissiveMode, but this should NOT be used in production."
        );
        return;
      }
      throw new AuthorizationNotConfiguredError(
        `${operation} (no userId provided - anonymous operations require permissiveMode)`
      );
    }

    const role = await this.authHelper.getUserRole(ctx, userId);

    await this.authHelper.requireAuthorization(ctx, {
      operation,
      userId,
      role,
      resourceId,
    });
  }

  /**
   * Enforce rate limit for content type operations.
   * @param ctx - The Convex context (for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   */
  private async rateLimit(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined
  ): Promise<void> {
    // Skip if no rate limit helper configured
    if (!this.rateLimitHelper) {
      return;
    }

    const role = userId ? await this.rateLimitHelper.getUserRole(ctx, userId) : null;

    await this.rateLimitHelper.requireRateLimit(operation, {
      userId,
      role,
    });
  }

  /**
   * Create a new content type.
   *
   * Content type names must be unique and follow the naming convention:
   * - Start with a lowercase letter
   * - Contain only lowercase letters, numbers, and underscores
   * - Maximum 64 characters
   *
   * @param ctx - Convex mutation context
   * @param args - Content type creation arguments
   * @returns The created content type
   *
   * @throws Error if the name is already taken
   * @throws Error if the name format is invalid
   * @throws Error if field definitions are invalid
   *
   * @example
   * ```typescript
   * const blogType = await cms.contentTypes.create(ctx, {
   *   name: "blog_post",
   *   displayName: "Blog Post",
   *   fields: [
   *     { name: "title", label: "Title", type: "text", required: true },
   *     { name: "content", label: "Content", type: "richText", required: true },
   *   ],
   *   slugField: "title",
   *   createdBy: currentUserId,
   * });
   * ```
   */
  async create(
    ctx: ConvexContext,
    args: CreateContentTypeArgs
  ): Promise<ContentType> {
    // Authorization check - contentTypes.create
    await this.authorize(ctx, "contentTypes.create", args.createdBy);
    // Rate limit check - contentTypes.create
    await this.rateLimit(ctx, "contentTypes.create", args.createdBy);
    return ctx.runMutation(this.api.contentTypeMutations.createContentType, args);
  }

  /**
   * Update an existing content type.
   *
   * When updating field definitions, the system detects breaking changes that
   * could affect existing content entries:
   * - Removing fields that have data
   * - Changing field types
   * - Making optional fields required
   * - Removing select/multiSelect options
   * - Restricting allowed reference types
   * - Tightening validation rules
   *
   * If breaking changes are detected, the update will fail unless `force: true`
   * is specified.
   *
   * @param ctx - Convex mutation context
   * @param args - Content type update arguments
   * @returns The updated content type, with breakingChanges if force was used
   *
   * @throws Error if the content type does not exist
   * @throws Error if breaking changes are detected and force is not true
   *
   * @example
   * ```typescript
   * // Simple update (no breaking changes)
   * const updated = await cms.contentTypes.update(ctx, {
   *   id: contentTypeId,
   *   displayName: "Updated Blog Post",
   *   description: "New description",
   * });
   *
   * // Force update with breaking changes
   * const result = await cms.contentTypes.update(ctx, {
   *   id: contentTypeId,
   *   fields: newFields,
   *   force: true, // Acknowledge potential data loss
   * });
   *
   * if (result.breakingChanges) {
   *   console.warn("Breaking changes applied:", result.breakingChanges);
   * }
   * ```
   */
  async update(
    ctx: ConvexContext,
    args: UpdateContentTypeArgs
  ): Promise<UpdateContentTypeResult> {
    // Authorization check - contentTypes.update
    await this.authorize(ctx, "contentTypes.update", args.updatedBy, args.id);
    // Rate limit check - contentTypes.update
    await this.rateLimit(ctx, "contentTypes.update", args.updatedBy);
    return ctx.runMutation(this.api.contentTypeMutations.updateContentType, args);
  }

  /**
   * Delete a content type.
   *
   * Supports two deletion modes:
   * - **Soft delete** (default): Sets a `deletedAt` timestamp, content type remains in database
   * - **Hard delete** (`hardDelete: true`): Permanently removes from database
   *
   * If content entries exist for this type:
   * - Without `cascade`: The operation fails
   * - With `cascade: true`: All entries are deleted first (soft or hard based on `hardDelete`)
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments including cascade and hardDelete options
   * @returns Result object with deletion counts
   *
   * @throws Error if content type does not exist
   * @throws Error if cascade is false and content entries exist
   *
   * @example
   * ```typescript
   * // Soft delete - fails if entries exist
   * const result = await cms.contentTypes.delete(ctx, {
   *   id: contentTypeId,
   *   deletedBy: currentUserId,
   * });
   *
   * // Cascade soft delete - deletes all entries too
   * const result = await cms.contentTypes.delete(ctx, {
   *   id: contentTypeId,
   *   cascade: true,
   *   deletedBy: currentUserId,
   * });
   * console.log(`Deleted ${result.deletedEntriesCount} entries`);
   *
   * // Hard delete with cascade - permanently removes everything
   * const result = await cms.contentTypes.delete(ctx, {
   *   id: contentTypeId,
   *   cascade: true,
   *   hardDelete: true,
   *   deletedBy: currentUserId,
   * });
   * ```
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteContentTypeArgs
  ): Promise<DeleteContentTypeResult> {
    // Authorization check - contentTypes.delete
    await this.authorize(ctx, "contentTypes.delete", args.deletedBy, args.id);
    // Rate limit check - contentTypes.delete
    await this.rateLimit(ctx, "contentTypes.delete", args.deletedBy);
    return ctx.runMutation(this.api.contentTypeMutations.deleteContentType, args);
  }

  /**
   * Get a content type by ID or name.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments (id or name)
   * @returns The content type or null if not found
   *
   * @example
   * ```typescript
   * // Get by ID (fastest - direct document lookup)
   * const type = await cms.contentTypes.get(ctx, { id: typeId });
   *
   * // Get by name (uses index)
   * const type = await cms.contentTypes.get(ctx, { name: "blog_post" });
   *
   * // Include soft-deleted types
   * const type = await cms.contentTypes.get(ctx, {
   *   name: "archived_type",
   *   includeDeleted: true,
   * });
   * ```
   */
  async get(
    ctx: ConvexContext,
    args: GetContentTypeArgs
  ): Promise<ContentType | null> {
    return ctx.runQuery(this.api.contentTypes.get, args);
  }

  /**
   * Get a content type by name.
   *
   * Convenience method that wraps `get()` for name-based lookup.
   *
   * @param ctx - Convex query context
   * @param name - The machine-readable name of the content type
   * @param includeDeleted - Whether to include soft-deleted types
   * @returns The content type or null if not found
   *
   * @example
   * ```typescript
   * const blogType = await cms.contentTypes.getByName(ctx, "blog_post");
   * if (blogType) {
   *   console.log("Fields:", blogType.fields);
   * }
   * ```
   */
  async getByName(
    ctx: ConvexContext,
    name: string,
    includeDeleted = false
  ): Promise<ContentType | null> {
    return this.get(ctx, { name, includeDeleted });
  }

  /**
   * Get a content type by ID.
   *
   * Convenience method that wraps `get()` for ID-based lookup.
   *
   * @param ctx - Convex query context
   * @param id - The content type ID
   * @param includeDeleted - Whether to include soft-deleted types
   * @returns The content type or null if not found
   *
   * @example
   * ```typescript
   * const type = await cms.contentTypes.getById(ctx, contentTypeId);
   * ```
   */
  async getById(
    ctx: ConvexContext,
    id: string,
    includeDeleted = false
  ): Promise<ContentType | null> {
    return this.get(ctx, { id, includeDeleted });
  }

  /**
   * Check if a content type with the given name exists.
   *
   * @param ctx - Convex query context
   * @param name - The machine-readable name to check
   * @param includeDeleted - Whether to include soft-deleted types
   * @returns true if the content type exists
   *
   * @example
   * ```typescript
   * // Check before creating to avoid duplicate name error
   * if (!(await cms.contentTypes.exists(ctx, "blog_post"))) {
   *   await cms.contentTypes.create(ctx, { name: "blog_post", ... });
   * }
   * ```
   */
  async exists(
    ctx: ConvexContext,
    name: string,
    includeDeleted = false
  ): Promise<boolean> {
    const type = await this.getByName(ctx, name, includeDeleted);
    return type !== null;
  }

  /**
   * List all content types with optional filtering and pagination.
   *
   * Returns a paginated result compatible with Convex's `usePaginatedQuery` hook.
   *
   * @param ctx - Convex query context
   * @param args - Optional filter, sort, and pagination arguments
   * @returns Paginated result with page, continueCursor, and isDone
   *
   * @example
   * ```typescript
   * // List all active content types sorted by name
   * const { page, continueCursor, isDone } = await cms.contentTypes.list(ctx, {
   *   isActive: true,
   *   sortBy: "name",
   *   paginationOpts: { numItems: 20 },
   * });
   *
   * // Get next page
   * const page2 = await cms.contentTypes.list(ctx, {
   *   isActive: true,
   *   paginationOpts: { numItems: 20, cursor: continueCursor },
   * });
   *
   * // List all content types (non-paginated)
   * const all = await cms.contentTypes.list(ctx);
   * console.log("Total types:", all.page.length);
   * ```
   */
  async list(
    ctx: ConvexContext,
    args: ListContentTypesArgs = {}
  ): Promise<PaginationResult<ContentType>> {
    return ctx.runQuery(this.api.contentTypes.list, args);
  }

  /**
   * List only active content types.
   *
   * Convenience method that filters to active types only.
   *
   * @param ctx - Convex query context
   * @param paginationOpts - Optional pagination options
   * @returns Paginated result of active content types
   *
   * @example
   * ```typescript
   * const { page } = await cms.contentTypes.listActive(ctx);
   * for (const type of page) {
   *   console.log(type.displayName);
   * }
   * ```
   */
  async listActive(
    ctx: ConvexContext,
    paginationOpts?: PaginationOpts
  ): Promise<PaginationResult<ContentType>> {
    return this.list(ctx, {
      isActive: true,
      includeDeleted: false,
      paginationOpts,
    });
  }

  /**
   * Get all content types as a simple array.
   *
   * Convenience method that fetches all types without pagination.
   * Use with caution for large numbers of content types.
   *
   * @param ctx - Convex query context
   * @param includeInactive - Whether to include inactive types
   * @returns Array of all content types
   *
   * @example
   * ```typescript
   * const allTypes = await cms.contentTypes.getAll(ctx);
   * const typeNames = allTypes.map(t => t.name);
   * ```
   */
  async getAll(
    ctx: ConvexContext,
    includeInactive = false
  ): Promise<ContentType[]> {
    const result = await this.list(ctx, {
      isActive: includeInactive ? undefined : true,
      includeDeleted: false,
    });
    return result.page;
  }

  /**
   * Count the number of content types.
   *
   * @param ctx - Convex query context
   * @param includeInactive - Whether to include inactive types
   * @returns The total count of content types
   *
   * @example
   * ```typescript
   * const count = await cms.contentTypes.count(ctx);
   * console.log(`You have ${count} content types`);
   * ```
   */
  async count(
    ctx: ConvexContext,
    includeInactive = false
  ): Promise<number> {
    const all = await this.getAll(ctx, includeInactive);
    return all.length;
  }

  /**
   * Deactivate a content type without deleting it.
   *
   * Deactivated types remain in the database but are filtered out by default
   * when listing content types. Existing content entries remain accessible.
   *
   * @param ctx - Convex mutation context
   * @param id - The content type ID to deactivate
   * @param updatedBy - User ID making the change
   * @returns The updated content type
   *
   * @example
   * ```typescript
   * await cms.contentTypes.deactivate(ctx, contentTypeId, currentUserId);
   * ```
   */
  async deactivate(
    ctx: ConvexContext,
    id: string,
    updatedBy?: string
  ): Promise<UpdateContentTypeResult> {
    return this.update(ctx, { id, isActive: false, updatedBy });
  }

  /**
   * Reactivate a previously deactivated content type.
   *
   * @param ctx - Convex mutation context
   * @param id - The content type ID to reactivate
   * @param updatedBy - User ID making the change
   * @returns The updated content type
   *
   * @example
   * ```typescript
   * await cms.contentTypes.reactivate(ctx, contentTypeId, currentUserId);
   * ```
   */
  async reactivate(
    ctx: ConvexContext,
    id: string,
    updatedBy?: string
  ): Promise<UpdateContentTypeResult> {
    return this.update(ctx, { id, isActive: true, updatedBy });
  }
}

// =============================================================================
// Content Entries API Wrapper
// =============================================================================

/**
 * Wrapper for content entry operations.
 */
export class ContentEntriesApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: ResolvedComponentConfig,
    private readonly authHelper?: AuthorizationHelper,
    private readonly rateLimitHelper?: RateLimitHelper
  ) {}

  /**
   * Perform authorization check for content entry operations.
   *
   * Authorization behavior:
   * - If `getUserRole` is not configured and `permissiveMode` is false: throws AuthorizationNotConfiguredError
   * - If `getUserRole` is not configured and `permissiveMode` is true: logs warning and allows operation
   * - If `skipRbac` is enabled: skips RBAC checks but still validates auth is configured
   * - If no `userId` is provided: same rules apply based on permissiveMode
   *
   * @param ctx - The Convex context (passed to authorization hooks for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   * @param resourceId - Optional resource ID (for update/delete operations)
   * @param resourceOwnerId - Optional owner ID for ownership-based permissions
   * @param contentTypeId - Optional content type ID for content-type-specific permissions
   * @throws AuthorizationNotConfiguredError if authorization is not configured and permissiveMode is false
   */
  private async authorize(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined,
    resourceId?: string,
    resourceOwnerId?: string,
    contentTypeId?: string
  ): Promise<void> {
    // Check if authorization is configured
    if (!this.authHelper) {
      if (this.config.permissiveMode) {
        // In permissive mode, allow operation but log a warning
        console.warn(
          `[ConvexCMS] Authorization not configured for "${operation}". ` +
          "Operations are allowed in permissiveMode, but this should NOT be used in production. " +
          "Configure getUserRole hook to enable proper authorization."
        );
        return;
      }
      // Fail securely - require authorization configuration
      throw new AuthorizationNotConfiguredError(operation);
    }

    // Skip RBAC checks if explicitly disabled (but auth was still validated above)
    if (this.authHelper.skipRbac) {
      return;
    }

    // Check if userId is provided
    if (!userId) {
      if (this.config.permissiveMode) {
        // In permissive mode, allow anonymous operations with a warning
        console.warn(
          `[ConvexCMS] Anonymous operation attempted for "${operation}". ` +
          "Operations without userId are allowed in permissiveMode, but this should NOT be used in production. " +
          "Ensure all operations include a userId for proper authorization."
        );
        return;
      }
      // Fail securely - require userId for authorization
      throw new AuthorizationNotConfiguredError(
        `${operation} (no userId provided - anonymous operations require permissiveMode)`
      );
    }

    const role = await this.authHelper.getUserRole(ctx, userId);

    await this.authHelper.requireAuthorization(ctx, {
      operation,
      userId,
      role,
      resourceId,
      resourceOwnerId,
      contentTypeId,
    });
  }

  /**
   * Enforce rate limit for content entry operations.
   * @param ctx - The Convex context (for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   * @param contentTypeId - Optional content type ID for more granular rate limiting
   */
  private async rateLimit(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined,
    contentTypeId?: string
  ): Promise<void> {
    // Skip if no rate limit helper configured
    if (!this.rateLimitHelper) {
      return;
    }

    const role = userId ? await this.rateLimitHelper.getUserRole(ctx, userId) : null;

    await this.rateLimitHelper.requireRateLimit(operation, {
      userId,
      role,
      contentTypeId,
    });
  }

  /**
   * Create a new content entry.
   *
   * @param ctx - Convex mutation context
   * @param args - Entry creation arguments
   * @returns The created entry
   *
   * @example
   * ```typescript
   * const post = await cms.contentEntries.create(ctx, {
   *   contentTypeId: blogTypeId,
   *   data: {
   *     title: "My First Post",
   *     content: "<p>Hello world!</p>",
   *   },
   * });
   * ```
   */
  async create(
    ctx: ConvexContext,
    args: CreateContentEntryArgs
  ): Promise<ContentEntry> {
    // Authorization check - contentEntries.create
    await this.authorize(
      ctx,
      "contentEntries.create",
      args.createdBy,
      undefined,
      undefined,
      args.contentTypeId
    );
    // Rate limit check - contentEntries.create
    await this.rateLimit(ctx, "contentEntries.create", args.createdBy, args.contentTypeId);

    // Apply default locale if not specified and localization is enabled
    const argsWithDefaults = {
      ...args,
      locale: args.locale ?? this.config.defaultLocale,
    };
    return ctx.runMutation(this.api.contentEntryMutations.createEntry, argsWithDefaults);
  }

  /**
   * Update an existing content entry.
   *
   * @param ctx - Convex mutation context
   * @param args - Entry update arguments
   * @returns The updated entry
   */
  async update(
    ctx: ConvexContext,
    args: UpdateContentEntryArgs
  ): Promise<ContentEntry> {
    // Fetch entry for ownership-based authorization
    const entry = await ctx.runQuery(this.api.contentEntries.get, { id: args.id });
    if (!entry) {
      throw new Error(`Content entry not found: ${args.id}`);
    }

    // Authorization check - contentEntries.update (with ownership info)
    await this.authorize(
      ctx,
      "contentEntries.update",
      args.updatedBy,
      args.id,
      entry.createdBy,
      entry.contentTypeId
    );
    // Rate limit check - contentEntries.update
    await this.rateLimit(ctx, "contentEntries.update", args.updatedBy, entry.contentTypeId);
    return ctx.runMutation(this.api.contentEntryMutations.updateEntry, args);
  }

  /**
   * Soft delete a content entry.
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments
   * @returns The deleted entry
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteContentEntryArgs
  ): Promise<ContentEntry> {
    // Fetch entry for ownership-based authorization
    const entry = await ctx.runQuery(this.api.contentEntries.get, { id: args.id });
    if (!entry) {
      throw new Error(`Content entry not found: ${args.id}`);
    }

    // Authorization check - contentEntries.delete (with ownership info)
    await this.authorize(
      ctx,
      "contentEntries.delete",
      args.deletedBy,
      args.id,
      entry.createdBy,
      entry.contentTypeId
    );
    // Rate limit check - contentEntries.delete
    await this.rateLimit(ctx, "contentEntries.delete", args.deletedBy, entry.contentTypeId);
    return ctx.runMutation(this.api.contentEntryMutations.deleteEntry, args);
  }

  /**
   * Get a content entry by ID.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments
   * @returns The entry or null if not found
   */
  async get(
    ctx: ConvexContext,
    args: GetContentEntryArgs
  ): Promise<ContentEntry | null> {
    return ctx.runQuery(this.api.contentEntries.get, args);
  }

  /**
   * Get a content entry by slug.
   *
   * @param ctx - Convex query context
   * @param args - Get by slug arguments
   * @returns The entry or null if not found
   *
   * @example
   * ```typescript
   * const post = await cms.contentEntries.getBySlug(ctx, {
   *   contentTypeName: "blog_post",
   *   slug: "my-first-post",
   * });
   * ```
   */
  async getBySlug(
    ctx: ConvexContext,
    args: GetContentEntryBySlugArgs
  ): Promise<ContentEntry | null> {
    return callQuery(ctx, this.api.contentEntries.getBySlug, args);
  }

  /**
   * List content entries with optional filters and cursor-based pagination.
   *
   * Uses the standard Convex pagination format compatible with usePaginatedQuery.
   *
   * @param ctx - Convex query context
   * @param args - Query options with pagination
   * @returns PaginationResult with page, continueCursor, and isDone
   *
   * @example
   * ```typescript
   * // First page
   * const { page, continueCursor, isDone } = await cms.contentEntries.list(ctx, {
   *   contentTypeName: "blog_post",
   *   status: "published",
   *   paginationOpts: { numItems: 10 },
   * });
   *
   * // Next page
   * const page2 = await cms.contentEntries.list(ctx, {
   *   contentTypeName: "blog_post",
   *   status: "published",
   *   paginationOpts: { numItems: 10, cursor: continueCursor },
   * });
   * ```
   */
  async list(
    ctx: ConvexContext,
    args: ListContentEntriesArgs
  ): Promise<PaginationResult<ContentEntry>> {
    return ctx.runQuery(this.api.contentEntries.list, args);
  }

  /**
   * Publish a content entry.
   *
   * @param ctx - Convex mutation context
   * @param args - Publish arguments
   * @returns The published entry
   */
  async publish(
    ctx: ConvexContext,
    args: PublishEntryArgs
  ): Promise<ContentEntry> {
    // Fetch entry for ownership-based authorization
    const entry = await ctx.runQuery(this.api.contentEntries.get, { id: args.id });
    if (!entry) {
      throw new Error(`Content entry not found: ${args.id}`);
    }

    // Authorization check - contentEntries.publish (with ownership info)
    await this.authorize(
      ctx,
      "contentEntries.publish",
      args.updatedBy,
      args.id,
      entry.createdBy,
      entry.contentTypeId
    );
    // Rate limit check - contentEntries.publish
    await this.rateLimit(ctx, "contentEntries.publish", args.updatedBy, entry.contentTypeId);
    return ctx.runMutation(this.api.contentEntryMutations.publishEntry, args);
  }

  /**
   * Unpublish a content entry (revert to draft).
   *
   * @param ctx - Convex mutation context
   * @param args - Unpublish arguments
   * @returns The unpublished entry
   */
  async unpublish(
    ctx: ConvexContext,
    args: UnpublishEntryArgs
  ): Promise<ContentEntry> {
    // Fetch entry for ownership-based authorization
    const entry = await ctx.runQuery(this.api.contentEntries.get, { id: args.id });
    if (!entry) {
      throw new Error(`Content entry not found: ${args.id}`);
    }

    // Authorization check - contentEntries.unpublish (with ownership info)
    await this.authorize(
      ctx,
      "contentEntries.unpublish",
      args.updatedBy,
      args.id,
      entry.createdBy,
      entry.contentTypeId
    );
    // Rate limit check - contentEntries.unpublish
    await this.rateLimit(ctx, "contentEntries.unpublish", args.updatedBy, entry.contentTypeId);
    return ctx.runMutation(this.api.contentEntryMutations.unpublishEntry, args);
  }

  /**
   * Schedule a content entry for future publication.
   *
   * @param ctx - Convex mutation context
   * @param args - Schedule arguments
   * @returns The scheduled entry
   *
   * @example
   * ```typescript
   * await cms.contentEntries.schedule(ctx, {
   *   id: entryId,
   *   publishAt: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
   * });
   * ```
   */
  async schedule(
    ctx: ConvexContext,
    args: ScheduleEntryArgs
  ): Promise<ContentEntry> {
    if (!this.config.features.scheduling) {
      throw new Error("Scheduling feature is not enabled");
    }

    // Fetch entry for ownership-based authorization
    const entry = await ctx.runQuery(this.api.contentEntries.get, { id: args.id });
    if (!entry) {
      throw new Error(`Content entry not found: ${args.id}`);
    }

    // Authorization check - contentEntries.schedule (with ownership info)
    await this.authorize(
      ctx,
      "contentEntries.schedule",
      args.updatedBy,
      args.id,
      entry.createdBy,
      entry.contentTypeId
    );
    // Rate limit check - contentEntries.schedule
    await this.rateLimit(ctx, "contentEntries.schedule", args.updatedBy, entry.contentTypeId);
    return ctx.runMutation(this.api.scheduledPublish.scheduleEntry, args);
  }

  /**
   * Restore a soft-deleted content entry.
   *
   * Removes the deletedAt timestamp from a soft-deleted entry,
   * making it active again. Only works for soft-deleted entries;
   * hard-deleted entries cannot be recovered.
   *
   * @param ctx - Convex mutation context
   * @param args - Restore arguments
   * @returns The restored entry
   *
   * @example
   * ```typescript
   * // Restore a soft-deleted entry
   * const restored = await cms.contentEntries.restore(ctx, {
   *   id: entryId,
   *   restoredBy: currentUserId,
   * });
   * console.log(restored.deletedAt); // undefined
   * ```
   */
  async restore(
    ctx: ConvexContext,
    args: RestoreEntryArgs
  ): Promise<ContentEntry> {
    if (!this.config.features.softDelete) {
      throw new Error("Soft delete feature is not enabled");
    }

    // Fetch entry for ownership-based authorization
    const entry = await ctx.runQuery(this.api.contentEntries.get, { id: args.id });
    if (!entry) {
      throw new Error(`Content entry not found: ${args.id}`);
    }

    // Authorization check - contentEntries.restore (with ownership info)
    await this.authorize(
      ctx,
      "contentEntries.restore",
      args.restoredBy,
      args.id,
      entry.createdBy,
      entry.contentTypeId
    );
    // Rate limit check - contentEntries.restore
    await this.rateLimit(ctx, "contentEntries.restore", args.restoredBy, entry.contentTypeId);
    return ctx.runMutation(this.api.contentEntryMutations.restoreEntry, args);
  }

  /**
   * Create a fluent query builder for constructing complex content queries.
   *
   * The query builder provides a chainable API for building queries with:
   * - Content type filtering
   * - Status filtering (single or multiple)
   * - Field-level filters with various operators
   * - Full-text search
   * - Locale filtering
   * - Cursor-based pagination
   * - Sort direction
   *
   * @returns A new ContentQueryBuilder instance
   *
   * @example
   * ```typescript
   * // Simple query
   * const posts = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .status("published")
   *   .limit(10)
   *   .execute(ctx);
   *
   * // Complex query with field filters
   * const featured = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .where("category", "eq", "technology")
   *   .whereContains("tags", "featured")
   *   .whereGreaterThan("views", 100)
   *   .newestFirst()
   *   .limit(5)
   *   .execute(ctx);
   *
   * // Pagination
   * const page1 = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .limit(20)
   *   .execute(ctx);
   *
   * const page2 = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .limit(20)
   *   .cursor(page1.continueCursor)
   *   .execute(ctx);
   *
   * // Get first result only
   * const latest = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .published()
   *   .newestFirst()
   *   .first(ctx);
   *
   * // Check if results exist
   * const hasPublished = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .published()
   *   .exists(ctx);
   * ```
   */
  query(): ContentQueryBuilder {
    return createQueryBuilder(this.api);
  }

  /**
   * Resolve locale content for a single content entry.
   *
   * Takes a content entry with potentially localized field values and resolves
   * all localized fields to single values based on the requested locale and
   * fallback chain. This merges localized and default field values.
   *
   * Resolution order for each localized field:
   * 1. Try the requested locale
   * 2. Try each locale in the fallback chain (in order)
   * 3. Try the default locale
   * 4. Return first available locale as last resort
   *
   * @param entry - The content entry to resolve (with raw localized data)
   * @param options - Locale resolution options
   * @returns The entry with resolved data and metadata about resolution
   *
   * @example
   * ```typescript
   * // Get an entry
   * const entry = await cms.contentEntries.get(ctx, { id: entryId });
   *
   * // Resolve to Spanish with English fallback
   * const resolved = cms.contentEntries.resolveLocale(entry, {
   *   locale: "es-ES",
   *   fallbackChain: ["en-US"],
   *   defaultLocale: "en-US",
   *   fields: contentType.fields,
   * });
   *
   * // Access resolved data
   * console.log(resolved.data.title); // "Hola" (Spanish) or "Hello" (English fallback)
   *
   * // Check which fields used fallback
   * if (resolved.localeResolution.fieldsFromFallback.includes("title")) {
   *   console.log("Title was not translated to Spanish");
   * }
   *
   * // See which locale each field was resolved from
   * console.log(resolved.localeResolution.fieldResolutions);
   * // { content: "en-US" } - content was resolved from English
   * ```
   */
  resolveLocale<T extends ContentEntry>(
    entry: T,
    options: ResolveLocaleContentOptions
  ): T & LocaleResolvedEntry {
    return resolveLocaleContent(entry, options);
  }

  /**
   * Resolve locale content for multiple content entries.
   *
   * Convenience method for batch-resolving a list of entries.
   * Useful after fetching a paginated list of content entries.
   *
   * @param entries - Array of content entries to resolve
   * @param options - Locale resolution options (applied to all entries)
   * @returns Array of entries with resolved locale data
   *
   * @example
   * ```typescript
   * // Fetch published blog posts
   * const { page } = await cms.contentEntries.list(ctx, {
   *   contentTypeName: "blog_post",
   *   status: "published",
   *   paginationOpts: { numItems: 10 },
   * });
   *
   * // Resolve all entries to Spanish
   * const resolvedPosts = cms.contentEntries.resolveLocaleBatch(page, {
   *   locale: "es-ES",
   *   fallbackChain: cms.getLocaleFallbackChain("es-ES"),
   *   defaultLocale: cms.config.defaultLocale,
   *   fields: blogPostType.fields,
   * });
   *
   * // Use resolved data
   * for (const post of resolvedPosts) {
   *   console.log(post.data.title); // Resolved title in Spanish or fallback
   * }
   * ```
   */
  resolveLocaleBatch<T extends ContentEntry>(
    entries: T[],
    options: ResolveLocaleContentOptions
  ): Array<T & LocaleResolvedEntry> {
    return resolveLocaleContentBatch(entries, options);
  }

  /**
   * List content entries with automatic locale resolution.
   *
   * This is a convenience method that combines `list()` and `resolveLocaleBatch()`
   * into a single call. It fetches content entries and automatically resolves
   * all localized fields to the requested locale with fallback support.
   *
   * Note: This method requires the content type's field definitions to properly
   * resolve localized fields. You can either pass them explicitly or let the
   * method fetch them automatically (requires an extra query).
   *
   * @param ctx - Convex query context
   * @param args - Query options with pagination
   * @param localeOptions - Locale resolution options
   * @returns Paginated result with locale-resolved entries
   *
   * @example
   * ```typescript
   * // List with locale resolution
   * const { page, continueCursor, isDone } = await cms.contentEntries.listWithLocale(
   *   ctx,
   *   {
   *     contentTypeName: "blog_post",
   *     status: "published",
   *     paginationOpts: { numItems: 10 },
   *   },
   *   {
   *     locale: "es-ES",
   *     fields: blogPostType.fields, // Required for resolution
   *   }
   * );
   *
   * // All entries have resolved locale data
   * for (const post of page) {
   *   console.log(post.data.title); // Resolved title
   *   console.log(post.localeResolution.fieldsFromFallback); // Which fields used fallback
   * }
   * ```
   */
  async listWithLocale(
    ctx: ConvexContext,
    args: ListContentEntriesArgs,
    localeOptions: ResolveLocaleContentOptions
  ): Promise<PaginationResult<ContentEntry & LocaleResolvedEntry>> {
    // Fetch raw entries
    const result = await this.list(ctx, args);

    // Resolve locale for all entries
    const resolvedPage = this.resolveLocaleBatch(result.page, localeOptions);

    return {
      page: resolvedPage,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  }

  /**
   * Get a content entry by ID with automatic locale resolution.
   *
   * Fetches the entry and resolves all localized fields to the requested locale.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments
   * @param localeOptions - Locale resolution options
   * @returns The entry with resolved locale data, or null if not found
   *
   * @example
   * ```typescript
   * const post = await cms.contentEntries.getWithLocale(
   *   ctx,
   *   { id: entryId },
   *   {
   *     locale: "es-ES",
   *     fallbackChain: ["en-US"],
   *     defaultLocale: "en-US",
   *     fields: blogPostType.fields,
   *   }
   * );
   *
   * if (post) {
   *   console.log(post.data.title); // Resolved title
   * }
   * ```
   */
  async getWithLocale(
    ctx: ConvexContext,
    args: GetContentEntryArgs,
    localeOptions: ResolveLocaleContentOptions
  ): Promise<(ContentEntry & LocaleResolvedEntry) | null> {
    const entry = await this.get(ctx, args);
    if (!entry) return null;
    return this.resolveLocale(entry, localeOptions);
  }

  /**
   * Get a content entry by slug with automatic locale resolution.
   *
   * Fetches the entry by slug and resolves all localized fields to the requested locale.
   *
   * @param ctx - Convex query context
   * @param args - Get by slug arguments
   * @param localeOptions - Locale resolution options
   * @returns The entry with resolved locale data, or null if not found
   *
   * @example
   * ```typescript
   * const post = await cms.contentEntries.getBySlugWithLocale(
   *   ctx,
   *   {
   *     contentTypeName: "blog_post",
   *     slug: "hello-world",
   *   },
   *   {
   *     locale: "es-ES",
   *     fields: blogPostType.fields,
   *   }
   * );
   * ```
   */
  async getBySlugWithLocale(
    ctx: ConvexContext,
    args: GetContentEntryBySlugArgs,
    localeOptions: ResolveLocaleContentOptions
  ): Promise<(ContentEntry & LocaleResolvedEntry) | null> {
    const entry = await this.getBySlug(ctx, args);
    if (!entry) return null;
    return this.resolveLocale(entry, localeOptions);
  }

  // ===========================================================================
  // Duplicate Entry
  // ===========================================================================

  /**
   * Duplicate a content entry.
   *
   * Creates a copy of an existing content entry with a new unique slug.
   * The duplicate always starts as a draft, regardless of the source entry's status.
   * Media references are copied by default but can be cleared.
   *
   * @param ctx - Convex mutation context
   * @param args - Duplicate arguments
   * @returns The duplicated entry
   *
   * @example
   * ```typescript
   * // Simple duplication with auto-generated slug
   * const copy = await cms.contentEntries.duplicate(ctx, {
   *   sourceEntryId: originalPost._id,
   *   createdBy: currentUserId,
   * });
   *
   * // Duplicate with custom slug
   * const copy = await cms.contentEntries.duplicate(ctx, {
   *   sourceEntryId: templateId,
   *   slug: "new-post-from-template",
   *   createdBy: currentUserId,
   * });
   *
   * // Duplicate without media references (for a fresh start)
   * const copy = await cms.contentEntries.duplicate(ctx, {
   *   sourceEntryId: originalPost._id,
   *   copyMediaReferences: false,
   *   createdBy: currentUserId,
   * });
   * ```
   */
  async duplicate(
    ctx: ConvexContext,
    args: DuplicateEntryArgs
  ): Promise<ContentEntry> {
    // Authorization check - duplicating is similar to create
    await this.authorize(ctx, "contentEntries.create", args.createdBy);
    // Rate limit check
    await this.rateLimit(ctx, "contentEntries.create", args.createdBy);
    return ctx.runMutation(this.api.contentEntryMutations.duplicateEntry, args);
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  /**
   * Publish multiple content entries in a single transaction.
   *
   * This is more efficient than publishing entries one by one. Each entry that
   * is already published will be skipped (idempotent behavior). Deleted or
   * archived entries will fail with an error message.
   *
   * @param ctx - Convex mutation context
   * @param args - Bulk publish arguments
   * @returns Bulk operation result with success/failure details for each entry
   *
   * @example
   * ```typescript
   * const result = await cms.contentEntries.bulkPublish(ctx, {
   *   ids: [entry1._id, entry2._id, entry3._id],
   *   changeDescription: "Publishing launch content",
   *   updatedBy: currentUserId,
   * });
   * console.log(`Published ${result.succeeded} of ${result.total} entries`);
   * if (result.failed > 0) {
   *   result.results.filter(r => !r.success).forEach(r => {
   *     console.error(`Failed to publish ${r.id}: ${r.error}`);
   *   });
   * }
   * ```
   */
  async bulkPublish(
    ctx: ConvexContext,
    args: BulkPublishArgs
  ): Promise<BulkOperationResult> {
    // Authorization check for each entry (bulk check)
    await this.authorize(ctx, "contentEntries.publish", args.updatedBy);
    // Rate limit check
    await this.rateLimit(ctx, "contentEntries.publish", args.updatedBy);
    return ctx.runMutation(this.api.bulkOperations.bulkPublish, args);
  }

  /**
   * Unpublish multiple content entries in a single transaction.
   *
   * Reverts published entries to draft status. Non-published entries are
   * skipped (idempotent behavior).
   *
   * @param ctx - Convex mutation context
   * @param args - Bulk unpublish arguments
   * @returns Bulk operation result with success/failure details for each entry
   *
   * @example
   * ```typescript
   * const result = await cms.contentEntries.bulkUnpublish(ctx, {
   *   ids: [entry1._id, entry2._id],
   *   updatedBy: currentUserId,
   * });
   * ```
   */
  async bulkUnpublish(
    ctx: ConvexContext,
    args: BulkUnpublishArgs
  ): Promise<BulkOperationResult> {
    // Authorization check
    await this.authorize(ctx, "contentEntries.unpublish", args.updatedBy);
    // Rate limit check
    await this.rateLimit(ctx, "contentEntries.unpublish", args.updatedBy);
    return ctx.runMutation(this.api.bulkOperations.bulkUnpublish, args);
  }

  /**
   * Delete multiple content entries in a single transaction.
   *
   * By default, performs soft delete (entries can be restored later).
   * When hardDelete is true, permanently removes entries and all their versions.
   *
   * @param ctx - Convex mutation context
   * @param args - Bulk delete arguments
   * @returns Bulk operation result with success/failure details for each entry
   *
   * @example
   * ```typescript
   * // Soft delete (default)
   * const result = await cms.contentEntries.bulkDelete(ctx, {
   *   ids: [entry1._id, entry2._id],
   *   deletedBy: currentUserId,
   * });
   *
   * // Hard delete (permanent)
   * const result = await cms.contentEntries.bulkDelete(ctx, {
   *   ids: [entry1._id, entry2._id],
   *   deletedBy: currentUserId,
   *   hardDelete: true,
   * });
   * ```
   */
  async bulkDelete(
    ctx: ConvexContext,
    args: BulkDeleteArgs
  ): Promise<BulkOperationResult> {
    // Authorization check
    await this.authorize(ctx, "contentEntries.delete", args.deletedBy);
    // Rate limit check
    await this.rateLimit(ctx, "contentEntries.delete", args.deletedBy);
    return ctx.runMutation(this.api.bulkOperations.bulkDelete, args);
  }

  /**
   * Update multiple content entries with the same changes in a single transaction.
   *
   * Applies the same data updates and/or status change to all specified entries.
   * Data is merged with existing data for each entry (partial updates).
   * Each entry is validated against its content type schema.
   *
   * @param ctx - Convex mutation context
   * @param args - Bulk update arguments
   * @returns Bulk operation result with success/failure details for each entry
   *
   * @example
   * ```typescript
   * // Update data for multiple entries
   * const result = await cms.contentEntries.bulkUpdate(ctx, {
   *   ids: [entry1._id, entry2._id, entry3._id],
   *   data: { featured: true, category: "news" },
   *   updatedBy: currentUserId,
   * });
   *
   * // Change status for multiple entries
   * const result = await cms.contentEntries.bulkUpdate(ctx, {
   *   ids: [entry1._id, entry2._id],
   *   status: "archived",
   *   updatedBy: currentUserId,
   * });
   * ```
   */
  async bulkUpdate(
    ctx: ConvexContext,
    args: BulkUpdateArgs
  ): Promise<BulkOperationResult> {
    // Authorization check
    await this.authorize(ctx, "contentEntries.update", args.updatedBy);
    // Rate limit check
    await this.rateLimit(ctx, "contentEntries.update", args.updatedBy);
    return ctx.runMutation(this.api.bulkOperations.bulkUpdate, args);
  }

  /**
   * Restore multiple soft-deleted content entries in a single transaction.
   *
   * Removes the deletedAt marker from entries, making them active again.
   * Only works for soft-deleted entries. Non-deleted entries are skipped
   * (idempotent behavior).
   *
   * @param ctx - Convex mutation context
   * @param args - Bulk restore arguments
   * @returns Bulk operation result with success/failure details for each entry
   *
   * @example
   * ```typescript
   * const result = await cms.contentEntries.bulkRestore(ctx, {
   *   ids: [deletedEntry1._id, deletedEntry2._id],
   *   restoredBy: currentUserId,
   * });
   * ```
   */
  async bulkRestore(
    ctx: ConvexContext,
    args: BulkRestoreArgs
  ): Promise<BulkOperationResult> {
    if (!this.config.features.softDelete) {
      throw new Error("Soft delete feature is not enabled");
    }
    // Authorization check
    await this.authorize(ctx, "contentEntries.restore", args.restoredBy);
    // Rate limit check
    await this.rateLimit(ctx, "contentEntries.restore", args.restoredBy);
    return ctx.runMutation(this.api.bulkOperations.bulkRestore, args);
  }
}

// =============================================================================
// Versions API Wrapper
// =============================================================================

/**
 * Wrapper for content version operations.
 *
 * Provides comprehensive version management including:
 * - Version history retrieval with pagination
 * - Getting specific versions by ID or number
 * - Version comparison and diff generation
 * - Rollback functionality
 * - Finding latest and published versions
 *
 * @example
 * ```typescript
 * // Get version history for an entry
 * const history = await cms.versions.getHistory(ctx, {
 *   entryId: entry._id,
 *   paginationOpts: { numItems: 10 },
 * });
 *
 * // Compare two versions
 * const diff = await cms.versions.compare(ctx, {
 *   entryId: entry._id,
 *   fromVersion: 1,
 *   toVersion: 5,
 * });
 *
 * // Rollback to a previous version
 * await cms.versions.rollback(ctx, {
 *   entryId: entry._id,
 *   versionNumber: 3,
 * });
 * ```
 */
export class VersionsApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: ResolvedComponentConfig,
    private readonly authHelper?: AuthorizationHelper,
    private readonly rateLimitHelper?: RateLimitHelper
  ) {}

  /**
   * Check if versioning feature is enabled.
   * @throws Error if versioning is not enabled
   */
  private ensureVersioningEnabled(): void {
    if (!this.config.features.versioning) {
      throw new Error("Versioning feature is not enabled");
    }
  }

  /**
   * Perform authorization check for version operations.
   * @param ctx - The Convex context (passed to authorization hooks for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   * @param resourceId - Optional resource ID (entry ID for version operations)
   * @throws AuthorizationNotConfiguredError if authorization is not configured and permissiveMode is false
   */
  private async authorize(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined,
    resourceId?: string
  ): Promise<void> {
    if (!this.authHelper) {
      if (this.config.permissiveMode) {
        console.warn(
          `[ConvexCMS] Authorization not configured for "${operation}". ` +
            "Operations are allowed in permissiveMode, but this should NOT be used in production."
        );
        return;
      }
      throw new AuthorizationNotConfiguredError(operation);
    }

    if (this.authHelper.skipRbac) {
      return;
    }

    if (!userId) {
      if (this.config.permissiveMode) {
        console.warn(
          `[ConvexCMS] Anonymous operation attempted for "${operation}".`
        );
        return;
      }
      throw new AuthorizationNotConfiguredError(
        `${operation} (no userId provided - anonymous operations require permissiveMode)`
      );
    }

    const role = await this.authHelper.getUserRole(ctx, userId);

    await this.authHelper.requireAuthorization(ctx, {
      operation,
      userId,
      role,
      resourceId,
    });
  }

  /**
   * Enforce rate limit for version operations.
   * @param ctx - The Convex context (for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   */
  private async rateLimit(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined
  ): Promise<void> {
    // Skip if no rate limit helper configured
    if (!this.rateLimitHelper) {
      return;
    }

    const role = userId ? await this.rateLimitHelper.getUserRole(ctx, userId) : null;

    await this.rateLimitHelper.requireRateLimit(operation, {
      userId,
      role,
    });
  }

  /**
   * List version history for a content entry (legacy format).
   *
   * @deprecated Use `getHistory` for improved pagination support
   * @param ctx - Convex query context
   * @param args - List arguments
   * @returns Paginated list of versions (legacy format)
   */
  async list(
    ctx: ConvexContext,
    args: ListVersionsArgs
  ): Promise<PaginatedResponse<ContentVersion>> {
    this.ensureVersioningEnabled();
    const result = await callQuery(ctx, this.api.contentEntries.getVersionHistory, {
      entryId: args.entryId,
      paginationOpts: {
        numItems: args.limit ?? 50,
        cursor: args.cursor ?? null,
      },
    });
    // Adapt result format for legacy PaginatedResponse
    if (!result) {
      return { items: [], cursor: undefined, hasMore: false };
    }
    return {
      items: result.page,
      cursor: result.continueCursor ?? undefined,
      hasMore: !result.isDone,
    };
  }

  /**
   * Get version history with standard Convex pagination.
   *
   * Returns versions in reverse chronological order (newest first).
   * Compatible with `usePaginatedQuery` React hook.
   *
   * @param ctx - Convex query context
   * @param args - History query arguments with pagination
   * @returns Paginated version history or null if entry not found
   *
   * @example
   * ```typescript
   * // Get first page of version history
   * const { page, continueCursor, isDone } = await cms.versions.getHistory(ctx, {
   *   entryId: entry._id,
   *   paginationOpts: { numItems: 10 },
   * });
   *
   * // Get next page
   * if (!isDone && continueCursor) {
   *   const nextPage = await cms.versions.getHistory(ctx, {
   *     entryId: entry._id,
   *     paginationOpts: { numItems: 10, cursor: continueCursor },
   *   });
   * }
   * ```
   */
  async getHistory(
    ctx: ConvexContext,
    args: GetVersionHistoryArgs
  ): Promise<PaginationResult<ContentVersion> | null> {
    this.ensureVersioningEnabled();
    return ctx.runQuery(this.api.contentEntries.getVersionHistory, args);
  }

  /**
   * Get a specific version by ID or version number.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments (entryId required, plus versionId or versionNumber)
   * @returns The version or null if not found
   *
   * @example
   * ```typescript
   * // Get by version number
   * const version = await cms.versions.get(ctx, {
   *   entryId: entry._id,
   *   versionNumber: 3,
   * });
   *
   * // Get by version ID
   * const version = await cms.versions.get(ctx, {
   *   entryId: entry._id,
   *   versionId: "abc123",
   * });
   * ```
   */
  async get(
    ctx: ConvexContext,
    args: GetVersionArgs
  ): Promise<ContentVersion | null> {
    this.ensureVersioningEnabled();
    return ctx.runQuery(this.api.contentEntries.getVersion, args);
  }

  /**
   * Get a version by its version number (convenience method).
   *
   * @param ctx - Convex query context
   * @param entryId - The content entry ID
   * @param versionNumber - The version number to retrieve
   * @returns The version or null if not found
   *
   * @example
   * ```typescript
   * const version3 = await cms.versions.getByNumber(ctx, entry._id, 3);
   * ```
   */
  async getByNumber(
    ctx: ConvexContext,
    entryId: string,
    versionNumber: number
  ): Promise<ContentVersion | null> {
    return this.get(ctx, { entryId, versionNumber });
  }

  /**
   * Get a version by its document ID (convenience method).
   *
   * @param ctx - Convex query context
   * @param entryId - The content entry ID
   * @param versionId - The version document ID
   * @returns The version or null if not found
   *
   * @example
   * ```typescript
   * const version = await cms.versions.getById(ctx, entry._id, versionDocId);
   * ```
   */
  async getById(
    ctx: ConvexContext,
    entryId: string,
    versionId: string
  ): Promise<ContentVersion | null> {
    return this.get(ctx, { entryId, versionId });
  }

  /**
   * Get the latest (most recent) version snapshot for an entry.
   *
   * @param ctx - Convex query context
   * @param entryId - The content entry ID
   * @returns The latest version or null if no versions exist
   *
   * @example
   * ```typescript
   * const latest = await cms.versions.getLatest(ctx, entry._id);
   * console.log(`Current version: ${latest?.versionNumber}`);
   * ```
   */
  async getLatest(
    ctx: ConvexContext,
    entryId: string
  ): Promise<ContentVersion | null> {
    this.ensureVersioningEnabled();
    const history = await this.getHistory(ctx, {
      entryId,
      paginationOpts: { numItems: 1, cursor: null },
    });
    return history?.page[0] ?? null;
  }

  /**
   * Get the latest published version for an entry.
   *
   * Searches through version history to find the most recent version
   * that was published (wasPublished = true).
   *
   * @param ctx - Convex query context
   * @param entryId - The content entry ID
   * @returns The latest published version or null if none published
   *
   * @example
   * ```typescript
   * const published = await cms.versions.getLatestPublished(ctx, entry._id);
   * if (published) {
   *   console.log(`Published at: ${new Date(published.publishedAt!)}`);
   * }
   * ```
   */
  async getLatestPublished(
    ctx: ConvexContext,
    entryId: string
  ): Promise<ContentVersion | null> {
    this.ensureVersioningEnabled();

    // Iterate through pages to find the first published version
    let cursor: string | null = null;
    let isDone = false;

    while (!isDone) {
      const history = await this.getHistory(ctx, {
        entryId,
        paginationOpts: { numItems: 50, cursor },
      });

      if (!history) return null;

      const publishedVersion = history.page.find((v) => v.wasPublished);
      if (publishedVersion) {
        return publishedVersion;
      }

      cursor = history.continueCursor;
      isDone = history.isDone;
    }

    return null;
  }

  /**
   * Get all published versions for an entry.
   *
   * @param ctx - Convex query context
   * @param entryId - The content entry ID
   * @param limit - Maximum number of published versions to return (default: 10)
   * @returns Array of published versions (newest first)
   *
   * @example
   * ```typescript
   * const publishedVersions = await cms.versions.getPublishedHistory(ctx, entry._id, 5);
   * console.log(`Found ${publishedVersions.length} published versions`);
   * ```
   */
  async getPublishedHistory(
    ctx: ConvexContext,
    entryId: string,
    limit: number = 10
  ): Promise<ContentVersion[]> {
    this.ensureVersioningEnabled();

    const published: ContentVersion[] = [];
    let cursor: string | null = null;
    let isDone = false;

    while (!isDone && published.length < limit) {
      const history = await this.getHistory(ctx, {
        entryId,
        paginationOpts: { numItems: 50, cursor },
      });

      if (!history) break;

      for (const version of history.page) {
        if (version.wasPublished) {
          published.push(version);
          if (published.length >= limit) break;
        }
      }

      cursor = history.continueCursor;
      isDone = history.isDone;
    }

    return published;
  }

  /**
   * Compare two versions and generate a detailed diff.
   *
   * Analyzes field-level changes between two versions, identifying:
   * - Added fields (present in toVersion but not fromVersion)
   * - Removed fields (present in fromVersion but not toVersion)
   * - Modified fields (present in both but with different values)
   *
   * @param ctx - Convex query context
   * @param args - Comparison arguments
   * @returns Detailed version comparison or null if versions not found
   *
   * @example
   * ```typescript
   * const diff = await cms.versions.compare(ctx, {
   *   entryId: entry._id,
   *   fromVersion: 1,  // Can be version number or ID
   *   toVersion: 5,
   * });
   *
   * if (diff) {
   *   console.log(`${diff.summary.totalChanges} changes detected`);
   *   for (const change of diff.changes) {
   *     console.log(`${change.field}: ${change.changeType}`);
   *   }
   * }
   * ```
   */
  async compare(
    ctx: ConvexContext,
    args: CompareVersionsArgs
  ): Promise<VersionComparison | null> {
    this.ensureVersioningEnabled();

    // Resolve fromVersion
    const fromVersion = await this.resolveVersion(ctx, args.entryId, args.fromVersion);
    if (!fromVersion) return null;

    // Resolve toVersion
    const toVersion = await this.resolveVersion(ctx, args.entryId, args.toVersion);
    if (!toVersion) return null;

    // Generate the comparison
    return this.generateComparison(fromVersion, toVersion);
  }

  /**
   * Compare the current entry state with a specific version.
   *
   * Useful for seeing what has changed since a particular point in time.
   *
   * @param ctx - Convex query context
   * @param entryId - The content entry ID
   * @param versionNumber - The version number to compare against
   * @returns Comparison between the version and current state, or null
   *
   * @example
   * ```typescript
   * // See what changed since version 3
   * const diff = await cms.versions.compareWithCurrent(ctx, entry._id, 3);
   * ```
   */
  async compareWithCurrent(
    ctx: ConvexContext,
    entryId: string,
    versionNumber: number
  ): Promise<VersionComparison | null> {
    this.ensureVersioningEnabled();

    const fromVersion = await this.getByNumber(ctx, entryId, versionNumber);
    if (!fromVersion) return null;

    const latest = await this.getLatest(ctx, entryId);
    if (!latest) return null;

    return this.generateComparison(fromVersion, latest);
  }

  /**
   * Check if a specific version exists.
   *
   * @param ctx - Convex query context
   * @param entryId - The content entry ID
   * @param versionNumber - The version number to check
   * @returns true if the version exists
   *
   * @example
   * ```typescript
   * if (await cms.versions.exists(ctx, entry._id, 5)) {
   *   // Version 5 exists
   * }
   * ```
   */
  async exists(
    ctx: ConvexContext,
    entryId: string,
    versionNumber: number
  ): Promise<boolean> {
    const version = await this.getByNumber(ctx, entryId, versionNumber);
    return version !== null;
  }

  /**
   * Count total number of versions for an entry.
   *
   * @param ctx - Convex query context
   * @param entryId - The content entry ID
   * @returns Total number of version snapshots
   *
   * @example
   * ```typescript
   * const count = await cms.versions.count(ctx, entry._id);
   * console.log(`Entry has ${count} versions`);
   * ```
   */
  async count(
    ctx: ConvexContext,
    entryId: string
  ): Promise<number> {
    this.ensureVersioningEnabled();

    let total = 0;
    let cursor: string | null = null;
    let isDone = false;

    while (!isDone) {
      const history = await this.getHistory(ctx, {
        entryId,
        paginationOpts: { numItems: 100, cursor },
      });

      if (!history) break;

      total += history.page.length;
      cursor = history.continueCursor;
      isDone = history.isDone;
    }

    return total;
  }

  /**
   * Rollback a content entry to a previous version.
   *
   * This is a non-destructive operation that:
   * 1. Creates a snapshot of the current state (for undo capability)
   * 2. Restores data and slug from the target version
   * 3. Increments the version number
   * 4. Creates a new snapshot documenting the rollback
   *
   * The entry's status, scheduled publish time, and publishing timestamps
   * are preserved (not restored from the target version).
   *
   * @param ctx - Convex mutation context
   * @param args - Rollback arguments
   * @returns The updated entry with rolled back content
   *
   * @example
   * ```typescript
   * // Rollback to version 3
   * const entry = await cms.versions.rollback(ctx, {
   *   entryId: entry._id,
   *   versionNumber: 3,
   *   updatedBy: currentUserId,
   * });
   *
   * // The entry is now at a new version number (e.g., 7)
   * // but with content from version 3
   * console.log(`Rolled back, now at version ${entry.version}`);
   * ```
   */
  async rollback(
    ctx: ConvexContext,
    args: RollbackVersionArgs
  ): Promise<ContentEntry> {
    this.ensureVersioningEnabled();
    // Authorization check - versions.rollback
    await this.authorize(ctx, "versions.rollback", args.updatedBy, args.entryId);
    // Rate limit check - versions.rollback
    await this.rateLimit(ctx, "versions.rollback", args.updatedBy);
    return ctx.runMutation(this.api.versionMutations.rollbackVersion, args);
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Resolve a version reference (number or ID) to a ContentVersion.
   */
  private async resolveVersion(
    ctx: ConvexContext,
    entryId: string,
    versionRef: number | string
  ): Promise<ContentVersion | null> {
    if (typeof versionRef === "number") {
      return this.getByNumber(ctx, entryId, versionRef);
    }
    return this.getById(ctx, entryId, versionRef);
  }

  /**
   * Generate a detailed comparison between two versions.
   */
  private generateComparison(
    fromVersion: ContentVersion,
    toVersion: ContentVersion
  ): VersionComparison {
    const changes: FieldChange[] = [];
    const fromData = fromVersion.data;
    const toData = toVersion.data;

    // Get all unique field names from both versions
    const allFields = new Set([
      ...Object.keys(fromData),
      ...Object.keys(toData),
    ]);

    let fieldsAdded = 0;
    let fieldsRemoved = 0;
    let fieldsModified = 0;

    for (const field of allFields) {
      const oldValue = fromData[field];
      const newValue = toData[field];
      const inOld = field in fromData;
      const inNew = field in toData;

      let changeType: FieldChangeType;

      if (!inOld && inNew) {
        changeType = "added";
        fieldsAdded++;
      } else if (inOld && !inNew) {
        changeType = "removed";
        fieldsRemoved++;
      } else if (!this.deepEqual(oldValue, newValue)) {
        changeType = "modified";
        fieldsModified++;
      } else {
        changeType = "unchanged";
      }

      // Only include changes (skip unchanged fields)
      if (changeType !== "unchanged") {
        changes.push({
          field,
          changeType,
          oldValue: inOld ? oldValue : undefined,
          newValue: inNew ? newValue : undefined,
        });
      }
    }

    return {
      fromVersion,
      toVersion,
      changes,
      slugChanged: fromVersion.slug !== toVersion.slug,
      statusChanged: fromVersion.status !== toVersion.status,
      summary: {
        fieldsAdded,
        fieldsRemoved,
        fieldsModified,
        totalChanges: fieldsAdded + fieldsRemoved + fieldsModified,
      },
    };
  }

  /**
   * Deep equality check for comparing field values.
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === "object") {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => this.deepEqual(item, b[index]));
      }

      if (!Array.isArray(a) && !Array.isArray(b)) {
        const aObj = a as Record<string, unknown>;
        const bObj = b as Record<string, unknown>;
        const aKeys = Object.keys(aObj);
        const bKeys = Object.keys(bObj);

        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every((key) => this.deepEqual(aObj[key], bObj[key]));
      }
    }

    return false;
  }
}

// =============================================================================
// Media Assets API Wrapper
// =============================================================================

/**
 * Wrapper for media asset operations.
 */
export class MediaAssetsApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: ResolvedComponentConfig,
    private readonly authHelper?: AuthorizationHelper,
    private readonly rateLimitHelper?: RateLimitHelper
  ) {}

  /**
   * Perform authorization check for media asset operations.
   * @param ctx - The Convex context (passed to authorization hooks for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   * @param resourceId - Optional resource ID (for update/delete operations)
   * @param resourceOwnerId - Optional owner ID for ownership-based permissions
   * @throws AuthorizationNotConfiguredError if authorization is not configured and permissiveMode is false
   */
  private async authorize(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined,
    resourceId?: string,
    resourceOwnerId?: string
  ): Promise<void> {
    if (!this.authHelper) {
      if (this.config.permissiveMode) {
        console.warn(
          `[ConvexCMS] Authorization not configured for "${operation}". ` +
            "Operations are allowed in permissiveMode, but this should NOT be used in production."
        );
        return;
      }
      throw new AuthorizationNotConfiguredError(operation);
    }

    if (this.authHelper.skipRbac) {
      return;
    }

    if (!userId) {
      if (this.config.permissiveMode) {
        console.warn(
          `[ConvexCMS] Anonymous operation attempted for "${operation}".`
        );
        return;
      }
      throw new AuthorizationNotConfiguredError(
        `${operation} (no userId provided - anonymous operations require permissiveMode)`
      );
    }

    const role = await this.authHelper.getUserRole(ctx, userId);

    await this.authHelper.requireAuthorization(ctx, {
      operation,
      userId,
      role,
      resourceId,
      resourceOwnerId,
    });
  }

  /**
   * Enforce rate limit for media asset operations.
   * @param ctx - The Convex context (for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   */
  private async rateLimit(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined
  ): Promise<void> {
    // Skip if no rate limit helper configured
    if (!this.rateLimitHelper) {
      return;
    }

    const role = userId ? await this.rateLimitHelper.getUserRole(ctx, userId) : null;

    await this.rateLimitHelper.requireRateLimit(operation, {
      userId,
      role,
    });
  }

  /**
   * Create a new media asset record.
   *
   * @param ctx - Convex mutation context
   * @param args - Asset creation arguments
   * @returns The created asset
   *
   * @example
   * ```typescript
   * // After uploading to Convex storage
   * const asset = await cms.mediaAssets.create(ctx, {
   *   storageId: storageId,
   *   filename: "photo.jpg",
   *   mimeType: "image/jpeg",
   *   size: 102400,
   *   type: "image",
   *   width: 1920,
   *   height: 1080,
   * });
   * ```
   */
  async create(
    ctx: ConvexContext,
    args: CreateMediaAssetArgs
  ): Promise<MediaAsset> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    // Authorization check - mediaAssets.create
    await this.authorize(ctx, "mediaAssets.create", args.createdBy);
    // Rate limit check - mediaAssets.create (media uploads are high-frequency operations)
    await this.rateLimit(ctx, "mediaAssets.create", args.createdBy);
    // Validate file size
    if (args.size > this.config.maxMediaFileSize) {
      throw new Error(
        `File size ${args.size} exceeds maximum allowed size of ${this.config.maxMediaFileSize} bytes`
      );
    }
    return ctx.runMutation(this.api.mediaAssetMutations.createMediaAsset, args);
  }

  /**
   * Update media asset metadata.
   *
   * @param ctx - Convex mutation context
   * @param args - Asset update arguments
   * @returns The updated asset
   */
  async update(
    ctx: ConvexContext,
    args: UpdateMediaAssetArgs
  ): Promise<MediaAsset> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }

    // Fetch asset for ownership-based authorization
    const asset = await ctx.runQuery(this.api.mediaAssets.get, { id: args.id });
    if (!asset) {
      throw new Error(`Media asset not found: ${args.id}`);
    }

    // Authorization check - mediaAssets.update (with ownership info)
    await this.authorize(ctx, "mediaAssets.update", args.updatedBy, args.id, asset.createdBy);
    // Rate limit check - mediaAssets.update
    await this.rateLimit(ctx, "mediaAssets.update", args.updatedBy);
    return ctx.runMutation(this.api.mediaAssetMutations.updateMediaAsset, args);
  }

  /**
   * Soft delete a media asset.
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments
   * @returns The deleted asset
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteMediaAssetArgs
  ): Promise<MediaAsset> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }

    // Fetch asset for ownership-based authorization
    const asset = await ctx.runQuery(this.api.mediaAssets.get, { id: args.id });
    if (!asset) {
      throw new Error(`Media asset not found: ${args.id}`);
    }

    // Authorization check - mediaAssets.delete (with ownership info)
    await this.authorize(ctx, "mediaAssets.delete", args.deletedBy, args.id, asset.createdBy);
    // Rate limit check - mediaAssets.delete
    await this.rateLimit(ctx, "mediaAssets.delete", args.deletedBy);
    return ctx.runMutation(this.api.mediaAssetMutations.deleteMediaAsset, args);
  }

  /**
   * Get a media asset by ID.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments
   * @returns The asset or null if not found
   */
  async get(
    ctx: ConvexContext,
    args: GetMediaAssetArgs
  ): Promise<MediaAsset | null> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(this.api.mediaAssets.get, args);
  }

  /**
   * List media assets with optional filters.
   *
   * @param ctx - Convex query context
   * @param args - Query options
   * @returns Paginated list of assets
   */
  async list(
    ctx: ConvexContext,
    args: ListMediaAssetsArgs = {}
  ): Promise<PaginatedResponse<MediaAsset>> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    const result = await callQuery(ctx, this.api.mediaAssets.list, args);
    // Adapt from Convex pagination format to legacy PaginatedResponse
    return {
      items: result.page,
      cursor: result.continueCursor ?? undefined,
      hasMore: !result.isDone,
    };
  }

  /**
   * Generate a temporary upload URL for client-side file uploads.
   *
   * The upload flow works as follows:
   * 1. Call this method to get a temporary upload URL
   * 2. POST the file to the URL with Content-Type header set to the file's MIME type
   * 3. The response contains a `storageId` that references the uploaded file
   * 4. Call create() to save metadata and link the storageId
   *
   * @param ctx - Convex mutation context
   * @param args - Upload configuration options
   * @returns Upload URL and constraints
   *
   * @example
   * ```typescript
   * // Generate URL for image uploads
   * const { uploadUrl, expiresAt, maxFileSize } = await cms.mediaAssets.generateUploadUrl(ctx, {
   *   maxFileSize: 10 * 1024 * 1024, // 10 MB
   *   allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
   * });
   *
   * // Client-side upload:
   * const response = await fetch(uploadUrl, {
   *   method: "POST",
   *   headers: { "Content-Type": file.type },
   *   body: file,
   * });
   * const { storageId } = await response.json();
   *
   * // Then save metadata
   * const asset = await cms.mediaAssets.create(ctx, {
   *   storageId,
   *   filename: file.name,
   *   mimeType: file.type,
   *   size: file.size,
   *   type: "image",
   * });
   * ```
   */
  async generateUploadUrl(
    ctx: ConvexContext,
    args: GenerateUploadUrlArgs = {}
  ): Promise<GenerateUploadUrlResult> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    // Rate limit check - mediaAssets.create (upload URL generation precedes asset creation)
    await this.rateLimit(ctx, "mediaAssets.create", args.requestedBy);
    return ctx.runMutation(
      this.api.mediaUploadMutations.generateUploadUrl,
      args
    );
  }

  /**
   * Restore a soft-deleted media asset.
   *
   * @param ctx - Convex mutation context
   * @param args - Restore arguments
   * @returns The restored asset
   *
   * @example
   * ```typescript
   * // Restore a previously deleted asset
   * const restoredAsset = await cms.mediaAssets.restore(ctx, {
   *   id: assetId,
   * });
   * ```
   */
  async restore(
    ctx: ConvexContext,
    args: RestoreMediaAssetArgs
  ): Promise<MediaAsset> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(
      this.api.mediaAssetMutations.restoreMediaAsset,
      args
    );
  }

  /**
   * Find content entries that reference a media asset.
   *
   * Useful for checking references before deletion or for understanding asset usage.
   *
   * @param ctx - Convex query context
   * @param args - Query arguments
   * @returns Array of references with entry and field information
   *
   * @example
   * ```typescript
   * // Check if asset is used before deleting
   * const references = await cms.mediaAssets.findReferences(ctx, {
   *   id: assetId,
   * });
   *
   * if (references.length > 0) {
   *   console.log(`Asset is used in ${references.length} entries`);
   *   // Maybe show a warning to the user
   * }
   * ```
   */
  async findReferences(
    ctx: ConvexContext,
    args: FindMediaAssetReferencesArgs
  ): Promise<MediaAssetReference[]> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    // Map the wrapper's args structure to the generated API's expected structure
    return callQuery(
      ctx,
      this.api.mediaAssetMutations.findMediaAssetReferences,
      { mediaAssetId: args.id, limit: args.limit }
    );
  }
}

// =============================================================================
// Media Folders API Wrapper
// =============================================================================

/**
 * Wrapper for media folder operations.
 */
export class MediaFoldersApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: ResolvedComponentConfig,
    private readonly authHelper?: AuthorizationHelper,
    private readonly rateLimitHelper?: RateLimitHelper
  ) {}

  /**
   * Perform authorization check for media folder operations.
   * @param ctx - The Convex context (passed to authorization hooks for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   * @param resourceId - Optional resource ID (for update/delete operations)
   * @param resourceOwnerId - Optional owner ID for ownership-based permissions
   */
  private async authorize(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined,
    resourceId?: string,
    resourceOwnerId?: string
  ): Promise<void> {
    if (!this.authHelper) {
      if (this.config.permissiveMode) {
        console.warn(
          `[ConvexCMS] Authorization not configured for "${operation}". ` +
            "Operations are allowed in permissiveMode, but this should NOT be used in production."
        );
        return;
      }
      throw new AuthorizationNotConfiguredError(operation);
    }

    if (this.authHelper.skipRbac) {
      return;
    }

    if (!userId) {
      if (this.config.permissiveMode) {
        console.warn(
          `[ConvexCMS] Anonymous operation attempted for "${operation}".`
        );
        return;
      }
      throw new AuthorizationNotConfiguredError(
        `${operation} (no userId provided - anonymous operations require permissiveMode)`
      );
    }

    const role = await this.authHelper.getUserRole(ctx, userId);

    await this.authHelper.requireAuthorization(ctx, {
      operation,
      userId,
      role,
      resourceId,
      resourceOwnerId,
    });
  }

  /**
   * Enforce rate limit for media folder operations.
   * @param ctx - The Convex context (for database access)
   * @param operation - The CMS operation being performed
   * @param userId - The user performing the operation
   */
  private async rateLimit(
    ctx: ConvexContext,
    operation: CmsOperation,
    userId: string | undefined
  ): Promise<void> {
    // Skip if no rate limit helper configured
    if (!this.rateLimitHelper) {
      return;
    }

    const role = userId ? await this.rateLimitHelper.getUserRole(ctx, userId) : null;

    await this.rateLimitHelper.requireRateLimit(operation, {
      userId,
      role,
    });
  }

  /**
   * Create a new media folder.
   *
   * @param ctx - Convex mutation context
   * @param args - Folder creation arguments
   * @returns The created folder
   */
  async create(
    ctx: ConvexContext,
    args: CreateMediaFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    // Authorization check - mediaFolders.create
    await this.authorize(ctx, "mediaFolders.create", args.createdBy);
    // Rate limit check - mediaFolders.create
    await this.rateLimit(ctx, "mediaFolders.create", args.createdBy);
    return ctx.runMutation(this.api.mediaFolderMutations.createMediaFolder, args);
  }

  /**
   * Update a media folder.
   *
   * @param ctx - Convex mutation context
   * @param args - Folder update arguments
   * @returns The updated folder
   */
  async update(
    ctx: ConvexContext,
    args: UpdateMediaFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }

    // Fetch folder for ownership-based authorization
    const folder = await ctx.runQuery(this.api.mediaFolderMutations.getMediaFolder, { id: args.id });
    if (!folder) {
      throw new Error(`Media folder not found: ${args.id}`);
    }

    // Authorization check - mediaFolders.update (with ownership info)
    await this.authorize(ctx, "mediaFolders.update", args.updatedBy, args.id, folder.createdBy);
    // Rate limit check - mediaFolders.update
    await this.rateLimit(ctx, "mediaFolders.update", args.updatedBy);
    return ctx.runMutation(this.api.mediaFolderMutations.updateMediaFolder, args);
  }

  /**
   * Soft delete a media folder.
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments
   * @returns The deleted folder
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteMediaFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }

    // Fetch folder for ownership-based authorization
    const folder = await ctx.runQuery(this.api.mediaFolderMutations.getMediaFolder, { id: args.id });
    if (!folder) {
      throw new Error(`Media folder not found: ${args.id}`);
    }

    // Authorization check - mediaFolders.delete (with ownership info)
    await this.authorize(ctx, "mediaFolders.delete", args.deletedBy, args.id, folder.createdBy);
    // Rate limit check - mediaFolders.delete
    await this.rateLimit(ctx, "mediaFolders.delete", args.deletedBy);
    return ctx.runMutation(this.api.mediaFolderMutations.deleteMediaFolder, args);
  }

  /**
   * Get a media folder by ID.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments
   * @returns The folder or null if not found
   */
  async get(
    ctx: ConvexContext,
    args: GetMediaFolderArgs
  ): Promise<MediaFolder | null> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(this.api.mediaFolderMutations.getMediaFolder, args);
  }

  /**
   * List media folders.
   *
   * @param ctx - Convex query context
   * @param args - Optional filter arguments
   * @returns Array of folders
   */
  async list(
    ctx: ConvexContext,
    args: ListMediaFoldersArgs = {}
  ): Promise<MediaFolder[]> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(this.api.mediaFolderMutations.listMediaFolders, args);
  }

  /**
   * Move a folder to a new parent.
   *
   * @param ctx - Convex mutation context
   * @param args - Move arguments
   * @returns The moved folder with updated path
   */
  async move(
    ctx: ConvexContext,
    args: MoveFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }

    // Fetch folder for ownership-based authorization
    const folder = await ctx.runQuery(this.api.mediaFolderMutations.getMediaFolder, { id: args.id });
    if (!folder) {
      throw new Error(`Media folder not found: ${args.id}`);
    }

    // Authorization check - mediaFolders.move (with ownership info)
    await this.authorize(ctx, "mediaFolders.move", args.updatedBy, args.id, folder.createdBy);
    // Rate limit check - mediaFolders.move
    await this.rateLimit(ctx, "mediaFolders.move", args.updatedBy);
    return ctx.runMutation(this.api.mediaFolderMutations.moveMediaFolder, args);
  }

  /**
   * Restore a soft-deleted media folder.
   *
   * @param ctx - Convex mutation context
   * @param args - Restore arguments
   * @returns The restored folder
   *
   * @example
   * ```typescript
   * // Restore a folder and all its contents
   * const restoredFolder = await cms.mediaFolders.restore(ctx, {
   *   id: folderId,
   *   recursive: true,
   * });
   * ```
   */
  async restore(
    ctx: ConvexContext,
    args: RestoreMediaFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(
      this.api.mediaFolderMutations.restoreMediaFolder,
      args
    );
  }

  /**
   * Get a folder by its path.
   *
   * @param ctx - Convex query context
   * @param args - Query arguments with path
   * @returns The folder or null if not found
   *
   * @example
   * ```typescript
   * // Find folder by path
   * const folder = await cms.mediaFolders.getByPath(ctx, {
   *   path: "/Images/Blog/2024",
   * });
   * ```
   */
  async getByPath(
    ctx: ConvexContext,
    args: GetMediaFolderByPathArgs
  ): Promise<MediaFolder | null> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(
      this.api.mediaFolderMutations.getMediaFolderByPath,
      args
    );
  }

  /**
   * Get the entire folder tree as a flat list sorted by path.
   *
   * Useful for building folder navigation or selectors.
   *
   * @param ctx - Convex query context
   * @param args - Optional filter arguments
   * @returns Array of all folders sorted hierarchically by path
   *
   * @example
   * ```typescript
   * // Get all folders for a tree view
   * const folders = await cms.mediaFolders.getTree(ctx, {});
   *
   * // Build a nested structure
   * const rootFolders = folders.filter(f => !f.parentId);
   * ```
   */
  async getTree(
    ctx: ConvexContext,
    args: GetFolderTreeArgs = {}
  ): Promise<MediaFolder[]> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(
      this.api.mediaFolderMutations.getFolderTree,
      args
    );
  }
}

// =============================================================================
// Media Variants API Wrapper
// =============================================================================

/**
 * Wrapper for media variant operations.
 *
 * Media variants are optimized versions of media assets (thumbnails, responsive
 * sizes, format conversions). This API provides methods for creating, listing,
 * and managing variants.
 *
 * @example
 * ```typescript
 * // Get all variants for an asset
 * const variants = await cms.mediaVariants.list(ctx, {
 *   assetId: assetId,
 *   status: "completed",
 * });
 *
 * // Get responsive srcset for an image
 * const srcset = await cms.mediaVariants.getResponsiveSrcset(ctx, {
 *   assetId: assetId,
 *   format: "webp",
 * });
 * // Use: <img src={srcset.src} srcset={srcset.srcset} sizes="100vw" />
 * ```
 */
export class MediaVariantsApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: ResolvedComponentConfig
  ) {}

  /**
   * Create a media variant after external processing.
   *
   * Use this when variant processing happens externally (e.g., in a serverless
   * function or image processing service) and you need to register the
   * completed variant.
   *
   * @param ctx - Convex mutation context
   * @param args - Variant creation arguments
   * @returns The created variant with URL
   *
   * @example
   * ```typescript
   * // After processing image externally and uploading result
   * const variant = await cms.mediaVariants.create(ctx, {
   *   assetId: assetId,
   *   storageId: processedStorageId,
   *   variantType: "responsive",
   *   width: 480,
   *   height: 320,
   *   format: "webp",
   *   mimeType: "image/webp",
   *   size: 25600,
   *   quality: 80,
   *   preset: "small",
   * });
   * ```
   */
  async create(
    ctx: ConvexContext,
    args: CreateMediaVariantArgs
  ): Promise<MediaVariantWithUrl> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(
      this.api.mediaVariantMutations.createMediaVariant,
      args
    );
  }

  /**
   * Request async generation of a variant.
   *
   * Creates a variant record with "pending" status. An external processing
   * system should pick up pending variants, process them, and update the status.
   *
   * @param ctx - Convex mutation context
   * @param args - Generation request arguments
   * @returns The pending variant
   */
  async requestGeneration(
    ctx: ConvexContext,
    args: RequestVariantGenerationArgs
  ): Promise<MediaVariant> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(
      this.api.mediaVariantMutations.requestVariantGeneration,
      args
    );
  }

  /**
   * Get a variant by ID.
   *
   * @param ctx - Convex query context
   * @param args - Query arguments
   * @returns The variant with URL or null
   */
  async get(
    ctx: ConvexContext,
    args: { id: string; includeDeleted?: boolean }
  ): Promise<MediaVariantWithUrl | null> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(
      this.api.mediaVariants.get,
      args
    );
  }

  /**
   * List variants for an asset.
   *
   * @param ctx - Convex query context
   * @param args - Query arguments with filters
   * @returns Array of variants with URLs
   *
   * @example
   * ```typescript
   * // Get all completed responsive variants
   * const variants = await cms.mediaVariants.list(ctx, {
   *   assetId: assetId,
   *   variantType: "responsive",
   *   status: "completed",
   * });
   * ```
   */
  async list(
    ctx: ConvexContext,
    args: ListMediaVariantsArgs
  ): Promise<MediaVariantWithUrl[]> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(
      this.api.mediaVariants.list,
      args
    );
  }

  /**
   * Find the best matching variant for target dimensions.
   *
   * @param ctx - Convex query context
   * @param args - Target size and preferences
   * @returns Best matching variant or null
   *
   * @example
   * ```typescript
   * // Get best variant for 400px wide container
   * const variant = await cms.mediaVariants.getBestVariant(ctx, {
   *   assetId: assetId,
   *   targetWidth: 400,
   *   preferredFormat: "webp",
   * });
   * ```
   */
  async getBestVariant(
    ctx: ConvexContext,
    args: GetBestVariantArgs
  ): Promise<(MediaVariantWithUrl & { isOriginal: boolean }) | null> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(
      this.api.mediaVariants.getBestVariant,
      args
    );
  }

  /**
   * Get responsive srcset data for HTML img/picture tags.
   *
   * @param ctx - Convex query context
   * @param args - Asset ID and optional format filter
   * @returns Srcset data for responsive images
   *
   * @example
   * ```typescript
   * const srcset = await cms.mediaVariants.getResponsiveSrcset(ctx, {
   *   assetId: assetId,
   *   format: "webp",
   * });
   *
   * // In React:
   * <img src={srcset.src} srcset={srcset.srcset} sizes="100vw" />
   * ```
   */
  async getResponsiveSrcset(
    ctx: ConvexContext,
    args: { assetId: string; format?: string }
  ): Promise<ResponsiveSrcsetResult> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(
      this.api.mediaVariants.getResponsiveSrcset,
      args
    );
  }

  /**
   * Get an asset with all its variants organized by type.
   *
   * @param ctx - Convex query context
   * @param args - Asset ID
   * @returns Asset with variants or null
   */
  async getAssetWithVariants(
    ctx: ConvexContext,
    args: { assetId: string }
  ): Promise<AssetWithVariants | null> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(
      this.api.mediaVariants.getAssetWithVariants,
      args
    );
  }

  /**
   * Get available variant presets.
   *
   * @param ctx - Convex query context
   * @returns Array of preset configurations
   */
  async getPresets(ctx: ConvexContext): Promise<VariantPreset[]> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(
      this.api.mediaVariants.getPresets,
      {}
    );
  }

  /**
   * Generate variants from preset configurations.
   *
   * Queues multiple variants for async processing.
   *
   * @param ctx - Convex mutation context
   * @param args - Asset ID and preset names
   * @returns Summary of created variant requests
   *
   * @example
   * ```typescript
   * // Generate standard responsive set
   * const result = await cms.mediaVariants.generateFromPresets(ctx, {
   *   assetId: assetId,
   *   presets: ["thumbnail", "small", "medium", "large"],
   * });
   * console.log(`Queued ${result.succeeded} variants`);
   * ```
   */
  async generateFromPresets(
    ctx: ConvexContext,
    args: GenerateFromPresetsArgs
  ): Promise<GenerateVariantsResult> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(
      this.api.mediaVariantMutations.generateFromPresets,
      args
    );
  }

  /**
   * Delete a variant.
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments
   * @returns The deleted variant
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteMediaVariantArgs
  ): Promise<MediaVariant> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(
      this.api.mediaVariantMutations.deleteMediaVariant,
      args
    );
  }

  /**
   * Delete all variants for an asset.
   *
   * @param ctx - Convex mutation context
   * @param args - Asset ID and delete options
   * @returns Summary of deleted variants
   */
  async deleteAllForAsset(
    ctx: ConvexContext,
    args: DeleteAssetVariantsArgs
  ): Promise<{ deleted: number; assetId: string }> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(
      this.api.mediaVariantMutations.deleteAssetVariants,
      args
    );
  }

  /**
   * Restore a soft-deleted variant.
   *
   * @param ctx - Convex mutation context
   * @param args - Variant ID to restore
   * @returns The restored variant
   */
  async restore(
    ctx: ConvexContext,
    args: { id: string; restoredBy?: string }
  ): Promise<MediaVariant> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(
      this.api.mediaVariantMutations.restoreMediaVariant,
      args
    );
  }
}

// =============================================================================
// Enhanced CMS Client
// =============================================================================

/**
 * Enhanced CMS client with typed method wrappers for all component operations.
 *
 * This client provides an ergonomic, type-safe API for interacting with the
 * Convex CMS component. All methods accept a Convex context and return
 * properly typed results.
 *
 * @example
 * ```typescript
 * import { createCmsClient } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * export const cms = createCmsClient(components.convexCms, {
 *   defaultLocale: "en-US",
 *   features: {
 *     versioning: true,
 *     localization: true,
 *   },
 * });
 *
 * // In a mutation:
 * export const createBlogPost = mutation({
 *   args: { title: v.string(), content: v.string() },
 *   handler: async (ctx, args) => {
 *     return await cms.contentEntries.create(ctx, {
 *       contentTypeId: "blog_post_type_id",
 *       data: { title: args.title, content: args.content },
 *     });
 *   },
 * });
 * ```
 */
/**
 * Options for permission checks.
 */
export interface PermissionCheckOptions {
  /**
   * Custom role definitions to check in addition to built-in roles.
   * Use this when you have defined custom roles beyond the defaults.
   */
  customRoles?: Record<string, RoleDefinition>;
}

/**
 * Result from checking user permissions.
 */
export interface UserPermissionResult {
  /**
   * Whether the user has the requested permission.
   */
  allowed: boolean;

  /**
   * The role that was resolved for the user.
   * Null if the getUserRole hook returned null.
   */
  role: string | null;

  /**
   * The permission that was checked.
   */
  permission: {
    resource: Resource;
    action: Action;
    scope?: OwnershipScope;
  };
}

export interface EnhancedCmsClient {
  /**
   * The resolved configuration for this client instance.
   */
  readonly config: ResolvedComponentConfig;

  /**
   * The underlying component API reference.
   */
  readonly api: TypedComponentApi;

  /**
   * Content type management operations.
   */
  readonly contentTypes: ContentTypesApi;

  /**
   * Content entry CRUD and workflow operations.
   */
  readonly contentEntries: ContentEntriesApi;

  /**
   * Content version history operations.
   */
  readonly versions: VersionsApi;

  /**
   * Media asset management operations.
   */
  readonly mediaAssets: MediaAssetsApi;

  /**
   * Media folder organization operations.
   */
  readonly mediaFolders: MediaFoldersApi;

  /**
   * Media variant operations (thumbnails, responsive sizes, format conversions).
   */
  readonly mediaVariants: MediaVariantsApi;

  /**
   * Check if a specific feature is enabled.
   * @param feature - The feature flag to check
   * @returns true if the feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean;

  /**
   * Check if a locale is supported by this configuration.
   * @param locale - The locale code to check
   * @returns true if the locale is in the supported locales list
   */
  isLocaleSupported(locale: LocaleCode): boolean;

  /**
   * Get the CMS role for a user.
   *
   * Uses the getUserRole hook configured in ComponentConfig to map
   * user IDs from your auth system to CMS roles.
   *
   * @param ctx - Convex context (passed to getUserRole hook for database access)
   * @param userId - The user ID to look up
   * @returns The role name or null if the user has no CMS role
   * @throws Error if no getUserRole hook is configured
   *
   * @example
   * ```typescript
   * const role = await cms.getUserRole(ctx, "user_123");
   * if (role === "admin") {
   *   // Allow admin-only operations
   * }
   * ```
   */
  getUserRole(ctx: ConvexContext, userId: string): Promise<GetUserRoleResult>;

  /**
   * Check if a user has a specific permission.
   *
   * This is a convenience method that combines getUserRole + hasPermission
   * into a single call. It first resolves the user's role using the
   * configured getUserRole hook, then checks if that role has the
   * requested permission.
   *
   * @param ctx - Convex context (passed to getUserRole hook for database access)
   * @param userId - The user ID to check
   * @param permission - The permission to check (resource + action + optional scope)
   * @param options - Optional configuration like custom roles
   * @returns UserPermissionResult with allowed status and resolved role
   * @throws Error if no getUserRole hook is configured
   *
   * @example
   * ```typescript
   * // Check if user can create content entries
   * const result = await cms.hasPermissionForUser(ctx, "user_123", {
   *   resource: "contentEntries",
   *   action: "create",
   * });
   *
   * if (!result.allowed) {
   *   throw new Error(`User with role ${result.role} cannot create content entries`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Check with ownership scope
   * const canUpdateOwn = await cms.hasPermissionForUser(ctx, "user_123", {
   *   resource: "contentEntries",
   *   action: "update",
   *   scope: "own",
   * });
   * ```
   */
  hasPermissionForUser(
    ctx: ConvexContext,
    userId: string,
    permission: { resource: Resource; action: Action; scope?: OwnershipScope },
    options?: PermissionCheckOptions
  ): Promise<UserPermissionResult>;

  /**
   * Check if the getUserRole hook is configured.
   *
   * Use this to conditionally enable RBAC features in your application.
   *
   * @returns true if a getUserRole hook is configured
   *
   * @example
   * ```typescript
   * if (cms.hasUserRoleHook()) {
   *   const allowed = await cms.hasPermissionForUser(userId, permission);
   *   if (!allowed.allowed) throw new Error("Unauthorized");
   * }
   * ```
   */
  hasUserRoleHook(): boolean;

  /**
   * Check if authorization hooks are configured.
   *
   * @returns true if any authorization hooks are configured
   */
  hasAuthorizationHooks(): boolean;

  /**
   * Execute authorization for a CMS operation.
   *
   * This method runs the full authorization chain including:
   * 1. beforeRbac hook (if configured)
   * 2. Built-in RBAC checks (unless skipRbac is true)
   * 3. afterRbac hook (if configured)
   * 4. Operation-specific hooks (if configured)
   * 5. onDeny hook for denied operations (if configured)
   *
   * Use this method to check authorization before performing operations,
   * especially when you need custom authorization logic beyond RBAC.
   *
   * @param context - The authorization context (operation, user, resource info)
   * @returns AuthorizationResult with allowed status and any modified data
   *
   * @example
   * ```typescript
   * // Check authorization before publishing
   * const authResult = await cms.authorize({
   *   operation: "contentEntries.publish",
   *   userId: currentUser,
   *   role: await cms.getUserRole(currentUser),
   *   resourceId: entryId,
   *   resourceOwnerId: entry.createdBy,
   *   contentTypeId: entry.contentTypeId,
   *   operationData: { id: entryId },
   * });
   *
   * if (!authResult.allowed) {
   *   throw new Error(authResult.reason ?? "Not authorized to publish");
   * }
   *
   * // Proceed with operation
   * await cms.contentEntries.publish(ctx, { id: entryId });
   * ```
   *
   * @example
   * ```typescript
   * // With modified data from hooks
   * const authResult = await cms.authorize({
   *   operation: "contentEntries.create",
   *   userId: currentUser,
   *   role: userRole,
   *   operationData: entryData,
   * });
   *
   * if (authResult.allowed && authResult.modifiedData) {
   *   // Use the modified data from hooks
   *   await cms.contentEntries.create(ctx, authResult.modifiedData);
   * }
   * ```
   */
  authorize(context: AuthorizationHookContext): Promise<AuthorizationResult>;

  /**
   * Execute authorization and throw if denied.
   *
   * Convenience method that calls `authorize()` and throws an UnauthorizedError
   * if the operation is not allowed.
   *
   * @param context - The authorization context
   * @throws UnauthorizedError if the operation is denied
   * @returns The authorization result (if allowed)
   *
   * @example
   * ```typescript
   * // Will throw if not authorized
   * await cms.requireAuthorization({
   *   operation: "contentEntries.delete",
   *   userId: currentUser,
   *   role: userRole,
   *   resourceId: entryId,
   *   resourceOwnerId: entry.createdBy,
   * });
   *
   * // Only reached if authorized
   * await cms.contentEntries.delete(ctx, { id: entryId });
   * ```
   */
  requireAuthorization(context: AuthorizationHookContext): Promise<AuthorizationResult>;

  // =============================================================================
  // Consolidated Locale API
  // =============================================================================

  /**
   * Consolidated locale API with simplified methods.
   *
   * @example
   * ```typescript
   * // Get locale configuration
   * const config = cms.locale.getConfig();
   *
   * // Get fallback chain for a locale
   * const chain = cms.locale.getFallbackChain("es-MX");
   *
   * // Resolve locale with full metadata
   * const resolved = cms.locale.resolve("es-MX");
   * ```
   */
  readonly locale: {
    /**
     * Get the full locale configuration.
     */
    getConfig(): LocaleFallbackConfig;

    /**
     * Get the fallback chain for a locale.
     */
    getFallbackChain(locale: LocaleCode): LocaleCode[];

    /**
     * Resolve a locale with full metadata.
     */
    resolve(locale: LocaleCode): ResolvedFallbackChain;
  };

  // =============================================================================
  // Locale Fallback Chain Methods (Legacy)
  // =============================================================================

  /**
   * Get the configured locale fallback configuration.
   *
   * Returns a LocaleFallbackConfig object that can be used with the
   * locale fallback chain utilities.
   *
   * @returns The locale fallback configuration derived from CMS config
   *
   * @example
   * ```typescript
   * const config = cms.getLocaleFallbackConfig();
   * // Use with locale resolution functions
   * const chain = resolveFallbackChain("es-MX", config);
   * ```
   */
  getLocaleFallbackConfig(): LocaleFallbackConfig;

  /**
   * Get the fallback chain for a specific locale.
   *
   * Returns an ordered array of locale codes to try when content is not
   * available in the requested locale. The chain is built from:
   * 1. Explicit fallback chains configured in `localeFallbackChains`
   * 2. Auto-generated hierarchy-based chains (if `autoGenerateLocaleFallbacks` is true)
   * 3. The default locale as final fallback
   *
   * @param locale - The locale to get the fallback chain for
   * @returns Array of fallback locale codes in priority order
   *
   * @example
   * ```typescript
   * // With configured fallback chains:
   * // localeFallbackChains: { "es-MX": ["es-ES", "en-US"] }
   *
   * const chain = cms.getLocaleFallbackChain("es-MX");
   * // Returns: ["es-ES", "en-US"]
   *
   * // For auto-generated chains (e.g., "fr-CA" not explicitly configured):
   * const chain = cms.getLocaleFallbackChain("fr-CA");
   * // Returns: ["fr", "en"] (assuming defaultLocale is "en")
   * ```
   */
  getLocaleFallbackChain(locale: LocaleCode): LocaleCode[];

  /**
   * Get the complete resolved fallback chain with metadata.
   *
   * Similar to `getLocaleFallbackChain`, but returns additional information
   * about how the chain was resolved (whether it was auto-generated, etc.)
   *
   * @param locale - The locale to resolve the fallback chain for
   * @returns ResolvedFallbackChain with chain and metadata
   *
   * @example
   * ```typescript
   * const resolved = cms.resolveLocaleFallbackChain("es-MX");
   * // Returns: {
   * //   requestedLocale: "es-MX",
   * //   fallbackChain: ["es-ES", "en-US"],
   * //   defaultLocale: "en-US",
   * //   isAutoGenerated: false
   * // }
   * ```
   */
  resolveLocaleFallbackChain(locale: LocaleCode): ResolvedFallbackChain;

  /**
   * Build LocaleResolutionOptions for use with locale resolution functions.
   *
   * Creates the options object needed by `getLocalizedValue` and
   * `resolveContentData` from the configured fallback chain for a locale.
   *
   * @param locale - The locale to build resolution options for
   * @returns LocaleResolutionOptions for use with locale resolution functions
   *
   * @example
   * ```typescript
   * import { getLocalizedValue, resolveContentData } from "@convex-cms/core";
   *
   * // Build options from configured fallback chain
   * const options = cms.buildLocaleResolutionOptions("es-MX");
   * // Returns: {
   * //   locale: "es-MX",
   * //   fallbackChain: ["es-ES", "en-US"],
   * //   defaultLocale: "en-US"
   * // }
   *
   * // Use with getLocalizedValue
   * const result = getLocalizedValue(localizedTitle, options);
   *
   * // Use with resolveContentData
   * const resolved = resolveContentData(entryData, {
   * ...options,
   *   fields: contentType.fields,
   * });
   * ```
   */
  buildLocaleResolutionOptions(locale: LocaleCode): LocaleResolutionOptions;

  /**
   * Parse a locale code into its BCP 47 components.
   *
   * @param locale - The locale code to parse (e.g., "en-US", "zh-Hans-CN")
   * @returns Parsed locale components, or null if invalid
   *
   * @example
   * ```typescript
   * cms.parseLocale("en-US");
   * // Returns: { language: "en", region: "US" }
   *
   * cms.parseLocale("zh-Hans-CN");
   * // Returns: { language: "zh", script: "Hans", region: "CN" }
   *
   * cms.parseLocale("invalid");
   * // Returns: null
   * ```
   */
  parseLocale(locale: LocaleCode): ParsedLocale | null;

  /**
   * Get the locale hierarchy (parent locales) for a locale.
   *
   * @param locale - The locale to get hierarchy for
   * @returns Array of parent locales from most specific to least
   *
   * @example
   * ```typescript
   * cms.getLocaleHierarchy("zh-Hans-CN");
   * // Returns: ["zh-Hans", "zh"]
   *
   * cms.getLocaleHierarchy("en-US");
   * // Returns: ["en"]
   *
   * cms.getLocaleHierarchy("en");
   * // Returns: []
   * ```
   */
  getLocaleHierarchy(locale: LocaleCode): LocaleCode[];

  // =============================================================================
  // Custom Roles Methods
  // =============================================================================

  /**
   * Get all configured custom roles.
   *
   * Returns a record of custom role definitions that were configured when
   * creating the CMS client. Does not include built-in roles.
   *
   * @returns Record of custom role name to definition
   *
   * @example
   * ```typescript
   * const customRoles = cms.getCustomRoles();
   * for (const [name, role] of Object.entries(customRoles)) {
   *   console.log(`${name}: ${role.displayName}`);
   * }
   * ```
   */
  getCustomRoles(): Record<string, import("./types.js").CustomRoleDefinition>;

  /**
   * Get a specific custom role by name.
   *
   * @param roleName - The name of the custom role to get
   * @returns The custom role definition, or undefined if not found
   *
   * @example
   * ```typescript
   * const blogAuthor = cms.getCustomRole("blog-author");
   * if (blogAuthor) {
   *   console.log(blogAuthor.displayName); // "Blog Author"
   * }
   * ```
   */
  getCustomRole(roleName: string): import("./types.js").CustomRoleDefinition | undefined;

  /**
   * Check if a custom role exists.
   *
   * @param roleName - The name of the role to check
   * @returns True if the role is a custom role (not built-in)
   *
   * @example
   * ```typescript
   * cms.isCustomRole("blog-author"); // true (if configured)
   * cms.isCustomRole("admin"); // false (built-in)
   * cms.isCustomRole("unknown"); // false
   * ```
   */
  isCustomRole(roleName: string): boolean;

  /**
   * Check if a user can perform an action on a specific content type.
   *
   * This is similar to `hasPermissionForUser` but additionally checks
   * content-type-specific permission restrictions that may be configured
   * on custom roles.
   *
   * @param userId - The user ID to check
   * @param permission - The permission to check
   * @param contentTypeName - The content type to check permissions for
   * @returns UserPermissionResult with allowed status
   *
   * @example
   * ```typescript
   * // Check if user can create blog posts (may be restricted by custom role)
   * const result = await cms.hasContentTypePermissionForUser(
   *   ctx,
   *   "user_123",
   *   { resource: "contentEntries", action: "create" },
   *   "blog_post"
   * );
   *
   * if (result.allowed) {
   *   // User can create blog posts
   * }
   * ```
   */
  hasContentTypePermissionForUser(
    ctx: ConvexContext,
    userId: string,
    permission: { resource: Resource; action: Action; scope?: OwnershipScope },
    contentTypeName: string
  ): Promise<UserPermissionResult>;

  /**
   * Get all content types a user can perform an action on.
   *
   * Returns an array of content type names that the user has permission to
   * perform the specified action on, based on their role's permissions.
   *
   * @param userId - The user ID to check
   * @param action - The action to check (e.g., "create", "update", "publish")
   * @returns Array of content type names, ["*"] if unrestricted, or [] if no permission
   *
   * @example
   * ```typescript
   * // Get content types the user can create
   * const types = await cms.getPermittedContentTypesForUser(ctx, "user_123", "create");
   *
   * if (types.includes("*")) {
   *   // User can create any content type
   * } else if (types.includes("blog_post")) {
   *   // User can create blog posts
   * }
   * ```
   */
  getPermittedContentTypesForUser(
    ctx: ConvexContext,
    userId: string,
    action: Action
  ): Promise<string[]>;

  /**
   * Get all roles (built-in and custom) merged together.
   *
   * Returns a record containing both the default built-in roles and
   * any custom roles configured on this client. Useful for UI rendering
   * or iterating over all available roles.
   *
   * @returns Record of all role names to definitions
   *
   * @example
   * ```typescript
   * const allRoles = cms.getAllRoles();
   * // Includes: admin, editor, author, viewer, blog-author, etc.
   *
   * // Render role selector
   * Object.entries(allRoles).map(([name, role]) => (
   *   <option key={name} value={name}>{role.displayName}</option>
   * ));
   * ```
   */
  getAllRoles(): Record<string, RoleDefinition | import("./types.js").CustomRoleDefinition>;

  // =============================================================================
  // Resource Ownership Methods
  // =============================================================================

  /**
   * Check if a user can perform an action on a specific resource, with ownership verification.
   *
   * This is the most comprehensive permission check method. It:
   * 1. Resolves the user's role via the getUserRole hook
   * 2. Checks if the role has the required permission
   * 3. For "own" scope permissions, verifies that the user owns the resource
   *
   * Use this when you need to check authorization for a specific resource that may
   * have ownership-based restrictions (e.g., "can this author update THIS entry?").
   *
   * @param userId - The user ID performing the action
   * @param resource - The resource type (e.g., "contentEntries", "mediaAssets")
   * @param action - The action being performed (e.g., "update", "delete", "publish")
   * @param resourceOwnerId - The ID of the user who created/owns the resource
   * @returns Permission result with ownership verification details
   *
   * @example
   * ```typescript
   * // Check if an author can update a specific content entry
   * const entry = await ctx.db.get(entryId);
   * const result = await cms.canUserPerformOnResource(
   *   ctx,
   *   currentUserId,
   *   "contentEntries",
   *   "update",
   *   entry.createdBy // The owner's user ID
   * );
   *
   * if (!result.allowed) {
   *   if (result.ownershipRequired) {
   *     throw new Error("You can only update your own entries");
   *   }
   *   throw new Error(`Role '${result.role}' cannot update content entries`);
   * }
   *
   * // Proceed with update...
   * ```
   *
   * @example
   * ```typescript
   * // Check if user can delete a media asset they uploaded
   * const asset = await ctx.db.get(assetId);
   * const result = await cms.canUserPerformOnResource(
   *   ctx,
   *   userId,
   *   "mediaAssets",
   *   "delete",
   *   asset.createdBy
   * );
   *
   * if (result.allowed && result.grantedScope === "own") {
   *   console.log("User can delete only because they own this asset");
   * }
   * ```
   */
  canUserPerformOnResource(
    ctx: ConvexContext,
    userId: string,
    resource: Resource,
    action: Action,
    resourceOwnerId?: string
  ): Promise<ResourcePermissionResult>;

  /**
   * Require that a user can perform an action on a specific resource.
   *
   * This is the throwing version of `canUserPerformOnResource`. If the permission
   * check fails, it throws an UnauthorizedError with detailed context.
   *
   * Use this at the start of mutation handlers to enforce ownership-based access control.
   *
   * @param userId - The user ID performing the action
   * @param resource - The resource type
   * @param action - The action being performed
   * @param resourceOwnerId - The ID of the resource owner
   * @throws UnauthorizedError if permission is denied or ownership verification fails
   * @returns Permission granted details
   *
   * @example
   * ```typescript
   * // In a mutation handler - will throw if not authorized
   * export const deleteEntry = mutation({
   *   args: { id: v.id("content_entries"), userId: v.string() },
   *   handler: async (ctx, args) => {
   *     const entry = await ctx.db.get(args.id);
   *     if (!entry) throw new Error("Entry not found");
   *
   *     // Throws UnauthorizedError if user can't delete this entry
   *     await cms.requireUserCanPerformOnResource(
   *       ctx,
   *       args.userId,
   *       "contentEntries",
   *       "delete",
   *       entry.createdBy
   *     );
   *
   *     // Safe to proceed - user is authorized
   *     await ctx.db.delete(args.id);
   *   },
   * });
   * ```
   */
  requireUserCanPerformOnResource(
    ctx: ConvexContext,
    userId: string,
    resource: Resource,
    action: Action,
    resourceOwnerId?: string
  ): Promise<ResourcePermissionGranted>;

  /**
   * Check if a user owns a specific resource.
   *
   * Simple helper that compares user ID with resource owner ID.
   * Does not check permissions - just ownership.
   *
   * @param userId - The user ID to check
   * @param resourceOwnerId - The ID of the resource owner
   * @returns true if the user owns the resource
   *
   * @example
   * ```typescript
   * const entry = await ctx.db.get(entryId);
   * if (cms.isOwner(currentUserId, entry.createdBy)) {
   *   // User owns this entry
   * }
   * ```
   */
  isOwner(userId: string | undefined, resourceOwnerId: string | undefined): boolean;
}

/**
 * Result from checking resource permission with ownership verification.
 */
export interface ResourcePermissionResult {
  /**
   * Whether the user is allowed to perform the action.
   */
  allowed: boolean;

  /**
   * The user's role (null if no role assigned).
   */
  role: string | null;

  /**
   * The scope that was granted (if allowed).
   * "all" means the user can access any resource.
   * "own" means the user can only access resources they created.
   */
  grantedScope?: OwnershipScope;

  /**
   * Whether ownership was verified (true if resourceOwnerId was provided and matched userId).
   */
  ownershipVerified?: boolean;

  /**
   * If denied, indicates whether the denial was due to ownership requirements.
   * true when the user has "own" scope but doesn't own the resource.
   */
  ownershipRequired?: boolean;

  /**
   * The reason for denial (if not allowed).
   */
  reason?: string;

  /**
   * Error code for programmatic handling (if not allowed).
   */
  code?: string;
}

/**
 * Result from a successful resource permission check.
 */
export interface ResourcePermissionGranted {
  /**
   * Always true for granted permissions.
   */
  allowed: true;

  /**
   * The user's role.
   */
  role: string;

  /**
   * The scope that was granted.
   */
  grantedScope: OwnershipScope;

  /**
   * Whether ownership was verified.
   */
  ownershipVerified: boolean;
}

/**
 * Creates an enhanced CMS client with typed method wrappers.
 *
 * This is the main entry point for using the Convex CMS component.
 * The returned client provides typed methods for all CMS operations.
 *
 * @param componentApi - The component API from `components.convexCms`
 * @param config - Optional configuration options
 * @returns An enhanced CMS client instance
 *
 * @example
 * ```typescript
 * import { createCmsClient } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * // Create with default configuration
 * export const cms = createCmsClient(components.convexCms);
 *
 * // Create with custom configuration
 * export const cms = createCmsClient(components.convexCms, {
 *   defaultLocale: "en-US",
 *   supportedLocales: ["en-US", "es-ES", "fr-FR"],
 *   features: {
 *     versioning: true,
 *     localization: true,
 *     scheduling: true,
 *   },
 *   maxVersionsPerEntry: 100,
 * });
 * ```
 */
export function createEnhancedCmsClient(
  componentApi: TypedComponentApi,
  config?: ComponentConfig
): EnhancedCmsClient {
  const resolvedConfig = resolveConfig(config);
  // Store the getUserRole hook from the original config (not resolved)
  const getUserRoleHook = config?.getUserRole;
  // Store authorization hooks from config
  const authHooks = config?.authorizationHooks;
  // Store rate limit hooks from config
  const rateLimitHooks = config?.rateLimitHooks;

  // Create rate limit helper for API classes (only if rateLimitHooks are configured)
  const rateLimitHelper: RateLimitHelper | undefined = rateLimitHooks
    ? {
        async getUserRole(ctx: ConvexContext, userId: string): Promise<string | null> {
          if (!getUserRoleHook) return null;
          return getUserRoleHook(ctx as unknown as CmsHookContext, { userId });
        },
        async requireRateLimit(
          operation: CmsOperation,
          options: {
            userId?: string;
            role?: string | null;
            contentTypeId?: string;
            contentTypeName?: string;
            metadata?: Record<string, unknown>;
          }
        ): Promise<RateLimitResult> {
          const context = createRateLimitContext(operation, options);
          return requireRateLimit({
            hooks: rateLimitHooks,
            context,
          });
        },
      }
    : undefined;

  // Create authorization helper for API classes (only if getUserRole is configured)
  const authHelper: AuthorizationHelper | undefined = getUserRoleHook
    ? {
        async getUserRole(ctx: ConvexContext, userId: string): Promise<string | null> {
          return getUserRoleHook(ctx as unknown as CmsHookContext, { userId });
        },
        async requireAuthorization(ctx: ConvexContext, context: Omit<AuthorizationHookContext, 'ctx'>): Promise<AuthorizationResult> {
          const fullContext: AuthorizationHookContext = {
            ...context,
            ctx: ctx as unknown as CmsHookContext,
          };
          const rbacOptions = contextToRbacOptions(fullContext);

          const result = await executeAuthorizationHooks({
            hooks: authHooks,
            context: fullContext,
            rbacOptions: rbacOptions ?? undefined,
            skipRbac: resolvedConfig.skipRbac,
          });

          if (!result.allowed) {
            const rbacMapping = operationToRbac(fullContext.operation);

            // Import UnauthorizedError dynamically to avoid circular dependency
            const { UnauthorizedError } = await import("../component/authorization.js");

            throw new UnauthorizedError(
              result.reason ?? "Operation not allowed",
              {
                code: result.rbacResult?.allowed === false
                  ? result.rbacResult.code
                  : "PERMISSION_DENIED",
                resource: rbacMapping?.resource,
                action: rbacMapping?.action,
                role: fullContext.role ?? undefined,
                userId: fullContext.userId,
              }
            );
          }

          return result;
        },
        skipRbac: resolvedConfig.skipRbac ?? false,
      }
    : undefined;

  return {
    config: resolvedConfig,
    api: componentApi,
    contentTypes: new ContentTypesApi(componentApi, resolvedConfig, authHelper, rateLimitHelper),
    contentEntries: new ContentEntriesApi(componentApi, resolvedConfig, authHelper, rateLimitHelper),
    versions: new VersionsApi(componentApi, resolvedConfig, authHelper, rateLimitHelper),
    mediaAssets: new MediaAssetsApi(componentApi, resolvedConfig, authHelper, rateLimitHelper),
    mediaFolders: new MediaFoldersApi(componentApi, resolvedConfig, authHelper, rateLimitHelper),
    mediaVariants: new MediaVariantsApi(componentApi, resolvedConfig),

    // Locale fallback chain helpers
    locale: {
      getConfig(): LocaleFallbackConfig {
        return {
          defaultLocale: resolvedConfig.defaultLocale,
          fallbackChains: resolvedConfig.localeFallbackChains,
          autoGenerateFallbacks: resolvedConfig.autoGenerateLocaleFallbacks,
          supportedLocales: resolvedConfig.supportedLocales,
        };
      },
      getFallbackChain(locale: LocaleCode): LocaleCode[] {
        const fallbackConfig = this.getConfig();
        return getFallbackChain(locale, fallbackConfig);
      },
      resolve(locale: LocaleCode): ResolvedFallbackChain {
        const fallbackConfig = this.getConfig();
        return resolveFallbackChain(locale, fallbackConfig);
      },
    },

    isFeatureEnabled(feature: keyof FeatureFlags): boolean {
      return resolvedConfig.features[feature] ?? false;
    },

    isLocaleSupported(locale: LocaleCode): boolean {
      return resolvedConfig.supportedLocales.includes(locale);
    },

    hasUserRoleHook(): boolean {
      return getUserRoleHook !== undefined;
    },

    hasAuthorizationHooks(): boolean {
      if (!authHooks) return false;
      return !!(
        authHooks.beforeRbac ||
        authHooks.afterRbac ||
        authHooks.onDeny ||
        (authHooks.operationHooks && Object.keys(authHooks.operationHooks).length > 0)
      );
    },

    async getUserRole(ctx: ConvexContext, userId: string): Promise<GetUserRoleResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }
      return await getUserRoleHook(ctx as unknown as CmsHookContext, { userId });
    },

    async hasPermissionForUser(
      ctx: ConvexContext,
      userId: string,
      permission: { resource: Resource; action: Action; scope?: OwnershipScope },
      options?: PermissionCheckOptions
    ): Promise<UserPermissionResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook(ctx as unknown as CmsHookContext, { userId });

      // If user has no role, they have no permissions
      if (role === null) {
        return {
          allowed: false,
          role: null,
          permission,
        };
      }

      // Check if the role has the requested permission
      const allowed = hasPermission(role, permission, options?.customRoles);

      return {
        allowed,
        role,
        permission,
      };
    },

    async authorize(context: AuthorizationHookContext): Promise<AuthorizationResult> {
      // Build RBAC options from context
      const rbacOptions = contextToRbacOptions(context);

      return executeAuthorizationHooks({
        hooks: authHooks,
        context,
        rbacOptions: rbacOptions ?? undefined,
        skipRbac: resolvedConfig.skipRbac,
      });
    },

    async requireAuthorization(context: AuthorizationHookContext): Promise<AuthorizationResult> {
      const result = await this.authorize(context);

      if (!result.allowed) {
        const rbacMapping = operationToRbac(context.operation);

        // Import UnauthorizedError dynamically to avoid circular dependency
        const { UnauthorizedError } = await import("../component/authorization.js");

        throw new UnauthorizedError(
          result.reason ?? "Operation not allowed",
          {
            code: result.rbacResult?.allowed === false
              ? result.rbacResult.code
              : "PERMISSION_DENIED",
            resource: rbacMapping?.resource,
            action: rbacMapping?.action,
            role: context.role ?? undefined,
            userId: context.userId,
          }
        );
      }

      return result;
    },

    // ==========================================================================
    // Locale Fallback Chain Methods
    // ==========================================================================

    getLocaleFallbackConfig(): LocaleFallbackConfig {
      return {
        defaultLocale: resolvedConfig.defaultLocale,
        fallbackChains: resolvedConfig.localeFallbackChains,
        autoGenerateFallbacks: resolvedConfig.autoGenerateLocaleFallbacks,
        supportedLocales: resolvedConfig.supportedLocales,
      };
    },

    getLocaleFallbackChain(locale: LocaleCode): LocaleCode[] {
      const fallbackConfig = this.getLocaleFallbackConfig();
      return getFallbackChain(locale, fallbackConfig);
    },

    resolveLocaleFallbackChain(locale: LocaleCode): ResolvedFallbackChain {
      const fallbackConfig = this.getLocaleFallbackConfig();
      return resolveFallbackChain(locale, fallbackConfig);
    },

    buildLocaleResolutionOptions(locale: LocaleCode): LocaleResolutionOptions {
      const fallbackConfig = this.getLocaleFallbackConfig();
      return buildLocaleResolutionOptions(locale, fallbackConfig);
    },

    parseLocale(locale: LocaleCode): ParsedLocale | null {
      return parseLocale(locale);
    },

    getLocaleHierarchy(locale: LocaleCode): LocaleCode[] {
      return getLocaleHierarchy(locale);
    },

    // ==========================================================================
    // Custom Roles Methods
    // ==========================================================================

    getCustomRoles() {
      return resolvedConfig.customRoles;
    },

    getCustomRole(roleName: string) {
      return resolvedConfig.customRoles[roleName];
    },

    isCustomRole(roleName: string): boolean {
      return roleName in resolvedConfig.customRoles;
    },

    async hasContentTypePermissionForUser(
      ctx: ConvexContext,
      userId: string,
      permission: { resource: Resource; action: Action; scope?: OwnershipScope },
      contentTypeName: string
    ): Promise<UserPermissionResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook(ctx as unknown as CmsHookContext, { userId });

      if (role === null) {
        return {
          allowed: false,
          role: null,
          permission,
        };
      }

      // Use the content-type-aware permission check
      const allowed = hasContentTypePermission(role, permission, {
        customRoles: resolvedConfig.customRoles,
        contentTypeName,
      });

      return {
        allowed,
        role,
        permission,
      };
    },

    async getPermittedContentTypesForUser(
      ctx: ConvexContext,
      userId: string,
      action: Action
    ): Promise<string[]> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook(ctx as unknown as CmsHookContext, { userId });

      if (role === null) {
        return [];
      }

      return getPermittedContentTypes(role, action, {
        customRoles: resolvedConfig.customRoles,
      });
    },

    getAllRoles() {
      return {
        ...DEFAULT_ROLES,
        ...resolvedConfig.customRoles,
      };
    },

    // ==========================================================================
    // Resource Ownership Methods
    // ==========================================================================

    async canUserPerformOnResource(
      ctx: ConvexContext,
      userId: string,
      resource: Resource,
      action: Action,
      resourceOwnerId?: string
    ): Promise<ResourcePermissionResult> {
      if (!getUserRoleHook) {
        throw new Error(
          "No getUserRole hook configured. " +
            "Configure a getUserRole function in createCmsClient options to map user IDs to CMS roles."
        );
      }

      const role = await getUserRoleHook(ctx as unknown as CmsHookContext, { userId });

      // If user has no role, they have no permissions
      if (role === null) {
        return {
          allowed: false,
          role: null,
          reason: "No role assigned to user",
          code: "NO_ROLE",
        };
      }

      // Use the core checkPermission function for comprehensive RBAC check
      const { checkPermission } = await import("../component/authorization.js");

      const result = checkPermission({
        userId,
        role,
        resource,
        action,
        resourceOwnerId,
        customRoles: resolvedConfig.customRoles,
      });

      if (result.allowed === true) {
        return {
          allowed: true,
          role,
          grantedScope: result.grantedScope,
          ownershipVerified: result.ownershipVerified,
        };
      } else {
        // TypeScript narrows result to PermissionDenied when allowed === false
        const denied = result as { allowed: false; reason: string; code: string };
        return {
          allowed: false,
          role,
          reason: denied.reason,
          code: denied.code,
          ownershipRequired: denied.code === "OWNERSHIP_REQUIRED",
        };
      }
    },

    async requireUserCanPerformOnResource(
      ctx: ConvexContext,
      userId: string,
      resource: Resource,
      action: Action,
      resourceOwnerId?: string
    ): Promise<ResourcePermissionGranted> {
      const result = await this.canUserPerformOnResource(
        ctx,
        userId,
        resource,
        action,
        resourceOwnerId
      );

      if (!result.allowed) {
        // Import UnauthorizedError dynamically to avoid circular dependency
        const { UnauthorizedError } = await import("../component/authorization.js");

        throw new UnauthorizedError(
          result.reason ?? "Operation not allowed",
          {
            code: (result.code ?? "PERMISSION_DENIED") as
              | "NO_ROLE"
              | "UNKNOWN_ROLE"
              | "PERMISSION_DENIED"
              | "OWNERSHIP_REQUIRED",
            resource,
            action,
            role: result.role ?? undefined,
            userId,
            requiredScope: result.ownershipRequired ? "own" : undefined,
          }
        );
      }

      return {
        allowed: true,
        role: result.role!,
        grantedScope: result.grantedScope!,
        ownershipVerified: result.ownershipVerified ?? false,
      };
    },

    isOwner(userId: string | undefined, resourceOwnerId: string | undefined): boolean {
      // Import the helper synchronously (it's a simple comparison)
      if (userId === undefined || resourceOwnerId === undefined) {
        return false;
      }
      return userId === resourceOwnerId;
    },
  };
}
