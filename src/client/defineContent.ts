/**
 * defineContent API
 *
 * Creates type-safe content type definitions with typed helper methods.
 * This is the core of the "no-sync" architecture - types live in code,
 * not in the database.
 *
 * @example
 * ```typescript
 * // convex/cms.ts
 * import { createCms } from "convex-cms";
 * import { components } from "./_generated/api";
 * import { v } from "convex/values";
 * import cmsConfig from "./cms.config";
 *
 * const cms = createCms(components.convexCms, cmsConfig);
 *
 * export const blogPost = cms.defineContent({
 *   name: "Blog Post",
 *   fields: v.object({
 *     title: v.string(),
 *     content: v.string(),
 *   }),
 *   display: {
 *     titleField: "title",
 *     icon: "📝",
 *   },
 * });
 *
 * // Export admin API for the admin UI
 * export const admin = cms.admin;
 *
 * // Usage in Convex functions:
 * const post = await blogPost.get(ctx, { id: "..." });
 * post.data.title; // ✅ Typed as string
 *
 * await blogPost.create(ctx, {
 *   data: { title: "Hello", content: "World" },
 *   slug: "hello-world",
 * });
 * ```
 */

import type { Infer, Validator } from "convex/values";
import type {
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";
import type { ComponentApi as GeneratedComponentApi } from "../component/_generated/component.js";
import type { ContentTypeMeta, FieldMeta } from "./schema/types.js";
import type { ComponentConfig, ResolvedComponentConfig, FeatureFlags, LocaleCode } from "./types.js";
import type { UnifiedCmsConfig } from "./config.js";
import { defineContentType } from "./schema/defineContentType.js";
import { registerContentType } from "./registry.js";
import { toSlug } from "./utils/toSlug.js";
import { defineAdminAPI } from "./admin/index.js";
import type {
  CmsClient,
  ContentTypesApi,
  ContentEntriesApi,
  VersionsApi,
  MediaAssetsApi,
  MediaFoldersApi,
  MediaVariantsApi,
} from "./wrapper.js";

type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type MutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation" | "runQuery">;

/**
 * Display configuration for a content type.
 */
export interface ContentDisplayConfig<TFieldNames extends string = string> {
  titleField?: TFieldNames;
  slugField?: TFieldNames;
  icon?: string;
  description?: string;
  singleton?: boolean;
  sortOrder?: number;
  fields?: Partial<Record<TFieldNames, FieldMeta>>;
}

/**
 * Configuration for defineContent.
 */
export interface DefineContentConfig<
  TValidator extends Validator<Record<string, unknown>, "required", string>,
> {
  name: string;
  fields: TValidator;
  display?: ContentDisplayConfig<
    TValidator extends Validator<infer T, "required", string>
      ? T extends Record<string, unknown>
        ? keyof T & string
        : string
      : string
  >;
}

/**
 * A content entry with typed data.
 */
export interface ContentEntryWithData<TData> {
  _id: string;
  _creationTime: number;
  contentTypeName: string;
  slug: string;
  status: "draft" | "published" | "archived" | "scheduled";
  data: TData;
  version: number;
  locale?: string;
  createdBy?: string;
  updatedBy?: string;
  firstPublishedAt?: number;
  lastPublishedAt?: number;
  scheduledPublishAt?: number;
  deletedAt?: number;
}

/**
 * Pagination options for list operations.
 */
export interface DefineContentListOptions {
  paginationOpts?: { numItems: number; cursor: string | null };
  status?: "draft" | "published" | "archived" | "scheduled";
  locale?: string;
  includeDeleted?: boolean;
}

/**
 * Pagination result for list operations.
 */
export interface DefineContentPaginatedResult<T> {
  page: T[];
  continueCursor: string | null;
  isDone: boolean;
}

/**
 * Validates that a slug follows the content type naming rules.
 */
function isValidContentTypeSlug(slug: string): boolean {
  return /^[a-z][a-z0-9_]{0,49}$/.test(slug);
}

/**
 * Content type helpers returned by defineContent.
 */
export interface ContentTypeHelpers<TData extends Record<string, unknown>> {
  readonly name: string;
  readonly slug: string;
  readonly definition: ReturnType<typeof defineContentType>;

  get(
    ctx: QueryCtx | MutationCtx,
    args: { id: string }
  ): Promise<ContentEntryWithData<TData> | null>;

  getBySlug(
    ctx: QueryCtx | MutationCtx,
    args: { slug: string; status?: string }
  ): Promise<ContentEntryWithData<TData> | null>;

  list(
    ctx: QueryCtx | MutationCtx,
    args?: DefineContentListOptions
  ): Promise<DefineContentPaginatedResult<ContentEntryWithData<TData>>>;

  create(
    ctx: MutationCtx,
    args: {
      data: TData;
      slug?: string;
      status?: "draft" | "published";
      locale?: string;
      createdBy?: string;
    }
  ): Promise<ContentEntryWithData<TData>>;

  update(
    ctx: MutationCtx,
    args: {
      id: string;
      data?: Partial<TData>;
      slug?: string;
      updatedBy?: string;
    }
  ): Promise<ContentEntryWithData<TData>>;

  publish(
    ctx: MutationCtx,
    args: { id: string; updatedBy?: string }
  ): Promise<ContentEntryWithData<TData>>;

  unpublish(
    ctx: MutationCtx,
    args: { id: string; updatedBy?: string }
  ): Promise<ContentEntryWithData<TData>>;

  delete(
    ctx: MutationCtx,
    args: { id: string; deletedBy?: string; hardDelete?: boolean }
  ): Promise<ContentEntryWithData<TData>>;
}

/**
 * Admin API type returned by defineAdminAPI.
 */
export type AdminApi = ReturnType<typeof defineAdminAPI>;

/**
 * CMS instance created by createCms.
 *
 * Provides a unified API for:
 * - Defining content types with `defineContent()`
 * - Admin API operations via `admin`
 * - Direct access to CmsClient namespaces (contentTypes, contentEntries, etc.)
 * - Locale configuration via `locale`
 * - Configuration access via `config`
 */
export interface CmsInstance {
  /**
   * Define a content type with type-safe helpers.
   *
   * The content type is automatically registered in the in-memory registry
   * and will be available in the admin API.
   */
  defineContent<
    TValidator extends Validator<Record<string, unknown>, "required", string>,
  >(
    config: DefineContentConfig<TValidator>
  ): ContentTypeHelpers<Infer<TValidator>>;

  /**
   * Admin API for the admin UI.
   *
   * Export this from your cms.ts file to make admin operations available:
   * ```typescript
   * export const admin = cms.admin;
   * ```
   */
  readonly admin: AdminApi;

  /**
   * The underlying CmsClient instance.
   *
   * Use this for advanced operations or when you need direct access
   * to CmsClient methods.
   */
  readonly client: CmsClient;

  /**
   * Content type management operations.
   * Delegated from CmsClient.
   */
  readonly contentTypes: ContentTypesApi;

  /**
   * Content entry CRUD and workflow operations.
   * Delegated from CmsClient.
   */
  readonly contentEntries: ContentEntriesApi;

  /**
   * Content version history operations.
   * Delegated from CmsClient.
   */
  readonly versions: VersionsApi;

  /**
   * Media asset management operations.
   * Delegated from CmsClient.
   */
  readonly mediaAssets: MediaAssetsApi;

  /**
   * Media folder organization operations.
   * Delegated from CmsClient.
   */
  readonly mediaFolders: MediaFoldersApi;

  /**
   * Media variant operations (thumbnails, responsive sizes, format conversions).
   * Delegated from CmsClient.
   */
  readonly mediaVariants: MediaVariantsApi;

  /**
   * The resolved configuration for this CMS instance.
   */
  readonly config: ResolvedComponentConfig;

  /**
   * Check if a specific feature is enabled.
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean;

  /**
   * Check if a locale is supported by this configuration.
   */
  isLocaleSupported(locale: LocaleCode): boolean;
}

/**
 * Creates a unified CMS instance with all functionality.
 *
 * This is the main entry point for using convex-cms. It provides:
 * - `defineContent()` for type-safe content type definitions
 * - `admin` for admin UI operations
 * - All CmsClient namespaces (contentTypes, contentEntries, etc.)
 *
 * @param componentApi - The CMS component API from components.convexCms
 * @param config - Optional unified CMS configuration
 * @returns A unified CMS instance
 *
 * @example
 * ```typescript
 * // convex/cms.ts
 * import { createCms } from "convex-cms";
 * import { components } from "./_generated/api";
 * import cmsConfig from "./cms.config";
 *
 * const cms = createCms(components.convexCms, cmsConfig);
 *
 * export const blogPost = cms.defineContent({
 *   name: "Blog Post",
 *   fields: v.object({ title: v.string(), content: v.string() }),
 *   display: { titleField: "title" },
 * });
 *
 * // Export admin API for the admin UI
 * export const admin = cms.admin;
 * ```
 */
export function createCms(
  componentApi: GeneratedComponentApi,
  config?: ComponentConfig | UnifiedCmsConfig
): CmsInstance {
  // Lazy-loaded CmsClient - only created when namespace APIs are accessed
  let _client: CmsClient | null = null;
  const getClient = (): CmsClient => {
    if (!_client) {
      // Lazy import to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const wrapper = require("./wrapper") as { createCmsClient: (api: GeneratedComponentApi, config?: ComponentConfig | UnifiedCmsConfig) => CmsClient };
      _client = wrapper.createCmsClient(componentApi, config);
    }
    return _client;
  };

  // Lazy-loaded admin API
  let _admin: AdminApi | null = null;
  const getAdmin = (): AdminApi => {
    if (!_admin) {
      _admin = defineAdminAPI(componentApi, config ?? {});
    }
    return _admin;
  };

  // Helper to create typed content type helpers
  function createContentTypeHelpers<TData extends Record<string, unknown>>(
    contentConfig: DefineContentConfig<Validator<TData, "required", string>>
  ): ContentTypeHelpers<TData> {
    const slug = toSlug(contentConfig.name);

    if (!isValidContentTypeSlug(slug)) {
      throw new Error(
        `Invalid content type name "${contentConfig.name}". ` +
          `Generated slug "${slug}" must start with a letter and contain only ` +
          `lowercase letters, numbers, and underscores (1-50 characters).`
      );
    }

    // Create the ContentTypeDefinition
    const definition = defineContentType({
      name: slug,
      validator: contentConfig.fields,
      meta: {
        displayName: contentConfig.name,
        description: contentConfig.display?.description,
        icon: contentConfig.display?.icon,
        titleField: contentConfig.display?.titleField,
        slugField: contentConfig.display?.slugField,
        singleton: contentConfig.display?.singleton,
        sortOrder: contentConfig.display?.sortOrder,
        fields: contentConfig.display?.fields as ContentTypeMeta["fields"],
      },
    });

    // Register in the in-memory registry
    registerContentType(definition);

    // Helper to cast entry data to typed version
    const toTypedEntry = (entry: unknown): ContentEntryWithData<TData> | null => {
      if (!entry) return null;
      return entry as ContentEntryWithData<TData>;
    };

    return {
      name: contentConfig.name,
      slug,
      definition,

      async get(ctx, args) {
        const result = await ctx.runQuery(
          componentApi.contentEntries.get,
          { id: args.id }
        );
        return toTypedEntry(result);
      },

      async getBySlug(ctx, args) {
        const result = await ctx.runQuery(
          componentApi.contentEntries.getBySlug,
          {
            contentTypeName: slug,
            slug: args.slug,
            status: args.status,
          }
        );
        return toTypedEntry(result);
      },

      async list(ctx, args = {}) {
        const result = await ctx.runQuery(
          componentApi.contentEntries.list,
          {
            contentTypeName: slug,
            status: args.status,
            locale: args.locale,
            includeDeleted: args.includeDeleted,
            paginationOpts: args.paginationOpts ?? {
              numItems: 50,
              cursor: null,
            },
          }
        );
        return {
          page: (result.page || []).map(toTypedEntry).filter(Boolean) as ContentEntryWithData<TData>[],
          continueCursor: result.continueCursor ?? null,
          isDone: result.isDone ?? true,
        };
      },

      async create(ctx, args) {
        const result = await ctx.runMutation(
          componentApi.contentEntryMutations.createEntry,
          {
            contentTypeName: slug,
            slug: args.slug,
            data: args.data,
            status: args.status ?? "draft",
            locale: args.locale,
            createdBy: args.createdBy,
          }
        );
        return toTypedEntry(result) as ContentEntryWithData<TData>;
      },

      async update(ctx, args) {
        const result = await ctx.runMutation(
          componentApi.contentEntryMutations.updateEntry,
          {
            id: args.id,
            data: args.data,
            slug: args.slug,
            updatedBy: args.updatedBy,
          }
        );
        return toTypedEntry(result) as ContentEntryWithData<TData>;
      },

      async publish(ctx, args) {
        const result = await ctx.runMutation(
          componentApi.contentEntryMutations.publishEntry,
          {
            id: args.id,
            updatedBy: args.updatedBy,
          }
        );
        return toTypedEntry(result) as ContentEntryWithData<TData>;
      },

      async unpublish(ctx, args) {
        const result = await ctx.runMutation(
          componentApi.contentEntryMutations.unpublishEntry,
          {
            id: args.id,
            updatedBy: args.updatedBy,
          }
        );
        return toTypedEntry(result) as ContentEntryWithData<TData>;
      },

      async delete(ctx, args) {
        const result = await ctx.runMutation(
          componentApi.contentEntryMutations.deleteEntry,
          {
            id: args.id,
            deletedBy: args.deletedBy,
            hardDelete: args.hardDelete,
          }
        );
        return toTypedEntry(result) as ContentEntryWithData<TData>;
      },
    };
  }

  return {
    defineContent<
      TValidator extends Validator<Record<string, unknown>, "required", string>,
    >(
      contentConfig: DefineContentConfig<TValidator>
    ): ContentTypeHelpers<Infer<TValidator>> {
      return createContentTypeHelpers(contentConfig as DefineContentConfig<Validator<Infer<TValidator>, "required", string>>);
    },

    // Lazy-loaded admin API
    get admin() { return getAdmin(); },

    // Lazy-loaded CmsClient
    get client() { return getClient(); },

    // Delegate namespace APIs to CmsClient (lazily loaded)
    get contentTypes() { return getClient().contentTypes; },
    get contentEntries() { return getClient().contentEntries; },
    get versions() { return getClient().versions; },
    get mediaAssets() { return getClient().mediaAssets; },
    get mediaFolders() { return getClient().mediaFolders; },
    get mediaVariants() { return getClient().mediaVariants; },

    // Delegate config and utility methods to CmsClient (lazily loaded)
    get config() { return getClient().config; },
    isFeatureEnabled(feature) { return getClient().isFeatureEnabled(feature); },
    isLocaleSupported(locale) { return getClient().isLocaleSupported(locale); },
  };
}

// =============================================================================
// Typed Helpers Factory
// =============================================================================

/**
 * Infer the data type from a ContentTypeDefinition's validator.
 */
type InferDefinitionData<T> = T extends { validator: Validator<infer D, "required", string> }
  ? D
  : Record<string, unknown>;

/**
 * Typed helpers for a collection of content type definitions.
 */
export type TypedHelpersResult<T extends Record<string, { slug: string; validator: Validator<Record<string, unknown>, "required", string> }>> = {
  [K in keyof T]: ContentTypeHelpers<InferDefinitionData<T[K]>>;
};

/**
 * Creates typed CRUD helpers from content type definitions.
 *
 * This bridges `defineContentType()` definitions with type-safe helper methods.
 * Use this when you want type-safe data access without using `createCms().defineContent()`.
 *
 * @example
 * ```typescript
 * // convex/cms.ts
 * import { defineContentType, createTypedHelpers } from "convex-cms";
 * import { components } from "./_generated/api";
 * import { v } from "convex/values";
 *
 * // Define content types (for admin API and type info)
 * export const roadmapItem = defineContentType({
 *   name: "Roadmap Item",
 *   validator: v.object({
 *     title: v.string(),
 *     status: v.union(v.literal("planned"), v.literal("completed")),
 *   }),
 *   meta: { titleField: "title" },
 * });
 *
 * export const changelogEntry = defineContentType({
 *   name: "Changelog Entry",
 *   validator: v.object({
 *     title: v.string(),
 *     version: v.string(),
 *   }),
 *   meta: { titleField: "title" },
 * });
 *
 * // Create typed helpers for programmatic access
 * export const content = createTypedHelpers(components.cms, {
 *   roadmap: roadmapItem,
 *   changelog: changelogEntry,
 * });
 *
 * // Usage in Convex functions:
 * const items = await content.roadmap.list(ctx, { status: "published" });
 * items.page[0].data.title; // ✅ Typed as string
 * items.page[0].data.status; // ✅ Typed as "planned" | "completed"
 * ```
 *
 * @param componentApi - The CMS component API (components.cms)
 * @param definitions - A record of content type definitions
 * @returns An object with typed helper methods for each content type
 */
export function createTypedHelpers<
  T extends Record<string, { slug: string; validator: Validator<Record<string, unknown>, "required", string>; name: string; meta: ContentTypeMeta }>
>(
  componentApi: GeneratedComponentApi,
  definitions: T
): TypedHelpersResult<T> {
  const result = {} as TypedHelpersResult<T>;

  for (const [key, definition] of Object.entries(definitions)) {
    const slug = definition.slug;

    registerContentType(definition as ReturnType<typeof defineContentType>);

    const toTypedEntry = <TData>(entry: unknown): ContentEntryWithData<TData> | null => {
      if (!entry) return null;
      return entry as ContentEntryWithData<TData>;
    };

    const helpers: ContentTypeHelpers<InferDefinitionData<typeof definition>> = {
      name: definition.name,
      slug,
      definition: definition as ReturnType<typeof defineContentType>,

      async get(ctx, args) {
        const entry = await ctx.runQuery(componentApi.contentEntries.get, { id: args.id });
        return toTypedEntry(entry);
      },

      async getBySlug(ctx, args) {
        const entry = await ctx.runQuery(componentApi.contentEntries.getBySlug, {
          contentTypeName: slug,
          slug: args.slug,
          status: args.status,
        });
        return toTypedEntry(entry);
      },

      async list(ctx, args = {}) {
        const result = await ctx.runQuery(componentApi.contentEntries.list, {
          contentTypeName: slug,
          status: args.status,
          locale: args.locale,
          includeDeleted: args.includeDeleted,
          paginationOpts: args.paginationOpts ?? { numItems: 50, cursor: null },
        });
        return {
          page: (result.page || []).map(toTypedEntry).filter(Boolean) as ContentEntryWithData<InferDefinitionData<typeof definition>>[],
          continueCursor: result.continueCursor ?? null,
          isDone: result.isDone ?? true,
        };
      },

      async create(ctx, args) {
        const entry = await ctx.runMutation(componentApi.contentEntryMutations.createEntry, {
          contentTypeName: slug,
          slug: args.slug,
          data: args.data,
          status: args.status ?? "draft",
          locale: args.locale,
          createdBy: args.createdBy,
        });
        return toTypedEntry(entry) as ContentEntryWithData<InferDefinitionData<typeof definition>>;
      },

      async update(ctx, args) {
        const entry = await ctx.runMutation(componentApi.contentEntryMutations.updateEntry, {
          id: args.id,
          data: args.data,
          slug: args.slug,
          updatedBy: args.updatedBy,
        });
        return toTypedEntry(entry) as ContentEntryWithData<InferDefinitionData<typeof definition>>;
      },

      async publish(ctx, args) {
        const entry = await ctx.runMutation(componentApi.contentEntryMutations.publishEntry, {
          id: args.id,
          updatedBy: args.updatedBy,
        });
        return toTypedEntry(entry) as ContentEntryWithData<InferDefinitionData<typeof definition>>;
      },

      async unpublish(ctx, args) {
        const entry = await ctx.runMutation(componentApi.contentEntryMutations.unpublishEntry, {
          id: args.id,
          updatedBy: args.updatedBy,
        });
        return toTypedEntry(entry) as ContentEntryWithData<InferDefinitionData<typeof definition>>;
      },

      async delete(ctx, args) {
        const entry = await ctx.runMutation(componentApi.contentEntryMutations.deleteEntry, {
          id: args.id,
          deletedBy: args.deletedBy,
          hardDelete: args.hardDelete,
        });
        return toTypedEntry(entry) as ContentEntryWithData<InferDefinitionData<typeof definition>>;
      },
    };

    (result as Record<string, unknown>)[key] = helpers;
  }

  return result;
}
