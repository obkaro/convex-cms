/**
 * Locale-Specific Content Field Storage and Resolution
 *
 * This module provides the schema and storage structure for locale-specific
 * content field values. It allows fields marked as `localized: true` in their
 * field definition to store translations keyed by locale code within content entries.
 *
 * Storage Structure:
 * - Non-localized fields: { title: "Hello World" }
 * - Localized fields: { title: { "en-US": "Hello World", "es-ES": "Hola Mundo" } }
 *
 * @example
 * ```typescript
 * // Content entry data with localized fields
 * const data = {
 *   // Non-localized field (same value for all locales)
 *   slug: "my-post",
 *
 *   // Localized field (translations keyed by locale)
 *   title: {
 *     "en-US": "My Blog Post",
 *     "es-ES": "Mi Entrada de Blog",
 *     "fr-FR": "Mon Article de Blog",
 *   },
 *
 *   // Localized rich text field
 *   content: {
 *     "en-US": "<p>Welcome to my blog!</p>",
 *     "es-ES": "<p>¡Bienvenido a mi blog!</p>",
 *   },
 * };
 * ```
 */

import type { FieldDefinition } from "../client/types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a localized field value - a mapping from locale codes to translated values.
 *
 * @example
 * ```typescript
 * const localizedTitle: LocalizedFieldValue<string> = {
 *   "en-US": "Hello World",
 *   "es-ES": "Hola Mundo",
 *   "fr-FR": "Bonjour le Monde",
 * };
 * ```
 */
export type LocalizedFieldValue<T = unknown> = {
  [localeCode: string]: T;
};

/**
 * Represents either a plain field value or a localized field value.
 * Used when working with field values that may or may not be localized.
 */
export type FieldValue<T = unknown> = T | LocalizedFieldValue<T>;

/**
 * Options for resolving localized field values.
 */
export interface LocaleResolutionOptions {
  /**
   * The primary locale to attempt to resolve first.
   */
  locale: string;

  /**
   * Fallback chain of locales to try if the primary locale is not found.
   * Tried in order until a value is found.
   *
   * @example
   * ```typescript
   * // Try en-US first, then en, then the default locale
   * fallbackChain: ["en", "en-US"]
   * ```
   */
  fallbackChain?: string[];

  /**
   * The default locale to use as final fallback.
   * If not specified, returns undefined when no locale matches.
   *
   * @default "en"
   */
  defaultLocale?: string;
}

/**
 * Result of resolving a localized field value.
 */
export interface LocaleResolutionResult<T = unknown> {
  /**
   * The resolved value, or undefined if no matching locale was found.
   */
  value: T | undefined;

  /**
   * The locale code that was used to resolve the value.
   * Undefined if no matching locale was found.
   */
  resolvedLocale: string | undefined;

  /**
   * Whether the value was resolved from the primary requested locale
   * (as opposed to a fallback).
   */
  isExactMatch: boolean;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Checks if a value is a LocalizedFieldValue structure.
 *
 * A value is considered localized if:
 * - It is a non-null object
 * - It is not an array
 * - At least one key contains a hyphen (BCP 47 locale codes like "en-US")
 * - All keys match the BCP 47 pattern (language[-Script][-REGION])
 *
 * Note: For fields that should store localized content, use the `localized: true`
 * property in the field definition. This function is a heuristic type guard.
 *
 * @param value - The value to check
 * @returns true if the value appears to be a LocalizedFieldValue
 *
 * @example
 * ```typescript
 * isLocalizedFieldValue({ "en-US": "Hello" }); // true
 * isLocalizedFieldValue({ "en-US": "Hello", "es-ES": "Hola" }); // true
 * isLocalizedFieldValue("Hello"); // false
 * isLocalizedFieldValue({ foo: "bar" }); // false (no hyphenated locale key)
 * isLocalizedFieldValue({ en: "Hello" }); // false (no hyphen - ambiguous)
 * ```
 */
export function isLocalizedFieldValue(value: unknown): value is LocalizedFieldValue {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);

  // Empty objects are not localized values
  if (keys.length === 0) {
    return false;
  }

