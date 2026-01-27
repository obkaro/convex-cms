/**
 * Schema-Aware Typed CMS Client
 *
 * This module provides type-safe access to content entries when a schema
 * is configured. The types are inferred from the Convex validators defined
 * in the schema.
 *
 * @example
 * ```typescript
 * import { v } from "convex/values";
 * import { defineContentType, createContentSchema, createTypedCmsClient } from "convex-cms";
 * import { components } from "./_generated/api";
 *
 * // Define content types with validators
 * const blogPost = defineContentType({
 *   name: "blog_post",
 *   validator: v.object({ title: v.string(), content: v.string() }),
 *   meta: { displayName: "Blog Post" },
 * });
 *
 * const contentSchema = createContentSchema({ blogPost });
 *
 * // Create a typed CMS client
 * export const cms = createTypedCmsClient(components.convexCms, {
 *   schema: contentSchema,
 * });
 *
 * // Now methods return typed data
 * const post = await cms.contentEntries.get<"blog_post">(ctx, id);
 * post.data.title    // ✅ string - TypeScript knows the type
 * post.data.typo     // ❌ Error: Property 'typo' does not exist
 * ```
 */

import type {
	ContentTypeDefinition,
	InferSchema,
	SchemaContentTypeNames,
} from "./types.js";
import type { ContentEntry, ContentStatus, PaginationOpts } from "../types.js";
import type { ContentSchemaInstance } from "./defineContentType.js";
import type { ConvexContext } from "../wrapper.js";

// =============================================================================
// Typed Content Entry Types
// =============================================================================

/**
 * A content entry with typed data based on the schema.
 *
 * @typeParam TData - The inferred data type from the content type's validator
 */
export interface TypedContentEntry<TData extends Record<string, unknown>>
	extends Omit<ContentEntry, "data"> {
	/**
	 * The content data with full type inference.
	 */
	data: TData;
}

/**
 * A paginated result with typed content entries.
 */
export interface TypedPaginationResult<TData extends Record<string, unknown>> {
	page: TypedContentEntry<TData>[];
	continueCursor: string | null;
	isDone: boolean;
}

// =============================================================================
// Schema Type Utilities
// =============================================================================

/**
 * Extract the data type for a content type name from a schema.
 */
export type SchemaDataType<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>,
	TName extends string
> = TSchema extends ContentSchemaInstance<infer TDefs>
	? TName extends keyof InferSchema<TDefs>
		? InferSchema<TDefs>[TName] extends Record<string, unknown>
			? InferSchema<TDefs>[TName]
			: Record<string, unknown>
		: Record<string, unknown>
	: Record<string, unknown>;

/**
 * Extract all valid content type names from a schema.
 */
export type ValidContentTypeName<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>
> = TSchema extends ContentSchemaInstance<infer TDefs>
	? SchemaContentTypeNames<TDefs>
	: string;

// =============================================================================
// Typed Content Entries API Interface
// =============================================================================

/**
 * Typed content entries API methods.
 *
 * These methods provide full type inference for content data when a schema
 * is configured.
 *
 * @typeParam TSchema - The content schema instance type
 */
export interface TypedContentEntriesApi<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>
> {
	/**
	 * Get a content entry by ID with typed data.
	 *
	 * @param ctx - Convex context
	 * @param id - The content entry ID
	 * @returns The entry with typed data, or null if not found
	 *
	 * @example
	 * ```typescript
	 * const post = await cms.contentEntries.get<"blog_post">(ctx, id);
	 * if (post) {
	 *   console.log(post.data.title);  // ✅ TypeScript knows title is string
	 * }
	 * ```
	 */
	get<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		id: string,
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>> | null>;

	/**
	 * Get a content entry by slug with typed data.
	 *
	 * @param ctx - Convex context
	 * @param options - Query options including contentTypeName and slug
	 * @returns The entry with typed data, or null if not found
	 */
	getBySlug<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		options: {
			contentTypeName: TName;
			slug: string;
			locale?: string;
			status?: ContentStatus | ContentStatus[];
		},
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>> | null>;

	/**
	 * Create a new content entry with typed data.
	 *
	 * @param ctx - Convex context
	 * @param options - Creation options including typed data
	 * @returns The created entry with typed data
	 *
	 * @example
	 * ```typescript
	 * const post = await cms.contentEntries.create<"blog_post">(ctx, {
	 *   contentTypeName: "blog_post",
	 *   data: {
	 *     title: "Hello World",  // ✅ TypeScript validates this
	 *     typo: "oops",          // ❌ Error: 'typo' does not exist
	 *   },
	 * });
	 * ```
	 */
	create<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		options: TypedCreateEntryOptions<TSchema, TName>,
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>>>;

	/**
	 * Update an existing content entry with typed data.
	 *
	 * @param ctx - Convex context
	 * @param options - Update options including partial typed data
	 * @returns The updated entry with typed data
	 */
	update<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		options: TypedUpdateEntryOptions<TSchema, TName>,
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>>>;

	/**
	 * List content entries with typed data.
	 *
	 * @param ctx - Convex context
	 * @param options - List options
	 * @returns Paginated results with typed entries
	 */
	list<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		options: TypedListEntriesOptions<TName>,
	): Promise<TypedPaginationResult<SchemaDataType<TSchema, TName>>>;
}

