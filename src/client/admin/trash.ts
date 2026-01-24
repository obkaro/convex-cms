/**
 * Trash Operations
 *
 * Operations for managing soft-deleted content entries including
 * configuration, listing, stats, and cleanup.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import { paginationOptsValidator } from "./validators.js";

export function createTrashOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  return {
    getTrashConfig: queryGeneric({
      args: {},
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getTrashConfig" });
        return await ctx.runQuery(component.trash.getTrashConfig, {});
      },
    }),

    listTrash: queryGeneric({
      args: {
        contentTypeId: v.optional(v.string()),
        contentTypeName: v.optional(v.string()),
        search: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listTrash" });
        return await ctx.runQuery(component.trash.listTrash, args);
      },
    }),

    getTrashStats: queryGeneric({
      args: {},
      handler: async (ctx) => {
        await checkAuth(ctx, { type: "getTrashStats" });
        return await ctx.runQuery(component.trash.getTrashStats, {});
      },
    }),

    updateTrashConfig: mutationGeneric({
      args: {
        retentionDays: v.optional(v.number()),
        autoCleanupEnabled: v.optional(v.boolean()),
        updatedBy: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "updateTrashConfig" });
        return await ctx.runMutation(component.trash.updateTrashConfig, args);
      },
    }),

    emptyTrash: mutationGeneric({
      args: {
        olderThanDays: v.optional(v.number()),
        contentTypeId: v.optional(v.string()),
        deletedBy: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "emptyTrash" });
        return await ctx.runMutation(component.trash.emptyTrash, args);
      },
    }),

    runTrashCleanup: mutationGeneric({
      args: {
        updatedBy: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "runTrashCleanup" });
        return await ctx.runMutation(component.trash.runTrashCleanup, args);
      },
    }),
  };
}
