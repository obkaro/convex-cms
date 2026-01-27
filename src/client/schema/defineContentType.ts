/**
 * Content Type Schema Definition
 *
 * The `defineContentType` function creates type-safe content type definitions
 * using Convex validators. Types are automatically inferred via Convex's
 * native `Infer<typeof validator>` pattern.
 *
 * You can use either display names ("Blog Post") or slug format ("blog_post"):
 * - Display names are automatically converted to slugs
 * - Slugs are used for queries and code references
 *
 * @example Using a display name (recommended)
 * ```typescript
 * import { v } from "convex/values";
 * import { defineContentType } from "convex-cms";
 *
 * export const blogPost = defineContentType({
 *   name: "Blog Post", // → slug: "blog_post"
 *   validator: v.object({
 *     title: v.string(),
 *     content: v.string(),
 *   }),
 *   meta: {
 *     displayName: "Blog Post",
 *     titleField: "title",
 *   },
 * });
 *
 * // blogPost.slug === "blog_post"
 * // blogPost.name === "Blog Post"
 * ```
 *
 * @example Using slug format directly
 * ```typescript
 * export const blogPost = defineContentType({
 *   name: "blog_post", // Already a valid slug
 *   validator: v.object({
 *     title: v.string(),
 *     content: v.string(),
 *   }),
 *   meta: {
 *     displayName: "Blog Post",
 *     titleField: "title",
 *   },
 * });
 * ```
 */

import type { Validator } from "convex/values";
import type {
  ContentTypeConfig,
  ContentTypeDefinition,
  ContentTypeMeta,
  FieldMeta,
} from "./types.js";
import { toSlug, isValidSlug, type ToSlugType } from "../utils/toSlug.js";

// =============================================================================
// Content Type Name/Slug Handling
// =============================================================================

/**
 * Checks if a name is already in slug format.
 */
function isSlugFormat(name: string): boolean {
  return isValidSlug(name);
}

/**
 * Validates a generated slug.
 *
 * @param slug - The slug to validate
 * @param originalName - The original name (for error messages)
 * @throws Error if the slug is invalid
 */
function validateSlug(slug: string, originalName: string): void {
  if (!slug) {
    throw new Error("Content type name is required");
  }

  if (!isValidSlug(slug)) {
    throw new Error(
      `Invalid content type name "${originalName}". ` +
        `Generated slug "${slug}" must start with a lowercase letter and contain only ` +
        `lowercase letters, numbers, and underscores (1-50 characters).`
    );
  }
}

// =============================================================================
// Define Content Type
// =============================================================================

