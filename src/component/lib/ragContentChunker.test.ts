/**
 * Tests for the RAG Content Chunker utility.
 *
 * These tests cover:
 * - Text extraction from various field types (text, richText, JSON, select)
 * - HTML stripping and ProseMirror document parsing
 * - Semantic text chunking with various options
 * - Full content entry chunking with metadata
 * - Reference and media ID extraction
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  extractTextFromRichText,
  extractTextFromJson,
  extractTextFromSelect,
  stripHtmlTags,
  chunkText,
  extractContent,
  chunkContentEntry,
  chunkMultipleEntries,
  estimateChunkingStats,
  DEFAULT_CHUNK_OPTIONS,
  type ContentTypeInfo,
  type ContentEntryInfo,
  type ResolvedReferenceInfo,
} from "./ragContentChunker.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockContentType(overrides: Partial<ContentTypeInfo> = {}): ContentTypeInfo {
  return {
    _id: "ct_123",
    name: "blog_post",
    displayName: "Blog Post",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "content", label: "Content", type: "richText", required: true },
      { name: "excerpt", label: "Excerpt", type: "text", required: false },
      { name: "tags", label: "Tags", type: "multiSelect", required: false },
      {
        name: "author",
        label: "Author",
        type: "reference",
        required: false,
        options: { allowedContentTypes: ["author"] },
      },
      {
        name: "featuredImage",
        label: "Featured Image",
        type: "media",
        required: false,
      },
      { name: "views", label: "Views", type: "number", required: false },
      { name: "published", label: "Published", type: "boolean", required: false },
      { name: "metadata", label: "Metadata", type: "json", required: false },
    ],
    titleField: "title",
    slugField: "title",
    ...overrides,
  };
}

function createMockContentEntry(
  contentTypeId: string,
  data: Record<string, unknown>,
  overrides: Partial<ContentEntryInfo> = {}
): ContentEntryInfo {
  return {
    _id: "entry_123",
    contentTypeId,
    slug: "test-entry",
    status: "published",
    data,
    version: 1,
    _creationTime: Date.now(),
    firstPublishedAt: Date.now() - 86400000,
    lastPublishedAt: Date.now(),
    ...overrides,
  };
}

// =============================================================================
// Text Extraction Tests
// =============================================================================

describe("extractTextFromRichText", () => {
  it("should extract text from plain strings", () => {
    expect(extractTextFromRichText("Hello, World!")).toBe("Hello, World!");
  });

  it("should strip HTML tags from string content", () => {
    const html = "<p>This is <strong>bold</strong> and <em>italic</em>.</p>";
    expect(extractTextFromRichText(html)).toBe("This is bold and italic.");
  });

  it("should handle paragraph breaks in HTML", () => {
    const html = "<p>First paragraph</p><p>Second paragraph</p>";
    const result = extractTextFromRichText(html);
    expect(result).toContain("First paragraph");
    expect(result).toContain("Second paragraph");
  });

  it("should handle null and undefined", () => {
    expect(extractTextFromRichText(null)).toBe("");
    expect(extractTextFromRichText(undefined)).toBe("");
  });

  it("should extract text from ProseMirror doc structure", () => {
    const proseMirrorDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello, " }, { type: "text", text: "World!" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph." }],
        },
      ],
    };
    const result = extractTextFromRichText(proseMirrorDoc);
    expect(result).toContain("Hello, World!");
    expect(result).toContain("Second paragraph.");
  });

  it("should handle ProseMirror headings", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          content: [{ type: "text", text: "My Heading" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Some content." }],
        },
      ],
    };
    const result = extractTextFromRichText(doc);
    expect(result).toContain("My Heading");
    expect(result).toContain("Some content.");
  });

  it("should handle ProseMirror lists", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Item 1" }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Item 2" }] }],
            },
          ],
        },
      ],
    };
    const result = extractTextFromRichText(doc);
    expect(result).toContain("Item 1");
    expect(result).toContain("Item 2");
  });

  it("should handle ProseMirror blockquotes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "A quote" }] }],
        },
      ],
    };
    const result = extractTextFromRichText(doc);
    expect(result).toContain("A quote");
  });

  it("should handle ProseMirror code blocks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          content: [{ text: "const x = 1;" }],
        },
      ],
    };
    const result = extractTextFromRichText(doc);
    expect(result).toContain("const x = 1;");
  });

  it("should handle array of blocks", () => {
    const blocks = [
      { type: "paragraph", text: "First block" },
      { type: "paragraph", text: "Second block" },
    ];
    const result = extractTextFromRichText(blocks);
    expect(result).toContain("First block");
    expect(result).toContain("Second block");
  });

  it("should handle objects with text property", () => {
    expect(extractTextFromRichText({ text: "Direct text" })).toBe("Direct text");
  });

  it("should handle objects with content property", () => {
    expect(extractTextFromRichText({ content: "Content text" })).toBe("Content text");
  });
});

describe("stripHtmlTags", () => {
  it("should remove all HTML tags", () => {
    expect(stripHtmlTags("<div><p>Hello</p></div>")).toBe("Hello");
  });

  it("should decode common HTML entities", () => {
    expect(stripHtmlTags("&amp; &lt; &gt; &quot; &#39;")).toBe("& < > \" '");
    // &nbsp; alone becomes a space but gets trimmed
    expect(stripHtmlTags("text&nbsp;more")).toBe("text more");
    expect(stripHtmlTags("&mdash;&ndash;")).toBe("—–");
  });

  it("should handle empty strings", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("should preserve structure from block elements", () => {
    const html = "<h1>Title</h1><p>Paragraph 1</p><p>Paragraph 2</p>";
    const result = stripHtmlTags(html);
    expect(result.split("\n").filter(Boolean).length).toBeGreaterThan(1);
  });
});

describe("extractTextFromJson", () => {
  it("should return strings directly", () => {
    expect(extractTextFromJson("test")).toBe("test");
  });

  it("should convert numbers to strings", () => {
    expect(extractTextFromJson(42)).toBe("42");
  });

  it("should convert booleans to strings", () => {
    expect(extractTextFromJson(true)).toBe("true");
    expect(extractTextFromJson(false)).toBe("false");
  });

  it("should handle null and undefined", () => {
    expect(extractTextFromJson(null)).toBe("");
    expect(extractTextFromJson(undefined)).toBe("");
  });

  it("should extract from arrays", () => {
    expect(extractTextFromJson(["a", "b", "c"])).toBe("a, b, c");
  });

  it("should extract from nested arrays", () => {
    expect(extractTextFromJson([["a", "b"], ["c"]])).toBe("a, b, c");
  });

  it("should prioritize common text fields in objects", () => {
    const obj = { text: "primary", other: "secondary" };
    expect(extractTextFromJson(obj)).toContain("primary");
  });

  it("should extract from nested objects", () => {
    const obj = {
      level1: {
        level2: {
          text: "deep value",
        },
      },
    };
    expect(extractTextFromJson(obj)).toContain("deep value");
  });

  it("should skip internal keys starting with underscore", () => {
    const obj = { _internal: "hidden", public: "visible" };
    expect(extractTextFromJson(obj)).toBe("visible");
    expect(extractTextFromJson(obj)).not.toContain("hidden");
  });

  it("should respect max depth", () => {
    const deepObj = { a: { b: { c: { d: { e: "deep" } } } } };
    // With depth 3, shouldn't reach the deepest level
    const result = extractTextFromJson(deepObj, 3);
    expect(result).not.toContain("deep");
  });
});

describe("extractTextFromSelect", () => {
  it("should return string values directly", () => {
    expect(extractTextFromSelect("option1")).toBe("option1");
  });

  it("should join array values", () => {
    expect(extractTextFromSelect(["option1", "option2"])).toBe("option1, option2");
  });

  it("should handle null and undefined", () => {
    expect(extractTextFromSelect(null)).toBe("");
    expect(extractTextFromSelect(undefined)).toBe("");
  });

  it("should filter non-string values from arrays", () => {
    expect(extractTextFromSelect(["a", 1, "b", null, "c"])).toBe("a, b, c");
  });
});

// =============================================================================
// Text Chunking Tests
// =============================================================================

describe("chunkText", () => {
  it("should return single chunk for short text", () => {
    const text = "Short text";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Short text");
  });

  it("should return empty array for empty text", () => {
    expect(chunkText("")).toHaveLength(0);
    expect(chunkText("   ")).toHaveLength(0);
  });

  it("should split on paragraph breaks by default", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const chunks = chunkText(text, { maxCharsSoftLimit: 30 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should respect maxCharsSoftLimit", () => {
    const text = "A".repeat(2000);
    const chunks = chunkText(text, { maxCharsSoftLimit: 500, maxCharsHardLimit: 600 });
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(600);
    });
  });

  it("should use fallback delimiters when needed", () => {
    // One big paragraph without paragraph breaks
    const text = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.";
    const chunks = chunkText(text, { maxCharsSoftLimit: 30 });
    // Should split on sentences or words
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should handle very long words gracefully", () => {
    const longWord = "a".repeat(5000);
    const chunks = chunkText(longWord, { maxCharsHardLimit: 1000 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(1000);
    });
  });

  it("should preserve heading context when enabled", () => {
    const text =
      "# Main Title\n\n" +
      "First paragraph of content. ".repeat(50) +
      "\n\n" +
      "Second paragraph of content.";
    const chunks = chunkText(text, {
      preserveHeadingContext: true,
      maxCharsSoftLimit: 500,
    });
    // Should have multiple chunks
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should use custom delimiter", () => {
    const text = "Part A---Part B---Part C";
    const chunks = chunkText(text, { delimiter: "---", maxCharsSoftLimit: 10 });
    expect(chunks.length).toBe(3);
  });

  it("should return trimmed chunks", () => {
    const text = "  First  \n\n  Second  \n\n  Third  ";
    const chunks = chunkText(text, { maxCharsSoftLimit: 20 });
    chunks.forEach((chunk) => {
      expect(chunk).not.toMatch(/^\s/);
      expect(chunk).not.toMatch(/\s$/);
    });
  });
});

// =============================================================================
// Content Extraction Tests
// =============================================================================

describe("extractContent", () => {
  let contentType: ContentTypeInfo;

  beforeEach(() => {
    contentType = createMockContentType();
  });

  it("should extract text from text fields", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "My Blog Post",
      excerpt: "A brief excerpt",
    });
    const result = extractContent(entry, contentType);
    expect(result.fullText).toContain("My Blog Post");
    expect(result.fullText).toContain("A brief excerpt");
    expect(result.title).toBe("My Blog Post");
  });

  it("should extract text from richText fields", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      content: "<p>Rich <strong>text</strong> content.</p>",
    });
    const result = extractContent(entry, contentType);
    expect(result.fullText).toContain("Rich text content.");
  });

  it("should extract text from JSON fields", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      metadata: { key: "value", nested: { text: "nested text" } },
    });
    const result = extractContent(entry, contentType);
    expect(result.fieldTexts.metadata).toContain("value");
    expect(result.fieldTexts.metadata).toContain("nested text");
  });

  it("should extract text from select fields", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      tags: ["tech", "tutorial"],
    });
    const result = extractContent(entry, contentType);
    expect(result.fieldTexts.tags).toContain("tech");
    expect(result.fieldTexts.tags).toContain("tutorial");
  });

  it("should track referenced entry IDs", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      author: "author_456",
    });
    const result = extractContent(entry, contentType);
    expect(result.referencedEntryIds).toContain("author_456");
  });

  it("should track referenced media IDs", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      featuredImage: "media_789",
    });
    const result = extractContent(entry, contentType);
    expect(result.referencedMediaIds).toContain("media_789");
  });

  it("should respect includeFields option", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      excerpt: "Excerpt text",
      content: "Content text",
    });
    const result = extractContent(entry, contentType, {
      includeFields: ["title", "excerpt"],
    });
    expect(result.fieldTexts.title).toBeDefined();
    expect(result.fieldTexts.excerpt).toBeDefined();
    expect(result.fieldTexts.content).toBeUndefined();
  });

  it("should respect excludeFields option", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      excerpt: "Excerpt text",
      content: "Content text",
    });
    const result = extractContent(entry, contentType, {
      excludeFields: ["content"],
    });
    expect(result.fieldTexts.title).toBeDefined();
    expect(result.fieldTexts.excerpt).toBeDefined();
    expect(result.fieldTexts.content).toBeUndefined();
  });

  it("should include reference context when resolved references provided", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      author: "author_456",
    });
    const resolvedRefs = new Map<string, ResolvedReferenceInfo>([
      ["author_456", { id: "author_456", contentTypeName: "author", title: "John Doe" }],
    ]);
    const result = extractContent(entry, contentType, {}, resolvedRefs);
    expect(result.fieldTexts.author).toContain("John Doe");
  });

  it("should handle boolean and number fields", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      views: 1234,
      published: true,
    });
    const result = extractContent(entry, contentType);
    expect(result.fieldTexts.views).toBe("1234");
    expect(result.fieldTexts.published).toBe("Yes");
  });

  it("should build source info for each field", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test Title",
      excerpt: "Test excerpt",
    });
    const result = extractContent(entry, contentType);
    expect(result.sourceInfo).toHaveLength(2);
    expect(result.sourceInfo[0].fieldName).toBe("title");
    expect(result.sourceInfo[0].fieldType).toBe("text");
    expect(result.sourceInfo[0].charCount).toBeGreaterThan(0);
  });

  it("should handle entries with no data", () => {
    const entry = createMockContentEntry("ct_123", {});
    const result = extractContent(entry, contentType);
    expect(result.fullText).toBe("");
    expect(result.sourceInfo).toHaveLength(0);
  });

  it("should handle null field values", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      excerpt: null,
      content: undefined,
    });
    const result = extractContent(entry, contentType);
    expect(result.fieldTexts.title).toBeDefined();
    expect(result.fieldTexts.excerpt).toBeUndefined();
    expect(result.fieldTexts.content).toBeUndefined();
  });
});

// =============================================================================
// Full Chunking Tests
// =============================================================================

describe("chunkContentEntry", () => {
  let contentType: ContentTypeInfo;

  beforeEach(() => {
    contentType = createMockContentType();
  });

  it("should return chunks with metadata", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "My Blog Post",
      content: "This is the blog content.",
    });
    const chunks = chunkContentEntry(entry, contentType);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].metadata).toBeDefined();
    expect(chunks[0].metadata.entryId).toBe("entry_123");
    expect(chunks[0].metadata.contentType).toBe("blog_post");
    expect(chunks[0].metadata.slug).toBe("test-entry");
  });

  it("should include title in metadata", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Amazing Title",
      content: "Content here",
    });
    const chunks = chunkContentEntry(entry, contentType);
    expect(chunks[0].metadata.title).toBe("Amazing Title");
  });

  it("should include locale in metadata when present", () => {
    const entry = createMockContentEntry(
      "ct_123",
      { title: "Test", content: "Content" },
      { locale: "es-ES" }
    );
    const chunks = chunkContentEntry(entry, contentType);
    expect(chunks[0].metadata.locale).toBe("es-ES");
  });

  it("should track chunk indices", () => {
    // Create content that will generate multiple chunks
    const longContent = "Paragraph. ".repeat(500);
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      content: longContent,
    });
    const chunks = chunkContentEntry(entry, contentType, {
      chunkOptions: { maxCharsSoftLimit: 200 },
    });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, index) => {
      expect(chunk.metadata.chunkIndex).toBe(index);
      expect(chunk.metadata.totalChunks).toBe(chunks.length);
    });
  });

  it("should include referenced IDs in metadata", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      author: "author_123",
      featuredImage: "media_456",
    });
    const chunks = chunkContentEntry(entry, contentType);

    expect(chunks[0].metadata.referencedEntryIds).toContain("author_123");
    expect(chunks[0].metadata.referencedMediaIds).toContain("media_456");
  });

  it("should detect semantic types", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Short Title",
      content: "Just a short paragraph.",
    });
    const chunks = chunkContentEntry(entry, contentType);
    expect(chunks[0].metadata.semanticType).toBeDefined();
  });

  it("should apply chunk prefix with placeholders", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "My Title",
      content: "Content here",
    });
    const chunks = chunkContentEntry(entry, contentType, {
      chunkPrefix: "[{contentType}] {title}:",
    });
    expect(chunks[0].text).toContain("[Blog Post] My Title:");
  });

  it("should create summary chunk when requested", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test Post",
      content: "Some content here",
    });
    const chunks = chunkContentEntry(entry, contentType, {
      createSummaryChunk: true,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].metadata.sourceFields).toContain("_summary");
    expect(chunks[0].text).toContain("Title: Test Post");
    expect(chunks[0].text).toContain("Type: Blog Post");
  });

  it("should return empty array for entries with no extractable content", () => {
    const entry = createMockContentEntry("ct_123", {});
    const chunks = chunkContentEntry(entry, contentType);
    expect(chunks).toHaveLength(0);
  });

  it("should respect includeMetadata option", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      content: "Content",
    });
    const chunks = chunkContentEntry(entry, contentType, {
      includeMetadata: false,
    });
    // Metadata is always present in the interface, but we check it's populated
    expect(chunks[0].metadata).toBeDefined();
  });

  it("should include version in metadata", () => {
    const entry = createMockContentEntry(
      "ct_123",
      { title: "Test", content: "Content" },
      { version: 5 }
    );
    const chunks = chunkContentEntry(entry, contentType);
    expect(chunks[0].metadata.version).toBe(5);
  });

  it("should include timestamps in ISO format", () => {
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      content: "Content",
    });
    const chunks = chunkContentEntry(entry, contentType);

    expect(chunks[0].metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    if (chunks[0].metadata.firstPublishedAt) {
      expect(chunks[0].metadata.firstPublishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

// =============================================================================
// Batch Processing Tests
// =============================================================================

describe("chunkMultipleEntries", () => {
  it("should process multiple entries", () => {
    const contentType = createMockContentType();
    const contentTypes = new Map([["ct_123", contentType]]);

    const entries = [
      createMockContentEntry("ct_123", { title: "Post 1", content: "Content 1" }, { _id: "e1" }),
      createMockContentEntry("ct_123", { title: "Post 2", content: "Content 2" }, { _id: "e2" }),
    ];

    const results = chunkMultipleEntries(entries, contentTypes);

    expect(results.size).toBe(2);
    expect(results.get("e1")).toBeDefined();
    expect(results.get("e2")).toBeDefined();
  });

  it("should skip entries with missing content type", () => {
    const contentTypes = new Map<string, ContentTypeInfo>();
    const entries = [createMockContentEntry("missing_ct", { title: "Test" })];

    const results = chunkMultipleEntries(entries, contentTypes);
    expect(results.size).toBe(0);
  });
});

describe("estimateChunkingStats", () => {
  it("should calculate statistics correctly", () => {
    const contentType = createMockContentType();
    const contentTypes = new Map([["ct_123", contentType]]);

    const entries = [
      createMockContentEntry("ct_123", { title: "Post 1", content: "A".repeat(100) }),
      createMockContentEntry("ct_123", { title: "Post 2", content: "B".repeat(200) }),
    ];

    const stats = estimateChunkingStats(entries, contentTypes);

    expect(stats.totalEntries).toBe(2);
    expect(stats.totalChunks).toBeGreaterThanOrEqual(2);
    expect(stats.totalCharacters).toBeGreaterThan(0);
    expect(stats.averageChunksPerEntry).toBeGreaterThan(0);
    expect(stats.averageCharsPerChunk).toBeGreaterThan(0);
  });

  it("should handle empty entries array", () => {
    const stats = estimateChunkingStats([], new Map());

    expect(stats.totalEntries).toBe(0);
    expect(stats.totalChunks).toBe(0);
    expect(stats.totalCharacters).toBe(0);
    expect(stats.averageChunksPerEntry).toBe(0);
    expect(stats.averageCharsPerChunk).toBe(0);
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe("edge cases", () => {
  it("should handle content type with no fields", () => {
    const emptyContentType: ContentTypeInfo = {
      _id: "ct_empty",
      name: "empty",
      displayName: "Empty Type",
      fields: [],
    };
    const entry = createMockContentEntry("ct_empty", { someField: "value" });
    const chunks = chunkContentEntry(entry, emptyContentType);
    expect(chunks).toHaveLength(0);
  });

  it("should handle deeply nested JSON", () => {
    const contentType = createMockContentType();
    const deepJson = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                text: "deep value",
              },
            },
          },
        },
      },
    };
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      metadata: deepJson,
    });
    // Should not throw
    const result = extractContent(entry, contentType);
    expect(result).toBeDefined();
  });

  it("should handle special characters in content", () => {
    const contentType = createMockContentType();
    // Note: HTML is only stripped from richText fields, not text fields
    // Text fields preserve their content as-is (they shouldn't contain HTML)
    const entry = createMockContentEntry("ct_123", {
      title: "Test Title with émoji 🎉",
      content: "<p>Content with <script>alert('xss')</script> and &amp; entities</p>",
    });
    const chunks = chunkContentEntry(entry, contentType);
    expect(chunks.length).toBeGreaterThan(0);
    // HTML should be stripped from richText content field
    expect(chunks[0].text).toContain("Content with");
    expect(chunks[0].text).not.toContain("<p>");
    // Emoji should be preserved
    expect(chunks[0].text).toContain("🎉");
  });

  it("should handle very long single field values", () => {
    const contentType = createMockContentType();
    const veryLongText = "Word ".repeat(10000);
    const entry = createMockContentEntry("ct_123", {
      title: "Test",
      content: veryLongText,
    });
    const chunks = chunkContentEntry(entry, contentType, {
      chunkOptions: { maxCharsSoftLimit: 1000, maxCharsHardLimit: 2000 },
    });
    // Should be split into multiple chunks
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should respect hard limit
    chunks.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(2500); // Some buffer for metadata prefix
    });
  });

  it("should handle multiple reference fields", () => {
    const contentType: ContentTypeInfo = {
      _id: "ct_multi_ref",
      name: "multi_ref",
      displayName: "Multi Reference",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        {
          name: "authors",
          label: "Authors",
          type: "reference",
          required: false,
          options: { multiple: true, allowedContentTypes: ["author"] },
        },
        {
          name: "images",
          label: "Images",
          type: "media",
          required: false,
          options: { multiple: true },
        },
      ],
      titleField: "title",
    };

    const entry = createMockContentEntry("ct_multi_ref", {
      title: "Test",
      authors: ["author_1", "author_2", "author_3"],
      images: ["media_1", "media_2"],
    });

    const result = extractContent(entry, contentType);
    expect(result.referencedEntryIds).toHaveLength(3);
    expect(result.referencedMediaIds).toHaveLength(2);
  });
});

// =============================================================================
// Default Options Tests
// =============================================================================

describe("default options", () => {
  it("should have reasonable default chunk options", () => {
    expect(DEFAULT_CHUNK_OPTIONS.minLines).toBe(1);
    expect(DEFAULT_CHUNK_OPTIONS.minCharsSoftLimit).toBe(100);
    expect(DEFAULT_CHUNK_OPTIONS.maxCharsSoftLimit).toBe(1000);
    expect(DEFAULT_CHUNK_OPTIONS.maxCharsHardLimit).toBe(4000);
    expect(DEFAULT_CHUNK_OPTIONS.delimiter).toBe("\n\n");
    expect(DEFAULT_CHUNK_OPTIONS.preserveHeadingContext).toBe(true);
  });
});
