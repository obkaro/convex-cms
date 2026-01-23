/**
 * Wrapper functions for version history operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * version history, comparison, and rollback functionality for the admin UI.
 */

import { v } from "convex/values";
import { omit } from "convex-helpers";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import {
	getVersionHistoryArgs,
	getVersionArgs,
	compareVersionsArgs,
	rollbackVersionArgs,
} from "../../src/component/validators.js";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get version history for a content entry.
 * Returns paginated list of version snapshots ordered by version number (descending).
 * Derives args from component validator with string ID.
 */
export const getHistory = query({
  args: {
    ...omit(getVersionHistoryArgs.fields, ["entryId"]),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.convexCms.contentEntries.getVersionHistory,
      args,
    );
  },
});

/**
 * Get a specific version of a content entry.
 * Can retrieve by version ID or version number.
 * Derives args from component validator with string IDs.
 */
export const get = query({
  args: {
    ...omit(getVersionArgs.fields, ["entryId", "versionId"]),
    entryId: v.string(),
    versionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexCms.contentEntries.getVersion, args);
  },
});

/**
 * Compare two versions of a content entry.
 * Returns a detailed diff showing changes between versions.
 * Derives args from component validator with string ID.
 */
export const compare = query({
  args: {
    ...omit(compareVersionsArgs.fields, ["entryId"]),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.convexCms.contentEntries.compareVersions,
      args,
    );
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Rollback a content entry to a previous version.
 *
 * This creates a new version with the content from the target version,
 * preserving the current publish status. The rollback itself is recorded
 * in the version history for audit purposes.
 * Derives args from component validator with string ID.
 */
export const rollback = mutation({
  args: {
    ...omit(rollbackVersionArgs.fields, ["entryId"]),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(
      components.convexCms.versionMutations.rollbackVersion,
      args,
    );
  },
});
