/**
 * Content Entry Query Functions
 *
 * Provides query functions for retrieving content entries from the CMS.
 * Content entries are instances of content types that hold the actual content data.
 *
 * Uses convex-helpers paginator for robust cursor-based pagination.
 */

import { v, type Infer } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { stream } from "convex-helpers/server/stream";
import { query } from "./_generated/server.js";
import { contentEntryDoc, contentVersionDoc } from "./validators.js";
import { contentStatusValidator } from "./schema.js";
import schema from "./schema.js";

/**
 * Arguments for retrieving a single content entry.
 */
const getContentEntryArgs = v.object({
  /** The ID of the content entry to retrieve */
  id: v.id("content_entries"),
  /** Whether to include the latest version info in the response */
  includeVersion: v.optional(v.boolean()),
});

/**
 * Return type for the get query when includeVersion is true.
 * Extends the base content entry document with optional version information.
 */
const contentEntryWithVersionDoc = v.object({
  ...contentEntryDoc.fields,
  /** The latest version snapshot (included when includeVersion is true) */
  latestVersion: v.optional(contentVersionDoc),
});

/**
 * Query to retrieve a single content entry by ID.
 *
 * Returns full content data including metadata and status.
 * Optionally includes the latest version info when `includeVersion` is true.
 *
 * @param id - The content entry ID to retrieve
 * @param includeVersion - Whether to include version info (default: false)
 * @returns The content entry document, or null if not found or deleted
 *
 * @example
 * ```typescript
 * // Basic usage - get entry by ID
 * const entry = await ctx.runQuery(api.contentEntries.get, {
 *   id: entryId,
 * });
 *
 * // With version info
 * const entryWithVersion = await ctx.runQuery(api.contentEntries.get, {
 *   id: entryId,
 *   includeVersion: true,
 * });
 * if (entryWithVersion?.latestVersion) {
 *   console.log("Current version:", entryWithVersion.latestVersion.versionNumber);
 * }
 * ```
 */
export const get = query({
  args: getContentEntryArgs.fields,
  returns: v.union(contentEntryWithVersionDoc, v.null()),
  handler: async (ctx, args) => {
    // Retrieve the content entry by ID
    const entry = await ctx.db.get(args.id);

    // Return null if entry doesn't exist
    if (!entry) {
      return null;
    }

    // Return null if entry has been soft-deleted
    // (respects the soft delete feature - deleted entries should not be returned)
    if (entry.deletedAt !== undefined) {
      return null;
    }

    // If version info is requested, fetch the latest version
    if (args.includeVersion) {
      const latestVersion = await ctx.db
        .query("content_versions")
        .withIndex("by_entry_and_version", (q) =>
          q.eq("entryId", args.id).eq("versionNumber", entry.version)
        )
        .first();

      return {
        ...entry,
        latestVersion: latestVersion ?? undefined,
      };
    }

    // Return the entry without version info
    return {
      ...entry,
      latestVersion: undefined,
    };
  },
});

// =============================================================================
// Slug-Based Queries
// =============================================================================

/**
 * Arguments for retrieving a content entry by slug.
 */
const getBySlugArgs = v.object({
  /** The ID of the content type to search within */
  contentTypeId: v.id("content_types"),
  /** The URL-friendly slug to look up */
  slug: v.string(),
  /** Optional status filter (e.g., "published" for public content) */
  status: v.optional(contentStatusValidator),
  /** Whether to include soft-deleted entries (default: false) */
  includeDeleted: v.optional(v.boolean()),
});

/**
 * Arguments for retrieving a content entry by slug and content type name.
 */
const getBySlugAndTypeNameArgs = v.object({
  /** The machine-readable name of the content type (e.g., "blog_post") */
  contentTypeName: v.string(),
  /** The URL-friendly slug to look up */
  slug: v.string(),
  /** Optional status filter (e.g., "published" for public content) */
  status: v.optional(contentStatusValidator),
  /** Whether to include soft-deleted entries (default: false) */
  includeDeleted: v.optional(v.boolean()),
});

