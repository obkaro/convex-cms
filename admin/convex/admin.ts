/**
 * Flat Admin API for CMS Admin UI
 *
 * This file exports all admin functions with flat naming convention.
 * Used by the embedded admin UI (`CmsAdmin` component).
 *
 * Users setting up their own deployment should use `defineAdminAPI` from convex-cms:
 *
 * @example
 * ```typescript
 * // convex/admin.ts
 * import { defineAdminAPI } from "convex-cms";
 * import { components } from "./_generated/api";
 *
 * export const {
 *   listContentTypes,
 *   getContentType,
 *   // ... etc
 * } = defineAdminAPI(components.convexCms);
 * ```
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";

const paginationOptsValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
});

// =============================================================================
// Content Types
// =============================================================================

export const listContentTypes = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(components.convexCms.contentTypes.list, {
      isActive: args.isActive,
    });
    return result;
  },
});

export const getContentType = query({
  args: {
    id: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.id && (!/^[a-z0-9]+$/i.test(args.id) || args.id.length < 10)) {
      return null;
    }
    try {
      return await ctx.runQuery(components.convexCms.contentTypes.get, {
        id: args.id,
        name: args.name,
      });
    } catch {
      return null;
    }
  },
});

export const createContentType = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    fields: v.array(v.any()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    singleton: v.optional(v.boolean()),
    slugField: v.optional(v.string()),
    titleField: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentTypeMutations.createContentType,
      {
        ...args,
        createdBy: args.createdBy ?? "system",
      }
    );
  },
});

export const updateContentType = mutation({
  args: {
    id: v.string(),
    displayName: v.optional(v.string()),
    fields: v.optional(v.array(v.any())),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    singleton: v.optional(v.boolean()),
    slugField: v.optional(v.string()),
    titleField: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentTypeMutations.updateContentType,
      args
    );
  },
});

export const deleteContentType = mutation({
  args: {
    id: v.string(),
    cascade: v.optional(v.boolean()),
    hardDelete: v.optional(v.boolean()),
    deletedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentTypeMutations.deleteContentType,
      args
    );
  },
});

// =============================================================================
// Content Entries
// =============================================================================

export const listEntries = query({
  args: {
    contentTypeId: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    locale: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.contentEntries.list, {
      contentTypeId: args.contentTypeId,
      status: args.status as "draft" | "published" | "scheduled" | "archived" | undefined,
      search: args.search,
      locale: args.locale,
      paginationOpts: args.paginationOpts,
    });
  },
});

export const getEntry = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.contentEntries.get, {
      id: args.id,
    });
  },
});

export const createEntry = mutation({
  args: {
    contentTypeId: v.string(),
    data: v.any(),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    locale: v.optional(v.string()),
    primaryEntryId: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentEntryMutations.createEntry,
      {
        contentTypeId: args.contentTypeId,
        data: args.data,
        slug: args.slug,
        status: args.status as "draft" | "published" | "scheduled" | "archived" | undefined,
        locale: args.locale,
        primaryEntryId: args.primaryEntryId,
        createdBy: args.createdBy,
      }
    );
  },
});

export const updateEntry = mutation({
  args: {
    id: v.string(),
    data: v.optional(v.any()),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    scheduledPublishAt: v.optional(v.number()),
    updatedBy: v.optional(v.string()),
    regenerateSlug: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentEntryMutations.updateEntry,
      {
        id: args.id,
        data: args.data,
        slug: args.slug,
        status: args.status as "draft" | "published" | "scheduled" | "archived" | undefined,
        scheduledPublishAt: args.scheduledPublishAt,
        updatedBy: args.updatedBy,
        regenerateSlug: args.regenerateSlug,
      }
    );
  },
});

export const publishEntry = mutation({
  args: {
    id: v.string(),
    changeDescription: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentEntryMutations.publishEntry,
      {
        id: args.id,
        changeDescription: args.changeDescription,
        updatedBy: args.updatedBy,
      }
    );
  },
});

export const unpublishEntry = mutation({
  args: {
    id: v.string(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentEntryMutations.unpublishEntry,
      {
        id: args.id,
        updatedBy: args.updatedBy,
      }
    );
  },
});

export const deleteEntry = mutation({
  args: {
    id: v.string(),
    hardDelete: v.optional(v.boolean()),
    deletedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentEntryMutations.deleteEntry,
      {
        id: args.id,
        hardDelete: args.hardDelete,
        deletedBy: args.deletedBy,
      }
    );
  },
});

export const duplicateEntry = mutation({
  args: {
    id: v.string(),
    copyMediaReferences: v.optional(v.boolean()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.contentEntryMutations.duplicateEntry,
      {
        sourceEntryId: args.id,
        copyMediaReferences: args.copyMediaReferences,
        createdBy: args.createdBy,
      }
    );
  },
});

export const scheduleEntry = mutation({
  args: {
    id: v.string(),
    publishAt: v.number(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.scheduledPublish.scheduleEntry,
      {
        id: args.id,
        publishAt: args.publishAt,
        updatedBy: args.updatedBy,
      }
    );
  },
});

export const cancelScheduledEntry = mutation({
  args: {
    id: v.string(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.scheduledPublish.cancelScheduledPublish,
      {
        id: args.id,
        updatedBy: args.updatedBy,
      }
    );
  },
});

export const getScheduledEntries = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(
      components.convexCms.scheduledPublish.getScheduledEntries,
      {}
    );
  },
});

// =============================================================================
// Media Assets
// =============================================================================

export const listMediaAssets = query({
  args: {
    folderId: v.optional(v.string()),
    type: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.mediaAssets.list, {
      folderId: args.folderId,
      type: args.type as "image" | "video" | "audio" | "document" | "other" | undefined,
      search: args.search,
      paginationOpts: args.paginationOpts,
    });
  },
});

export const getMediaAsset = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.mediaAssets.get, {
      id: args.id,
    });
  },
});

export const createMediaAsset = mutation({
  args: {
    storageId: v.string(),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    parentId: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    altText: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaAssetMutations.createMediaAsset,
      {
        storageId: args.storageId as unknown as import("./_generated/dataModel").Id<"_storage">,
        name: args.name,
        mimeType: args.mimeType,
        size: args.size,
        parentId: args.parentId as unknown as import("./_generated/dataModel").Id<"mediaItems"> | undefined,
        width: args.width,
        height: args.height,
        title: args.title,
        description: args.description,
        altText: args.altText,
        createdBy: args.createdBy,
      }
    );
  },
});

export const updateMediaAsset = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    altText: v.optional(v.string()),
    parentId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaAssetMutations.updateMediaAsset,
      {
        id: args.id as unknown as import("./_generated/dataModel").Id<"mediaItems">,
        name: args.name,
        title: args.title,
        description: args.description,
        altText: args.altText,
        parentId: args.parentId as unknown as import("./_generated/dataModel").Id<"mediaItems"> | undefined,
        tags: args.tags,
      }
    );
  },
});

export const deleteMediaAsset = mutation({
  args: {
    id: v.string(),
    hardDelete: v.optional(v.boolean()),
    deletedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaAssetMutations.deleteMediaAsset,
      {
        id: args.id,
        hardDelete: args.hardDelete,
        deletedBy: args.deletedBy,
      }
    );
  },
});

export const restoreMediaAsset = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaAssetMutations.restoreMediaAsset,
      {
        id: args.id,
      }
    );
  },
});

export const moveMediaAssets = mutation({
  args: {
    assetIds: v.array(v.string()),
    targetFolderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaAssetMutations.moveMediaAssets,
      {
        assetIds: args.assetIds,
        targetFolderId: args.targetFolderId,
      }
    );
  },
});

// =============================================================================
// Media Folders
// =============================================================================

export const listMediaFolders = query({
  args: {
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.convexCms.mediaFolderMutations.listMediaFolders,
      {
        parentId: args.parentId,
      }
    );
  },
});

export const getMediaFolder = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.convexCms.mediaFolderMutations.getMediaFolder,
      {
        id: args.id,
      }
    );
  },
});

export const getMediaFolderTree = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(
      components.convexCms.mediaFolderMutations.getFolderTree,
      {}
    );
  },
});

export const createMediaFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.string()),
    description: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaFolderMutations.createMediaFolder,
      {
        name: args.name,
        parentId: args.parentId,
        description: args.description,
        createdBy: args.createdBy,
      }
    );
  },
});

export const updateMediaFolder = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaFolderMutations.updateMediaFolder,
      {
        id: args.id,
        name: args.name,
        description: args.description,
        sortOrder: args.sortOrder,
      }
    );
  },
});

export const moveMediaFolder = mutation({
  args: {
    id: v.string(),
    newParentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaFolderMutations.moveMediaFolder,
      {
        id: args.id,
        newParentId: args.newParentId,
      }
    );
  },
});

export const deleteMediaFolder = mutation({
  args: {
    id: v.string(),
    recursive: v.optional(v.boolean()),
    hardDelete: v.optional(v.boolean()),
    deletedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaFolderMutations.deleteMediaFolder,
      {
        id: args.id,
        recursive: args.recursive,
        hardDelete: args.hardDelete,
        deletedBy: args.deletedBy,
      }
    );
  },
});

export const restoreMediaFolder = mutation({
  args: {
    id: v.string(),
    recursive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.mediaFolderMutations.restoreMediaFolder,
      {
        id: args.id,
        recursive: args.recursive,
      }
    );
  },
});

// =============================================================================
// Upload
// =============================================================================

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// =============================================================================
// Dashboard Stats
// =============================================================================

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const contentTypesResult = await ctx.runQuery(
      components.convexCms.contentTypes.list,
      {}
    );
    const contentTypes = contentTypesResult.page || [];

    const entriesResult = await ctx.runQuery(
      components.convexCms.contentEntries.list,
      {
        paginationOpts: { numItems: 1000, cursor: null },
      }
    );

    const mediaResult = await ctx.runQuery(components.convexCms.mediaAssets.list, {
      paginationOpts: { numItems: 1000, cursor: null },
    });

    const activeContentTypes = contentTypes.filter(
      (ct: { isActive: boolean }) => ct.isActive
    ).length;

    const entries = entriesResult.page || [];
    const publishedEntries = entries.filter(
      (e: { status: string }) => e.status === "published"
    ).length;
    const draftEntries = entries.filter(
      (e: { status: string }) => e.status === "draft"
    ).length;
    const scheduledEntries = entries.filter(
      (e: { status: string }) => e.status === "scheduled"
    ).length;

    const mediaAssets = (mediaResult.page || []) as Array<{
      kind: string;
      mimeType?: string;
    }>;
    const assets = mediaAssets.filter((m) => m.kind === "asset");
    const images = assets.filter((m) =>
      m.mimeType?.startsWith("image/")
    ).length;
    const videos = assets.filter((m) =>
      m.mimeType?.startsWith("video/")
    ).length;
    const documents = assets.filter(
      (m) =>
        m.mimeType?.startsWith("application/pdf") ||
        m.mimeType?.includes("document") ||
        m.mimeType?.includes("sheet") ||
        m.mimeType?.includes("presentation")
    ).length;

    return {
      contentTypes: {
        total: contentTypes.length,
        active: activeContentTypes,
      },
      entries: {
        total: entries.length,
        published: publishedEntries,
        draft: draftEntries,
        scheduled: scheduledEntries,
      },
      media: {
        total: mediaAssets.length,
        images,
        videos,
        documents,
      },
    };
  },
});
