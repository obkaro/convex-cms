/**
 * Tests for Reference Resolver Utilities
 *
 * These tests verify the reference extraction and type utilities.
 * Database-dependent tests would require convex-test setup.
 */
import { describe, it, expect } from "vitest";
import { extractReferenceIds } from "../../../src/component/lib/referenceResolver.js";

// =============================================================================
// extractReferenceIds Tests
// =============================================================================

describe("extractReferenceIds", () => {
  it("should extract single reference IDs", () => {
    const fields = [
      { name: "author", type: "reference", options: {} },
      { name: "title", type: "text" },
    ];

    const data = {
      author: "user_123",
      title: "Hello World",
    };

    const ids = extractReferenceIds(data, fields);
    expect(ids).toEqual(["user_123"]);
  });

  it("should extract multiple reference IDs", () => {
    const fields = [
      { name: "relatedPosts", type: "reference", options: { multiple: true } },
      { name: "title", type: "text" },
    ];

    const data = {
      relatedPosts: ["post_1", "post_2", "post_3"],
      title: "Hello World",
    };

    const ids = extractReferenceIds(data, fields);
    expect(ids).toEqual(["post_1", "post_2", "post_3"]);
  });

  it("should extract from multiple reference fields", () => {
    const fields = [
      { name: "author", type: "reference", options: {} },
      { name: "editor", type: "reference", options: {} },
      { name: "relatedPosts", type: "reference", options: { multiple: true } },
    ];

    const data = {
      author: "user_1",
      editor: "user_2",
      relatedPosts: ["post_1", "post_2"],
    };

    const ids = extractReferenceIds(data, fields);
    expect(ids).toEqual(["user_1", "user_2", "post_1", "post_2"]);
  });

  it("should skip null/undefined reference values", () => {
    const fields = [
      { name: "author", type: "reference", options: {} },
      { name: "editor", type: "reference", options: {} },
    ];

    const data = {
      author: "user_1",
      editor: null,
    };

    const ids = extractReferenceIds(data, fields);
    expect(ids).toEqual(["user_1"]);
  });

  it("should skip empty reference arrays", () => {
    const fields = [
      { name: "relatedPosts", type: "reference", options: { multiple: true } },
    ];

    const data = {
      relatedPosts: [],
    };

    const ids = extractReferenceIds(data, fields);
    expect(ids).toEqual([]);
  });

  it("should skip non-string values in arrays", () => {
    const fields = [
      { name: "relatedPosts", type: "reference", options: { multiple: true } },
    ];

    const data = {
      relatedPosts: ["post_1", 123, "post_2"],
    };

    const ids = extractReferenceIds(data, fields);
    expect(ids).toEqual(["post_1", "post_2"]);
  });

  it("should ignore non-reference fields", () => {
    const fields = [
      { name: "title", type: "text" },
      { name: "count", type: "number" },
      { name: "author", type: "reference", options: {} },
    ];

    const data = {
      title: "Hello",
      count: 42,
      author: "user_1",
    };

    const ids = extractReferenceIds(data, fields);
    expect(ids).toEqual(["user_1"]);
  });

  it("should return empty array when no reference fields", () => {
    const fields = [
      { name: "title", type: "text" },
      { name: "body", type: "richText" },
    ];

    const data = {
      title: "Hello",
      body: "<p>World</p>",
    };

    const ids = extractReferenceIds(data, fields);
    expect(ids).toEqual([]);
  });

  it("should return empty array when data is empty", () => {
    const fields = [
      { name: "author", type: "reference", options: {} },
    ];

    const ids = extractReferenceIds({}, fields);
    expect(ids).toEqual([]);
  });
});
