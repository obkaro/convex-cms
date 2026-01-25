/**
 * Content Entry Query Functions
 *
 * Provides query functions for retrieving content entries from the CMS.
 * Content entries are instances of content types that hold the actual content data.
 *
 * Uses convex-helpers paginator for robust cursor-based pagination.
 */

import { v, type Infer } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import { paginationOptsValidator } from "convex/server";
import { stream } from "convex-helpers/server/stream";
import { query, type QueryCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import {
  contentEntryDoc,
  contentVersionDoc,
  compareVersionsArgs,
  compareVersionsResult,
  versionFieldDiff,
} from "./validators.js";
import { contentStatusValidator } from "./schema.js";
import schema from "./schema.js";

// =============================================================================
// Field Filter Types and Operators
// =============================================================================

/**
 * Comparison operators for field filtering.
 *
 * - `eq`: Exact equality (works with all field types)
 * - `ne`: Not equal (works with all field types)
 * - `gt`: Greater than (numbers, dates)
 * - `gte`: Greater than or equal (numbers, dates)
 * - `lt`: Less than (numbers, dates)
 * - `lte`: Less than or equal (numbers, dates)
 * - `contains`: String contains substring, or array contains value
 * - `startsWith`: String starts with prefix
 * - `endsWith`: String ends with suffix
 * - `in`: Value is in array of allowed values
 * - `notIn`: Value is not in array of disallowed values
 */
export const filterOperatorValidator = v.union(
  v.literal("eq"),
  v.literal("ne"),
  v.literal("gt"),
  v.literal("gte"),
  v.literal("lt"),
  v.literal("lte"),
  v.literal("contains"),
  v.literal("startsWith"),
  v.literal("endsWith"),
  v.literal("in"),
  v.literal("notIn")
);

export type FilterOperator = Infer<typeof filterOperatorValidator>;

/**
 * A single field filter condition.
 *
 * @example
 * ```typescript
 * // Filter by exact title match
 * { field: "title", operator: "eq", value: "My Post" }
 *
 * // Filter by price range
 * { field: "price", operator: "gte", value: 100 }
 *
 * // Filter by category (in list)
 * { field: "category", operator: "in", value: ["tech", "science"] }
 *
 * // Filter by tag contains
 * { field: "tags", operator: "contains", value: "javascript" }
 * ```
 */
export const fieldFilterValidator = v.object({
  /** The name of the field in the content entry's data object */
  field: v.string(),
  /** The comparison operator to use */
  operator: filterOperatorValidator,
  /** The value to compare against (type depends on field type and operator) */
  value: v.any(),
});

export type FieldFilter = Infer<typeof fieldFilterValidator>;

// =============================================================================
// Sort Types and Validators
// =============================================================================

/**
 * Sort direction for query results.
 */
export const sortDirectionValidator = v.union(
  v.literal("asc"),
  v.literal("desc")
);

export type SortDirection = Infer<typeof sortDirectionValidator>;

/**
 * Sortable system fields for content entries.
 * These are fields that exist on all content entries.
 */
export const systemSortFieldValidator = v.union(
  v.literal("_creationTime"),
  v.literal("_id"),
  v.literal("firstPublishedAt"),
  v.literal("lastPublishedAt"),
  v.literal("scheduledPublishAt"),
  v.literal("version")
);

export type SystemSortField = Infer<typeof systemSortFieldValidator>;

/**
 * Sort field can be a system field or a custom data field (prefixed with "data.").
 *
 * @example
 * ```typescript
 * // System field sorting
 * sortField: "_creationTime"
 * sortField: "firstPublishedAt"
 *
 * // Custom data field sorting (prefix with "data.")
 * sortField: "data.title"
 * sortField: "data.price"
 * sortField: "data.sortOrder"
 * ```
 */
export const sortFieldValidator = v.string();

export type SortField = string;

/**
 * Sort options for content entry queries.
 *
 * @example
 * ```typescript
 * // Sort by creation time (newest first)
 * { sortField: "_creationTime", sortDirection: "desc" }
 *
 * // Sort by publish date (oldest published first)
 * { sortField: "firstPublishedAt", sortDirection: "asc" }
 *
 * // Sort by custom field (e.g., price low to high)
 * { sortField: "data.price", sortDirection: "asc" }
 * ```
 */
export const sortOptionsValidator = v.object({
  /** The field to sort by (system field or "data.fieldName" for custom fields) */
  sortField: sortFieldValidator,
  /** The sort direction ("asc" for ascending, "desc" for descending) */
  sortDirection: sortDirectionValidator,
});

export type SortOptions = Infer<typeof sortOptionsValidator>;

/**
 * Apply a single field filter to a content entry.
 *
 * @param entryData - The content entry's data object
 * @param filter - The filter condition to apply
 * @returns true if the entry matches the filter, false otherwise
 */
export function matchesFieldFilter(
  entryData: Record<string, unknown>,
  filter: FieldFilter
): boolean {
  const { field, operator, value } = filter;
  const fieldValue = entryData[field];

  // Handle null/undefined field values
  if (fieldValue === undefined || fieldValue === null) {
    // Only eq and ne operators can match null/undefined
    if (operator === "eq") {
      return value === null || value === undefined;
    }
    if (operator === "ne") {
      return value !== null && value !== undefined;
    }
    // All other operators return false for null/undefined
    return false;
  }

  switch (operator) {
    case "eq":
      return deepEquals(fieldValue, value);

    case "ne":
      return !deepEquals(fieldValue, value);

    case "gt":
      if (typeof fieldValue === "number" && typeof value === "number") {
        return fieldValue > value;
      }
      // Support date comparison (stored as timestamps)
      if (typeof fieldValue === "number" && value instanceof Date) {
        return fieldValue > value.getTime();
      }
      return false;

    case "gte":
      if (typeof fieldValue === "number" && typeof value === "number") {
        return fieldValue >= value;
      }
      if (typeof fieldValue === "number" && value instanceof Date) {
        return fieldValue >= value.getTime();
      }
      return false;

    case "lt":
      if (typeof fieldValue === "number" && typeof value === "number") {
        return fieldValue < value;
      }
      if (typeof fieldValue === "number" && value instanceof Date) {
        return fieldValue < value.getTime();
      }
      return false;

    case "lte":
      if (typeof fieldValue === "number" && typeof value === "number") {
        return fieldValue <= value;
      }
      if (typeof fieldValue === "number" && value instanceof Date) {
        return fieldValue <= value.getTime();
      }
      return false;

    case "contains":
      // String contains substring
      if (typeof fieldValue === "string" && typeof value === "string") {
        return fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      // Array contains value
      if (Array.isArray(fieldValue)) {
        return fieldValue.some((item) => deepEquals(item, value));
      }
      return false;

    case "startsWith":
      if (typeof fieldValue === "string" && typeof value === "string") {
        return fieldValue.toLowerCase().startsWith(value.toLowerCase());
      }
      return false;

    case "endsWith":
      if (typeof fieldValue === "string" && typeof value === "string") {
        return fieldValue.toLowerCase().endsWith(value.toLowerCase());
      }
      return false;

    case "in":
      if (Array.isArray(value)) {
        return value.some((v) => deepEquals(fieldValue, v));
      }
      return false;

    case "notIn":
      if (Array.isArray(value)) {
        return !value.some((v) => deepEquals(fieldValue, v));
      }
      return true;

    default:
      return false;
  }
}

/**
 * Apply multiple field filters to a content entry.
 * All filters must match (AND logic).
 *
 * @param entryData - The content entry's data object
 * @param filters - Array of filter conditions
 * @returns true if the entry matches all filters, false otherwise
 */
export function matchesAllFieldFilters(
  entryData: Record<string, unknown>,
  filters: FieldFilter[]
): boolean {
  if (!filters || filters.length === 0) {
    return true;
  }
  return filters.every((filter) => matchesFieldFilter(entryData, filter));
}

/**
 * Deep equality check for comparing field values.
 * Handles primitives, arrays, and objects.
 */
function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEquals(item, b[index]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEquals(aObj[key], bObj[key]));
  }

  return false;
}

