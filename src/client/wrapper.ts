/**
 * CMS Client Wrapper with typed method APIs.
 *
 * This module provides an ergonomic wrapper around the Convex CMS component
 * that offers typed methods for all CMS operations. Instead of calling
 * component functions directly, developers can use intuitive method calls.
 *
 * @example
 * ```typescript
 * import { createCmsClient } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * const cms = createCmsClient(components.convexCms);
 *
 * // In a mutation or query:
 * const type = await cms.contentTypes.create(ctx, {
 *   name: "blog_post",
 *   displayName: "Blog Post",
 *   fields: [...]
 * });
 * ```
 */

import type {
  ComponentConfig,
  FeatureFlags,
  LocaleCode,
  ContentType,
  ContentEntry,
  ContentVersion,
  MediaAsset,
  MediaFolder,
  FieldDefinition,
  ContentStatus,
  MediaType,
  PaginatedResponse,
  PaginationResult,
  PaginationOpts,
  ContentQueryOptions,
  MediaQueryOptions,
} from "./types.js";

import { resolveConfig } from "./types.js";

// =============================================================================
// Context Types
// =============================================================================

/**
 * Minimal Convex context interface for running component functions.
 * This works with both MutationCtx and QueryCtx from Convex.
 */
export interface ConvexContext {
  runMutation<Args, Result>(
    fn: FunctionReference<"mutation", Args, Result>,
    args: Args
  ): Promise<Result>;
  runQuery<Args, Result>(
    fn: FunctionReference<"query", Args, Result>,
    args: Args
  ): Promise<Result>;
}

/**
 * Function reference type for Convex component functions.
 */
export interface FunctionReference<
  Type extends "mutation" | "query" | "action",
  Args = unknown,
  Result = unknown
> {
  _type: Type;
  _args: Args;
  _returnType: Result;
}

// =============================================================================
// Component API Type
// =============================================================================

/**
 * The expected shape of the component API from `components.convexCms`.
 * This provides type information for all component function groups.
 */
export interface TypedComponentApi {
  contentTypes: {
    create: FunctionReference<"mutation", CreateContentTypeArgs, ContentType>;
    update: FunctionReference<"mutation", UpdateContentTypeArgs, ContentType>;
    delete: FunctionReference<"mutation", DeleteContentTypeArgs, ContentType>;
    get: FunctionReference<"query", GetContentTypeArgs, ContentType | null>;
    list: FunctionReference<"query", ListContentTypesArgs, ContentType[]>;
  };
  contentEntries: {
    create: FunctionReference<"mutation", CreateContentEntryArgs, ContentEntry>;
    update: FunctionReference<"mutation", UpdateContentEntryArgs, ContentEntry>;
    delete: FunctionReference<"mutation", DeleteContentEntryArgs, ContentEntry>;
    get: FunctionReference<"query", GetContentEntryArgs, ContentEntry | null>;
    getBySlug: FunctionReference<"query", GetContentEntryBySlugArgs, ContentEntry | null>;
    list: FunctionReference<"query", ListContentEntriesArgs, PaginationResult<ContentEntry>>;
    publish: FunctionReference<"mutation", PublishEntryArgs, ContentEntry>;
    unpublish: FunctionReference<"mutation", UnpublishEntryArgs, ContentEntry>;
    schedule: FunctionReference<"mutation", ScheduleEntryArgs, ContentEntry>;
  };
  versions: {
    list: FunctionReference<"query", ListVersionsArgs, PaginatedResponse<ContentVersion>>;
    get: FunctionReference<"query", GetVersionArgs, ContentVersion | null>;
    rollback: FunctionReference<"mutation", RollbackVersionArgs, ContentEntry>;
  };
  mediaAssets: {
    create: FunctionReference<"mutation", CreateMediaAssetArgs, MediaAsset>;
    update: FunctionReference<"mutation", UpdateMediaAssetArgs, MediaAsset>;
    delete: FunctionReference<"mutation", DeleteMediaAssetArgs, MediaAsset>;
    get: FunctionReference<"query", GetMediaAssetArgs, MediaAsset | null>;
    list: FunctionReference<"query", ListMediaAssetsArgs, PaginatedResponse<MediaAsset>>;
  };
  mediaFolders: {
    create: FunctionReference<"mutation", CreateMediaFolderArgs, MediaFolder>;
    update: FunctionReference<"mutation", UpdateMediaFolderArgs, MediaFolder>;
    delete: FunctionReference<"mutation", DeleteMediaFolderArgs, MediaFolder>;
    get: FunctionReference<"query", GetMediaFolderArgs, MediaFolder | null>;
    list: FunctionReference<"query", ListMediaFoldersArgs, MediaFolder[]>;
    move: FunctionReference<"mutation", MoveFolderArgs, MediaFolder>;
  };
}