/**
 * Creates a type-safe content type definition.
 *
 * This function accepts a Convex validator and CMS metadata, returning a
 * definition object that can be used for:
 * 1. **Type inference**: `Infer<typeof definition.validator>` gives the data type
 * 2. **Runtime validation**: The validator is used to validate content at runtime
 * 3. **Admin UI configuration**: Metadata provides display hints and field labels
 *
 * ## Why Convex Validators?
 *
 * Using Convex validators directly (instead of custom schema builders) provides:
 * - **Native type inference** via `Infer<typeof>` - no custom type machinery
 * - **Familiarity** - same validators used in Convex functions
 * - **Full power** - supports unions, literals, nested objects, arrays, IDs
 * - **Maintenance-free** - types are maintained by Convex
 *
 * ## Example: Basic Blog Post
 *
 * ```typescript
 * import { v, Infer } from "convex/values";
 * import { defineContentType } from "convex-cms";
 *
 * export const blogPost = defineContentType({
 *   name: "Blog Post", // Display name → auto-converted to slug "blog_post"
 *   validator: v.object({
 *     title: v.string(),
 *     content: v.string(),
 *     publishedAt: v.optional(v.number()),
 *   }),
 *   meta: {
 *     displayName: "Blog Post",
 *     titleField: "title",
 *   },
 * });
 *
 * // Type is automatically inferred
 * type BlogPostData = Infer<typeof blogPost.validator>;
 * // { title: string; content: string; publishedAt?: number }
 * ```
 *
 * ## Example: Product with Variants
 *
 * ```typescript
 * export const product = defineContentType({
 *   name: "Product",
 *   validator: v.object({
 *     name: v.string(),
 *     price: v.number(),
 *     description: v.optional(v.string()),
 *     variants: v.array(v.object({
 *       sku: v.string(),
 *       name: v.string(),
 *       price: v.number(),
 *       attributes: v.record(v.string(), v.string()),
 *     })),
 *     seo: v.optional(v.object({
 *       title: v.string(),
 *       description: v.string(),
 *       keywords: v.array(v.string()),
 *     })),
 *   }),
 *   meta: {
 *     displayName: "Product",
 *     titleField: "name",
 *     fields: {
 *       name: { label: "Product Name", searchable: true },
 *       price: { label: "Base Price" },
 *       variants: { label: "Variants", renderAs: "json" },
 *       seo: { label: "SEO Settings", renderAs: "json" },
 *     },
 *   },
 * });
 * ```
 *
 * @param config - The content type configuration
 * @returns A frozen content type definition object
 *
 * @typeParam TName - The literal string type of the content type name (display or slug)
 * @typeParam TValidator - The Convex validator type
 */
export function defineContentType<
  const TName extends string,
  TValidator extends Validator<Record<string, unknown>, "required", string>
>(
  config: ContentTypeConfig<TValidator> & { name: TName }
): ContentTypeDefinition<ToSlugType<TName>, TValidator> {
  const inputName = config.name;

  // Determine slug and display name based on input format
  let slug: string;
  let displayName: string;

  if (isSlugFormat(inputName)) {
    // Input is already a valid slug (e.g., "blog_post")
    slug = inputName;
    // Use displayName from meta if provided, otherwise derive from slug
    displayName = config.meta.displayName || inputName;
  } else {
    // Input is a display name (e.g., "Blog Post") - convert to slug
    slug = toSlug(inputName);
    displayName = inputName;
  }

  // Validate the generated/provided slug
  validateSlug(slug, inputName);

  // Create the definition object with both name (display) and slug
  const definition = {
    name: displayName,
    slug: slug,
    validator: config.validator,
    meta: config.meta as ContentTypeMeta,
    _type: "content_type_definition" as const,
  };

  // Freeze to prevent accidental mutation
  // Cast to the computed slug type - runtime slug matches type-level ToSlugType
  return Object.freeze(definition) as ContentTypeDefinition<ToSlugType<TName>, TValidator>;
}

// =============================================================================
// Schema Collection Utilities
// =============================================================================

/**
 * Creates a content schema from multiple content type definitions.
 *
 * This is a convenience function that validates the schema and provides
 * runtime utilities for working with multiple content types.
 *
 * @example
 * ```typescript
 * import { createContentSchema } from "convex-cms";
 *
 * export const contentSchema = createContentSchema({
 *   blogPost,
 *   author,
 *   product,
 * });
 *
 * // Get a specific definition
 * const blogDef = contentSchema.getDefinition("blog_post");
 *
 * // List all content type names
 * const names = contentSchema.getContentTypeNames();
 * // ["blog_post", "author", "product"]
 * ```
 *
 * @param definitions - An object containing content type definitions
 * @returns A schema object with utility methods
 */
export function createContentSchema<
  T extends Record<string, ContentTypeDefinition>
