/**
 * Taxonomy Query Functions
 *
 * Provides query functions for retrieving taxonomy definitions and terms.
 * Taxonomies are classification systems (like tags, categories, topics) that
 * can be applied to content entries for organization and filtering.
 *
 * Available queries:
 * - `get`: Retrieve a single taxonomy by ID or name
 * - `list`: List all taxonomies with optional filtering
 * - `getTerm`: Retrieve a single term by ID or slug
 * - `listTerms`: List terms within a taxonomy with filtering and search
 * - `getTermsByEntry`: Get all terms associated with a content entry
 * - `getEntriesByTerm`: Get content entries associated with a term
 * - `suggestTerms`: Get term suggestions based on partial input
 */

import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server.js";
import { taxonomyDoc, taxonomyTermDoc } from "./validators.js";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_NUM_ITEMS = 50;
const MAX_NUM_ITEMS = 250;

// =============================================================================
// Extended Validators
// =============================================================================

/**
 * Term with children for hierarchical display.
 * Extends the base taxonomyTermDoc with a children array.
 */
const taxonomyTermWithChildren: ReturnType<typeof v.object> = v.object({
	...taxonomyTermDoc.fields,
	children: v.array(v.any()), // Recursive type - will contain taxonomyTermWithChildren
});

// =============================================================================
// Get Taxonomy Query
// =============================================================================

/**
 * Query to retrieve a single taxonomy by ID or name.
 *
 * @param id - The taxonomy ID for direct lookup (most efficient)
 * @param name - The machine-readable name for index-based lookup
 * @param includeDeleted - Whether to return soft-deleted taxonomies (default: false)
 *
 * @returns The taxonomy document, or null if not found
 *
 * @example
 * ```typescript
 * // Get by ID
 * const taxonomy = await ctx.runQuery(api.taxonomies.get, { id: taxonomyId });
 *
 * // Get by name
 * const tagsTaxonomy = await ctx.runQuery(api.taxonomies.get, { name: "tags" });
 * ```
 */
