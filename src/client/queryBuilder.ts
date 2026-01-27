/**
 * Fluent Query Builder for Content Entries
 *
 * Provides a chainable, type-safe interface for constructing complex
 * content queries. Supports filtering, sorting, pagination, and search
 * with TypeScript inference.
 *
 * @example
 * ```typescript
 * // Simple query with chaining
 * const posts = await cms.contentEntries
 *   .query()
 *   .contentType("blog_post")
 *   .status("published")
 *   .limit(10)
 *   .execute(ctx);
 *
 * // Complex query with field filters
 * const featured = await cms.contentEntries
 *   .query()
 *   .contentType("blog_post")
 *   .where("category", "eq", "technology")
 *   .where("featured", "eq", true)
 *   .whereIn("tags", ["javascript", "typescript"])
 *   .orderBy("_creationTime", "desc")
 *   .limit(5)
 *   .execute(ctx);
 *
 * // Pagination with cursor
 * const page1 = await cms.contentEntries
 *   .query()
 *   .contentType("blog_post")
 *   .limit(20)
 *   .execute(ctx);
 *
 * const page2 = await cms.contentEntries
 *   .query()
 *   .contentType("blog_post")
 *   .limit(20)
 *   .cursor(page1.continueCursor)
 *   .execute(ctx);
 * ```
 */

import type {
  ContentEntry,
  ContentStatus,
  FieldFilter,
  FilterOperator,
  PaginationResult,
  ContentQueryOptions,
} from "./types.js";
import type { ConvexContext, TypedComponentApi } from "./wrapper.js";

// =============================================================================
// Sort Direction Type
// =============================================================================

/**
 * Sort direction for query results.
 */
export type SortDirection = "asc" | "desc";

/**
 * Sortable fields for content entries.
 * Currently supports creation time; can be extended for custom field sorting.
 */
export type SortableField = "_creationTime" | "_id" | string;

// =============================================================================
// Query Builder Options (Internal State)
// =============================================================================

/**
 * Internal state for the query builder.
 * Accumulates all query options before execution.
 */
interface QueryBuilderState {
  contentTypeName?: string;
  status?: ContentStatus;
  statusIn?: ContentStatus[];
  locale?: string;
  search?: string;
  includeDeleted?: boolean;
  fieldFilters: FieldFilter[];
  sortField?: SortableField;
  sortDirection?: SortDirection;
  numItems: number;
  cursorValue?: string | null;
}

// =============================================================================
// Query Builder Result Types
// =============================================================================

/**
 * Result from executing a query builder.
 * Extends PaginationResult with convenience methods.
 */
export interface QueryBuilderResult<T> extends PaginationResult<T> {
  /**
   * Whether there are more results available.
   * Alias for !isDone for convenience.
   */
  hasMore: boolean;
}

// =============================================================================
// Query Builder Class
// =============================================================================

/**
 * Fluent query builder for constructing content entry queries.
 *
 * Provides a chainable API for building complex queries with:
 * - Content type filtering
 * - Status filtering (single or multiple)
 * - Field-level filters with various operators
 * - Full-text search
 * - Locale filtering
 * - Cursor-based pagination
 * - Sort direction
 *
 * All methods return `this` for chaining, except terminal methods
 * (`execute()`, `first()`, `count()`) which execute the query.
 *
 * @example
 * ```typescript
 * // The query builder is obtained from contentEntries.query()
 * const builder = cms.contentEntries.query();
 *
 * // Chain methods to build the query
 * const result = await builder
 *   .contentType("blog_post")
 *   .status("published")
 *   .where("author", "eq", "user_123")
 *   .search("typescript")
 *   .limit(10)
 *   .execute(ctx);
 * ```
 */
export class ContentQueryBuilder {
  private state: QueryBuilderState;
  private readonly api: TypedComponentApi;

  constructor(api: TypedComponentApi) {
    this.api = api;
    this.state = {
      fieldFilters: [],
      numItems: 50, // Default page size
    };
  }

  // ===========================================================================
  // Content Type Filtering
  // ===========================================================================

  /**
   * Filter by content type name.
   *
   * @param name - The content type name (e.g., "blog_post")
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const posts = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .execute(ctx);
   * ```
   */
  contentType(name: string): this {
    this.state.contentTypeName = name;
    return this;
  }