>(definitions: T): ContentSchemaInstance<T> {
  // Build a map of slug -> definition for quick lookup
  const bySlug = new Map<string, ContentTypeDefinition>();
  const slugs: string[] = [];

  for (const [_key, def] of Object.entries(definitions)) {
    if (bySlug.has(def.slug)) {
      throw new Error(
        `Duplicate content type slug "${def.slug}" in schema. ` +
          `Content type slugs must be unique.`
      );
    }
    bySlug.set(def.slug, def);
    slugs.push(def.slug);
  }

  return Object.freeze({
    definitions,

    getDefinition(slug: string): ContentTypeDefinition | undefined {
      return bySlug.get(slug);
    },

    getContentTypeNames(): string[] {
      return [...slugs];
    },

    hasContentType(slug: string): boolean {
      return bySlug.has(slug);
    },

    getDefinitionByKey<K extends keyof T>(key: K): T[K] {
      return definitions[key];
    },
  });
}

/**
 * A content schema instance with utility methods.
 */
export interface ContentSchemaInstance<
  T extends Record<string, ContentTypeDefinition>
> {
  /**
   * The raw definitions object.
   */
  readonly definitions: T;

  /**
   * Get a content type definition by its slug.
   *
   * @param slug - The content type slug (e.g., "blog_post")
   * @returns The definition or undefined if not found
   */
  getDefinition(slug: string): ContentTypeDefinition | undefined;

  /**
   * Get all content type slugs in the schema.
   *
   * @returns Array of content type slugs
   */
  getContentTypeNames(): string[];

  /**
   * Check if a content type exists in the schema.
   *
   * @param slug - The content type slug to check
   * @returns true if the content type exists
   */
  hasContentType(slug: string): boolean;

  /**
   * Get a content type definition by its key in the definitions object.
   *
   * @param key - The key used in the definitions object
   * @returns The definition
   */
  getDefinitionByKey<K extends keyof T>(key: K): T[K];
}

// =============================================================================
// Schema to Field Definitions Converter
// =============================================================================

/**
 * Field definition format expected by the CMS database.
 * This is the format stored in contentTypes.fields.
 */
export interface DatabaseFieldDefinition {
  name: string;
  label: string;
  type: string;
  required: boolean;
  searchable?: boolean;
  localized?: boolean;
  description?: string;
  defaultValue?: unknown;
  options?: Record<string, unknown>;
}

/**
 * Converts a content type definition to the database field format.
 *
 * This bridges the gap between the code-defined schema and the
 * database format used by the CMS component.
 *
 * @param definition - The content type definition
 * @returns An array of field definitions for the database
 *
 * @example
 * ```typescript
 * const fields = toFieldDefinitions(blogPost);
 * // [
 * //   { name: "title", label: "Title", type: "text", required: true, ... },
 * //   { name: "content", label: "Content", type: "richText", required: true, ... },
 * // ]
 * ```
 */
export function toFieldDefinitions(
  definition: ContentTypeDefinition
): DatabaseFieldDefinition[] {
  // Extract field information from the validator
  // This requires introspecting the validator structure
  const validatorFields = extractValidatorFields(definition.validator);
  const fieldMeta = definition.meta.fields || {};

  return validatorFields.map((field) => {
    const meta = fieldMeta[field.name as keyof typeof fieldMeta] || {};

    const fieldType = meta.renderAs || inferFieldType(field.validatorType);

    return {
      name: field.name,
      label: meta.label || field.name,
      type: fieldType,
      required: field.required,
      searchable: meta.searchable,
      localized: meta.localized,
      description: meta.description,
      options: buildFieldOptions(fieldType, meta),
    };
  });
}

/**
 * Field information extracted from a validator.
 */
interface ExtractedField {
  name: string;
  validatorType: string;
  required: boolean;
  innerValidator?: unknown;
}

/**
 * Extract field information from a Convex object validator.
 *
 * @internal
 */
