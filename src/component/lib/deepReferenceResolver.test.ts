/**
 * Tests for Deep Reference Resolver Utilities
 *
 * These tests verify the recursive reference resolution with depth limiting
 * and circular reference prevention. Since the actual resolution functions
 * require database context, we focus on testing the utility functions and
 * type guards that can be tested in isolation.
 */
import { describe, it, expect } from "vitest";
import {
  findCircularReferenceMarkers,
  flattenResolvedReferences,
  countResolvedReferences,
  type ResolvedContentEntry,
  type DeepResolveOptions,
} from "./deepReferenceResolver.js";

// =============================================================================
// Test Data Helpers
// =============================================================================

/**
 * Create a mock resolved content entry for testing.
 */
function createMockResolvedEntry(
  overrides: Partial<ResolvedContentEntry> = {}
): ResolvedContentEntry {
  return {
    id: "entry_" + Math.random().toString(36).substr(2, 9),
    contentTypeName: "test_type",
    contentTypeDisplayName: "Test Type",
    slug: "test-entry",
    status: "published",
    data: {},
    exists: true,
    ...overrides,
  };
}

/**
 * Create a mock resolved media reference for testing.
 */
function createMockResolvedMedia(overrides: Record<string, unknown> = {}) {
  return {
    id: "media_" + Math.random().toString(36).substr(2, 9),
    storageId: "storage_123",
    url: "https://example.com/image.jpg",
    filename: "image.jpg",
    mimeType: "image/jpeg",
    size: 12345,
    type: "image",
    exists: true,
    ...overrides,
  };
}

// =============================================================================
// findCircularReferenceMarkers Tests
// =============================================================================

describe("findCircularReferenceMarkers", () => {
  it("should return empty array for data without circular references", () => {
    const data = {
      title: "Hello",
      author: {
        name: "John",
      },
    };

    const markers = findCircularReferenceMarkers(data);
    expect(markers).toEqual([]);
  });

  it("should find _circularReferences at root level", () => {
    const data = {
      title: "Hello",
      _circularReferences: ["author:entry_123"],
    };

    const markers = findCircularReferenceMarkers(data);
    expect(markers).toEqual([""]);
  });

  it("should find _circularReferences in nested objects", () => {
    const data = {
      title: "Hello",
      author: {
        name: "John",
        _circularReferences: ["company:entry_456"],
      },
    };

    const markers = findCircularReferenceMarkers(data);
    expect(markers).toEqual(["author"]);
  });

  it("should find _circularReferences in deeply nested objects", () => {
    const data = {
      level1: {
        level2: {
          level3: {
            _circularReferences: ["ref:entry_789"],
          },
        },
      },
    };

    const markers = findCircularReferenceMarkers(data);
    expect(markers).toEqual(["level1.level2.level3"]);
  });

  it("should find _circularReferences in arrays", () => {
    const data = {
      items: [
        { name: "Item 1" },
        { name: "Item 2", _circularReferences: ["parent:entry_123"] },
        { name: "Item 3" },
      ],
    };

    const markers = findCircularReferenceMarkers(data);
    expect(markers).toEqual(["items[1]"]);
  });

  it("should find multiple _circularReferences markers", () => {
    const data = {
      _circularReferences: ["root:entry_1"],
      nested: {
        _circularReferences: ["nested:entry_2"],
      },
      items: [
        { _circularReferences: ["item:entry_3"] },
      ],
    };

    const markers = findCircularReferenceMarkers(data);
    expect(markers).toContain("");
    expect(markers).toContain("nested");
    expect(markers).toContain("items[0]");
    expect(markers).toHaveLength(3);
  });

  it("should handle null and undefined values", () => {
    const data = {
      nullField: null,
      undefinedField: undefined,
      normalField: "value",
    };

    const markers = findCircularReferenceMarkers(data);
    expect(markers).toEqual([]);
  });
});

// =============================================================================
// flattenResolvedReferences Tests
// =============================================================================

