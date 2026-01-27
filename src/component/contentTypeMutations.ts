/**
 * Content Type Mutation Functions
 *
 * Provides mutation functions for creating, updating, and managing content types.
 * Content types define the schema/blueprint for content entries in the CMS.
 */

import { v } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import { mutation } from "./_generated/server.js";
import {
  createContentTypeArgs,
  updateContentTypeArgs,
  deleteContentTypeArgs,
  contentTypeDoc,
  type FieldType,
  mutationAuthContext,
} from "./validators.js";
import type { FieldDefinition } from "./validation.js";
import {
  emitEvent,
  contentTypeEventType,
  ContentTypeEventPayload,
} from "./eventEmitter.js";
import { fieldTypes } from "./schema.js";
import {
  contentTypeNotFound,
  contentTypeDeleted,
  contentTypeNameInvalid,
  contentTypeNameDuplicate,
  contentTypeFieldValidationFailed,
  contentTypeSlugFieldInvalid,
  contentTypeTitleFieldInvalid,
  contentTypeHasEntries,
  contentTypeBreakingChange,
  // batchSizeExceeded,
  internalError,
} from "./lib/errors.js";
import { requireMutationAuth } from "./lib/mutationAuth.js";

// =============================================================================
// Breaking Change Detection Types
// =============================================================================

/**
 * Describes a potential breaking change when updating a content type.
 */
interface BreakingChange {
  /** Type of breaking change detected */
  type:
    | "FIELD_REMOVED"
    | "FIELD_TYPE_CHANGED"
    | "FIELD_MADE_REQUIRED"
    | "SELECT_OPTIONS_REMOVED"
    | "REFERENCE_TYPES_RESTRICTED"
    | "VALIDATION_TIGHTENED";
  /** The field name affected */
  fieldName: string;
  /** Human-readable description of the breaking change */
  message: string;
  /** Number of entries affected by this change */
  affectedEntriesCount: number;
}

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
 * Names must be valid identifiers: letters, numbers, and underscores.
 * Must start with a lowercase letter and be 1-64 characters.
 * Supports both snake_case and camelCase conventions.
 */
function isValidName(name: string): boolean {
  const namePattern = /^[a-z][a-zA-Z0-9_]{0,63}$/;
  return namePattern.test(name);
}

/**
 * Detects breaking changes between old and new field definitions.
 * Returns an array of breaking changes that would affect existing content entries.
 *
 * @param oldFields - Current field definitions
 * @param newFields - Proposed new field definitions
 * @param existingEntries - Existing content entries to check for impact
 * @returns Array of detected breaking changes with affected entry counts
 */
