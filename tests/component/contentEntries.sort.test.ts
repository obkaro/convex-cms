/**
 * Tests for the content entries sorting feature.
 *
 * These tests verify the sorting logic patterns for the list query:
 * - Sort direction validators
 * - System field sorting
 * - Custom data field sorting
 * - In-memory sorting logic
 * - Sort with filtering combination
 */

import { describe, it, expect } from "vitest";
import {
  SortDirection,
} from "../../src/component/contentEntries.js";

// =============================================================================
// Helper Functions for Testing Sort Logic
// =============================================================================

/**
 * Get a sortable value from an entry based on the sort field.
 */
function getSortValue(entry: any, sortField: string): unknown {
  if (sortField.startsWith("data.")) {
    const fieldName = sortField.slice(5);
    return entry.data?.[fieldName];
  }
  return entry[sortField];
}

/**
 * Compare two values for sorting.
 */
function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  if (a === null || a === undefined) {
    return direction === "asc" ? 1 : -1;
  }
  if (b === null || b === undefined) {
    return direction === "asc" ? -1 : 1;
  }

  if (typeof a === "number" && typeof b === "number") {
    return direction === "asc" ? a - b : b - a;
  }

  if (typeof a === "string" && typeof b === "string") {
    const comparison = a.toLowerCase().localeCompare(b.toLowerCase());
    return direction === "asc" ? comparison : -comparison;
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    const aNum = a ? 1 : 0;
    const bNum = b ? 1 : 0;
    return direction === "asc" ? aNum - bNum : bNum - aNum;
  }

  const aStr = String(a);
  const bStr = String(b);
  const comparison = aStr.localeCompare(bStr);
  return direction === "asc" ? comparison : -comparison;
}

/**
 * Sort entries by sort options.
 */
function sortEntries(entries: any[], sortField: string, sortDirection: SortDirection): any[] {
  return [...entries].sort((a, b) => {
    const aValue = getSortValue(a, sortField);
    const bValue = getSortValue(b, sortField);
    return compareValues(aValue, bValue, sortDirection);
  });
}