// =============================================================================
// Argument Types for Component Functions
// =============================================================================

// Content Type Arguments
export interface CreateContentTypeArgs {
  name: string;
  displayName: string;
  description?: string;
  fields: FieldDefinition[];
  icon?: string;
  singleton?: boolean;
  slugField?: string;
  titleField?: string;
  sortOrder?: number;
  createdBy?: string;
}

export interface UpdateContentTypeArgs {
  id: string;
  displayName?: string;
  description?: string;
  fields?: FieldDefinition[];
  icon?: string;
  singleton?: boolean;
  slugField?: string;
  titleField?: string;
  sortOrder?: number;
  isActive?: boolean;
  updatedBy?: string;
}

export interface DeleteContentTypeArgs {
  id: string;
  deletedBy?: string;
}

export interface GetContentTypeArgs {
  id?: string;
  name?: string;
}

export interface ListContentTypesArgs {
  includeInactive?: boolean;
  includeDeleted?: boolean;
}

// Content Entry Arguments
export interface CreateContentEntryArgs {
  contentTypeId: string;
  slug?: string;
  data: Record<string, unknown>;
  locale?: string;
  primaryEntryId?: string;
  status?: ContentStatus;
  createdBy?: string;
}

export interface UpdateContentEntryArgs {
  id: string;
  slug?: string;
  data?: Record<string, unknown>;
  status?: ContentStatus;
  scheduledPublishAt?: number;
  updatedBy?: string;
}

export interface DeleteContentEntryArgs {
  id: string;
  deletedBy?: string;
}

export interface GetContentEntryArgs {
  id: string;
}

export interface GetContentEntryBySlugArgs {
  contentTypeId?: string;
  contentTypeName?: string;
  slug: string;
  locale?: string;
}

export interface ListContentEntriesArgs extends ContentQueryOptions {}

export interface PublishEntryArgs {
  id: string;
  changeDescription?: string;
  updatedBy?: string;
}

export interface UnpublishEntryArgs {
  id: string;
  updatedBy?: string;
}

export interface ScheduleEntryArgs {
  id: string;
  publishAt: number;
  updatedBy?: string;
}

// Version Arguments
export interface ListVersionsArgs {
  entryId: string;
  cursor?: string;
  limit?: number;
}

export interface GetVersionArgs {
  id: string;
}

export interface RollbackVersionArgs {
  entryId: string;
  versionNumber: number;
  updatedBy?: string;
}

// Media Asset Arguments
export interface CreateMediaAssetArgs {
  storageId: string;
  filename: string;
  mimeType: string;
  size: number;
  type: MediaType;
  title?: string;
  description?: string;
  altText?: string;
  folderId?: string;
  width?: number;
  height?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdBy?: string;
}

export interface UpdateMediaAssetArgs {
  id: string;
  title?: string;
  description?: string;
  altText?: string;
  folderId?: string;
  tags?: string[];
}

export interface DeleteMediaAssetArgs {
  id: string;
  deletedBy?: string;
}

export interface GetMediaAssetArgs {
  id: string;
}

export interface ListMediaAssetsArgs extends MediaQueryOptions {}

// Media Folder Arguments
export interface CreateMediaFolderArgs {
  name: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
  createdBy?: string;
}

export interface UpdateMediaFolderArgs {
  id: string;
  name?: string;
  description?: string;
  sortOrder?: number;
}

