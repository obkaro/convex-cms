/**
 * Library utilities for the CMS component
 */

export {
  generateSlug,
  isValidSlug,
  generateUniqueSlug,
  type SlugOptions,
} from "./slugGenerator.js";

export {
  checkSlugUniqueness,
  ensureUniqueSlug,
  findNextAvailableSlug,
  validateSlugFormat,
  type SlugUniquenessOptions,
  type SlugCheckResult,
  type SlugEntry,
  type SlugQueryFn,
  type SlugPrefixQueryFn,
} from "./slugUniqueness.js";
