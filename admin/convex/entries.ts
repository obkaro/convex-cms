/**
 * Wrapper functions for content entry operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * them as public API for the admin UI.
 */

import { v } from "convex/values";
import { omit } from "convex-helpers";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import { contentStatusValidator } from "../../src/component/schema.js";
import {
	createContentEntryArgs,
	updateContentEntryArgs,
	publishEntryArgs,
	unpublishEntryArgs,
	deleteContentEntryArgs,
	duplicateContentEntryArgs,
	scheduleEntryArgs,
} from "../../src/component/validators.js";

// =============================================================================
// Queries
// =============================================================================

/**
 * List content entries with optional filtering.
 */
export const list = query({
	args: {
		contentTypeId: v.optional(v.string()),
		contentTypeName: v.optional(v.string()),
		status: v.optional(
			contentStatusValidator,
		),
		search: v.optional(v.string()),
		paginationOpts: v.object({
			numItems: v.number(),
			cursor: v.union(v.string(), v.null()),
		}),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(components.convexCms.contentEntries.list, {
			contentTypeId: args.contentTypeId,
			contentTypeName: args.contentTypeName,
			status: args.status,
			search: args.search,
			paginationOpts: args.paginationOpts,
		});
	},
});

/**
 * Get a single content entry by ID.
 * Returns null for invalid ID formats (graceful handling for UI).
 */
export const get = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		// Validate that the ID looks like a valid Convex ID before querying
		// Convex IDs are alphanumeric strings starting with specific prefixes
		// Invalid format strings would cause ArgumentValidationError in the component
		if (!args.id || !/^[a-z0-9]+$/i.test(args.id) || args.id.length < 10) {
			return null;
		}

		try {
			return await ctx.runQuery(components.convexCms.contentEntries.get, {
				id: args.id,
			});
		} catch (error) {
			// Return null for validation errors (invalid ID format)
			if (
				error instanceof Error &&
				error.message.includes("ArgumentValidationError")
			) {
				return null;
			}
			throw error;
		}
	},
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new content entry.
 * Derives args from component validator with string IDs.
 */
export const create = mutation({
	args: {
		...omit(createContentEntryArgs.fields, ["contentTypeId", "primaryEntryId"]),
		contentTypeId: v.string(),
		primaryEntryId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentEntryMutations.createEntry,
			args,
		);
	},
});

/**
 * Update an existing content entry.
 * Uses omit to derive args from component validator, replacing ID with string.
 */
export const update = mutation({
	args: {
		...omit(updateContentEntryArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentEntryMutations.updateEntry,
			args,
		);
	},
});

/**
 * Publish a content entry.
 * Derives args from component validator with string ID.
 */
export const publish = mutation({
	args: {
		...omit(publishEntryArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentEntryMutations.publishEntry,
			args,
		);
	},
});

/**
 * Unpublish a content entry.
 * Derives args from component validator with string ID.
 */
export const unpublish = mutation({
	args: {
		...omit(unpublishEntryArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentEntryMutations.unpublishEntry,
			args,
		);
	},
});

/**
 * Delete a content entry.
 * Derives args from component validator with string ID.
 */
export const remove = mutation({
	args: {
		...omit(deleteContentEntryArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentEntryMutations.deleteEntry,
			args,
		);
	},
});

/**
 * Duplicate a content entry.
 * Creates a copy with a new unique slug, useful for templating workflows.
 * Derives args from component validator with string ID.
 */
export const duplicate = mutation({
	args: {
		...omit(duplicateContentEntryArgs.fields, ["sourceEntryId"]),
		sourceEntryId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentEntryMutations.duplicateEntry,
			args,
		);
	},
});

// =============================================================================
// Scheduled Publishing
// =============================================================================

/**
 * Schedule a content entry for future publication.
 * Creates a Convex scheduled function that will automatically publish at the specified time.
 * Derives args from component validator with string ID.
 */
export const schedule = mutation({
	args: {
		...omit(scheduleEntryArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.scheduledPublish.scheduleEntry,
			args,
		);
	},
});

/**
 * Cancel a scheduled publication and revert to draft.
 */
export const cancelSchedule = mutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.scheduledPublish.cancelScheduledPublish,
			{
				id: args.id,
			},
		);
	},
});

/**
 * Get all entries scheduled for publication within a time range.
 */
export const getScheduled = query({
	args: {
		from: v.optional(v.number()),
		to: v.optional(v.number()),
		contentTypeId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.scheduledPublish.getScheduledEntries,
			{
				from: args.from,
				to: args.to,
				contentTypeId: args.contentTypeId,
			},
		);
	},
});

// =============================================================================
// Entry Restoration
// =============================================================================

/**
 * Restore a soft-deleted content entry from trash.
 */
export const restore = mutation({
	args: {
		id: v.string(),
		restoredBy: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentEntryMutations.restoreEntry,
			args,
		);
	},
});

// =============================================================================
// Slug-based Queries
// =============================================================================

/**
 * Get a content entry by slug and content type ID.
 * More efficient than getBySlugAndTypeName if you have the content type ID.
 */
export const getBySlug = query({
	args: {
		contentTypeId: v.string(),
		slug: v.string(),
		status: v.optional(contentStatusValidator),
		includeDeleted: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.contentEntries.getBySlug,
			args,
		);
	},
});

/**
 * Get a content entry by slug and content type name.
 * Useful when you know the type name but not the ID.
 */
export const getBySlugAndTypeName = query({
	args: {
		contentTypeName: v.string(),
		slug: v.string(),
		status: v.optional(contentStatusValidator),
		includeDeleted: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.contentEntries.getBySlugAndTypeName,
			args,
		);
	},
});