  // Check if all keys are valid BCP 47 locale codes
  // Valid patterns (with hyphen required for disambiguation):
  // - "en-US" (language + ISO 3166-1 alpha-2 region, uppercase)
  // - "zh-Hans" (language + script subtag, title case)
  // - "zh-Hans-CN" (language + script + region)
  // Pattern: lowercase language (2-3), optional Title-case script (4), optional UPPERCASE region (2)
  const hyphenatedLocalePattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})$/;
  const scriptOnlyPattern = /^[a-z]{2,3}-[A-Z][a-z]{3}$/;

  // At least one key must be hyphenated to confirm this is a localized structure
  const hasHyphenatedKey = keys.some((key) => key.includes("-"));

  if (!hasHyphenatedKey) {
    return false;
  }

  // All keys must be valid locale patterns
  const localePattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/;

  return keys.every((key) => {
    // Must have hyphen if longer than 3 chars
    if (key.length > 3 && !key.includes("-")) {
      return false;
    }
    return localePattern.test(key);
  });
}

/**
 * Checks if a field definition indicates the field should be localized.
 *
 * @param fieldDef - The field definition to check
 * @returns true if the field is marked as localized
 */
export function isFieldLocalized(fieldDef: FieldDefinition): boolean {
  return fieldDef.localized === true;
}

// =============================================================================
// Field Value Operations
// =============================================================================

/**
 * Gets a value from a potentially localized field.
 *
 * If the field value is a LocalizedFieldValue, resolves using the specified locale
 * with fallback chain. If it's a plain value, returns it directly.
 *
 * @param value - The field value (may be localized or plain)
 * @param options - Locale resolution options
 * @returns The resolved value result
 *
 * @example
 * ```typescript
 * // With localized value
 * const localizedTitle = { "en-US": "Hello", "es-ES": "Hola" };
 * const result = getLocalizedValue(localizedTitle, { locale: "es-ES" });
 * // result: { value: "Hola", resolvedLocale: "es-ES", isExactMatch: true }
 *
 * // With fallback
 * const result2 = getLocalizedValue(localizedTitle, {
 *   locale: "fr-FR",
 *   fallbackChain: ["en-US"],
 * });
 * // result2: { value: "Hello", resolvedLocale: "en-US", isExactMatch: false }
 *
 * // With plain value (non-localized field)
 * const result3 = getLocalizedValue("Plain text", { locale: "en-US" });
 * // result3: { value: "Plain text", resolvedLocale: undefined, isExactMatch: true }
 * ```
 */
export function getLocalizedValue<T>(
  value: FieldValue<T>,
  options: LocaleResolutionOptions
): LocaleResolutionResult<T> {
  // If not a localized value, return directly
  if (!isLocalizedFieldValue(value)) {
    return {
      value: value as T,
      resolvedLocale: undefined,
      isExactMatch: true,
    };
  }

  const localizedValue = value as LocalizedFieldValue<T>;
  const { locale, fallbackChain = [], defaultLocale = "en" } = options;

  // Try the primary locale first
  if (locale in localizedValue) {
    return {
      value: localizedValue[locale],
      resolvedLocale: locale,
      isExactMatch: true,
    };
  }

  // Try fallback chain
  for (const fallbackLocale of fallbackChain) {
    if (fallbackLocale in localizedValue) {
      return {
        value: localizedValue[fallbackLocale],
        resolvedLocale: fallbackLocale,
        isExactMatch: false,
      };
    }
  }

  // Try default locale
  if (defaultLocale && defaultLocale in localizedValue) {
    return {
      value: localizedValue[defaultLocale],
      resolvedLocale: defaultLocale,
      isExactMatch: false,
    };
  }

  // Try to find any available locale as last resort
  const availableLocales = Object.keys(localizedValue);
  if (availableLocales.length > 0) {
    const firstAvailable = availableLocales[0];
    return {
      value: localizedValue[firstAvailable],
      resolvedLocale: firstAvailable,
      isExactMatch: false,
    };
  }

  // No value found
  return {
    value: undefined,
    resolvedLocale: undefined,
    isExactMatch: false,
  };
}

