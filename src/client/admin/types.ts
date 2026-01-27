/**
 * Admin API Types
 *
 * Non-derivable types for the Admin API including options, operations, and auth context.
 */

import type { Auth } from "convex/server";

/**
 * Operation context passed to the auth callback.
 * Expanded to cover all ~97 operations.
 */
export type AdminOperation =
  // Dashboard
  | { type: "getDashboardStats" }
  // Settings
  | { type: "getSettings" }
  | { type: "updateSettings" }
  | { type: "resetSettings" }
  // Content Types
  | { type: "listContentTypes" }
  | { type: "getContentType"; id?: string; name?: string }
  | { type: "createContentType" }
  | { type: "updateContentType"; id: string }
  | { type: "deleteContentType"; id: string }
  // Entries
  | { type: "listEntries"; contentTypeName?: string }
  | { type: "getEntry"; id: string }
  | { type: "createEntry"; contentTypeName: string }
  | { type: "updateEntry"; id: string }
  | { type: "publishEntry"; id: string }
  | { type: "unpublishEntry"; id: string }
  | { type: "deleteEntry"; id: string }
  | { type: "duplicateEntry"; id: string }
  | { type: "scheduleEntry"; id: string }
  | { type: "cancelScheduledEntry"; id: string }
  | { type: "getScheduledEntries" }
  | { type: "restoreEntry"; id: string }
  | { type: "getEntryBySlug"; contentTypeName: string; slug: string }
  | { type: "getEntryBySlugAndTypeName"; contentTypeName: string; slug: string }
  // Bulk Operations
  | { type: "bulkPublish" }
  | { type: "bulkUnpublish" }
  | { type: "bulkDelete" }
  | { type: "bulkUpdate" }
  | { type: "bulkRestore" }
  // Trash
  | { type: "getTrashConfig" }
  | { type: "listTrash" }
  | { type: "getTrashStats" }
  | { type: "updateTrashConfig" }
  | { type: "emptyTrash" }
  | { type: "runTrashCleanup" }
  // Content Lock
  | { type: "checkContentLock"; id: string }
  | { type: "listLockedContent" }
  | { type: "acquireContentLock"; id: string }
  | { type: "releaseContentLock"; id: string }
  | { type: "renewContentLock"; id: string }
  | { type: "forceReleaseContentLock"; id: string }
  // Versions
  | { type: "getVersionHistory"; entryId: string }
  | { type: "getVersion"; entryId: string }
  | { type: "compareVersions"; entryId: string }
  | { type: "rollbackVersion"; entryId: string }
  // Media Assets
  | { type: "listMediaAssets" }
  | { type: "getMediaAsset"; id: string }
  | { type: "createMediaAsset" }
  | { type: "updateMediaAsset"; id: string }
  | { type: "deleteMediaAsset"; id: string }
  | { type: "restoreMediaAsset"; id: string }
  | { type: "permanentDeleteMediaAsset"; id: string }
  | { type: "bulkPermanentDeleteMediaAssets" }
  | { type: "moveMediaAssets" }
  | { type: "getMediaTrashCount" }
  // Media Folders
  | { type: "listMediaFolders" }
  | { type: "getMediaFolder"; id: string }
  | { type: "getMediaFolderTree" }
  | { type: "createMediaFolder" }
  | { type: "updateMediaFolder"; id: string }
  | { type: "moveMediaFolder"; id: string }
  | { type: "deleteMediaFolder"; id: string }
  | { type: "restoreMediaFolder"; id: string }
  // Media Variants
  | { type: "listMediaVariants"; assetId: string }
  | { type: "getMediaVariant"; id: string }
  | { type: "getBestMediaVariant"; assetId: string }
  | { type: "getMediaResponsiveSrcset"; assetId: string }
  | { type: "getMediaVariantPresets" }
  | { type: "getMediaAssetWithVariants"; assetId: string }
  | { type: "createMediaVariant" }
  | { type: "requestMediaVariantGeneration" }
  | { type: "deleteMediaVariant"; id: string }
  | { type: "deleteMediaAssetVariants"; assetId: string }
  | { type: "generateMediaVariantsFromPresets" }
  | { type: "restoreMediaVariant"; id: string }
  // Upload
  | { type: "generateUploadUrl" }
  // Taxonomies
  | { type: "getTaxonomy"; id?: string; name?: string }
  | { type: "listTaxonomies" }
  | { type: "createTaxonomy" }
  | { type: "updateTaxonomy"; id: string }
  | { type: "deleteTaxonomy"; id: string }
  | { type: "restoreTaxonomy"; id: string }
  // Terms
  | { type: "getTerm"; id?: string }
  | { type: "listTerms"; taxonomyId: string }
  | { type: "getTermsHierarchy"; taxonomyId: string }
  | { type: "suggestTerms"; taxonomyId: string }
  | { type: "countTerms"; taxonomyId: string }
  | { type: "createTerm"; taxonomyId: string }
  | { type: "updateTerm"; id: string }
  | { type: "deleteTerm"; id: string }
  | { type: "restoreTerm"; id: string }
  // Entry-Term Relations
  | { type: "getTermsByEntry"; entryId: string }
  | { type: "getEntriesByTerm"; termId: string }
  | { type: "setEntryTerms"; entryId: string }
  | { type: "addTermToEntry"; entryId: string }
  | { type: "removeTermFromEntry"; entryId: string }
  | { type: "createTermAndAddToEntry"; entryId: string }
  // Media-Term Relations
  | { type: "getTermsByMedia"; mediaId: string }
  | { type: "getMediaByTerm"; termId: string }
  | { type: "setMediaTerms"; mediaId: string }
  | { type: "addTermToMedia"; mediaId: string }
  | { type: "removeTermFromMedia"; mediaId: string }
  | { type: "createTermAndAddToMedia"; mediaId: string };

