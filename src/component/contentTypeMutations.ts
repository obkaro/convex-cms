/**
 * Content Type Mutation Functions
 *
 * Provides mutation functions for creating, updating, and managing content types.
 * Content types define the schema/blueprint for content entries in the CMS.
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server.js";
import {
  createContentTypeArgs,
  contentTypeDoc,
  fieldTypes,
  type FieldType,
} from "./validators.js";
import type { FieldDefinition } from "./validation.js";

/**
 * Validation error for content type field definitions.
 */
interface FieldValidationError {
  /** The field name that has the error */
  fieldName: string;
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code:
    | "DUPLICATE_FIELD_NAME"
    | "INVALID_FIELD_TYPE"
    | "MISSING_REQUIRED_PROPERTY"
    | "INVALID_FIELD_NAME"
    | "INVALID_SELECT_OPTIONS";
}

/**
 * Validates the name format for content types and fields.
 * Names must be valid identifiers: lowercase letters, numbers, and underscores.
 * Must start with a letter and be 1-64 characters.
 */
function isValidName(name: string): boolean {
  const namePattern = /^[a-z][a-z0-9_]{0,63}$/;
  return namePattern.test(name);
}

/**
 * Validates field definitions for a content type.
 * Checks for:
 * - Unique field names
 * - Valid field types
 * - Required properties (name, label, type, required)
 * - Valid field name format
 * - Select/multiSelect fields have options defined
 */
function validateFieldDefinitions(
  fields: FieldDefinition[]
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  const seenNames = new Set<string>();

  for (const field of fields) {
    // Check for missing required properties
    if (!field.name || typeof field.name !== "string") {
      errors.push({
        fieldName: field.name || "(unnamed)",
        message: "Field must have a name property",
        code: "MISSING_REQUIRED_PROPERTY",
      });
      continue;
    }

    if (!field.label || typeof field.label !== "string") {
      errors.push({
        fieldName: field.name,
        message: `Field "${field.name}" must have a label property`,
        code: "MISSING_REQUIRED_PROPERTY",
      });
    }

    if (!field.type || typeof field.type !== "string") {
      errors.push({
        fieldName: field.name,
        message: `Field "${field.name}" must have a type property`,
        code: "MISSING_REQUIRED_PROPERTY",
      });
    }

    if (typeof field.required !== "boolean") {
      errors.push({
        fieldName: field.name,
        message: `Field "${field.name}" must have a required property (boolean)`,
        code: "MISSING_REQUIRED_PROPERTY",
      });
    }

    // Validate field name format
    if (field.name && !isValidName(field.name)) {
      errors.push({
        fieldName: field.name,
        message: `Field name "${field.name}" must start with a lowercase letter and contain only lowercase letters, numbers, and underscores (max 64 chars)`,
        code: "INVALID_FIELD_NAME",
      });
    }

    // Check for duplicate field names
    if (seenNames.has(field.name)) {
      errors.push({
        fieldName: field.name,
        message: `Duplicate field name: "${field.name}"`,
        code: "DUPLICATE_FIELD_NAME",
      });
    }
    seenNames.add(field.name);

    // Validate field type is one of the supported types
    if (field.type && !fieldTypes.includes(field.type as FieldType)) {
      errors.push({
        fieldName: field.name,
        message: `Invalid field type "${field.type}". Must be one of: ${fieldTypes.join(", ")}`,
        code: "INVALID_FIELD_TYPE",
      });
    }

    // Validate select/multiSelect fields have options
    if (
      (field.type === "select" || field.type === "multiSelect") &&
      (!field.options?.options || field.options.options.length === 0)
    ) {
      errors.push({
        fieldName: field.name,
        message: `${field.type} field "${field.name}" must have options defined`,
        code: "INVALID_SELECT_OPTIONS",
      });
    }
  }

  return errors;
}

/**
 * Mutation to create a new content type.
 *
 * Creates a content type definition with a unique name, display name, and
 * field definitions. The content type can then be used to create content entries.
 *
 * @param name - Unique machine-readable name (e.g., "blog_post")
 * @param displayName - Human-readable name (e.g., "Blog Post")
 * @param description - Optional description of the content type
 * @param fields - Array of field definitions
 * @param icon - Optional icon identifier for UI
 * @param singleton - If true, only one entry of this type can exist
 * @param slugField - Field name to use for slug generation (defaults to first text field)
 * @param titleField - Field name to use as display title (defaults to first text field)
 * @param sortOrder - Custom sort order for admin UI
 * @param createdBy - User ID who is creating this content type
 *
 * @returns The created content type document
 *
 * @throws Error if the name is not unique
 * @throws Error if the name format is invalid
 * @throws Error if field definitions are invalid
 *
 * @example
 * ```typescript
 * const blogPost = await ctx.runMutation(api.contentTypeMutations.createContentType, {
 *   name: "blog_post",
 *   displayName: "Blog Post",
 *   description: "Articles for the company blog",
 *   fields: [
 *     { name: "title", label: "Title", type: "text", required: true },
 *     { name: "content", label: "Content", type: "richText", required: true },
 *     { name: "published_date", label: "Published Date", type: "date", required: false },
 *   ],
 *   slugField: "title",
 *   titleField: "title",
 *   createdBy: currentUserId,
 * });
 * ```
 */
export const createContentType = mutation({
  args: createContentTypeArgs.fields,
  returns: contentTypeDoc,
  handler: async (ctx, args) => {
    const {
      name,
      displayName,
      description,
      fields,
      icon,
      singleton,
      slugField,
      titleField,
      sortOrder,
      createdBy,
    } = args;

    // Validate content type name format
    if (!isValidName(name)) {
      throw new Error(
        `Invalid content type name "${name}". Name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores (max 64 chars).`
      );
    }

    // Check if name is already taken (must be unique)
    const existingType = await ctx.db
      .query("content_types")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (existingType) {
      throw new Error(
        `A content type with name "${name}" already exists. Please choose a different name.`
      );
    }

    // Validate field definitions
    const fieldErrors = validateFieldDefinitions(fields as FieldDefinition[]);
    if (fieldErrors.length > 0) {
      const errorMessages = fieldErrors
        .map((e) => `${e.fieldName}: ${e.message}`)
        .join("; ");
      throw new Error(`Invalid field definitions: ${errorMessages}`);
    }

    // Validate slugField references an existing field if provided
    if (slugField) {
      const slugFieldExists = fields.some((f) => f.name === slugField);
      if (!slugFieldExists) {
        throw new Error(
          `slugField "${slugField}" does not reference an existing field.`
        );
      }
    }

    // Validate titleField references an existing field if provided
    if (titleField) {
      const titleFieldExists = fields.some((f) => f.name === titleField);
      if (!titleFieldExists) {
        throw new Error(
          `titleField "${titleField}" does not reference an existing field.`
        );
      }
    }

    // Insert the new content type
    const id = await ctx.db.insert("content_types", {
      name,
      displayName,
      description,
      fields,
      icon,
      singleton,
      slugField,
      titleField,
      sortOrder,
      isActive: true,
      createdBy,
    });

    // Retrieve and return the created document
    const created = await ctx.db.get(id);
    if (!created) {
      throw new Error("Failed to retrieve created content type");
    }

    return created;
  },
});
