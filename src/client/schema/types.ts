/**
 * Type-Safe Schema Definition Types
 *
 * These types enable full TypeScript inference for content type schemas
 * using Convex's native `Infer<typeof validator>` pattern.
 *
 * @example
 * ```typescript
 * import { v, Infer } from "convex/values";
 * import { defineContentType, InferContentType } from "convex-cms";
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
 * // Type is inferred automatically
 * type BlogPostData = InferContentType<typeof blogPost>;
 * // { title: string; content: string; publishedAt?: number }
 * ```
 */

import type { Validator } from "convex/values";

// =============================================================================
// Field Metadata Types
// =============================================================================

/**
 * UI rendering hints for fields in the admin interface.
 * These help the admin UI understand how to render each field type.
 */
export type FieldRenderAs =
  | "text"
  | "textarea"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "reference"
  | "media"
  | "json"
  | "select"
  | "multiSelect"
  | "slug"
  | "code"
  | "color"
  | "url"
  | "email";

/**
 * Metadata for a single field within a content type.
 * This provides UI hints, validation configuration, and searchability.
 *
 * All options here correspond to the `options` field in the database
 * field definition format and are passed through to the CMS component.
 */
export interface FieldMeta {
  // ==========================================================================
  // General Field Options
  // ==========================================================================

  /**
   * Human-readable label for the field in the admin UI.
   * If not provided, the field name will be used.
   */
  label?: string;

  /**
   * Hint for how the admin UI should render this field.
   * Use this to distinguish between field types that share the same
   * validator type (e.g., `richText` vs `text` both use `v.string()`).
   * @default Inferred from validator type
   */
  renderAs?: FieldRenderAs;

  /**
   * Description/help text shown in the admin UI.
   */
  description?: string;

  /**
   * Whether this field should be indexed for search.
   * Only applicable for text-like fields.
   * @default false
   */
  searchable?: boolean;

  /**
   * Whether this field supports per-locale values.
   * When true, the field can have different values for each locale.
   * @default false
   */
  localized?: boolean;

  /**
   * Placeholder text for input fields.
   */
  placeholder?: string;

  /**
   * Display order in the admin UI (lower = earlier).
   */
  sortOrder?: number;

  /**
   * If true, this field is hidden in the admin UI.
   */
  hidden?: boolean;

  /**
   * If true, this field is read-only in the admin UI.
   */
  readOnly?: boolean;

  /**
   * Default value for the field.
   * Type depends on the field type.
   */
  defaultValue?: unknown;

  // ==========================================================================
  // Text Field Options
  // ==========================================================================

  /**
   * Minimum length for text fields.
   * Enforced during validation.
   */
  minLength?: number;

  /**
   * Maximum length for text fields.
   * Enforced during validation.
   */
  maxLength?: number;

  /**
   * Regex pattern for text validation.
   * The content must match this pattern to be valid.
   * @example "^[a-z0-9-]+$" for slug validation
   */
  pattern?: string;

  /**
   * Error message to display when pattern validation fails.
   * If not provided, a generic message is shown.
   */
  patternMessage?: string;

  /**
   * Whether the text field should render as a multiline textarea.
   * Only applicable when renderAs is "text" or "textarea".
   * @default false
   */
  multiline?: boolean;

  // ==========================================================================
  // Number Field Options
  // ==========================================================================

  /**
   * Minimum value for number fields.
   * Enforced during validation.
   */
  min?: number;

  /**
   * Maximum value for number fields.
   * Enforced during validation.
   */
  max?: number;

  /**
   * Step increment for number inputs.
   * Used for UI number spinners.
   * @example 0.01 for currency values
   */
  step?: number;

  /**
   * Decimal precision for number fields.
   * Numbers will be rounded to this many decimal places.
   * @example 2 for currency (e.g., 19.99)
   */
  precision?: number;

  /**
   * Prefix to display before the number input.
   * @example "$" for currency
   */
  prefix?: string;

  /**
   * Suffix to display after the number input.
   * @example "%" for percentages
   */
  suffix?: string;

  // ==========================================================================
  // Boolean Field Options
  // ==========================================================================

  /**
   * Label to display when the boolean is true.
   * @example "Yes", "Enabled", "Active"
   */
  trueLabel?: string;

  /**
   * Label to display when the boolean is false.
   * @example "No", "Disabled", "Inactive"
   */
  falseLabel?: string;

  // ==========================================================================
  // Date/Datetime Field Options
  // ==========================================================================

  /**
   * Minimum allowed date (ISO 8601 format).
   * @example "2026-01-01"
   */
  minDate?: string;

  /**
   * Maximum allowed date (ISO 8601 format).
   * @example "2025-12-31"
   */
  maxDate?: string;

  /**
   * IANA timezone for datetime fields.
   * Used for display and input conversion.
   * @example "America/New_York"
   */
  timezone?: string;

