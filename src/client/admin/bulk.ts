/**
 * Bulk Operations
 *
 * Batch operations for publishing, unpublishing, deleting, updating, and restoring content entries.
 */

import { mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import { adminBulkOperationResult, contentStatusValidator } from "./validators.js";

export function createBulkOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  return {
    bulkPublish: mutationGeneric({
      args: {
        ids: v.array(v.string()),
        changeDescription: v.optional(v.string()),
        updatedBy: v.optional(v.string()),
      },
      returns: adminBulkOperationResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "bulkPublish" });
        return await ctx.runMutation(
          component.bulkOperations.bulkPublish,
          args
        );
      },
    }),

    bulkUnpublish: mutationGeneric({
      args: {
        ids: v.array(v.string()),
        updatedBy: v.optional(v.string()),
      },
      returns: adminBulkOperationResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "bulkUnpublish" });
        return await ctx.runMutation(
          component.bulkOperations.bulkUnpublish,
          args
        );
      },
    }),

    bulkDelete: mutationGeneric({
      args: {
        ids: v.array(v.string()),
        deletedBy: v.optional(v.string()),
        hardDelete: v.optional(v.boolean()),
      },
      returns: adminBulkOperationResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "bulkDelete" });
        return await ctx.runMutation(
          component.bulkOperations.bulkDelete,
          args
        );
      },
    }),

    bulkUpdate: mutationGeneric({
      args: {
        ids: v.array(v.string()),
        data: v.optional(v.any()),
        status: v.optional(contentStatusValidator),
        updatedBy: v.optional(v.string()),
      },
      returns: adminBulkOperationResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "bulkUpdate" });
        return await ctx.runMutation(
          component.bulkOperations.bulkUpdate,
          args
        );
      },
    }),

    bulkRestore: mutationGeneric({
      args: {
        ids: v.array(v.string()),
        restoredBy: v.optional(v.string()),
      },
      returns: adminBulkOperationResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "bulkRestore" });
        return await ctx.runMutation(
          component.bulkOperations.bulkRestore,
          args
        );
      },
    }),
  };
}
