/**
 * Content Type Schema Definition
 *
 * The `defineContentType` function creates type-safe content type definitions
 * using Convex validators. Types are automatically inferred via Convex's
 * native `Infer<typeof validator>` pattern.
 *
 * @example
 * ```typescript
 * import { v } from "convex/values";
 * import { defineContentType } from "@convex-cms/core";
 *
 * export const blogPost = defineContentType({
 *   name: "blog_post",
 *   validator: v.object({
 *     title: v.string(),
 *     slug: v.string(),
 *     content: v.string(),
 *     author: v.id("content_entries"),
 *     category: v.optional(v.union(v.literal("tech"), v.literal("news"))),
 *     publishedAt: v.optional(v.number()),
 *   }),
 *   meta: {
 *     displayName: "Blog Post",
 *     titleField: "title",
 *     slugField: "slug",
 *     fields: {
 *       title: { label: "Title", maxLength: 200 },
 *       content: { label: "Content", renderAs: "richText", searchable: true },
 *       author: { label: "Author", renderAs: "reference" },
 *       category: { label: "Category", renderAs: "select" },
 *     },
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

// =============================================================================
// Content Type Name Validation
// =============================================================================

/**
 * Pattern for valid content type names.
 * - Lowercase letters, numbers, and underscores only
 * - Must start with a letter
 * - 1-50 characters
 */
const CONTENT_TYPE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

/**
 * Validates a content type name.
 *
 * @param name - The name to validate
 * @throws Error if the name is invalid
 */
