/**
 * Wrapper functions for bulk operations on content entries.
 *
 * These functions wrap the internal CMS component functions to expose
 * bulk publish, unpublish, delete, update, and restore functionality.
 *
 * All operations process entries atomically and return detailed results.
 */

import { v } from "convex/values";
import { omit } from "convex-helpers";
import { mutation } from "./_generated/server";
import { components } from "./_generated/api";
import {
  bulkPublishArgs,
  bulkUnpublishArgs,
  bulkDeleteArgs,
  bulkUpdateArgs,
} from "../../src/component/validators.js";

// =============================================================================
// Mutations
// =============================================================================

/**
 * Publish multiple content entries at once.
 * Derives args from component validator with string IDs.
 */
export const bulkPublish = mutation({
  args: {
    ...omit(bulkPublishArgs.fields, ["ids"]),
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.bulkOperations.bulkPublish,
      args,
    );
  },
});

/**
 * Unpublish multiple content entries at once.
 * Derives args from component validator with string IDs.
 */
export const bulkUnpublish = mutation({
  args: {
    ...omit(bulkUnpublishArgs.fields, ["ids"]),
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.bulkOperations.bulkUnpublish,
      args,
    );
  },
});

/**
 * Delete multiple content entries at once.
 * Derives args from component validator with string IDs.
 */
export const bulkDelete = mutation({
  args: {
    ...omit(bulkDeleteArgs.fields, ["ids"]),
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.bulkOperations.bulkDelete,
      args,
    );
  },
});

/**
 * Update multiple content entries with the same changes.
 * Derives args from component validator with string IDs.
 */
export const bulkUpdate = mutation({
  args: {
    ...omit(bulkUpdateArgs.fields, ["ids"]),
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.bulkOperations.bulkUpdate,
      args,
    );
  },
});

/**
 * Restore multiple soft-deleted content entries.
 * Note: bulkRestoreArgs not in validators.ts, using inline definition.
 */
export const bulkRestore = mutation({
  args: {
    ids: v.array(v.string()),
    restoredBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.bulkOperations.bulkRestore,
      args,
    );
  },
});
