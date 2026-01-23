/**
 * Content Type Query Functions
 *
 * Provides query functions for retrieving content type definitions from the CMS.
 * Content types are schema blueprints that define the structure of content entries.
 *
 * Available queries:
 * - `get`: Retrieve a single content type by ID or name
 * - `list`: List all content types with optional filtering, sorting, and pagination
 */

import { v } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server.js";
import { contentTypeDoc } from "./validators.js";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default number of items per page when not specified.
 */
const DEFAULT_NUM_ITEMS = 50;

/**
 * Maximum items per page to prevent excessive data fetching.
 */
const MAX_NUM_ITEMS = 250;

// =============================================================================
// Get Content Type Query
// =============================================================================

/**
 * Arguments for retrieving a single content type.
 *
 * Either `id` or `name` must be provided, but not both.
 * - Use `id` for direct document lookup (most efficient)
 * - Use `name` for lookup by machine-readable name (uses by_name index)
 */
const getContentTypeArgs = v.object({
	/** The ID of the content type to retrieve (direct lookup) */
	id: v.optional(v.id("contentTypes")),
	/** The machine-readable name of the content type (e.g., "blog_post") */
	name: v.optional(v.string()),
	/** Whether to include soft-deleted content types (default: false) */
	includeDeleted: v.optional(v.boolean()),
});

/**
 * Query to retrieve a single content type by ID or name.
 *
 * Returns the full content type definition including all field configurations.
 * This is useful for:
 * - Loading a content type's schema before creating entries
 * - Displaying content type information in admin interfaces
 * - Validating content against the type's field definitions
 *
 * @param id - The content type ID for direct lookup (most efficient)
 * @param name - The machine-readable name for index-based lookup
 * @param includeDeleted - Whether to return soft-deleted types (default: false)
 *
 * @returns The content type document, or null if not found
 *
 * @example
 * ```typescript
 * // Get by ID (fastest - direct document lookup)
 * const type = await ctx.runQuery(api.contentTypes.get, {
 *   id: contentTypeId,
 * });
 *
 * // Get by name (uses by_name index)
 * const blogType = await ctx.runQuery(api.contentTypes.get, {
 *   name: "blog_post",
 * });
 *
 * // Access field definitions
 * if (blogType) {
 *   console.log("Fields:", blogType.fields);
 *   console.log("Is singleton:", blogType.singleton);
 * }
 * ```
 */
export const get = query({
	args: getContentTypeArgs.fields,
	returns: v.union(contentTypeDoc, v.null()),
	handler: async (ctx, args) => {
		const { id, name, includeDeleted = false } = args;

		// Validate that at least one identifier is provided
		if (!id && !name) {
			// Return null if neither id nor name is provided
			// This matches the pattern used in other get functions
			return null;
		}

		let contentType;

		// Lookup by ID (direct document access - O(1))
		if (id) {
			contentType = await ctx.db.get(id);
		}
		// Lookup by name using the by_name index
		else if (name) {
			contentType = await ctx.db
				.query("contentTypes")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();
		}

		// Return null if not found
		if (!contentType) {
			return null;
		}

		// Filter out soft-deleted types unless explicitly requested
		if (!includeDeleted && isDeleted(contentType)) {
			return null;
		}

		return contentType;
	},
});

// =============================================================================
// List Content Types Query
// =============================================================================

/**
 * Sort field options for content type listing.
 */
const sortByValidator = v.optional(
	v.union(v.literal("name"), v.literal("createdAt")),
);

/**
 * Sort direction options.
 */
const sortDirectionValidator = v.optional(
	v.union(v.literal("asc"), v.literal("desc")),
);

/**
 * Arguments for listing content types with filtering and pagination.
 */
const listContentTypesArgs = v.object({
	/** Filter by active status: true = active only, false = inactive only, undefined = all */
	isActive: v.optional(v.boolean()),
	/** Whether to include soft-deleted content types (default: false) */
	includeDeleted: v.optional(v.boolean()),
	/** Field to sort by: "name" (alphabetical) or "createdAt" (by creation date). Default: "name" */
	sortBy: sortByValidator,
	/** Sort direction: "asc" (ascending) or "desc" (descending). Default: "asc" for name, "desc" for createdAt */
	sortDirection: sortDirectionValidator,
	/**
	 * Pagination options using standard Convex pagination format.
	 * Compatible with usePaginatedQuery hook on the client.
	 * If not provided, returns all matching results (non-paginated).
	 */
	paginationOpts: v.optional(paginationOptsValidator),
});

/**
 * Paginated response using standard Convex PaginationResult format.
 */
const paginatedContentTypesResponse = v.object({
	/** Array of content type documents for this page */
	page: v.array(contentTypeDoc),
	/** Cursor for fetching the next page (pass to next query's paginationOpts.cursor) */
	continueCursor: v.union(v.string(), v.null()),
	/** Whether this is the last page (no more results) */
	isDone: v.boolean(),
});