function validateContentTypeName(name: string): void {
  if (!name) {
    throw new Error("Content type name is required");
  }

  if (!CONTENT_TYPE_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid content type name "${name}". ` +
        "Names must start with a lowercase letter and contain only " +
        "lowercase letters, numbers, and underscores (1-50 characters)."
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
 * import { defineContentType } from "@convex-cms/core";
 *
 * export const blogPost = defineContentType({
 *   name: "blog_post",
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
 *   name: "product",
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
 * @typeParam TName - The literal string type of the content type name
 * @typeParam TValidator - The Convex validator type
 */
export function defineContentType<
  const TName extends string,
  TValidator extends Validator<Record<string, unknown>, "required", string>
>(
  config: ContentTypeConfig<TValidator> & { name: TName }
): ContentTypeDefinition<TName, TValidator> {
  // Validate the content type name at definition time
  validateContentTypeName(config.name);

  // Create the definition object
  const definition: ContentTypeDefinition<TName, TValidator> = {
    name: config.name,
    validator: config.validator,
    meta: config.meta as ContentTypeMeta,
    _type: "content_type_definition",
  };

  // Freeze to prevent accidental mutation
  return Object.freeze(definition);
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
 * import { createContentSchema } from "@convex-cms/core";
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
  // Build a map of name -> definition for quick lookup
  const byName = new Map<string, ContentTypeDefinition>();
  const names: string[] = [];

  for (const [key, def] of Object.entries(definitions)) {
    if (byName.has(def.name)) {
      throw new Error(
        `Duplicate content type name "${def.name}" in schema. ` +
          `Content type names must be unique.`
      );
    }
    byName.set(def.name, def);
    names.push(def.name);
  }

  return Object.freeze({
    definitions,

    getDefinition(name: string): ContentTypeDefinition | undefined {
      return byName.get(name);
    },

    getContentTypeNames(): string[] {
      return [...names];
    },

    hasContentType(name: string): boolean {
      return byName.has(name);
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
   * Get a content type definition by its name.
   *
   * @param name - The content type name (e.g., "blog_post")
   * @returns The definition or undefined if not found
   */
  getDefinition(name: string): ContentTypeDefinition | undefined;

  /**
   * Get all content type names in the schema.
   *
   * @returns Array of content type names
   */
  getContentTypeNames(): string[];

  /**
   * Check if a content type exists in the schema.
   *
   * @param name - The content type name to check
   * @returns true if the content type exists
   */
  hasContentType(name: string): boolean;

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
 * This is the format stored in content_types.fields.
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

    return {
      name: field.name,
      label: meta.label || field.name,
      type: meta.renderAs || inferFieldType(field.validatorType),
      required: field.required,
      searchable: meta.searchable,
      localized: meta.localized,
      description: meta.description,
      options: buildFieldOptions(field, meta),
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
  const validatorAny = validator as unknown as {
    fieldPaths?: Record<string, unknown>;
    type?: string;
    kind?: string;
    fields?: Record<
      string,
      { fieldPath: string; validator: { isOptional?: string; type?: string; kind?: string } }
    >;
  };

  // Try to access the validator's internal field definitions
  if (validatorAny.fields) {
    for (const [name, fieldInfo] of Object.entries(validatorAny.fields)) {
      const innerValidator = fieldInfo.validator;
      const isOptional = innerValidator?.isOptional === "optional";

      fields.push({
        name,
        validatorType: innerValidator?.type || innerValidator?.kind || "unknown",
        required: !isOptional,
        innerValidator,
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
 * Build field options from extracted field info and metadata.
 *
 * This function maps all FieldMeta options to the database field options format.
 * The options object is stored in content_types.fields[].options and is used
 * for validation and UI rendering.
 *
 * @internal
 */
function buildFieldOptions(
  field: ExtractedField,
  meta: FieldMeta
): Record<string, unknown> | undefined {
  const options: Record<string, unknown> = {};

  // ==========================================================================
  // Text Field Options
  // ==========================================================================
  if (meta.minLength !== undefined) options.minLength = meta.minLength;
  if (meta.maxLength !== undefined) options.maxLength = meta.maxLength;
  if (meta.pattern !== undefined) options.pattern = meta.pattern;
  // Note: patternMessage and multiline are UI hints, not stored in component schema
  // They could be stored in a separate UI hints field if needed

  // ==========================================================================
  // Number Field Options
  // ==========================================================================
  if (meta.min !== undefined) options.min = meta.min;
  if (meta.max !== undefined) options.max = meta.max;
  if (meta.step !== undefined) options.step = meta.step;
  if (meta.precision !== undefined) options.precision = meta.precision;
  // Note: prefix/suffix are UI hints, not stored in component schema

  // ==========================================================================
  // Reference Field Options
  // ==========================================================================
  if (meta.allowedContentTypes !== undefined) options.allowedContentTypes = meta.allowedContentTypes;
  if (meta.multiple !== undefined) options.multiple = meta.multiple;
  if (meta.minItems !== undefined) options.minItems = meta.minItems;
  // Note: maxItems maps to minItems in the component (for validation purposes)
  // The component schema has minItems but not maxItems - we'll add it anyway
  // for forward compatibility

  // ==========================================================================
  // Media Field Options
  // ==========================================================================
  if (meta.allowedMimeTypes !== undefined) options.allowedMimeTypes = meta.allowedMimeTypes;
  if (meta.maxFileSize !== undefined) options.maxFileSize = meta.maxFileSize;

  // ==========================================================================
  // Select/MultiSelect Field Options
  // ==========================================================================
  if (meta.options !== undefined) options.options = meta.options;
  // Note: minSelections/maxSelections could be mapped to minItems/maxItems

  // ==========================================================================
  // Rich Text Field Options
  // ==========================================================================
  if (meta.allowedBlocks !== undefined) options.allowedBlocks = meta.allowedBlocks;
  if (meta.allowedMarks !== undefined) options.allowedMarks = meta.allowedMarks;

  // ==========================================================================
  // Taxonomy Field Options (tags/category)
  // ==========================================================================
  if (meta.taxonomyId !== undefined) options.taxonomyId = meta.taxonomyId;
  if (meta.allowCreate !== undefined) options.allowCreate = meta.allowCreate;
  if (meta.maxTags !== undefined) options.maxTags = meta.maxTags;
  if (meta.minTags !== undefined) options.minTags = meta.minTags;
  if (meta.allowMultiple !== undefined) options.allowMultiple = meta.allowMultiple;

  return Object.keys(options).length > 0 ? options : undefined;
}