// =============================================================================
// Typed Method Options
// =============================================================================

/**
 * Options for creating a content entry with typed data.
 */
export interface TypedCreateEntryOptions<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>,
	TName extends ValidContentTypeName<TSchema>
> {
	/**
	 * The content type name (must match a type in the schema).
	 */
	contentTypeName: TName;

	/**
	 * The content data (fully typed based on the content type's validator).
	 */
	data: SchemaDataType<TSchema, TName>;

	/**
	 * Optional slug (auto-generated if not provided).
	 */
	slug?: string;

	/**
	 * Optional locale for localized content.
	 */
	locale?: string;

	/**
	 * User ID of the creator.
	 */
	createdBy?: string;
}

/**
 * Options for updating a content entry with typed data.
 */
export interface TypedUpdateEntryOptions<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>,
	TName extends ValidContentTypeName<TSchema>
> {
	/**
	 * The content entry ID.
	 */
	id: string;

	/**
	 * Partial content data (typed based on the content type).
	 */
	data?: Partial<SchemaDataType<TSchema, TName>>;

	/**
	 * Optional updated slug.
	 */
	slug?: string;

	/**
	 * User ID of the updater.
	 */
	updatedBy?: string;
}

/**
 * Options for listing content entries with typed results.
 */
export interface TypedListEntriesOptions<TName extends string> {
	/**
	 * Filter by content type name.
	 */
	contentTypeName?: TName;

	/**
	 * Filter by status.
	 */
	status?: ContentStatus;

	/**
	 * Filter by multiple statuses.
	 */
	statusIn?: ContentStatus[];

	/**
	 * Filter by locale.
	 */
	locale?: string;

	/**
	 * Search query.
	 */
	search?: string;

	/**
	 * Include soft-deleted entries.
	 */
	includeDeleted?: boolean;

	/**
	 * Pagination options.
	 */
	paginationOpts: PaginationOpts;
}

// =============================================================================
// Type Helpers for Schema Integration
// =============================================================================

/**
 * Helper type to check if a schema has a specific content type.
 */
export type HasContentType<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>,
	TName extends string
> = TName extends ValidContentTypeName<TSchema> ? true : false;

/**
 * Utility type to get the definition for a specific content type.
 */
export type GetContentTypeDefinition<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>,
	TName extends string
> = TSchema extends ContentSchemaInstance<infer TDefs>
	? {
			[K in keyof TDefs]: TDefs[K] extends ContentTypeDefinition<
				TName,
				infer _V
			>
				? TDefs[K]
				: never;
	  }[keyof TDefs]
	: never;

// =============================================================================
// Typed CMS Client Factory
// =============================================================================

import type { ComponentConfig } from "../types.js";
import type { TypedComponentApi, CmsClient } from "../wrapper.js";

/**
 * Configuration for creating a typed CMS client.
 */
export interface TypedCmsClientConfig<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>
> extends ComponentConfig {
	/**
	 * The content schema instance containing type definitions.
	 * Created using `createContentSchema()`.
	 */
	schema: TSchema;
}

/**
 * A typed CMS client with schema-aware content entry methods.
 *
 * @typeParam TSchema - The content schema instance type
 */