/**
 * Query to list all defined content types with optional filtering and sorting.
 *
 * Returns content type definitions sorted by name (alphabetically) or creation date.
 * Supports filtering by active status, soft-delete status, and cursor-based pagination.
 *
 * **Index Usage:**
 * - When filtering by `isActive`: Uses the `by_active` index for efficient filtering
 * - Without active filter: Performs a table scan (acceptable since content types are few)
 *
 * **Sorting Behavior:**
 * - `sortBy: "name"` (default): Sorts alphabetically by the machine-readable name
 * - `sortBy: "createdAt"`: Sorts by creation timestamp
 * - Default sort direction is "asc" for name, "desc" for createdAt
 *
 * @param isActive - Optional filter: true = active only, false = inactive only, undefined = all
 * @param includeDeleted - Whether to include soft-deleted types (default: false)
 * @param sortBy - Sort field: "name" (default) or "createdAt"
 * @param sortDirection - Sort direction: "asc" or "desc"
 * @param paginationOpts - Optional Convex pagination options (numItems, cursor)
 *
 * @returns PaginationResult with page, continueCursor, and isDone
 *
 * @example
 * ```typescript
 * // List all active content types sorted by name (most common use case)
 * const { page, continueCursor, isDone } = await ctx.runQuery(
 *   components.convexCms.contentTypes.list,
 *   {
 *     isActive: true,
 *     paginationOpts: { numItems: 20 },
 *   }
 * );
 *
 * // List all content types sorted by creation date (newest first)
 * const newest = await ctx.runQuery(
 *   components.convexCms.contentTypes.list,
 *   {
 *     sortBy: "createdAt",
 *     sortDirection: "desc",
 *     paginationOpts: { numItems: 10 },
 *   }
 * );
 *
 * // List inactive content types only (for admin cleanup views)
 * const inactive = await ctx.runQuery(
 *   components.convexCms.contentTypes.list,
 *   {
 *     isActive: false,
 *     paginationOpts: { numItems: 50 },
 *   }
 * );
 *
 * // Paginate through results using cursor
 * const page2 = await ctx.runQuery(
 *   components.convexCms.contentTypes.list,
 *   {
 *     isActive: true,
 *     paginationOpts: {
 *       numItems: 20,
 *       cursor: previousResult.continueCursor,
 *     },
 *   }
 * );
 *
 * // Use with usePaginatedQuery React hook
 * const { results, status, loadMore } = usePaginatedQuery(
 *   api.contentTypes.list,
 *   { isActive: true, sortBy: "name" },
 *   { initialNumItems: 20 }
 * );
 *
 * // Non-paginated mode (returns all matching content types)
 * const allTypes = await ctx.runQuery(
 *   components.convexCms.contentTypes.list,
 *   { isActive: true }
 * );
 * console.log("Total types:", allTypes.page.length);
 * ```
 */
export const list = query({
	args: listContentTypesArgs.fields,
	returns: paginatedContentTypesResponse,
	handler: async (ctx, args) => {
		const {
			isActive,
			includeDeleted = false,
			sortBy = "name",
			sortDirection,
			paginationOpts,
		} = args;

		// Determine default sort direction based on sortBy field
		// For name sorting, ascending (A-Z) is most intuitive
		// For date sorting, descending (newest first) is most intuitive
		const resolvedSortDirection =
			sortDirection ?? (sortBy === "name" ? "asc" : "desc");

		// Clamp numItems to valid range if pagination is requested
		const numItems = paginationOpts
			? Math.min(
					Math.max(1, paginationOpts.numItems ?? DEFAULT_NUM_ITEMS),
					MAX_NUM_ITEMS,
			  )
			: MAX_NUM_ITEMS; // When not paginating, fetch up to max

		// Build and execute query - choose strategy based on isActive filter
		let results;

		if (isActive !== undefined) {
			// Use by_active index for efficient filtering by active status
			results = await ctx.db
				.query("contentTypes")
				.withIndex("by_active", (q) => q.eq("isActive", isActive))
				.collect();
		} else {
			// Fetch all content types (no filter)
			results = await ctx.db.query("contentTypes").collect();
		}

		// Filter out soft-deleted types unless explicitly requested
		if (!includeDeleted) {
			results = results.filter((ct) => !isDeleted(ct));
		}

		// Apply sorting based on sortBy parameter
		if (sortBy === "name") {
			// Sort alphabetically by name (case-insensitive)
			results.sort((a, b) => {
				const nameA = a.name.toLowerCase();
				const nameB = b.name.toLowerCase();
				const comparison = nameA.localeCompare(nameB);
				return resolvedSortDirection === "asc" ? comparison : -comparison;
			});
		} else {
			// Sort by creation time
			results.sort((a, b) => {
				const comparison = a._creationTime - b._creationTime;
				return resolvedSortDirection === "asc" ? comparison : -comparison;
			});
		}

		// Handle cursor-based pagination
		let startIndex = 0;
		const cursor = paginationOpts?.cursor;

		if (cursor) {
			// Find the index of the cursor in results
			const cursorIndex = results.findIndex((ct) => ct._id === cursor);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		// Get the page of results (fetch one extra to determine if there's more)
		const pageResults = results.slice(startIndex, startIndex + numItems + 1);
		const isDone = pageResults.length <= numItems;
		const page = isDone ? pageResults : pageResults.slice(0, numItems);

		// Calculate continuation cursor
		const continueCursor =
			!isDone && page.length > 0 ? page[page.length - 1]._id : null;

		return {
			page,
			continueCursor,
			isDone,
		};
	},
});
