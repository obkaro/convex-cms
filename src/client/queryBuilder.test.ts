/**
 * Query Builder Tests
 *
 * Verifies that the fluent query builder works correctly,
 * building proper query options from chained method calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ContentQueryBuilder,
  createQueryBuilder,
  type SortDirection,
} from "./queryBuilder";
import type { TypedComponentApi, ConvexContext } from "./wrapper";
import type { ContentEntry, PaginationResult } from "./types";

// Mock component API - cast as TypedComponentApi for test flexibility
// In production, the actual generated ComponentApi provides full type safety
const createMockComponentApi = (): TypedComponentApi => ({
  contentEntries: {
    list: { _type: "query" } as any,
    get: { _type: "query" } as any,
    getBySlug: { _type: "query" } as any,
    getVersion: { _type: "query" } as any,
    getVersionHistory: { _type: "query" } as any,
    compareVersions: { _type: "query" } as any,
  },
  // Minimal stubs for other namespaces (only what's needed for queryBuilder tests)
  contentTypes: {
    get: { _type: "query" } as any,
    list: { _type: "query" } as any,
  },
} as TypedComponentApi);

// Create a mock entry for testing
const createMockEntry = (overrides: Partial<ContentEntry> = {}): ContentEntry => ({
  _id: "entry_123",
  _creationTime: Date.now(),
  contentTypeId: "type_123",
  slug: "test-entry",
  status: "draft",
  data: { title: "Test Entry" },
  version: 1,
  ...overrides,
});

// Mock pagination result
const createMockPaginationResult = (
  entries: ContentEntry[] = [createMockEntry()],
  isDone = true
): PaginationResult<ContentEntry> => ({
  page: entries,
  continueCursor: isDone ? null : "cursor_abc",
  isDone,
});

describe("ContentQueryBuilder", () => {
  let mockApi: TypedComponentApi;

  beforeEach(() => {
    mockApi = createMockComponentApi();
  });

  describe("createQueryBuilder", () => {
    it("creates a new query builder instance", () => {
      const builder = createQueryBuilder(mockApi);
      expect(builder).toBeInstanceOf(ContentQueryBuilder);
    });
  });

  describe("toOptions", () => {
    it("returns default pagination options", () => {
      const builder = new ContentQueryBuilder(mockApi);
      const options = builder.toOptions();

      expect(options.paginationOpts).toEqual({
        numItems: 50,
        cursor: null,
      });
    });

    it("includes all configured options", () => {
      const builder = new ContentQueryBuilder(mockApi)
        .contentType("blog_post")
        .status("published")
        .locale("en-US")
        .search("typescript")
        .includeDeleted(true)
        .limit(10)
        .cursor("cursor_abc");

      const options = builder.toOptions();

      expect(options).toEqual({
        contentTypeName: "blog_post",
        status: "published",
        locale: "en-US",
        search: "typescript",
        includeDeleted: true,
        paginationOpts: {
          numItems: 10,
          cursor: "cursor_abc",
        },
      });
    });

    it("does not include sortField and sortDirection when not explicitly set", () => {
      const builder = new ContentQueryBuilder(mockApi)
        .contentType("blog_post")
        .status("published");

      const options = builder.toOptions();

      // Sort fields should NOT be present when not explicitly set
      // Server-side defaults handle sorting when not specified
      expect(options.sortField).toBeUndefined();
      expect(options.sortDirection).toBeUndefined();
      expect("sortField" in options).toBe(false);
      expect("sortDirection" in options).toBe(false);
    });

    it("includes sortField and sortDirection when explicitly set via orderBy", () => {
      const builder = new ContentQueryBuilder(mockApi)
        .contentType("blog_post")
        .orderBy("_creationTime", "asc");

      const options = builder.toOptions();

      expect(options.sortField).toBe("_creationTime");
      expect(options.sortDirection).toBe("asc");
    });

    it("includes sortField and sortDirection when set via newestFirst", () => {
      const builder = new ContentQueryBuilder(mockApi).newestFirst();

      const options = builder.toOptions();

      expect(options.sortField).toBe("_creationTime");
      expect(options.sortDirection).toBe("desc");
    });

    it("includes sortField and sortDirection when set via oldestFirst", () => {
      const builder = new ContentQueryBuilder(mockApi).oldestFirst();

      const options = builder.toOptions();

      expect(options.sortField).toBe("_creationTime");
      expect(options.sortDirection).toBe("asc");
    });
  });

  describe("Content Type Filtering", () => {
    it("contentType sets contentTypeName", () => {
      const builder = new ContentQueryBuilder(mockApi).contentType("blog_post");
      const options = builder.toOptions();

      expect(options.contentTypeName).toBe("blog_post");
      expect(options.contentTypeId).toBeUndefined();
    });

    it("contentTypeById sets contentTypeId", () => {
      const builder = new ContentQueryBuilder(mockApi).contentTypeById("type_123");
      const options = builder.toOptions();

      expect(options.contentTypeId).toBe("type_123");
      expect(options.contentTypeName).toBeUndefined();
    });

    it("contentType clears contentTypeId", () => {
      const builder = new ContentQueryBuilder(mockApi)
        .contentTypeById("type_123")
        .contentType("blog_post");
      const options = builder.toOptions();

      expect(options.contentTypeName).toBe("blog_post");
      expect(options.contentTypeId).toBeUndefined();
    });
  });

  describe("Status Filtering", () => {
    it("status sets single status filter", () => {
      const builder = new ContentQueryBuilder(mockApi).status("published");
      const options = builder.toOptions();

      expect(options.status).toBe("published");
      expect(options.statusIn).toBeUndefined();
    });

    it("statusIn sets multiple status filter", () => {
      const builder = new ContentQueryBuilder(mockApi).statusIn([
        "draft",
        "scheduled",
      ]);
      const options = builder.toOptions();

      expect(options.statusIn).toEqual(["draft", "scheduled"]);
      expect(options.status).toBeUndefined();
    });

    it("statusIn clears single status", () => {
      const builder = new ContentQueryBuilder(mockApi)
        .status("published")
        .statusIn(["draft", "scheduled"]);
      const options = builder.toOptions();

      expect(options.statusIn).toEqual(["draft", "scheduled"]);
      expect(options.status).toBeUndefined();
    });

    it("published() sets status to published", () => {
      const builder = new ContentQueryBuilder(mockApi).published();
      expect(builder.toOptions().status).toBe("published");
    });

    it("drafts() sets status to draft", () => {
      const builder = new ContentQueryBuilder(mockApi).drafts();
      expect(builder.toOptions().status).toBe("draft");
    });

    it("archived() sets status to archived", () => {
      const builder = new ContentQueryBuilder(mockApi).archived();
      expect(builder.toOptions().status).toBe("archived");
    });

    it("scheduled() sets status to scheduled", () => {
      const builder = new ContentQueryBuilder(mockApi).scheduled();
      expect(builder.toOptions().status).toBe("scheduled");
    });
  });

  describe("Locale Filtering", () => {
    it("locale sets locale filter", () => {
      const builder = new ContentQueryBuilder(mockApi).locale("es-ES");
      expect(builder.toOptions().locale).toBe("es-ES");
    });
  });

  describe("Soft Delete Filtering", () => {
    it("includeDeleted sets includeDeleted flag", () => {
      const builder = new ContentQueryBuilder(mockApi).includeDeleted();
      expect(builder.toOptions().includeDeleted).toBe(true);
    });

    it("includeDeleted(false) excludes deleted entries", () => {
      const builder = new ContentQueryBuilder(mockApi).includeDeleted(false);
      expect(builder.toOptions().includeDeleted).toBe(false);
    });
  });

  describe("Full-Text Search", () => {
    it("search sets search query", () => {
      const builder = new ContentQueryBuilder(mockApi).search("typescript tutorial");
      expect(builder.toOptions().search).toBe("typescript tutorial");
    });
  });

  describe("Field Filters", () => {
    it("where adds a field filter", () => {
      const builder = new ContentQueryBuilder(mockApi).where(
        "category",
        "eq",
        "technology"
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "category", operator: "eq", value: "technology" },
      ]);
    });

    it("multiple where calls accumulate filters", () => {
      const builder = new ContentQueryBuilder(mockApi)
        .where("category", "eq", "technology")
        .where("views", "gte", 100)
        .where("featured", "eq", true);
      const options = builder.toOptions();

      expect(options.fieldFilters).toHaveLength(3);
      expect(options.fieldFilters).toEqual([
        { field: "category", operator: "eq", value: "technology" },
        { field: "views", operator: "gte", value: 100 },
        { field: "featured", operator: "eq", value: true },
      ]);
    });

    it("whereEquals is shorthand for eq", () => {
      const builder = new ContentQueryBuilder(mockApi).whereEquals(
        "featured",
        true
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "featured", operator: "eq", value: true },
      ]);
    });

    it("whereNotEquals is shorthand for ne", () => {
      const builder = new ContentQueryBuilder(mockApi).whereNotEquals(
        "status",
        "archived"
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "status", operator: "ne", value: "archived" },
      ]);
    });

    it("whereGreaterThan is shorthand for gt", () => {
      const builder = new ContentQueryBuilder(mockApi).whereGreaterThan(
        "price",
        100
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "price", operator: "gt", value: 100 },
      ]);
    });

    it("whereGreaterThan converts Date to timestamp", () => {
      const date = new Date("2026-01-01");
      const builder = new ContentQueryBuilder(mockApi).whereGreaterThan(
        "publishedAt",
        date
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "publishedAt", operator: "gt", value: date.getTime() },
      ]);
    });

    it("whereGreaterThanOrEquals is shorthand for gte", () => {
      const builder = new ContentQueryBuilder(mockApi).whereGreaterThanOrEquals(
        "price",
        100
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "price", operator: "gte", value: 100 },
      ]);
    });

    it("whereLessThan is shorthand for lt", () => {
      const builder = new ContentQueryBuilder(mockApi).whereLessThan(
        "price",
        500
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "price", operator: "lt", value: 500 },
      ]);
    });

    it("whereLessThanOrEquals is shorthand for lte", () => {
      const builder = new ContentQueryBuilder(mockApi).whereLessThanOrEquals(
        "price",
        500
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "price", operator: "lte", value: 500 },
      ]);
    });

    it("whereBetween adds gte and lte filters", () => {
      const builder = new ContentQueryBuilder(mockApi).whereBetween(
        "price",
        100,
        500
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "price", operator: "gte", value: 100 },
        { field: "price", operator: "lte", value: 500 },
      ]);
    });

    it("whereBetween works with Date values", () => {
      const start = new Date("2026-01-01");
      const end = new Date("2026-12-31");
      const builder = new ContentQueryBuilder(mockApi).whereBetween(
        "publishedAt",
        start,
        end
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "publishedAt", operator: "gte", value: start.getTime() },
        { field: "publishedAt", operator: "lte", value: end.getTime() },
      ]);
    });

    it("whereIn is shorthand for in operator", () => {
      const builder = new ContentQueryBuilder(mockApi).whereIn("category", [
        "tech",
        "science",
      ]);
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "category", operator: "in", value: ["tech", "science"] },
      ]);
    });

    it("whereNotIn is shorthand for notIn operator", () => {
      const builder = new ContentQueryBuilder(mockApi).whereNotIn("status", [
        "archived",
        "deleted",
      ]);
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "status", operator: "notIn", value: ["archived", "deleted"] },
      ]);
    });

    it("whereContains is shorthand for contains operator", () => {
      const builder = new ContentQueryBuilder(mockApi).whereContains(
        "tags",
        "featured"
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "tags", operator: "contains", value: "featured" },
      ]);
    });

    it("whereStartsWith is shorthand for startsWith operator", () => {
      const builder = new ContentQueryBuilder(mockApi).whereStartsWith(
        "slug",
        "2026-"
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "slug", operator: "startsWith", value: "2026-" },
      ]);
    });

    it("whereEndsWith is shorthand for endsWith operator", () => {
      const builder = new ContentQueryBuilder(mockApi).whereEndsWith(
        "email",
        "@example.com"
      );
      const options = builder.toOptions();

      expect(options.fieldFilters).toEqual([
        { field: "email", operator: "endsWith", value: "@example.com" },
      ]);
    });
  });

  describe("Sorting", () => {
    it("orderBy sets sort field and direction", () => {
      const builder = new ContentQueryBuilder(mockApi).orderBy(
        "_creationTime",
        "asc"
      );
      // Sort is applied at the component level, not in options
      // Just verify the method chains correctly
      expect(builder).toBeInstanceOf(ContentQueryBuilder);
    });

    it("newestFirst sets descending sort", () => {
      const builder = new ContentQueryBuilder(mockApi).newestFirst();
      expect(builder).toBeInstanceOf(ContentQueryBuilder);
    });

    it("oldestFirst sets ascending sort", () => {
      const builder = new ContentQueryBuilder(mockApi).oldestFirst();
      expect(builder).toBeInstanceOf(ContentQueryBuilder);
    });
  });

  describe("Pagination", () => {
    it("limit sets numItems with clamping", () => {
      const builder = new ContentQueryBuilder(mockApi).limit(20);
      expect(builder.toOptions().paginationOpts.numItems).toBe(20);
    });

    it("limit clamps to minimum of 1", () => {
      const builder = new ContentQueryBuilder(mockApi).limit(-5);
      expect(builder.toOptions().paginationOpts.numItems).toBe(1);
    });

    it("limit clamps to maximum of 250", () => {
      const builder = new ContentQueryBuilder(mockApi).limit(500);
      expect(builder.toOptions().paginationOpts.numItems).toBe(250);
    });

    it("cursor sets pagination cursor", () => {
      const builder = new ContentQueryBuilder(mockApi).cursor("cursor_abc");
      expect(builder.toOptions().paginationOpts.cursor).toBe("cursor_abc");
    });

    it("after is alias for cursor", () => {
      const builder = new ContentQueryBuilder(mockApi).after("cursor_def");
      expect(builder.toOptions().paginationOpts.cursor).toBe("cursor_def");
    });

    it("cursor accepts null", () => {
      const builder = new ContentQueryBuilder(mockApi).cursor(null);
      expect(builder.toOptions().paginationOpts.cursor).toBeNull();
    });
  });

  describe("Method Chaining", () => {
    it("all methods return this for chaining", () => {
      const builder = new ContentQueryBuilder(mockApi);

      // Every method should return the same builder instance
      expect(builder.contentType("blog")).toBe(builder);
      expect(builder.contentTypeById("type_123")).toBe(builder);
      expect(builder.status("published")).toBe(builder);
      expect(builder.statusIn(["draft"])).toBe(builder);
      expect(builder.published()).toBe(builder);
      expect(builder.drafts()).toBe(builder);
      expect(builder.archived()).toBe(builder);
      expect(builder.scheduled()).toBe(builder);
      expect(builder.locale("en")).toBe(builder);
      expect(builder.includeDeleted()).toBe(builder);
      expect(builder.search("test")).toBe(builder);
      expect(builder.where("field", "eq", "value")).toBe(builder);
      expect(builder.whereEquals("field", "value")).toBe(builder);
      expect(builder.whereNotEquals("field", "value")).toBe(builder);
      expect(builder.whereGreaterThan("field", 0)).toBe(builder);
      expect(builder.whereGreaterThanOrEquals("field", 0)).toBe(builder);
      expect(builder.whereLessThan("field", 0)).toBe(builder);
      expect(builder.whereLessThanOrEquals("field", 0)).toBe(builder);
      expect(builder.whereBetween("field", 0, 10)).toBe(builder);
      expect(builder.whereIn("field", [])).toBe(builder);
      expect(builder.whereNotIn("field", [])).toBe(builder);
      expect(builder.whereContains("field", "x")).toBe(builder);
      expect(builder.whereStartsWith("field", "x")).toBe(builder);
      expect(builder.whereEndsWith("field", "x")).toBe(builder);
      expect(builder.orderBy("_creationTime")).toBe(builder);
      expect(builder.newestFirst()).toBe(builder);
      expect(builder.oldestFirst()).toBe(builder);
      expect(builder.limit(10)).toBe(builder);
      expect(builder.cursor("c")).toBe(builder);
      expect(builder.after("c")).toBe(builder);
      expect(builder.reset()).toBe(builder);
    });

    it("complex query chain builds correct options", () => {
      const options = new ContentQueryBuilder(mockApi)
        .contentType("blog_post")
        .published()
        .locale("en-US")
        .where("category", "eq", "technology")
        .whereGreaterThan("views", 100)
        .whereContains("tags", "featured")
        .newestFirst()
        .limit(10)
        .toOptions();

      expect(options).toEqual({
        contentTypeName: "blog_post",
        status: "published",
        locale: "en-US",
        fieldFilters: [
          { field: "category", operator: "eq", value: "technology" },
          { field: "views", operator: "gt", value: 100 },
          { field: "tags", operator: "contains", value: "featured" },
        ],
        sortField: "_creationTime",
        sortDirection: "desc",
        paginationOpts: { numItems: 10, cursor: null },
      });
    });
  });

  describe("clone", () => {
    it("creates an independent copy of the builder", () => {
      const original = new ContentQueryBuilder(mockApi)
        .contentType("blog_post")
        .status("published")
        .limit(10);

      const cloned = original.clone();

      // Modify the clone
      cloned.status("draft").limit(20);

      // Original should be unchanged
      const originalOptions = original.toOptions();
      expect(originalOptions.status).toBe("published");
      expect(originalOptions.paginationOpts.numItems).toBe(10);

      // Clone should have new values
      const clonedOptions = cloned.toOptions();
      expect(clonedOptions.status).toBe("draft");
      expect(clonedOptions.paginationOpts.numItems).toBe(20);
    });

    it("deep clones field filters array", () => {
      const original = new ContentQueryBuilder(mockApi).where(
        "category",
        "eq",
        "tech"
      );

      const cloned = original.clone();
      cloned.where("views", "gt", 100);

      // Original should have only one filter
      expect(original.toOptions().fieldFilters).toHaveLength(1);

      // Clone should have two filters
      expect(cloned.toOptions().fieldFilters).toHaveLength(2);
    });
  });

  describe("reset", () => {
    it("resets builder to initial state", () => {
      const builder = new ContentQueryBuilder(mockApi)
        .contentType("blog_post")
        .status("published")
        .where("category", "eq", "tech")
        .limit(20)
        .cursor("cursor_abc");

      builder.reset();
      const options = builder.toOptions();

      expect(options.contentTypeName).toBeUndefined();
      expect(options.status).toBeUndefined();
      expect(options.fieldFilters).toBeUndefined();
      expect(options.paginationOpts).toEqual({
        numItems: 50,
        cursor: null,
      });
    });
  });

  describe("execute", () => {
    it("runs query and returns results with hasMore", async () => {
      const mockEntry = createMockEntry();
      const mockResult = createMockPaginationResult([mockEntry], false);

      const mockCtx: ConvexContext = {
        runMutation: vi.fn(),
        runQuery: vi.fn().mockResolvedValue(mockResult),
      };

      const builder = new ContentQueryBuilder(mockApi).contentType("blog_post");
      const result = await builder.execute(mockCtx);

      expect(mockCtx.runQuery).toHaveBeenCalled();
      expect(result.page).toEqual([mockEntry]);
      expect(result.isDone).toBe(false);
      expect(result.hasMore).toBe(true);
      expect(result.continueCursor).toBe("cursor_abc");
    });

    it("hasMore is false when isDone is true", async () => {
      const mockResult = createMockPaginationResult([], true);

      const mockCtx: ConvexContext = {
        runMutation: vi.fn(),
        runQuery: vi.fn().mockResolvedValue(mockResult),
      };

      const builder = new ContentQueryBuilder(mockApi);
      const result = await builder.execute(mockCtx);

      expect(result.isDone).toBe(true);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("first", () => {
    it("returns first entry when exists", async () => {
      const mockEntry = createMockEntry({ slug: "first-entry" });
      const mockResult = createMockPaginationResult([mockEntry], true);

      const mockCtx: ConvexContext = {
        runMutation: vi.fn(),
        runQuery: vi.fn().mockResolvedValue(mockResult),
      };

      const builder = new ContentQueryBuilder(mockApi);
      const result = await builder.first(mockCtx);

      expect(result).toEqual(mockEntry);
    });

    it("returns null when no entries exist", async () => {
      const mockResult = createMockPaginationResult([], true);

      const mockCtx: ConvexContext = {
        runMutation: vi.fn(),
        runQuery: vi.fn().mockResolvedValue(mockResult),
      };

      const builder = new ContentQueryBuilder(mockApi);
      const result = await builder.first(mockCtx);

      expect(result).toBeNull();
    });
  });

  describe("exists", () => {
    it("returns true when entries exist", async () => {
      const mockResult = createMockPaginationResult([createMockEntry()], true);

      const mockCtx: ConvexContext = {
        runMutation: vi.fn(),
        runQuery: vi.fn().mockResolvedValue(mockResult),
      };

      const builder = new ContentQueryBuilder(mockApi);
      const result = await builder.exists(mockCtx);

      expect(result).toBe(true);
    });

    it("returns false when no entries exist", async () => {
      const mockResult = createMockPaginationResult([], true);

      const mockCtx: ConvexContext = {
        runMutation: vi.fn(),
        runQuery: vi.fn().mockResolvedValue(mockResult),
      };

      const builder = new ContentQueryBuilder(mockApi);
      const result = await builder.exists(mockCtx);

      expect(result).toBe(false);
    });
  });

  describe("all", () => {
    it("collects all results from multiple pages", async () => {
      const entries1 = [createMockEntry({ slug: "entry-1" })];
      const entries2 = [createMockEntry({ slug: "entry-2" })];
      const entries3 = [createMockEntry({ slug: "entry-3" })];

      const mockCtx: ConvexContext = {
        runMutation: vi.fn(),
        runQuery: vi
          .fn()
          .mockResolvedValueOnce(
            createMockPaginationResult(entries1, false)
          )
          .mockResolvedValueOnce(
            createMockPaginationResult(entries2, false)
          )
          .mockResolvedValueOnce(
            createMockPaginationResult(entries3, true)
          ),
      };

      const builder = new ContentQueryBuilder(mockApi);
      const result = await builder.all(mockCtx);

      expect(result).toHaveLength(3);
      expect(result[0].slug).toBe("entry-1");
      expect(result[1].slug).toBe("entry-2");
      expect(result[2].slug).toBe("entry-3");
    });

    it("respects maxPages limit", async () => {
      const mockCtx: ConvexContext = {
        runMutation: vi.fn(),
        runQuery: vi.fn().mockResolvedValue(
          createMockPaginationResult([createMockEntry()], false)
        ),
      };

      const builder = new ContentQueryBuilder(mockApi);
      const result = await builder.all(mockCtx, 3);

      // Should have made 3 calls (maxPages = 3)
      expect(mockCtx.runQuery).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });
  });
});
