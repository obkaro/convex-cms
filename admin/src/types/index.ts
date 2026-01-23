/**
 * Admin UI Type Definitions
 *
 * Uses Doc<> types from the generated dataModel for document types.
 * Only defines extended types that add admin-specific properties.
 */

import type { Doc, Id } from "../../convex/_generated/dataModel";

// =============================================================================
// Document Types (aliases for clarity)
// =============================================================================

export type ContentType = Doc<"contentTypes">;
export type ContentEntry = Doc<"contentEntries">;
export type ContentVersion = Doc<"contentVersions">;
export type MediaItem = Doc<"mediaItems">;
export type MediaVariant = Doc<"mediaVariants">;
export type Taxonomy = Doc<"taxonomies">;
export type TaxonomyTerm = Doc<"taxonomyTerms">;

// =============================================================================
// Extended Types (admin-specific additions)
// =============================================================================

/**
 * Content type with entry count added by list query.
 */
export type ContentTypeWithCount = ContentType & {
  entryCount?: number;
};

/**
 * Taxonomy term with nested children for tree display.
 */
export type TaxonomyTermWithChildren = TaxonomyTerm & {
  children?: TaxonomyTermWithChildren[];
};

// =============================================================================
// Extracted Field Types (inferred from document types)
// =============================================================================

export type ContentStatus = ContentEntry["status"];

// =============================================================================
// ID Types (aliases for clarity)
// =============================================================================

export type ContentTypeId = Id<"contentTypes">;
export type ContentEntryId = Id<"contentEntries">;
export type ContentVersionId = Id<"contentVersions">;
export type MediaItemId = Id<"mediaItems">;
export type MediaVariantId = Id<"mediaVariants">;
export type TaxonomyId = Id<"taxonomies">;
export type TaxonomyTermId = Id<"taxonomyTerms">;

// =============================================================================
// Type Assertion Helpers
// =============================================================================

/**
 * Type assertion for string to TaxonomyId at API boundaries.
 */
export function asTaxonomyId(id: string): TaxonomyId {
  return id as unknown as TaxonomyId;
}

/**
 * Type assertion for string to TaxonomyTermId at API boundaries.
 */
export function asTaxonomyTermId(id: string): TaxonomyTermId {
  return id as unknown as TaxonomyTermId;
}

/**
 * Type assertion for string array to TaxonomyTermId array.
 */
export function asTaxonomyTermIds(ids: string[]): TaxonomyTermId[] {
  return ids as unknown as TaxonomyTermId[];
}