/**
 * Sets a value for a specific locale in a localized field.
 *
 * If the existing value is not localized, it converts it to a localized structure
 * with the new value for the specified locale.
 *
 * @param existingValue - The current field value (may be localized or plain)
 * @param locale - The locale to set the value for
 * @param newValue - The new value to set
 * @param preserveExisting - If true and converting from plain to localized,
 *                          preserves the existing value under the default locale
 * @param defaultLocale - The locale to use for preserving existing plain values
 * @returns The updated localized field value
 *
 * @example
 * ```typescript
 * // Set value for a locale
 * const existing = { "en-US": "Hello" };
 * const updated = setLocalizedValue(existing, "es-ES", "Hola");
 * // updated: { "en-US": "Hello", "es-ES": "Hola" }
 *
 * // Convert plain to localized
 * const plain = "Hello";
 * const converted = setLocalizedValue(plain, "es-ES", "Hola", true, "en-US");
 * // converted: { "en-US": "Hello", "es-ES": "Hola" }
 * ```
 */
export function setLocalizedValue<T>(
  existingValue: FieldValue<T> | undefined,
  locale: string,
  newValue: T,
  preserveExisting = true,
  defaultLocale = "en"
): LocalizedFieldValue<T> {
  // If already localized, just add/update the locale
  if (isLocalizedFieldValue(existingValue)) {
    return {
      ...existingValue,
      [locale]: newValue,
    };
  }

  // Converting from plain value to localized
  const result: LocalizedFieldValue<T> = {
    [locale]: newValue,
  };

  // Preserve existing plain value under default locale if requested
  if (
    preserveExisting &&
    existingValue !== undefined &&
    existingValue !== null &&
    locale !== defaultLocale
  ) {
    result[defaultLocale] = existingValue as T;
  }

  return result;
}

/**
 * Removes a specific locale from a localized field value.
 *
 * @param localizedValue - The localized field value
 * @param locale - The locale to remove
 * @returns The updated localized field value, or undefined if empty
 *
 * @example
 * ```typescript
 * const value = { "en-US": "Hello", "es-ES": "Hola" };
 * const updated = removeLocale(value, "es-ES");
 * // updated: { "en-US": "Hello" }
 * ```
 */
export function removeLocale<T>(
  localizedValue: LocalizedFieldValue<T>,
  locale: string
): LocalizedFieldValue<T> | undefined {
  const { [locale]: removed, ...rest } = localizedValue;

  // Return undefined if no locales remain
  if (Object.keys(rest).length === 0) {
    return undefined;
  }

  return rest;
}

/**
 * Merges translations from one localized value into another.
 *
 * @param target - The base localized value
 * @param source - The localized value to merge in (overwrites existing locales)
 * @returns The merged localized field value
 *
 * @example
 * ```typescript
 * const target = { "en-US": "Hello", "es-ES": "Hola" };
 * const source = { "es-ES": "Hola!", "fr-FR": "Bonjour" };
 * const merged = mergeLocalizedValues(target, source);
 * // merged: { "en-US": "Hello", "es-ES": "Hola!", "fr-FR": "Bonjour" }
 * ```
 */
export function mergeLocalizedValues<T>(
  target: LocalizedFieldValue<T> | undefined,
  source: LocalizedFieldValue<T>
): LocalizedFieldValue<T> {
  return {
    ...(target ?? {}),
    ...source,
  };
}

/**
 * Gets all available locales from a localized field value.
 *
 * @param value - The field value (may be localized or plain)
 * @returns Array of locale codes, or empty array if not localized
 *
 * @example
 * ```typescript
 * const value = { "en-US": "Hello", "es-ES": "Hola" };
 * const locales = getAvailableLocales(value);
 * // locales: ["en-US", "es-ES"]
 *
 * const plain = "Hello";
 * const locales2 = getAvailableLocales(plain);
 * // locales2: []
 * ```
 */
export function getAvailableLocales(value: FieldValue): string[] {
  if (!isLocalizedFieldValue(value)) {
    return [];
  }

  return Object.keys(value);
}

/**
 * Checks if a localized field has a translation for a specific locale.
 *
 * @param value - The field value (may be localized or plain)
 * @param locale - The locale to check
 * @returns true if the locale has a translation
 */
export function hasLocale(value: FieldValue, locale: string): boolean {
  if (!isLocalizedFieldValue(value)) {
    return false;
  }

  return locale in value;
}

