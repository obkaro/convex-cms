/**
 * Admin API - Main Entry Point
 *
 * Composes all domain modules into a single defineAdminAPI function.
 * Provides both flat exports (for pages) and namespaced exports (for components).
 *
 * @example Basic usage
 * ```typescript
 * // convex/admin.ts
 * import { defineAdminAPI } from "convex-cms";
 * import { components } from "./_generated/api";
 *
 * export const {
 *   listContentTypes,
 *   getContentType,
 *   createEntry,
 *   contentTypes,
 *   entries,
 *   media,
 * } = defineAdminAPI(components.convexCms);
 * ```
 *
 * @example Type-safe content type names
 * ```typescript
 * // convex/admin.ts
 * import { defineAdminAPI } from "convex-cms";
 * import { components } from "./_generated/api";
 * import { blogPost, author } from "./cms"; // Your content type helpers
 *
 * export const {
 *   listEntries,
 *   createEntry,
 * } = defineAdminAPI(components.convexCms, {
 *   contentTypes: { blogPost, author },
 * });
 *
 * // Now TypeScript provides autocomplete:
 * // listEntries(ctx, { contentTypeName: "blog_post" }) ← autocomplete works!
 * ```
 */

import type { ComponentApi } from "../../component/_generated/component.js";
import type {
  AdminApiOptions,
  AdminOperation,
  AuthContext,
  ContentTypeHelpersSchema,
  TypedAdminApiOptions,
  TypedAdminAPI,
} from "./types.js";
import { isUnifiedCmsConfig, extractAdminConfig, type UnifiedCmsConfig } from "../config.js";
import { registerContentType } from "../registry.js";
import type { ContentTypeDefinition } from "../schema/types.js";

import { createDashboardOperations } from "./dashboard.js";
import { createContentTypesOperations } from "./contentTypes.js";
import { createEntriesOperations } from "./entries.js";
import { createBulkOperations } from "./bulk.js";
import { createTrashOperations } from "./trash.js";
import { createContentLockOperations } from "./contentLock.js";
import { createVersionsOperations } from "./versions.js";
import { createMediaOperations } from "./media.js";
import { createTaxonomiesOperations } from "./taxonomies.js";
import { createSettingsOperations } from "./settings.js";

/**
 * Creates the admin API with all CRUD operations for content management.
 *
 * The returned API provides properly typed Convex function references that can be:
 * - Exported directly from your convex/admin.ts file
 * - Used with useQuery/useMutation hooks
 *
 * When `contentTypes` is provided, the returned functions have narrowed
 * `contentTypeName` arguments for full IDE autocomplete.
 *
 * @param component - The CMS component API
 * @param options - Configuration options
 * @returns Admin API operations as typed Convex function references
 *
 * @example Basic usage (untyped contentTypeName)
 * ```typescript
 * export const { listEntries } = defineAdminAPI(components.cms);
 * useQuery(api.admin.listEntries, { contentTypeName: "blog_post", ... });
 * ```
 *
 * @example With content types (typed contentTypeName with autocomplete)
 * ```typescript
 * export const admin = defineAdminAPI(components.cms, {
 *   contentTypes: { blogPost, author }
 * });
 *
 * // TypeScript provides autocomplete: "blog_post" | "author"
 * useQuery(admin.listEntries, { contentTypeName: "blog_post", ... });
 * ```
 */
// Overload 1: With content types - returns typed FunctionReferences
export function defineAdminAPI<T extends ContentTypeHelpersSchema>(
  component: ComponentApi,
  options: TypedAdminApiOptions<T>
): TypedAdminAPI<T, ReturnType<typeof createAdminAPIImpl>>;

// Overload 2: Without content types - returns standard types
export function defineAdminAPI(
  component: ComponentApi,
  options?: AdminApiOptions | UnifiedCmsConfig
): ReturnType<typeof createAdminAPIImpl>;