export interface TypedCmsClient<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>
> extends CmsClient {
	/**
	 * The content schema configured for this client.
	 */
	readonly schema: TSchema;

	/**
	 * Typed content entries API with methods that return properly typed data.
	 */
	readonly typedContentEntries: TypedContentEntriesApiImpl<TSchema>;
}

/**
 * Implementation of typed content entries API.
 *
 * This provides typed wrappers around the base content entries API that
 * cast results to the appropriate types based on the schema.
 *
 * @typeParam TSchema - The content schema instance type
 */
export class TypedContentEntriesApiImpl<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>
> {
	private baseClient: CmsClient;
	private schema: TSchema;

	constructor(baseClient: CmsClient, schema: TSchema) {
		this.baseClient = baseClient;
		this.schema = schema;
	}

	/**
	 * Get a content entry by ID with typed data.
	 *
	 * @param ctx - Convex context
	 * @param id - The content entry ID
	 * @returns The entry with typed data, or null if not found
	 *
	 * @example
	 * ```typescript
	 * const post = await cms.typedContentEntries.get<"blog_post">(ctx, id);
	 * if (post) {
	 *   console.log(post.data.title);  // ✅ TypeScript knows title is string
	 * }
	 * ```
	 */
	async get<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		id: string,
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>> | null> {
		const entry = await this.baseClient.contentEntries.get(ctx, { id });
		if (!entry) return null;

		// Cast to typed entry - the data shape is validated at write time
		return (entry as unknown) as TypedContentEntry<
			SchemaDataType<TSchema, TName>
		>;
	}

	/**
	 * Get a content entry by slug with typed data.
	 *
	 * @param ctx - Convex context
	 * @param options - Query options including contentTypeName and slug
	 * @returns The entry with typed data, or null if not found
	 */
	async getBySlug<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		options: {
			contentTypeName: TName;
			slug: string;
			locale?: string;
		},
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>> | null> {
		const entry = await this.baseClient.contentEntries.getBySlug(ctx, {
			contentTypeName: options.contentTypeName,
			slug: options.slug,
			locale: options.locale,
		});
		if (!entry) return null;

		return (entry as unknown) as TypedContentEntry<
			SchemaDataType<TSchema, TName>
		>;
	}

	/**
	 * Create a new content entry with typed data.
	 *
	 * @param ctx - Convex context
	 * @param options - Creation options including typed data
	 * @returns The created entry with typed data
	 *
	 * @example
	 * ```typescript
	 * const post = await cms.typedContentEntries.create<"blog_post">(ctx, {
	 *   contentTypeName: "blog_post",
	 *   data: {
	 *     title: "Hello World",  // ✅ TypeScript validates this
	 *     content: "...",
	 *   },
	 * });
	 * ```
	 */
	async create<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		options: TypedCreateEntryOptions<TSchema, TName>,
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>>> {
		// Look up the content type by name to get its ID
		const contentType = await this.baseClient.contentTypes.getByName(
			ctx,
			options.contentTypeName as string,
		);

		if (!contentType) {
			throw new Error(`Content type "${options.contentTypeName}" not found`);
		}

		const entry = await this.baseClient.contentEntries.create(ctx, {
			contentTypeName: options.contentTypeName as string,
			data: options.data as Record<string, unknown>,
			slug: options.slug,
			locale: options.locale,
			createdBy: options.createdBy,
		});

		return (entry as unknown) as TypedContentEntry<
			SchemaDataType<TSchema, TName>
		>;
	}

	/**
	 * Update an existing content entry with typed data.
	 *
	 * @param ctx - Convex context
	 * @param options - Update options including partial typed data
	 * @returns The updated entry with typed data
	 */
	async update<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		options: TypedUpdateEntryOptions<TSchema, TName>,
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>>> {
		const entry = await this.baseClient.contentEntries.update(ctx, {
			id: options.id,
			data: options.data as Record<string, unknown> | undefined,
			slug: options.slug,
			updatedBy: options.updatedBy,
		});

		return (entry as unknown) as TypedContentEntry<
			SchemaDataType<TSchema, TName>
		>;
	}

	/**
	 * List content entries with typed data.
	 *
	 * @param ctx - Convex context
	 * @param options - List options
	 * @returns Paginated results with typed entries
	 */
	async list<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		options: TypedListEntriesOptions<TName>,
	): Promise<TypedPaginationResult<SchemaDataType<TSchema, TName>>> {
		const result = await this.baseClient.contentEntries.list(ctx, {
			contentTypeName: options.contentTypeName as string | undefined,
			status: options.status,
			statusIn: options.statusIn,
			locale: options.locale,
			search: options.search,
			includeDeleted: options.includeDeleted,
			paginationOpts: options.paginationOpts,
		});

		return {
			page: (result.page as unknown) as TypedContentEntry<
				SchemaDataType<TSchema, TName>
			>[],
			continueCursor: result.continueCursor,
			isDone: result.isDone,
		};
	}

	/**
	 * Publish a content entry.
	 *
	 * @param ctx - Convex context
	 * @param id - The entry ID to publish
	 * @param updatedBy - Optional user ID who triggered the publish
	 * @returns The published entry with typed data
	 */
	async publish<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		id: string,
		updatedBy?: string,
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>>> {
		const entry = await this.baseClient.contentEntries.publish(ctx, {
			id,
			updatedBy,
		});

		return (entry as unknown) as TypedContentEntry<
			SchemaDataType<TSchema, TName>
		>;
	}

	/**
	 * Unpublish a content entry.
	 *
	 * @param ctx - Convex context
	 * @param id - The entry ID to unpublish
	 * @param updatedBy - Optional user ID who triggered the unpublish
	 * @returns The unpublished entry with typed data
	 */
	async unpublish<TName extends ValidContentTypeName<TSchema>>(
		ctx: ConvexContext,
		id: string,
		updatedBy?: string,
	): Promise<TypedContentEntry<SchemaDataType<TSchema, TName>>> {
		const entry = await this.baseClient.contentEntries.unpublish(ctx, {
			id,
			updatedBy,
		});

		return (entry as unknown) as TypedContentEntry<
			SchemaDataType<TSchema, TName>
		>;
	}

	/**
	 * Get the schema configured for this typed client.
	 */
	getSchema(): TSchema {
		return this.schema;
	}

	/**
	 * Validate that a content type exists in the schema.
	 *
	 * @param name - The content type name to validate
	 * @returns true if the content type exists
	 */
	hasContentType(name: string): boolean {
		return this.schema.hasContentType(name);
	}
}

