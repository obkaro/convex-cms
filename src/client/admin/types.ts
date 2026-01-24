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
  | { type: "listEntries"; contentTypeId?: string }
  | { type: "getEntry"; id: string }
  | { type: "createEntry"; contentTypeId: string }
  | { type: "updateEntry"; id: string }
  | { type: "publishEntry"; id: string }
  | { type: "unpublishEntry"; id: string }
  | { type: "deleteEntry"; id: string }
  | { type: "duplicateEntry"; id: string }
  | { type: "scheduleEntry"; id: string }
  | { type: "cancelScheduledEntry"; id: string }
  | { type: "getScheduledEntries" }
  | { type: "restoreEntry"; id: string }
  | { type: "getEntryBySlug"; contentTypeId: string; slug: string }
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
}

/**
 * Context type for checkAuth helper.
 */
export interface AuthContext {
  auth: Auth;
}