/**
 * Query to retrieve a content entry by its slug and content type ID.
 *
 * This is the primary lookup function for frontend routing and SEO-friendly URLs.
 * It uses the `by_content_type_and_slug` index for efficient O(1) lookups.
 *
 * @param contentTypeId - The ID of the content type to search within
 * @param slug - The URL-friendly slug to look up
 * @param status - Optional status filter (defaults to returning any status)
 * @param includeDeleted - Whether to include soft-deleted entries (defaults to false)
 *
 * @returns The content entry if found, or null if not found
 *
 * @example
 * ```typescript
 * // From parent app - basic usage:
 * const blogPost = await ctx.runQuery(components.convexCms.contentEntries.getBySlug, {
 *   contentTypeId: blogTypeId,
 *   slug: "my-first-post",
 * });
 *
 * // With status filter for published content only (common for public sites):
 * const publishedPost = await ctx.runQuery(components.convexCms.contentEntries.getBySlug, {
 *   contentTypeId: blogTypeId,
 *   slug: "my-first-post",
 *   status: "published",
 * });
 *
 * // Frontend routing example:
 * // URL: /blog/my-first-post
 * // -> Extract slug "my-first-post" from URL
 * // -> Query: getBySlug({ contentTypeId: blogTypeId, slug: "my-first-post", status: "published" })
 * ```
 */
export const getBySlug = query({
  args: getBySlugArgs.fields,
  returns: v.union(contentEntryDoc, v.null()),
  handler: async (ctx, args) => {
    const { contentTypeId, slug, status, includeDeleted = false } = args;

    // Query using the compound index for efficient lookup
    // The by_content_type_and_slug index enables O(1) lookups
    const entry = await ctx.db
      .query("content_entries")
      .withIndex("by_content_type_and_slug", (q) =>
        q.eq("contentTypeId", contentTypeId).eq("slug", slug)
      )
      .first();

    // Return null if no entry found
    if (!entry) {
      return null;
    }

    // Filter out soft-deleted entries unless explicitly requested
    if (!includeDeleted && entry.deletedAt !== undefined) {
      return null;
    }

    // Filter by status if specified
    if (status !== undefined && entry.status !== status) {
      return null;
    }

    return entry;
  },
});

/**
 * Query to retrieve a content entry by its slug and content type name.
 *
 * This is a convenience function that looks up the content type by name first,
 * then retrieves the entry by slug. Useful when you have the content type name
 * (e.g., "blog_post") but not its ID.
 *
 * Note: This performs two index lookups (content type by name, then entry by slug),
 * so `getBySlug` is more efficient if you already have the content type ID cached.
 *
 * @param contentTypeName - The machine-readable name of the content type (e.g., "blog_post")
 * @param slug - The URL-friendly slug to look up
 * @param status - Optional status filter (defaults to returning any status)
 * @param includeDeleted - Whether to include soft-deleted entries (defaults to false)
 *
 * @returns The content entry if found, or null if not found (including if content type doesn't exist)
 *
 * @example
 * ```typescript
 * // From parent app - using content type name instead of ID:
 * const blogPost = await ctx.runQuery(components.convexCms.contentEntries.getBySlugAndTypeName, {
 *   contentTypeName: "blog_post",
 *   slug: "my-first-post",
 *   status: "published",
 * });
 *
 * // Useful for static routes where content type is known at build time:
 * // /blog/[slug] -> contentTypeName: "blog_post"
 * // /products/[slug] -> contentTypeName: "product"
 * // /pages/[slug] -> contentTypeName: "page"
 * ```
 */
export const getBySlugAndTypeName = query({
  args: getBySlugAndTypeNameArgs.fields,
  returns: v.union(contentEntryDoc, v.null()),
  handler: async (ctx, args) => {
    const { contentTypeName, slug, status, includeDeleted = false } = args;

    // First, look up the content type by name using the by_name index
    const contentType = await ctx.db
      .query("content_types")
      .withIndex("by_name", (q) => q.eq("name", contentTypeName))
      .first();

    // Return null if content type doesn't exist
    if (!contentType) {
      return null;
    }

    // Check if content type is active and not deleted
    // Inactive or deleted content types should not serve content
    if (!contentType.isActive || contentType.deletedAt !== undefined) {
      return null;
    }

    // Query the entry using the compound index
    const entry = await ctx.db
      .query("content_entries")
      .withIndex("by_content_type_and_slug", (q) =>
        q.eq("contentTypeId", contentType._id).eq("slug", slug)
      )
      .first();

    // Return null if no entry found
    if (!entry) {
      return null;
    }

    // Filter out soft-deleted entries unless explicitly requested
    if (!includeDeleted && entry.deletedAt !== undefined) {
      return null;
    }

    // Filter by status if specified
    if (status !== undefined && entry.status !== status) {
      return null;
    }

    return entry;
  },
});

// =============================================================================
// List Query with Cursor-Based Pagination
// =============================================================================

