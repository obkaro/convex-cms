/**
 * Admin User Operations
 *
 * Wraps component cmsUsers functions with auth checks.
 * Provides user listing, role management, and invite functionality.
 */

import { queryGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";
import type { ComponentApi } from "../../component/_generated/component.js";
import type { AdminOperation, AuthContext } from "./types.js";

type CheckAuthFn = (ctx: AuthContext, operation: AdminOperation) => Promise<string | null>;

export function createUserOperations(
  component: ComponentApi,
  checkAuth: CheckAuthFn
) {
  return {
    listCmsUsers: queryGeneric({
      args: {
        role: v.optional(v.string()),
        status: v.optional(v.union(v.literal("active"), v.literal("invited"), v.literal("revoked"))),
        search: v.optional(v.string()),
        limit: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "listCmsUsers" });
        return await ctx.runQuery(component.cmsUsers.list, {
          role: args.role,
          status: args.status,
          search: args.search,
          limit: args.limit,
        });
      },
    }),

    getCmsUser: queryGeneric({
      args: {
        externalUserId: v.string(),
      },
      handler: async (ctx, args) => {
        await checkAuth(ctx, { type: "getCmsUser" });
        return await ctx.runQuery(component.cmsUsers.get, {
          externalUserId: args.externalUserId,
        });
      },
    }),

    setCmsUserRole: mutationGeneric({
      args: {
        externalUserId: v.string(),
        role: v.string(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const actorId = await checkAuth(ctx, { type: "setCmsUserRole" });
        await ctx.runMutation(component.cmsUsers.setRole, {
          externalUserId: args.externalUserId,
          role: args.role,
          updatedBy: actorId ?? undefined,
        });
        return null;
      },
    }),

    inviteCmsUser: mutationGeneric({
      args: {
        email: v.string(),
        role: v.string(),
        displayName: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        const actorId = await checkAuth(ctx, { type: "inviteCmsUser" });
        return await ctx.runMutation(component.cmsUsers.invite, {
          email: args.email,
          role: args.role,
          displayName: args.displayName,
          createdBy: actorId ?? undefined,
        });
      },
    }),

    removeCmsUser: mutationGeneric({
      args: {
        externalUserId: v.string(),
      },
      returns: v.null(),
      handler: async (ctx, args) => {
        const actorId = await checkAuth(ctx, { type: "removeCmsUser" });
        await ctx.runMutation(component.cmsUsers.revoke, {
          externalUserId: args.externalUserId,
          updatedBy: actorId ?? undefined,
        });
        return null;
      },
    }),

    /**
     * Register or update the current user's CMS profile.
     * Called by the admin UI on mount to ensure the user is registered
     * with their display name and email.
     */
    registerSelf: mutationGeneric({
      args: {
        displayName: v.optional(v.string()),
        email: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        const userId = await checkAuth(ctx, { type: "registerSelf" });
        if (!userId) return null;

        await ctx.runMutation(component.cmsUsers.upsert, {
          externalUserId: userId,
          displayName: args.displayName,
          email: args.email,
          avatarUrl: args.avatarUrl,
        });

        return null;
      },
    }),
  };
}
