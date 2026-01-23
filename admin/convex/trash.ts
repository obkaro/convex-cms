/**
 * Wrapper functions for trash/deleted items management.
 *
 * These functions wrap the internal CMS component functions to expose
 * trash listing, configuration, and cleanup for the admin UI.
 */

import { v } from "convex/values";
import { omit } from "convex-helpers";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import {
	updateTrashConfigArgs,
	listTrashArgs,
	emptyTrashArgs,
} from "../../src/component/validators.js";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get the current trash configuration.
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.convexCms.trash.getTrashConfig, {});
  },
});

/**
 * List deleted content entries (trash items).
 * Derives args from component validator with string ID.
 */
export const list = query({
  args: {
    ...omit(listTrashArgs.fields, ["contentTypeId"]),
    contentTypeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.trash.listTrash, args);
  },
});

/**
 * Get trash statistics.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.convexCms.trash.getTrashStats, {});
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update trash configuration settings.
 * Uses component validator directly (no ID fields to convert).
 */
export const updateConfig = mutation({
  args: updateTrashConfigArgs.fields,
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.trash.updateTrashConfig, args);
  },
});

/**
 * Permanently delete items from trash.
 * This action cannot be undone.
 * Derives args from component validator with string ID.
 */
export const empty = mutation({
  args: {
    ...omit(emptyTrashArgs.fields, ["contentTypeId"]),
    contentTypeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.trash.emptyTrash, args);
  },
});

/**
 * Manually trigger trash cleanup based on retention settings.
 */
export const runCleanup = mutation({
  args: {
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.convexCms.trash.runTrashCleanup, {
      updatedBy: args.updatedBy,
    });
  },
});