function detectBreakingChanges(
  oldFields: FieldDefinition[],
  newFields: FieldDefinition[],
  existingEntries: Array<{ data: Record<string, unknown> }>
): BreakingChange[] {
  const breakingChanges: BreakingChange[] = [];
  const oldFieldMap = new Map(oldFields.map((f) => [f.name, f]));
  const newFieldMap = new Map(newFields.map((f) => [f.name, f]));

  // Check for removed fields that have data in existing entries
  for (const oldField of oldFields) {
    if (!newFieldMap.has(oldField.name)) {
      // Field is being removed - count entries with data in this field
      const affectedCount = existingEntries.filter((entry) => {
        const value = entry.data[oldField.name];
        return value !== undefined && value !== null && value !== "";
      }).length;

      if (affectedCount > 0) {
        breakingChanges.push({
          type: "FIELD_REMOVED",
          fieldName: oldField.name,
          message: `Removing field "${oldField.name}" will delete data from ${affectedCount} existing entries`,
          affectedEntriesCount: affectedCount,
        });
      }
    }
  }

  // Check for changes to existing fields
  for (const newField of newFields) {
    const oldField = oldFieldMap.get(newField.name);
    if (!oldField) continue; // New field, no breaking change possible

    // Check for type changes
    if (oldField.type !== newField.type) {
      const affectedCount = existingEntries.filter((entry) => {
        const value = entry.data[newField.name];
        return value !== undefined && value !== null;
      }).length;

      if (affectedCount > 0) {
        breakingChanges.push({
          type: "FIELD_TYPE_CHANGED",
          fieldName: newField.name,
          message: `Changing field "${newField.name}" type from "${oldField.type}" to "${newField.type}" may invalidate ${affectedCount} existing entries`,
          affectedEntriesCount: affectedCount,
        });
      }
    }

    // Check for optional -> required changes
    if (!oldField.required && newField.required) {
      const affectedCount = existingEntries.filter((entry) => {
        const value = entry.data[newField.name];
        return value === undefined || value === null || value === "";
      }).length;

      if (affectedCount > 0) {
        breakingChanges.push({
          type: "FIELD_MADE_REQUIRED",
          fieldName: newField.name,
          message: `Making field "${newField.name}" required will invalidate ${affectedCount} entries with missing values`,
          affectedEntriesCount: affectedCount,
        });
      }
    }

    // Check for removed select/multiSelect options
    if (
      (oldField.type === "select" || oldField.type === "multiSelect") &&
      oldField.options?.options &&
      newField.options?.options
    ) {
      const oldOptions = new Set(oldField.options.options.map((o) => o.value));
      const newOptions = new Set(newField.options.options.map((o) => o.value));
      const removedOptions = [...oldOptions].filter((o) => !newOptions.has(o));

      if (removedOptions.length > 0) {
        const affectedCount = existingEntries.filter((entry) => {
          const value = entry.data[newField.name];
          if (oldField.type === "select") {
            return removedOptions.includes(value as string);
          } else {
            // multiSelect - check if any values are in removed options
            const values = value as string[] | undefined;
            return values?.some((v) => removedOptions.includes(v));
          }
        }).length;

        if (affectedCount > 0) {
          breakingChanges.push({
            type: "SELECT_OPTIONS_REMOVED",
            fieldName: newField.name,
            message: `Removing options [${removedOptions.join(", ")}] from "${newField.name}" will invalidate ${affectedCount} entries using those values`,
            affectedEntriesCount: affectedCount,
          });
        }
      }
    }

    // Check for restricted reference content types
    if (
      oldField.type === "reference" &&
      newField.type === "reference" &&
      oldField.options?.allowedContentTypes &&
      newField.options?.allowedContentTypes
    ) {
      const oldAllowed = new Set(oldField.options.allowedContentTypes);
      const newAllowed = new Set(newField.options.allowedContentTypes);
      const removedTypes = [...oldAllowed].filter((t) => !newAllowed.has(t));

      // Note: We can't easily check if existing references point to removed types
      // without resolving references. This is a warning-level change.
      if (removedTypes.length > 0) {
        breakingChanges.push({
          type: "REFERENCE_TYPES_RESTRICTED",
          fieldName: newField.name,
          message: `Restricting allowed content types for "${newField.name}" by removing [${removedTypes.join(", ")}] may invalidate existing references`,
          affectedEntriesCount: existingEntries.length, // Potentially all entries
        });
      }
    }

    // Check for tightened validation (minLength increased, maxLength decreased, etc.)
    if (
      oldField.type === "text" &&
      newField.type === "text" &&
      oldField.options &&
      newField.options
    ) {
      const violations: string[] = [];

      // Check if minLength was increased
      if (
        newField.options.minLength !== undefined &&
        (oldField.options.minLength === undefined ||
          newField.options.minLength > oldField.options.minLength)
      ) {
        violations.push(
          `minLength increased to ${newField.options.minLength}`
        );
      }

      // Check if maxLength was decreased
      if (
        newField.options.maxLength !== undefined &&
        oldField.options.maxLength !== undefined &&
        newField.options.maxLength < oldField.options.maxLength
      ) {
        violations.push(
          `maxLength decreased to ${newField.options.maxLength}`
        );
      }

      if (violations.length > 0) {
        const affectedCount = existingEntries.filter((entry) => {
          const value = entry.data[newField.name];
          if (typeof value !== "string") return false;

          if (
            newField.options?.minLength !== undefined &&
            value.length < newField.options.minLength
          ) {
            return true;
          }
          if (
            newField.options?.maxLength !== undefined &&
            value.length > newField.options.maxLength
          ) {
            return true;
          }
          return false;
        }).length;

        if (affectedCount > 0) {
          breakingChanges.push({
            type: "VALIDATION_TIGHTENED",
            fieldName: newField.name,
            message: `Tightening validation for "${newField.name}" (${violations.join(", ")}) will invalidate ${affectedCount} entries`,
            affectedEntriesCount: affectedCount,
          });
        }
      }
    }
  }

  return breakingChanges;
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
        message: `Field name "${field.name}" must start with a lowercase letter and contain only letters, numbers, and underscores (max 64 chars)`,
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
  args: {
    ...createContentTypeArgs.fields,
    /** Optional auth context for mutation-level authorization */
    _auth: v.optional(mutationAuthContext),
  },
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
      _auth,
    } = args;

    // Authorization check - contentTypes.create permission
    requireMutationAuth(_auth, "contentTypes", "create");

    // Validate content type name format
    if (!isValidName(name)) {
      throw contentTypeNameInvalid(name);
    }

    // Check if name is already taken (must be unique)
    const existingType = await ctx.db
      .query("contentTypes")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (existingType) {
      throw contentTypeNameDuplicate(name);
    }

    // Validate field definitions
    const fieldErrors = validateFieldDefinitions(fields as FieldDefinition[]);
    if (fieldErrors.length > 0) {
      throw contentTypeFieldValidationFailed(fieldErrors);
    }

    // Validate slugField references an existing field if provided
    const fieldNames = fields.map((f) => f.name);
    if (slugField) {
      const slugFieldExists = fields.some((f) => f.name === slugField);
      if (!slugFieldExists) {
        throw contentTypeSlugFieldInvalid(slugField, fieldNames);
      }
    }

    // Validate titleField references an existing field if provided
    if (titleField) {
      const titleFieldExists = fields.some((f) => f.name === titleField);
      if (!titleFieldExists) {
        throw contentTypeTitleFieldInvalid(titleField, fieldNames);
      }
    }

    // Insert the new content type
    const id = await ctx.db.insert("contentTypes", {
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
      throw internalError("Failed to retrieve created content type");
    }

    // Emit content type created event
    await emitEvent(ctx, {
      eventType: contentTypeEventType("created"),
      resourceType: "contentType",
      resourceId: id as unknown as string,
      action: "created",
      payload: {
        name,
        displayName,
        fieldCount: fields.length,
        isActive: true,
      } as ContentTypeEventPayload,
      userId: createdBy,
    });

    return created;
  },
});