  // ===========================================================================
  // Status Filtering
  // ===========================================================================

  /**
   * Filter by a single status.
   *
   * @param status - The status to filter by
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const published = await cms.contentEntries
   *   .query()
   *   .status("published")
   *   .execute(ctx);
   * ```
   */
  status(status: ContentStatus): this {
    this.state.status = status;
    this.state.statusIn = undefined; // Clear statusIn if single status is set
    return this;
  }

  /**
   * Filter by multiple statuses (OR logic).
   *
   * Useful for admin views that need to show content in various states.
   *
   * @param statuses - Array of statuses to include
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * // Show all non-archived content in admin
   * const editorial = await cms.contentEntries
   *   .query()
   *   .statusIn(["draft", "published", "scheduled"])
   *   .execute(ctx);
   * ```
   */
  statusIn(statuses: ContentStatus[]): this {
    this.state.statusIn = statuses;
    this.state.status = undefined; // Clear single status if statusIn is set
    return this;
  }

  /**
   * Shorthand for status("published").
   *
   * @returns this for chaining
   */
  published(): this {
    return this.status("published");
  }

  /**
   * Shorthand for status("draft").
   *
   * @returns this for chaining
   */
  drafts(): this {
    return this.status("draft");
  }

  /**
   * Shorthand for status("archived").
   *
   * @returns this for chaining
   */
  archived(): this {
    return this.status("archived");
  }

  /**
   * Shorthand for status("scheduled").
   *
   * @returns this for chaining
   */
  scheduled(): this {
    return this.status("scheduled");
  }

  // ===========================================================================
  // Locale Filtering
  // ===========================================================================

  /**
   * Filter by locale.
   *
   * @param locale - The locale code (e.g., "en-US", "es-ES")
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const spanishPosts = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .locale("es-ES")
   *   .execute(ctx);
   * ```
   */
  locale(locale: string): this {
    this.state.locale = locale;
    return this;
  }

  // ===========================================================================
  // Soft Delete Filtering
  // ===========================================================================

  /**
   * Include soft-deleted entries in results.
   *
   * By default, soft-deleted entries are excluded.
   *
   * @param include - Whether to include deleted entries (default: true)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * // Show all entries including deleted ones
   * const all = await cms.contentEntries
   *   .query()
   *   .includeDeleted()
   *   .execute(ctx);
   *
   * // Explicitly exclude deleted (same as default)
   * const active = await cms.contentEntries
   *   .query()
   *   .includeDeleted(false)
   *   .execute(ctx);
   * ```
   */
  includeDeleted(include: boolean = true): this {
    this.state.includeDeleted = include;
    return this;
  }

  /**
   * Only return soft-deleted entries.
   *
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const trash = await cms.contentEntries
   *   .query()
   *   .onlyDeleted()
   *   .execute(ctx);
   * ```
   */
  onlyDeleted(): this {
    this.state.includeDeleted = true;
    // Add a field filter for deletedAt being defined
    // This is handled in the component layer
    return this;
  }

  // ===========================================================================
  // Full-Text Search
  // ===========================================================================

  /**
   * Search content using full-text search.
   *
   * Searches indexed fields in the content entry data.
   * Requires the searchIndexing feature to be enabled.
   *
   * @param query - The search query string
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const results = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .search("typescript tutorial")
   *   .execute(ctx);
   * ```
   */
  search(query: string): this {
    this.state.search = query;
    return this;
  }

  // ===========================================================================
  // Field Filters
  // ===========================================================================

  /**
   * Add a field filter condition.
   *
   * Multiple filters are combined with AND logic.
   *
   * @param field - The field name in the content data
   * @param operator - The comparison operator
   * @param value - The value to compare against
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const techPosts = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .where("category", "eq", "technology")
   *   .where("views", "gte", 100)
   *   .execute(ctx);
   * ```
   */
  where(field: string, operator: FilterOperator, value: unknown): this {
    this.state.fieldFilters.push({ field, operator, value });
    return this;
  }