export interface DeleteMediaFolderArgs {
  id: string;
  deletedBy?: string;
}

export interface GetMediaFolderArgs {
  id: string;
}

export interface ListMediaFoldersArgs {
  parentId?: string;
  includeDeleted?: boolean;
}

export interface MoveFolderArgs {
  id: string;
  newParentId?: string;
}

// =============================================================================
// Content Types API Wrapper
// =============================================================================

/**
 * Wrapper for content type operations.
 */
export class ContentTypesApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: Required<ComponentConfig>
  ) {}

  /**
   * Create a new content type.
   *
   * @param ctx - Convex mutation context
   * @param args - Content type creation arguments
   * @returns The created content type
   *
   * @example
   * ```typescript
   * const blogType = await cms.contentTypes.create(ctx, {
   *   name: "blog_post",
   *   displayName: "Blog Post",
   *   fields: [
   *     { name: "title", label: "Title", type: "text", required: true },
   *     { name: "content", label: "Content", type: "richText", required: true },
   *   ],
   *   slugField: "title",
   * });
   * ```
   */
  async create(
    ctx: ConvexContext,
    args: CreateContentTypeArgs
  ): Promise<ContentType> {
    return ctx.runMutation(this.api.contentTypes.create as any, args);
  }

  /**
   * Update an existing content type.
   *
   * @param ctx - Convex mutation context
   * @param args - Content type update arguments
   * @returns The updated content type
   */
  async update(
    ctx: ConvexContext,
    args: UpdateContentTypeArgs
  ): Promise<ContentType> {
    return ctx.runMutation(this.api.contentTypes.update as any, args);
  }

  /**
   * Soft delete a content type.
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments
   * @returns The deleted content type
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteContentTypeArgs
  ): Promise<ContentType> {
    return ctx.runMutation(this.api.contentTypes.delete as any, args);
  }

  /**
   * Get a content type by ID or name.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments (id or name)
   * @returns The content type or null if not found
   *
   * @example
   * ```typescript
   * // Get by ID
   * const type = await cms.contentTypes.get(ctx, { id: typeId });
   *
   * // Get by name
   * const type = await cms.contentTypes.get(ctx, { name: "blog_post" });
   * ```
   */
  async get(
    ctx: ConvexContext,
    args: GetContentTypeArgs
  ): Promise<ContentType | null> {
    return ctx.runQuery(this.api.contentTypes.get as any, args);
  }

  /**
   * List all content types.
   *
   * @param ctx - Convex query context
   * @param args - Optional filter arguments
   * @returns Array of content types
   */
  async list(
    ctx: ConvexContext,
    args: ListContentTypesArgs = {}
  ): Promise<ContentType[]> {
    return ctx.runQuery(this.api.contentTypes.list as any, args);
  }
}

// =============================================================================
// Content Entries API Wrapper
// =============================================================================

/**
 * Wrapper for content entry operations.
 */
