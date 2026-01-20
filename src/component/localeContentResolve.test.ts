/**
 * Locale Content Resolution Tests
 *
 * Tests for the locale content resolution feature that allows querying
 * content in a requested locale with fallback support.
 */
import { describe, expect, it } from "vitest";
import {
  resolveLocaleContent,
  resolveLocaleContentBatch,
  type LocaleResolvedEntry,
  type ResolveLocaleOptions,
} from "./localeFields.js";
import type { FieldDefinition } from "./validation.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Sample field definitions for testing.
 */
const testFields: FieldDefinition[] = [
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    localized: false,
  },
  {
    name: "title",
    label: "Title",
    type: "text",
    required: true,
    localized: true,
  },
  {
    name: "content",
    label: "Content",
    type: "richText",
    required: false,
    localized: true,
  },
  {
    name: "excerpt",
    label: "Excerpt",
    type: "text",
    required: false,
    localized: true,
  },
  {
    name: "views",
    label: "Views",
    type: "number",
    required: false,
    localized: false,
  },
];

/**
 * Creates a mock content entry for testing.
 */
function createMockEntry(data: Record<string, unknown>) {
  return {
    _id: "entry_123" as any,
    _creationTime: Date.now(),
    contentTypeId: "type_123" as any,
    slug: "test-entry",
    status: "published" as const,
    version: 1,
    data,
    createdBy: "user_123",
    updatedBy: "user_123",
  };
}

// =============================================================================
// resolveLocaleContent Tests
// =============================================================================

