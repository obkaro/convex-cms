/**
 * Wrapper functions for content locking operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * content locking functionality for the admin UI, enabling concurrent
 * edit protection.
 */

import { v } from "convex/values";
import { omit } from "convex-helpers";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import {
	acquireLockArgs,
	releaseLockArgs,
	forceReleaseLockArgs,
	renewLockArgs,
	checkLockArgs,
	listLockedEntriesArgs,
} from "../../src/component/validators.js";

// =============================================================================
// Queries
// =============================================================================

/**
 * Check the lock status of a content entry.
 * Returns whether the entry is locked, by whom, and time remaining.
 * Derives args from component validator with string ID.
 */
export const check = query({
	args: {
		...omit(checkLockArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(components.convexCms.contentLock.checkLock, args);
	},
});

/**
 * List all locked content entries.
 * Useful for admin dashboards to see which entries are being edited.
 * Derives args from component validator with string IDs.
 */
export const listLocked = query({
	args: {
		...omit(listLockedEntriesArgs.fields, ["contentTypeId"]),
		contentTypeId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.contentLock.listLockedEntries,
			args,
		);
	},
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Acquire a lock on a content entry.
 * Returns success status and the locked entry if successful.
 * Derives args from component validator with string ID.
 */
export const acquire = mutation({
	args: {
		...omit(acquireLockArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentLock.acquireLock,
			args,
		);
	},
});

/**
 * Release a lock on a content entry.
 * Only the lock owner can release their lock.
 * Derives args from component validator with string ID.
 */
export const release = mutation({
	args: {
		...omit(releaseLockArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentLock.releaseLock,
			args,
		);
	},
});

/**
 * Renew an existing lock to extend the editing session.
 * Only the lock owner can renew their lock.
 * Derives args from component validator with string ID.
 */
export const renew = mutation({
	args: {
		...omit(renewLockArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentLock.renewLock,
			args,
		);
	},
});

/**
 * Force release a lock (admin operation).
 * Allows administrators to remove locks from entries locked by other users.
 * Derives args from component validator with string ID.
 */
export const forceRelease = mutation({
	args: {
		...omit(forceReleaseLockArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentLock.forceReleaseLock,
			args,
		);
	},
});