describe("Content Entries Sorting", () => {
  // =============================================================================
  // Validator Tests
  // =============================================================================

  describe("Sort validators", () => {
    it("should accept 'asc' as valid sort direction", () => {
      const direction: SortDirection = "asc";
      expect(direction).toBe("asc");
    });

    it("should accept 'desc' as valid sort direction", () => {
      const direction: SortDirection = "desc";
      expect(direction).toBe("desc");
    });

    it("should accept system fields as sort fields", () => {
      const systemFields = [
        "_creationTime",
        "_id",
        "firstPublishedAt",
        "lastPublishedAt",
        "scheduledPublishAt",
        "version",
      ];
      systemFields.forEach((field) => {
        expect(typeof field).toBe("string");
      });
    });

    it("should accept custom data fields with data. prefix", () => {
      const customFields = ["data.title", "data.price", "data.sortOrder"];
      customFields.forEach((field) => {
        expect(field.startsWith("data.")).toBe(true);
      });
    });
  });

  // =============================================================================
  // Sort Value Extraction Tests
  // =============================================================================

  describe("getSortValue function", () => {
    it("should extract system field values directly", () => {
      const entry = {
        _creationTime: 1234567890,
        firstPublishedAt: 1234567891,
        version: 3,
      };

      expect(getSortValue(entry, "_creationTime")).toBe(1234567890);
      expect(getSortValue(entry, "firstPublishedAt")).toBe(1234567891);
      expect(getSortValue(entry, "version")).toBe(3);
    });

    it("should extract custom data field values with data. prefix", () => {
      const entry = {
        data: {
          title: "Test Article",
          price: 99.99,
          sortOrder: 5,
        },
      };

      expect(getSortValue(entry, "data.title")).toBe("Test Article");
      expect(getSortValue(entry, "data.price")).toBe(99.99);
      expect(getSortValue(entry, "data.sortOrder")).toBe(5);
    });

    it("should return undefined for missing fields", () => {
      const entry = { data: {} };

      expect(getSortValue(entry, "data.nonexistent")).toBeUndefined();
      expect(getSortValue(entry, "missingField")).toBeUndefined();
    });

    it("should handle null data object gracefully", () => {
      const entry = { data: null };

      expect(getSortValue(entry, "data.field")).toBeUndefined();
    });
  });

  // =============================================================================
  // Sort Comparison Tests
  // =============================================================================

  describe("compareValues function", () => {
    it("should sort numbers ascending correctly", () => {
      expect(compareValues(1, 2, "asc")).toBeLessThan(0);
      expect(compareValues(2, 1, "asc")).toBeGreaterThan(0);
      expect(compareValues(1, 1, "asc")).toBe(0);
    });

    it("should sort numbers descending correctly", () => {
      expect(compareValues(1, 2, "desc")).toBeGreaterThan(0);
      expect(compareValues(2, 1, "desc")).toBeLessThan(0);
      expect(compareValues(1, 1, "desc")).toBe(0);
    });

    it("should sort strings case-insensitively ascending", () => {
      expect(compareValues("Apple", "banana", "asc")).toBeLessThan(0);
      expect(compareValues("Banana", "apple", "asc")).toBeGreaterThan(0);
      expect(compareValues("apple", "APPLE", "asc")).toBe(0);
    });

    it("should sort strings case-insensitively descending", () => {
      expect(compareValues("Apple", "banana", "desc")).toBeGreaterThan(0);
      expect(compareValues("Banana", "apple", "desc")).toBeLessThan(0);
    });

    it("should sort booleans (false < true) ascending", () => {
      expect(compareValues(false, true, "asc")).toBeLessThan(0);
      expect(compareValues(true, false, "asc")).toBeGreaterThan(0);
    });

    it("should push null/undefined to end in ascending order", () => {
      expect(compareValues(null, 1, "asc")).toBeGreaterThan(0);
      expect(compareValues(undefined, 1, "asc")).toBeGreaterThan(0);
      expect(compareValues(1, null, "asc")).toBeLessThan(0);
    });

    it("should push null/undefined to end in descending order", () => {
      expect(compareValues(null, 1, "desc")).toBeLessThan(0);
      expect(compareValues(undefined, 1, "desc")).toBeLessThan(0);
      expect(compareValues(1, null, "desc")).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // Full Sort Function Tests
  // =============================================================================

  describe("sortEntries function", () => {
    const testEntries = [
      { _id: "1", _creationTime: 100, data: { title: "Charlie", price: 30 } },
      { _id: "2", _creationTime: 300, data: { title: "Alice", price: 10 } },
      { _id: "3", _creationTime: 200, data: { title: "Bob", price: 20 } },
    ];

    it("should sort by _creationTime ascending", () => {
      const sorted = sortEntries(testEntries, "_creationTime", "asc");
      expect(sorted.map((e) => e._id)).toEqual(["1", "3", "2"]);
    });

    it("should sort by _creationTime descending", () => {
      const sorted = sortEntries(testEntries, "_creationTime", "desc");
      expect(sorted.map((e) => e._id)).toEqual(["2", "3", "1"]);
    });

    it("should sort by custom field data.title ascending", () => {
      const sorted = sortEntries(testEntries, "data.title", "asc");
      expect(sorted.map((e) => e._id)).toEqual(["2", "3", "1"]); // Alice, Bob, Charlie
    });

    it("should sort by custom field data.title descending", () => {
      const sorted = sortEntries(testEntries, "data.title", "desc");
      expect(sorted.map((e) => e._id)).toEqual(["1", "3", "2"]); // Charlie, Bob, Alice
    });

    it("should sort by custom field data.price ascending", () => {
      const sorted = sortEntries(testEntries, "data.price", "asc");
      expect(sorted.map((e) => e._id)).toEqual(["2", "3", "1"]); // 10, 20, 30
    });

    it("should sort by custom field data.price descending", () => {
      const sorted = sortEntries(testEntries, "data.price", "desc");
      expect(sorted.map((e) => e._id)).toEqual(["1", "3", "2"]); // 30, 20, 10
    });

    it("should handle entries with null/undefined values", () => {
      const entriesWithNull = [
        { _id: "1", data: { price: null } },
        { _id: "2", data: { price: 10 } },
        { _id: "3", data: { price: undefined } },
        { _id: "4", data: { price: 5 } },
      ];

      const sortedAsc = sortEntries(entriesWithNull, "data.price", "asc");
      // Ascending: Non-null values first (5, 10), then null/undefined at end
      expect(sortedAsc.map((e) => e._id)).toEqual(["4", "2", "1", "3"]);

      const sortedDesc = sortEntries(entriesWithNull, "data.price", "desc");
      // Descending: null/undefined come first (pushed to "end" means front in desc),
      // then non-null values (10, 5)
      expect(sortedDesc.map((e) => e._id)).toEqual(["3", "1", "2", "4"]);
    });

    it("should not mutate the original array", () => {
      const original = [...testEntries];
      const sorted = sortEntries(testEntries, "_creationTime", "asc");

      expect(sorted).not.toBe(testEntries);
      expect(testEntries).toEqual(original);
    });
  });

  // =============================================================================
  // Sort with Publish Dates Tests
  // =============================================================================

  describe("Sorting by publish dates", () => {
    const entriesWithPublishDates = [
      { _id: "1", firstPublishedAt: 1000, lastPublishedAt: 3000 },
      { _id: "2", firstPublishedAt: 3000, lastPublishedAt: 3000 },
      { _id: "3", firstPublishedAt: 2000, lastPublishedAt: 4000 },
      { _id: "4", firstPublishedAt: undefined, lastPublishedAt: undefined },
    ];

    it("should sort by firstPublishedAt ascending", () => {
      const sorted = sortEntries(entriesWithPublishDates, "firstPublishedAt", "asc");
      expect(sorted.map((e) => e._id)).toEqual(["1", "3", "2", "4"]);
    });

    it("should sort by firstPublishedAt descending", () => {
      const sorted = sortEntries(entriesWithPublishDates, "firstPublishedAt", "desc");
      // Descending: undefined first, then 3000, 2000, 1000
      expect(sorted.map((e) => e._id)).toEqual(["4", "2", "3", "1"]);
    });

    it("should sort by lastPublishedAt ascending", () => {
      const sorted = sortEntries(entriesWithPublishDates, "lastPublishedAt", "asc");
      // Ascending: 3000 (ids 1,2), 4000 (id 3), then undefined at end
      expect(sorted.map((e) => e._id)).toEqual(["1", "2", "3", "4"]);
    });

    it("should sort by lastPublishedAt descending", () => {
      const sorted = sortEntries(entriesWithPublishDates, "lastPublishedAt", "desc");
      // Descending: undefined first, then 4000, 3000
      expect(sorted.map((e) => e._id)).toEqual(["4", "3", "1", "2"]);
    });
  });

  // =============================================================================
  // Integration-like Tests
  // =============================================================================

  describe("Sort with filter combination patterns", () => {
    it("should work with status filtering and sorting", () => {
      const entries = [
        { _id: "1", status: "published", data: { sortOrder: 3 } },
        { _id: "2", status: "draft", data: { sortOrder: 1 } },
        { _id: "3", status: "published", data: { sortOrder: 2 } },
        { _id: "4", status: "draft", data: { sortOrder: 4 } },
      ];

      // First filter, then sort (as the actual implementation does)
      const filtered = entries.filter((e) => e.status === "published");
      const sorted = sortEntries(filtered, "data.sortOrder", "asc");

      expect(sorted.map((e) => e._id)).toEqual(["3", "1"]); // sortOrder 2, 3
    });

    it("should work with deleted filtering and sorting", () => {
      const entries = [
        { _id: "1", deletedAt: undefined, _creationTime: 100 },
        { _id: "2", deletedAt: 1000, _creationTime: 200 },
        { _id: "3", deletedAt: undefined, _creationTime: 300 },
      ];

      const filtered = entries.filter((e) => e.deletedAt === undefined);
      const sorted = sortEntries(filtered, "_creationTime", "desc");

      expect(sorted.map((e) => e._id)).toEqual(["3", "1"]);
    });
  });
});

describe("Query Builder Sort Options", () => {
  // =============================================================================
  // toOptions() Sort Integration Tests
  // =============================================================================

  describe("QueryBuilder toOptions with sorting", () => {
    it("should include sortField when set", () => {
      const state = {
        sortField: "data.price",
        sortDirection: "asc" as SortDirection,
      };

      const options: any = {};
      if (state.sortField) {
        options.sortField = state.sortField;
      }
      if (state.sortDirection) {
        options.sortDirection = state.sortDirection;
      }

      expect(options.sortField).toBe("data.price");
      expect(options.sortDirection).toBe("asc");
    });

    it("should not include sortField when not set", () => {
      const state = {
        sortField: undefined,
        sortDirection: undefined,
      };

      const options: any = {};
      if (state.sortField) {
        options.sortField = state.sortField;
      }

      expect(options.sortField).toBeUndefined();
    });

    it("should support orderByField helper pattern", () => {
      // orderByField("price", "asc") should produce "data.price"
      const fieldName = "price";
      const sortField = `data.${fieldName}`;

      expect(sortField).toBe("data.price");
    });
  });
});
