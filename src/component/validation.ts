/**
 * Content Validation Functions
 *
 * Runtime validation helpers that check content data against field configurations.
 * These complement the Convex validators by providing detailed validation logic
 * and human-readable error messages.
 *
 * Supports both plain field values and localized field values (LocalizedFieldValue<T>)
 * for fields marked as `localized: true` in their field definition.
 */
import { FieldType } from "./validators.js";
import {
  isLocalizedFieldValue,
  type LocalizedFieldValue,
} from "./localeFields.js";

/**
 * Field options structure (matches schema.ts fieldOptionsValidator)
 */
export interface FieldOptions {
  // Text fields
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Number fields
  min?: number;
  max?: number;
  step?: number;
  precision?: number;

  // Reference fields
  allowedContentTypes?: string[];
  multiple?: boolean;
  /** Minimum number of references required (only applies when multiple is true) */
  minItems?: number;

  // Media fields
  allowedMimeTypes?: string[];
  maxFileSize?: number;

  // Select fields
  options?: Array<{ value: string; label: string }>;

  // Rich text fields
  allowedBlocks?: string[];
  allowedMarks?: string[];

  // Tag and category fields
  taxonomyId?: string;
  taxonomyName?: string;
  allowCreate?: boolean;
  maxTags?: number;
  minTags?: number;

  // Category fields
  allowMultiple?: boolean;
}

/**
 * Field definition structure (matches schema.ts fieldDefinitionValidator)
 */
export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  searchable?: boolean;
  localized?: boolean;
  description?: string;
  defaultValue?: unknown;
  options?: FieldOptions;
}

/**
 * Content type schema structure
 */
export interface ContentTypeSchema {
  name: string;
  displayName: string;
  description?: string;
  fields: FieldDefinition[];
  titleField?: string;
  slugField?: string;
  singleton?: boolean;
}

/**
 * Content data is a record of field names to their values
 */
export type ContentData = Record<string, unknown>;

// =============================================================================
// Validation Result Types
// =============================================================================

export type ValidationError = {
  field: string;
  message: string;
  code: ValidationErrorCode;
};

export type ValidationErrorCode =
  | "REQUIRED"
  | "MIN_LENGTH"
  | "MAX_LENGTH"
  | "PATTERN_MISMATCH"
  | "MIN_VALUE"
  | "MAX_VALUE"
  | "NOT_INTEGER"
  | "MIN_DATE"
  | "MAX_DATE"
  | "INVALID_TYPE"
  | "MIN_ITEMS"
  | "MAX_ITEMS"
  | "INVALID_CONTENT_TYPE"
  | "UNKNOWN_FIELD"
  | "INVALID_MIME_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_LOCALIZED_STRUCTURE"
  | "MISSING_LOCALE";

export type ValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: ValidationError[] };

// =============================================================================
// Field Value Validators
// =============================================================================

/**
 * Validate a text field value against its configuration
 */
