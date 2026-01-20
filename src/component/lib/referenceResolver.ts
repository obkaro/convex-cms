/**
 * Reference Resolution Utilities
 *
 * Provides functions for resolving and populating content references.
 * These utilities help with fetching referenced content entries and
 * validating reference constraints.
 */

import { Doc, Id } from "../_generated/dataModel.js";
import { QueryCtx } from "../_generated/server.js";

// =============================================================================
// Types
// =============================================================================

/**
 * A single reference value (content entry ID as string)
 */
export type SingleReference = string;

/**
 * Multiple reference values (array of content entry IDs)
 */
export type MultipleReferences = string[];

/**
 * Reference field value - either single or multiple based on field configuration
 */
export type ReferenceValue = SingleReference | MultipleReferences;

/**
 * A resolved reference with the full content entry data
 */
export interface ResolvedReference {
  /** The content entry ID */
  id: string;
  /** The content type name */
  contentTypeName: string;
  /** The content type display name */
  contentTypeDisplayName: string;
  /** The entry's slug */
  slug: string;
  /** The entry's status */
  status: "draft" | "published" | "archived" | "scheduled";
  /** The entry's data (field values) */
  data: Record<string, unknown>;
  /** Whether the entry exists and is not deleted */
  exists: boolean;
}

/**
 * Options for resolving references
 */
export interface ResolveOptions {
  /** Include soft-deleted entries (default: false) */
  includeDeleted?: boolean;
  /** Only return published entries (default: false) */
  publishedOnly?: boolean;
  /** Specific fields to include from the entry data (default: all) */
  fields?: string[];
}

/**
 * Result of a reference resolution operation
 */
export interface ResolveResult {
  /** Successfully resolved references */
  resolved: ResolvedReference[];
  /** IDs that could not be resolved (not found or deleted) */
  unresolved: string[];
}

// =============================================================================
// Core Resolution Functions
// =============================================================================

/**
 * Resolve a single reference to its full content entry.
 *
 * @param ctx - Convex query context
 * @param referenceId - The content entry ID to resolve
 * @param options - Resolution options
 * @returns The resolved reference or null if not found
 *
 * @example
 * ```typescript
 * // In a query handler:
 * const author = await resolveReference(ctx, entry.data.authorId);
 * if (author) {
 *   console.log("Author:", author.data.name);
 * }
 * ```
 */
export async function resolveReference(
  ctx: QueryCtx,
  referenceId: string,
  options: ResolveOptions = {}
): Promise<ResolvedReference | null> {
  const { includeDeleted = false, publishedOnly = false } = options;

  try {
    // Get the content entry
    const entry = await ctx.db.get(referenceId as Id<"content_entries">);

    if (!entry) {
      return null;
    }

    // Check soft-delete status
    if (!includeDeleted && entry.deletedAt !== undefined) {
      return null;
    }

    // Check published status
    if (publishedOnly && entry.status !== "published") {
      return null;
    }

    // Get the content type for this entry
    const contentType = await ctx.db.get(entry.contentTypeId);

    if (!contentType || contentType.deletedAt !== undefined) {
      return null;
    }

    // Filter fields if specified
    let data = entry.data as Record<string, unknown>;
    if (options.fields && options.fields.length > 0) {
      const filteredData: Record<string, unknown> = {};
      for (const field of options.fields) {
        if (field in data) {
          filteredData[field] = data[field];
        }
      }
      data = filteredData;
    }

    return {
      id: referenceId,
      contentTypeName: contentType.name,
      contentTypeDisplayName: contentType.displayName,
      slug: entry.slug,
      status: entry.status,
      data,
      exists: true,
    };
  } catch {
    // Invalid ID format or other error
    return null;
  }
}

/**
 * Resolve multiple references to their full content entries.
 *
 * @param ctx - Convex query context
 * @param referenceIds - Array of content entry IDs to resolve
 * @param options - Resolution options
 * @returns Result with resolved references and unresolved IDs
 *
 * @example
 * ```typescript
 * // In a query handler:
 * const result = await resolveReferences(ctx, entry.data.relatedPostIds, {
 *   publishedOnly: true,
 * });
 *
 * console.log("Found:", result.resolved.length);
 * console.log("Missing:", result.unresolved);
 * ```
 */
export async function resolveReferences(
  ctx: QueryCtx,
  referenceIds: string[],
  options: ResolveOptions = {}
): Promise<ResolveResult> {
  const resolved: ResolvedReference[] = [];
  const unresolved: string[] = [];

  // Resolve each reference in parallel for efficiency
  const promises = referenceIds.map(async (id) => {
    const result = await resolveReference(ctx, id, options);
    return { id, result };
  });

  const results = await Promise.all(promises);

  for (const { id, result } of results) {
    if (result) {
      resolved.push(result);
    } else {
      unresolved.push(id);
    }
  }

  return { resolved, unresolved };
}

