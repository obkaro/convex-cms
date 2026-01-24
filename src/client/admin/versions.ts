/**
 * Version Operations
 *
 * Operations for managing content version history including
 * listing history, getting specific versions, comparing, and rollback.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import { paginationOptsValidator } from "./validators.js";

export function createVersionsOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  return {
    getVersionHistory: queryGeneric({
      args: {
        entryId: v.string(),
        paginationOpts: paginationOptsValidator,
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getVersionHistory", entryId: args.entryId });
        return await ctx.runQuery(
          component.contentEntries.getVersionHistory,
          args
        );
      },
    }),

    getVersion: queryGeneric({
      args: {
        entryId: v.string(),
        versionId: v.optional(v.string()),
        versionNumber: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getVersion", entryId: args.entryId });
        return await ctx.runQuery(component.contentEntries.getVersion, args);
      },
    }),

    compareVersions: queryGeneric({
      args: {
        entryId: v.string(),
        fromVersionNumber: v.number(),
        toVersionNumber: v.number(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "compareVersions", entryId: args.entryId });
        return await ctx.runQuery(
          component.contentEntries.compareVersions,
          args
        );
      },
    }),

    rollbackVersion: mutationGeneric({
      args: {
        entryId: v.string(),
        versionNumber: v.number(),
        updatedBy: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "rollbackVersion", entryId: args.entryId });
        return await ctx.runMutation(
          component.versionMutations.rollbackVersion,
          args
        );
      },
    }),
  };
}
