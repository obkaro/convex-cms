/**
 * Wrapper functions for content type operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * them as public API for the admin UI.
 */

import { v } from "convex/values";
import { omit } from "convex-helpers";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import {
	createContentTypeArgs,
	updateContentTypeArgs,
	deleteContentTypeArgs,
} from "../../src/component/validators.js";

// =============================================================================
// Queries
// =============================================================================

/**
 * List all content types with optional entry counts.
 * Entry counts show how many content entries exist for each type.
 *
 * Uses the dedicated count query to accurately count entries regardless
 * of the number of entries (no 1000 item limit).
 */
export const list = query({
	args: {
		isActive: v.optional(v.boolean()),
		includeEntryCounts: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const result = await ctx.runQuery(components.convexCms.contentTypes.list, {
			isActive: args.isActive,
		});

		// If entry counts are not requested, return as-is
		if (!args.includeEntryCounts) {
			return result;
		}

		// Fetch accurate entry counts using the dedicated count query
		// This handles any number of entries without pagination limits
		const contentTypesWithCounts = await Promise.all(
			result.page.map(async (contentType) => {
				// Use the count query for accurate entry counting
				const countResult = await ctx.runQuery(
					components.convexCms.contentEntries.count,
					{
						contentTypeId: contentType._id,
					},
				);

				return {
					...contentType,
					entryCount: countResult.count,
				};
			}),
		);

		return {
			...result,
			page: contentTypesWithCounts,
		};
	},
});

/**
 * Get a single content type by ID or name.
 * Returns null for invalid ID formats (graceful handling for UI).
 */
export const get = query({
	args: {
		id: v.optional(v.string()),
		name: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// If ID is provided, validate that it looks like a valid Convex ID
		// Convex IDs are alphanumeric strings starting with specific prefixes
		// Invalid format strings would cause ArgumentValidationError in the component
		if (args.id && (!/^[a-z0-9]+$/i.test(args.id) || args.id.length < 10)) {
			return null;
		}

		try {
			return await ctx.runQuery(components.convexCms.contentTypes.get, {
				id: args.id,
				name: args.name,
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
 * Create a new content type.
 * Derives args from component validator, making createdBy optional with default.
 */
export const create = mutation({
	args: {
		...omit(createContentTypeArgs.fields, ["createdBy"]),
		createdBy: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentTypeMutations.createContentType,
			{
				...args,
				createdBy: args.createdBy ?? "system",
			},
		);
	},
});

/**
 * Update an existing content type.
 * Derives args from component validator with string ID.
 */
export const update = mutation({
	args: {
		...omit(updateContentTypeArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentTypeMutations.updateContentType,
			args,
		);
	},
});

/**
 * Delete a content type.
 * Supports soft delete (default), hard delete, and cascade options.
 * Derives args from component validator with string ID.
 */
export const remove = mutation({
	args: {
		...omit(deleteContentTypeArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentTypeMutations.deleteContentType,
			args,
		);
	},
});
