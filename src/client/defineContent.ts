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

// =============================================================================
// Taxonomy Term Resolution
// =============================================================================

/**
 * Identifies fields in a content type that store taxonomy term IDs
 * and need resolution to display names.
 */
function getTaxonomyFields(
  meta: ContentTypeMeta | undefined
): { fieldName: string; taxonomyName?: string; taxonomyId?: string }[] {
  if (!meta?.fields) return [];
  const result: { fieldName: string; taxonomyName?: string; taxonomyId?: string }[] = [];
  for (const [fieldName, fieldMeta] of Object.entries(meta.fields)) {
    if (!fieldMeta) continue;
    if (
      (fieldMeta.renderAs === "tags" || fieldMeta.renderAs === "category") &&
      (fieldMeta.taxonomyName || fieldMeta.taxonomyId)
    ) {
      result.push({
        fieldName,
        taxonomyName: fieldMeta.taxonomyName,
        taxonomyId: fieldMeta.taxonomyId,
      });
    }
  }
  return result;
}

/**
 * Resolves taxonomy term IDs in entry data to human-readable names.
 *
 * For fields with `renderAs: "tags"` or `renderAs: "category"` that reference
 * a taxonomy, replaces term ID arrays with term name arrays. This happens
 * transparently so consumers get `["Halal", "Gluten-Free"]` instead of raw IDs.
 */
async function resolveEntryTerms<TData extends Record<string, unknown>>(
  ctx: QueryCtx,
  componentApi: GeneratedComponentApi,
  data: TData,
  taxonomyFields: { fieldName: string; taxonomyName?: string; taxonomyId?: string }[]
): Promise<TData> {
  if (taxonomyFields.length === 0) return data;

  // Collect all unique taxonomy references and term IDs
  const termIdsToResolve = new Set<string>();
  const taxonomyNameToId = new Map<string, string>();

  for (const field of taxonomyFields) {
    const value = data[field.fieldName];
    if (!value) continue;

    const ids = Array.isArray(value) ? value : [value];
    for (const id of ids) {
      if (typeof id === "string" && id.length > 15) {
        termIdsToResolve.add(id);
      }
    }

    // Resolve taxonomy name → ID. Supports both taxonomyName and taxonomyId
    // (taxonomyId may contain a name/slug for backwards compatibility).
    const nameToResolve = field.taxonomyName ?? field.taxonomyId;
    if (nameToResolve && !taxonomyNameToId.has(nameToResolve)) {
      const taxonomy = await ctx.runQuery(componentApi.taxonomies.get, {
        name: nameToResolve,
      });
      if (taxonomy) {
        taxonomyNameToId.set(nameToResolve, taxonomy._id);
      }
    }
  }

  if (termIdsToResolve.size === 0) return data;

  // Batch-fetch terms by taxonomy
  const termIdToSlug = new Map<string, string>();
  const resolvedTaxonomyIds = new Set<string>();

  for (const field of taxonomyFields) {
    // Resolve via name lookup first, fall back to raw taxonomyId as document ID
    const nameKey = field.taxonomyName ?? field.taxonomyId;
    const taxId = (nameKey ? taxonomyNameToId.get(nameKey) : undefined) ?? field.taxonomyId;
    if (!taxId || resolvedTaxonomyIds.has(taxId)) continue;
    resolvedTaxonomyIds.add(taxId);

    const terms = await ctx.runQuery(componentApi.taxonomies.listTerms, {
      taxonomyId: taxId as any, // component expects v.id("taxonomies")
      paginationOpts: { numItems: 200, cursor: null },
    });

    for (const term of terms.page) {
      // Resolve to slug (stable identifier) rather than name (display label).
      // Consumers use slugs for filtering/matching; they can look up display
      // names from their own taxonomy queries.
      termIdToSlug.set(term._id, term.slug ?? term.name);
    }
  }

  // Replace term IDs with slugs in a shallow copy of data
  const resolved = { ...data };
  for (const field of taxonomyFields) {
    const value = resolved[field.fieldName];
    if (!value) continue;

    if (Array.isArray(value)) {
      (resolved as any)[field.fieldName] = value.map(
        (id: string) => termIdToSlug.get(id) ?? id
      );
    } else if (typeof value === "string") {
      (resolved as any)[field.fieldName] = termIdToSlug.get(value) ?? value;
    }
  }

  return resolved;
}

// =============================================================================
// Media Asset URL Resolution
// =============================================================================

/**
 * Identifies fields in a content type that store media asset IDs.
 */
function getMediaFields(
  meta: ContentTypeMeta | undefined
): string[] {
  if (!meta?.fields) return [];
  const result: string[] = [];
  for (const [fieldName, fieldMeta] of Object.entries(meta.fields)) {
    if (!fieldMeta) continue;
    if (fieldMeta.renderAs === "media") {
      result.push(fieldName);
    }
  }
  return result;
}