// =============================================================================
// Update Content Type Mutation
// =============================================================================

/**
 * Validator for breaking change information returned by the mutation.
 */
const breakingChangeValidator = v.object({
  type: v.union(
    v.literal("FIELD_REMOVED"),
    v.literal("FIELD_TYPE_CHANGED"),
    v.literal("FIELD_MADE_REQUIRED"),
    v.literal("SELECT_OPTIONS_REMOVED"),
    v.literal("REFERENCE_TYPES_RESTRICTED"),
    v.literal("VALIDATION_TIGHTENED")
  ),
  fieldName: v.string(),
  message: v.string(),
  affectedEntriesCount: v.number(),
});

/**
 * Extended return type that includes breaking change warnings.
 */
const updateContentTypeResult = v.object({
  ...contentTypeDoc.fields,
  /** Breaking changes that were detected (only populated if force=true was used) */
  breakingChanges: v.optional(v.array(breakingChangeValidator)),
});

/**
 * Mutation to update an existing content type's fields and configuration.
 *
 * Includes validation to prevent breaking changes to fields with existing content.
 * When breaking changes are detected and `force` is not set to true, the mutation
 * will throw an error with details about the breaking changes.
 *
 * **Breaking Change Detection:**
 * - Removing fields that have data in existing entries
 * - Changing field types (e.g., text → number)
 * - Making optional fields required when entries have empty values
 * - Removing select/multiSelect options that are in use
 * - Restricting allowed reference content types
 * - Tightening validation rules (increased minLength, decreased maxLength)
 *
 * @param id - The content type ID to update
 * @param displayName - Optional new display name
 * @param description - Optional new description
 * @param fields - Optional new field definitions (replaces all existing fields)
 * @param icon - Optional new icon
 * @param singleton - Optional singleton flag
 * @param slugField - Optional field name for slug generation
 * @param titleField - Optional field name for display title
 * @param sortOrder - Optional new sort order
 * @param isActive - Optional active status
 * @param updatedBy - User ID making the update (for audit trail)
 * @param force - If true, allow breaking changes (default: false)
 *
 * @returns The updated content type, with breakingChanges if force was used
 *
 * @throws Error if the content type does not exist
 * @throws Error if breaking changes are detected and force is not true
 * @throws Error if field definitions are invalid
 *
 * @example
 * ```typescript
 * // Simple update (no breaking changes)
 * const updated = await ctx.runMutation(api.contentTypeMutations.updateContentType, {
 *   id: contentTypeId,
 *   displayName: "Updated Blog Post",
 *   description: "New description",
 *   updatedBy: currentUserId,
 * });
 *
 * // Update fields (will check for breaking changes)
 * const updated = await ctx.runMutation(api.contentTypeMutations.updateContentType, {
 *   id: contentTypeId,
 *   fields: [
 *     { name: "title", label: "Title", type: "text", required: true },
 *     { name: "content", label: "Content", type: "richText", required: true },
 *     { name: "author", label: "Author", type: "text", required: false }, // New field
 *   ],
 *   updatedBy: currentUserId,
 * });
 *
 * // Force update with breaking changes
 * const updated = await ctx.runMutation(api.contentTypeMutations.updateContentType, {
 *   id: contentTypeId,
 *   fields: newFields,
 *   force: true, // Acknowledge potential data loss
 *   updatedBy: currentUserId,
 * });
 * ```
 */