  /**
   * Filter where field equals value.
   * Shorthand for where(field, "eq", value).
   *
   * @param field - The field name
   * @param value - The value to match
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const featured = await cms.contentEntries
   *   .query()
   *   .whereEquals("featured", true)
   *   .execute(ctx);
   * ```
   */
  whereEquals(field: string, value: unknown): this {
    return this.where(field, "eq", value);
  }

  /**
   * Filter where field does not equal value.
   * Shorthand for where(field, "ne", value).
   *
   * @param field - The field name
   * @param value - The value to exclude
   * @returns this for chaining
   */
  whereNotEquals(field: string, value: unknown): this {
    return this.where(field, "ne", value);
  }

  /**
   * Filter where field is greater than value.
   * Shorthand for where(field, "gt", value).
   *
   * @param field - The field name
   * @param value - The minimum value (exclusive)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const expensive = await cms.contentEntries
   *   .query()
   *   .contentType("product")
   *   .whereGreaterThan("price", 100)
   *   .execute(ctx);
   * ```
   */
  whereGreaterThan(field: string, value: number | Date): this {
    const filterValue = value instanceof Date ? value.getTime() : value;
    return this.where(field, "gt", filterValue);
  }

  /**
   * Filter where field is greater than or equal to value.
   * Shorthand for where(field, "gte", value).
   *
   * @param field - The field name
   * @param value - The minimum value (inclusive)
   * @returns this for chaining
   */
  whereGreaterThanOrEquals(field: string, value: number | Date): this {
    const filterValue = value instanceof Date ? value.getTime() : value;
    return this.where(field, "gte", filterValue);
  }

  /**
   * Filter where field is less than value.
   * Shorthand for where(field, "lt", value).
   *
   * @param field - The field name
   * @param value - The maximum value (exclusive)
   * @returns this for chaining
   */
  whereLessThan(field: string, value: number | Date): this {
    const filterValue = value instanceof Date ? value.getTime() : value;
    return this.where(field, "lt", filterValue);
  }

  /**
   * Filter where field is less than or equal to value.
   * Shorthand for where(field, "lte", value).
   *
   * @param field - The field name
   * @param value - The maximum value (inclusive)
   * @returns this for chaining
   */
  whereLessThanOrEquals(field: string, value: number | Date): this {
    const filterValue = value instanceof Date ? value.getTime() : value;
    return this.where(field, "lte", filterValue);
  }

  /**
   * Filter where field is in a range (inclusive).
   *
   * @param field - The field name
   * @param min - The minimum value (inclusive)
   * @param max - The maximum value (inclusive)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const midRange = await cms.contentEntries
   *   .query()
   *   .contentType("product")
   *   .whereBetween("price", 50, 150)
   *   .execute(ctx);
   * ```
   */
  whereBetween(field: string, min: number | Date, max: number | Date): this {
    const minValue = min instanceof Date ? min.getTime() : min;
    const maxValue = max instanceof Date ? max.getTime() : max;
    return this
      .where(field, "gte", minValue)
      .where(field, "lte", maxValue);
  }

  /**
   * Filter where field value is in an array of allowed values.
   * Shorthand for where(field, "in", values).
   *
   * @param field - The field name
   * @param values - Array of allowed values
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const categoryPosts = await cms.contentEntries
   *   .query()
   *   .whereIn("category", ["tech", "science", "design"])
   *   .execute(ctx);
   * ```
   */
  whereIn(field: string, values: unknown[]): this {
    return this.where(field, "in", values);
  }

  /**
   * Filter where field value is NOT in an array of values.
   * Shorthand for where(field, "notIn", values).
   *
   * @param field - The field name
   * @param values - Array of excluded values
   * @returns this for chaining
   */
  whereNotIn(field: string, values: unknown[]): this {
    return this.where(field, "notIn", values);
  }

  /**
   * Filter where string field contains a substring.
   * For array fields, checks if the array contains the value.
   * Shorthand for where(field, "contains", value).
   *
   * @param field - The field name
   * @param value - The substring or array value to find
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * // String contains
   * const results = await cms.contentEntries
   *   .query()
   *   .whereContains("title", "guide")
   *   .execute(ctx);
   *
   * // Array contains
   * const tagged = await cms.contentEntries
   *   .query()
   *   .whereContains("tags", "featured")
   *   .execute(ctx);
   * ```
   */
  whereContains(field: string, value: unknown): this {
    return this.where(field, "contains", value);
  }

