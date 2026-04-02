/**
 * Code-Only Schema System
 *
 * This module provides type-safe content type definitions using Convex validators.
 * Types are automatically inferred via Convex's native `Infer<typeof validator>` pattern.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { v, Infer } from "convex/values";
 * import { defineContentType, InferContentType } from "convex-cms";
 *
 * // Define a content type with a Convex validator
 * export const blogPost = defineContentType({
 *   name: "blog_post",
 *   validator: v.object({
 *     title: v.string(),
 *     content: v.string(),
 *     publishedAt: v.optional(v.number()),
 *   }),
 *   meta: {
 *     displayName: "Blog Post",
 *     titleField: "title",
 *   },
 * });
 *
 * // Type is automatically inferred
 * type BlogPostData = InferContentType<typeof blogPost>;
 * // { title: string; content: string; publishedAt?: number }
 * ```
 *
 * ## Creating a Schema
 *
 * ```typescript
 * import { createContentSchema, InferSchema } from "convex-cms";
 *
 * // Combine multiple content types into a schema
 * export const contentSchema = createContentSchema({
 *   blogPost,
 *   author,
 *   product,
 * });
 *
 * // Infer all types at once
 * export type ContentTypes = InferSchema<typeof contentSchema.definitions>;
 * // {
 * //   blog_post: { title: string; content: string; ... };
 * //   author: { name: string; bio?: string; ... };
 * //   product: { name: string; price: number; ... };
 * // }
 * ```
 *
 * ## Using with CMS Client
 *
 * ```typescript
 * import { createCmsClient } from "convex-cms";
 * import { components } from "./_generated/api";
 * import { contentSchema } from "./schema";
 *
 * // Create a schema-aware CMS client
 * export const cms = createCmsClient(components.convexCms, {
 *   schema: contentSchema,
 *   // ... other options
 * });
 *
 * // Now get() returns typed data
 * const post = await cms.contentEntries.get<"blog_post">(ctx, id);
 * post.data.title    // ✅ string - fully typed
 * post.data.typo     // ❌ Error: Property 'typo' does not exist
 * ```
 *
 * @module
 */

// =============================================================================
// Core Functions
// =============================================================================

export {
	defineContentType,
	createContentSchema,
	toFieldDefinitions,
} from "./defineContentType.js";

// =============================================================================
// Types
// =============================================================================

// Core definition types
export type {
	CmsObjectValidator,
	ContentTypeConfig,
	ContentTypeDefinition,
	ContentTypeMeta,
	FieldMeta,
	FieldRenderAs,
} from "./types.js";

// Type inference utilities
export type {
	InferContentType,
	InferSchema,
	ContentSchema,
	SchemaContentTypeNames,
	SchemaContentType,
	ContentTypeFieldNames,
} from "./types.js";

// Schema instance type
export type {
	ContentSchemaInstance,
	DatabaseFieldDefinition,
} from "./defineContentType.js";

// Runtime utilities
export { isContentTypeDefinition } from "./types.js";

// =============================================================================
// Typed Client Factory
// =============================================================================

export {
	createTypedCmsClient,
	TypedContentEntriesApiImpl,
} from "./typedClient.js";

// =============================================================================
// Schema Drift Detection
// =============================================================================

export {
	detectSchemaDrift,
	formatDriftReport,
	hasErrors,
	filterReportByContentTypes,
} from "./schemaDrift.js";

export type {
	DriftSeverity,
	DriftType,
	DriftIssue,
	DriftSummary,
	SchemaDriftReport,
	DetectDriftOptions,
} from "./schemaDrift.js";

// =============================================================================
// Type Code Generation
// =============================================================================

export {
	generateTypesFromDatabase,
	generateTypesFromDefinitions,
	validateGeneratedCode,
} from "./codegen.js";

export type { CodegenOptions, CodegenResult } from "./codegen.js";

// =============================================================================
// Typed Client Types
// =============================================================================

// Typed content entry types
export type {
	TypedContentEntry,
	TypedPaginationResult,
	TypedContentEntriesApi,
	TypedCreateEntryOptions,
	TypedUpdateEntryOptions,
	TypedListEntriesOptions,
	SchemaDataType,
	ValidContentTypeName,
	HasContentType,
	GetContentTypeDefinition,
	TypedCmsClientConfig,
	TypedCmsClient,
} from "./typedClient.js";