// Implementation
export function defineAdminAPI<T extends ContentTypeHelpersSchema>(
  component: ComponentApi,
  options?: AdminApiOptions | UnifiedCmsConfig | TypedAdminApiOptions<T>
): ReturnType<typeof createAdminAPIImpl> | TypedAdminAPI<T, ReturnType<typeof createAdminAPIImpl>> {
  const impl = createAdminAPIImpl(component, options ?? {});
  // Cast to typed API - at runtime this is the same object,
  // but TypeScript sees FunctionReference types with narrowed args.
  // We use 'as unknown as' because RegisteredQuery and FunctionReference
  // don't structurally overlap, but they're compatible at runtime.
  return impl as unknown as TypedAdminAPI<T, typeof impl>;
}

function createAdminAPIImpl(
  component: ComponentApi,
  options: AdminApiOptions | UnifiedCmsConfig | TypedAdminApiOptions<ContentTypeHelpersSchema> = {}
) {
  // Normalize unified config to AdminApiOptions if needed
  const resolvedOptions = isUnifiedCmsConfig(options)
    ? extractAdminConfig(options)
    : options;

  const { auth, features } = resolvedOptions;

  // Register content types passed via options
  if ("contentTypes" in options && options.contentTypes) {
    for (const definition of Object.values(options.contentTypes)) {
      try {
        registerContentType(definition as ContentTypeDefinition);
      } catch {
        // Type already registered - ignore duplicate registration
      }
    }
  }

  const checkAuth = async (
    ctx: AuthContext,
    operation: AdminOperation
  ): Promise<string | null> => {
    if (auth) {
      return await auth(ctx, operation);
    }
    return null;
  };

  // Create all domain operations
  const dashboard = createDashboardOperations(component, checkAuth);
  const contentTypesOps = createContentTypesOperations(component, checkAuth);
  const entriesOps = createEntriesOperations(component, checkAuth);
  const bulkOps = createBulkOperations(component, checkAuth);
  const trashOps = createTrashOperations(component, checkAuth);
  const contentLockOps = createContentLockOperations(component, checkAuth);
  const versionsOps = createVersionsOperations(component, checkAuth);
  const mediaOps = createMediaOperations(component, checkAuth);
  const taxonomiesOps = createTaxonomiesOperations(component, checkAuth);
  const settingsOps = createSettingsOperations(component, checkAuth, { features });

  return {
    // =========================================================================
    // FLAT EXPORTS (for pages that need specific operations)
    // =========================================================================

    // Dashboard
    getDashboardStats: dashboard.getDashboardStats,

    // Settings
    getSettings: settingsOps.getSettings,
    updateSettings: settingsOps.updateSettings,
    resetSettings: settingsOps.resetSettings,

    // Content Types
    listContentTypes: contentTypesOps.listContentTypes,
    getContentType: contentTypesOps.getContentType,
    createContentType: contentTypesOps.createContentType,
    updateContentType: contentTypesOps.updateContentType,
    deleteContentType: contentTypesOps.deleteContentType,
    syncCodeDefinedTypes: contentTypesOps.syncCodeDefinedTypes,
    checkSchemaDrift: contentTypesOps.checkSchemaDrift,

    // Entries
    listEntries: entriesOps.listEntries,
    getEntry: entriesOps.getEntry,
    createEntry: entriesOps.createEntry,
    updateEntry: entriesOps.updateEntry,
    publishEntry: entriesOps.publishEntry,
    unpublishEntry: entriesOps.unpublishEntry,
    deleteEntry: entriesOps.deleteEntry,
    duplicateEntry: entriesOps.duplicateEntry,
    scheduleEntry: entriesOps.scheduleEntry,
    cancelScheduledEntry: entriesOps.cancelScheduledEntry,
    getScheduledEntries: entriesOps.getScheduledEntries,
    restoreEntry: entriesOps.restoreEntry,
    getEntryBySlug: entriesOps.getEntryBySlug,
    getEntryBySlugAndTypeName: entriesOps.getEntryBySlugAndTypeName,

    // Bulk Operations
    bulkPublish: bulkOps.bulkPublish,
    bulkUnpublish: bulkOps.bulkUnpublish,
    bulkDelete: bulkOps.bulkDelete,
    bulkUpdate: bulkOps.bulkUpdate,
    bulkRestore: bulkOps.bulkRestore,

    // Trash
    getTrashConfig: trashOps.getTrashConfig,
    listTrash: trashOps.listTrash,
    getTrashStats: trashOps.getTrashStats,
    updateTrashConfig: trashOps.updateTrashConfig,
    emptyTrash: trashOps.emptyTrash,
    runTrashCleanup: trashOps.runTrashCleanup,

    // Content Lock
    checkContentLock: contentLockOps.checkContentLock,
    listLockedContent: contentLockOps.listLockedContent,
    acquireContentLock: contentLockOps.acquireContentLock,
    releaseContentLock: contentLockOps.releaseContentLock,
    renewContentLock: contentLockOps.renewContentLock,
    forceReleaseContentLock: contentLockOps.forceReleaseContentLock,

    // Versions
    getVersionHistory: versionsOps.getVersionHistory,
    getVersion: versionsOps.getVersion,
    compareVersions: versionsOps.compareVersions,
    rollbackVersion: versionsOps.rollbackVersion,

    // Media Assets
    listMediaAssets: mediaOps.listMediaAssets,
    getMediaAsset: mediaOps.getMediaAsset,
    createMediaAsset: mediaOps.createMediaAsset,
    updateMediaAsset: mediaOps.updateMediaAsset,
    deleteMediaAsset: mediaOps.deleteMediaAsset,
    restoreMediaAsset: mediaOps.restoreMediaAsset,
    permanentDeleteMediaAsset: mediaOps.permanentDeleteMediaAsset,
    bulkPermanentDeleteMediaAssets: mediaOps.bulkPermanentDeleteMediaAssets,
    moveMediaAssets: mediaOps.moveMediaAssets,
    getMediaTrashCount: mediaOps.getMediaTrashCount,

    // Media Folders
    listMediaFolders: mediaOps.listMediaFolders,
    getMediaFolder: mediaOps.getMediaFolder,
    getMediaFolderTree: mediaOps.getMediaFolderTree,
    createMediaFolder: mediaOps.createMediaFolder,
    updateMediaFolder: mediaOps.updateMediaFolder,
    moveMediaFolder: mediaOps.moveMediaFolder,
    deleteMediaFolder: mediaOps.deleteMediaFolder,
    restoreMediaFolder: mediaOps.restoreMediaFolder,

    // Media Variants
    listMediaVariants: mediaOps.listMediaVariants,
    getMediaVariant: mediaOps.getMediaVariant,
    getBestMediaVariant: mediaOps.getBestMediaVariant,
    getMediaResponsiveSrcset: mediaOps.getMediaResponsiveSrcset,
    getMediaVariantPresets: mediaOps.getMediaVariantPresets,
    getMediaAssetWithVariants: mediaOps.getMediaAssetWithVariants,
    createMediaVariant: mediaOps.createMediaVariant,
    requestMediaVariantGeneration: mediaOps.requestMediaVariantGeneration,
    deleteMediaVariant: mediaOps.deleteMediaVariant,
    deleteMediaAssetVariants: mediaOps.deleteMediaAssetVariants,
    generateMediaVariantsFromPresets: mediaOps.generateMediaVariantsFromPresets,
    restoreMediaVariant: mediaOps.restoreMediaVariant,

    // Upload
    generateUploadUrl: mediaOps.generateUploadUrl,

    // Taxonomies
    getTaxonomy: taxonomiesOps.getTaxonomy,
    listTaxonomies: taxonomiesOps.listTaxonomies,
    createTaxonomy: taxonomiesOps.createTaxonomy,
    updateTaxonomy: taxonomiesOps.updateTaxonomy,
    deleteTaxonomy: taxonomiesOps.deleteTaxonomy,
    restoreTaxonomy: taxonomiesOps.restoreTaxonomy,

    // Terms
    getTerm: taxonomiesOps.getTerm,
    listTerms: taxonomiesOps.listTerms,
    getTermsHierarchy: taxonomiesOps.getTermsHierarchy,
    suggestTerms: taxonomiesOps.suggestTerms,
    countTerms: taxonomiesOps.countTerms,
    createTerm: taxonomiesOps.createTerm,
    updateTerm: taxonomiesOps.updateTerm,
    deleteTerm: taxonomiesOps.deleteTerm,
    restoreTerm: taxonomiesOps.restoreTerm,

    // Entry-Term Relations
    getTermsByEntry: taxonomiesOps.getTermsByEntry,
    getEntriesByTerm: taxonomiesOps.getEntriesByTerm,
    setEntryTerms: taxonomiesOps.setEntryTerms,
    addTermToEntry: taxonomiesOps.addTermToEntry,
    removeTermFromEntry: taxonomiesOps.removeTermFromEntry,
    createTermAndAddToEntry: taxonomiesOps.createTermAndAddToEntry,

    // Media-Term Relations
    getTermsByMedia: taxonomiesOps.getTermsByMedia,
    getMediaByTerm: taxonomiesOps.getMediaByTerm,
    setMediaTerms: taxonomiesOps.setMediaTerms,
    addTermToMedia: taxonomiesOps.addTermToMedia,
    removeTermFromMedia: taxonomiesOps.removeTermFromMedia,
    createTermAndAddToMedia: taxonomiesOps.createTermAndAddToMedia,

    // =========================================================================
    // NAMESPACED EXPORTS (for components/modules that work with a domain)
    // =========================================================================

    stats: {
      getDashboardStats: dashboard.getDashboardStats,
    },

    settings: {
      get: settingsOps.getSettings,
      update: settingsOps.updateSettings,
      reset: settingsOps.resetSettings,
    },

    contentTypes: {
      list: contentTypesOps.listContentTypes,
      get: contentTypesOps.getContentType,
      create: contentTypesOps.createContentType,
      update: contentTypesOps.updateContentType,
      remove: contentTypesOps.deleteContentType,
      sync: contentTypesOps.syncCodeDefinedTypes,
      checkDrift: contentTypesOps.checkSchemaDrift,
    },

    entries: {
      list: entriesOps.listEntries,
      get: entriesOps.getEntry,
      create: entriesOps.createEntry,
      update: entriesOps.updateEntry,
      publish: entriesOps.publishEntry,
      unpublish: entriesOps.unpublishEntry,
      remove: entriesOps.deleteEntry,
      duplicate: entriesOps.duplicateEntry,
      schedule: entriesOps.scheduleEntry,
      cancelSchedule: entriesOps.cancelScheduledEntry,
      getScheduled: entriesOps.getScheduledEntries,
      restore: entriesOps.restoreEntry,
      getBySlug: entriesOps.getEntryBySlug,
      getBySlugAndTypeName: entriesOps.getEntryBySlugAndTypeName,
    },

    bulk: {
      publish: bulkOps.bulkPublish,
      unpublish: bulkOps.bulkUnpublish,
      delete: bulkOps.bulkDelete,
      update: bulkOps.bulkUpdate,
      restore: bulkOps.bulkRestore,
    },

    trash: {
      getConfig: trashOps.getTrashConfig,
      list: trashOps.listTrash,
      getStats: trashOps.getTrashStats,
      updateConfig: trashOps.updateTrashConfig,
      empty: trashOps.emptyTrash,
      runCleanup: trashOps.runTrashCleanup,
    },

    contentLock: {
      check: contentLockOps.checkContentLock,
      listLocked: contentLockOps.listLockedContent,
      acquire: contentLockOps.acquireContentLock,
      release: contentLockOps.releaseContentLock,
      renew: contentLockOps.renewContentLock,
      forceRelease: contentLockOps.forceReleaseContentLock,
    },

    versions: {
      getHistory: versionsOps.getVersionHistory,
      get: versionsOps.getVersion,
      compare: versionsOps.compareVersions,
      rollback: versionsOps.rollbackVersion,
    },

    media: {
      list: mediaOps.listMediaAssets,
      get: mediaOps.getMediaAsset,
      create: mediaOps.createMediaAsset,
      update: mediaOps.updateMediaAsset,
      remove: mediaOps.deleteMediaAsset,
      restore: mediaOps.restoreMediaAsset,
      permanentDelete: mediaOps.permanentDeleteMediaAsset,
      bulkPermanentDelete: mediaOps.bulkPermanentDeleteMediaAssets,
      move: mediaOps.moveMediaAssets,
      getTrashCount: mediaOps.getMediaTrashCount,
      generateUploadUrl: mediaOps.generateUploadUrl,

      folders: {
        list: mediaOps.listMediaFolders,
        get: mediaOps.getMediaFolder,
        getTree: mediaOps.getMediaFolderTree,
        create: mediaOps.createMediaFolder,
        update: mediaOps.updateMediaFolder,
        move: mediaOps.moveMediaFolder,
        remove: mediaOps.deleteMediaFolder,
        restore: mediaOps.restoreMediaFolder,
      },

      variants: {
        list: mediaOps.listMediaVariants,
        get: mediaOps.getMediaVariant,
        getBest: mediaOps.getBestMediaVariant,
        getResponsiveSrcset: mediaOps.getMediaResponsiveSrcset,
        getPresets: mediaOps.getMediaVariantPresets,
        getAssetWithVariants: mediaOps.getMediaAssetWithVariants,
        create: mediaOps.createMediaVariant,
        requestGeneration: mediaOps.requestMediaVariantGeneration,
        remove: mediaOps.deleteMediaVariant,
        deleteForAsset: mediaOps.deleteMediaAssetVariants,
        generateFromPresets: mediaOps.generateMediaVariantsFromPresets,
        restore: mediaOps.restoreMediaVariant,
      },
    },

    taxonomies: {
      get: taxonomiesOps.getTaxonomy,
      list: taxonomiesOps.listTaxonomies,
      create: taxonomiesOps.createTaxonomy,
      update: taxonomiesOps.updateTaxonomy,
      remove: taxonomiesOps.deleteTaxonomy,
      restore: taxonomiesOps.restoreTaxonomy,

      terms: {
        get: taxonomiesOps.getTerm,
        list: taxonomiesOps.listTerms,
        getHierarchy: taxonomiesOps.getTermsHierarchy,
        suggest: taxonomiesOps.suggestTerms,
        count: taxonomiesOps.countTerms,
        create: taxonomiesOps.createTerm,
        update: taxonomiesOps.updateTerm,
        remove: taxonomiesOps.deleteTerm,
        restore: taxonomiesOps.restoreTerm,
      },

      entryRelations: {
        getTermsByEntry: taxonomiesOps.getTermsByEntry,
        getEntriesByTerm: taxonomiesOps.getEntriesByTerm,
        setTerms: taxonomiesOps.setEntryTerms,
        addTerm: taxonomiesOps.addTermToEntry,
        removeTerm: taxonomiesOps.removeTermFromEntry,
        createAndAdd: taxonomiesOps.createTermAndAddToEntry,
      },

      mediaRelations: {
        getTermsByMedia: taxonomiesOps.getTermsByMedia,
        getMediaByTerm: taxonomiesOps.getMediaByTerm,
        setTerms: taxonomiesOps.setMediaTerms,
        addTerm: taxonomiesOps.addTermToMedia,
        removeTerm: taxonomiesOps.removeTermFromMedia,
        createAndAdd: taxonomiesOps.createTermAndAddToMedia,
      },
    },
  };
}

import type { ToFunctionRefs } from "./types.js";

// Base admin API type - inferred from implementation, converted to FunctionReference types
// for direct compatibility with React hooks (useQuery, useMutation)
export type BaseAdminAPI = ToFunctionRefs<ReturnType<typeof createAdminAPIImpl>>;

// Re-export types
export type {
  AdminApiOptions,
  AdminOperation,
  FeatureFlagsConfig,
  ResolvedFeatureFlags,
} from "./types.js";

// Re-export validators and derived types
export * from "./validators.js";