  /**
   * Display format for date/datetime fields.
   * Uses date-fns format strings.
   * @example "yyyy-MM-dd" or "PPP" (localized)
   */
  format?: string;

  // ==========================================================================
  // Reference Field Options
  // ==========================================================================

  /**
   * For reference fields: allowed content type names.
   * If not specified, references to any content type are allowed.
   */
  allowedContentTypes?: string[];

  /**
   * Whether multiple references can be selected.
   * When true, the field stores an array of IDs.
   * @default false
   */
  multiple?: boolean;

  /**
   * Minimum number of items required (for array fields).
   * Only applies when `multiple` is true.
   */
  minItems?: number;

  /**
   * Maximum number of items allowed (for array fields).
   * Only applies when `multiple` is true.
   */
  maxItems?: number;

  /**
   * Whether to allow creating new referenced entries inline.
   * @default false
   */
  allowInlineCreation?: boolean;

  // ==========================================================================
  // Media Field Options
  // ==========================================================================

  /**
   * For media fields: allowed MIME types.
   * @example ["image/jpeg", "image/png", "image/webp"]
   */
  allowedMimeTypes?: string[];

  /**
   * Maximum file size in bytes.
   * @example 5 * 1024 * 1024 for 5MB
   */
  maxFileSize?: number;

  // ==========================================================================
  // Select/MultiSelect Field Options
  // ==========================================================================

  /**
   * For select/multiSelect fields: available options.
   */
  options?: Array<{ value: string; label: string }>;

  /**
   * Minimum number of selections required (for multiSelect).
   */
  minSelections?: number;

  /**
   * Maximum number of selections allowed (for multiSelect).
   */
  maxSelections?: number;

  // ==========================================================================
  // Rich Text Field Options
  // ==========================================================================

  /**
   * Allowed block types for rich text fields.
   * @example ["paragraph", "heading", "list", "blockquote"]
   */
  allowedBlocks?: string[];

  /**
   * Allowed inline marks/formatting for rich text fields.
   * @example ["bold", "italic", "link", "code"]
   */
  allowedMarks?: string[];

  // ==========================================================================
  // JSON Field Options
  // ==========================================================================

  /**
   * JSON Schema for validating the JSON field content.
   * Should be a valid JSON Schema object.
   */
  schema?: object;

  // ==========================================================================
  // Taxonomy Field Options (tags/category)
  // ==========================================================================

  /**
   * The taxonomy ID to use for this tag/category field.
   * Either taxonomyId or taxonomyName must be provided for taxonomy fields.
   */
  taxonomyId?: string;

  /**
   * The taxonomy name to use for this tag/category field.
   * Alternative to taxonomyId - will look up the taxonomy by name.
   */
  taxonomyName?: string;

  /**
   * Whether to allow creating new taxonomy terms inline.
   * @default false
   */
  allowCreate?: boolean;

  /**
   * Maximum number of tags that can be selected.
   */
  maxTags?: number;

  /**
   * Minimum number of tags required.
   */
  minTags?: number;

  /**
   * For hierarchical taxonomies: maximum depth level to show.
   * 0 = root only, 1 = root and children, etc.
   */
  depth?: number;

  /**
   * Whether to allow selecting multiple categories (for category fields).
   * @default false
   */
  allowMultiple?: boolean;
}

/**
 * Content type metadata configuration.
 * Provides display information and field-level metadata.
 */
export interface ContentTypeMeta<TFieldNames extends string = string> {
  /**
   * Human-readable display name for the content type.
   * Shown in the admin UI.
   */
  displayName: string;

  /**
   * Description of this content type.
   */
  description?: string;

  /**
   * Icon identifier for the admin UI (e.g., emoji or icon name).
   */
  icon?: string;

  /**
   * Field to use for the entry's title in listings.
   * Must be a key from the validator's object type.
   */
  titleField?: TFieldNames;

  /**
   * Field to use for generating URL slugs.
   * Must be a key from the validator's object type.
   */
  slugField?: TFieldNames;

  /**
   * If true, only one entry of this content type can exist.
   */
  singleton?: boolean;

  /**
   * Display order in admin UI navigation.
   */
  sortOrder?: number;

  /**
   * Field-level metadata keyed by field name.
   * Only fields present in the validator can have metadata.
   */
  fields?: Partial<Record<TFieldNames, FieldMeta>>;
}

// =============================================================================
// Content Type Definition Types
// =============================================================================

/**
 * Input configuration for defineContentType().
 *
 * @typeParam TValidator - The Convex validator for the content data shape
 */
export interface ContentTypeConfig<
  TValidator extends Validator<Record<string, unknown>, "required", string>
