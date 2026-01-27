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
