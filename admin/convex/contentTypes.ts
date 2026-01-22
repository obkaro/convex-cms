/**
 * Wrapper functions for content type operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * them as public API for the admin UI.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";

// =============================================================================
// Field Type Validators
// =============================================================================

// Note: These validators are duplicates of what's defined in the component's schema.
// They're maintained locally because Convex component validators are not directly
// importable - the component exposes functions via the API, not raw validators.
// These must be kept in sync with src/component/schema.ts field definitions.
// See: https://docs.convex.dev/components/overview

/**
 * Validator for field types supported by the CMS.
 */
const fieldTypeValidator = v.union(
	v.literal("text"),
	v.literal("richText"),
	v.literal("number"),
	v.literal("boolean"),
	v.literal("date"),
	v.literal("datetime"),
	v.literal("reference"),
	v.literal("media"),
	v.literal("json"),
	v.literal("select"),
	v.literal("multiSelect"),
);

/**
 * Validator for select options.
 */
const selectOptionValidator = v.object({
	value: v.string(),
	label: v.string(),
});

/**
 * Validator for field options.
 */
const fieldOptionsValidator = v.object({
	// Text fields
	minLength: v.optional(v.number()),
	maxLength: v.optional(v.number()),
	pattern: v.optional(v.string()),
	// Number fields
	min: v.optional(v.number()),
	max: v.optional(v.number()),
	step: v.optional(v.number()),
	precision: v.optional(v.number()),
	// Reference fields
	allowedContentTypes: v.optional(v.array(v.string())),
	multiple: v.optional(v.boolean()),
	minItems: v.optional(v.number()),
	// Media fields
	allowedMimeTypes: v.optional(v.array(v.string())),
	maxFileSize: v.optional(v.number()),
	// Select fields
	options: v.optional(v.array(selectOptionValidator)),
	// Rich text fields
	allowedBlocks: v.optional(v.array(v.string())),
	allowedMarks: v.optional(v.array(v.string())),
});

/**
 * Validator for a field definition.
 */
const fieldDefinitionValidator = v.object({
	name: v.string(),
	label: v.string(),
	type: fieldTypeValidator,
	required: v.boolean(),
	searchable: v.optional(v.boolean()),
	localized: v.optional(v.boolean()),
	description: v.optional(v.string()),
	defaultValue: v.optional(v.any()),
	options: v.optional(fieldOptionsValidator),
});

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
 */
export const create = mutation({
	args: {
		name: v.string(),
		displayName: v.string(),
		description: v.optional(v.string()),
		fields: v.array(fieldDefinitionValidator),
		icon: v.optional(v.string()),
		singleton: v.optional(v.boolean()),
		slugField: v.optional(v.string()),
		titleField: v.optional(v.string()),
		sortOrder: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.contentTypeMutations.createContentType,
			{
				name: args.name,
				displayName: args.displayName,
				description: args.description,
				fields: args.fields,
				icon: args.icon,
				singleton: args.singleton,
				slugField: args.slugField,
				titleField: args.titleField,
				sortOrder: args.sortOrder,
			},
		);
	},
});