/**
 * Creates a typed CMS client with schema-aware content entry methods.
 *
 * This is the main entry point for using type-safe content operations.
 * The returned client extends the base `CmsClient` with additional
 * `typedContentEntries` methods that provide full TypeScript inference.
 *
 * @param componentApi - The component API from `components.convexCms`
 * @param config - Configuration including the content schema
 * @returns A typed CMS client instance
 *
 * @example
 * ```typescript
 * import { v } from "convex/values";
 * import { defineContentType, createContentSchema, createTypedCmsClient } from "convex-cms";
 * import { components } from "./_generated/api";
 *
 * // Define content types
 * const blogPost = defineContentType({
 *   name: "blog_post",
 *   validator: v.object({
 *     title: v.string(),
 *     content: v.string(),
 *   }),
 *   meta: { displayName: "Blog Post" },
 * });
 *
 * const contentSchema = createContentSchema({ blogPost });
 *
 * // Create a typed client
 * export const cms = createTypedCmsClient(components.convexCms, {
 *   schema: contentSchema,
 * });
 *
 * // Use with full type inference
 * const post = await cms.typedContentEntries.get<"blog_post">(ctx, id);
 * post.data.title;  // ✅ string
 * post.data.typo;   // ❌ Error: Property 'typo' does not exist
 * ```
 */
export function createTypedCmsClient<
	TSchema extends ContentSchemaInstance<Record<string, ContentTypeDefinition>>
>(
	componentApi: TypedComponentApi,
	config: TypedCmsClientConfig<TSchema>,
): TypedCmsClient<TSchema> {
	// Import createCmsClient dynamically to avoid circular imports
	// The actual import happens at runtime
	const { createCmsClient } = require("../index.js") as {
		createCmsClient: (
			api: TypedComponentApi,
			config?: ComponentConfig,
		) => CmsClient;
	};

	// Create the base client with the provided config
	const baseClient = createCmsClient(componentApi, config);

	// Create the typed content entries API
	const typedContentEntries = new TypedContentEntriesApiImpl(
		baseClient,
		config.schema,
	);

	// Return an extended client with the typed API
	return {
		...baseClient,
		schema: config.schema,
		typedContentEntries,
	};
}
