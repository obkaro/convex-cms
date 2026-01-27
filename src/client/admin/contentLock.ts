/**
 * Content Lock Operations
 *
 * Operations for managing concurrent edit protection including
 * acquiring, releasing, renewing, and force-releasing locks.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AuthContext, AdminOperation } from "./types.js";
import {
  adminLockStatusDoc,
  adminLockAcquisitionResult,
  adminLockedEntryDoc,
  adminPaginationResult,
  paginationOptsValidator,
} from "./validators.js";

export function createContentLockOperations(
  component: ComponentApi,
  checkAuth: (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>
) {
  return {
    checkContentLock: queryGeneric({
      args: {
        id: v.string(),
      },
      returns: adminLockStatusDoc,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "checkContentLock", id: args.id });
        return await ctx.runQuery(component.contentLock.checkLock, args);
      },
    }),

    listLockedContent: queryGeneric({
      args: {
        contentTypeName: v.optional(v.string()),
        lockedBy: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
      },
      returns: adminPaginationResult(adminLockedEntryDoc),
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listLockedContent" });
        return await ctx.runQuery(component.contentLock.listLockedEntries, args);
      },
    }),

    acquireContentLock: mutationGeneric({
      args: {
        id: v.string(),
        userId: v.string(),
        lockDuration: v.optional(v.number()),
      },
      returns: adminLockAcquisitionResult,
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "acquireContentLock", id: args.id });
        return await ctx.runMutation(component.contentLock.acquireLock, args);
      },
    }),

    releaseContentLock: mutationGeneric({
      args: {
        id: v.string(),
        userId: v.string(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "releaseContentLock", id: args.id });
        const result = await ctx.runMutation(component.contentLock.releaseLock, args);
        return { success: result !== null };
      },
    }),

    renewContentLock: mutationGeneric({
      args: {
        id: v.string(),
        userId: v.string(),
        lockDuration: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "renewContentLock", id: args.id });
        return await ctx.runMutation(component.contentLock.renewLock, args);
      },
    }),

    forceReleaseContentLock: mutationGeneric({
      args: {
        id: v.string(),
        releasedBy: v.string(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "forceReleaseContentLock", id: args.id });
        const result = await ctx.runMutation(component.contentLock.forceReleaseLock, args);
        return { success: result !== null };
      },
    }),
  };
}