// =============================================================================
// Content Data Operations
// =============================================================================

/**
 * Options for resolving all localized fields in content data.
 */
export interface ResolveContentDataOptions extends LocaleResolutionOptions {
  /**
   * Field definitions for the content type.
   * Used to determine which fields are localized.
   */
  fields: FieldDefinition[];
}

/**
 * Result of resolving all localized fields in content data.
 */
export interface ResolvedContentData {
  /**
   * The resolved data with all localized fields resolved to single values.
   */
  data: Record<string, unknown>;

  /**
   * Map of field names to their resolution results.
   */
  resolutions: Record<string, LocaleResolutionResult>;

  /**
   * Fields that were missing translations for the requested locale.
   */
  missingTranslations: string[];
}

/**
 * Resolves all localized fields in content data to single values for a specific locale.
 *
 * This function takes raw content entry data (which may contain LocalizedFieldValue
 * structures for localized fields) and resolves each field to a single value
 * based on the requested locale and fallback chain.
 *
 * @param data - The raw content entry data
 * @param options - Resolution options including fields and locale settings
 * @returns The resolved content data with metadata about resolution
 *
 * @example
 * ```typescript
 * const rawData = {
 *   slug: "my-post", // non-localized
 *   title: { "en-US": "Hello", "es-ES": "Hola" }, // localized
 *   content: { "en-US": "Content here" }, // localized, missing es-ES
 * };
 *
 * const result = resolveContentData(rawData, {
 *   locale: "es-ES",
 *   fallbackChain: ["en-US"],
 *   fields: [
 *     { name: "slug", localized: false, ... },
 *     { name: "title", localized: true, ... },
 *     { name: "content", localized: true, ... },
 *   ],
 * });
 *
 * // result.data: { slug: "my-post", title: "Hola", content: "Content here" }
 * // result.missingTranslations: ["content"]
 * ```
 */
export function resolveContentData(
  data: Record<string, unknown>,
  options: ResolveContentDataOptions
): ResolvedContentData {
  const { fields, locale, fallbackChain, defaultLocale } = options;
  const resolvedData: Record<string, unknown> = {};
  const resolutions: Record<string, LocaleResolutionResult> = {};
  const missingTranslations: string[] = [];

  // Create a map of field names to their definitions for quick lookup
  const fieldMap = new Map<string, FieldDefinition>();
  for (const field of fields) {
    fieldMap.set(field.name, field);
  }

  // Process each field in the data
  for (const [fieldName, fieldValue] of Object.entries(data)) {
    const fieldDef = fieldMap.get(fieldName);

    // If field is localized, resolve using locale
    if (fieldDef && isFieldLocalized(fieldDef)) {
      const result = getLocalizedValue(fieldValue, {
        locale,
        fallbackChain,
        defaultLocale,
      });

      resolvedData[fieldName] = result.value;
      resolutions[fieldName] = result;

      // Track if this was not an exact match (missing translation)
      if (!result.isExactMatch && result.resolvedLocale !== undefined) {
        missingTranslations.push(fieldName);
      }
    } else {
      // Non-localized field - pass through as-is
      resolvedData[fieldName] = fieldValue;
    }
  }

  return {
    data: resolvedData,
    resolutions,
    missingTranslations,
  };
}

/**
 * Sets values for multiple localized fields for a specific locale.
 *
 * This function takes a partial data object with values for a specific locale
 * and merges them into the existing content data's localized field structures.
 *
 * @param existingData - The existing content entry data
 * @param newValues - New values to set (field name -> value)
 * @param locale - The locale to set values for
 * @param fields - Field definitions to determine which fields are localized
 * @param defaultLocale - Default locale for preserving existing values
 * @returns Updated content data with localized values merged in
 *
 * @example
 * ```typescript
 * const existingData = {
 *   slug: "my-post",
 *   title: { "en-US": "Hello" },
 * };
 *
 * const updated = setLocalizedContentData(
 *   existingData,
 *   { title: "Hola", slug: "mi-post" }, // slug will be overwritten, title merged
 *   "es-ES",
 *   fields
 * );
 *
 * // updated: {
 * //   slug: "mi-post", // non-localized, just replaced
 * //   title: { "en-US": "Hello", "es-ES": "Hola" }, // localized, merged
 * // }
 * ```
 */
