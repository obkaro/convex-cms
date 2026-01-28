/**
 * Locale-Specific Content Field Storage and Resolution Tests
 *
 * Tests for the LocalizedFieldValue structure and resolution functions.
 */
import { describe, expect, it } from "vitest";
import {
  isLocalizedFieldValue,
  isFieldLocalized,
  getLocalizedValue,
  setLocalizedValue,
  removeLocale,
  mergeLocalizedValues,
  getAvailableLocales,
  hasLocale,
  resolveContentData,
  setLocalizedContentData,
  getTranslationStatus,
  type LocalizedFieldValue,
  type FieldValue,
} from "../../src/component/localeFields.js";
import type { FieldDefinition } from "../../src/component/validation.js";

// =============================================================================
// Type Guard Tests
// =============================================================================

describe("isLocalizedFieldValue", () => {
  it("should return true for valid localized field values with hyphenated locale codes", () => {
    // Standard locale codes with uppercase region (hyphenated)
    expect(isLocalizedFieldValue({ "en-US": "Hello" })).toBe(true);
    expect(isLocalizedFieldValue({ "en-US": "Hello", "es-ES": "Hola" })).toBe(true);
    expect(isLocalizedFieldValue({ "pt-BR": "Olá" })).toBe(true);
    // Language + script codes (title case script)
    expect(isLocalizedFieldValue({ "zh-Hans": "你好" })).toBe(true);
    // Language + script + region
    expect(isLocalizedFieldValue({ "zh-Hans-CN": "你好" })).toBe(true);
    // Mixed base language with hyphenated (at least one hyphenated required)
    expect(isLocalizedFieldValue({ en: "Hello", "es-ES": "Hola" })).toBe(true);
  });

  it("should return false for non-localized values", () => {
    expect(isLocalizedFieldValue(null)).toBe(false);
    expect(isLocalizedFieldValue(undefined)).toBe(false);
    expect(isLocalizedFieldValue("Hello")).toBe(false);
    expect(isLocalizedFieldValue(123)).toBe(false);
    expect(isLocalizedFieldValue(true)).toBe(false);
    expect(isLocalizedFieldValue([])).toBe(false);
    expect(isLocalizedFieldValue(["en-US", "Hello"])).toBe(false);
  });

  it("should return false for empty objects", () => {
    expect(isLocalizedFieldValue({})).toBe(false);
  });

  it("should return false for objects without hyphenated locale keys", () => {
    // No hyphenated keys - ambiguous, could be regular object
    expect(isLocalizedFieldValue({ en: "Hello" })).toBe(false);
    expect(isLocalizedFieldValue({ eng: "Hello" })).toBe(false);
    expect(isLocalizedFieldValue({ foo: "bar" })).toBe(false);
    expect(isLocalizedFieldValue({ title: "Hello" })).toBe(false);
  });

  it("should return false for objects with invalid locale keys", () => {
    // Mixed valid and invalid keys should fail
    expect(isLocalizedFieldValue({ "en-US": "Hello", invalid: "value" })).toBe(false);
    // Lowercase region code is invalid (should be uppercase)
    expect(isLocalizedFieldValue({ "en-us": "Hello" })).toBe(false);
  });
});

describe("isFieldLocalized", () => {
  it("should return true for localized fields", () => {
    const field: FieldDefinition = {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
      localized: true,
    };
    expect(isFieldLocalized(field)).toBe(true);
  });

  it("should return false for non-localized fields", () => {
    const field: FieldDefinition = {
      name: "slug",
      label: "Slug",
      type: "text",
      required: true,
      localized: false,
    };
    expect(isFieldLocalized(field)).toBe(false);
  });

  it("should return false when localized is undefined", () => {
    const field: FieldDefinition = {
      name: "slug",
      label: "Slug",
      type: "text",
      required: true,
    };
    expect(isFieldLocalized(field)).toBe(false);
  });
});

// =============================================================================
// Field Value Operation Tests
// =============================================================================