export class ContentEntriesApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: Required<ComponentConfig>
  ) {}

  /**
   * Create a new content entry.
   *
   * @param ctx - Convex mutation context
   * @param args - Entry creation arguments
   * @returns The created entry
   *
   * @example
   * ```typescript
   * const post = await cms.contentEntries.create(ctx, {
   *   contentTypeId: blogTypeId,
   *   data: {
   *     title: "My First Post",
   *     content: "<p>Hello world!</p>",
   *   },
   * });
   * ```
   */
  async create(
    ctx: ConvexContext,
    args: CreateContentEntryArgs
  ): Promise<ContentEntry> {
    // Apply default locale if not specified and localization is enabled
    const argsWithDefaults = {
      ...args,
      locale: args.locale ?? this.config.defaultLocale,
    };
    return ctx.runMutation(this.api.contentEntries.create as any, argsWithDefaults);
  }

  /**
   * Update an existing content entry.
   *
   * @param ctx - Convex mutation context
   * @param args - Entry update arguments
   * @returns The updated entry
   */
  async update(
    ctx: ConvexContext,
    args: UpdateContentEntryArgs
  ): Promise<ContentEntry> {
    return ctx.runMutation(this.api.contentEntries.update as any, args);
  }

  /**
   * Soft delete a content entry.
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments
   * @returns The deleted entry
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteContentEntryArgs
  ): Promise<ContentEntry> {
    return ctx.runMutation(this.api.contentEntries.delete as any, args);
  }

  /**
   * Get a content entry by ID.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments
   * @returns The entry or null if not found
   */
  async get(
    ctx: ConvexContext,
    args: GetContentEntryArgs
  ): Promise<ContentEntry | null> {
    return ctx.runQuery(this.api.contentEntries.get as any, args);
  }

  /**
   * Get a content entry by slug.
   *
   * @param ctx - Convex query context
   * @param args - Get by slug arguments
   * @returns The entry or null if not found
   *
   * @example
   * ```typescript
   * const post = await cms.contentEntries.getBySlug(ctx, {
   *   contentTypeName: "blog_post",
   *   slug: "my-first-post",
   * });
   * ```
   */
  async getBySlug(
    ctx: ConvexContext,
    args: GetContentEntryBySlugArgs
  ): Promise<ContentEntry | null> {
    return ctx.runQuery(this.api.contentEntries.getBySlug as any, args);
  }

  /**
   * List content entries with optional filters and cursor-based pagination.
   *
   * Uses the standard Convex pagination format compatible with usePaginatedQuery.
   *
   * @param ctx - Convex query context
   * @param args - Query options with pagination
   * @returns PaginationResult with page, continueCursor, and isDone
   *
   * @example
   * ```typescript
   * // First page
   * const { page, continueCursor, isDone } = await cms.contentEntries.list(ctx, {
   *   contentTypeName: "blog_post",
   *   status: "published",
   *   paginationOpts: { numItems: 10 },
   * });
   *
   * // Next page
   * const page2 = await cms.contentEntries.list(ctx, {
   *   contentTypeName: "blog_post",
   *   status: "published",
   *   paginationOpts: { numItems: 10, cursor: continueCursor },
   * });
   * ```
   */
  async list(
    ctx: ConvexContext,
    args: ListContentEntriesArgs
  ): Promise<PaginationResult<ContentEntry>> {
    return ctx.runQuery(this.api.contentEntries.list as any, args);
  }

  /**
   * Publish a content entry.
   *
   * @param ctx - Convex mutation context
   * @param args - Publish arguments
   * @returns The published entry
   */
  async publish(
    ctx: ConvexContext,
    args: PublishEntryArgs
  ): Promise<ContentEntry> {
    return ctx.runMutation(this.api.contentEntries.publish as any, args);
  }

  /**
   * Unpublish a content entry (revert to draft).
   *
   * @param ctx - Convex mutation context
   * @param args - Unpublish arguments
   * @returns The unpublished entry
   */
  async unpublish(
    ctx: ConvexContext,
    args: UnpublishEntryArgs
  ): Promise<ContentEntry> {
    return ctx.runMutation(this.api.contentEntries.unpublish as any, args);
  }

  /**
   * Schedule a content entry for future publication.
   *
   * @param ctx - Convex mutation context
   * @param args - Schedule arguments
   * @returns The scheduled entry
   *
   * @example
   * ```typescript
   * await cms.contentEntries.schedule(ctx, {
   *   id: entryId,
   *   publishAt: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
   * });
   * ```
   */
  async schedule(
    ctx: ConvexContext,
    args: ScheduleEntryArgs
  ): Promise<ContentEntry> {
    if (!this.config.features.scheduling) {
      throw new Error("Scheduling feature is not enabled");
    }
    return ctx.runMutation(this.api.contentEntries.schedule as any, args);
  }
}

// =============================================================================
// Versions API Wrapper
// =============================================================================

/**
 * Wrapper for content version operations.
 */