/**
 * Default number of items per page when not specified.
 */
const DEFAULT_NUM_ITEMS = 50;

/**
 * Maximum items per page to prevent excessive data fetching.
 */
const MAX_NUM_ITEMS = 250;

/**
 * Arguments for listing content entries with filtering and pagination.
 * Uses convex-helpers paginator for robust cursor-based pagination.
 */
const listContentEntriesArgs = v.object({
  /** Filter by content type ID */
  contentTypeId: v.optional(v.id("content_types")),
  /** Filter by content type name (alternative to contentTypeId) */
  contentTypeName: v.optional(v.string()),
  /** Filter by a single entry status (draft, published, archived, scheduled) */
  status: v.optional(contentStatusValidator),
  /** Filter by multiple statuses (e.g., ["draft", "scheduled"] for admin views) */
  statusIn: v.optional(v.array(contentStatusValidator)),
  /** Filter by locale code (e.g., "en-US") */
  locale: v.optional(v.string()),
  /** Full-text search query to match against entry content */
  search: v.optional(v.string()),
  /** Whether to include soft-deleted entries (default: false) */
  includeDeleted: v.optional(v.boolean()),
  /**
   * Pagination options using standard Convex pagination format.
   * Compatible with usePaginatedQuery hook on the client.
   */
  paginationOpts: paginationOptsValidator,
});

/**
 * Paginated response using standard Convex PaginationResult format.
 *
 * This format is compatible with:
 * - Convex's usePaginatedQuery React hook
 * - convex-helpers paginator
 * - Standard Convex pagination patterns
 */
const paginatedContentEntriesResponse = v.object({
  /** Array of content entry documents for this page */
  page: v.array(contentEntryDoc),
  /** Cursor for fetching the next page (pass to next query's paginationOpts.cursor) */
  continueCursor: v.union(v.string(), v.null()),
  /** Whether this is the last page (no more results) */
  isDone: v.boolean(),
});

/**
 * Query to list content entries with filtering, search, and cursor-based pagination.
 *
 * This is the primary function for retrieving multiple content entries.
 * It uses the convex-helpers paginator for robust cursor-based pagination that
 * integrates seamlessly with Convex's usePaginatedQuery hook.
 *
 * The query intelligently selects the most efficient index based on the
 * provided filters:
 * - Full-text search: Uses the `search_content` search index
 * - Type + Status filter: Uses the `by_content_type_and_status` index
 * - Type only: Uses the `by_content_type` index
 * - Status only: Uses the `by_status` index
 * - Locale filter: Uses the `by_locale` index
 *
 * @param contentTypeId - Optional content type ID to filter by
 * @param contentTypeName - Optional content type name (resolved to ID internally)
 * @param status - Optional status filter (draft, published, archived, scheduled)
 * @param statusIn - Optional array of statuses to filter by (for admin views)
 * @param locale - Optional locale code to filter by
 * @param search - Optional full-text search query
 * @param includeDeleted - Whether to include soft-deleted entries (default: false)
 * @param paginationOpts - Standard Convex pagination options (numItems, cursor)
 *
 * @returns PaginationResult with page, continueCursor, and isDone
 *
 * @example
 * ```typescript
 * // List all published blog posts (frontend use case)
 * const { page, continueCursor, isDone } = await ctx.runQuery(
 *   components.convexCms.contentEntries.list,
 *   {
 *     contentTypeName: "blog_post",
 *     status: "published",
 *     paginationOpts: { numItems: 10 },
 *   }
 * );
 *
 * // List entries with multiple statuses (admin use case)
 * // Shows draft and scheduled content for editorial workflow
 * const editorialContent = await ctx.runQuery(
 *   components.convexCms.contentEntries.list,
 *   {
 *     contentTypeName: "blog_post",
 *     statusIn: ["draft", "scheduled"],
 *     paginationOpts: { numItems: 20 },
 *   }
 * );
 *
 * // Paginate through results using continueCursor
 * const page2 = await ctx.runQuery(
 *   components.convexCms.contentEntries.list,
 *   {
 *     contentTypeName: "blog_post",
 *     paginationOpts: {
 *       numItems: 10,
 *       cursor: previousResult.continueCursor,
 *     },
 *   }
 * );
 *
 * // Full-text search with pagination
 * const results = await ctx.runQuery(
 *   components.convexCms.contentEntries.list,
 *   {
 *     search: "typescript tutorial",
 *     status: "published",
 *     paginationOpts: { numItems: 10 },
 *   }
 * );
 *
 * // Use with usePaginatedQuery React hook
 * const { results, status, loadMore } = usePaginatedQuery(
 *   api.contentEntries.list,
 *   { contentTypeName: "blog_post", status: "published" },
 *   { initialNumItems: 10 }
 * );
 * ```
 */