describe("flattenResolvedReferences", () => {
  it("should return empty map for empty array", () => {
    const map = flattenResolvedReferences([]);
    expect(map.size).toBe(0);
  });

  it("should add top-level entries to map", () => {
    const entry1 = createMockResolvedEntry({ id: "entry_1" });
    const entry2 = createMockResolvedEntry({ id: "entry_2" });

    const map = flattenResolvedReferences([entry1, entry2]);

    expect(map.size).toBe(2);
    expect(map.get("entry_1")).toEqual(entry1);
    expect(map.get("entry_2")).toEqual(entry2);
  });

  it("should extract nested resolved content entries", () => {
    const nestedEntry = createMockResolvedEntry({ id: "nested_entry" });
    const topEntry = createMockResolvedEntry({
      id: "top_entry",
      data: {
        author: nestedEntry,
      },
    });

    const map = flattenResolvedReferences([topEntry]);

    expect(map.size).toBe(2);
    expect(map.has("top_entry")).toBe(true);
    expect(map.has("nested_entry")).toBe(true);
  });

  it("should extract entries from arrays", () => {
    const related1 = createMockResolvedEntry({ id: "related_1" });
    const related2 = createMockResolvedEntry({ id: "related_2" });
    const topEntry = createMockResolvedEntry({
      id: "top_entry",
      data: {
        relatedPosts: [related1, related2],
      },
    });

    const map = flattenResolvedReferences([topEntry]);

    expect(map.size).toBe(3);
    expect(map.has("top_entry")).toBe(true);
    expect(map.has("related_1")).toBe(true);
    expect(map.has("related_2")).toBe(true);
  });

  it("should extract deeply nested entries", () => {
    const deepEntry = createMockResolvedEntry({ id: "deep_entry" });
    const midEntry = createMockResolvedEntry({
      id: "mid_entry",
      data: { nested: deepEntry },
    });
    const topEntry = createMockResolvedEntry({
      id: "top_entry",
      data: { child: midEntry },
    });

    const map = flattenResolvedReferences([topEntry]);

    expect(map.size).toBe(3);
    expect(map.has("top_entry")).toBe(true);
    expect(map.has("mid_entry")).toBe(true);
    expect(map.has("deep_entry")).toBe(true);
  });

  it("should deduplicate entries with same ID", () => {
    const sharedEntry = createMockResolvedEntry({ id: "shared" });
    const entry1 = createMockResolvedEntry({
      id: "entry_1",
      data: { ref: sharedEntry },
    });
    const entry2 = createMockResolvedEntry({
      id: "entry_2",
      data: { ref: sharedEntry },
    });

    const map = flattenResolvedReferences([entry1, entry2]);

    expect(map.size).toBe(3);
    expect(map.has("shared")).toBe(true);
  });

  it("should handle entries with mixed content types", () => {
    const authorEntry = createMockResolvedEntry({
      id: "author_1",
      contentTypeName: "user",
    });
    const tagEntry = createMockResolvedEntry({
      id: "tag_1",
      contentTypeName: "tag",
    });
    const postEntry = createMockResolvedEntry({
      id: "post_1",
      contentTypeName: "blog_post",
      data: {
        author: authorEntry,
        tags: [tagEntry],
      },
    });

    const map = flattenResolvedReferences([postEntry]);

    expect(map.size).toBe(3);
    expect(map.get("author_1")?.contentTypeName).toBe("user");
    expect(map.get("tag_1")?.contentTypeName).toBe("tag");
    expect(map.get("post_1")?.contentTypeName).toBe("blog_post");
  });
});

// =============================================================================
// countResolvedReferences Tests
// =============================================================================