export class VersionsApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: Required<ComponentConfig>
  ) {}

  /**
   * List version history for a content entry.
   *
   * @param ctx - Convex query context
   * @param args - List arguments
   * @returns Paginated list of versions
   */
  async list(
    ctx: ConvexContext,
    args: ListVersionsArgs
  ): Promise<PaginatedResponse<ContentVersion>> {
    if (!this.config.features.versioning) {
      throw new Error("Versioning feature is not enabled");
    }
    return ctx.runQuery(this.api.versions.list as any, args);
  }

  /**
   * Get a specific version by ID.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments
   * @returns The version or null if not found
   */
  async get(
    ctx: ConvexContext,
    args: GetVersionArgs
  ): Promise<ContentVersion | null> {
    if (!this.config.features.versioning) {
      throw new Error("Versioning feature is not enabled");
    }
    return ctx.runQuery(this.api.versions.get as any, args);
  }

  /**
   * Rollback a content entry to a previous version.
   *
   * @param ctx - Convex mutation context
   * @param args - Rollback arguments
   * @returns The updated entry with rolled back content
   *
   * @example
   * ```typescript
   * // Rollback to version 3
   * await cms.versions.rollback(ctx, {
   *   entryId: entryId,
   *   versionNumber: 3,
   * });
   * ```
   */
  async rollback(
    ctx: ConvexContext,
    args: RollbackVersionArgs
  ): Promise<ContentEntry> {
    if (!this.config.features.versioning) {
      throw new Error("Versioning feature is not enabled");
    }
    return ctx.runMutation(this.api.versions.rollback as any, args);
  }
}

// =============================================================================
// Media Assets API Wrapper
// =============================================================================

/**
 * Wrapper for media asset operations.
 */
export class MediaAssetsApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: Required<ComponentConfig>
  ) {}

  /**
   * Create a new media asset record.
   *
   * @param ctx - Convex mutation context
   * @param args - Asset creation arguments
   * @returns The created asset
   *
   * @example
   * ```typescript
   * // After uploading to Convex storage
   * const asset = await cms.mediaAssets.create(ctx, {
   *   storageId: storageId,
   *   filename: "photo.jpg",
   *   mimeType: "image/jpeg",
   *   size: 102400,
   *   type: "image",
   *   width: 1920,
   *   height: 1080,
   * });
   * ```
   */
  async create(
    ctx: ConvexContext,
    args: CreateMediaAssetArgs
  ): Promise<MediaAsset> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    // Validate file size
    if (args.size > this.config.maxMediaFileSize) {
      throw new Error(
        `File size ${args.size} exceeds maximum allowed size of ${this.config.maxMediaFileSize} bytes`
      );
    }
    return ctx.runMutation(this.api.mediaAssets.create as any, args);
  }

  /**
   * Update media asset metadata.
   *
   * @param ctx - Convex mutation context
   * @param args - Asset update arguments
   * @returns The updated asset
   */
  async update(
    ctx: ConvexContext,
    args: UpdateMediaAssetArgs
  ): Promise<MediaAsset> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(this.api.mediaAssets.update as any, args);
  }

  /**
   * Soft delete a media asset.
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments
   * @returns The deleted asset
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteMediaAssetArgs
  ): Promise<MediaAsset> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(this.api.mediaAssets.delete as any, args);
  }

  /**
   * Get a media asset by ID.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments
   * @returns The asset or null if not found
   */
  async get(
    ctx: ConvexContext,
    args: GetMediaAssetArgs
  ): Promise<MediaAsset | null> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(this.api.mediaAssets.get as any, args);
  }

  /**
   * List media assets with optional filters.
   *
   * @param ctx - Convex query context
   * @param args - Query options
   * @returns Paginated list of assets
   */
  async list(
    ctx: ConvexContext,
    args: ListMediaAssetsArgs = {}
  ): Promise<PaginatedResponse<MediaAsset>> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(this.api.mediaAssets.list as any, args);
  }
}

// =============================================================================
// Media Folders API Wrapper
// =============================================================================

/**
 * Wrapper for media folder operations.
 */
export class MediaFoldersApi {
  constructor(
    private readonly api: TypedComponentApi,
    private readonly config: Required<ComponentConfig>
  ) {}