describe("getLocalizedValue", () => {
  it("should return the value for the exact locale", () => {
    const value: LocalizedFieldValue<string> = {
      "en-US": "Hello",
      "es-ES": "Hola",
    };
    const result = getLocalizedValue(value, { locale: "en-US" });
    expect(result.value).toBe("Hello");
    expect(result.resolvedLocale).toBe("en-US");
    expect(result.isExactMatch).toBe(true);
  });

  it("should fall back to fallback chain", () => {
    const value: LocalizedFieldValue<string> = {
      "en-US": "Hello",
    };
    const result = getLocalizedValue(value, {
      locale: "fr-FR",
      fallbackChain: ["en-US"],
    });
    expect(result.value).toBe("Hello");
    expect(result.resolvedLocale).toBe("en-US");
    expect(result.isExactMatch).toBe(false);
  });

  it("should fall back to default locale", () => {
    const value: LocalizedFieldValue<string> = {
      "en-US": "Hello",
      "de-DE": "Hallo",
    };
    const result = getLocalizedValue(value, {
      locale: "fr-FR",
      defaultLocale: "en-US",
    });
    expect(result.value).toBe("Hello");
    expect(result.resolvedLocale).toBe("en-US");
    expect(result.isExactMatch).toBe(false);
  });

  it("should return any available locale as last resort", () => {
    const value: LocalizedFieldValue<string> = {
      "de-DE": "Hallo",
    };
    const result = getLocalizedValue(value, {
      locale: "fr-FR",
      defaultLocale: "en",
    });
    expect(result.value).toBe("Hallo");
    expect(result.resolvedLocale).toBe("de-DE");
    expect(result.isExactMatch).toBe(false);
  });

  it("should return undefined for non-localized values", () => {
    const result = getLocalizedValue("Plain text" as FieldValue<string>, { locale: "en-US" });
    expect(result.value).toBe("Plain text");
    expect(result.resolvedLocale).toBe(undefined);
    expect(result.isExactMatch).toBe(true);
  });

  it("should handle numeric values", () => {
    const value: LocalizedFieldValue<number> = {
      "en-US": 100,
      "es-ES": 200,
    };
    const result = getLocalizedValue(value, { locale: "es-ES" });
    expect(result.value).toBe(200);
    expect(result.resolvedLocale).toBe("es-ES");
  });
});

describe("setLocalizedValue", () => {
  it("should set a new locale value", () => {
    const existing: LocalizedFieldValue<string> = { "en-US": "Hello" };
    const result = setLocalizedValue(existing, "es-ES", "Hola");
    expect(result).toEqual({ "en-US": "Hello", "es-ES": "Hola" });
  });

  it("should overwrite existing locale value", () => {
    const existing: LocalizedFieldValue<string> = { "en-US": "Hello" };
    const result = setLocalizedValue(existing, "en-US", "Hi");
    expect(result).toEqual({ "en-US": "Hi" });
  });

  it("should convert plain value to localized with preservation", () => {
    const result = setLocalizedValue("Hello", "es-ES", "Hola", true, "en-US");
    expect(result).toEqual({ "en-US": "Hello", "es-ES": "Hola" });
  });

  it("should convert plain value without preservation when same locale", () => {
    const result = setLocalizedValue("Hello", "en-US", "Hi", true, "en-US");
    expect(result).toEqual({ "en-US": "Hi" });
  });

  it("should convert plain value without preservation when disabled", () => {
    const result = setLocalizedValue("Hello", "es-ES", "Hola", false);
    expect(result).toEqual({ "es-ES": "Hola" });
  });

  it("should handle undefined existing value", () => {
    const result = setLocalizedValue(undefined, "en-US", "Hello");
    expect(result).toEqual({ "en-US": "Hello" });
  });
});

describe("removeLocale", () => {
  it("should remove a locale", () => {
    const value: LocalizedFieldValue<string> = {
      "en-US": "Hello",
      "es-ES": "Hola",
    };
    const result = removeLocale(value, "es-ES");
    expect(result).toEqual({ "en-US": "Hello" });
  });

  it("should return undefined when removing the last locale", () => {
    const value: LocalizedFieldValue<string> = { "en-US": "Hello" };
    const result = removeLocale(value, "en-US");
    expect(result).toBe(undefined);
  });

  it("should leave other locales untouched", () => {
    const value: LocalizedFieldValue<string> = {
      "en-US": "Hello",
      "es-ES": "Hola",
      "fr-FR": "Bonjour",
    };
    const result = removeLocale(value, "es-ES");
    expect(result).toEqual({ "en-US": "Hello", "fr-FR": "Bonjour" });
  });
});

describe("mergeLocalizedValues", () => {
  it("should merge two localized values", () => {
    const target: LocalizedFieldValue<string> = { "en-US": "Hello" };
    const source: LocalizedFieldValue<string> = { "es-ES": "Hola" };
    const result = mergeLocalizedValues(target, source);
    expect(result).toEqual({ "en-US": "Hello", "es-ES": "Hola" });
  });

  it("should overwrite existing locales from source", () => {
    const target: LocalizedFieldValue<string> = { "en-US": "Hello", "es-ES": "Hola" };
    const source: LocalizedFieldValue<string> = { "es-ES": "Hola!", "fr-FR": "Bonjour" };
    const result = mergeLocalizedValues(target, source);
    expect(result).toEqual({
      "en-US": "Hello",
      "es-ES": "Hola!",
      "fr-FR": "Bonjour",
    });
  });

  it("should handle undefined target", () => {
    const source: LocalizedFieldValue<string> = { "en-US": "Hello" };
    const result = mergeLocalizedValues(undefined, source);
    expect(result).toEqual({ "en-US": "Hello" });
  });
});

describe("getAvailableLocales", () => {
  it("should return empty array for non-localized values", () => {
    expect(getAvailableLocales("Hello")).toEqual([]);
    expect(getAvailableLocales(123)).toEqual([]);
  });
});