export const get = query({
	args: {
		id: v.optional(v.id("taxonomies")),
		name: v.optional(v.string()),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.union(taxonomyDoc, v.null()),
	handler: async (ctx, args) => {
		const { id, name, includeDeleted = false } = args;

		if (!id && !name) {
			return null;
		}

		let taxonomy;

		if (id) {
			taxonomy = await ctx.db.get(id);
		} else if (name) {
			taxonomy = await ctx.db
				.query("taxonomies")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();
		}

		if (!taxonomy) {
			return null;
		}

		if (!includeDeleted && taxonomy.deletedAt !== undefined) {
			return null;
		}

		return taxonomy;
	},
});

// =============================================================================
// List Taxonomies Query
// =============================================================================

/**
 * Query to list all taxonomies with optional filtering.
 *
 * @param isActive - Filter by active status
 * @param isHierarchical - Filter by hierarchical type
 * @param includeDeleted - Whether to include soft-deleted taxonomies
 * @param paginationOpts - Standard Convex pagination options
 *
 * @returns Paginated list of taxonomy documents
 *
 * @example
 * ```typescript
 * // List all active taxonomies
 * const taxonomies = await ctx.runQuery(api.taxonomies.list, {
 *   isActive: true,
 *   paginationOpts: { numItems: 20 },
 * });
 *
 * // List only flat taxonomies (like tags)
 * const flatTaxonomies = await ctx.runQuery(api.taxonomies.list, {
 *   isHierarchical: false,
 *   paginationOpts: { numItems: 20 },
 * });
 * ```
 */
export const list = query({
	args: {
		isActive: v.optional(v.boolean()),
		isHierarchical: v.optional(v.boolean()),
		includeDeleted: v.optional(v.boolean()),
		paginationOpts: v.optional(paginationOptsValidator),
	},
	returns: v.object({
		page: v.array(taxonomyDoc),
		continueCursor: v.union(v.string(), v.null()),
		isDone: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const {
			isActive,
			isHierarchical,
			includeDeleted = false,
			paginationOpts,
		} = args;

		const numItems = paginationOpts
			? Math.min(
					Math.max(1, paginationOpts.numItems ?? DEFAULT_NUM_ITEMS),
					MAX_NUM_ITEMS,
			  )
			: MAX_NUM_ITEMS;

		let results;

		if (isActive !== undefined) {
			results = await ctx.db
				.query("taxonomies")
				.withIndex("by_active", (q) => q.eq("isActive", isActive))
				.collect();
		} else {
			results = await ctx.db.query("taxonomies").collect();
		}

		// Apply post-filters
		if (!includeDeleted) {
			results = results.filter((t) => t.deletedAt === undefined);
		}

		if (isHierarchical !== undefined) {
			results = results.filter((t) => t.isHierarchical === isHierarchical);
		}

		// Sort by sortOrder, then name
		results.sort((a, b) => {
			const orderA = a.sortOrder ?? 999;
			const orderB = b.sortOrder ?? 999;
			if (orderA !== orderB) return orderA - orderB;
			return a.name.localeCompare(b.name);
		});

		// Handle pagination
		let startIndex = 0;
		if (paginationOpts?.cursor) {
			const cursorIndex = results.findIndex(
				(t) => t._id === paginationOpts.cursor,
			);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const pageResults = results.slice(startIndex, startIndex + numItems + 1);
		const isDone = pageResults.length <= numItems;
		const page = isDone ? pageResults : pageResults.slice(0, numItems);
		const continueCursor =
			!isDone && page.length > 0 ? page[page.length - 1]._id : null;

		return { page, continueCursor, isDone };
	},
});

// =============================================================================
// Get Term Query
// =============================================================================

/**
 * Query to retrieve a single taxonomy term by ID or slug.
 *
 * @param id - The term ID for direct lookup
 * @param taxonomyId - The taxonomy ID (required when looking up by slug)
 * @param slug - The term slug for lookup within a taxonomy
 * @param includeDeleted - Whether to return soft-deleted terms
 *
 * @returns The term document, or null if not found
 */
export const getTerm = query({
	args: {
		id: v.optional(v.id("taxonomyTerms")),
		taxonomyId: v.optional(v.id("taxonomies")),
		slug: v.optional(v.string()),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.union(taxonomyTermDoc, v.null()),
	handler: async (ctx, args) => {
		const { id, taxonomyId, slug, includeDeleted = false } = args;

		if (!id && (!taxonomyId || !slug)) {
			return null;
		}

		let term;

		if (id) {
			term = await ctx.db.get(id);
		} else if (taxonomyId && slug) {
			term = await ctx.db
				.query("taxonomyTerms")
				.withIndex("by_taxonomy_and_slug", (q) =>
					q.eq("taxonomyId", taxonomyId).eq("slug", slug),
				)
				.first();
		}

		if (!term) {
			return null;
		}

		if (!includeDeleted && term.deletedAt !== undefined) {
			return null;
		}

		return term;
	},
});

// =============================================================================
// List Terms Query
// =============================================================================

/**
 * Query to list terms within a taxonomy.
 *
 * @param taxonomyId - The taxonomy to list terms from (required)
 * @param parentId - Filter by parent term (for hierarchical navigation)
 * @param rootOnly - Only return root-level terms (depth = 0)
 * @param search - Search terms by name
 * @param includeDeleted - Whether to include soft-deleted terms
 * @param sortBy - Sort field: "name", "usageCount", "sortOrder"
 * @param sortDirection - Sort direction
 * @param paginationOpts - Standard Convex pagination options
 *
 * @returns Paginated list of term documents
 *
 * @example
 * ```typescript
 * // List all tags in a taxonomy
 * const tags = await ctx.runQuery(api.taxonomies.listTerms, {
 *   taxonomyId: tagsTaxonomyId,
 *   paginationOpts: { numItems: 50 },
 * });
 *
 * // List root categories only
 * const rootCategories = await ctx.runQuery(api.taxonomies.listTerms, {
 *   taxonomyId: categoriesTaxonomyId,
 *   rootOnly: true,
 *   paginationOpts: { numItems: 20 },
 * });
 *
 * // List children of a category
 * const children = await ctx.runQuery(api.taxonomies.listTerms, {
 *   taxonomyId: categoriesTaxonomyId,
 *   parentId: parentCategoryId,
 *   paginationOpts: { numItems: 20 },
 * });
 *
 * // Sort by popularity (usage count)
 * const popularTags = await ctx.runQuery(api.taxonomies.listTerms, {
 *   taxonomyId: tagsTaxonomyId,
 *   sortBy: "usageCount",
 *   sortDirection: "desc",
 *   paginationOpts: { numItems: 20 },
 * });
 * ```
 */
export const listTerms = query({
	args: {
		taxonomyId: v.id("taxonomies"),
		parentId: v.optional(v.id("taxonomyTerms")),
		rootOnly: v.optional(v.boolean()),
		search: v.optional(v.string()),
		includeDeleted: v.optional(v.boolean()),
		sortBy: v.optional(
			v.union(
				v.literal("name"),
				v.literal("usageCount"),
				v.literal("sortOrder"),
			),
		),
		sortDirection: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
		paginationOpts: v.optional(paginationOptsValidator),
	},
	returns: v.object({
		page: v.array(taxonomyTermDoc),
		continueCursor: v.union(v.string(), v.null()),
		isDone: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const {
			taxonomyId,
			parentId,
			rootOnly,
			search,
			includeDeleted = false,
			sortBy = "name",
			sortDirection = "asc",
			paginationOpts,
		} = args;

		const numItems = paginationOpts
			? Math.min(
					Math.max(1, paginationOpts.numItems ?? DEFAULT_NUM_ITEMS),
					MAX_NUM_ITEMS,
			  )
			: MAX_NUM_ITEMS;

		let results;

		// Use search index if searching
		if (search && search.trim().length > 0) {
			results = await ctx.db
				.query("taxonomyTerms")
				.withSearchIndex("search_terms", (q) =>
					q.search("searchText", search.trim()).eq("taxonomyId", taxonomyId),
				)
				.take(numItems * 4); // Fetch extra for post-filtering
		} else if (parentId !== undefined) {
			// Filter by parent
			results = await ctx.db
				.query("taxonomyTerms")
				.withIndex("by_parent", (q) => q.eq("parentId", parentId))
				.collect();
			// Additional filter for taxonomy (parent could be cross-taxonomy in theory)
			results = results.filter((t) => t.taxonomyId === taxonomyId);
		} else {
			// Get all terms in taxonomy
			results = await ctx.db
				.query("taxonomyTerms")
				.withIndex("by_taxonomy", (q) => q.eq("taxonomyId", taxonomyId))
				.collect();
		}

		// Apply post-filters
		if (!includeDeleted) {
			results = results.filter((t) => t.deletedAt === undefined);
		}

		if (rootOnly) {
			results = results.filter((t) => t.depth === 0);
		}

		// Sort results
		results.sort((a, b) => {
			let comparison = 0;
			switch (sortBy) {
				case "usageCount":
					comparison = a.usageCount - b.usageCount;
					break;
				case "sortOrder":
					comparison = (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
					break;
				case "name":
				default:
					comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
					break;
			}
			return sortDirection === "asc" ? comparison : -comparison;
		});

		// Handle pagination
		let startIndex = 0;
		if (paginationOpts?.cursor) {
			const cursorIndex = results.findIndex(
				(t) => t._id === paginationOpts.cursor,
			);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const pageResults = results.slice(startIndex, startIndex + numItems + 1);
		const isDone = pageResults.length <= numItems;
		const page = isDone ? pageResults : pageResults.slice(0, numItems);
		const continueCursor =
			!isDone && page.length > 0 ? page[page.length - 1]._id : null;

		return { page, continueCursor, isDone };
	},
});

// =============================================================================
// Get Hierarchical Terms Query
// =============================================================================

/**
 * Query to get all terms in a taxonomy as a hierarchical tree structure.
 *
 * This is useful for rendering nested category selectors or tree views.
 * Returns terms with their children nested in a tree structure.
 *
 * @param taxonomyId - The taxonomy to get terms from
 * @param includeDeleted - Whether to include soft-deleted terms
 *
 * @returns Array of root terms with nested children
 *
 * @example
 * ```typescript
 * const tree = await ctx.runQuery(api.taxonomies.getTermsHierarchy, {
 *   taxonomyId: categoriesTaxonomyId,
 * });
 * // Returns: [
 * //   { name: "Tech", children: [{ name: "Web Dev", children: [...] }] },
 * //   { name: "Design", children: [...] },
 * // ]
 * ```
 */
export const getTermsHierarchy = query({
	args: {
		taxonomyId: v.id("taxonomies"),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.array(taxonomyTermWithChildren),
	handler: async (ctx, args) => {
		const { taxonomyId, includeDeleted = false } = args;

		// Get all terms in the taxonomy
		let terms = await ctx.db
			.query("taxonomyTerms")
			.withIndex("by_taxonomy", (q) => q.eq("taxonomyId", taxonomyId))
			.collect();

		// Filter deleted if needed
		if (!includeDeleted) {
			terms = terms.filter((t) => t.deletedAt === undefined);
		}

		// Sort by sortOrder, then name
		terms.sort((a, b) => {
			const orderA = a.sortOrder ?? 999;
			const orderB = b.sortOrder ?? 999;
			if (orderA !== orderB) return orderA - orderB;
			return a.name.localeCompare(b.name);
		});

		// Build tree structure
		const termMap = new Map<string, any>();
		const rootTerms: any[] = [];

		// First pass: create term objects with empty children
		for (const term of terms) {
			termMap.set(term._id, { ...term, children: [] });
		}

		// Second pass: link parents to children
		for (const term of terms) {
			const termWithChildren = termMap.get(term._id);
			if (term.parentId && termMap.has(term.parentId)) {
				const parent = termMap.get(term.parentId);
				parent.children.push(termWithChildren);
			} else {
				rootTerms.push(termWithChildren);
			}
		}

		return rootTerms;
	},
});

// =============================================================================
// Suggest Terms Query
// =============================================================================

/**
 * Query to get term suggestions based on partial input.
 *
 * This is useful for autocomplete functionality when users are selecting
 * or creating tags. Returns matching terms sorted by relevance and usage.
 *
 * @param taxonomyId - The taxonomy to search within
 * @param query - The partial input to match against term names
 * @param limit - Maximum number of suggestions to return (default: 10)
 * @param excludeIds - Term IDs to exclude from suggestions (already selected)
 *
 * @returns Array of matching terms
 *
 * @example
 * ```typescript
 * const suggestions = await ctx.runQuery(api.taxonomies.suggestTerms, {
 *   taxonomyId: tagsTaxonomyId,
 *   query: "java",
 *   limit: 5,
 *   excludeIds: alreadySelectedTagIds,
 * });
 * // Returns: [{ name: "JavaScript" }, { name: "Java" }, { name: "JavaFX" }]
 * ```
 */
export const suggestTerms = query({
	args: {
		taxonomyId: v.id("taxonomies"),
		query: v.string(),
		limit: v.optional(v.number()),
		excludeIds: v.optional(v.array(v.id("taxonomyTerms"))),
	},
	returns: v.array(taxonomyTermDoc),
	handler: async (ctx, args) => {
		const {
			taxonomyId,
			query: searchQuery,
			limit = 10,
			excludeIds = [],
		} = args;

		const excludeSet = new Set(excludeIds);

		if (!searchQuery || searchQuery.trim().length === 0) {
			// Return popular terms if no query
			const terms = await ctx.db
				.query("taxonomyTerms")
				.withIndex("by_taxonomy_and_usage", (q) =>
					q.eq("taxonomyId", taxonomyId),
				)
				.order("desc")
				.take(limit * 2);

			return terms
				.filter((t) => t.deletedAt === undefined && !excludeSet.has(t._id))
				.slice(0, limit);
		}

		// Search for matching terms
		const terms = await ctx.db
			.query("taxonomyTerms")
			.withSearchIndex("search_terms", (q) =>
				q.search("searchText", searchQuery.trim()).eq("taxonomyId", taxonomyId),
			)
			.take(limit * 2);

		// Filter and limit
		const filtered = terms.filter(
			(t) => t.deletedAt === undefined && !excludeSet.has(t._id),
		);

		// Sort by: exact prefix match first, then usage count
		const query = searchQuery.toLowerCase();
		filtered.sort((a, b) => {
			const aExact = a.name.toLowerCase().startsWith(query) ? 0 : 1;
			const bExact = b.name.toLowerCase().startsWith(query) ? 0 : 1;
			if (aExact !== bExact) return aExact - bExact;
			return b.usageCount - a.usageCount;
		});

		return filtered.slice(0, limit);
	},
});

// =============================================================================
// Get Terms by Entry Query
// =============================================================================

/**
 * Query to get all taxonomy terms associated with a content entry.
 *
 * @param entryId - The content entry ID
 * @param taxonomyId - Optional taxonomy filter
 * @param fieldName - Optional field name filter
 *
 * @returns Array of terms associated with the entry
 *
 * @example
 * ```typescript
 * // Get all tags for an entry
 * const entryTags = await ctx.runQuery(api.taxonomies.getTermsByEntry, {
 *   entryId: blogPostId,
 * });
 *
 * // Get only tags from a specific field
 * const primaryTags = await ctx.runQuery(api.taxonomies.getTermsByEntry, {
 *   entryId: blogPostId,
 *   fieldName: "tags",
 * });
 * ```
 */
export const getTermsByEntry = query({
	args: {
		entryId: v.id("contentEntries"),
		taxonomyId: v.optional(v.id("taxonomies")),
		fieldName: v.optional(v.string()),
	},
	returns: v.array(
		v.object({
			...taxonomyTermDoc.fields,
			fieldName: v.string(),
			sortOrder: v.optional(v.number()),
		}),
	),
	handler: async (ctx, args) => {
		const { entryId, taxonomyId, fieldName } = args;

		// Get the junction table entries
		let junctionQuery = ctx.db
			.query("contentEntryTags")
			.withIndex("by_entry", (q) => q.eq("entryId", entryId));

		const junctionEntries = await junctionQuery.collect();

		// Filter by taxonomy or field if specified
		let filtered = junctionEntries;
		if (taxonomyId) {
			filtered = filtered.filter((j) => j.taxonomyId === taxonomyId);
		}
		if (fieldName) {
			filtered = filtered.filter((j) => j.fieldName === fieldName);
		}

		// Sort by sortOrder
		filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

		// Fetch the actual terms
		const results = [];
		for (const junction of filtered) {
			const term = await ctx.db.get(junction.termId);
			if (term && term.deletedAt === undefined) {
				results.push({
					...term,
					fieldName: junction.fieldName,
					sortOrder: junction.sortOrder,
				});
			}
		}

		return results;
	},
});

// =============================================================================
// Get Entries by Term Query
// =============================================================================

/**
 * Query to get content entries that have a specific term.
 *
 * @param termId - The term ID to search for
 * @param status - Optional entry status filter
 * @param paginationOpts - Standard Convex pagination options
 *
 * @returns Paginated list of entry IDs with the term
 *
 * @example
 * ```typescript
 * // Get all entries with a specific tag
 * const entriesWithTag = await ctx.runQuery(api.taxonomies.getEntriesByTerm, {
 *   termId: javascriptTagId,
 *   status: "published",
 *   paginationOpts: { numItems: 20 },
 * });
 * ```
 */
export const getEntriesByTerm = query({
	args: {
		termId: v.id("taxonomyTerms"),
		status: v.optional(
			v.union(
				v.literal("draft"),
				v.literal("published"),
				v.literal("archived"),
				v.literal("scheduled"),
			),
		),
		paginationOpts: v.optional(paginationOptsValidator),
	},
	returns: v.object({
		page: v.array(v.id("contentEntries")),
		continueCursor: v.union(v.string(), v.null()),
		isDone: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const { termId, status, paginationOpts } = args;

		const numItems = paginationOpts
			? Math.min(
					Math.max(1, paginationOpts.numItems ?? DEFAULT_NUM_ITEMS),
					MAX_NUM_ITEMS,
			  )
			: DEFAULT_NUM_ITEMS;

		// Get junction entries for this term
		const junctionEntries = await ctx.db
			.query("contentEntryTags")
			.withIndex("by_term", (q) => q.eq("termId", termId))
			.collect();

		// Get unique entry IDs
		const entryIds = [...new Set(junctionEntries.map((j) => j.entryId))];

		// Filter by status if needed
		let filteredEntryIds = entryIds;
		if (status) {
			const validEntryIds: typeof entryIds = [];
			for (const entryId of entryIds) {
				const entry = await ctx.db.get(entryId);
				if (entry && entry.status === status && entry.deletedAt === undefined) {
					validEntryIds.push(entryId);
				}
			}
			filteredEntryIds = validEntryIds;
		}

		// Handle pagination
		let startIndex = 0;
		if (paginationOpts?.cursor) {
			const cursorIndex = filteredEntryIds.findIndex(
				(id) => id === paginationOpts.cursor,
			);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const pageResults = filteredEntryIds.slice(
			startIndex,
			startIndex + numItems + 1,
		);
		const isDone = pageResults.length <= numItems;
		const page = isDone ? pageResults : pageResults.slice(0, numItems);
		const continueCursor =
			!isDone && page.length > 0 ? page[page.length - 1] : null;

		return { page, continueCursor, isDone };
	},
});

// =============================================================================
// Count Terms Query
// =============================================================================

/**
 * Query to count terms in a taxonomy.
 *
 * @param taxonomyId - The taxonomy to count terms in
 * @param includeDeleted - Whether to include soft-deleted terms
 *
 * @returns Object containing the count
 */
export const countTerms = query({
	args: {
		taxonomyId: v.id("taxonomies"),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.object({
		count: v.number(),
	}),
	handler: async (ctx, args) => {
		const { taxonomyId, includeDeleted = false } = args;

		const terms = await ctx.db
			.query("taxonomyTerms")
			.withIndex("by_taxonomy", (q) => q.eq("taxonomyId", taxonomyId))
			.collect();

		const filteredTerms = includeDeleted
			? terms
			: terms.filter((t) => t.deletedAt === undefined);

		return { count: filteredTerms.length };
	},
});