> {
  /**
   * Unique machine-readable name for this content type.
   * Used as the identifier in code and URLs.
   *
   * Must be:
   * - Lowercase letters, numbers, and underscores only
   * - Start with a letter
   * - 1-50 characters
   *
   * @example "blog_post", "product", "author"
   */
  name: string;

  /**
   * Convex validator defining the content data shape.
   * Types are automatically inferred via `Infer<typeof validator>`.
   *
   * Must be a `v.object()` validator.
   *
   * @example
   * ```typescript
   * validator: v.object({
   *   title: v.string(),
   *   content: v.string(),
   *   author: v.id("contentEntries"),
   * })
   * ```
   */
  validator: TValidator;

  /**
   * CMS-specific metadata for display and configuration.
   */
  meta: ContentTypeMeta<
    TValidator extends Validator<infer T, "required", string>
      ? T extends Record<string, unknown>
        ? keyof T & string
        : string
      : string
  >;
}

/**
 * A fully defined content type with validator and metadata.
 *
 * @typeParam TName - The literal string type for the content type name
 * @typeParam TValidator - The Convex validator for content data
 */
export interface ContentTypeDefinition<
  TName extends string = string,
  TValidator extends Validator<Record<string, unknown>, "required", string> = Validator<
    Record<string, unknown>,
    "required",
    string
  >
> {
  /**
   * The unique identifier for this content type.
   */
  readonly name: TName;

  /**
   * The Convex validator for content data.
   * Use `Infer<typeof definition.validator>` for the TypeScript type.
   */
  readonly validator: TValidator;

  /**
   * CMS metadata for display and configuration.
   */
  readonly meta: ContentTypeMeta;

  /**
   * Internal marker to identify content type definitions.
   * @internal
   */
  readonly _type: "content_type_definition";
}

// =============================================================================
// Type Inference Utilities
// =============================================================================

/**
 * Infer the TypeScript type for a content type's data from its definition.
 *
 * This is a thin wrapper around Convex's native `Infer<typeof validator>`.
 *
 * @example
 * ```typescript
 * const blogPost = defineContentType({
 *   name: "blog_post",
 *   validator: v.object({
 *     title: v.string(),
 *     content: v.string(),
 *   }),
 *   meta: { displayName: "Blog Post" },
 * });
 *
 * type BlogPostData = InferContentType<typeof blogPost>;
 * // { title: string; content: string }
 * ```
 */
export type InferContentType<T extends ContentTypeDefinition> =
  T extends ContentTypeDefinition<string, infer V>
    ? V extends Validator<infer Data, "required", string>
      ? Data
      : never
    : never;

/**
 * A schema object containing multiple content type definitions.
 *
 * @example
 * ```typescript
 * export const contentSchema = {
 *   blogPost,
 *   author,
 *   product,
 * } satisfies ContentSchema;
 * ```
 */
export type ContentSchema = Record<string, ContentTypeDefinition>;

/**
 * Infer all content data types from a schema object.
 *
 * Returns a mapped type where:
 * - Keys are the content type names (from the `name` property)
 * - Values are the inferred data types
 *
 * @example
 * ```typescript
 * const contentSchema = { blogPost, author, product };
 *
 * type ContentTypes = InferSchema<typeof contentSchema>;
 * // {
 * //   blog_post: { title: string; content: string; ... };
 * //   author: { name: string; bio?: string; ... };
 * //   product: { name: string; price: number; ... };
 * // }
 * ```
 */
export type InferSchema<T extends ContentSchema> = {
  [K in keyof T as T[K] extends ContentTypeDefinition<infer Name, Validator<Record<string, unknown>, "required", string>>
    ? Name
    : never]: T[K] extends ContentTypeDefinition<string, infer V>
    ? V extends Validator<infer Data, "required", string>
      ? Data
      : never
    : never;
};

/**
 * Extract all content type names from a schema.
 *
 * @example
 * ```typescript
 * type Names = SchemaContentTypeNames<typeof contentSchema>;
 * // "blog_post" | "author" | "product"
 * ```
 */
export type SchemaContentTypeNames<T extends ContentSchema> = {
  [K in keyof T]: T[K] extends ContentTypeDefinition<infer Name, Validator<Record<string, unknown>, "required", string>>
    ? Name
    : never;
}[keyof T];

/**
 * Get the data type for a specific content type name from a schema.
 *
 * @example
 * ```typescript
 * type BlogData = SchemaContentType<typeof contentSchema, "blog_post">;
 * // { title: string; content: string; ... }
 * ```
 */
export type SchemaContentType<
  T extends ContentSchema,
  Name extends SchemaContentTypeNames<T>
> = InferSchema<T>[Name];

// =============================================================================
// Runtime Schema Utilities
// =============================================================================

/**
 * Extract field names from a content type definition.
 */
export type ContentTypeFieldNames<T extends ContentTypeDefinition> =
  T extends ContentTypeDefinition<string, infer V>
    ? V extends Validator<infer Data, "required", string>
      ? Data extends Record<string, unknown>
        ? keyof Data & string
        : never
      : never
    : never;

/**
 * Check if a value is a ContentTypeDefinition.
 */
export function isContentTypeDefinition(value: unknown): value is ContentTypeDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "_type" in value &&
    (value as ContentTypeDefinition)._type === "content_type_definition"
  );
}
