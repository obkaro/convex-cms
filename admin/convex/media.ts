/**
 * Wrapper functions for media asset and folder operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * them as public API for the admin UI media library.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";

// =============================================================================
// Media Asset Queries
// =============================================================================

/**
 * List media assets with optional filtering and pagination.
 *
 * Note: folderId uses v.string() because IDs from the CMS component
 * become plain strings when crossing the component boundary.
 */
export const listAssets = query({
  args: {
    folderId: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("document"),
      v.literal("other")
    )),
    search: v.optional(v.string()),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.mediaAssets.list, {
      folderId: args.folderId,
      type: args.type,
      search: args.search,
      paginationOpts: args.paginationOpts,
    });
  },
});

/**
 * Get a single media asset by ID.
 */
export const getAsset = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.mediaAssets.get, {
      id: args.id,
    });
  },
});

// =============================================================================
// Media Folder Queries
// =============================================================================

/**
 * List folders in a parent folder (or root if no parent specified).
 */
export const listFolders = query({
  args: {
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.mediaFolderMutations.listMediaFolders, {
      parentId: args.parentId,
    });
  },
});

/**
 * Get the full folder tree for navigation.
 */
export const getFolderTree = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.convexCms.mediaFolderMutations.getFolderTree, {});
  },
});

/**
 * Get a single folder by ID.
 */
export const getFolder = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.mediaFolderMutations.getMediaFolder, {
      id: args.id,
    });
  },
});

// =============================================================================
// Media Folder Mutations
// =============================================================================

/**
 * Create a new folder.
 */
export const createFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaFolderMutations.createMediaFolder, {
      name: args.name,
      parentId: args.parentId,
      description: args.description,
    });
  },
});

/**
 * Update a folder's name, description, or sort order.
 * If the name is changed, paths are automatically updated for this folder and all descendants.
 */
export const updateFolder = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaFolderMutations.updateMediaFolder, {
      id: args.id,
      name: args.name,
      description: args.description,
      sortOrder: args.sortOrder,
    });
  },
});

/**
 * Move a folder to a different parent.
 * This moves the folder and all its contents to the new location.
 * Paths are automatically updated for the folder and all descendants.
 */
export const moveFolder = mutation({
  args: {
    id: v.string(),
    newParentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaFolderMutations.moveMediaFolder, {
      id: args.id,
      newParentId: args.newParentId,
    });
  },
});

/**
 * Delete a folder.
 */
export const deleteFolder = mutation({
  args: {
    id: v.string(),
    recursive: v.optional(v.boolean()),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaFolderMutations.deleteMediaFolder, {
      id: args.id,
      recursive: args.recursive,
      hardDelete: args.hardDelete,
    });
  },
});

/**
 * Restore a soft-deleted folder.
 * Optionally restores all contents recursively.
 */
export const restoreFolder = mutation({
  args: {
    id: v.string(),
    recursive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaFolderMutations.restoreMediaFolder, {
      id: args.id,
      recursive: args.recursive,
    });
  },
});

// =============================================================================
// Media Asset Mutations
// =============================================================================

/**
 * Create a new media asset.
 *
 * Note: storageId uses v.string() because _storage IDs from the component
 * also become strings when crossing the boundary.
 */
export const createAsset = mutation({
  args: {
    storageId: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    type: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("document"),
      v.literal("other")
    ),
    folderId: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    altText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaAssetMutations.createMediaAsset, {
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      type: args.type,
      folderId: args.folderId,
      width: args.width,
      height: args.height,
      title: args.title,
      description: args.description,
      altText: args.altText,
    });
  },
});

/**
 * Update a media asset's metadata.
 * This updates metadata fields without modifying the underlying storage file.
 */
export const updateAsset = mutation({
  args: {
    id: v.string(),
    filename: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    altText: v.optional(v.string()),
    folderId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaAssetMutations.updateMediaAsset, {
      id: args.id,
      filename: args.filename,
      title: args.title,
      description: args.description,
      altText: args.altText,
      folderId: args.folderId,
      tags: args.tags,
    });
  },
});

/**
 * Delete a media asset.
 */
export const deleteAsset = mutation({
  args: {
    id: v.string(),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaAssetMutations.deleteMediaAsset, {
      id: args.id,
      hardDelete: args.hardDelete,
    });
  },
});

/**
 * Restore a soft-deleted media asset.
 */
export const restoreAsset = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaAssetMutations.restoreMediaAsset, {
      id: args.id,
    });
  },
});

/**
 * Move multiple media assets to a different folder.
 * Supports bulk operations up to 100 assets at a time.
 */
export const moveAssets = mutation({
  args: {
    assetIds: v.array(v.string()),
    targetFolderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.mediaAssetMutations.moveMediaAssets, {
      assetIds: args.assetIds,
      targetFolderId: args.targetFolderId,
    });
  },
});

/**
 * Generate an upload URL for file uploads.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