describe("resolveLocaleContent", () => {
  describe("basic resolution", () => {
    it("should resolve all localized fields to the requested locale", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello World", "es-ES": "Hola Mundo" },
        content: { "en-US": "<p>Welcome</p>", "es-ES": "<p>Bienvenido</p>" },
        views: 100,
      });

      const result = resolveLocaleContent(entry, {
        locale: "es-ES",
        fields: testFields,
      });

      // Check resolved data
      expect(result.data.slug).toBe("my-post");
      expect(result.data.title).toBe("Hola Mundo");
      expect(result.data.content).toBe("<p>Bienvenido</p>");
      expect(result.data.views).toBe(100);

      // Check locale resolution metadata
      expect(result.localeResolution.requestedLocale).toBe("es-ES");
      expect(result.localeResolution.fieldsFromFallback).toEqual([]);
      expect(result.localeResolution.fieldResolutions).toEqual({});
    });

    it("should resolve non-localized fields without modification", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello" },
        views: 500,
      });

      const result = resolveLocaleContent(entry, {
        locale: "en-US",
        fields: testFields,
      });

      expect(result.data.slug).toBe("my-post");
      expect(result.data.views).toBe(500);
    });
  });

  describe("fallback resolution", () => {
    it("should use fallback chain when requested locale is missing", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello World", "es-ES": "Hola Mundo" },
        content: { "en-US": "<p>Welcome</p>" }, // Missing es-ES
      });

      const result = resolveLocaleContent(entry, {
        locale: "es-ES",
        fallbackChain: ["en-US"],
        defaultLocale: "en-US",
        fields: testFields,
      });

      // Title should be in Spanish (exact match)
      expect(result.data.title).toBe("Hola Mundo");

      // Content should fall back to English
      expect(result.data.content).toBe("<p>Welcome</p>");

      // Check fallback metadata
      expect(result.localeResolution.fieldsFromFallback).toContain("content");
      expect(result.localeResolution.fieldResolutions.content).toBe("en-US");
    });

    it("should try each locale in the fallback chain in order", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "pt-PT": "Olá Mundo" }, // Only Portuguese (Portugal)
      });

      const result = resolveLocaleContent(entry, {
        locale: "pt-BR", // Brazilian Portuguese
        fallbackChain: ["pt-PT", "en-US"], // Try Portugal Portuguese first
        defaultLocale: "en-US",
        fields: testFields,
      });

      // Should resolve to Portuguese (Portugal) from fallback chain
      expect(result.data.title).toBe("Olá Mundo");
      expect(result.localeResolution.fieldsFromFallback).toContain("title");
      expect(result.localeResolution.fieldResolutions.title).toBe("pt-PT");
    });

    it("should use default locale as last resort", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello World" }, // Only default locale
      });

      const result = resolveLocaleContent(entry, {
        locale: "zh-Hans-CN", // Chinese (Simplified)
        fallbackChain: ["zh-Hans"], // Chinese generic
        defaultLocale: "en-US",
        fields: testFields,
      });

      // Should resolve to English from default locale
      expect(result.data.title).toBe("Hello World");
      expect(result.localeResolution.fieldsFromFallback).toContain("title");
      expect(result.localeResolution.fieldResolutions.title).toBe("en-US");
    });
  });

  describe("partial translations", () => {
    it("should track all fields that used fallback", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello", "es-ES": "Hola" },
        content: { "en-US": "<p>Content</p>" }, // Missing es-ES
        excerpt: { "en-US": "Short summary" }, // Missing es-ES
      });

      const result = resolveLocaleContent(entry, {
        locale: "es-ES",
        fallbackChain: ["en-US"],
        defaultLocale: "en-US",
        fields: testFields,
      });

      // Title should be exact match
      expect(result.data.title).toBe("Hola");

      // Content and excerpt should be from fallback
      expect(result.data.content).toBe("<p>Content</p>");
      expect(result.data.excerpt).toBe("Short summary");

      // Check fallback tracking
      expect(result.localeResolution.fieldsFromFallback).toContain("content");
      expect(result.localeResolution.fieldsFromFallback).toContain("excerpt");
      expect(result.localeResolution.fieldsFromFallback).not.toContain("title");

      expect(result.localeResolution.fieldResolutions).toEqual({
        content: "en-US",
        excerpt: "en-US",
      });
    });

    it("should handle mixed fallback sources", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "fr-FR": "Bonjour" }, // From French fallback
        content: { "en-US": "<p>Content</p>" }, // From default locale
      });

      const result = resolveLocaleContent(entry, {
        locale: "fr-CA", // French Canadian
        fallbackChain: ["fr-FR"], // French (France)
        defaultLocale: "en-US",
        fields: testFields,
      });

      // Title should resolve from fr-FR (first in chain)
      expect(result.data.title).toBe("Bonjour");
      expect(result.localeResolution.fieldResolutions.title).toBe("fr-FR");

      // Content should resolve from en-US (default)
      expect(result.data.content).toBe("<p>Content</p>");
      expect(result.localeResolution.fieldResolutions.content).toBe("en-US");
    });
  });

  describe("metadata options", () => {
    it("should include resolution metadata by default", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello" },
      });

      const result = resolveLocaleContent(entry, {
        locale: "en-US",
        fields: testFields,
      });

      expect(result.localeResolution).toBeDefined();
      expect(result.localeResolution.requestedLocale).toBe("en-US");
      expect(result.localeResolution.fallbackChain).toEqual([]);
      expect(result.localeResolution.defaultLocale).toBe("en");
    });

    it("should support disabling resolution metadata", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello" },
      });

      const result = resolveLocaleContent(entry, {
        locale: "en-US",
        fields: testFields,
        includeResolutionMetadata: false,
      });

      // localeResolution should be undefined when disabled
      expect(result.localeResolution).toBeUndefined();
    });

    it("should include fallback chain in metadata", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello" },
      });

      const result = resolveLocaleContent(entry, {
        locale: "es-ES",
        fallbackChain: ["es", "en-US"],
        defaultLocale: "en-US",
        fields: testFields,
      });

      expect(result.localeResolution.fallbackChain).toEqual(["es", "en-US"]);
    });
  });

  describe("edge cases", () => {
    it("should handle entries with no localized fields", () => {
      const nonLocalizedFields: FieldDefinition[] = [
        { name: "slug", label: "Slug", type: "text", required: true },
        { name: "count", label: "Count", type: "number", required: false },
      ];

      const entry = createMockEntry({
        slug: "my-post",
        count: 42,
      });

      const result = resolveLocaleContent(entry, {
        locale: "es-ES",
        fields: nonLocalizedFields,
      });

      expect(result.data.slug).toBe("my-post");
      expect(result.data.count).toBe(42);
      expect(result.localeResolution.fieldsFromFallback).toEqual([]);
    });

    it("should handle empty data object", () => {
      const entry = createMockEntry({});

      const result = resolveLocaleContent(entry, {
        locale: "en-US",
        fields: testFields,
      });

      expect(result.data).toEqual({});
      expect(result.localeResolution.fieldsFromFallback).toEqual([]);
    });

    it("should handle fields not defined in field definitions", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello" },
        customField: "custom value", // Not in field definitions
      });

      const result = resolveLocaleContent(entry, {
        locale: "en-US",
        fields: testFields,
      });

      // Custom field should pass through unchanged
      expect(result.data.customField).toBe("custom value");
    });

    it("should preserve entry properties other than data", () => {
      const entry = createMockEntry({
        slug: "my-post",
        title: { "en-US": "Hello" },
      });

      const result = resolveLocaleContent(entry, {
        locale: "en-US",
        fields: testFields,
      });

      expect(result._id).toBe(entry._id);
      expect(result._creationTime).toBe(entry._creationTime);
      expect(result.contentTypeId).toBe(entry.contentTypeId);
      expect(result.slug).toBe(entry.slug);
      expect(result.status).toBe(entry.status);
      expect(result.version).toBe(entry.version);
    });
  });
});

