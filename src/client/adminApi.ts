/**
 * Admin API Helper for Convex CMS
 *
 * This module provides the `defineAdminAPI` function that creates typed
 * Convex functions for the admin UI to call. Users export these functions
 * from their `convex/` directory, which the admin UI then calls.
 *
 * This follows the standard Convex component pattern used by:
 * - @convex-dev/agent's `definePlaygroundAPI`
 * - template-component's `exposeApi`
 * - @dodopayments/convex's class-based API
 *
 * @example
 * ```typescript
 * // convex/admin.ts
 * import { defineAdminAPI } from "convex-cms";
 * import { components } from "./_generated/api";
 *
 * export const {
 *   // Content Types
 *   listContentTypes,
 *   getContentType,
 *   createContentType,
 *   updateContentType,
 *   deleteContentType,
 *   // Entries
 *   listEntries,
 *   getEntry,
 *   createEntry,
 *   updateEntry,
 *   publishEntry,
 *   unpublishEntry,
 *   deleteEntry,
 *   duplicateEntry,
 *   scheduleEntry,
 *   cancelScheduledEntry,
 *   getScheduledEntries,
 *   // Media
 *   listMediaAssets,
 *   getMediaAsset,
 *   createMediaAsset,
 *   updateMediaAsset,
 *   deleteMediaAsset,
 *   restoreMediaAsset,
 *   moveMediaAssets,
 *   listMediaFolders,
 *   getMediaFolder,
 *   getMediaFolderTree,
 *   createMediaFolder,
 *   updateMediaFolder,
 *   moveMediaFolder,
 *   deleteMediaFolder,
 *   restoreMediaFolder,
 *   generateUploadUrl,
 *   // Stats
 *   getDashboardStats,
 * } = defineAdminAPI(components.convexCms, {
 *   auth: async (ctx, operation) => {
 *     // Optional: validate user has admin access
 *     const identity = await ctx.auth.getUserIdentity();
 *     if (!identity) throw new Error("Unauthorized");
 *     return identity.subject;
 *   },
 * });
 * ```
 */

import {
  queryGeneric,
  mutationGeneric,
  type Auth,
} from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../component/_generated/component.js";
import type { Id } from "../component/_generated/dataModel.js";
import {
  fieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
} from "../component/schema.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Operation context passed to the auth callback.
 * Uses flat naming convention for simpler exports.
 */
export type AdminOperation =
  // Content Types
  | { type: "listContentTypes" }
  | { type: "getContentType"; id: string }
  | { type: "createContentType" }
  | { type: "updateContentType"; id: string }
  | { type: "deleteContentType"; id: string }
  // Entries
  | { type: "listEntries"; contentTypeId: string }
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
  // Media Assets
  | { type: "listMediaAssets" }
  | { type: "getMediaAsset"; id: string }
  | { type: "createMediaAsset" }
  | { type: "updateMediaAsset"; id: string }
  | { type: "deleteMediaAsset"; id: string }
  | { type: "restoreMediaAsset"; id: string }
  | { type: "moveMediaAssets" }
  // Media Folders
  | { type: "listMediaFolders" }
  | { type: "getMediaFolder"; id: string }
  | { type: "getMediaFolderTree" }
  | { type: "createMediaFolder" }
  | { type: "updateMediaFolder"; id: string }
  | { type: "moveMediaFolder"; id: string }
  | { type: "deleteMediaFolder"; id: string }
  | { type: "restoreMediaFolder"; id: string }
  // Upload
  | { type: "generateUploadUrl" }
  // Stats
  | { type: "getDashboardStats" };

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

// =============================================================================
// Validators (reused across functions)
// =============================================================================

const paginationOptsValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
});

// =============================================================================
// defineAdminAPI
// =============================================================================

/**
 * Creates typed Convex functions for the CMS admin UI.
 *
 * This function returns an object containing query and mutation functions
 * that the admin UI calls. Users export these from their `convex/` directory.
 *
 * @param component - The CMS component API from `components.convexCms`
 * @param options - Optional configuration including auth callback
 * @returns Object with namespaced admin functions
 *
 * @example
 * ```typescript
 * // convex/admin.ts
 * import { defineAdminAPI } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * export const { contentTypes, entries, media, stats } = defineAdminAPI(
 *   components.convexCms
 * );
 * ```
 */