/**
 * Feature flags for CMS functionality.
 * Used to enable/disable features at configuration time.
 */
export interface FeatureFlagsConfig {
  versioning?: boolean;
  scheduling?: boolean;
  localization?: boolean;
  mediaManagement?: boolean;
}

/**
 * Options for configuring the admin API.
 */
export interface AdminApiOptions {
  /**
   * Optional authentication callback.
   *
   * Called before each operation to validate access. Should throw if
   * unauthorized. Returns the authenticated user's ID (or null for anonymous).
   *
   * If not provided, all operations are allowed (useful for development).
   *
   * @example
   * ```typescript
   * auth: async (ctx, operation) => {
   *   const identity = await ctx.auth.getUserIdentity();
   *   if (!identity) throw new Error("Unauthorized");
   *   // Could also check operation.type for fine-grained access control
   *   return identity.subject;
   * }
   * ```
   */
  auth?: (
    ctx: { auth: Auth },
    operation: AdminOperation
  ) => Promise<string | null>;

  /**
   * Feature flags for the CMS.
   *
   * Features defined here are read-only in the admin UI.
   * Unspecified features use defaults:
   * - versioning: true
   * - scheduling: true
   * - localization: false
   * - mediaManagement: true
   *
   * @example
   * ```typescript
   * features: {
   *   versioning: true,
   *   scheduling: true,
   *   localization: false,  // explicitly disabled
   *   // mediaManagement uses default (true)
   * }
   * ```
   */
  features?: FeatureFlagsConfig;
}

/**
 * Context type for checkAuth helper.
 */
export interface AuthContext {
  auth: Auth;
}

/**
 * Resolved feature flags with all values defined.
 */
export interface ResolvedFeatureFlags {
  versioning: boolean;
  scheduling: boolean;
  localization: boolean;
  mediaManagement: boolean;
}

// =============================================================================
// Type-Safe Content Type Inference
// =============================================================================

/**
 * Base interface for any object with a slug property.
 * This allows both ContentTypeDefinition and ContentTypeHelpers to be used.
 */
export interface HasSlug {
  readonly slug: string;
}

/**
 * A record of content types with slugs, keyed by any string.
 * This accepts both ContentTypeDefinition and ContentTypeHelpers.
 *
 * @example
 * ```typescript
 * // Using defineContentType directly
 * const roadmapItem = defineContentType({ name: "Roadmap Item", ... });
 * defineAdminAPI(component, { contentTypes: { roadmapItem } });
 *
 * // Using createCms().defineContent()
 * const blogPost = cms.defineContent({ name: "Blog Post", ... });
 * defineAdminAPI(component, { contentTypes: { blogPost } });
 * ```
 */
export type ContentTypeHelpersSchema = Record<string, HasSlug>;

/**
 * Extracts the union of all slug strings from a ContentTypeHelpersSchema.
 *
 * @example
 * ```typescript
 * const contentTypes = { blogPost, author };
 * type Slugs = ContentTypeSlugs<typeof contentTypes>;
 * // "blog_post" | "author"
 * ```
 */
export type ContentTypeSlugs<T extends ContentTypeHelpersSchema> = {
  [K in keyof T]: T[K]["slug"];
}[keyof T];

/**
 * Options for type-safe admin API with content type inference.
 */
export interface TypedAdminApiOptions<T extends ContentTypeHelpersSchema> extends AdminApiOptions {
  /**
   * Content type helpers for TypeScript inference.
   * Pass the helpers created by cms.defineContent() to enable
   * autocomplete for contentTypeName arguments.
   */
  contentTypes: T;
}