/**
 * Check if a reference ID points to a valid, existing content entry.
 *
 * @param ctx - Convex query context
 * @param referenceId - The content entry ID to check
 * @param allowedContentTypes - Optional array of allowed content type names
 * @returns Object with validity status and optional error message
 *
 * @example
 * ```typescript
 * // Validate a reference before saving:
 * const check = await isValidReference(ctx, authorId, ["user"]);
 * if (!check.valid) {
 *   throw new Error(check.error);
 * }
 * ```
 */
export async function isValidReference(
  ctx: QueryCtx,
  referenceId: string,
  allowedContentTypes?: string[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get the content entry
    const entry = await ctx.db.get(referenceId as Id<"content_entries">);

    if (!entry) {
      return { valid: false, error: `Content entry not found: ${referenceId}` };
    }

    // Check soft-delete status
    if (entry.deletedAt !== undefined) {
      return { valid: false, error: `Content entry has been deleted: ${referenceId}` };
    }

    // If content type constraints specified, check them
    if (allowedContentTypes && allowedContentTypes.length > 0) {
      const contentType = await ctx.db.get(entry.contentTypeId);

      if (!contentType) {
        return { valid: false, error: `Content type not found for entry: ${referenceId}` };
      }

      if (!allowedContentTypes.includes(contentType.name)) {
        return {
          valid: false,
          error: `Expected content type: ${allowedContentTypes.join(" or ")}. Got: ${contentType.name}`,
        };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: `Invalid reference ID format: ${referenceId}` };
  }
}

/**
 * Validate all references in a content entry's data.
 *
 * Iterates through all reference fields and validates that each reference
 * points to a valid, existing content entry of the allowed type.
 *
 * @param ctx - Convex query context
 * @param data - The content entry data containing reference fields
 * @param fields - Array of field definitions (to identify reference fields)
 * @returns Object with overall validity and array of errors
 *
 * @example
 * ```typescript
 * // Validate all references before creating/updating an entry:
 * const validation = await validateAllReferences(ctx, data, contentType.fields);
 * if (!validation.valid) {
 *   throw new Error(validation.errors.join(", "));
 * }
 * ```
 */
export async function validateAllReferences(
  ctx: QueryCtx,
  data: Record<string, unknown>,
  fields: Array<{
    name: string;
    type: string;
    options?: {
      allowedContentTypes?: string[];
      multiple?: boolean;
    };
  }>
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Find all reference fields
  const referenceFields = fields.filter((f) => f.type === "reference");

  for (const field of referenceFields) {
    const value = data[field.name];

    if (value === null || value === undefined) {
      continue; // Skip empty values (required validation is separate)
    }

    const allowedTypes = field.options?.allowedContentTypes;
    const multiple = field.options?.multiple ?? false;

    if (multiple) {
      // Validate array of references
      if (!Array.isArray(value)) {
        errors.push(`${field.name}: Expected array of references`);
        continue;
      }

      for (const refId of value) {
        if (typeof refId !== "string") {
          errors.push(`${field.name}: Invalid reference ID type`);
          continue;
        }

        const check = await isValidReference(ctx, refId, allowedTypes);
        if (!check.valid) {
          errors.push(`${field.name}: ${check.error}`);
        }
      }
    } else {
      // Validate single reference
      if (typeof value !== "string") {
        errors.push(`${field.name}: Expected string reference ID`);
        continue;
      }

      const check = await isValidReference(ctx, value, allowedTypes);
      if (!check.valid) {
        errors.push(`${field.name}: ${check.error}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract all reference IDs from a content entry's data.
 *
 * @param data - The content entry data
 * @param fields - Array of field definitions
 * @returns Array of all reference IDs found in the data
 */
export function extractReferenceIds(
  data: Record<string, unknown>,
  fields: Array<{ name: string; type: string; options?: { multiple?: boolean } }>
): string[] {
  const ids: string[] = [];

  const referenceFields = fields.filter((f) => f.type === "reference");

  for (const field of referenceFields) {
    const value = data[field.name];

    if (value === null || value === undefined) {
      continue;
    }

    const multiple = field.options?.multiple ?? false;

    if (multiple && Array.isArray(value)) {
      for (const id of value) {
        if (typeof id === "string") {
          ids.push(id);
        }
      }
    } else if (typeof value === "string") {
      ids.push(value);
    }
  }

  return ids;
}

/**
 * Get the content type name for a content entry ID.
 *
 * This is a helper function for the `validateReferenceContentType` function
 * in the validation module.
 *
 * @param ctx - Convex query context
 * @param entryId - The content entry ID
 * @returns The content type name or null if not found
 */
export async function getContentTypeName(
  ctx: QueryCtx,
  entryId: string
): Promise<string | null> {
  try {
    const entry = await ctx.db.get(entryId as Id<"content_entries">);

    if (!entry || entry.deletedAt !== undefined) {
      return null;
    }

    const contentType = await ctx.db.get(entry.contentTypeId);

    if (!contentType || contentType.deletedAt !== undefined) {
      return null;
    }

    return contentType.name;
  } catch {
    return null;
  }
}