/**
 * Arguments for retrieving a single content entry.
 */
const getContentEntryArgs = v.object({
  /** The ID of the content entry to retrieve */
  id: v.id("contentEntries"),
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
    const entry = await ctx.db.get(args.id);

    // Return null if entry doesn't exist
    if (!entry) {
      return null;
    }

    // Return null if entry has been soft-deleted
    // (respects the soft delete feature - deleted entries should not be returned)
    if (isDeleted(entry)) {
      return null;
    }

    // If version info is requested, fetch the latest version
    if (args.includeVersion) {
      const latestVersion = await ctx.db
        .query("contentVersions")
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
  contentTypeId: v.id("contentTypes"),
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
      .query("contentEntries")
      .withIndex("by_content_type_and_slug", (q) =>
        q.eq("contentTypeId", contentTypeId).eq("slug", slug)
      )
      .first();

    // Return null if no entry found
    if (!entry) {
      return null;
    }

    // Filter out soft-deleted entries unless explicitly requested
    if (!includeDeleted && isDeleted(entry)) {
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
      .query("contentTypes")
      .withIndex("by_name", (q) => q.eq("name", contentTypeName))
      .first();

    // Return null if content type doesn't exist
    if (!contentType) {
      return null;
    }

    // Check if content type is active and not deleted
    // Inactive or deleted content types should not serve content
    if (!contentType.isActive || isDeleted(contentType)) {
      return null;
    }

    // Query the entry using the compound index
    const entry = await ctx.db
      .query("contentEntries")
      .withIndex("by_content_type_and_slug", (q) =>
        q.eq("contentTypeId", contentType._id).eq("slug", slug)
      )
      .first();

    // Return null if no entry found
    if (!entry) {
      return null;
    }

    // Filter out soft-deleted entries unless explicitly requested
    if (!includeDeleted && isDeleted(entry)) {
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
  contentTypeId: v.optional(v.id("contentTypes")),
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
   * Field-level filters to apply to content entry data.
   * All filters are combined with AND logic.
   *
   * @example
   * ```typescript
   * // Filter by exact field value
   * fieldFilters: [{ field: "category", operator: "eq", value: "tech" }]
   *
   * // Filter by numeric range
   * fieldFilters: [
   *   { field: "price", operator: "gte", value: 100 },
   *   { field: "price", operator: "lte", value: 500 }
   * ]
   *
   * // Filter by array contains
   * fieldFilters: [{ field: "tags", operator: "contains", value: "featured" }]
   * ```
   */
  fieldFilters: v.optional(v.array(fieldFilterValidator)),
  /**
   * Field to sort results by.
   * Can be a system field (e.g., "_creationTime", "firstPublishedAt") or
   * a custom data field prefixed with "data." (e.g., "data.title", "data.price").
   *
   * @default "_creationTime"
   *
   * @example
   * ```typescript
   * // Sort by publish date
   * sortField: "firstPublishedAt"
   *
   * // Sort by custom field
   * sortField: "data.sortOrder"
   * ```
   */
  sortField: v.optional(sortFieldValidator),
  /**
   * Sort direction for results.
   *
   * @default "desc" (newest first)
   *
   * @example
   * ```typescript
   * sortDirection: "asc"  // Ascending (oldest/lowest first)
   * sortDirection: "desc" // Descending (newest/highest first)
   * ```
   */
  sortDirection: v.optional(sortDirectionValidator),
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
 * - Field filters: Applied as post-processing filters on entry data
 *
 * @param contentTypeId - Optional content type ID to filter by
 * @param contentTypeName - Optional content type name (resolved to ID internally)
 * @param status - Optional status filter (draft, published, archived, scheduled)
 * @param statusIn - Optional array of statuses to filter by (for admin views)
 * @param locale - Optional locale code to filter by
 * @param search - Optional full-text search query
 * @param fieldFilters - Optional array of field filters (combined with AND logic)
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
 * // Filter by field values (e.g., category)
 * const techPosts = await ctx.runQuery(
 *   components.convexCms.contentEntries.list,
 *   {
 *     contentTypeName: "blog_post",
 *     status: "published",
 *     fieldFilters: [
 *       { field: "category", operator: "eq", value: "tech" }
 *     ],
 *     paginationOpts: { numItems: 10 },
 *   }
 * );
 *
 * // Filter by numeric range (e.g., price)
 * const affordableProducts = await ctx.runQuery(
 *   components.convexCms.contentEntries.list,
 *   {
 *     contentTypeName: "product",
 *     status: "published",
 *     fieldFilters: [
 *       { field: "price", operator: "gte", value: 10 },
 *       { field: "price", operator: "lte", value: 100 }
 *     ],
 *     paginationOpts: { numItems: 20 },
 *   }
 * );
 *
 * // Filter by array contains (e.g., tags)
 * const featuredPosts = await ctx.runQuery(
 *   components.convexCms.contentEntries.list,
 *   {
 *     contentTypeName: "blog_post",
 *     fieldFilters: [
 *       { field: "tags", operator: "contains", value: "featured" }
 *     ],
 *     paginationOpts: { numItems: 10 },
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
      fieldFilters,
      sortField = "_creationTime",
      sortDirection = "desc",
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
        .query("contentTypes")
        .withIndex("by_name", (q) => q.eq("name", contentTypeName))
        .first();

      // If content type not found or inactive, return empty result
      if (!contentType || !contentType.isActive || isDeleted(contentType)) {
        return { page: [], continueCursor: null, isDone: true };
      }

      resolvedContentTypeId = contentType._id;
    }

    // Build sort options
    const sortOptions: SortOptions = {
      sortField,
      sortDirection,
    };

    // Handle full-text search queries (cannot use paginator for search indexes)
    if (search && search.trim().length > 0) {
      return handleSearchQuery(ctx, {
        search: search.trim(),
        contentTypeId: resolvedContentTypeId,
        statuses: resolvedStatuses,
        locale,
        includeDeleted,
        fieldFilters,
        sortOptions,
        paginationOpts: clampedPaginationOpts,
      });
    }

    // Handle standard index-based queries with paginator
    return handlePaginatorQuery(ctx, {
      contentTypeId: resolvedContentTypeId,
      statuses: resolvedStatuses,
      locale,
      includeDeleted,
      fieldFilters,
      sortOptions,
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
 * Get a sortable value from an entry based on the sort field.
 * Handles both system fields and custom data fields (prefixed with "data.").
 */
function getSortValue(entry: any, sortField: string): unknown {
  if (sortField.startsWith("data.")) {
    const fieldName = sortField.slice(5); // Remove "data." prefix
    return entry.data?.[fieldName];
  }
  return entry[sortField];
}

/**
 * Compare two values for sorting.
 * Handles null/undefined by pushing them to the end.
 */
function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  // Handle null/undefined - push them to the end
  if (a === null || a === undefined) {
    return direction === "asc" ? 1 : -1;
  }
  if (b === null || b === undefined) {
    return direction === "asc" ? -1 : 1;
  }

  // Compare numbers
  if (typeof a === "number" && typeof b === "number") {
    return direction === "asc" ? a - b : b - a;
  }

  // Compare strings (case-insensitive)
  if (typeof a === "string" && typeof b === "string") {
    const comparison = a.toLowerCase().localeCompare(b.toLowerCase());
    return direction === "asc" ? comparison : -comparison;
  }

  // Compare booleans (false < true)
  if (typeof a === "boolean" && typeof b === "boolean") {
    const aNum = a ? 1 : 0;
    const bNum = b ? 1 : 0;
    return direction === "asc" ? aNum - bNum : bNum - aNum;
  }

  // Fallback: convert to string and compare
  const aStr = String(a);
  const bStr = String(b);
  const comparison = aStr.localeCompare(bStr);
  return direction === "asc" ? comparison : -comparison;
}

/**
 * Sort an array of entries by the specified sort options.
 */
function sortEntries(entries: any[], sortOptions: SortOptions): any[] {
  return [...entries].sort((a, b) => {
    const aValue = getSortValue(a, sortOptions.sortField);
    const bValue = getSortValue(b, sortOptions.sortField);
    return compareValues(aValue, bValue, sortOptions.sortDirection);
  });
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
  ctx: QueryCtx,
  args: {
    search: string;
    contentTypeId?: Id<"contentTypes">;
    statuses?: string[];
    locale?: string;
    includeDeleted: boolean;
    fieldFilters?: FieldFilter[];
    sortOptions: SortOptions;
    paginationOpts: PaginationOpts;
  }
): Promise<ContentEntryPaginationResult> {
  const { search, contentTypeId, statuses, locale, includeDeleted, fieldFilters, sortOptions, paginationOpts } = args;
  const { numItems, cursor } = paginationOpts;

  // Determine if we can use index-level status filtering
  // Only possible when filtering by exactly one status
  const singleStatus = statuses?.length === 1 ? statuses[0] : undefined;

  // Build search query with filter fields
  // The search_content index supports filtering by contentTypeId, status, and locale
  const searchQuery = ctx.db
    .query("contentEntries")
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

  // For multiple status filtering, soft-delete, and field filters we need to fetch more results
  // to ensure we have enough after post-filtering
  const hasFieldFilters = fieldFilters && fieldFilters.length > 0;
  const fetchMultiplier = (statuses && statuses.length > 1) || !includeDeleted || hasFieldFilters ? 4 : 1;
  const results = await searchQuery.take((numItems + 1) * fetchMultiplier);

  // Apply post-processing filters
  let filteredResults = results;

  // Filter by soft-delete status
  if (!includeDeleted) {
    filteredResults = filteredResults.filter(
      (entry: any) => !isDeleted(entry)
    );
  }

  // Filter by multiple statuses (when not using index-level filtering)
  if (statuses && statuses.length > 1) {
    filteredResults = filteredResults.filter((entry: any) =>
      statuses.includes(entry.status)
    );
  }

  // Apply field-level filters to entry data
  if (hasFieldFilters) {
    filteredResults = filteredResults.filter((entry: any) =>
      matchesAllFieldFilters(entry.data || {}, fieldFilters!)
    );
  }

  // Apply sorting to the filtered results
  // Search results may not be in the desired order, so we always sort
  const sortedResults = sortEntries(filteredResults, sortOptions);

  // Handle cursor-based pagination for search results
  let startIndex = 0;
  if (cursor) {
    // Find the index of the cursor in results
    const cursorIndex = sortedResults.findIndex(
      (entry: any) => entry._id === cursor
    );
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Get the page of results
  const pageResults = sortedResults.slice(startIndex, startIndex + numItems + 1);
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
 * When filtering by multiple statuses or field filters, uses filterWith for
 * post-processing while maintaining efficient pagination.
 *
 * Sorting strategy:
 * - For system fields (_creationTime, _id), we can use index-based ordering
 * - For custom data fields or other system fields, we must use in-memory sorting
 *   which requires fetching more results upfront
 */
async function handlePaginatorQuery(
  ctx: QueryCtx,
  args: {
    contentTypeId?: Id<"contentTypes">;
    statuses?: string[];
    locale?: string;
    includeDeleted: boolean;
    fieldFilters?: FieldFilter[];
    sortOptions: SortOptions;
    paginationOpts: PaginationOpts;
  }
): Promise<ContentEntryPaginationResult> {
  const { contentTypeId, statuses, locale, includeDeleted, fieldFilters, sortOptions, paginationOpts } = args;

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
      .query("contentEntries")
      .withIndex("by_content_type_and_status", (q) =>
        q.eq("contentTypeId", contentTypeId).eq("status", singleStatus as "draft" | "published" | "archived" | "scheduled")
      );
  } else if (contentTypeId) {
    // Use content type index
    baseQuery = streamDb
      .query("contentEntries")
      .withIndex("by_content_type", (q) =>
        q.eq("contentTypeId", contentTypeId)
      );
  } else if (singleStatus) {
    // Use status index for single status
    baseQuery = streamDb
      .query("contentEntries")
      .withIndex("by_status", (q) => q.eq("status", singleStatus as "draft" | "published" | "archived" | "scheduled"));
  } else if (locale) {
    // Use locale index
    baseQuery = streamDb
      .query("contentEntries")
      .withIndex("by_locale", (q) => q.eq("locale", locale));
  } else {
    // No specific filter - use creation time index (most efficient for full scans)
    baseQuery = streamDb.query("contentEntries");
  }

  // Check if field filters are present
  const hasFieldFilters = fieldFilters && fieldFilters.length > 0;

  // Determine if we can use index-based sorting
  // Only _creationTime supports index-based ordering in Convex
  const canUseIndexSort = sortOptions.sortField === "_creationTime";
  const needsCustomSort = !canUseIndexSort;

  // Determine if we need post-processing filters
  const needsFiltering =
    !includeDeleted ||
    (statuses && statuses.length > 1) ||
    (locale && !contentTypeId && !singleStatus) ||
    hasFieldFilters;

  // Apply order based on sort direction (for _creationTime sorting)
  const indexOrder = canUseIndexSort ? sortOptions.sortDirection : "desc";
  const orderedQuery = baseQuery.order(indexOrder);

  // If custom sorting is needed, we must fetch all filtered results and sort in-memory
  if (needsCustomSort) {
    return handleCustomSortQuery(ctx, {
      orderedQuery,
      statuses,
      locale,
      contentTypeId,
      singleStatus,
      includeDeleted,
      fieldFilters,
      sortOptions,
      paginationOpts,
    });
  }

  // If filtering is needed, use filterWith; otherwise use direct pagination
  if (needsFiltering) {
    const filteredQuery = orderedQuery.filterWith(async (entry: any) => {
      // Filter out soft-deleted entries
      if (!includeDeleted && isDeleted(entry)) {
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

      // Apply field-level filters to entry data
      if (hasFieldFilters) {
        if (!matchesAllFieldFilters(entry.data || {}, fieldFilters!)) {
          return false;
        }
      }

      return true;
    });

    // Execute pagination with maximumRowsRead for safety when filtering
    // Increase the multiplier when field filters are present since they may filter out many entries
    const maxRowsMultiplier = hasFieldFilters ? 20 : 10;
    const result = await filteredQuery.paginate({
      ...paginationOpts,
      maximumRowsRead: paginationOpts.numItems * maxRowsMultiplier,
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

/**
 * Internal helper to handle queries that require custom (in-memory) sorting.
 * Used when sorting by fields other than _creationTime (e.g., firstPublishedAt,
 * lastPublishedAt, or custom data fields like data.price).
 *
 * This fetches more results upfront, applies filtering, sorts them in-memory,
 * and then implements cursor-based pagination on the sorted results.
 */
async function handleCustomSortQuery(
  _ctx: QueryCtx,
  args: {
    // Stream query from convex-helpers - complex generic type, kept untyped for simplicity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderedQuery: any;
    statuses?: string[];
    locale?: string;
    contentTypeId?: Id<"contentTypes">;
    singleStatus?: string;
    includeDeleted: boolean;
    fieldFilters?: FieldFilter[];
    sortOptions: SortOptions;
    paginationOpts: PaginationOpts;
  }
): Promise<ContentEntryPaginationResult> {
  const {
    orderedQuery,
    statuses,
    locale,
    contentTypeId,
    singleStatus,
    includeDeleted,
    fieldFilters,
    sortOptions,
    paginationOpts,
  } = args;

  const hasFieldFilters = fieldFilters && fieldFilters.length > 0;
  const { numItems, cursor } = paginationOpts;

  // For custom sorting, we need to fetch more results since we can't rely on index ordering
  // We fetch a multiplier of the requested items to ensure we have enough after filtering
  const fetchMultiplier = hasFieldFilters ? 20 : 10;
  const fetchLimit = (numItems + 1) * fetchMultiplier;

  // Collect results from the stream
  let hasMore = false;

  // Use filterWith to apply filters while collecting results
  const filteredQuery = orderedQuery.filterWith(async (entry: any) => {
    // Filter out soft-deleted entries
    if (!includeDeleted && isDeleted(entry)) {
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

    // Apply field-level filters to entry data
    if (hasFieldFilters) {
      if (!matchesAllFieldFilters(entry.data || {}, fieldFilters!)) {
        return false;
      }
    }

    return true;
  });

  // Fetch limited results
  const result = await filteredQuery.paginate({
    numItems: fetchLimit,
    cursor: null, // Always start from beginning for custom sort
    maximumRowsRead: fetchLimit * 2,
  });

  const filteredResults = result.page;
  hasMore = !result.isDone;

  // Sort the filtered results in-memory
  const sortedResults = sortEntries(filteredResults, sortOptions);

  // Handle cursor-based pagination on sorted results
  let startIndex = 0;
  if (cursor) {
    // Find the index of the cursor in sorted results
    const cursorIndex = sortedResults.findIndex(
      (entry: any) => entry._id === cursor
    );
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Get the page of results
  const pageResults = sortedResults.slice(startIndex, startIndex + numItems + 1);
  const pageIsDone = pageResults.length <= numItems && !hasMore;
  const page = pageResults.length > numItems ? pageResults.slice(0, numItems) : pageResults;

  // Get continuation cursor
  const continueCursor =
    page.length > 0 && !pageIsDone ? page[page.length - 1]._id : null;

  return {
    page,
    continueCursor,
    isDone: pageIsDone || page.length < numItems,
  };
}

// =============================================================================
// Version History Query
// =============================================================================

/**
 * Arguments for retrieving version history.
 * Uses the existing getVersionHistoryArgs validator pattern.
 */
const versionHistoryArgs = v.object({
  /** The ID of the content entry to get version history for */
  entryId: v.id("contentEntries"),
  /** Standard pagination options */
  paginationOpts: paginationOptsValidator,
});

/**
 * Paginated response for version history.
 * Returns version documents ordered by version number descending (newest first).
 */
const paginatedVersionHistoryResponse = v.object({
  /** Array of version documents for this page */
  page: v.array(contentVersionDoc),
  /** Cursor for fetching the next page */
  continueCursor: v.union(v.string(), v.null()),
  /** Whether this is the last page */
  isDone: v.boolean(),
});

/**
 * Query to retrieve version history for a content entry.
 *
 * Returns a paginated list of version snapshots ordered by version number
 * descending (newest versions first). Each version includes:
 * - versionNumber: The version at the time of the snapshot
 * - data: Snapshot of the content data
 * - slug: Snapshot of the slug
 * - status: Status when the version was created
 * - changeDescription: Optional description of changes
 * - createdBy: User who created this version
 * - wasPublished: Whether this version was published
 * - publishedAt: When this version was published (if ever)
 *
 * @param entryId - The content entry ID to get version history for
 * @param paginationOpts - Standard Convex pagination options (numItems, cursor)
 *
 * @returns PaginationResult with version documents, or null if entry not found
 *
 * @example
 * ```typescript
 * // Get first page of version history
 * const history = await ctx.runQuery(
 *   components.convexCms.contentEntries.getVersionHistory,
 *   {
 *     entryId: entryId,
 *     paginationOpts: { numItems: 10 },
 *   }
 * );
 *
 * // Get published versions only
 * const publishedVersions = history?.page.filter(v => v.wasPublished);
 *
 * // Paginate through history
 * if (!history.isDone) {
 *   const nextPage = await ctx.runQuery(
 *     components.convexCms.contentEntries.getVersionHistory,
 *     {
 *       entryId: entryId,
 *       paginationOpts: {
 *         numItems: 10,
 *         cursor: history.continueCursor,
 *       },
 *     }
 *   );
 * }
 *
 * // Compare versions
 * const [current, previous] = history.page;
 * console.log("Changes from v" + previous.versionNumber + " to v" + current.versionNumber);
 * ```
 */
export const getVersionHistory = query({
  args: versionHistoryArgs.fields,
  returns: v.union(paginatedVersionHistoryResponse, v.null()),
  handler: async (ctx, args) => {
    const { entryId, paginationOpts } = args;

    // Verify the entry exists and is not deleted
    const entry = await ctx.db.get(entryId);

    if (!entry) {
      return null;
    }

    // Return null if entry has been soft-deleted
    // (deleted entries should not expose version history)
    if (isDeleted(entry)) {
      return null;
    }

    // Clamp numItems to valid range
    const numItems = Math.min(
      Math.max(1, paginationOpts.numItems ?? DEFAULT_NUM_ITEMS),
      MAX_NUM_ITEMS
    );

    const clampedPaginationOpts = {
      ...paginationOpts,
      numItems,
    };

    // Create stream with schema for type-safe pagination
    const streamDb = stream(ctx.db, schema);

    // Query versions using the by_entry index, ordered by creation time descending
    // This gives us newest versions first
    const result = await streamDb
      .query("contentVersions")
      .withIndex("by_entry", (q) => q.eq("entryId", entryId))
      .order("desc")
      .paginate(clampedPaginationOpts);

    return {
      page: result.page,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

// =============================================================================
// Get Specific Version Query
// =============================================================================

/**
 * Retrieve a specific version of a content entry by version ID or number.
 *
 * This query allows fetching the complete content state at a specific version,
 * which is useful for:
 * - Version comparison/diff views
 * - Previewing historical content states
 * - Rollback preparation (viewing what content looked like)
 * - Audit trail investigation
 *
 * ## Lookup Methods
 *
 * You can retrieve a version by either:
 * 1. **Version ID** (`versionId`): Direct document lookup using the `_id` field
 * 2. **Version Number** (`versionNumber`): Uses the compound index for efficient lookup
 *
 * At least one of `versionId` or `versionNumber` must be provided.
 * If both are provided, `versionId` takes precedence.
 *
 * ## Security
 *
 * - Returns `null` if the parent entry doesn't exist or has been soft-deleted
 * - Validates that the version belongs to the specified entry (prevents cross-entry access)
 *
 * ## Example Usage
 *
 * ```typescript
 * // Get version by version number
 * const versionByNumber = await ctx.runQuery(
 *   api.contentEntries.getVersion,
 *   {
 *     entryId: entryId,
 *     versionNumber: 3
 *   }
 * );
 *
 * // Get version by version ID
 * const versionById = await ctx.runQuery(
 *   api.contentEntries.getVersion,
 *   {
 *     entryId: entryId,
 *     versionId: someVersionId
 *   }
 * );
 *
 * // Access version data
 * if (versionByNumber) {
 *   console.log("Content at v3:", versionByNumber.data);
 *   console.log("Slug at v3:", versionByNumber.slug);
 *   console.log("Status at v3:", versionByNumber.status);
 *   console.log("Was published:", versionByNumber.wasPublished);
 * }
 * ```
 */
export const getVersion = query({
  args: {
    entryId: v.id("contentEntries"),
    versionId: v.optional(v.id("contentVersions")),
    versionNumber: v.optional(v.number()),
  },
  returns: v.union(contentVersionDoc, v.null()),
  handler: async (ctx, args) => {
    const { entryId, versionId, versionNumber } = args;

    // Validate that at least one lookup method is provided
    if (versionId === undefined && versionNumber === undefined) {
      // Return null instead of throwing to maintain consistent query behavior
      return null;
    }

    // Verify the entry exists and is not soft-deleted
    const entry = await ctx.db.get(entryId);

    if (!entry) {
      return null;
    }

    // Return null for soft-deleted entries (they shouldn't expose version history)
    if (isDeleted(entry)) {
      return null;
    }

    // Lookup by version ID (direct document fetch)
    if (versionId !== undefined) {
      const version = await ctx.db.get(versionId);

      // Validate version exists and belongs to the specified entry
      if (!version || version.entryId !== entryId) {
        return null;
      }

      return version;
    }

    // Lookup by version number (compound index query)
    if (versionNumber !== undefined) {
      const version = await ctx.db
        .query("contentVersions")
        .withIndex("by_entry_and_version", (q) =>
          q.eq("entryId", entryId).eq("versionNumber", versionNumber)
        )
        .first();

      return version ?? null;
    }

    return null;
  },
});

// =============================================================================
// Version Comparison Helper Functions
// =============================================================================

/**
 * Detect which fields changed between two data objects.
 * Skips internal fields (starting with underscore).
 *
 * @internal
 */
function detectChangedDataFields(
  fromData: Record<string, unknown> | undefined | null,
  toData: Record<string, unknown> | undefined | null
): string[] {
  if (!fromData && !toData) {
    return [];
  }

  const from = fromData ?? {};
  const to = toData ?? {};

  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const key of allKeys) {
    // Skip internal fields
    if (key.startsWith("_")) continue;

    const fromValue = from[key];
    const toValue = to[key];

    // Deep comparison using JSON serialization
    if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

/**
 * Determine the type of change for a field.
 *
 * @internal
 */
function getChangeType(
  fromData: Record<string, unknown>,
  toData: Record<string, unknown>,
  field: string
): "added" | "removed" | "modified" {
  const hasInFrom = field in fromData;
  const hasInTo = field in toData;

  if (!hasInFrom && hasInTo) {
    return "added";
  }
  if (hasInFrom && !hasInTo) {
    return "removed";
  }
  return "modified";
}

/**
 * Generate a human-readable summary of version changes.
 *
 * @internal
 */
function generateVersionChangeSummary(
  changedFields: string[],
  slugChanged: boolean,
  statusChanged: boolean
): string {
  const parts: string[] = [];

  if (changedFields.length > 0) {
    if (changedFields.length <= 3) {
      parts.push(`${changedFields.length} field${changedFields.length === 1 ? "" : "s"} changed: ${changedFields.join(", ")}`);
    } else {
      parts.push(`${changedFields.length} fields changed: ${changedFields.slice(0, 3).join(", ")} and ${changedFields.length - 3} more`);
    }
  }

  if (slugChanged) {
    parts.push("slug changed");
  }

  if (statusChanged) {
    parts.push("status changed");
  }

  if (parts.length === 0) {
    return "No changes";
  }

  return parts.join("; ");
}

// =============================================================================
// Version Comparison Query
// =============================================================================

/**
 * Compare two versions of a content entry and return field-level differences.
 *
 * This query retrieves two version snapshots by version number and computes
 * a detailed diff showing which fields changed, what the before/after values
 * are, and whether metadata like slug and status also changed.
 *
 * @example
 * ```typescript
 * // Compare version 2 to version 5 of an entry
 * const diff = await ctx.runQuery(api.contentEntries.compareVersions, {
 *   entryId: entryId,
 *   fromVersionNumber: 2,
 *   toVersionNumber: 5,
 * });
 *
 * if (diff.hasChanges) {
 *   console.log("Changes:", diff.changeSummary);
 *   for (const fieldDiff of diff.fieldDiffs) {
 *     console.log(`Field: ${fieldDiff.field}`);
 *     console.log(`  Change type: ${fieldDiff.changeType}`);
 *     console.log(`  From: ${JSON.stringify(fieldDiff.fromValue)}`);
 *     console.log(`  To: ${JSON.stringify(fieldDiff.toValue)}`);
 *   }
 * }
 * ```
 *
 * @param entryId - The ID of the content entry to compare versions for
 * @param fromVersionNumber - The version number of the "from" (older/base) version
 * @param toVersionNumber - The version number of the "to" (newer/target) version
 * @returns Detailed comparison result or null if entry is deleted or versions don't exist
 */
export const compareVersions = query({
  args: compareVersionsArgs.fields,
  returns: v.union(compareVersionsResult, v.null()),
  handler: async (ctx, args) => {
    const { entryId, fromVersionNumber, toVersionNumber } = args;

    // Verify the entry exists and is not soft-deleted
    const entry = await ctx.db.get(entryId);
    if (!entry || isDeleted(entry)) {
      return null;
    }

    // Fetch both versions using the compound index
    const [fromVersion, toVersion] = await Promise.all([
      ctx.db
        .query("contentVersions")
        .withIndex("by_entry_and_version", (q) =>
          q.eq("entryId", entryId).eq("versionNumber", fromVersionNumber)
        )
        .first(),
      ctx.db
        .query("contentVersions")
        .withIndex("by_entry_and_version", (q) =>
          q.eq("entryId", entryId).eq("versionNumber", toVersionNumber)
        )
        .first(),
    ]);

    // Return null if either version doesn't exist
    if (!fromVersion || !toVersion) {
      return null;
    }

    // Extract data from both versions (content data is stored in `data` field)
    const fromData = (fromVersion.data as Record<string, unknown>) ?? {};
    const toData = (toVersion.data as Record<string, unknown>) ?? {};

    // Detect changed fields in the content data
    const changedFields = detectChangedDataFields(fromData, toData);

    // Check if slug changed
    const slugChanged = fromVersion.slug !== toVersion.slug;

    // Check if status changed
    const statusChanged = fromVersion.status !== toVersion.status;

    // Build field diffs with before/after values
    const fieldDiffs: Infer<typeof versionFieldDiff>[] = changedFields.map(
      (field) => ({
        field,
        fromValue: fromData[field],
        toValue: toData[field],
        changeType: getChangeType(fromData, toData, field),
      })
    );

    // Generate human-readable summary
    const changeSummary = generateVersionChangeSummary(
      changedFields,
      slugChanged,
      statusChanged
    );

    // Determine if there are any changes at all
    const hasChanges =
      changedFields.length > 0 || slugChanged || statusChanged;

    return {
      hasChanges,
      fromVersion: {
        versionNumber: fromVersion.versionNumber,
        status: fromVersion.status,
        slug: fromVersion.slug,
        wasPublished: fromVersion.wasPublished,
        createdAt: fromVersion._creationTime,
      },
      toVersion: {
        versionNumber: toVersion.versionNumber,
        status: toVersion.status,
        slug: toVersion.slug,
        wasPublished: toVersion.wasPublished,
        createdAt: toVersion._creationTime,
      },
      changedFields,
      fieldDiffs,
      slugChanged,
      statusChanged,
      changeSummary,
    };
  },
});

// =============================================================================
// Count Query
// =============================================================================

/**
 * Arguments for counting content entries.
 */
const countContentEntriesArgs = v.object({
  /** Filter by content type ID */
  contentTypeId: v.optional(v.id("contentTypes")),
  /** Filter by content type name (alternative to contentTypeId) */
  contentTypeName: v.optional(v.string()),
  /** Filter by a single entry status */
  status: v.optional(contentStatusValidator),
  /** Filter by multiple statuses */
  statusIn: v.optional(v.array(contentStatusValidator)),
  /** Whether to include soft-deleted entries (default: false) */
  includeDeleted: v.optional(v.boolean()),
});

/**
 * Query to count content entries matching the given filters.
 *
 * This query efficiently counts entries without loading all entry data.
 * It uses database indexes for filtering and iterates through matching
 * entries to provide an accurate count regardless of the number of entries.
 *
 * Unlike the `list` query which is limited by pagination, this query
 * counts ALL matching entries and returns the total.
 *
 * @param contentTypeId - Optional content type ID to filter by
 * @param contentTypeName - Optional content type name (resolved to ID internally)
 * @param status - Optional single status filter
 * @param statusIn - Optional array of statuses to filter by
 * @param includeDeleted - Whether to include soft-deleted entries (default: false)
 *
 * @returns Object containing the count of matching entries
 *
 * @example
 * ```typescript
 * // Count all entries for a content type
 * const { count } = await ctx.runQuery(
 *   components.convexCms.contentEntries.count,
 *   { contentTypeId: blogTypeId }
 * );
 * console.log(`Blog posts: ${count}`);
 *
 * // Count published entries only
 * const { count: publishedCount } = await ctx.runQuery(
 *   components.convexCms.contentEntries.count,
 *   { contentTypeId: blogTypeId, status: "published" }
 * );
 *
 * // Count entries by content type name
 * const { count: productCount } = await ctx.runQuery(
 *   components.convexCms.contentEntries.count,
 *   { contentTypeName: "product" }
 * );
 * ```
 */
export const count = query({
  args: countContentEntriesArgs.fields,
  returns: v.object({
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const {
      contentTypeId,
      contentTypeName,
      status,
      statusIn,
      includeDeleted = false,
    } = args;

    // Resolve status filter: statusIn takes precedence, then status
    const resolvedStatuses: string[] | undefined = statusIn?.length
      ? statusIn
      : status
        ? [status]
        : undefined;

    // Resolve content type ID from name if provided
    let resolvedContentTypeId = contentTypeId;
    if (!resolvedContentTypeId && contentTypeName) {
      const contentType = await ctx.db
        .query("contentTypes")
        .withIndex("by_name", (q) => q.eq("name", contentTypeName))
        .first();

      // If content type not found or inactive, return 0 count
      if (!contentType || !contentType.isActive || isDeleted(contentType)) {
        return { count: 0 };
      }

      resolvedContentTypeId = contentType._id;
    }

    // Determine if we can use index-level status filtering
    const singleStatus = resolvedStatuses?.length === 1 ? resolvedStatuses[0] : undefined;

    // Build and execute the query using the most efficient index
    let queryBuilder;

    if (resolvedContentTypeId && singleStatus) {
      // Use compound index for content type + single status filtering
      queryBuilder = ctx.db
        .query("contentEntries")
        .withIndex("by_content_type_and_status", (q) =>
          q.eq("contentTypeId", resolvedContentTypeId!).eq("status", singleStatus as "draft" | "published" | "archived" | "scheduled")
        );
    } else if (resolvedContentTypeId) {
      // Use content type index
      queryBuilder = ctx.db
        .query("contentEntries")
        .withIndex("by_content_type", (q) =>
          q.eq("contentTypeId", resolvedContentTypeId!)
        );
    } else if (singleStatus) {
      // Use status index for single status
      queryBuilder = ctx.db
        .query("contentEntries")
        .withIndex("by_status", (q) => q.eq("status", singleStatus as "draft" | "published" | "archived" | "scheduled"));
    } else {
      // No specific filter - full table scan
      queryBuilder = ctx.db.query("contentEntries");
    }

    // Count entries by iterating through the query results
    let count = 0;

    for await (const entry of queryBuilder) {
      // Filter out soft-deleted entries unless explicitly requested
      if (!includeDeleted && isDeleted(entry)) {
        continue;
      }

      // Filter by multiple statuses (when not already filtered by index)
      if (resolvedStatuses && resolvedStatuses.length > 1) {
        if (!resolvedStatuses.includes(entry.status)) {
          continue;
        }
      }

      count++;
    }

    return { count };
  },
});