  /**
   * Filter where string field starts with a prefix.
   * Shorthand for where(field, "startsWith", prefix).
   *
   * @param field - The field name
   * @param prefix - The prefix to match
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const year2026 = await cms.contentEntries
   *   .query()
   *   .whereStartsWith("slug", "2026-")
   *   .execute(ctx);
   * ```
   */
  whereStartsWith(field: string, prefix: string): this {
    return this.where(field, "startsWith", prefix);
  }

  /**
   * Filter where string field ends with a suffix.
   * Shorthand for where(field, "endsWith", suffix).
   *
   * @param field - The field name
   * @param suffix - The suffix to match
   * @returns this for chaining
   */
  whereEndsWith(field: string, suffix: string): this {
    return this.where(field, "endsWith", suffix);
  }

  // ===========================================================================
  // Sorting
  // ===========================================================================

  /**
   * Set the sort order for results.
   *
   * Supports sorting by:
   * - System fields: "_creationTime", "_id", "firstPublishedAt", "lastPublishedAt", "scheduledPublishAt", "version"
   * - Custom data fields: Use "data.fieldName" format (e.g., "data.price", "data.sortOrder")
   *
   * Results are sorted in descending order by default.
   *
   * @param field - The field to sort by (system field or "data.fieldName" for custom fields)
   * @param direction - Sort direction ("asc" or "desc")
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * // Newest first (default)
   * const newest = await cms.contentEntries
   *   .query()
   *   .orderBy("_creationTime", "desc")
   *   .execute(ctx);
   *
   * // Oldest first
   * const oldest = await cms.contentEntries
   *   .query()
   *   .orderBy("_creationTime", "asc")
   *   .execute(ctx);
   *
   * // Sort by publish date
   * const byPublishDate = await cms.contentEntries
   *   .query()
   *   .orderBy("firstPublishedAt", "desc")
   *   .execute(ctx);
   *
   * // Sort by custom field (price, low to high)
   * const byPrice = await cms.contentEntries
   *   .query()
   *   .contentType("product")
   *   .orderBy("data.price", "asc")
   *   .execute(ctx);
   *
   * // Sort by custom order field
   * const byOrder = await cms.contentEntries
   *   .query()
   *   .contentType("menu_item")
   *   .orderBy("data.sortOrder", "asc")
   *   .execute(ctx);
   * ```
   */
  orderBy(field: SortableField, direction: SortDirection = "desc"): this {
    this.state.sortField = field;
    this.state.sortDirection = direction;
    return this;
  }

  /**
   * Sort by first publish date (newest published first).
   * Useful for showing recently published content.
   *
   * @param direction - Sort direction ("asc" or "desc", default "desc")
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const recentlyPublished = await cms.contentEntries
   *   .query()
   *   .status("published")
   *   .byPublishDate()
   *   .execute(ctx);
   * ```
   */
  byPublishDate(direction: SortDirection = "desc"): this {
    return this.orderBy("firstPublishedAt", direction);
  }

  /**
   * Sort by last publish date (most recently updated first).
   * Useful for showing recently updated content.
   *
   * @param direction - Sort direction ("asc" or "desc", default "desc")
   * @returns this for chaining
   */
  byLastPublishDate(direction: SortDirection = "desc"): this {
    return this.orderBy("lastPublishedAt", direction);
  }

  /**
   * Sort by a custom data field.
   * Convenience method that automatically prefixes field name with "data.".
   *
   * @param fieldName - The field name in the content entry's data object
   * @param direction - Sort direction ("asc" or "desc", default "desc")
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * // Sort by price (low to high)
   * const cheapest = await cms.contentEntries
   *   .query()
   *   .contentType("product")
   *   .orderByField("price", "asc")
   *   .execute(ctx);
   *
   * // Sort by title alphabetically
   * const alphabetical = await cms.contentEntries
   *   .query()
   *   .orderByField("title", "asc")
   *   .execute(ctx);
   * ```
   */
  orderByField(fieldName: string, direction: SortDirection = "desc"): this {
    return this.orderBy(`data.${fieldName}`, direction);
  }

