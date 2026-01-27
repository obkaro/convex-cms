/**
 * In-Memory Type Registry for Code-Defined Content Types
 *
 * This registry stores content type definitions in memory, enabling the
 * "no-sync" architecture where code-defined types don't need database records.
 *
 * Key concepts:
 * - Code-defined types live here (registered via `defineContentType`)
 * - DB-defined types live in the `contentTypes` table
 * - Lookup by slug checks code first, then DB
 *
 * @example
 * ```typescript
 * import { registerContentType, getCodeDefinedType } from "./registry";
 *
 * // Register a content type (done automatically by defineContentType)
 * registerContentType(blogPostDefinition);
 *
 * // Look up a type by slug
 * const def = getCodeDefinedType("blog_post");
 * if (def) {
 *   console.log(def.meta.displayName); // "Blog Post"
 *   console.log(def.slug);             // "blog_post"
 * }
 * ```
 */

import type { ContentTypeDefinition } from "./schema/types.js";

const codeDefinedTypes = new Map<string, ContentTypeDefinition>();

/**
 * Register a content type definition in the in-memory registry.
 *
 * This is called automatically by `defineContentType` when `register: true`
 * is passed (the default). You typically don't need to call this directly.
 *
 * @param definition - The content type definition to register
 * @throws Error if a type with the same slug is already registered
 */
export function registerContentType(definition: ContentTypeDefinition): void {
  if (codeDefinedTypes.has(definition.slug)) {
    throw new Error(
      `Content type "${definition.slug}" is already registered. ` +
        `Content type slugs must be unique across all code-defined types.`
    );
  }
  codeDefinedTypes.set(definition.slug, definition);
}

/**
 * Get a code-defined content type by slug.
 *
 * @param slug - The content type slug (e.g., "blog_post")
 * @returns The definition, or null if not found in the code registry
 */
export function getCodeDefinedType(slug: string): ContentTypeDefinition | null {
  return codeDefinedTypes.get(slug) ?? null;
}

/**
 * Get all code-defined content types.
 *
 * @returns Array of all registered content type definitions
 */
export function getAllCodeDefinedTypes(): ContentTypeDefinition[] {
  return Array.from(codeDefinedTypes.values());
}

/**
 * Get all code-defined content type slugs.
 *
 * @returns Array of registered content type slugs
 */
export function getCodeDefinedTypeNames(): string[] {
  return Array.from(codeDefinedTypes.keys());
}

/**
 * Check if a content type slug is registered in code.
 *
 * @param slug - The content type slug to check
 * @returns true if the type is code-defined
 */
export function isCodeDefinedType(slug: string): boolean {
  return codeDefinedTypes.has(slug);
}

/**
 * Clear all registered content types.
 *
 * **Warning**: This is primarily for testing. In production, content types
 * are registered at module load time and should remain stable.
 */
export function clearRegistry(): void {
  codeDefinedTypes.clear();
}

/**
 * Get the count of registered content types.
 *
 * @returns Number of code-defined content types
 */
export function getRegistrySize(): number {
  return codeDefinedTypes.size;
}