/**
 * Resolves media asset IDs in entry data to public URLs.
 *
 * For fields with `renderAs: "media"`, replaces asset document IDs with
 * publicly accessible URLs from Convex storage. Handles both single values
 * and arrays (galleries). Falls back to the original value if resolution fails.
 */
async function resolveEntryMedia<TData extends Record<string, unknown>>(
  ctx: QueryCtx,
  componentApi: GeneratedComponentApi,
  data: TData,
  mediaFieldNames: string[]
): Promise<TData> {
  if (mediaFieldNames.length === 0) return data;

  // Collect all unique asset IDs
  const assetIds = new Set<string>();
  for (const fieldName of mediaFieldNames) {
    const value = data[fieldName];
    if (!value) continue;
    const ids = Array.isArray(value) ? value : [value];
    for (const id of ids) {
      if (typeof id === "string" && id.length > 10) {
        assetIds.add(id);
      }
    }
  }

  if (assetIds.size === 0) return data;

  // Batch-fetch asset URLs in parallel
  const idToUrl = new Map<string, string>();
  const fetchPromises = Array.from(assetIds).map(async (id) => {
    try {
      const asset = await ctx.runQuery(componentApi.mediaAssets.get, {
        id: id as any, // component expects v.id("mediaItems")
      });
      if (asset?.url) {
        idToUrl.set(id, asset.url);
      }
    } catch {
      // Invalid ID or asset not found — leave original value
    }
  });
  await Promise.all(fetchPromises);

  if (idToUrl.size === 0) return data;

  // Replace asset IDs with URLs
  const resolved = { ...data };
  for (const fieldName of mediaFieldNames) {
    const value = resolved[fieldName];
    if (!value) continue;

    if (Array.isArray(value)) {
      (resolved as any)[fieldName] = value.map(
        (id: string) => idToUrl.get(id) ?? id
      );
    } else if (typeof value === "string") {
      (resolved as any)[fieldName] = idToUrl.get(value) ?? value;
    }
  }

  return resolved;
}

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

    // Detect fields that need automatic resolution
    const taxFields = getTaxonomyFields(definition.meta);
    const mediaFields = getMediaFields(definition.meta);
    const needsResolution = taxFields.length > 0 || mediaFields.length > 0;

    // Resolve taxonomy term IDs and media asset IDs in entry data
    const resolveEntry = async (
      ctx: QueryCtx,
      entry: ContentEntryWithData<TData> | null
    ): Promise<ContentEntryWithData<TData> | null> => {
      if (!entry || !needsResolution) return entry;
      let data = entry.data;
      if (taxFields.length > 0) {
        data = await resolveEntryTerms(ctx, componentApi, data, taxFields);
      }
      if (mediaFields.length > 0) {
        data = await resolveEntryMedia(ctx, componentApi, data, mediaFields);
      }
      return { ...entry, data };
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
        return resolveEntry(ctx, toTypedEntry(result));
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
        return resolveEntry(ctx, toTypedEntry(result));
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
        const page = (result.page || []).map(toTypedEntry).filter(Boolean) as ContentEntryWithData<TData>[];
        return {
          page: await Promise.all(page.map((e) => resolveEntry(ctx, e))) as ContentEntryWithData<TData>[],
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

    type TData = InferDefinitionData<typeof definition>;

    const toTypedEntry = (entry: unknown): ContentEntryWithData<TData> | null => {
      if (!entry) return null;
      return entry as ContentEntryWithData<TData>;
    };

    // Detect fields that need automatic resolution
    const taxFields = getTaxonomyFields(definition.meta);
    const mediaFields = getMediaFields(definition.meta);
    const needsResolution = taxFields.length > 0 || mediaFields.length > 0;

    const resolveEntry = async (
      ctx: QueryCtx,
      entry: ContentEntryWithData<TData> | null
    ): Promise<ContentEntryWithData<TData> | null> => {
      if (!entry || !needsResolution) return entry;
      let data = entry.data as Record<string, unknown>;
      if (taxFields.length > 0) {
        data = await resolveEntryTerms(ctx, componentApi, data, taxFields);
      }
      if (mediaFields.length > 0) {
        data = await resolveEntryMedia(ctx, componentApi, data, mediaFields);
      }
      return { ...entry, data: data as TData };
    };

    const helpers: ContentTypeHelpers<TData> = {
      name: definition.name,
      slug,
      definition: definition as ReturnType<typeof defineContentType>,

      async get(ctx, args) {
        const entry = await ctx.runQuery(componentApi.contentEntries.get, { id: args.id });
        return resolveEntry(ctx, toTypedEntry(entry));
      },

      async getBySlug(ctx, args) {
        const entry = await ctx.runQuery(componentApi.contentEntries.getBySlug, {
          contentTypeName: slug,
          slug: args.slug,
          status: args.status,
        });
        return resolveEntry(ctx, toTypedEntry(entry));
      },

      async list(ctx, args = {}) {
        const result = await ctx.runQuery(componentApi.contentEntries.list, {
          contentTypeName: slug,
          status: args.status,
          locale: args.locale,
          includeDeleted: args.includeDeleted,
          paginationOpts: args.paginationOpts ?? { numItems: 50, cursor: null },
        });
        const page = (result.page || []).map(toTypedEntry).filter(Boolean) as ContentEntryWithData<TData>[];
        return {
          page: await Promise.all(page.map((e) => resolveEntry(ctx, e))) as ContentEntryWithData<TData>[],
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

// =============================================================================
// Taxonomy Helpers
// =============================================================================

/**
 * A taxonomy term as returned by the CMS.
 *
 * These are the classification labels (tags, categories) managed through
 * the CMS admin Taxonomies section.
 */
export interface TaxonomyTerm {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  depth: number;
  usageCount: number;
  parentId?: string;
}

/**
 * A taxonomy definition as returned by the CMS.
 */
export interface Taxonomy {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  isHierarchical: boolean;
  isActive: boolean;
}

/**
 * Helpers for querying taxonomy terms from Convex functions.
 *
 * Created by `createTaxonomyHelpers()`. Provides a typed API for
 * fetching terms by taxonomy name without manual query boilerplate.
 *
 * @example
 * ```typescript
 * const taxonomies = createTaxonomyHelpers(components.cms);
 *
 * // In a query:
 * const categories = await taxonomies.getTerms(ctx, "menu_categories");
 * // Returns TaxonomyTerm[] sorted by sortOrder
 * ```
 */
export interface TaxonomyHelpers {
  /**
   * Get all terms in a taxonomy by name.
   * Returns terms sorted by sortOrder, with display-ready fields.
   */
  getTerms(
    ctx: QueryCtx,
    taxonomyName: string,
    options?: { limit?: number }
  ): Promise<TaxonomyTerm[]>;

  /**
   * Get a single term by taxonomy name and term slug.
   */
  getTerm(
    ctx: QueryCtx,
    taxonomyName: string,
    termSlug: string
  ): Promise<TaxonomyTerm | null>;

  /**
   * List all active taxonomies.
   */
  listTaxonomies(ctx: QueryCtx): Promise<Taxonomy[]>;
}

/**
 * Creates typed helpers for querying CMS taxonomies from Convex functions.
 *
 * This provides a clean API for taxonomy access without requiring consumers
 * to write admin API query boilerplate or define their own term types.
 *
 * @example
 * ```typescript
 * // convex/cms.ts
 * import { createTaxonomyHelpers } from "convex-cms";
 * import { components } from "./_generated/api";
 *
 * export const taxonomies = createTaxonomyHelpers(components.cms);
 *
 * // convex/menu.ts
 * import { taxonomies } from "./cms";
 *
 * export const getCategories = query({
 *   args: {},
 *   handler: async (ctx) => {
 *     return taxonomies.getTerms(ctx, "menu_categories");
 *   },
 * });
 * ```
 */
export function createTaxonomyHelpers(
  componentApi: GeneratedComponentApi
): TaxonomyHelpers {
  // Cache taxonomy name → ID lookups per query context
  const taxonomyNameCache = new Map<string, string>();

  async function resolveTaxonomyId(
    ctx: QueryCtx,
    taxonomyName: string
  ): Promise<string | null> {
    if (taxonomyNameCache.has(taxonomyName)) {
      return taxonomyNameCache.get(taxonomyName)!;
    }
    const taxonomy = await ctx.runQuery(componentApi.taxonomies.get, {
      name: taxonomyName,
    });
    if (taxonomy) {
      taxonomyNameCache.set(taxonomyName, taxonomy._id);
      return taxonomy._id;
    }
    return null;
  }

  return {
    async getTerms(ctx, taxonomyName, options) {
      const taxonomyId = await resolveTaxonomyId(ctx, taxonomyName);
      if (!taxonomyId) return [];

      const result = await ctx.runQuery(componentApi.taxonomies.listTerms, {
        taxonomyId: taxonomyId as any,
        paginationOpts: { numItems: options?.limit ?? 100, cursor: null },
      });

      return (result.page as TaxonomyTerm[])
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },

    async getTerm(ctx, taxonomyName, termSlug) {
      const taxonomyId = await resolveTaxonomyId(ctx, taxonomyName);
      if (!taxonomyId) return null;

      const term = await ctx.runQuery(componentApi.taxonomies.getTerm, {
        taxonomyId: taxonomyId as any,
        slug: termSlug,
      });

      return term as TaxonomyTerm | null;
    },

    async listTaxonomies(ctx) {
      const result = await ctx.runQuery(componentApi.taxonomies.list, {
        isActive: true,
      });
      return result.page as Taxonomy[];
    },
  };
}