  /**
   * Sort by newest first (descending creation time).
   * Shorthand for orderBy("_creationTime", "desc").
   *
   * @returns this for chaining
   */
  newestFirst(): this {
    return this.orderBy("_creationTime", "desc");
  }

  /**
   * Sort by oldest first (ascending creation time).
   * Shorthand for orderBy("_creationTime", "asc").
   *
   * @returns this for chaining
   */
  oldestFirst(): this {
    return this.orderBy("_creationTime", "asc");
  }

  // ===========================================================================
  // Pagination
  // ===========================================================================

  /**
   * Set the maximum number of results to return.
   *
   * @param count - Number of items per page (1-250)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const firstTen = await cms.contentEntries
   *   .query()
   *   .limit(10)
   *   .execute(ctx);
   * ```
   */
  limit(count: number): this {
    this.state.numItems = Math.max(1, Math.min(250, count));
    return this;
  }

  /**
   * Set the pagination cursor for fetching the next page.
   *
   * Use the `continueCursor` from the previous query result.
   *
   * @param cursor - The cursor from the previous page
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const page1 = await cms.contentEntries
   *   .query()
   *   .limit(20)
   *   .execute(ctx);
   *
   * if (!page1.isDone) {
   *   const page2 = await cms.contentEntries
   *     .query()
   *     .limit(20)
   *     .cursor(page1.continueCursor)
   *     .execute(ctx);
   * }
   * ```
   */
  cursor(cursor: string | null | undefined): this {
    this.state.cursorValue = cursor;
    return this;
  }

  /**
   * Alias for cursor() for more natural chaining.
   *
   * @param cursor - The cursor from the previous page
   * @returns this for chaining
   */
  after(cursor: string | null | undefined): this {
    return this.cursor(cursor);
  }

  // ===========================================================================
  // Build Query Options
  // ===========================================================================

  /**
   * Build the query options object from the current state.
   *
   * This is primarily for internal use, but can be useful for debugging
   * or when you need to pass options to the underlying API directly.
   *
   * @returns The compiled ContentQueryOptions
   *
   * @example
   * ```typescript
   * const options = cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .status("published")
   *   .orderBy("data.price", "asc")
   *   .toOptions();
   *
   * console.log(options);
   * // {
   * //   contentTypeName: "blog_post",
   * //   status: "published",
   * //   sortField: "data.price",
   * //   sortDirection: "asc",
   * //   fieldFilters: [],
   * //   paginationOpts: { numItems: 50 }
   * // }
   * ```
   */
  toOptions(): ContentQueryOptions {
    const options: ContentQueryOptions = {
      paginationOpts: {
        numItems: this.state.numItems,
        // Convert undefined to null since the API expects string | null, not undefined
        cursor: this.state.cursorValue ?? null,
      },
    };

    if (this.state.contentTypeName) {
      options.contentTypeName = this.state.contentTypeName;
    }
    if (this.state.status) {
      options.status = this.state.status;
    }
    if (this.state.statusIn && this.state.statusIn.length > 0) {
      options.statusIn = this.state.statusIn;
    }
    if (this.state.locale) {
      options.locale = this.state.locale;
    }
    if (this.state.search) {
      options.search = this.state.search;
    }
    if (this.state.includeDeleted !== undefined) {
      options.includeDeleted = this.state.includeDeleted;
    }
    if (this.state.fieldFilters.length > 0) {
      options.fieldFilters = this.state.fieldFilters;
    }
    // Include sort options if set
    if (this.state.sortField) {
      options.sortField = this.state.sortField;
    }
    if (this.state.sortDirection) {
      options.sortDirection = this.state.sortDirection;
    }

    return options;
  }

  // ===========================================================================
  // Terminal Methods (Execute Query)
  // ===========================================================================