export function setLocalizedContentData(
  existingData: Record<string, unknown>,
  newValues: Record<string, unknown>,
  locale: string,
  fields: FieldDefinition[],
  defaultLocale = "en"
): Record<string, unknown> {
  // Create a map of field names to their definitions for quick lookup
  const fieldMap = new Map<string, FieldDefinition>();
  for (const field of fields) {
    fieldMap.set(field.name, field);
  }

  const result: Record<string, unknown> = { ...existingData };

  for (const [fieldName, newValue] of Object.entries(newValues)) {
    const fieldDef = fieldMap.get(fieldName);

    if (fieldDef && isFieldLocalized(fieldDef)) {
      // Localized field - merge into localized structure
      result[fieldName] = setLocalizedValue(
        existingData[fieldName] as FieldValue,
        locale,
        newValue,
        true,
        defaultLocale
      );
    } else {
      // Non-localized field - just replace
      result[fieldName] = newValue;
    }
  }

  return result;
}

/**
 * Result of resolving locale content for an entry with metadata.
 */
export interface LocaleResolvedEntry<T = Record<string, unknown>> {
  /**
   * The resolved data with all localized fields resolved to single values.
   */
  data: T;

  /**
   * Metadata about the locale resolution process.
   */
  localeResolution: {
    /**
     * The locale that was requested.
     */
    requestedLocale: string;

    /**
     * The fallback chain that was used for resolution.
     */
    fallbackChain: string[];

    /**
     * The default locale used as final fallback.
     */
    defaultLocale: string;

    /**
     * Fields that were resolved from a fallback locale (missing in requested locale).
     */
    fieldsFromFallback: string[];

    /**
     * Map of field names to the locale they were resolved from.
     * Only includes fields that were resolved from a fallback (not the requested locale).
     */
    fieldResolutions: Record<string, string>;
  };
}

/**
 * Options for resolving locale content for entries.
 */
export interface ResolveLocaleOptions {
  /**
   * The locale to resolve content in.
   */
  locale: string;

  /**
   * Fallback chain of locales to try if the primary locale is not found.
   */
  fallbackChain?: string[];

  /**
   * The default locale to use as final fallback.
   * @default "en"
   */
  defaultLocale?: string;

  /**
   * Field definitions for the content type.
   * Used to determine which fields are localized.
   */
  fields: FieldDefinition[];

  /**
   * Whether to include locale resolution metadata in the result.
   * @default true
   */
  includeResolutionMetadata?: boolean;
}

/**
 * Resolves all localized fields in a content entry to the requested locale with fallback support.
 *
 * This function takes raw content entry data (which may contain LocalizedFieldValue
 * structures for localized fields) and resolves each field to a single value
 * based on the requested locale and fallback chain. It merges localized and
 * non-localized field values into a unified data structure.
 *
 * Resolution order for each localized field:
 * 1. Try the requested locale
 * 2. Try each locale in the fallback chain (in order)
 * 3. Try the default locale
 * 4. Return first available locale as last resort
 * 5. Return undefined if no value exists
 *
 * @param entry - The content entry with potentially localized data
 * @param options - Locale resolution options
 * @returns The entry with resolved locale data and resolution metadata
 *
 * @example
 * ```typescript
 * const entry = {
 *   _id: "abc123",
 *   slug: "my-post",
 *   data: {
 *     slug: "my-post", // non-localized
 *     title: { "en-US": "Hello", "es-ES": "Hola" }, // localized
 *     content: { "en-US": "Content here" }, // localized, missing es-ES
 *   },
 * };
 *
 * const resolved = resolveLocaleContent(entry, {
 *   locale: "es-ES",
 *   fallbackChain: ["en-US"],
 *   defaultLocale: "en-US",
 *   fields: contentType.fields,
 * });
 *
 * // resolved.data: { slug: "my-post", title: "Hola", content: "Content here" }
 * // resolved.localeResolution.fieldsFromFallback: ["content"]
 * // resolved.localeResolution.fieldResolutions: { content: "en-US" }
 * ```
 */
export function resolveLocaleContent<
  T extends { data: Record<string, unknown> }