  /**
   * Create a new media folder.
   *
   * @param ctx - Convex mutation context
   * @param args - Folder creation arguments
   * @returns The created folder
   */
  async create(
    ctx: ConvexContext,
    args: CreateMediaFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(this.api.mediaFolders.create as any, args);
  }

  /**
   * Update a media folder.
   *
   * @param ctx - Convex mutation context
   * @param args - Folder update arguments
   * @returns The updated folder
   */
  async update(
    ctx: ConvexContext,
    args: UpdateMediaFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(this.api.mediaFolders.update as any, args);
  }

  /**
   * Soft delete a media folder.
   *
   * @param ctx - Convex mutation context
   * @param args - Delete arguments
   * @returns The deleted folder
   */
  async delete(
    ctx: ConvexContext,
    args: DeleteMediaFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(this.api.mediaFolders.delete as any, args);
  }

  /**
   * Get a media folder by ID.
   *
   * @param ctx - Convex query context
   * @param args - Get arguments
   * @returns The folder or null if not found
   */
  async get(
    ctx: ConvexContext,
    args: GetMediaFolderArgs
  ): Promise<MediaFolder | null> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(this.api.mediaFolders.get as any, args);
  }

  /**
   * List media folders.
   *
   * @param ctx - Convex query context
   * @param args - Optional filter arguments
   * @returns Array of folders
   */
  async list(
    ctx: ConvexContext,
    args: ListMediaFoldersArgs = {}
  ): Promise<MediaFolder[]> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runQuery(this.api.mediaFolders.list as any, args);
  }

  /**
   * Move a folder to a new parent.
   *
   * @param ctx - Convex mutation context
   * @param args - Move arguments
   * @returns The moved folder with updated path
   */
  async move(
    ctx: ConvexContext,
    args: MoveFolderArgs
  ): Promise<MediaFolder> {
    if (!this.config.features.mediaManagement) {
      throw new Error("Media management feature is not enabled");
    }
    return ctx.runMutation(this.api.mediaFolders.move as any, args);
  }
}

// =============================================================================
// Enhanced CMS Client
// =============================================================================

/**
 * Enhanced CMS client with typed method wrappers for all component operations.
 *
 * This client provides an ergonomic, type-safe API for interacting with the
 * Convex CMS component. All methods accept a Convex context and return
 * properly typed results.
 *
 * @example
 * ```typescript
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
 *
 * // In a mutation:
 * export const createBlogPost = mutation({
 *   args: { title: v.string(), content: v.string() },
 *   handler: async (ctx, args) => {
 *     return await cms.contentEntries.create(ctx, {
 *       contentTypeId: "blog_post_type_id",
 *       data: { title: args.title, content: args.content },
 *     });
 *   },
 * });
 * ```
 */
export interface EnhancedCmsClient {
  /**
   * The resolved configuration for this client instance.
   */
  readonly config: Required<ComponentConfig>;

  /**
   * The underlying component API reference.
   */
  readonly api: TypedComponentApi;

  /**
   * Content type management operations.
   */
  readonly contentTypes: ContentTypesApi;

  /**
   * Content entry CRUD and workflow operations.
   */
  readonly contentEntries: ContentEntriesApi;

  /**
   * Content version history operations.
   */
  readonly versions: VersionsApi;

  /**
   * Media asset management operations.
   */
  readonly mediaAssets: MediaAssetsApi;

  /**
   * Media folder organization operations.
   */
  readonly mediaFolders: MediaFoldersApi;

  /**
   * Check if a specific feature is enabled.
   * @param feature - The feature flag to check
   * @returns true if the feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean;

  /**
   * Check if a locale is supported by this configuration.
   * @param locale - The locale code to check
   * @returns true if the locale is in the supported locales list
   */
  isLocaleSupported(locale: LocaleCode): boolean;
}

/**
 * Creates an enhanced CMS client with typed method wrappers.
 *
 * This is the main entry point for using the Convex CMS component.
 * The returned client provides typed methods for all CMS operations.
 *
 * @param componentApi - The component API from `components.convexCms`
 * @param config - Optional configuration options
 * @returns An enhanced CMS client instance
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
 */
export function createEnhancedCmsClient(
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
