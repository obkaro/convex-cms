/**
 * Slug Uniqueness Utilities
 *
 * Provides functions for checking slug uniqueness within content type scope
 * and generating unique slugs with incremental suffixes when conflicts exist.
 */

import { generateSlug, generateUniqueSlug, isValidSlug } from "./slugGenerator.js";

/**
 * Options for slug uniqueness checking
 */
export interface SlugUniquenessOptions {
  /** Maximum number of suffix attempts before falling back to timestamp (default: 100) */
  maxAttempts?: number;
  /** Separator character used in slugs (default: '-') */
  separator?: string;
  /** ID of the current entry to exclude from uniqueness check (for updates) */
  excludeEntryId?: string;
}

/**
 * Result of a slug uniqueness check
 */
export interface SlugCheckResult {
  /** Whether the slug is unique */
  isUnique: boolean;
  /** The existing entry ID that has this slug (if not unique) */
  existingEntryId?: string;
  /** Suggested alternative slug if not unique */
  suggestedSlug?: string;
}

/**
 * Entry data structure for uniqueness checking
 */
export interface SlugEntry {
  /** The entry's unique identifier */
  _id: string;
  /** The entry's slug */
  slug: string;
  /** Soft delete timestamp (null/undefined if not deleted) */
  deletedAt?: number | null;
}

/**
 * Function type for querying existing entries by slug within a content type
 */
export type SlugQueryFn = (slug: string) => Promise<SlugEntry | null>;

/**
 * Function type for querying all entries with a slug prefix within a content type
 * Used for finding the next available suffix number
 */
export type SlugPrefixQueryFn = (slugPrefix: string) => Promise<SlugEntry[]>;

/**
 * Checks if a slug is unique within a content type scope.
 *
 * @param slug - The slug to check
 * @param queryFn - Function that queries the database for entries with the given slug
 * @param options - Configuration options
 * @returns Result indicating uniqueness and suggestions
 *
 * @example
 * ```typescript
 * // In a Convex mutation
 * const queryFn = async (slug: string) => {
 *   return await ctx.db
 *     .query("content_entries")
 *     .withIndex("by_content_type_and_slug", (q) =>
 *       q.eq("contentTypeId", contentTypeId).eq("slug", slug)
 *     )
 *     .filter((q) => q.eq(q.field("deletedAt"), undefined))
 *     .first();
 * };
 *
 * const result = await checkSlugUniqueness("my-post", queryFn);
 * if (!result.isUnique) {
 *   console.log(`Slug conflict with entry ${result.existingEntryId}`);
 *   console.log(`Suggested alternative: ${result.suggestedSlug}`);
 * }
 * ```
 */
export async function checkSlugUniqueness(
  slug: string,
  queryFn: SlugQueryFn,
  options: SlugUniquenessOptions = {}
): Promise<SlugCheckResult> {
  const { excludeEntryId } = options;

  // Validate the slug format
  if (!isValidSlug(slug, options.separator)) {
    return {
      isUnique: false,
      suggestedSlug: generateSlug(slug, { separator: options.separator }),
    };
  }

  // Query for existing entry with this slug
  const existingEntry = await queryFn(slug);

  // Check if the slug is available
  if (!existingEntry) {
    return { isUnique: true };
  }

  // If we're updating an entry, exclude it from the check
  if (excludeEntryId && existingEntry._id === excludeEntryId) {
    return { isUnique: true };
  }

  // Slug is taken - generate a suggestion
  const isUniqueFn = async (candidateSlug: string): Promise<boolean> => {
    const entry = await queryFn(candidateSlug);
    if (!entry) return true;
    if (excludeEntryId && entry._id === excludeEntryId) return true;
    return false;
  };

  const suggestedSlug = await generateUniqueSlug(
    slug,
    isUniqueFn,
    options.maxAttempts
  );

  return {
    isUnique: false,
    existingEntryId: existingEntry._id,
    suggestedSlug,
  };
}