describe("countResolvedReferences", () => {
  it("should return zeros for entry with no references", () => {
    const entry = createMockResolvedEntry({
      data: {
        title: "Hello",
        description: "World",
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts).toEqual({ content: 0, media: 0, total: 0 });
  });

  it("should count a single content reference", () => {
    const authorEntry = createMockResolvedEntry({ id: "author_1" });
    const entry = createMockResolvedEntry({
      data: {
        author: authorEntry,
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts.content).toBe(1);
    expect(counts.media).toBe(0);
    expect(counts.total).toBe(1);
  });

  it("should count multiple content references", () => {
    const author = createMockResolvedEntry({ id: "author_1" });
    const editor = createMockResolvedEntry({ id: "editor_1" });
    const entry = createMockResolvedEntry({
      data: {
        author,
        editor,
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts.content).toBe(2);
    expect(counts.media).toBe(0);
    expect(counts.total).toBe(2);
  });

  it("should count content references in arrays", () => {
    const related1 = createMockResolvedEntry({ id: "related_1" });
    const related2 = createMockResolvedEntry({ id: "related_2" });
    const related3 = createMockResolvedEntry({ id: "related_3" });
    const entry = createMockResolvedEntry({
      data: {
        relatedPosts: [related1, related2, related3],
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts.content).toBe(3);
    expect(counts.total).toBe(3);
  });

  it("should count a single media reference", () => {
    const media = createMockResolvedMedia({ id: "media_1" });
    const entry = createMockResolvedEntry({
      data: {
        featuredImage: media,
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts.media).toBe(1);
    expect(counts.content).toBe(0);
    expect(counts.total).toBe(1);
  });

  it("should count multiple media references", () => {
    const media1 = createMockResolvedMedia({ id: "media_1" });
    const media2 = createMockResolvedMedia({ id: "media_2" });
    const entry = createMockResolvedEntry({
      data: {
        gallery: [media1, media2],
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts.media).toBe(2);
    expect(counts.total).toBe(2);
  });

  it("should count both content and media references", () => {
    const author = createMockResolvedEntry({ id: "author_1" });
    const media = createMockResolvedMedia({ id: "media_1" });
    const entry = createMockResolvedEntry({
      data: {
        author,
        featuredImage: media,
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts.content).toBe(1);
    expect(counts.media).toBe(1);
    expect(counts.total).toBe(2);
  });

  it("should count nested references", () => {
    const deepMedia = createMockResolvedMedia({ id: "deep_media" });
    const nestedAuthor = createMockResolvedEntry({
      id: "nested_author",
      data: { avatar: deepMedia },
    });
    const entry = createMockResolvedEntry({
      data: {
        author: nestedAuthor,
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts.content).toBe(1);
    expect(counts.media).toBe(1);
    expect(counts.total).toBe(2);
  });

  it("should count deeply nested references", () => {
    const companyLogo = createMockResolvedMedia({ id: "company_logo" });
    const company = createMockResolvedEntry({
      id: "company",
      data: { logo: companyLogo },
    });
    const authorAvatar = createMockResolvedMedia({ id: "author_avatar" });
    const author = createMockResolvedEntry({
      id: "author",
      data: {
        avatar: authorAvatar,
        company,
      },
    });
    const entry = createMockResolvedEntry({
      data: { author },
    });

    const counts = countResolvedReferences(entry);

    // author (1 content) + company (1 content) + authorAvatar (1 media) + companyLogo (1 media)
    expect(counts.content).toBe(2);
    expect(counts.media).toBe(2);
    expect(counts.total).toBe(4);
  });

  it("should handle mixed arrays correctly", () => {
    const related1 = createMockResolvedEntry({ id: "related_1" });
    const related2 = createMockResolvedEntry({ id: "related_2" });
    const image1 = createMockResolvedMedia({ id: "image_1" });
    const image2 = createMockResolvedMedia({ id: "image_2" });
    const entry = createMockResolvedEntry({
      data: {
        relatedPosts: [related1, related2],
        gallery: [image1, image2],
      },
    });

    const counts = countResolvedReferences(entry);

    expect(counts.content).toBe(2);
    expect(counts.media).toBe(2);
    expect(counts.total).toBe(4);
  });
});

// =============================================================================
// DeepResolveOptions Type Tests
// =============================================================================

describe("DeepResolveOptions type", () => {
  it("should allow minimal options", () => {
    const options: DeepResolveOptions = {};
    expect(options).toBeDefined();
  });

  it("should allow all options", () => {
    const options: DeepResolveOptions = {
      maxDepth: 3,
      resolveMedia: true,
      resolveContent: true,
      publishedOnly: true,
      includeDeleted: false,
      fields: ["title", "slug"],
      onlyFields: ["author", "featuredImage"],
      excludeFields: ["internalNotes"],
      preserveOriginalIds: true,
    };

    expect(options.maxDepth).toBe(3);
    expect(options.resolveMedia).toBe(true);
    expect(options.resolveContent).toBe(true);
    expect(options.publishedOnly).toBe(true);
    expect(options.includeDeleted).toBe(false);
    expect(options.fields).toEqual(["title", "slug"]);
    expect(options.onlyFields).toEqual(["author", "featuredImage"]);
    expect(options.excludeFields).toEqual(["internalNotes"]);
    expect(options.preserveOriginalIds).toBe(true);
  });

  it("should default maxDepth to 1 conceptually", () => {
    const options: DeepResolveOptions = {};
    // In actual implementation, undefined maxDepth defaults to 1
    expect(options.maxDepth).toBeUndefined();
  });
});

// =============================================================================
// ResolvedContentEntry Type Tests
// =============================================================================

describe("ResolvedContentEntry structure", () => {
  it("should have required fields", () => {
    const entry = createMockResolvedEntry();

    expect(entry.id).toBeDefined();
    expect(entry.contentTypeName).toBeDefined();
    expect(entry.contentTypeDisplayName).toBeDefined();
    expect(entry.slug).toBeDefined();
    expect(entry.status).toBeDefined();
    expect(entry.data).toBeDefined();
    expect(entry.exists).toBeDefined();
  });

  it("should allow optional fields", () => {
    const entry = createMockResolvedEntry({
      locale: "en-US",
      version: 5,
      _circularReferences: ["author:entry_123"],
      _unresolvedReferences: { editor: ["entry_456"] },
      _originalId: "original_entry_id",
    });

    expect(entry.locale).toBe("en-US");
    expect(entry.version).toBe(5);
    expect(entry._circularReferences).toEqual(["author:entry_123"]);
    expect(entry._unresolvedReferences).toEqual({ editor: ["entry_456"] });
    expect(entry._originalId).toBe("original_entry_id");
  });

  it("should allow all status values", () => {
    const statuses: Array<"draft" | "published" | "archived" | "scheduled"> = [
      "draft",
      "published",
      "archived",
      "scheduled",
    ];

    for (const status of statuses) {
      const entry = createMockResolvedEntry({ status });
      expect(entry.status).toBe(status);
    }
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Edge cases", () => {
  it("should handle empty data object", () => {
    const entry = createMockResolvedEntry({ data: {} });
    const counts = countResolvedReferences(entry);

    expect(counts).toEqual({ content: 0, media: 0, total: 0 });
  });

  it("should handle data with only primitive values", () => {
    const entry = createMockResolvedEntry({
      data: {
        string: "hello",
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
      },
    });

    const counts = countResolvedReferences(entry);
    const markers = findCircularReferenceMarkers(entry.data);

    expect(counts).toEqual({ content: 0, media: 0, total: 0 });
    expect(markers).toEqual([]);
  });

  it("should handle deeply nested empty objects", () => {
    const entry = createMockResolvedEntry({
      data: {
        level1: {
          level2: {
            level3: {
              level4: {},
            },
          },
        },
      },
    });

    const counts = countResolvedReferences(entry);
    expect(counts).toEqual({ content: 0, media: 0, total: 0 });
  });

  it("should handle empty arrays", () => {
    const entry = createMockResolvedEntry({
      data: {
        emptyArray: [],
        nestedEmpty: { arr: [] },
      },
    });

    const counts = countResolvedReferences(entry);
    expect(counts).toEqual({ content: 0, media: 0, total: 0 });
  });

  it("should handle arrays with null values", () => {
    const entry = createMockResolvedEntry({
      data: {
        mixedArray: [null, undefined, "string", 123],
      },
    });

    const counts = countResolvedReferences(entry);
    expect(counts).toEqual({ content: 0, media: 0, total: 0 });
  });

  it("should handle circular reference markers in arrays", () => {
    const data = {
      items: [
        { value: 1 },
        { value: 2, _circularReferences: ["self:entry_1"] },
      ],
    };

    const markers = findCircularReferenceMarkers(data);
    expect(markers).toContain("items[1]");
  });
});

// =============================================================================
// Integration-like Tests (Testing the Type System)
// =============================================================================

describe("Integration patterns", () => {
  it("should support typical blog post structure", () => {
    const author = createMockResolvedEntry({
      id: "author_1",
      contentTypeName: "user",
      data: {
        name: "Jane Doe",
        bio: "Writer and developer",
        avatar: createMockResolvedMedia({ id: "avatar_1" }),
      },
    });

    const category = createMockResolvedEntry({
      id: "category_1",
      contentTypeName: "category",
      data: {
        name: "Technology",
        slug: "technology",
      },
    });

    const blogPost = createMockResolvedEntry({
      id: "post_1",
      contentTypeName: "blog_post",
      data: {
        title: "Understanding TypeScript",
        content: "TypeScript is...",
        author,
        category,
        featuredImage: createMockResolvedMedia({ id: "featured_1" }),
        gallery: [
          createMockResolvedMedia({ id: "gallery_1" }),
          createMockResolvedMedia({ id: "gallery_2" }),
        ],
      },
    });

    const counts = countResolvedReferences(blogPost);

    // author (1) + category (1) + author.avatar (1 media) + featuredImage (1) + gallery (2)
    expect(counts.content).toBe(2);
    expect(counts.media).toBe(4);
    expect(counts.total).toBe(6);
  });

  it("should support e-commerce product structure", () => {
    const brand = createMockResolvedEntry({
      id: "brand_1",
      contentTypeName: "brand",
      data: { name: "ACME" },
    });

    const variant1 = createMockResolvedEntry({
      id: "variant_1",
      contentTypeName: "product_variant",
      data: {
        sku: "PROD-001-RED",
        color: "Red",
        image: createMockResolvedMedia({ id: "variant_image_1" }),
      },
    });

    const variant2 = createMockResolvedEntry({
      id: "variant_2",
      contentTypeName: "product_variant",
      data: {
        sku: "PROD-001-BLUE",
        color: "Blue",
        image: createMockResolvedMedia({ id: "variant_image_2" }),
      },
    });

    const product = createMockResolvedEntry({
      id: "product_1",
      contentTypeName: "product",
      data: {
        name: "Widget",
        price: 29.99,
        brand,
        variants: [variant1, variant2],
        mainImage: createMockResolvedMedia({ id: "main_image" }),
      },
    });

    const counts = countResolvedReferences(product);
    const map = flattenResolvedReferences([product]);

    // Content: brand (1) + variant1 (1) + variant2 (1) = 3
    // Media: variant_image_1 (1) + variant_image_2 (1) + mainImage (1) = 3
    expect(counts.content).toBe(3);
    expect(counts.media).toBe(3);
    expect(counts.total).toBe(6);

    // Map should have: product, brand, variant1, variant2
    expect(map.size).toBe(4);
    expect(map.has("product_1")).toBe(true);
    expect(map.has("brand_1")).toBe(true);
    expect(map.has("variant_1")).toBe(true);
    expect(map.has("variant_2")).toBe(true);
  });

  it("should handle entries with circular reference metadata", () => {
    const entry = createMockResolvedEntry({
      id: "entry_1",
      data: {
        title: "Self-referencing post",
      },
      _circularReferences: ["relatedPosts:entry_1"],
      _unresolvedReferences: {
        author: ["missing_author_id"],
      },
    });

    expect(entry._circularReferences).toContain("relatedPosts:entry_1");
    expect(entry._unresolvedReferences?.author).toContain("missing_author_id");
  });
});