// =============================================================================
// resolveLocaleContentBatch Tests
// =============================================================================

describe("resolveLocaleContentBatch", () => {
  it("should resolve all entries in the batch", () => {
    const entries = [
      createMockEntry({
        slug: "post-1",
        title: { "en-US": "Post 1", "es-ES": "Entrada 1" },
      }),
      createMockEntry({
        slug: "post-2",
        title: { "en-US": "Post 2", "es-ES": "Entrada 2" },
      }),
      createMockEntry({
        slug: "post-3",
        title: { "en-US": "Post 3" }, // Missing es-ES
      }),
    ];

    const results = resolveLocaleContentBatch(entries, {
      locale: "es-ES",
      fallbackChain: ["en-US"],
      defaultLocale: "en-US",
      fields: testFields,
    });

    expect(results).toHaveLength(3);

    // First two should be exact matches
    expect(results[0].data.title).toBe("Entrada 1");
    expect(results[0].localeResolution.fieldsFromFallback).toEqual([]);

    expect(results[1].data.title).toBe("Entrada 2");
    expect(results[1].localeResolution.fieldsFromFallback).toEqual([]);

    // Third should use fallback
    expect(results[2].data.title).toBe("Post 3");
    expect(results[2].localeResolution.fieldsFromFallback).toContain("title");
  });

  it("should apply the same locale options to all entries", () => {
    const entries = [
      createMockEntry({ slug: "a", title: { "en-US": "A" } }),
      createMockEntry({ slug: "b", title: { "en-US": "B" } }),
    ];

    const results = resolveLocaleContentBatch(entries, {
      locale: "fr-FR",
      fallbackChain: ["en-US"],
      defaultLocale: "en-US",
      fields: testFields,
    });

    for (const result of results) {
      expect(result.localeResolution.requestedLocale).toBe("fr-FR");
      expect(result.localeResolution.fallbackChain).toEqual(["en-US"]);
      expect(result.localeResolution.defaultLocale).toBe("en-US");
    }
  });

  it("should handle empty batch", () => {
    const results = resolveLocaleContentBatch([], {
      locale: "en-US",
      fields: testFields,
    });

    expect(results).toEqual([]);
  });

  it("should preserve order of entries", () => {
    const entries = [
      createMockEntry({ slug: "first", title: { "en-US": "First" } }),
      createMockEntry({ slug: "second", title: { "en-US": "Second" } }),
      createMockEntry({ slug: "third", title: { "en-US": "Third" } }),
    ];

    const results = resolveLocaleContentBatch(entries, {
      locale: "en-US",
      fields: testFields,
    });

    expect(results[0].data.slug).toBe("first");
    expect(results[1].data.slug).toBe("second");
    expect(results[2].data.slug).toBe("third");
  });
});

// =============================================================================
// Integration with Locale Fallback Chain
// =============================================================================

describe("locale content resolution integration", () => {
  it("should work with realistic fallback chains", () => {
    // Simulate Spanish language family fallback
    const entry = createMockEntry({
      slug: "news",
      title: { "es-ES": "Noticias de España" }, // Only Spain Spanish
      content: { "en-US": "<p>Default content</p>" }, // Only English
    });

    const result = resolveLocaleContent(entry, {
      locale: "es-MX", // Mexican Spanish
      fallbackChain: ["es-ES", "en-US"], // Spain Spanish, then English
      defaultLocale: "en-US",
      fields: testFields,
    });

    // Title should fall back to es-ES (Spain Spanish)
    expect(result.data.title).toBe("Noticias de España");
    expect(result.localeResolution.fieldResolutions.title).toBe("es-ES");

    // Content should fall back to en-US (default)
    expect(result.data.content).toBe("<p>Default content</p>");
    expect(result.localeResolution.fieldResolutions.content).toBe("en-US");
  });

  it("should work with Chinese locale variants", () => {
    const entry = createMockEntry({
      slug: "announcement",
      title: { "zh-Hans": "简体公告" }, // Simplified Chinese generic
      content: { "zh-Hans-CN": "<p>中国内容</p>" }, // Simplified Chinese (China)
    });

    const result = resolveLocaleContent(entry, {
      locale: "zh-Hans-SG", // Simplified Chinese (Singapore)
      fallbackChain: ["zh-Hans-CN", "zh-Hans", "en-US"],
      defaultLocale: "en-US",
      fields: testFields,
    });

    // Title should fall back to zh-Hans (from fallback chain)
    expect(result.data.title).toBe("简体公告");

    // Content should fall back to zh-Hans-CN (first in chain)
    expect(result.data.content).toBe("<p>中国内容</p>");
  });
});