/**
 * Ensures a slug is unique by generating incremental suffixes if needed.
 * This is the main function to use when creating or updating content entries.
 *
 * @param baseSlug - The desired slug (or title to generate slug from)
 * @param queryFn - Function that queries the database for entries with a given slug
 * @param options - Configuration options
 * @returns A unique slug (either the original or with a numeric suffix)
 *
 * @example
 * ```typescript
 * // In a Convex mutation for creating a new entry
 * const queryFn = async (slug: string) => {
 *   return await ctx.db
 *     .query("content_entries")
 *     .withIndex("by_content_type_and_slug", (q) =>
 *       q.eq("contentTypeId", contentTypeId).eq("slug", slug)
 *     )
 *     .filter((q) => q.eq(q.field("deletedAt"), undefined))
 *     .first();
 * };
 *
 * const uniqueSlug = await ensureUniqueSlug("my-post", queryFn);
 * // Returns "my-post" if unique, or "my-post-1", "my-post-2", etc.
 * ```
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  queryFn: SlugQueryFn,
  options: SlugUniquenessOptions = {}
): Promise<string> {
  const { excludeEntryId, maxAttempts = 100 } = options;

  // Validate and normalize the base slug
  let slug = baseSlug;
  if (!isValidSlug(slug, options.separator)) {
    slug = generateSlug(slug, { separator: options.separator });
  }

  // If slug is empty after normalization, use a fallback
  if (!slug) {
    slug = "untitled";
  }

  // Check if the base slug is available
  const isUniqueFn = async (candidateSlug: string): Promise<boolean> => {
    const entry = await queryFn(candidateSlug);
    if (!entry) return true;
    if (excludeEntryId && entry._id === excludeEntryId) return true;
    return false;
  };

  return generateUniqueSlug(slug, isUniqueFn, maxAttempts);
}

/**
 * Finds the next available slug suffix by analyzing existing slugs.
 * This is useful when you want to pre-compute the next suffix without
 * iterating through each number.
 *
 * @param baseSlug - The base slug to find the next suffix for
 * @param prefixQueryFn - Function that returns all entries with slugs starting with the base
 * @param options - Configuration options
 * @returns The next available slug with the appropriate suffix
 *
 * @example
 * ```typescript
 * // If entries exist with slugs: "post", "post-1", "post-2", "post-5"
 * const nextSlug = await findNextAvailableSlug("post", queryPrefixFn);
 * // Returns "post-3" (fills the gap)
 * ```
 */
export async function findNextAvailableSlug(
  baseSlug: string,
  prefixQueryFn: SlugPrefixQueryFn,
  options: SlugUniquenessOptions = {}
): Promise<string> {
  const { excludeEntryId, separator = "-" } = options;

  // Validate the base slug
  let slug = baseSlug;
  if (!isValidSlug(slug, separator)) {
    slug = generateSlug(slug, { separator });
  }

  if (!slug) {
    slug = "untitled";
  }

  // Get all entries with this prefix
  const existingEntries = await prefixQueryFn(slug);

  // Filter out the excluded entry and soft-deleted entries
  const activeEntries = existingEntries.filter((entry) => {
    if (excludeEntryId && entry._id === excludeEntryId) return false;
    if (entry.deletedAt) return false;
    return true;
  });

  // If no entries exist with this slug, the base is available
  const hasSlugsToCheck = activeEntries.some((entry) => {
    return entry.slug === slug || entry.slug.startsWith(`${slug}${separator}`);
  });

  if (!hasSlugsToCheck) {
    return slug;
  }

  // Check if base slug itself is taken
  const baseIsTaken = activeEntries.some((entry) => entry.slug === slug);
  if (!baseIsTaken) {
    return slug;
  }

  // Extract existing suffix numbers
  const suffixPattern = new RegExp(`^${escapeRegex(slug)}${escapeRegex(separator)}(\\d+)$`);
  const usedNumbers = new Set<number>();

  for (const entry of activeEntries) {
    const match = entry.slug.match(suffixPattern);
    if (match) {
      usedNumbers.add(parseInt(match[1], 10));
    }
  }

  // Find the smallest available number
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return `${slug}${separator}${nextNumber}`;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates a slug and returns validation errors if any.
 *
 * @param slug - The slug to validate
 * @param separator - The separator character (default: '-')
 * @returns Array of validation error messages (empty if valid)
 */
export function validateSlugFormat(
  slug: string,
  separator: string = "-"
): string[] {
  const errors: string[] = [];

  if (!slug || typeof slug !== "string") {
    errors.push("Slug is required");
    return errors;
  }

  if (slug.length === 0) {
    errors.push("Slug cannot be empty");
    return errors;
  }

  if (slug.length > 100) {
    errors.push("Slug must be 100 characters or less");
  }

  if (slug !== slug.toLowerCase()) {
    errors.push("Slug must be lowercase");
  }

  if (slug.startsWith(separator)) {
    errors.push(`Slug cannot start with '${separator}'`);
  }

  if (slug.endsWith(separator)) {
    errors.push(`Slug cannot end with '${separator}'`);
  }

  const doubleSeparatorRegex = new RegExp(`${escapeRegex(separator)}{2,}`);
  if (doubleSeparatorRegex.test(slug)) {
    errors.push(`Slug cannot contain consecutive '${separator}' characters`);
  }

  const invalidCharsRegex = new RegExp(`[^a-z0-9${escapeRegex(separator)}]`);
  if (invalidCharsRegex.test(slug)) {
    errors.push("Slug can only contain lowercase letters, numbers, and hyphens");
  }

  return errors;
}
