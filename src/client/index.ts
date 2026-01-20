/**
 * @convex-cms/core
 *
 * A developer-first Convex Component for content management with
 * flexible RBAC and AI-ready architecture.
 *
 * @example
 * ```typescript
 * // Install the component in convex/convex.config.ts
 * import { defineApp } from "convex/server";
 * import convexCms from "@convex-cms/core/convex.config";
 *
 * const app = defineApp();
 * app.use(convexCms);
 * export default app;
 * ```
 *
 * @example
 * ```typescript
 * // Create a configured CMS client with typed methods
 * import { createCmsClient } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * export const cms = createCmsClient(components.convexCms, {
 *   defaultLocale: "en-US",
 *   features: {
 *     versioning: true,
 *     localization: true,
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Use typed methods in your functions
 * import { mutation } from "./_generated/server";
 * import { cms } from "./cms";
 *
 * export const createBlogPost = mutation({
 *   args: { title: v.string(), content: v.string() },
 *   handler: async (ctx, args) => {
 *     // Type-safe API with full autocompletion
 *     return await cms.contentEntries.create(ctx, {
 *       contentTypeId: "blog_type_id",
 *       data: { title: args.title, content: args.content },
 *     });
 *   },
 * });
 * ```
 */

// Export types for external use
export * from "./types.js";

// =============================================================================
// CMS Client Factory (Enhanced with Typed Methods)
// =============================================================================

import {
  type ComponentConfig,
  type FeatureFlags,
  type LocaleCode,
  resolveConfig,
} from "./types.js";

import {
  type TypedComponentApi,
  type EnhancedCmsClient,
  type ConvexContext,
  ContentTypesApi,
  ContentEntriesApi,
  VersionsApi,
  MediaAssetsApi,
  MediaFoldersApi,
} from "./wrapper.js";

// Re-export wrapper types and classes
export * from "./wrapper.js";

/**
 * Creates an enhanced CMS client with typed method wrappers.
 *
 * This is the main entry point for using the Convex CMS component.
 * The returned client provides typed methods for all CMS operations,
 * making it easy to interact with the CMS from your Convex functions.
 *
 * @param componentApi - The component API from `components.convexCms`
 * @param config - Optional configuration options
 * @returns An enhanced CMS client instance with typed methods
 *
 * @example
 * ```typescript
 * import { createCmsClient } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * // Create with default configuration
 * export const cms = createCmsClient(components.convexCms);
 *
 * // Create with custom configuration
 * export const cms = createCmsClient(components.convexCms, {
 *   defaultLocale: "en-US",
 *   supportedLocales: ["en-US", "es-ES", "fr-FR"],
 *   features: {
 *     versioning: true,
 *     localization: true,
 *     scheduling: true,
 *   },
 *   maxVersionsPerEntry: 100,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Use typed methods in mutations
 * export const createPost = mutation({
 *   args: { title: v.string() },
 *   handler: async (ctx, args) => {
 *     // Create a content type
 *     const blogType = await cms.contentTypes.create(ctx, {
 *       name: "blog_post",
 *       displayName: "Blog Post",
 *       fields: [
 *         { name: "title", label: "Title", type: "text", required: true },
 *       ],
 *     });
 *
 *     // Create an entry
 *     const entry = await cms.contentEntries.create(ctx, {
 *       contentTypeId: blogType._id,
 *       data: { title: args.title },
 *     });
 *
 *     // Publish the entry
 *     return await cms.contentEntries.publish(ctx, { id: entry._id });
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Check feature flags
 * if (cms.isFeatureEnabled("localization")) {
 *   // Handle localized content
 * }
 *
 * if (cms.isLocaleSupported("es-ES")) {
 *   // Locale is valid
 * }
 * ```
 */
export function createCmsClient(
  componentApi: TypedComponentApi,
  config?: ComponentConfig
): EnhancedCmsClient {
  const resolvedConfig = resolveConfig(config);

  return {
    config: resolvedConfig,
    api: componentApi,
    contentTypes: new ContentTypesApi(componentApi, resolvedConfig),
    contentEntries: new ContentEntriesApi(componentApi, resolvedConfig),
    versions: new VersionsApi(componentApi, resolvedConfig),
    mediaAssets: new MediaAssetsApi(componentApi, resolvedConfig),
    mediaFolders: new MediaFoldersApi(componentApi, resolvedConfig),

    isFeatureEnabled(feature: keyof FeatureFlags): boolean {
      return resolvedConfig.features[feature] ?? false;
    },

    isLocaleSupported(locale: LocaleCode): boolean {
      return resolvedConfig.supportedLocales.includes(locale);
    },
  };
}

// Backwards compatibility alias
export { createCmsClient as createEnhancedCmsClient };

// =============================================================================
// Field Validators and Validation Functions
// =============================================================================

// Re-export Convex validators from schema
export {
  fieldTypeValidator,
  fieldDefinitionValidator,
  contentStatusValidator,
  mediaTypeValidator,
} from "../component/schema.js";

// Re-export field type constants
export {
  fieldTypes,
  contentStatuses,
  mediaTypes,
} from "../component/validators.js";

// Re-export runtime validation functions
export {
  validateTextField,
  validateRichTextField,
  validateNumberField,
  validateBooleanField,
  validateDateField,
  validateReferenceField,
  validateMediaField,
  validateSelectField,
  validateMultiSelectField,
  validateJsonField,
  validateFieldValue,
  validateContentData,
  applyFieldDefaults,
  getFieldType,
  isFieldRequired,
} from "../component/validation.js";

// Re-export validation types
export type {
  FieldOptions,
  FieldDefinition as RuntimeFieldDefinition,
  ContentTypeSchema as RuntimeContentTypeSchema,
  ContentData as RuntimeContentData,
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
} from "../component/validation.js";

// Re-export slug utilities
export {
  generateSlug,
  isValidSlug,
  generateUniqueSlug,
} from "../component/lib/slugGenerator.js";

export type { SlugOptions } from "../component/lib/slugGenerator.js";