export const list = query({
  args: listContentEntriesArgs.fields,
  returns: paginatedContentEntriesResponse,
  handler: async (ctx, args) => {
    const {
      contentTypeId,
      contentTypeName,
      status,
      statusIn,
      locale,
      search,
      includeDeleted = false,
      paginationOpts,
    } = args;

    // Resolve status filter: statusIn takes precedence, then status
    // This allows filtering by multiple statuses (e.g., ["draft", "scheduled"])
    const resolvedStatuses: string[] | undefined = statusIn?.length
      ? statusIn
      : status
        ? [status]
        : undefined;

    // Clamp numItems to valid range
    const numItems = Math.min(
      Math.max(1, paginationOpts.numItems ?? DEFAULT_NUM_ITEMS),
      MAX_NUM_ITEMS
    );

    const clampedPaginationOpts = {
      ...paginationOpts,
      numItems,
    };

    // Resolve content type ID from name if provided
    let resolvedContentTypeId = contentTypeId;
    if (!resolvedContentTypeId && contentTypeName) {
      const contentType = await ctx.db
        .query("content_types")
        .withIndex("by_name", (q) => q.eq("name", contentTypeName))
        .first();

      // If content type not found or inactive, return empty result
      if (!contentType || !contentType.isActive || contentType.deletedAt !== undefined) {
        return { page: [], continueCursor: null, isDone: true };
      }

      resolvedContentTypeId = contentType._id;
    }

    // Handle full-text search queries (cannot use paginator for search indexes)
    if (search && search.trim().length > 0) {
      return handleSearchQuery(ctx, {
        search: search.trim(),
        contentTypeId: resolvedContentTypeId,
        statuses: resolvedStatuses,
        locale,
        includeDeleted,
        paginationOpts: clampedPaginationOpts,
      });
    }

    // Handle standard index-based queries with paginator
    return handlePaginatorQuery(ctx, {
      contentTypeId: resolvedContentTypeId,
      statuses: resolvedStatuses,
      locale,
      includeDeleted,
      paginationOpts: clampedPaginationOpts,
    });
  },
});

// Type for pagination options
type PaginationOpts = Infer<typeof paginationOptsValidator>;

// Type for pagination result
interface ContentEntryPaginationResult {
  page: any[];
  continueCursor: string | null;
  isDone: boolean;
}

/**
 * Internal helper to handle full-text search queries.
 * Uses the search_content search index for efficient text matching.
 *
 * Note: Convex search indexes don't support the paginator directly,
 * so we implement cursor-based pagination manually for search queries.
 * When filtering by multiple statuses, we query without status filter and
 * apply status filtering in post-processing.
 */
