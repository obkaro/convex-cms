/**
 * CMS User Role Management
 *
 * Internal component queries and mutations for managing the `cmsUserRoles` table.
 * This table maps external user IDs (from the consumer's auth system) to CMS roles.
 *
 * Users are auto-registered when they first access the CMS via the admin API.
 * The first user to access an empty CMS is automatically assigned the "admin" role.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

// =============================================================================
// Queries
// =============================================================================

/**
 * List CMS users with search and role filter.
 * Uses .take() instead of .paginate() (pagination not supported in components).
 */
export const list = query({
  args: {
    role: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("invited"), v.literal("revoked"))),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    let users;

    if (args.role) {
      users = await ctx.db.query("cmsUserRoles")
        .withIndex("by_role", (q) => q.eq("role", args.role!))
        .take(limit);
    } else if (args.status) {
      users = await ctx.db.query("cmsUserRoles")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(limit);
    } else {
      users = await ctx.db.query("cmsUserRoles")
        .take(limit);
    }

    // Client-side search filter (for small user sets this is fine)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter((user) =>
        (user.displayName?.toLowerCase().includes(searchLower)) ||
        (user.email?.toLowerCase().includes(searchLower))
      );
    }

    return users;
  },
});

/**
 * Get a single CMS user by external user ID.
 */
export const get = query({
  args: {
    externalUserId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("cmsUserRoles"),
      _creationTime: v.number(),
      externalUserId: v.string(),
      role: v.string(),
      displayName: v.optional(v.string()),
      email: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      lastAccessedAt: v.optional(v.number()),
      createdAt: v.number(),
      createdBy: v.optional(v.string()),
      updatedAt: v.optional(v.number()),
      updatedBy: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("invited"), v.literal("revoked")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cmsUserRoles")
      .withIndex("by_external_user_id", (q) => q.eq("externalUserId", args.externalUserId))
      .unique();
  },
});

/**
 * Check if the cmsUserRoles table is empty (for first-user bootstrap).
 */
export const isEmpty = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const first = await ctx.db.query("cmsUserRoles").first();
    return first === null;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Upsert a CMS user — create if new, update profile + lastAccessedAt if existing.
 * Used by auto-registration during checkAuth.
 */
export const upsert = mutation({
  args: {
    externalUserId: v.string(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    defaultRole: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.id("cmsUserRoles"),
    role: v.string(),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cmsUserRoles")
      .withIndex("by_external_user_id", (q) => q.eq("externalUserId", args.externalUserId))
      .unique();

    if (existing) {
      // Update profile and last access time
      await ctx.db.patch(existing._id, {
        displayName: args.displayName ?? existing.displayName,
        email: args.email ?? existing.email,
        avatarUrl: args.avatarUrl ?? existing.avatarUrl,
        lastAccessedAt: Date.now(),
        updatedAt: Date.now(),
        // If invited, activate on first real access
        ...(existing.status === "invited" ? { status: "active" as const } : {}),
      });
      return { userId: existing._id, role: existing.role, isNew: false };
    }

    // New user — check if this is the first user (auto-admin)
    const tableEmpty = (await ctx.db.query("cmsUserRoles").first()) === null;
    const role = tableEmpty ? "admin" : (args.defaultRole ?? "viewer");

    const userId = await ctx.db.insert("cmsUserRoles", {
      externalUserId: args.externalUserId,
      role,
      displayName: args.displayName,
      email: args.email,
      avatarUrl: args.avatarUrl,
      lastAccessedAt: Date.now(),
      createdAt: Date.now(),
      status: "active",
    });

    return { userId, role, isNew: true };
  },
});

/**
 * Set a user's CMS role.
 */
export const setRole = mutation({
  args: {
    externalUserId: v.string(),
    role: v.string(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("cmsUserRoles")
      .withIndex("by_external_user_id", (q) => q.eq("externalUserId", args.externalUserId))
      .unique();

    if (!user) {
      throw new Error(`CMS user not found: ${args.externalUserId}`);
    }

    await ctx.db.patch(user._id, {
      role: args.role,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });
  },
});

/**
 * Invite a user by email — pre-assigns a role before they access the CMS.
 */
export const invite = mutation({
  args: {
    email: v.string(),
    role: v.string(),
    displayName: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  returns: v.id("cmsUserRoles"),
  handler: async (ctx, args) => {
    // Check if a user with this email already exists
    const existing = await ctx.db
      .query("cmsUserRoles")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existing) {
      throw new Error(`A user with email "${args.email}" already exists in the CMS.`);
    }

    return await ctx.db.insert("cmsUserRoles", {
      externalUserId: `invited:${args.email}`,
      role: args.role,
      displayName: args.displayName,
      email: args.email,
      createdAt: Date.now(),
      createdBy: args.createdBy,
      status: "invited",
    });
  },
});

/**
 * Revoke a user's CMS access.
 */
export const revoke = mutation({
  args: {
    externalUserId: v.string(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("cmsUserRoles")
      .withIndex("by_external_user_id", (q) => q.eq("externalUserId", args.externalUserId))
      .unique();

    if (!user) {
      throw new Error(`CMS user not found: ${args.externalUserId}`);
    }

    await ctx.db.patch(user._id, {
      status: "revoked",
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });
  },
});