// =============================================================================
// Typed Admin API Return Type
// =============================================================================

// Keys that need typed contentTypeName overrides for autocomplete
type TypedFlatMethodKeys =
  | "listEntries"
  | "createEntry"
  | "getEntryBySlug"
  | "getEntryBySlugAndTypeName"
  | "getScheduledEntries";

/**
 * Typed overrides for flat methods that take contentTypeName.
 */
type TypedFlatMethodOverrides<T extends ContentTypeHelpersSchema> = {
  listEntries: TypedListEntriesQuery<T>;
  createEntry: TypedCreateEntryMutation<T>;
  getEntryBySlug: TypedGetEntryBySlugQuery<T>;
  getEntryBySlugAndTypeName: TypedGetEntryBySlugQuery<T>;
  getScheduledEntries: TypedGetScheduledEntriesQuery<T>;
};

/**
 * Typed admin API with content type name inference.
 *
 * This type extends the base admin API (inferred from implementation)
 * and overrides only the methods that benefit from contentTypeName autocomplete.
 * All other methods retain their proper types from the implementation.
 *
 * @typeParam TBase - The base admin API type (inferred from createAdminAPIImpl)
 * @typeParam T - The content type helpers schema for type inference
 */
export type TypedAdminAPI<
  T extends ContentTypeHelpersSchema,
  TBase = Record<string, unknown>
> = Omit<TBase, TypedFlatMethodKeys | "entries"> &
  TypedFlatMethodOverrides<T> & {
    entries: TBase extends { entries: infer E }
      ? Omit<E, "list" | "create" | "getBySlug" | "getBySlugAndTypeName" | "getScheduled"> & {
          list: TypedListEntriesQuery<T>;
          create: TypedCreateEntryMutation<T>;
          getBySlug: TypedGetEntryBySlugQuery<T>;
          getBySlugAndTypeName: TypedGetEntryBySlugQuery<T>;
          getScheduled: TypedGetScheduledEntriesQuery<T>;
        }
      : unknown;
  };

// Typed query/mutation function signatures
type TypedListEntriesQuery<T extends ContentTypeHelpersSchema> = {
  (ctx: unknown, args: {
    contentTypeName?: ContentTypeSlugs<T>;
    status?: "draft" | "published" | "archived" | "scheduled";
    search?: string;
    locale?: string;
    paginationOpts: { numItems: number; cursor: string | null };
  }): Promise<{
    page: Array<{
      _id: string;
      _creationTime: number;
      contentTypeName: string;
      slug: string;
      status: "draft" | "published" | "archived" | "scheduled";
      data: Record<string, unknown>;
      version: number;
      locale?: string;
      primaryEntryId?: string;
    }>;
    continueCursor: string | null;
    isDone: boolean;
  }>;
};

type TypedCreateEntryMutation<T extends ContentTypeHelpersSchema> = {
  (ctx: unknown, args: {
    contentTypeName: ContentTypeSlugs<T>;
    data: Record<string, unknown>;
    slug?: string;
    status?: "draft" | "published" | "archived" | "scheduled";
    locale?: string;
    primaryEntryId?: string;
    createdBy?: string;
  }): Promise<{
    _id: string;
    _creationTime: number;
    contentTypeName: string;
    slug: string;
    status: "draft" | "published" | "archived" | "scheduled";
    data: Record<string, unknown>;
    version: number;
    locale?: string;
    primaryEntryId?: string;
  }>;
};

type TypedGetEntryBySlugQuery<T extends ContentTypeHelpersSchema> = {
  (ctx: unknown, args: {
    contentTypeName: ContentTypeSlugs<T>;
    slug: string;
    status?: "draft" | "published" | "archived" | "scheduled";
    includeDeleted?: boolean;
  }): Promise<{
    _id: string;
    _creationTime: number;
    contentTypeName: string;
    slug: string;
    status: "draft" | "published" | "archived" | "scheduled";
    data: Record<string, unknown>;
    version: number;
    locale?: string;
    primaryEntryId?: string;
  } | null>;
};

type TypedGetScheduledEntriesQuery<T extends ContentTypeHelpersSchema> = {
  (ctx: unknown, args: {
    from?: number;
    to?: number;
    contentTypeName?: ContentTypeSlugs<T>;
  }): Promise<Array<{
    _id: string;
    _creationTime: number;
    contentTypeName: string;
    slug: string;
    status: "draft" | "published" | "archived" | "scheduled";
    data: Record<string, unknown>;
    version: number;
    locale?: string;
    primaryEntryId?: string;
    scheduledPublishAt?: number;
  }>>;
};