describe("hasLocale", () => {
  it("should return true for existing locale", () => {
    const value: LocalizedFieldValue<string> = { "en-US": "Hello" };
    expect(hasLocale(value, "en-US")).toBe(true);
  });

  it("should return false for missing locale", () => {
    const value: LocalizedFieldValue<string> = { "en-US": "Hello" };
    expect(hasLocale(value, "es-ES")).toBe(false);
  });

  it("should return false for non-localized values", () => {
    expect(hasLocale("Hello", "en-US")).toBe(false);
  });
});

// =============================================================================
// Content Data Operation Tests
// =============================================================================

describe("resolveContentData", () => {
  const fields: FieldDefinition[] = [
    { name: "slug", label: "Slug", type: "text", required: true, localized: false },
    { name: "title", label: "Title", type: "text", required: true, localized: true },
    { name: "content", label: "Content", type: "richText", required: false, localized: true },
  ];

  it("should resolve all localized fields", () => {
    const data = {
      slug: "my-post",
      title: { "en-US": "Hello", "es-ES": "Hola" },
      content: { "en-US": "<p>Content</p>", "es-ES": "<p>Contenido</p>" },
    };

    const result = resolveContentData(data, {
      fields,
      locale: "es-ES",
    });

    expect(result.data).toEqual({
      slug: "my-post",
      title: "Hola",
      content: "<p>Contenido</p>",
    });
    expect(result.missingTranslations).toEqual([]);
  });

  it("should track missing translations", () => {
    const data = {
      slug: "my-post",
      title: { "en-US": "Hello", "es-ES": "Hola" },
      content: { "en-US": "<p>Content</p>" }, // missing es-ES
    };

    const result = resolveContentData(data, {
      fields,
      locale: "es-ES",
      fallbackChain: ["en-US"],
    });

    expect(result.data.content).toBe("<p>Content</p>"); // Fell back to en-US
    expect(result.missingTranslations).toContain("content");
  });

  it("should pass through non-localized fields unchanged", () => {
    const data = {
      slug: "my-post",
      title: { "en-US": "Hello" },
    };

    const result = resolveContentData(data, {
      fields,
      locale: "en-US",
    });

    expect(result.data.slug).toBe("my-post");
  });
});

describe("setLocalizedContentData", () => {
  const fields: FieldDefinition[] = [
    { name: "slug", label: "Slug", type: "text", required: true, localized: false },
    { name: "title", label: "Title", type: "text", required: true, localized: true },
  ];

  it("should set localized field values", () => {
    const existingData = {
      slug: "my-post",
      title: { "en-US": "Hello" },
    };

    const result = setLocalizedContentData(
      existingData,
      { title: "Hola" },
      "es-ES",
      fields
    );

    expect(result).toEqual({
      slug: "my-post",
      title: { "en-US": "Hello", "es-ES": "Hola" },
    });
  });

  it("should replace non-localized field values", () => {
    const existingData = {
      slug: "my-post",
      title: { "en-US": "Hello" },
    };

    const result = setLocalizedContentData(
      existingData,
      { slug: "new-slug", title: "Hola" },
      "es-ES",
      fields
    );

    expect(result.slug).toBe("new-slug"); // replaced
    expect(result.title).toEqual({ "en-US": "Hello", "es-ES": "Hola" }); // merged
  });
});

describe("getTranslationStatus", () => {
  const fields: FieldDefinition[] = [
    { name: "slug", label: "Slug", type: "text", required: true, localized: false },
    { name: "title", label: "Title", type: "text", required: true, localized: true },
    { name: "content", label: "Content", type: "richText", required: false, localized: true },
  ];

  it("should report complete translations", () => {
    const data = {
      slug: "my-post",
      title: { "en-US": "Hello", "es-ES": "Hola" },
      content: { "en-US": "<p>Content</p>", "es-ES": "<p>Contenido</p>" },
    };

    const result = getTranslationStatus(data, fields, ["en-US", "es-ES"]);

    expect(result["en-US"].complete).toBe(true);
    expect(result["en-US"].percentage).toBe(100);
    expect(result["es-ES"].complete).toBe(true);
    expect(result["es-ES"].percentage).toBe(100);
  });

  it("should report missing translations", () => {
    const data = {
      slug: "my-post",
      title: { "en-US": "Hello", "es-ES": "Hola" },
      content: { "en-US": "<p>Content</p>" }, // missing es-ES
    };

    const result = getTranslationStatus(data, fields, ["en-US", "es-ES"]);

    expect(result["en-US"].complete).toBe(true);
    expect(result["es-ES"].complete).toBe(false);
    expect(result["es-ES"].missingFields).toContain("content");
    expect(result["es-ES"].percentage).toBe(50);
  });

  it("should handle content with no localized fields", () => {
    const nonLocalizedFields: FieldDefinition[] = [
      { name: "slug", label: "Slug", type: "text", required: true, localized: false },
    ];

    const data = { slug: "my-post" };

    const result = getTranslationStatus(data, nonLocalizedFields, ["en-US", "es-ES"]);

    expect(result["en-US"].complete).toBe(true);
    expect(result["es-ES"].complete).toBe(true);
    expect(result["en-US"].percentage).toBe(100);
  });
});