function extractValidatorFields(
  validator: Validator<Record<string, unknown>, "required", string>
): ExtractedField[] {
  const fields: ExtractedField[] = [];

  // Convex validators have internal structure we can introspect
  // The validator has a `fields` property for object validators
  // Each field IS a validator with isOptional, kind, etc.
  const validatorAny = validator as unknown as {
    fieldPaths?: Record<string, unknown>;
    type?: string;
    kind?: string;
    fields?: Record<
      string,
      { isOptional?: string; type?: string; kind?: string }
    >;
  };

  // Try to access the validator's internal field definitions
  if (validatorAny.fields) {
    for (const [name, fieldValidator] of Object.entries(validatorAny.fields)) {
      const isOptional = fieldValidator?.isOptional === "optional";

      fields.push({
        name,
        validatorType: fieldValidator?.type || fieldValidator?.kind || "unknown",
        required: !isOptional,
        innerValidator: fieldValidator,
      });
    }
  }

  return fields;
}

/**
 * Infer a CMS field type from a Convex validator type.
 *
 * @internal
 */
function inferFieldType(validatorType: string): string {
  const typeMap: Record<string, string> = {
    string: "text",
    number: "number",
    float64: "number",
    int64: "number",
    boolean: "boolean",
    id: "reference",
    array: "json",
    object: "json",
    union: "select",
    literal: "select",
    bytes: "media",
  };

  return typeMap[validatorType] || "text";
}

/**
 * Build field options from field type and metadata.
 *
 * Only includes options that are valid for the specific field type,
 * matching the admin API validator schema.
 *
 * @internal
 */
function buildFieldOptions(
  fieldType: string,
  meta: FieldMeta
): Record<string, unknown> | undefined {
  const options: Record<string, unknown> = {};

  switch (fieldType) {
    case "text": {
      if (meta.minLength !== undefined) options.minLength = meta.minLength;
      if (meta.maxLength !== undefined) options.maxLength = meta.maxLength;
      if (meta.pattern !== undefined) options.pattern = meta.pattern;
      break;
    }

    case "number": {
      if (meta.min !== undefined) options.min = meta.min;
      if (meta.max !== undefined) options.max = meta.max;
      if (meta.step !== undefined) options.step = meta.step;
      if (meta.precision !== undefined) options.precision = meta.precision;
      break;
    }

    case "boolean": {
      // Boolean fields can have trueLabel/falseLabel but those aren't in FieldMeta
      break;
    }

    case "richText": {
      if (meta.allowedBlocks !== undefined) options.allowedBlocks = meta.allowedBlocks;
      if (meta.allowedMarks !== undefined) options.allowedMarks = meta.allowedMarks;
      break;
    }

    case "media": {
      if (meta.allowedMimeTypes !== undefined) options.allowedMimeTypes = meta.allowedMimeTypes;
      if (meta.maxFileSize !== undefined) options.maxFileSize = meta.maxFileSize;
      if (meta.multiple !== undefined) options.multiple = meta.multiple;
      break;
    }

    case "select":
    case "multiSelect": {
      if (meta.options !== undefined) options.options = meta.options;
      break;
    }

    case "tags": {
      if (meta.taxonomyId !== undefined) options.taxonomyId = meta.taxonomyId;
      if (meta.allowCreate !== undefined) options.allowCreate = meta.allowCreate;
      if (meta.maxTags !== undefined) options.maxTags = meta.maxTags;
      if (meta.minTags !== undefined) options.minTags = meta.minTags;
      break;
    }

    case "category": {
      if (meta.allowMultiple !== undefined) options.allowMultiple = meta.allowMultiple;
      break;
    }

    case "json": {
      // JSON fields can have schema but that's not in FieldMeta
      break;
    }

    case "date":
    case "datetime": {
      if (meta.min !== undefined) options.min = meta.min;
      if (meta.max !== undefined) options.max = meta.max;
      break;
    }

    case "reference": {
      if (meta.allowedContentTypes !== undefined) options.allowedContentTypes = meta.allowedContentTypes;
      if (meta.multiple !== undefined) options.multiple = meta.multiple;
      if (meta.minItems !== undefined) options.minItems = meta.minItems;
      break;
    }
  }

  return Object.keys(options).length > 0 ? options : undefined;
}