export function defineAdminAPI(
  component: ComponentApi,
  options: AdminApiOptions = {}
) {
  const { auth } = options;

  // Helper to run auth check if configured
  const checkAuth = async (
    ctx: { auth: Auth },
    operation: AdminOperation
  ): Promise<string | null> => {
    if (auth) {
      return await auth(ctx, operation);
    }
    return null;
  };

  return {
    // =========================================================================
    // Content Types
    // =========================================================================
    listContentTypes: queryGeneric({
      args: {
        isActive: v.optional(v.boolean()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listContentTypes" });
        return await ctx.runQuery(component.contentTypes.list, {
          isActive: args.isActive,
        });
      },
    }),

    getContentType: queryGeneric({
      args: {
        id: v.optional(v.string()),
        name: v.optional(v.string()),
      },
      returns: v.union(v.any(), v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getContentType", id: args.id ?? "" });
        return await ctx.runQuery(component.contentTypes.get, {
          id: args.id,
          name: args.name,
        });
      },
    }),

    createContentType: mutationGeneric({
      args: {
        name: v.string(),
        displayName: v.string(),
        fields: v.array(fieldDefinitionValidator),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        singleton: v.optional(v.boolean()),
        slugField: v.optional(v.string()),
        titleField: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        createdBy: v.string(),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createContentType" });
        return await ctx.runMutation(
          component.contentTypeMutations.createContentType,
          {
            name: args.name,
            displayName: args.displayName,
            fields: args.fields,
            description: args.description,
            icon: args.icon,
            singleton: args.singleton,
            slugField: args.slugField,
            titleField: args.titleField,
            sortOrder: args.sortOrder,
            createdBy: args.createdBy,
          }
        );
      },
    }),

    updateContentType: mutationGeneric({
      args: {
        id: v.string(),
        displayName: v.optional(v.string()),
        fields: v.optional(v.array(fieldDefinitionValidator)),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
        singleton: v.optional(v.boolean()),
        slugField: v.optional(v.string()),
        titleField: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
        updatedBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateContentType", id: args.id });
        return await ctx.runMutation(
          component.contentTypeMutations.updateContentType,
          {
            id: args.id,
            displayName: args.displayName,
            fields: args.fields,
            description: args.description,
            icon: args.icon,
            singleton: args.singleton,
            slugField: args.slugField,
            titleField: args.titleField,
            sortOrder: args.sortOrder,
            isActive: args.isActive,
            updatedBy: args.updatedBy,
          }
        );
      },
    }),

    deleteContentType: mutationGeneric({
      args: {
        id: v.string(),
        cascade: v.optional(v.boolean()),
        hardDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteContentType", id: args.id });
        return await ctx.runMutation(
          component.contentTypeMutations.deleteContentType,
          {
            id: args.id,
            cascade: args.cascade,
            hardDelete: args.hardDelete,
            deletedBy: args.deletedBy,
          }
        );
      },
    }),

    // =========================================================================
    // Content Entries
    // =========================================================================
    listEntries: queryGeneric({
      args: {
        contentTypeId: v.optional(v.string()),
        status: v.optional(contentStatusValidator),
        search: v.optional(v.string()),
        locale: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, {
          type: "listEntries",
          contentTypeId: args.contentTypeId ?? "",
        });
        return await ctx.runQuery(component.contentEntries.list, {
          contentTypeId: args.contentTypeId,
          status: args.status,
          search: args.search,
          locale: args.locale,
          paginationOpts: args.paginationOpts,
        });
      },
    }),

    getEntry: queryGeneric({
      args: {
        id: v.string(),
      },
      returns: v.union(v.any(), v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getEntry", id: args.id });
        return await ctx.runQuery(component.contentEntries.get, {
          id: args.id,
        });
      },
    }),

    createEntry: mutationGeneric({
      args: {
        contentTypeId: v.string(),
        data: v.any(),
        slug: v.optional(v.string()),
        status: v.optional(contentStatusValidator),
        locale: v.optional(v.string()),
        primaryEntryId: v.optional(v.string()),
        createdBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, {
          type: "createEntry",
          contentTypeId: args.contentTypeId,
        });
        return await ctx.runMutation(
          component.contentEntryMutations.createEntry,
          {
            contentTypeId: args.contentTypeId,
            data: args.data,
            slug: args.slug,
            status: args.status,
            locale: args.locale,
            primaryEntryId: args.primaryEntryId,
            createdBy: args.createdBy,
          }
        );
      },
    }),

    updateEntry: mutationGeneric({
      args: {
        id: v.string(),
        data: v.optional(v.any()),
        slug: v.optional(v.string()),
        status: v.optional(contentStatusValidator),
        scheduledPublishAt: v.optional(v.number()),
        updatedBy: v.optional(v.string()),
        regenerateSlug: v.optional(v.boolean()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.updateEntry,
          {
            id: args.id,
            data: args.data,
            slug: args.slug,
            status: args.status,
            scheduledPublishAt: args.scheduledPublishAt,
            updatedBy: args.updatedBy,
            regenerateSlug: args.regenerateSlug,
          }
        );
      },
    }),

    publishEntry: mutationGeneric({
      args: {
        id: v.string(),
        changeDescription: v.optional(v.string()),
        updatedBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "publishEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.publishEntry,
          {
            id: args.id,
            changeDescription: args.changeDescription,
            updatedBy: args.updatedBy,
          }
        );
      },
    }),

    unpublishEntry: mutationGeneric({
      args: {
        id: v.string(),
        updatedBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "unpublishEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.unpublishEntry,
          {
            id: args.id,
            updatedBy: args.updatedBy,
          }
        );
      },
    }),

    deleteEntry: mutationGeneric({
      args: {
        id: v.string(),
        hardDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.deleteEntry,
          {
            id: args.id,
            hardDelete: args.hardDelete,
            deletedBy: args.deletedBy,
          }
        );
      },
    }),

    duplicateEntry: mutationGeneric({
      args: {
        id: v.string(),
        copyMediaReferences: v.optional(v.boolean()),
        createdBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "duplicateEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.duplicateEntry,
          {
            sourceEntryId: args.id,
            copyMediaReferences: args.copyMediaReferences,
            createdBy: args.createdBy,
          }
        );
      },
    }),

    scheduleEntry: mutationGeneric({
      args: {
        id: v.string(),
        publishAt: v.number(),
        updatedBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "scheduleEntry", id: args.id });
        return await ctx.runMutation(
          component.scheduledPublish.scheduleEntry,
          {
            id: args.id,
            publishAt: args.publishAt,
            updatedBy: args.updatedBy,
          }
        );
      },
    }),

    cancelScheduledEntry: mutationGeneric({
      args: {
        id: v.string(),
        updatedBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "cancelScheduledEntry", id: args.id });
        return await ctx.runMutation(
          component.scheduledPublish.cancelScheduledPublish,
          {
            id: args.id,
            updatedBy: args.updatedBy,
          }
        );
      },
    }),

    getScheduledEntries: queryGeneric({
      args: {},
      returns: v.array(v.any()),
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getScheduledEntries" });
        return await ctx.runQuery(
          component.scheduledPublish.getScheduledEntries,
          {}
        );
      },
    }),

    // =========================================================================
    // Media Assets
    // =========================================================================
    listMediaAssets: queryGeneric({
      args: {
        folderId: v.optional(v.string()),
        type: v.optional(mediaTypeValidator),
        search: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listMediaAssets" });
        return await ctx.runQuery(component.mediaAssets.list, {
          folderId: args.folderId,
          type: args.type,
          search: args.search,
          paginationOpts: args.paginationOpts,
        });
      },
    }),

    getMediaAsset: queryGeneric({
      args: {
        id: v.string(),
      },
      returns: v.union(v.any(), v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getMediaAsset", id: args.id });
        return await ctx.runQuery(component.mediaAssets.get, {
          id: args.id,
        });
      },
    }),

    createMediaAsset: mutationGeneric({
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
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createMediaAsset" });
        return await ctx.runMutation(
          component.mediaAssetMutations.createMediaAsset,
          {
            storageId: args.storageId as Id<"_storage">,
            name: args.name,
            mimeType: args.mimeType,
            size: args.size,
            parentId: args.parentId as Id<"mediaItems"> | undefined,
            width: args.width,
            height: args.height,
            title: args.title,
            description: args.description,
            altText: args.altText,
            createdBy: args.createdBy,
          }
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
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateMediaAsset", id: args.id });
        return await ctx.runMutation(
          component.mediaAssetMutations.updateMediaAsset,
          {
            id: args.id as Id<"mediaItems">,
            name: args.name,
            title: args.title,
            description: args.description,
            altText: args.altText,
            parentId: args.parentId as Id<"mediaItems"> | undefined,
            tags: args.tags,
          }
        );
      },
    }),

    deleteMediaAsset: mutationGeneric({
      args: {
        id: v.string(),
        hardDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteMediaAsset", id: args.id });
        return await ctx.runMutation(
          component.mediaAssetMutations.deleteMediaAsset,
          {
            id: args.id,
            hardDelete: args.hardDelete,
            deletedBy: args.deletedBy,
          }
        );
      },
    }),

    restoreMediaAsset: mutationGeneric({
      args: {
        id: v.string(),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "restoreMediaAsset", id: args.id });
        return await ctx.runMutation(
          component.mediaAssetMutations.restoreMediaAsset,
          {
            id: args.id,
          }
        );
      },
    }),

    moveMediaAssets: mutationGeneric({
      args: {
        assetIds: v.array(v.string()),
        targetFolderId: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "moveMediaAssets" });
        return await ctx.runMutation(
          component.mediaAssetMutations.moveMediaAssets,
          {
            assetIds: args.assetIds,
            targetFolderId: args.targetFolderId,
          }
        );
      },
    }),

    // =========================================================================
    // Media Folders
    // =========================================================================
    listMediaFolders: queryGeneric({
      args: {
        parentId: v.optional(v.string()),
      },
      returns: v.array(v.any()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listMediaFolders" });
        return await ctx.runQuery(
          component.mediaFolderMutations.listMediaFolders,
          {
            parentId: args.parentId,
          }
        );
      },
    }),

    getMediaFolder: queryGeneric({
      args: {
        id: v.string(),
      },
      returns: v.union(v.any(), v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getMediaFolder", id: args.id });
        return await ctx.runQuery(
          component.mediaFolderMutations.getMediaFolder,
          {
            id: args.id,
          }
        );
      },
    }),

    getMediaFolderTree: queryGeneric({
      args: {},
      returns: v.array(v.any()),
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getMediaFolderTree" });
        return await ctx.runQuery(
          component.mediaFolderMutations.getFolderTree,
          {}
        );
      },
    }),

    createMediaFolder: mutationGeneric({
      args: {
        name: v.string(),
        parentId: v.optional(v.string()),
        description: v.optional(v.string()),
        createdBy: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createMediaFolder" });
        return await ctx.runMutation(
          component.mediaFolderMutations.createMediaFolder,
          {
            name: args.name,
            parentId: args.parentId,
            description: args.description,
            createdBy: args.createdBy,
          }
        );
      },
    }),

    updateMediaFolder: mutationGeneric({
      args: {
        id: v.string(),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateMediaFolder", id: args.id });
        return await ctx.runMutation(
          component.mediaFolderMutations.updateMediaFolder,
          {
            id: args.id,
            name: args.name,
            description: args.description,
            sortOrder: args.sortOrder,
          }
        );
      },
    }),

    moveMediaFolder: mutationGeneric({
      args: {
        id: v.string(),
        newParentId: v.optional(v.string()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "moveMediaFolder", id: args.id });
        return await ctx.runMutation(
          component.mediaFolderMutations.moveMediaFolder,
          {
            id: args.id,
            newParentId: args.newParentId,
          }
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
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteMediaFolder", id: args.id });
        return await ctx.runMutation(
          component.mediaFolderMutations.deleteMediaFolder,
          {
            id: args.id,
            recursive: args.recursive,
            hardDelete: args.hardDelete,
            deletedBy: args.deletedBy,
          }
        );
      },
    }),

    restoreMediaFolder: mutationGeneric({
      args: {
        id: v.string(),
        recursive: v.optional(v.boolean()),
      },
      returns: v.any(),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "restoreMediaFolder", id: args.id });
        return await ctx.runMutation(
          component.mediaFolderMutations.restoreMediaFolder,
          {
            id: args.id,
            recursive: args.recursive,
          }
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
        return await ctx.storage.generateUploadUrl();
      },
    }),

    // =========================================================================
    // Dashboard Stats
    // =========================================================================
    getDashboardStats: queryGeneric({
      args: {},
      returns: v.object({
        contentTypes: v.object({
          total: v.number(),
          active: v.number(),
        }),
        entries: v.object({
          total: v.number(),
          published: v.number(),
          draft: v.number(),
          scheduled: v.number(),
        }),
        media: v.object({
          total: v.number(),
          images: v.number(),
          videos: v.number(),
          documents: v.number(),
        }),
      }),
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getDashboardStats" });

        const contentTypesResult = await ctx.runQuery(
          component.contentTypes.list,
          {}
        );
        const contentTypes = contentTypesResult.page || [];

        const entriesResult = await ctx.runQuery(
          component.contentEntries.list,
          {
            paginationOpts: { numItems: 1000, cursor: null },
          }
        );

        const mediaResult = await ctx.runQuery(component.mediaAssets.list, {
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
    }),
  };
}
