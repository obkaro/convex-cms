/**
 * Media Operations
 *
 * Operations for managing media assets, folders, and variants including
 * CRUD operations, upload URLs, and responsive image handling.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import {
  adminMediaItemDoc,
  adminMediaItemWithUrlDoc,
  adminDeleteMediaAssetResult,
  adminMoveMediaAssetsResult,
  adminMediaVariantDoc,
  adminMediaVariantWithUrlDoc,
  adminVariantPresetValidator,
  adminGenerateVariantsResult,
  adminResponsiveSrcsetResult,
  adminPaginationResult,
  paginationOptsValidator,
  mediaTypeValidator,
  variantTypeValidator,
  variantStatusValidator,
} from "./validators.js";

export function createMediaOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  return {
    // =========================================================================
    // Media Asset Queries
    // =========================================================================

    listMediaAssets: queryGeneric({
      args: {
        folderId: v.optional(v.string()),
        type: v.optional(mediaTypeValidator),
        search: v.optional(v.string()),
        includeDeleted: v.optional(v.boolean()),
        deletedOnly: v.optional(v.boolean()),
        paginationOpts: paginationOptsValidator,
      },
      returns: adminPaginationResult(adminMediaItemWithUrlDoc),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listMediaAssets" });
        return await ctx.runQuery(component.mediaAssets.list, args);
      },
    }),

    getMediaAsset: queryGeneric({
      args: {
        id: v.string(),
      },
      returns: v.union(adminMediaItemWithUrlDoc, v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getMediaAsset", id: args.id });
        return await ctx.runQuery(component.mediaAssets.get, args);
      },
    }),

    getMediaTrashCount: queryGeneric({
      args: {},
      returns: v.object({
        assets: v.number(),
        folders: v.number(),
        total: v.number(),
      }),
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getMediaTrashCount" });
        const [assetsResult, folders] = await Promise.all([
          ctx.runQuery(component.mediaAssets.list, {
            deletedOnly: true,
            paginationOpts: { numItems: 1000, cursor: null },
          }),
          ctx.runQuery(component.mediaFolderMutations.listMediaFolders, {
            deletedOnly: true,
          }),
        ]);
        const assetCount = assetsResult.page.length;
        const folderCount = folders.length;
        return {
          assets: assetCount,
          folders: folderCount,
          total: assetCount + folderCount,
        };
      },
    }),

    // =========================================================================
    // Media Asset Mutations
    // =========================================================================

    createMediaAsset: mutationGeneric({
      args: {
        storageId: v.string(),
        name: v.string(),
        mimeType: v.string(),
        size: v.optional(v.number()),
        parentId: v.optional(v.string()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        duration: v.optional(v.number()),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        altText: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.record(v.string(), v.any())),
        createdBy: v.optional(v.string()),
      },
      returns: adminMediaItemDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createMediaAsset" });
        return await ctx.runMutation(
          component.mediaAssetMutations.createMediaAsset,
          args
        );
      },
    }),

    updateMediaAsset: mutationGeneric({
      args: {
        id: v.string(),
        name: v.optional(v.string()),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        altText: v.optional(v.string()),
        parentId: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.record(v.string(), v.any())),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        duration: v.optional(v.number()),
        updatedBy: v.optional(v.string()),
      },
      returns: adminMediaItemDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateMediaAsset", id: args.id });
        return await ctx.runMutation(
          component.mediaAssetMutations.updateMediaAsset,
          args
        );
      },
    }),

    deleteMediaAsset: mutationGeneric({
      args: {
        id: v.string(),
        hardDelete: v.optional(v.boolean()),
        forceDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      returns: adminDeleteMediaAssetResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteMediaAsset", id: args.id });
        return await ctx.runMutation(
          component.mediaAssetMutations.deleteMediaAsset,
          args
        );
      },
    }),

    restoreMediaAsset: mutationGeneric({
      args: {
        id: v.string(),
        restoredBy: v.optional(v.string()),
      },
      returns: adminMediaItemDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "restoreMediaAsset", id: args.id });
        return await ctx.runMutation(
          component.mediaAssetMutations.restoreMediaAsset,
          args
        );
      },
    }),

    permanentDeleteMediaAsset: mutationGeneric({
      args: {
        id: v.string(),
        deletedBy: v.optional(v.string()),
      },
      returns: adminDeleteMediaAssetResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "permanentDeleteMediaAsset", id: args.id });
        return await ctx.runMutation(
          component.mediaAssetMutations.deleteMediaAsset,
          {
            id: args.id,
            deletedBy: args.deletedBy,
            hardDelete: true,
            forceDelete: false,
          }
        );
      },
    }),

    bulkPermanentDeleteMediaAssets: mutationGeneric({
      args: {
        ids: v.array(v.string()),
        deletedBy: v.optional(v.string()),
      },
      returns: v.object({
        total: v.number(),
        succeeded: v.number(),
        failed: v.number(),
        results: v.array(
          v.object({
            id: v.string(),
            success: v.boolean(),
            error: v.optional(v.string()),
          })
        ),
      }),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "bulkPermanentDeleteMediaAssets" });
        const results: { id: string; success: boolean; error?: string }[] = [];
        for (const id of args.ids) {
          try {
            await ctx.runMutation(
              component.mediaAssetMutations.deleteMediaAsset,
              {
                id,
                deletedBy: args.deletedBy,
                hardDelete: true,
                forceDelete: false,
              }
            );
            results.push({ id, success: true });
          } catch (error) {
            results.push({
              id,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
        return {
          total: args.ids.length,
          succeeded: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          results,
        };
      },
    }),

    moveMediaAssets: mutationGeneric({
      args: {
        assetIds: v.array(v.string()),
        targetFolderId: v.optional(v.string()),
        movedBy: v.optional(v.string()),
      },
      returns: adminMoveMediaAssetsResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "moveMediaAssets" });
        return await ctx.runMutation(
          component.mediaAssetMutations.moveMediaAssets,
          args
        );
      },
    }),

    // =========================================================================
    // Media Folder Queries
    // =========================================================================

    listMediaFolders: queryGeneric({
      args: {
        parentId: v.optional(v.string()),
        deletedOnly: v.optional(v.boolean()),
      },
      returns: v.array(adminMediaItemDoc),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listMediaFolders" });
        return await ctx.runQuery(
          component.mediaFolderMutations.listMediaFolders,
          args
        );
      },
    }),

    getMediaFolder: queryGeneric({
      args: {
        id: v.string(),
      },
      returns: v.union(adminMediaItemDoc, v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getMediaFolder", id: args.id });
        return await ctx.runQuery(
          component.mediaFolderMutations.getMediaFolder,
          args
        );
      },
    }),

    getMediaFolderTree: queryGeneric({
      args: {},
      returns: v.array(adminMediaItemDoc),
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getMediaFolderTree" });
        return await ctx.runQuery(
          component.mediaFolderMutations.getFolderTree,
          {}
        );
      },
    }),

    // =========================================================================
    // Media Folder Mutations
    // =========================================================================

    createMediaFolder: mutationGeneric({
      args: {
        name: v.string(),
        parentId: v.optional(v.string()),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.record(v.string(), v.any())),
        sortOrder: v.optional(v.number()),
        createdBy: v.optional(v.string()),
      },
      returns: adminMediaItemDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createMediaFolder" });
        return await ctx.runMutation(
          component.mediaFolderMutations.createMediaFolder,
          args
        );
      },
    }),

    updateMediaFolder: mutationGeneric({
      args: {
        id: v.string(),
        name: v.optional(v.string()),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        parentId: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        metadata: v.optional(v.record(v.string(), v.any())),
        sortOrder: v.optional(v.number()),
        updatedBy: v.optional(v.string()),
      },
      returns: adminMediaItemDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateMediaFolder", id: args.id });
        return await ctx.runMutation(
          component.mediaFolderMutations.updateMediaFolder,
          args
        );
      },
    }),

    moveMediaFolder: mutationGeneric({
      args: {
        id: v.string(),
        newParentId: v.optional(v.string()),
        updatedBy: v.optional(v.string()),
      },
      returns: adminMediaItemDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "moveMediaFolder", id: args.id });
        return await ctx.runMutation(
          component.mediaFolderMutations.moveMediaFolder,
          args
        );
      },
    }),

    deleteMediaFolder: mutationGeneric({
      args: {
        id: v.string(),
        recursive: v.optional(v.boolean()),
        hardDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      returns: adminMediaItemDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteMediaFolder", id: args.id });
        return await ctx.runMutation(
          component.mediaFolderMutations.deleteMediaFolder,
          args
        );
      },
    }),

    restoreMediaFolder: mutationGeneric({
      args: {
        id: v.string(),
        recursive: v.optional(v.boolean()),
        restoredBy: v.optional(v.string()),
      },
      returns: adminMediaItemDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "restoreMediaFolder", id: args.id });
        return await ctx.runMutation(
          component.mediaFolderMutations.restoreMediaFolder,
          args
        );
      },
    }),

    // =========================================================================
    // Media Variant Queries
    // =========================================================================

    listMediaVariants: queryGeneric({
      args: {
        assetId: v.string(),
        variantType: v.optional(variantTypeValidator),
        format: v.optional(v.string()),
        preset: v.optional(v.string()),
        status: v.optional(variantStatusValidator),
        includeDeleted: v.optional(v.boolean()),
      },
      returns: v.array(adminMediaVariantWithUrlDoc),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listMediaVariants", assetId: args.assetId });
        return await ctx.runQuery(component.mediaVariants.list, args);
      },
    }),

    getMediaVariant: queryGeneric({
      args: {
        id: v.string(),
        includeDeleted: v.optional(v.boolean()),
      },
      returns: v.union(adminMediaVariantWithUrlDoc, v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getMediaVariant", id: args.id });
        return await ctx.runQuery(component.mediaVariants.get, args);
      },
    }),

    getBestMediaVariant: queryGeneric({
      args: {
        assetId: v.string(),
        targetWidth: v.optional(v.number()),
        targetHeight: v.optional(v.number()),
        preferredFormat: v.optional(v.string()),
        fallbackToOriginal: v.optional(v.boolean()),
      },
      returns: v.union(adminMediaVariantWithUrlDoc, v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getBestMediaVariant", assetId: args.assetId });
        return await ctx.runQuery(component.mediaVariants.getBestVariant, args);
      },
    }),

    getMediaResponsiveSrcset: queryGeneric({
      args: {
        assetId: v.string(),
        format: v.optional(v.string()),
      },
      returns: adminResponsiveSrcsetResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getMediaResponsiveSrcset", assetId: args.assetId });
        return await ctx.runQuery(
          component.mediaVariants.getResponsiveSrcset,
          args
        );
      },
    }),

    getMediaVariantPresets: queryGeneric({
      args: {},
      returns: v.array(adminVariantPresetValidator),
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getMediaVariantPresets" });
        return await ctx.runQuery(component.mediaVariants.getPresets, {});
      },
    }),

    getMediaAssetWithVariants: queryGeneric({
      args: {
        assetId: v.string(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getMediaAssetWithVariants", assetId: args.assetId });
        return await ctx.runQuery(
          component.mediaVariants.getAssetWithVariants,
          args
        );
      },
    }),

    // =========================================================================
    // Media Variant Mutations
    // =========================================================================

    createMediaVariant: mutationGeneric({
      args: {
        assetId: v.string(),
        storageId: v.string(),
        variantType: variantTypeValidator,
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        format: v.string(),
        mimeType: v.string(),
        size: v.number(),
        quality: v.optional(v.number()),
        preset: v.optional(v.string()),
        autoGenerated: v.optional(v.boolean()),
        createdBy: v.optional(v.string()),
      },
      returns: adminMediaVariantDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createMediaVariant" });
        return await ctx.runMutation(
          component.mediaVariantMutations.createMediaVariant,
          args
        );
      },
    }),

    requestMediaVariantGeneration: mutationGeneric({
      args: {
        assetId: v.string(),
        variantType: variantTypeValidator,
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        format: v.string(),
        quality: v.optional(v.number()),
        preset: v.optional(v.string()),
        requestedBy: v.optional(v.string()),
      },
      returns: adminMediaVariantDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "requestMediaVariantGeneration" });
        return await ctx.runMutation(
          component.mediaVariantMutations.requestVariantGeneration,
          args
        );
      },
    }),

    deleteMediaVariant: mutationGeneric({
      args: {
        id: v.string(),
        hardDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      returns: adminMediaVariantDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteMediaVariant", id: args.id });
        return await ctx.runMutation(
          component.mediaVariantMutations.deleteMediaVariant,
          args
        );
      },
    }),

    deleteMediaAssetVariants: mutationGeneric({
      args: {
        assetId: v.string(),
        hardDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteMediaAssetVariants", assetId: args.assetId });
        return await ctx.runMutation(
          component.mediaVariantMutations.deleteAssetVariants,
          args
        );
      },
    }),

    generateMediaVariantsFromPresets: mutationGeneric({
      args: {
        assetId: v.string(),
        presets: v.array(v.string()),
        requestedBy: v.optional(v.string()),
      },
      returns: adminGenerateVariantsResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "generateMediaVariantsFromPresets" });
        return await ctx.runMutation(
          component.mediaVariantMutations.generateFromPresets,
          args
        );
      },
    }),

    restoreMediaVariant: mutationGeneric({
      args: {
        id: v.string(),
        restoredBy: v.optional(v.string()),
      },
      returns: adminMediaVariantDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "restoreMediaVariant", id: args.id });
        return await ctx.runMutation(
          component.mediaVariantMutations.restoreMediaVariant,
          args
        );
      },
    }),

    // =========================================================================
    // Upload
    // =========================================================================

    generateUploadUrl: mutationGeneric({
      args: {},
      returns: v.string(),
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "generateUploadUrl" });
        const result = await ctx.runMutation(
          component.mediaUploadMutations.generateUploadUrl,
          {}
        );
        return result.uploadUrl;
      },
    }),
  };
}
