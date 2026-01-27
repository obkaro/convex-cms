/**
 * Converts a display name to a URL-safe slug.
 *
 * @example
 * ```typescript
 * toSlug("Blog Post")      // "blog_post"
 * toSlug("FAQ Page")       // "faq_page"
 * toSlug("Product Review") // "product_review"
 * toSlug("About Us")       // "about_us"
 * ```
 */
export function toSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

// =============================================================================
// Type-Level Slug Conversion
// =============================================================================
// These types compute the slug at the type level, preserving literal types.
// This enables TypeScript to track the exact slug value through the type system.

/**
 * Replaces spaces with underscores in a string type.
 * "Blog Post" → "Blog_Post"
 */
type ReplaceSpaces<S extends string> = S extends `${infer Head} ${infer Tail}`
  ? ReplaceSpaces<`${Head}_${Tail}`>
  : S;

/**
 * Collapses multiple underscores into single underscores.
 * "Blog__Post" → "Blog_Post"
 */
type CollapseUnderscores<S extends string> = S extends `${infer Head}__${infer Tail}`
  ? CollapseUnderscores<`${Head}_${Tail}`>
  : S;

/**
 * Removes leading underscores.
 * "_Blog_Post" → "Blog_Post"
 */
type TrimLeadingUnderscore<S extends string> = S extends `_${infer Rest}`
  ? TrimLeadingUnderscore<Rest>
  : S;

/**
 * Removes trailing underscores.
 * "Blog_Post_" → "Blog_Post"
 */
type TrimTrailingUnderscore<S extends string> = S extends `${infer Rest}_`
  ? TrimTrailingUnderscore<Rest>
  : S;

/**
 * Type-level slug conversion.
 * Converts a display name to its slug form at the type level.
 *
 * Handles common patterns:
 * - "Blog Post" → "blog_post" (space-separated words)
 * - "blog_post" → "blog_post" (already a slug)
 * - "BlogPost" → "blogpost" (camelCase, simplified)
 *
 * @example
 * ```typescript
 * type Slug1 = ToSlugType<"Blog Post">;      // "blog_post"
 * type Slug2 = ToSlugType<"Roadmap Item">;   // "roadmap_item"
 * type Slug3 = ToSlugType<"faq_page">;       // "faq_page"
 * ```
 */
export type ToSlugType<T extends string> = Lowercase<
  TrimTrailingUnderscore<
    TrimLeadingUnderscore<
      CollapseUnderscores<
        ReplaceSpaces<T>
      >
    >
  >
>;

/**
 * Validates that a slug follows the content type naming rules.
 *
 * Rules:
 * - Lowercase letters, numbers, and underscores only
 * - Must start with a letter
 * - 1-50 characters
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z][a-z0-9_]{0,49}$/.test(slug);
}