async function handleSearchQuery(
  ctx: any,
  args: {
    search: string;
    contentTypeId?: any;
    statuses?: string[];
    locale?: string;
    includeDeleted: boolean;
    paginationOpts: PaginationOpts;
  }
): Promise<ContentEntryPaginationResult> {
  const { search, contentTypeId, statuses, locale, includeDeleted, paginationOpts } = args;
  const { numItems, cursor } = paginationOpts;

  // Determine if we can use index-level status filtering
  // Only possible when filtering by exactly one status
  const singleStatus = statuses?.length === 1 ? statuses[0] : undefined;

  // Build search query with filter fields
  // The search_content index supports filtering by contentTypeId, status, and locale
  let searchQuery = ctx.db
    .query("content_entries")
    .withSearchIndex("search_content", (q: any) => {
      let query = q.search("searchText", search);

      // Apply filter fields available in the search index
      if (contentTypeId) {
        query = query.eq("contentTypeId", contentTypeId);
      }
      // Only apply index-level status filter for single status
      if (singleStatus) {
        query = query.eq("status", singleStatus);
      }
      if (locale) {
        query = query.eq("locale", locale);
      }

      return query;
    });

  // For multiple status filtering and soft-delete, we need to fetch more results
  // to ensure we have enough after post-filtering
  const fetchMultiplier = (statuses && statuses.length > 1) || !includeDeleted ? 4 : 1;
  const results = await searchQuery.take((numItems + 1) * fetchMultiplier);

  // Apply post-processing filters
  let filteredResults = results;

  // Filter by soft-delete status
  if (!includeDeleted) {
    filteredResults = filteredResults.filter(
      (entry: any) => entry.deletedAt === undefined
    );
  }

  // Filter by multiple statuses (when not using index-level filtering)
  if (statuses && statuses.length > 1) {
    filteredResults = filteredResults.filter((entry: any) =>
      statuses.includes(entry.status)
    );
  }

  // Handle cursor-based pagination for search results
  let startIndex = 0;
  if (cursor) {
    // Find the index of the cursor in results
    const cursorIndex = filteredResults.findIndex(
      (entry: any) => entry._id === cursor
    );
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Get the page of results
  const pageResults = filteredResults.slice(startIndex, startIndex + numItems + 1);
  const isDone = pageResults.length <= numItems;
  const page = isDone ? pageResults : pageResults.slice(0, numItems);

  // Get continuation cursor
  const continueCursor =
    !isDone && page.length > 0 ? page[page.length - 1]._id : null;

  return {
    page,
    continueCursor,
    isDone,
  };
}

/**
 * Internal helper to handle index-based queries using convex-helpers stream.
 * Selects the optimal index based on provided filters and uses the stream
 * helper for efficient cursor-based pagination with filtering support.
 *
 * When filtering by multiple statuses, uses filterWith for post-processing
 * while maintaining efficient pagination.
 */
async function handlePaginatorQuery(
  ctx: any,
  args: {
    contentTypeId?: any;
    statuses?: string[];
    locale?: string;
    includeDeleted: boolean;
    paginationOpts: PaginationOpts;
  }
): Promise<ContentEntryPaginationResult> {
  const { contentTypeId, statuses, locale, includeDeleted, paginationOpts } = args;

  // Determine if we can use index-level status filtering
  // Only possible when filtering by exactly one status
  const singleStatus = statuses?.length === 1 ? statuses[0] : undefined;

  // Create stream with schema for type-safe pagination with filtering
  const streamDb = stream(ctx.db, schema);

  // Build the base query using the most efficient index
  let baseQuery;

  if (contentTypeId && singleStatus) {
    // Use compound index for content type + single status filtering
    baseQuery = streamDb
      .query("content_entries")
      .withIndex("by_content_type_and_status", (q) =>
        q.eq("contentTypeId", contentTypeId).eq("status", singleStatus as any)
      );
  } else if (contentTypeId) {
    // Use content type index
    baseQuery = streamDb
      .query("content_entries")
      .withIndex("by_content_type", (q) =>
        q.eq("contentTypeId", contentTypeId)
      );
  } else if (singleStatus) {
    // Use status index for single status
    baseQuery = streamDb
      .query("content_entries")
      .withIndex("by_status", (q) => q.eq("status", singleStatus as any));
  } else if (locale) {
    // Use locale index
    baseQuery = streamDb
      .query("content_entries")
      .withIndex("by_locale", (q) => q.eq("locale", locale));
  } else {
    // No specific filter - use creation time index (most efficient for full scans)
    baseQuery = streamDb.query("content_entries");
  }

  // Determine if we need post-processing filters
  const needsFiltering =
    !includeDeleted ||
    (statuses && statuses.length > 1) ||
    (locale && !contentTypeId && !singleStatus);

  // Apply order (descending for newest first) and optional filtering
  const orderedQuery = baseQuery.order("desc");

  // If filtering is needed, use filterWith; otherwise use direct pagination
  if (needsFiltering) {
    const filteredQuery = orderedQuery.filterWith(async (entry: any) => {
      // Filter out soft-deleted entries
      if (!includeDeleted && entry.deletedAt !== undefined) {
        return false;
      }

      // Filter by multiple statuses (when not already filtered by index)
      if (statuses && statuses.length > 1) {
        if (!statuses.includes(entry.status)) {
          return false;
        }
      }

      // Filter by locale if not already handled by index
      if (locale && !contentTypeId && !singleStatus) {
        if (entry.locale !== locale) {
          return false;
        }
      }

      return true;
    });

    // Execute pagination with maximumRowsRead for safety when filtering
    const result = await filteredQuery.paginate({
      ...paginationOpts,
      maximumRowsRead: paginationOpts.numItems * 10,
    });

    return {
      page: result.page,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  }

  // No filtering needed - use direct pagination
  const result = await orderedQuery.paginate(paginationOpts);

  return {
    page: result.page,
    continueCursor: result.continueCursor,
    isDone: result.isDone,
  };
}
