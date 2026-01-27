/**
 * Content Entries Operations
 *
 * CRUD operations for content entries including publish, unpublish, duplicate, and schedule.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import {
  adminContentEntryDoc,
  adminDeleteContentEntryResult,
  adminPaginationResult,
  contentStatusValidator,
  paginationOptsValidator,
} from "./validators.js";

export function createEntriesOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  return {
    listEntries: queryGeneric({
      args: {
        contentTypeName: v.optional(v.string()),
        status: v.optional(contentStatusValidator),
        search: v.optional(v.string()),
        locale: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
      },
      returns: adminPaginationResult(adminContentEntryDoc),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listEntries", contentTypeName: args.contentTypeName });
        return await ctx.runQuery(component.contentEntries.list, {
          contentTypeName: args.contentTypeName,
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
      returns: v.union(adminContentEntryDoc, v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getEntry", id: args.id });

        if (!args.id || !/^[a-z0-9]+$/i.test(args.id) || args.id.length < 10) {
          return null;
        }

        try {
          return await ctx.runQuery(component.contentEntries.get, {
            id: args.id,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("ArgumentValidationError")
          ) {
            return null;
          }
          throw error;
        }
      },
    }),

    createEntry: mutationGeneric({
      args: {
        contentTypeName: v.string(),
        data: v.any(),
        slug: v.optional(v.string()),
        status: v.optional(contentStatusValidator),
        locale: v.optional(v.string()),
        primaryEntryId: v.optional(v.string()),
        createdBy: v.optional(v.string()),
      },
      returns: adminContentEntryDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "createEntry", contentTypeName: args.contentTypeName });
        return await ctx.runMutation(
          component.contentEntryMutations.createEntry,
          args
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
      returns: adminContentEntryDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.updateEntry,
          args
        );
      },
    }),

    publishEntry: mutationGeneric({
      args: {
        id: v.string(),
        changeDescription: v.optional(v.string()),
        updatedBy: v.optional(v.string()),
      },
      returns: adminContentEntryDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "publishEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.publishEntry,
          args
        );
      },
    }),

    unpublishEntry: mutationGeneric({
      args: {
        id: v.string(),
        updatedBy: v.optional(v.string()),
      },
      returns: adminContentEntryDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "unpublishEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.unpublishEntry,
          args
        );
      },
    }),

    deleteEntry: mutationGeneric({
      args: {
        id: v.string(),
        hardDelete: v.optional(v.boolean()),
        deletedBy: v.optional(v.string()),
      },
      returns: adminDeleteContentEntryResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "deleteEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.deleteEntry,
          args
        );
      },
    }),

    duplicateEntry: mutationGeneric({
      args: {
        sourceEntryId: v.string(),
        slug: v.optional(v.string()),
        copyMediaReferences: v.optional(v.boolean()),
        locale: v.optional(v.string()),
        createdBy: v.optional(v.string()),
      },
      returns: adminContentEntryDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "duplicateEntry", id: args.sourceEntryId });
        return await ctx.runMutation(
          component.contentEntryMutations.duplicateEntry,
          args
        );
      },
    }),

    scheduleEntry: mutationGeneric({
      args: {
        id: v.string(),
        publishAt: v.number(),
        updatedBy: v.optional(v.string()),
      },
      returns: adminContentEntryDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "scheduleEntry", id: args.id });
        return await ctx.runMutation(
          component.scheduledPublish.scheduleEntry,
          args
        );
      },
    }),

    cancelScheduledEntry: mutationGeneric({
      args: {
        id: v.string(),
        updatedBy: v.optional(v.string()),
      },
      returns: adminContentEntryDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "cancelScheduledEntry", id: args.id });
        return await ctx.runMutation(
          component.scheduledPublish.cancelScheduledPublish,
          args
        );
      },
    }),

    getScheduledEntries: queryGeneric({
      args: {
        from: v.optional(v.number()),
        to: v.optional(v.number()),
        contentTypeName: v.optional(v.string()),
      },
      returns: v.array(adminContentEntryDoc),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getScheduledEntries" });
        return await ctx.runQuery(
          component.scheduledPublish.getScheduledEntries,
          args
        );
      },
    }),

    restoreEntry: mutationGeneric({
      args: {
        id: v.string(),
        restoredBy: v.optional(v.string()),
      },
      returns: adminContentEntryDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "restoreEntry", id: args.id });
        return await ctx.runMutation(
          component.contentEntryMutations.restoreEntry,
          args
        );
      },
    }),

    getEntryBySlug: queryGeneric({
      args: {
        contentTypeName: v.string(),
        slug: v.string(),
        status: v.optional(contentStatusValidator),
        includeDeleted: v.optional(v.boolean()),
      },
      returns: v.union(adminContentEntryDoc, v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, {
          type: "getEntryBySlug",
          contentTypeName: args.contentTypeName,
          slug: args.slug,
        });
        return await ctx.runQuery(component.contentEntries.getBySlug, args);
      },
    }),

    getEntryBySlugAndTypeName: queryGeneric({
      args: {
        contentTypeName: v.string(),
        slug: v.string(),
        status: v.optional(contentStatusValidator),
        includeDeleted: v.optional(v.boolean()),
      },
      returns: v.union(adminContentEntryDoc, v.null()),
      handler: async (ctx, args) => {
        await checkAuth(ctx, {
          type: "getEntryBySlugAndTypeName",
          contentTypeName: args.contentTypeName,
          slug: args.slug,
        });
        return await ctx.runQuery(
          component.contentEntries.getBySlugAndTypeName,
          args
        );
      },
    }),
  };
}