  /**
   * Execute the query and return paginated results.
   *
   * This is the primary terminal method that runs the built query.
   *
   * @param ctx - Convex query context
   * @returns Promise resolving to paginated results
   *
   * @example
   * ```typescript
   * const result = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .status("published")
   *   .limit(10)
   *   .execute(ctx);
   *
   * console.log(result.page);        // Array of entries
   * console.log(result.isDone);      // true if no more results
   * console.log(result.continueCursor); // Cursor for next page
   * console.log(result.hasMore);     // Convenience: !isDone
   * ```
   */
  async execute(ctx: ConvexContext): Promise<QueryBuilderResult<ContentEntry>> {
    const options = this.toOptions();
    const result = await ctx.runQuery(
      this.api.contentEntries.list,
      options
    );

    return {
      page: result.page,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
      hasMore: !result.isDone,
    };
  }

  /**
   * Execute the query and return only the first result.
   *
   * Convenience method that sets limit(1) and returns the first item or null.
   *
   * @param ctx - Convex query context
   * @returns Promise resolving to the first entry or null
   *
   * @example
   * ```typescript
   * const latest = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .status("published")
   *   .newestFirst()
   *   .first(ctx);
   *
   * if (latest) {
   *   console.log(latest.data.title);
   * }
   * ```
   */
  async first(ctx: ConvexContext): Promise<ContentEntry | null> {
    this.state.numItems = 1;
    const result = await this.execute(ctx);
    return result.page[0] ?? null;
  }

  /**
   * Execute the query and check if any results exist.
   *
   * Convenience method that sets limit(1) and returns boolean.
   *
   * @param ctx - Convex query context
   * @returns Promise resolving to true if results exist
   *
   * @example
   * ```typescript
   * const hasPublished = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .status("published")
   *   .exists(ctx);
   *
   * if (!hasPublished) {
   *   console.log("No published posts yet");
   * }
   * ```
   */
  async exists(ctx: ConvexContext): Promise<boolean> {
    const entry = await this.first(ctx);
    return entry !== null;
  }

  /**
   * Execute the query and collect all results into a single array.
   *
   * WARNING: This fetches ALL matching results, potentially making
   * multiple paginated requests. Use with caution on large datasets.
   *
   * @param ctx - Convex query context
   * @param maxPages - Maximum number of pages to fetch (default: 10)
   * @returns Promise resolving to array of all entries
   *
   * @example
   * ```typescript
   * // Get all published posts (use with caution!)
   * const allPosts = await cms.contentEntries
   *   .query()
   *   .contentType("blog_post")
   *   .status("published")
   *   .all(ctx);
   * ```
   */
  async all(ctx: ConvexContext, maxPages: number = 10): Promise<ContentEntry[]> {
    const results: ContentEntry[] = [];
    let currentCursor: string | null | undefined = this.state.cursorValue;
    let pageCount = 0;

    while (pageCount < maxPages) {
      this.state.cursorValue = currentCursor;
      const result = await this.execute(ctx);
      results.push(...result.page);

      if (result.isDone || !result.continueCursor) {
        break;
      }

      currentCursor = result.continueCursor;
      pageCount++;
    }

    return results;
  }

  // ===========================================================================
  // Clone / Reset
  // ===========================================================================

  /**
   * Create a copy of this query builder with the current state.
   *
   * Useful for creating variations of a base query.
   *
   * @returns A new QueryBuilder with the same state
   *
   * @example
   * ```typescript
   * const baseQuery = cms.contentEntries
   *   .query()
   *   .contentType("blog_post");
   *
   * const published = await baseQuery.clone()
   *   .status("published")
   *   .execute(ctx);
   *
   * const drafts = await baseQuery.clone()
   *   .status("draft")
   *   .execute(ctx);
   * ```
   */
  clone(): ContentQueryBuilder {
    const cloned = new ContentQueryBuilder(this.api);
    cloned.state = {
      ...this.state,
      fieldFilters: [...this.state.fieldFilters],
      statusIn: this.state.statusIn ? [...this.state.statusIn] : undefined,
    };
    return cloned;
  }

  /**
   * Reset the query builder to its initial state.
   *
   * @returns this for chaining
   */
  reset(): this {
    this.state = {
      fieldFilters: [],
      numItems: 50,
    };
    return this;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new content query builder.
 *
 * This is typically called internally by ContentEntriesApi.query().
 *
 * @param api - The typed component API
 * @returns A new ContentQueryBuilder instance
 */
export function createQueryBuilder(api: TypedComponentApi): ContentQueryBuilder {
  return new ContentQueryBuilder(api);
}
