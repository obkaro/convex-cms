/**
 * Slug Generator Utility
 *
 * Generates URL-friendly slugs from content titles.
 * Handles special characters, unicode, and ensures slug format consistency.
 */

/**
 * Options for slug generation
 */
export interface SlugOptions {
  /** Maximum length of the generated slug (default: 100) */
  maxLength?: number;
  /** Separator character to use (default: '-') */
  separator?: string;
  /** Whether to lowercase the slug (default: true) */
  lowercase?: boolean;
  /** Custom replacements for specific characters */
  customReplacements?: Record<string, string>;
}

/**
 * Default character replacements for common special characters and unicode
 */
const DEFAULT_REPLACEMENTS: Record<string, string> = {
  // German
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
  Ä: "ae",
  Ö: "oe",
  Ü: "ue",
  // French
  à: "a",
  â: "a",
  ç: "c",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  î: "i",
  ï: "i",
  ô: "o",
  ù: "u",
  û: "u",
  ÿ: "y",
  œ: "oe",
  æ: "ae",
  // Spanish
  ñ: "n",
  Ñ: "n",
  // Polish
  ą: "a",
  Ą: "a",
  ć: "c",
  Ć: "c",
  ę: "e",
  Ę: "e",
  ł: "l",
  Ł: "l",
  ń: "n",
  Ń: "n",
  ó: "o",
  Ó: "o",
  ś: "s",
  Ś: "s",
  ź: "z",
  Ź: "z",
  ż: "z",
  Ż: "z",
  // Nordic
  å: "a",
  Å: "a",
  ø: "o",
  Ø: "o",
  // Other common
  ð: "d",
  þ: "th",
  // Symbols
  "&": "and",
  "@": "at",
  "#": "hash",
  "%": "percent",
  "+": "plus",
  "=": "equals",
  // Punctuation to remove (replaced with empty string to prevent separator)
  "'": "",
  "\u2018": "", // left single quote '
  "\u2019": "", // right single quote '
  "\u201C": "", // left double quote "
  "\u201D": "", // right double quote "
};

/**
 * Generates a URL-friendly slug from a given title string.
 *
 * @param title - The input string to convert to a slug
 * @param options - Optional configuration for slug generation
 * @returns A URL-friendly slug string
 *
 * @example
 * ```typescript
 * generateSlug("Hello World!") // "hello-world"
 * generateSlug("Café & Restaurant") // "cafe-and-restaurant"
 * generateSlug("日本語タイトル") // "ri-ben-yu-taitoru"
 * generateSlug("  Multiple   Spaces  ") // "multiple-spaces"
 * ```
 */
export function generateSlug(title: string, options: SlugOptions = {}): string {
  const {
    maxLength = 100,
    separator = "-",
    lowercase = true,
    customReplacements = {},
  } = options;

  if (!title || typeof title !== "string") {
    return "";
  }

  // Merge custom replacements with defaults (custom takes precedence)
  const replacements = { ...DEFAULT_REPLACEMENTS, ...customReplacements };

  let slug = title.trim();

  // Apply character replacements
  for (const [char, replacement] of Object.entries(replacements)) {
    slug = slug.split(char).join(replacement);
  }

  // Normalize unicode to decomposed form, then remove combining diacritical marks
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Convert to lowercase if requested
  if (lowercase) {
    slug = slug.toLowerCase();
  }

  // Replace any non-alphanumeric characters (except separator) with separator
  // This regex keeps letters (including unicode letters after normalization), numbers
  const separatorRegex = new RegExp(`[^a-z0-9${escapeRegex(separator)}]`, "gi");
  slug = slug.replace(separatorRegex, separator);

  // Collapse multiple consecutive separators into one
  const multipleSeparatorRegex = new RegExp(`${escapeRegex(separator)}+`, "g");
  slug = slug.replace(multipleSeparatorRegex, separator);

  // Remove leading and trailing separators
  const trimSeparatorRegex = new RegExp(
    `^${escapeRegex(separator)}|${escapeRegex(separator)}$`,
    "g"
  );
  slug = slug.replace(trimSeparatorRegex, "");

  // Truncate to max length, but don't cut words in the middle
  if (slug.length > maxLength) {
    slug = truncateSlug(slug, maxLength, separator);
  }

  return slug;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Truncates a slug to a maximum length without cutting words
 */
function truncateSlug(
  slug: string,
  maxLength: number,
  separator: string
): string {
  if (slug.length <= maxLength) {
    return slug;
  }

  // Find the last separator before the max length
  const truncated = slug.substring(0, maxLength);
  const lastSeparatorIndex = truncated.lastIndexOf(separator);

  if (lastSeparatorIndex > 0) {
    return truncated.substring(0, lastSeparatorIndex);
  }

  // If no separator found, just truncate at maxLength
  return truncated;
}

/**
 * Validates if a string is a valid slug format
 *
 * @param slug - The string to validate
 * @param separator - The separator character (default: '-')
 * @returns True if the string is a valid slug
 *
 * @example
 * ```typescript
 * isValidSlug("hello-world") // true
 * isValidSlug("Hello World") // false
 * isValidSlug("hello--world") // false
 * isValidSlug("-hello-world") // false
 * ```
 */
export function isValidSlug(slug: string, separator: string = "-"): boolean {
  if (!slug || typeof slug !== "string") {
    return false;
  }

  // Must be lowercase alphanumeric with single separators
  const validSlugRegex = new RegExp(
    `^[a-z0-9]+(?:${escapeRegex(separator)}[a-z0-9]+)*$`
  );

  return validSlugRegex.test(slug);
}

/**
 * Generates a unique slug by appending a numeric suffix if needed.
 * This is a helper that can be used with a uniqueness check function.
 *
 * @param baseSlug - The base slug to make unique
 * @param isUnique - Async function that checks if a slug is unique
 * @param maxAttempts - Maximum number of suffix attempts (default: 100)
 * @returns A unique slug
 *
 * @example
 * ```typescript
 * const checkUnique = async (slug: string) => {
 *   return !(await db.query("entries").withSlug(slug).first());
 * };
 * const uniqueSlug = await generateUniqueSlug("hello-world", checkUnique);
 * // Returns "hello-world" if unique, or "hello-world-1", "hello-world-2", etc.
 * ```
 */
export async function generateUniqueSlug(
  baseSlug: string,
  isUnique: (slug: string) => Promise<boolean>,
  maxAttempts: number = 100
): Promise<string> {
  // Check if base slug is already unique
  if (await isUnique(baseSlug)) {
    return baseSlug;
  }

  // Try appending numeric suffixes
  for (let i = 1; i <= maxAttempts; i++) {
    const candidateSlug = `${baseSlug}-${i}`;
    if (await isUnique(candidateSlug)) {
      return candidateSlug;
    }
  }

  // Fallback: append timestamp if all numeric suffixes are taken
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}