export function validateTextField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined || value === "")) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined || value === "") {
    return errors;
  }

  // Type check
  if (typeof value !== "string") {
    errors.push({
      field: name,
      message: `${name} must be a string`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  // Min length
  if (options?.minLength !== undefined && value.length < options.minLength) {
    errors.push({
      field: name,
      message: `${name} must be at least ${options.minLength} characters`,
      code: "MIN_LENGTH",
    });
  }

  // Max length
  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    errors.push({
      field: name,
      message: `${name} must be at most ${options.maxLength} characters`,
      code: "MAX_LENGTH",
    });
  }

  // Pattern
  if (options?.pattern !== undefined) {
    const regex = new RegExp(options.pattern);
    if (!regex.test(value)) {
      errors.push({
        field: name,
        message: `${name} does not match the required pattern`,
        code: "PATTERN_MISMATCH",
      });
    }
  }

  return errors;
}

/**
 * Validate a rich text field value against its configuration
 */
export function validateRichTextField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined || value === "")) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined || value === "") {
    return errors;
  }

  // Type check
  if (typeof value !== "string") {
    errors.push({
      field: name,
      message: `${name} must be a string`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  // Max length (strip HTML tags before counting)
  if (options?.maxLength !== undefined) {
    const plainText = value.replace(/<[^>]*>/g, "");
    if (plainText.length > options.maxLength) {
      errors.push({
        field: name,
        message: `${name} content must be at most ${options.maxLength} characters`,
        code: "MAX_LENGTH",
      });
    }
  }

  return errors;
}

/**
 * Validate a number field value against its configuration
 */
export function validateNumberField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Type check
  if (typeof value !== "number" || isNaN(value)) {
    errors.push({
      field: name,
      message: `${name} must be a number`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  // Precision check (step = 1 means integer)
  if (options?.precision === 0 && !Number.isInteger(value)) {
    errors.push({
      field: name,
      message: `${name} must be a whole number`,
      code: "NOT_INTEGER",
    });
  }

  // Min value
  if (options?.min !== undefined && value < options.min) {
    errors.push({
      field: name,
      message: `${name} must be at least ${options.min}`,
      code: "MIN_VALUE",
    });
  }

  // Max value
  if (options?.max !== undefined && value > options.max) {
    errors.push({
      field: name,
      message: `${name} must be at most ${options.max}`,
      code: "MAX_VALUE",
    });
  }

  return errors;
}

/**
 * Validate a money field value against its configuration.
 *
 * Money fields store `{ amount: number, currency: string }` where
 * `amount` is in minor units (e.g. cents) and `currency` is ISO 4217.
 */
export function validateMoneyField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Structure check
  if (typeof value !== "object" || !("amount" in value) || !("currency" in value)) {
    errors.push({
      field: name,
      message: `${name} must have amount and currency`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  const money = value as { amount: unknown; currency: unknown };

  // Amount must be an integer (minor units)
  if (typeof money.amount !== "number" || isNaN(money.amount)) {
    errors.push({
      field: name,
      message: `${name} amount must be a number`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  if (!Number.isInteger(money.amount)) {
    errors.push({
      field: name,
      message: `${name} amount must be a whole number (minor units)`,
      code: "NOT_INTEGER",
    });
  }

  if (money.amount < 0) {
    errors.push({
      field: name,
      message: `${name} amount cannot be negative`,
      code: "MIN_VALUE",
    });
  }

  // Min/max from options (if provided, in minor units)
  if (options?.min !== undefined && money.amount < options.min) {
    errors.push({
      field: name,
      message: `${name} must be at least ${options.min}`,
      code: "MIN_VALUE",
    });
  }
  if (options?.max !== undefined && money.amount > options.max) {
    errors.push({
      field: name,
      message: `${name} must be at most ${options.max}`,
      code: "MAX_VALUE",
    });
  }

  // Currency must be a 3-letter string
  if (typeof money.currency !== "string" || money.currency.length !== 3) {
    errors.push({
      field: name,
      message: `${name} currency must be a 3-letter ISO 4217 code`,
      code: "INVALID_TYPE",
    });
  }

  return errors;
}

/**
 * Validate a boolean field value against its configuration
 */
export function validateBooleanField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Type check
  if (typeof value !== "boolean") {
    errors.push({
      field: name,
      message: `${name} must be a boolean`,
      code: "INVALID_TYPE",
    });
  }

  return errors;
}

/**
 * Validate a date or datetime field value against its configuration
 */
export function validateDateField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Type check (must be a valid timestamp)
  if (typeof value !== "number" || isNaN(value)) {
    errors.push({
      field: name,
      message: `${name} must be a valid timestamp`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  // Min date (using min from options)
  if (options?.min !== undefined && value < options.min) {
    errors.push({
      field: name,
      message: `${name} must be on or after the minimum date`,
      code: "MIN_DATE",
    });
  }

  // Max date (using max from options)
  if (options?.max !== undefined && value > options.max) {
    errors.push({
      field: name,
      message: `${name} must be on or before the maximum date`,
      code: "MAX_DATE",
    });
  }

  return errors;
}

/**
 * Validate a reference field value against its configuration.
 *
 * Reference fields store IDs to other content entries. They support:
 * - Single reference: `string` (one entry ID)
 * - Multiple references: `string[]` (array of entry IDs) when `multiple: true`
 *
 * Configuration options:
 * - `allowedContentTypes`: Array of content type names that can be referenced
 * - `multiple`: If true, accepts an array of references
 * - `minItems`: Minimum number of references required (only when `multiple: true`)
 * - `max`: Maximum number of references allowed (only when `multiple: true`)
 *
 * @example
 * ```typescript
 * // Single reference to an author
 * const authorField: FieldDefinition = {
 *   name: "author",
 *   label: "Author",
 *   type: "reference",
 *   required: true,
 *   options: {
 *     allowedContentTypes: ["user"],
 *   },
 * };
 *
 * // Multiple references to related posts (1-5 required)
 * const relatedPostsField: FieldDefinition = {
 *   name: "relatedPosts",
 *   label: "Related Posts",
 *   type: "reference",
 *   required: true,
 *   options: {
 *     allowedContentTypes: ["blog_post"],
 *     multiple: true,
 *     minItems: 1,
 *     max: 5,
 *   },
 * };
 * ```
 */
export function validateReferenceField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;
  const multiple = options?.multiple ?? false;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Type check based on multiple setting
  if (multiple) {
    if (!Array.isArray(value)) {
      errors.push({
        field: name,
        message: `${name} must be an array of references`,
        code: "INVALID_TYPE",
      });
      return errors;
    }

    // Check if required and empty array
    if (required && value.length === 0) {
      errors.push({
        field: name,
        message: `${name} requires at least one reference`,
        code: "REQUIRED",
      });
    }

    // Check each item is a string (valid ID format)
    for (const item of value) {
      if (typeof item !== "string") {
        errors.push({
          field: name,
          message: `${name} contains invalid reference IDs`,
          code: "INVALID_TYPE",
        });
        break;
      }
    }

    // Min items validation (only for multiple references)
    if (options?.minItems !== undefined && value.length < options.minItems) {
      errors.push({
        field: name,
        message: `${name} requires at least ${options.minItems} reference${options.minItems === 1 ? "" : "s"}`,
        code: "MIN_ITEMS",
      });
    }

    // Max items (using max from options)
    if (options?.max !== undefined && value.length > options.max) {
      errors.push({
        field: name,
        message: `${name} can have at most ${options.max} reference${options.max === 1 ? "" : "s"}`,
        code: "MAX_ITEMS",
      });
    }
  } else {
    if (typeof value !== "string") {
      errors.push({
        field: name,
        message: `${name} must be a reference ID`,
        code: "INVALID_TYPE",
      });
    }
  }

  return errors;
}

/**
 * Check if a reference value is valid for a given content type constraint.
 *
 * This is a helper function that can be used in mutation handlers to validate
 * that referenced entries exist and belong to allowed content types.
 *
 * @param referenceId - The content entry ID to validate
 * @param allowedContentTypes - Array of allowed content type names (optional)
 * @param contentTypeLookup - Function to get content type name by entry ID
 * @returns Object with `valid` boolean and optional `error` message
 */
export async function validateReferenceContentType(
  referenceId: string,
  allowedContentTypes: string[] | undefined,
  contentTypeLookup: (entryId: string) => Promise<string | null>
): Promise<{ valid: boolean; error?: string }> {
  // If no content type constraints, the reference is valid
  if (!allowedContentTypes || allowedContentTypes.length === 0) {
    return { valid: true };
  }

  // Look up the content type of the referenced entry
  const contentTypeName = await contentTypeLookup(referenceId);

  // If the entry doesn't exist, it's invalid
  if (contentTypeName === null) {
    return {
      valid: false,
      error: `Referenced entry not found: ${referenceId}`,
    };
  }

  // Check if the content type is in the allowed list
  if (!allowedContentTypes.includes(contentTypeName)) {
    return {
      valid: false,
      error: `Reference must be of type: ${allowedContentTypes.join(", ")}. Got: ${contentTypeName}`,
    };
  }

  return { valid: true };
}

/**
 * Validate a media field value against its configuration.
 *
 * Media fields store IDs to media assets. They support:
 * - Single reference: `string` (one media asset ID)
 * - Multiple references (gallery): `string[]` (array of media asset IDs) when `multiple: true`
 *
 * Configuration options:
 * - `allowedMimeTypes`: Array of allowed MIME types (supports wildcards like "image/*")
 * - `multiple`: If true, accepts an array of references (gallery mode)
 * - `minItems`: Minimum number of media assets required (only when `multiple: true`)
 * - `max`: Maximum number of media assets allowed (only when `multiple: true`)
 * - `maxFileSize`: Maximum file size in bytes (validated at upload time, not here)
 *
 * Note: MIME type validation requires database lookups and is performed by
 * `validateAllMediaReferences` in the mediaReferenceResolver module.
 *
 * @example
 * ```typescript
 * // Single featured image (images only)
 * const featuredImageField: FieldDefinition = {
 *   name: "featuredImage",
 *   label: "Featured Image",
 *   type: "media",
 *   required: true,
 *   options: {
 *     allowedMimeTypes: ["image/*"],
 *   },
 * };
 *
 * // Gallery with 2-10 images
 * const galleryField: FieldDefinition = {
 *   name: "gallery",
 *   label: "Photo Gallery",
 *   type: "media",
 *   required: true,
 *   options: {
 *     allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
 *     multiple: true,
 *     minItems: 2,
 *     max: 10,
 *   },
 * };
 * ```
 */
export function validateMediaField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;
  const multiple = options?.multiple ?? false;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Type check based on multiple setting
  if (multiple) {
    if (!Array.isArray(value)) {
      errors.push({
        field: name,
        message: `${name} must be an array of media asset IDs`,
        code: "INVALID_TYPE",
      });
      return errors;
    }

    // Check if required and empty array
    if (required && value.length === 0) {
      errors.push({
        field: name,
        message: `${name} requires at least one media asset`,
        code: "REQUIRED",
      });
    }

    // Check each item is a string (valid ID format)
    for (const item of value) {
      if (typeof item !== "string") {
        errors.push({
          field: name,
          message: `${name} contains invalid media asset IDs`,
          code: "INVALID_TYPE",
        });
        break;
      }
    }

    // Min items validation (only for multiple/gallery media fields)
    if (options?.minItems !== undefined && value.length < options.minItems) {
      errors.push({
        field: name,
        message: `${name} requires at least ${options.minItems} media asset${options.minItems === 1 ? "" : "s"}`,
        code: "MIN_ITEMS",
      });
    }

    // Max items (using max from options)
    if (options?.max !== undefined && value.length > options.max) {
      errors.push({
        field: name,
        message: `${name} can have at most ${options.max} media asset${options.max === 1 ? "" : "s"}`,
        code: "MAX_ITEMS",
      });
    }
  } else {
    if (typeof value !== "string") {
      errors.push({
        field: name,
        message: `${name} must be a media asset ID`,
        code: "INVALID_TYPE",
      });
    }
  }

  return errors;
}

/**
 * Validate a select field value against its configuration
 */
export function validateSelectField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined || value === "")) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined || value === "") {
    return errors;
  }

  // Type check
  if (typeof value !== "string") {
    errors.push({
      field: name,
      message: `${name} must be a string`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  // Validate against allowed options
  if (options?.options) {
    const allowedValues = options.options.map((opt) => opt.value);
    if (!allowedValues.includes(value)) {
      errors.push({
        field: name,
        message: `${name} has an invalid value`,
        code: "INVALID_TYPE",
      });
    }
  }

  return errors;
}

/**
 * Validate a multi-select field value against its configuration
 */
export function validateMultiSelectField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Type check - must be array
  if (!Array.isArray(value)) {
    errors.push({
      field: name,
      message: `${name} must be an array`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  // Check if required and empty array
  if (required && value.length === 0) {
    errors.push({
      field: name,
      message: `${name} requires at least one selection`,
      code: "REQUIRED",
    });
  }

  // Validate each item is a string and in allowed options
  const allowedValues = options?.options?.map((opt) => opt.value) ?? [];
  for (const item of value) {
    if (typeof item !== "string") {
      errors.push({
        field: name,
        message: `${name} contains invalid values`,
        code: "INVALID_TYPE",
      });
      break;
    }
    if (allowedValues.length > 0 && !allowedValues.includes(item)) {
      errors.push({
        field: name,
        message: `${name} contains an invalid option`,
        code: "INVALID_TYPE",
      });
      break;
    }
  }

  return errors;
}

/**
 * Validate a JSON field value
 */
export function validateJsonField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // JSON fields can be any valid JSON value, so minimal type checking
  // The value has already been parsed if it was a string
  return errors;
}

/**
 * Validate a tags field value against its configuration.
 *
 * Tags fields store arrays of taxonomy term IDs for flexible content categorization.
 * They support:
 * - Multiple term selection
 * - Optional inline term creation (when allowCreate is true)
 * - Min/max limits on number of tags
 *
 * Configuration options:
 * - `taxonomyId`: The taxonomy these tags belong to (required at content type level)
 * - `allowCreate`: If true, users can create new tags inline
 * - `minTags`: Minimum number of tags required
 * - `maxTags`: Maximum number of tags allowed
 *
 * @example
 * ```typescript
 * const tagsField: FieldDefinition = {
 *   name: "tags",
 *   label: "Tags",
 *   type: "tags",
 *   required: true,
 *   options: {
 *     taxonomyId: "tags_taxonomy_id",
 *     allowCreate: true,
 *     minTags: 1,
 *     maxTags: 10,
 *   },
 * };
 * ```
 */
export function validateTagsField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Type check - must be array of strings (term IDs)
  if (!Array.isArray(value)) {
    errors.push({
      field: name,
      message: `${name} must be an array of tag IDs`,
      code: "INVALID_TYPE",
    });
    return errors;
  }

  // Check if required and empty array
  if (required && value.length === 0) {
    errors.push({
      field: name,
      message: `${name} requires at least one tag`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Validate each item is a string
  for (const item of value) {
    if (typeof item !== "string") {
      errors.push({
        field: name,
        message: `${name} contains invalid tag IDs`,
        code: "INVALID_TYPE",
      });
      break;
    }
  }

  // Min tags validation
  const minTags = options?.minTags;
  if (minTags !== undefined && value.length < minTags) {
    errors.push({
      field: name,
      message: `${name} requires at least ${minTags} tag${minTags === 1 ? "" : "s"}`,
      code: "MIN_ITEMS",
    });
  }

  // Max tags validation
  const maxTags = options?.maxTags;
  if (maxTags !== undefined && value.length > maxTags) {
    errors.push({
      field: name,
      message: `${name} can have at most ${maxTags} tag${maxTags === 1 ? "" : "s"}`,
      code: "MAX_ITEMS",
    });
  }

  return errors;
}

/**
 * Validate a category field value against its configuration.
 *
 * Category fields store taxonomy term IDs for hierarchical content organization.
 * They support:
 * - Single category selection (default)
 * - Multiple category selection (when allowMultiple is true)
 *
 * Configuration options:
 * - `taxonomyId`: The taxonomy these categories belong to (required at content type level)
 * - `allowMultiple`: If true, accepts an array of category IDs
 *
 * @example
 * ```typescript
 * // Single category selection
 * const categoryField: FieldDefinition = {
 *   name: "category",
 *   label: "Category",
 *   type: "category",
 *   required: true,
 *   options: {
 *     taxonomyId: "categories_taxonomy_id",
 *   },
 * };
 *
 * // Multiple category selection
 * const categoriesField: FieldDefinition = {
 *   name: "categories",
 *   label: "Categories",
 *   type: "category",
 *   required: true,
 *   options: {
 *     taxonomyId: "categories_taxonomy_id",
 *     allowMultiple: true,
 *   },
 * };
 * ```
 */
export function validateCategoryField(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required, options } = fieldDef;
  const allowMultiple = options?.allowMultiple ?? false;

  // Check required
  if (required && (value === null || value === undefined)) {
    errors.push({
      field: name,
      message: `${name} is required`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined) {
    return errors;
  }

  // Type check based on allowMultiple setting
  if (allowMultiple) {
    if (!Array.isArray(value)) {
      errors.push({
        field: name,
        message: `${name} must be an array of category IDs`,
        code: "INVALID_TYPE",
      });
      return errors;
    }

    // Check if required and empty array
    if (required && value.length === 0) {
      errors.push({
        field: name,
        message: `${name} requires at least one category`,
        code: "REQUIRED",
      });
    }

    // Check each item is a string (valid ID format)
    for (const item of value) {
      if (typeof item !== "string") {
        errors.push({
          field: name,
          message: `${name} contains invalid category IDs`,
          code: "INVALID_TYPE",
        });
        break;
      }
    }
  } else {
    // Single category selection
    if (typeof value !== "string") {
      errors.push({
        field: name,
        message: `${name} must be a category ID`,
        code: "INVALID_TYPE",
      });
    }
  }

  return errors;
}

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Options for validating localized fields.
 */
export interface LocalizedValidationOptions {
  /**
   * The locale to validate. If provided, only that locale's value is validated
   * for localized fields. If not provided, all locale values are validated.
   */
  locale?: string;

  /**
   * Locales that must have values for required localized fields.
   * If not provided, only checks if at least one locale has a value for required fields.
   */
  requiredLocales?: string[];
}

/**
 * Validate a single field value (non-localized) based on its type.
 * This is the core validation logic that handles the actual value checking.
 */
function validateSingleValue(
  value: unknown,
  fieldDef: FieldDefinition
): ValidationError[] {
  const { name, type } = fieldDef;

  switch (type) {
    case "text":
      return validateTextField(value, fieldDef);
    case "richText":
      return validateRichTextField(value, fieldDef);
    case "number":
      return validateNumberField(value, fieldDef);
    case "boolean":
      return validateBooleanField(value, fieldDef);
    case "date":
    case "datetime":
      return validateDateField(value, fieldDef);
    case "reference":
      return validateReferenceField(value, fieldDef);
    case "media":
      return validateMediaField(value, fieldDef);
    case "select":
      return validateSelectField(value, fieldDef);
    case "multiSelect":
      return validateMultiSelectField(value, fieldDef);
    case "json":
      return validateJsonField(value, fieldDef);
    case "tags":
      return validateTagsField(value, fieldDef);
    case "category":
      return validateCategoryField(value, fieldDef);
    case "money":
      return validateMoneyField(value, fieldDef);
    default: {
      // Unknown field type
      return [
        {
          field: name,
          message: `Unknown field type: ${type}`,
          code: "INVALID_TYPE",
        },
      ];
    }
  }
}

/**
 * Validate a localized field value.
 *
 * For localized fields, the value should be a LocalizedFieldValue structure:
 * `{ "en-US": "Hello", "es-ES": "Hola" }`
 *
 * This function validates:
 * 1. The structure is a valid LocalizedFieldValue
 * 2. Each locale's value passes the field type validation
 * 3. Required locales have values (if specified)
 *
 * @param value - The localized field value to validate
 * @param fieldDef - The field definition
 * @param options - Validation options for localized fields
 * @returns Array of validation errors
 */
export function validateLocalizedFieldValue(
  value: unknown,
  fieldDef: FieldDefinition,
  options: LocalizedValidationOptions = {}
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { name, required } = fieldDef;
  const { locale, requiredLocales } = options;

  // Handle null/undefined for required fields
  if (value === null || value === undefined) {
    if (required) {
      errors.push({
        field: name,
        message: `${name} is required`,
        code: "REQUIRED",
      });
    }
    return errors;
  }

  // Check if the value is a valid LocalizedFieldValue structure
  if (!isLocalizedFieldValue(value)) {
    errors.push({
      field: name,
      message: `${name} must be a localized field structure (object with locale codes as keys)`,
      code: "INVALID_LOCALIZED_STRUCTURE",
    });
    return errors;
  }

  const localizedValue = value as LocalizedFieldValue;
  const locales = Object.keys(localizedValue);

  // Check if required and empty
  if (required && locales.length === 0) {
    errors.push({
      field: name,
      message: `${name} requires at least one locale value`,
      code: "REQUIRED",
    });
    return errors;
  }

  // Check required locales
  if (requiredLocales && requiredLocales.length > 0) {
    for (const requiredLocale of requiredLocales) {
      if (!(requiredLocale in localizedValue)) {
        errors.push({
          field: name,
          message: `${name} is missing required translation for locale: ${requiredLocale}`,
          code: "MISSING_LOCALE",
        });
      }
    }
  }

  // If a specific locale is specified, validate only that locale
  if (locale) {
    if (locale in localizedValue) {
      // Create a non-localized field definition for single value validation
      const nonLocalizedFieldDef = { ...fieldDef, localized: false };
      const localeErrors = validateSingleValue(
        localizedValue[locale],
        nonLocalizedFieldDef
      );
      // Prefix errors with locale info
      for (const error of localeErrors) {
        errors.push({
          ...error,
          field: `${name}[${locale}]`,
          message: `${name} (${locale}): ${error.message.replace(`${name} `, "")}`,
        });
      }
    }
  } else {
    // Validate all locale values
    for (const [localeCode, localeValue] of Object.entries(localizedValue)) {
      // Create a non-localized field definition for single value validation
      const nonLocalizedFieldDef = { ...fieldDef, localized: false, required: false };
      const localeErrors = validateSingleValue(localeValue, nonLocalizedFieldDef);
      // Prefix errors with locale info
      for (const error of localeErrors) {
        errors.push({
          ...error,
          field: `${name}[${localeCode}]`,
          message: `${name} (${localeCode}): ${error.message.replace(`${name} `, "")}`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate a single field value based on its definition.
 *
 * Handles both localized and non-localized fields:
 * - Non-localized fields: Validates the value directly
 * - Localized fields: Validates the LocalizedFieldValue structure and each locale's value
 *
 * @param value - The field value to validate (plain value or LocalizedFieldValue)
 * @param fieldDef - The field definition
 * @param options - Optional validation options for localized fields
 * @returns Array of validation errors
 */
export function validateFieldValue(
  value: unknown,
  fieldDef: FieldDefinition,
  options?: LocalizedValidationOptions
): ValidationError[] {
  // Check if this is a localized field
  if (fieldDef.localized) {
    return validateLocalizedFieldValue(value, fieldDef, options);
  }

  // Non-localized field - use standard validation
  return validateSingleValue(value, fieldDef);
}

/**
 * Options for validating content data.
 */
export interface ContentValidationOptions {
  /**
   * If true, reports unknown fields as errors.
   * If false (default), unknown fields are silently ignored.
   */
  strictFields?: boolean;

  /**
   * Locale to validate for localized fields.
   * If provided, only that locale's values are validated.
   */
  locale?: string;

  /**
   * Locales that must have values for required localized fields.
   */
  requiredLocales?: string[];
}

/**
 * Validate content data against a content type schema
 *
 * @param data - The content data to validate
 * @param schema - The content type schema defining expected fields
 * @param options - Validation options
 * @returns ValidationResult with any errors found
 *
 * @example
 * ```typescript
 * // Basic validation
 * const result = validateContentData(data, schema);
 *
 * // Validate with localized field support
 * const result = validateContentData(data, schema, {
 *   locale: "en-US",
 *   requiredLocales: ["en-US", "es-ES"],
 * });
 * ```
 */
export function validateContentData(
  data: ContentData,
  schema: ContentTypeSchema,
  options: ContentValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const fieldMap = new Map(schema.fields.map((f) => [f.name, f]));
  const { strictFields, locale, requiredLocales } = options;

  // Create localized validation options
  const localizedOptions: LocalizedValidationOptions = {
    locale,
    requiredLocales,
  };

  // Validate each defined field
  for (const fieldDef of schema.fields) {
    const value = data[fieldDef.name];
    const fieldErrors = validateFieldValue(value, fieldDef, localizedOptions);
    errors.push(...fieldErrors);
  }

  // Check for unknown fields if strict mode
  if (strictFields) {
    for (const key of Object.keys(data)) {
      if (!fieldMap.has(key)) {
        errors.push({
          field: key,
          message: `Unknown field: ${key}`,
          code: "UNKNOWN_FIELD",
        });
      }
    }
  }

  if (errors.length === 0) {
    return { valid: true, errors: [] };
  }

  return { valid: false, errors };
}

/**
 * Apply default values to content data based on field definitions
 */
export function applyFieldDefaults(
  data: ContentData,
  schema: ContentTypeSchema
): ContentData {
  const result = { ...data };

  for (const fieldDef of schema.fields) {
    const { name, defaultValue } = fieldDef;

    // Only apply default if field is not already set
    if (result[name] === undefined || result[name] === null) {
      if (defaultValue !== undefined) {
        result[name] = defaultValue;
      }
    }
  }

  return result;
}

/**
 * Get the field type from a field definition
 */
export function getFieldType(fieldDef: FieldDefinition): FieldType {
  return fieldDef.type;
}

/**
 * Check if a field is required based on its configuration
 */
export function isFieldRequired(fieldDef: FieldDefinition): boolean {
  return fieldDef.required === true;
}
