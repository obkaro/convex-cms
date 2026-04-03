/**
 * Admin API Types
 *
 * Non-derivable types for the Admin API including options, operations, and auth context.
 */

import type { Auth, RegisteredQuery, RegisteredMutation, FunctionReference } from "convex/server";

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
  // Users
  | { type: "listCmsUsers" }
  | { type: "getCmsUser" }
  | { type: "setCmsUserRole" }
  | { type: "inviteCmsUser" }
  | { type: "removeCmsUser" }
  | { type: "registerSelf" }
  // Content Types
  | { type: "listContentTypes" }
  | { type: "getContentType"; id?: string; name?: string }
  | { type: "createContentType" }
  | { type: "updateContentType"; id: string }
  | { type: "deleteContentType"; id: string }
  | { type: "syncContentTypes" }
  | { type: "checkSchemaDrift" }
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
/**
 * Return type from the auth callback.
 * Can be a simple user ID string, a rich profile object, or null for anonymous.
 */
export type AuthResult =
  | string
  | { userId: string; name?: string; email?: string; avatarUrl?: string }
  | null;

export interface AdminApiOptions {
  /**
   * Optional authentication callback.
   *
   * Called before each operation to validate access. Should throw if
   * unauthorized.
   *
   * Return either:
   * - A user ID string (backward compatible)
   * - A profile object `{ userId, name?, email?, avatarUrl? }` for richer user display
   * - `null` for anonymous access
   *
   * When a profile object is returned, the CMS auto-registers the user with
   * their display name and email in the Users page.
   *
   * @example
   * ```typescript
   * auth: async (ctx, operation) => {
   *   const identity = await ctx.auth.getUserIdentity();
   *   if (!identity) throw new Error("Unauthorized");
   *   return {
   *     userId: identity.subject,
   *     name: identity.name,
   *     email: identity.email,
   *   };
   * }
   * ```
   */
  auth?: (
    ctx: { auth: Auth; db?: any },
    operation: AdminOperation
  ) => Promise<AuthResult>;

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
  /** Available in mutation contexts for profile lookups */
  db?: any;
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
// Type-Safe Admin API (Explicit FunctionReference Types)
// =============================================================================
// The solution: Define FunctionReference types explicitly with narrowed args.
// RegisteredQuery has phantom type parameters that can't be extracted after creation.
// FunctionReference stores types as actual properties (_args, _returnType).
// By defining explicit types, we create properly typed function references.

/**
 * Args for listEntries query with narrowed contentTypeName.
 */
type ListEntriesArgs<TSlugs extends string> = {
  contentTypeName?: TSlugs;
  status?: "draft" | "published" | "archived" | "scheduled";
  search?: string;
  locale?: string;
  paginationOpts: { numItems: number; cursor: string | null };
};

/**
 * Args for createEntry mutation with narrowed contentTypeName.
 */
type CreateEntryArgs<TSlugs extends string> = {
  contentTypeName: TSlugs;
  data: unknown;
  slug?: string;
  status?: "draft" | "published" | "archived" | "scheduled";
  locale?: string;
  primaryEntryId?: string;
  createdBy?: string;
};

/**
 * Args for getEntryBySlug query with narrowed contentTypeName.
 */
type GetEntryBySlugArgs<TSlugs extends string> = {
  contentTypeName: TSlugs;
  slug: string;
  status?: string;
};

/**
 * Args for getScheduledEntries query with narrowed contentTypeName.
 */
type GetScheduledEntriesArgs<TSlugs extends string> = {
  contentTypeName?: TSlugs;
  paginationOpts: { numItems: number; cursor: string | null };
};

/**
 * Common return type for paginated entry lists.
 * Note: FunctionReference return types are unwrapped (not wrapped in Promise).
 */
type PaginatedEntriesReturn = {
  page: Array<{
    _id: string;
    _creationTime: number;
    contentTypeName: string;
    slug: string;
    status: string;
    data: unknown;
    version: number;
    locale?: string;
    createdBy?: string;
    updatedBy?: string;
    firstPublishedAt?: number;
    lastPublishedAt?: number;
    scheduledPublishAt?: number;
    deletedAt?: number;
  }>;
  continueCursor: string | null;
  isDone: boolean;
};

/**
 * Single entry object type.
 */
type Entry = {
  _id: string;
  _creationTime: number;
  contentTypeName: string;
  slug: string;
  status: string;
  data: unknown;
  version: number;
  locale?: string;
  createdBy?: string;
  updatedBy?: string;
  firstPublishedAt?: number;
  lastPublishedAt?: number;
  scheduledPublishAt?: number;
  deletedAt?: number;
};

/**
 * Return type for queries that might not find an entry (getBySlug, etc).
 */
type EntryOrNull = Entry | null;

/**
 * Return type for mutations that always return an entry (createEntry).
 */
type EntryReturn = Entry;

/**
 * Rebuilds Convex function types as explicit public RegisteredQuery /
 * RegisteredMutation types so Convex's ApiFromModules/FilterApi utilities keep
 * recognizing them after mapped-type transformations.
 */
type PreservePublicAdminExports<T> =
  T extends RegisteredQuery<any, infer Args, infer Returns>
    ? RegisteredQuery<"public", Args, Returns>
    : T extends RegisteredMutation<any, infer Args, infer Returns>
      ? RegisteredMutation<"public", Args, Returns>
      : T extends object
        ? { [K in keyof T]: PreservePublicAdminExports<T[K]> }
        : T;

/**
 * Narrows a single key to its typed version if it's a narrowed key.
 * Uses RegisteredQuery/RegisteredMutation to match what FilterApi expects.
 */
type NarrowKey<K, TSlugs extends string, TOriginal> =
  K extends "listEntries" ? RegisteredQuery<"public", ListEntriesArgs<TSlugs>, PaginatedEntriesReturn>
  : K extends "createEntry" ? RegisteredMutation<"public", CreateEntryArgs<TSlugs>, EntryReturn>
  : K extends "getEntryBySlug" ? RegisteredQuery<"public", GetEntryBySlugArgs<TSlugs>, EntryOrNull>
  : K extends "getEntryBySlugAndTypeName" ? RegisteredQuery<"public", GetEntryBySlugArgs<TSlugs>, EntryOrNull>
  : K extends "getScheduledEntries" ? RegisteredQuery<"public", GetScheduledEntriesArgs<TSlugs>, PaginatedEntriesReturn>
  : PreservePublicAdminExports<TOriginal>;

/**
 * Narrows entries namespace keys.
 * Uses RegisteredQuery/RegisteredMutation to match what FilterApi expects.
 */
type NarrowEntriesKey<K, TSlugs extends string, TOriginal> =
  K extends "list" ? RegisteredQuery<"public", ListEntriesArgs<TSlugs>, PaginatedEntriesReturn>
  : K extends "create" ? RegisteredMutation<"public", CreateEntryArgs<TSlugs>, EntryReturn>
  : K extends "getBySlug" ? RegisteredQuery<"public", GetEntryBySlugArgs<TSlugs>, EntryOrNull>
  : K extends "getBySlugAndTypeName" ? RegisteredQuery<"public", GetEntryBySlugArgs<TSlugs>, EntryOrNull>
  : K extends "getScheduled" ? RegisteredQuery<"public", GetScheduledEntriesArgs<TSlugs>, PaginatedEntriesReturn>
  : PreservePublicAdminExports<TOriginal>;

/**
 * Typed entries namespace using pure mapped type.
 */
type TypedEntriesNamespace<TSlugs extends string, TEntries> = {
  [K in keyof TEntries]: NarrowEntriesKey<K, TSlugs, TEntries[K]>;
};

/**
 * Typed admin API with content type name inference.
 *
 * Uses a pure mapped type (no intersections) for compatibility with
 * Convex's FilterApi type processing.
 *
 * @example
 * ```typescript
 * const admin = defineAdminAPI(components.cms, {
 *   contentTypes: { blogPost, author }
 * });
 *
 * // TypeScript provides autocomplete: "blog_post" | "author"
 * useQuery(admin.listEntries, { contentTypeName: "blog_post", ... });
 * ```
 */
export type TypedAdminAPI<T extends ContentTypeHelpersSchema, TBase> = {
  [K in keyof TBase]: K extends "entries"
    ? TBase[K] extends object
      ? TypedEntriesNamespace<ContentTypeSlugs<T>, TBase[K]>
      : TBase[K]
    : NarrowKey<K, ContentTypeSlugs<T>, TBase[K]>;
};

// =============================================================================
// React Hook Compatible Types
// =============================================================================
// RegisteredQuery/RegisteredMutation use phantom type parameters which don't
// structurally match FunctionReference (used by React hooks). This utility
// converts between the two representations.

/**
 * Recursively converts all RegisteredQuery/RegisteredMutation types in an object
 * to their FunctionReference equivalents for use with React hooks.
 *
 * This is applied to BaseAdminAPI so the exported type works directly with
 * useQuery/useMutation without additional type assertions.
 *
 * Note: The ComponentPath parameter is set to `string | undefined` to match
 * how Convex generates types for component functions.
 */
export type ToFunctionRefs<T> = T extends RegisteredQuery<infer V, infer Args, infer Returns>
  ? FunctionReference<"query", V, Args, Awaited<Returns>, string | undefined>
  : T extends RegisteredMutation<infer V, infer Args, infer Returns>
    ? FunctionReference<"mutation", V, Args, Awaited<Returns>, string | undefined>
    : T extends object
      ? { [K in keyof T]: ToFunctionRefs<T[K]> }
      : T;
