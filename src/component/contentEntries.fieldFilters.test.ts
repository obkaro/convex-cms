/**
 * Unit tests for field filter matching logic.
 * Tests the matchesFieldFilter and matchesAllFieldFilters functions.
 */

import { describe, it, expect } from "vitest";
import {
  matchesFieldFilter,
  matchesAllFieldFilters,
  type FieldFilter,
} from "./contentEntries.js";

describe("matchesFieldFilter", () => {
  describe("eq operator", () => {
    it("matches exact string values", () => {
      const data = { title: "Hello World" };
      const filter: FieldFilter = { field: "title", operator: "eq", value: "Hello World" };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match different string values", () => {
      const data = { title: "Hello World" };
      const filter: FieldFilter = { field: "title", operator: "eq", value: "Goodbye" };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });

    it("matches exact number values", () => {
      const data = { price: 100 };
      const filter: FieldFilter = { field: "price", operator: "eq", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("matches boolean values", () => {
      const data = { isPublished: true };
      const filter: FieldFilter = { field: "isPublished", operator: "eq", value: true };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("matches null values", () => {
      const data = { author: null };
      const filter: FieldFilter = { field: "author", operator: "eq", value: null };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("matches undefined fields with null", () => {
      const data = {};
      const filter: FieldFilter = { field: "missing", operator: "eq", value: null };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("matches arrays deeply", () => {
      const data = { tags: ["a", "b", "c"] };
      const filter: FieldFilter = { field: "tags", operator: "eq", value: ["a", "b", "c"] };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match arrays with different order", () => {
      const data = { tags: ["a", "b", "c"] };
      const filter: FieldFilter = { field: "tags", operator: "eq", value: ["c", "b", "a"] };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });

  describe("ne operator", () => {
    it("matches when values are different", () => {
      const data = { status: "draft" };
      const filter: FieldFilter = { field: "status", operator: "ne", value: "published" };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match when values are equal", () => {
      const data = { status: "draft" };
      const filter: FieldFilter = { field: "status", operator: "ne", value: "draft" };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });

    it("matches when field is missing and value is not null", () => {
      const data = {};
      const filter: FieldFilter = { field: "missing", operator: "ne", value: "something" };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });
  });

  describe("gt operator", () => {
    it("matches when number is greater", () => {
      const data = { price: 150 };
      const filter: FieldFilter = { field: "price", operator: "gt", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match when equal", () => {
      const data = { price: 100 };
      const filter: FieldFilter = { field: "price", operator: "gt", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });

    it("does not match when less", () => {
      const data = { price: 50 };
      const filter: FieldFilter = { field: "price", operator: "gt", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });

    it("returns false for undefined values", () => {
      const data = {};
      const filter: FieldFilter = { field: "price", operator: "gt", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });

  describe("gte operator", () => {
    it("matches when number is greater", () => {
      const data = { price: 150 };
      const filter: FieldFilter = { field: "price", operator: "gte", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("matches when equal", () => {
      const data = { price: 100 };
      const filter: FieldFilter = { field: "price", operator: "gte", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match when less", () => {
      const data = { price: 50 };
      const filter: FieldFilter = { field: "price", operator: "gte", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });

  describe("lt operator", () => {
    it("matches when number is less", () => {
      const data = { price: 50 };
      const filter: FieldFilter = { field: "price", operator: "lt", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match when equal", () => {
      const data = { price: 100 };
      const filter: FieldFilter = { field: "price", operator: "lt", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });

    it("does not match when greater", () => {
      const data = { price: 150 };
      const filter: FieldFilter = { field: "price", operator: "lt", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });

  describe("lte operator", () => {
    it("matches when number is less", () => {
      const data = { price: 50 };
      const filter: FieldFilter = { field: "price", operator: "lte", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("matches when equal", () => {
      const data = { price: 100 };
      const filter: FieldFilter = { field: "price", operator: "lte", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match when greater", () => {
      const data = { price: 150 };
      const filter: FieldFilter = { field: "price", operator: "lte", value: 100 };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });

  describe("contains operator", () => {
    it("matches string containing substring (case insensitive)", () => {
      const data = { title: "Hello World" };
      const filter: FieldFilter = { field: "title", operator: "contains", value: "world" };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match string without substring", () => {
      const data = { title: "Hello World" };
      const filter: FieldFilter = { field: "title", operator: "contains", value: "foo" };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });

    it("matches array containing value", () => {
      const data = { tags: ["javascript", "typescript", "react"] };
      const filter: FieldFilter = { field: "tags", operator: "contains", value: "typescript" };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match array without value", () => {
      const data = { tags: ["javascript", "typescript", "react"] };
      const filter: FieldFilter = { field: "tags", operator: "contains", value: "python" };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });

  describe("startsWith operator", () => {
    it("matches string starting with prefix (case insensitive)", () => {
      const data = { slug: "blog-post-title" };
      const filter: FieldFilter = { field: "slug", operator: "startsWith", value: "blog-" };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match string not starting with prefix", () => {
      const data = { slug: "product-title" };
      const filter: FieldFilter = { field: "slug", operator: "startsWith", value: "blog-" };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });

  describe("endsWith operator", () => {
    it("matches string ending with suffix (case insensitive)", () => {
      const data = { filename: "document.pdf" };
      const filter: FieldFilter = { field: "filename", operator: "endsWith", value: ".pdf" };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match string not ending with suffix", () => {
      const data = { filename: "document.docx" };
      const filter: FieldFilter = { field: "filename", operator: "endsWith", value: ".pdf" };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });

  describe("in operator", () => {
    it("matches when value is in array", () => {
      const data = { category: "tech" };
      const filter: FieldFilter = { field: "category", operator: "in", value: ["tech", "science", "art"] };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match when value is not in array", () => {
      const data = { category: "sports" };
      const filter: FieldFilter = { field: "category", operator: "in", value: ["tech", "science", "art"] };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });

    it("matches number in array of numbers", () => {
      const data = { rating: 5 };
      const filter: FieldFilter = { field: "rating", operator: "in", value: [4, 5] };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });
  });

  describe("notIn operator", () => {
    it("matches when value is not in array", () => {
      const data = { status: "active" };
      const filter: FieldFilter = { field: "status", operator: "notIn", value: ["deleted", "archived"] };
      expect(matchesFieldFilter(data, filter)).toBe(true);
    });

    it("does not match when value is in array", () => {
      const data = { status: "deleted" };
      const filter: FieldFilter = { field: "status", operator: "notIn", value: ["deleted", "archived"] };
      expect(matchesFieldFilter(data, filter)).toBe(false);
    });
  });
});

describe("matchesAllFieldFilters", () => {
  it("returns true when no filters provided", () => {
    const data = { title: "Test" };
    expect(matchesAllFieldFilters(data, [])).toBe(true);
  });

  it("returns true when all filters match (AND logic)", () => {
    const data = { title: "Hello World", price: 150, category: "tech" };
    const filters: FieldFilter[] = [
      { field: "title", operator: "contains", value: "Hello" },
      { field: "price", operator: "gte", value: 100 },
      { field: "category", operator: "eq", value: "tech" },
    ];
    expect(matchesAllFieldFilters(data, filters)).toBe(true);
  });

  it("returns false when any filter does not match", () => {
    const data = { title: "Hello World", price: 50, category: "tech" };
    const filters: FieldFilter[] = [
      { field: "title", operator: "contains", value: "Hello" },
      { field: "price", operator: "gte", value: 100 }, // This fails
      { field: "category", operator: "eq", value: "tech" },
    ];
    expect(matchesAllFieldFilters(data, filters)).toBe(false);
  });

  it("handles range filters correctly", () => {
    const data = { price: 250 };
    const filters: FieldFilter[] = [
      { field: "price", operator: "gte", value: 100 },
      { field: "price", operator: "lte", value: 500 },
    ];
    expect(matchesAllFieldFilters(data, filters)).toBe(true);
  });

  it("handles range filters that exclude value", () => {
    const data = { price: 600 };
    const filters: FieldFilter[] = [
      { field: "price", operator: "gte", value: 100 },
      { field: "price", operator: "lte", value: 500 },
    ];
    expect(matchesAllFieldFilters(data, filters)).toBe(false);
  });
});