export const updateContentType = mutation({
  args: {
    ...updateContentTypeArgs.fields,
    /** If true, allow breaking changes that may affect existing content entries */
    force: v.optional(v.boolean()),
    /** Optional auth context for mutation-level authorization */
    _auth: v.optional(mutationAuthContext),
  },
  returns: updateContentTypeResult,
  handler: async (ctx, args) => {
    const {
      id,
      displayName,
      description,
      fields,
      icon,
      singleton,
      slugField,
      titleField,
      sortOrder,
      isActive,
      updatedBy,
      force = false,
      _auth,
    } = args;

    // Authorization check - contentTypes.update permission
    requireMutationAuth(_auth, "contentTypes", "update");

    const existingType = await ctx.db.get(id);
    if (!existingType) {
      throw contentTypeNotFound(id as unknown as string);
    }
    if (isDeleted(existingType)) {
      throw contentTypeDeleted(id as unknown as string, existingType.name);
    }

    // Build the update object with only provided fields
    const updates: Record<string, unknown> = {
      updatedBy,
    };

    // Handle simple field updates
    if (displayName !== undefined) {
      updates.displayName = displayName;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (icon !== undefined) {
      updates.icon = icon;
    }
    if (singleton !== undefined) {
      updates.singleton = singleton;
    }
    if (sortOrder !== undefined) {
      updates.sortOrder = sortOrder;
    }
    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    // Track breaking changes if fields are being updated
    let detectedBreakingChanges: BreakingChange[] = [];

    // Handle field updates with breaking change detection
    if (fields !== undefined) {
      // Validate the new field definitions
      const fieldErrors = validateFieldDefinitions(fields as FieldDefinition[]);
      if (fieldErrors.length > 0) {
        throw contentTypeFieldValidationFailed(fieldErrors);
      }

      // Get all existing content entries for this content type
      const existingEntries = await ctx.db
        .query("contentEntries")
        .withIndex("by_content_type", (q) => q.eq("contentTypeName", existingType.name))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      // Only check for breaking changes if there are existing entries
      if (existingEntries.length > 0) {
        detectedBreakingChanges = detectBreakingChanges(
          existingType.fields as FieldDefinition[],
          fields as FieldDefinition[],
          existingEntries.map((e) => ({ data: e.data as Record<string, unknown> }))
        );

        // If breaking changes detected and force is not true, throw error
        if (detectedBreakingChanges.length > 0 && !force) {
          throw contentTypeBreakingChange(detectedBreakingChanges);
        }
      }

      updates.fields = fields;
    }

    // Validate slugField references an existing field if provided
    const effectiveFields = (fields ?? existingType.fields) as FieldDefinition[];
    const effectiveSlugField = slugField !== undefined ? slugField : existingType.slugField;
    const effectiveTitleField = titleField !== undefined ? titleField : existingType.titleField;

    const availableFieldNames = effectiveFields.map((f) => f.name);

    if (effectiveSlugField) {
      const slugFieldExists = effectiveFields.some((f) => f.name === effectiveSlugField);
      if (!slugFieldExists) {
        throw contentTypeSlugFieldInvalid(effectiveSlugField, availableFieldNames);
      }
      if (slugField !== undefined) {
        updates.slugField = slugField;
      }
    } else if (slugField !== undefined) {
      updates.slugField = slugField;
    }

    if (effectiveTitleField) {
      const titleFieldExists = effectiveFields.some((f) => f.name === effectiveTitleField);
      if (!titleFieldExists) {
        throw contentTypeTitleFieldInvalid(effectiveTitleField, availableFieldNames);
      }
      if (titleField !== undefined) {
        updates.titleField = titleField;
      }
    } else if (titleField !== undefined) {
      updates.titleField = titleField;
    }

    // Apply the updates
    await ctx.db.patch(id, updates);

    // Retrieve and return the updated document
    const updated = await ctx.db.get(id);
    if (!updated) {
      throw internalError("Failed to retrieve updated content type");
    }

    // Emit content type updated event
    const changedFields = Object.keys(updates).filter((k) => k !== "updatedBy");
    await emitEvent(ctx, {
      eventType: contentTypeEventType("updated"),
      resourceType: "contentType",
      resourceId: id as unknown as string,
      action: "updated",
      payload: {
        name: updated.name,
        displayName: updated.displayName,
        fieldCount: updated.fields.length,
        isActive: updated.isActive,
        changedFields,
      } as ContentTypeEventPayload,
      userId: updatedBy,
    });

    // Include breaking changes in the result if force was used
    return {
      ...updated,
      breakingChanges:
        detectedBreakingChanges.length > 0 ? detectedBreakingChanges : undefined,
    };
  },
});

// =============================================================================
// Delete Content Type Mutation
// =============================================================================

/**
 * Result type for the delete content type mutation.
 * Includes information about any cascade-deleted entries.
 */
export const deleteContentTypeResult = v.object({
  /** Whether the deletion was successful */
  success: v.boolean(),
  /** The ID of the deleted content type */
  deletedId: v.id("contentTypes"),
  /** Number of content entries that were deleted (when cascade=true) */
  deletedEntriesCount: v.number(),
  /** Number of content versions that were deleted (when cascade=true and hardDelete=true) */
  deletedVersionsCount: v.number(),
  /** Whether this was a hard delete (permanent) or soft delete */
  wasHardDelete: v.boolean(),
});

/**
 * Mutation to delete a content type.
 *
 * Supports two deletion strategies via the `cascade` flag:
 * 1. **Cascade delete** (`cascade: true`): Deletes all content entries of this type
 *    before deleting the content type itself.
 * 2. **Prevent if entries exist** (`cascade: false` or not specified): Fails the
 *    deletion if any content entries exist for this type.
 *
 * Also supports two deletion modes via the `hardDelete` flag:
 * - **Soft delete** (default): Sets `deletedAt` timestamp, entries remain in database
 * - **Hard delete** (`hardDelete: true`): Permanently removes from database
 *
 * @param id - The content type ID to delete
 * @param cascade - If true, delete all entries of this type first. Default: false
 * @param hardDelete - If true, permanently delete. Default: false (soft delete)
 * @param deletedBy - User ID performing the deletion (for audit trail)
 *
 * @returns Object with deletion results including counts of deleted entries/versions
 *
 * @throws Error if content type does not exist
 * @throws Error if content type is already deleted (soft deleted)
 * @throws Error if cascade is false and content entries exist
 *
 * @example
 * ```typescript
 * // Soft delete - fails if entries exist
 * const result = await ctx.runMutation(api.contentTypeMutations.deleteContentType, {
 *   id: contentTypeId,
 *   deletedBy: currentUserId,
 * });
 *
 * // Cascade soft delete - deletes all entries too
 * const result = await ctx.runMutation(api.contentTypeMutations.deleteContentType, {
 *   id: contentTypeId,
 *   cascade: true,
 *   deletedBy: currentUserId,
 * });
 *
 * // Hard delete with cascade - permanently removes everything
 * const result = await ctx.runMutation(api.contentTypeMutations.deleteContentType, {
 *   id: contentTypeId,
 *   cascade: true,
 *   hardDelete: true,
 *   deletedBy: currentUserId,
 * });
 * ```
 */
export const deleteContentType = mutation({
  args: {
    ...deleteContentTypeArgs.fields,
    /** Optional auth context for mutation-level authorization */
    _auth: v.optional(mutationAuthContext),
  },
  returns: deleteContentTypeResult,
  handler: async (ctx, args) => {
    const { id, cascade = false, hardDelete = false, deletedBy, _auth } = args;

    // Authorization check - contentTypes.delete permission
    requireMutationAuth(_auth, "contentTypes", "delete");

    const contentType = await ctx.db.get(id);
    if (!contentType) {
      throw contentTypeNotFound(id as unknown as string);
    }

    // Check if already soft-deleted
    if (isDeleted(contentType)) {
      throw contentTypeDeleted(id as unknown as string, contentType.name);
    }

    // Get all content entries for this type (excluding already soft-deleted ones)
    const existingEntries = await ctx.db
      .query("contentEntries")
      .withIndex("by_content_type", (q) => q.eq("contentTypeName", contentType.name))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const entryCount = existingEntries.length;

    // If entries exist and cascade is false, prevent deletion
    if (entryCount > 0 && !cascade) {
      throw contentTypeHasEntries(id as unknown as string, contentType.name, entryCount);
    }

    let deletedEntriesCount = 0;
    let deletedVersionsCount = 0;
    const now = Date.now();

    // If cascade is true, delete all entries first
    if (cascade && entryCount > 0) {
      if (hardDelete) {
        // Hard delete: permanently remove entries and their versions
        for (const entry of existingEntries) {
          // Delete all versions for this entry
          const versions = await ctx.db
            .query("contentVersions")
            .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
            .collect();

          for (const version of versions) {
            await ctx.db.delete(version._id);
            deletedVersionsCount++;
          }

          // Delete the entry
          await ctx.db.delete(entry._id);
          deletedEntriesCount++;
        }
      } else {
        // Soft delete: set deletedAt on all entries
        for (const entry of existingEntries) {
          await ctx.db.patch(entry._id, {
            deletedAt: now,
            updatedBy: deletedBy,
          });
          deletedEntriesCount++;
        }
      }
    }

    // Delete the content type itself
    if (hardDelete) {
      // Hard delete: permanently remove
      await ctx.db.delete(id);
    } else {
      // Soft delete: set deletedAt
      await ctx.db.patch(id, {
        deletedAt: now,
        isActive: false,
        updatedBy: deletedBy,
      });
    }

    // Emit content type deleted event
    await emitEvent(ctx, {
      eventType: contentTypeEventType("deleted"),
      resourceType: "contentType",
      resourceId: id as unknown as string,
      action: "deleted",
      payload: {
        name: contentType.name,
        displayName: contentType.displayName,
        fieldCount: contentType.fields.length,
        isActive: false,
      } as ContentTypeEventPayload,
      userId: deletedBy,
      metadata: {
        hardDelete,
        cascade,
        deletedEntriesCount,
        deletedVersionsCount,
      },
    });

    return {
      success: true,
      deletedId: id,
      deletedEntriesCount,
      deletedVersionsCount,
      wasHardDelete: hardDelete,
    };
  },
});