>(
  entry: T,
  options: ResolveLocaleOptions
): T & LocaleResolvedEntry<Record<string, unknown>> {
  const {
    locale,
    fallbackChain = [],
    defaultLocale = "en",
    fields,
    includeResolutionMetadata = true,
  } = options;

  // Resolve content data using existing function
  const resolved = resolveContentData(entry.data, {
    locale,
    fallbackChain,
    defaultLocale,
    fields,
  });

  // Build field resolution map for fields that used fallback
  const fieldResolutions: Record<string, string> = {};
  for (const [fieldName, resolution] of Object.entries(resolved.resolutions)) {
    if (!resolution.isExactMatch && resolution.resolvedLocale) {
      fieldResolutions[fieldName] = resolution.resolvedLocale;
    }
  }

  // Return entry with resolved data and metadata
  return {
    ...entry,
    data: resolved.data,
    localeResolution: includeResolutionMetadata
      ? {
          requestedLocale: locale,
          fallbackChain,
          defaultLocale,
          fieldsFromFallback: resolved.missingTranslations,
          fieldResolutions,
        }
      : undefined,
  } as T & LocaleResolvedEntry<Record<string, unknown>>;
}

/**
 * Resolves locale content for an array of content entries.
 *
 * This is a convenience function for batch-resolving multiple entries.
 * Useful when fetching lists of content entries that need locale resolution.
 *
 * @param entries - Array of content entries to resolve
 * @param options - Locale resolution options (applied to all entries)
 * @returns Array of entries with resolved locale data
 *
 * @example
 * ```typescript
 * const entries = await cms.contentEntries.list(ctx, {
 *   contentTypeName: "blog_post",
 *   status: "published",
 *   paginationOpts: { numItems: 10 },
 * });
 *
 * const resolvedEntries = resolveLocaleContentBatch(entries.page, {
 *   locale: "es-ES",
 *   fallbackChain: cms.getLocaleFallbackChain("es-ES"),
 *   defaultLocale: cms.config.defaultLocale,
 *   fields: blogPostContentType.fields,
 * });
 * ```
 */
export function resolveLocaleContentBatch<
  T extends { data: Record<string, unknown> }
>(
  entries: T[],
  options: ResolveLocaleOptions
): Array<T & LocaleResolvedEntry<Record<string, unknown>>> {
  return entries.map((entry) => resolveLocaleContent(entry, options));
}

/**
 * Gets the translation completeness status for content data across locales.
 *
 * @param data - The content entry data
 * @param fields - Field definitions for the content type
 * @param requiredLocales - Locales that should have translations
 * @returns Translation status per locale
 *
 * @example
 * ```typescript
 * const data = {
 *   title: { "en-US": "Hello", "es-ES": "Hola" },
 *   content: { "en-US": "Content here" }, // missing es-ES
 * };
 *
 * const status = getTranslationStatus(data, fields, ["en-US", "es-ES"]);
 * // status: {
 * //   "en-US": { complete: true, missingFields: [], percentage: 100 },
 * //   "es-ES": { complete: false, missingFields: ["content"], percentage: 50 },
 * // }
 * ```
 */
export function getTranslationStatus(
  data: Record<string, unknown>,
  fields: FieldDefinition[],
  requiredLocales: string[]
): Record<
  string,
  { complete: boolean; missingFields: string[]; percentage: number }
> {
  const result: Record<
    string,
    { complete: boolean; missingFields: string[]; percentage: number }
  > = {};

  // Get all localized fields
  const localizedFields = fields.filter(isFieldLocalized);

  if (localizedFields.length === 0) {
    // No localized fields - all locales are "complete"
    for (const locale of requiredLocales) {
      result[locale] = { complete: true, missingFields: [], percentage: 100 };
    }
    return result;
  }

  for (const locale of requiredLocales) {
    const missingFields: string[] = [];

    for (const field of localizedFields) {
      const fieldValue = data[field.name];

      if (!hasLocale(fieldValue as FieldValue, locale)) {
        missingFields.push(field.name);
      }
    }

    const percentage = Math.round(
      ((localizedFields.length - missingFields.length) / localizedFields.length) * 100
    );

    result[locale] = {
      complete: missingFields.length === 0,
      missingFields,
      percentage,
    };
  }

  return result;
}
