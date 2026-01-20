/**
 * TypeScript type definitions for the Convex CMS component.
 *
 * These types are derived from the schema validators and can be used
 * in parent applications for type-safe CMS operations.
 *
 * Note: All IDs are strings at the component API boundary
 * (Convex component IDs become strings when crossing the boundary).
 */

// =============================================================================
// Component Configuration
// =============================================================================

/**
 * Supported locales for content localization.
 * Follows IETF BCP 47 language tag format.
 */
export type LocaleCode = string;

/**
 * Feature flags for enabling/disabling CMS capabilities.
 */
export interface FeatureFlags {
  /**
   * Enable content versioning and history tracking.
   * When enabled, creates version snapshots on content changes.
   * @default true
   */
  versioning?: boolean;

  /**
   * Enable content scheduling for future publish/unpublish.
   * @default true
   */
  scheduling?: boolean;

  /**
   * Enable multi-locale content support.
   * When enabled, content entries can have locale-specific variants.
   * @default false
   */
  localization?: boolean;

  /**
   * Enable media asset management features.
   * @default true
   */
  mediaManagement?: boolean;

  /**
   * Enable content entry locking to prevent concurrent edits.
   * @default true
   */
  contentLocking?: boolean;

  /**
   * Enable soft delete for content and media (recoverable).
   * When disabled, deletions are permanent.
   * @default true
   */
  softDelete?: boolean;

  /**
   * Enable full-text search indexing for content.
   * @default true
   */
  searchIndexing?: boolean;
}

/**
 * Configuration options for the Convex CMS component.
 *
 * @example
 * ```typescript
 * const config: ComponentConfig = {
 *   defaultLocale: "en-US",
 *   supportedLocales: ["en-US", "es-ES", "fr-FR"],
 *   features: {
 *     versioning: true,
 *     localization: true,
 *     scheduling: true,
 *   },
 * };
 * ```
 */
export interface ComponentConfig {
  /**
   * Default locale for content when no locale is specified.
   * @default "en"
   */
  defaultLocale?: LocaleCode;

  /**
   * List of supported locales for content localization.
   * Only relevant when `features.localization` is enabled.
   * @default ["en"]
   */
  supportedLocales?: LocaleCode[];

  /**
   * Feature flags to enable/disable specific CMS capabilities.
   */
  features?: FeatureFlags;

  /**
   * Maximum number of versions to retain per content entry.
   * Older versions are automatically pruned.
   * Set to 0 for unlimited versions.
   * @default 50
   */
  maxVersionsPerEntry?: number;

  /**
   * Default lock duration in milliseconds for content locking.
   * @default 300000 (5 minutes)
   */
  lockDurationMs?: number;

  /**
   * Maximum file size for media uploads in bytes.
   * @default 52428800 (50MB)
   */
  maxMediaFileSize?: number;
}

/**
 * Default component configuration values.
 */
export const DEFAULT_CONFIG: Required<ComponentConfig> = {
  defaultLocale: "en",
  supportedLocales: ["en"],
  features: {
    versioning: true,
    scheduling: true,
    localization: false,
    mediaManagement: true,
    contentLocking: true,
    softDelete: true,
    searchIndexing: true,
  },
  maxVersionsPerEntry: 50,
  lockDurationMs: 300000, // 5 minutes
  maxMediaFileSize: 52428800, // 50MB
};

/**
 * Merges user configuration with defaults.
 * @param config - User-provided configuration
 * @returns Complete configuration with defaults applied
 */
export function resolveConfig(config?: ComponentConfig): Required<ComponentConfig> {
  return {
    defaultLocale: config?.defaultLocale ?? DEFAULT_CONFIG.defaultLocale,
    supportedLocales: config?.supportedLocales ?? DEFAULT_CONFIG.supportedLocales,
    features: {
      ...DEFAULT_CONFIG.features,
      ...config?.features,
    },
    maxVersionsPerEntry: config?.maxVersionsPerEntry ?? DEFAULT_CONFIG.maxVersionsPerEntry,
    lockDurationMs: config?.lockDurationMs ?? DEFAULT_CONFIG.lockDurationMs,
    maxMediaFileSize: config?.maxMediaFileSize ?? DEFAULT_CONFIG.maxMediaFileSize,
  };
}

// =============================================================================
// Field Types
// =============================================================================

/**
 * Supported field types for content type definitions.
 */
export type FieldType =
  | "text"
  | "richText"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "reference"
  | "media"
  | "json"
  | "select"
  | "multiSelect";

/**
 * Field-specific configuration options.
 */
export interface FieldOptions {
  // Text fields
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Number fields
  min?: number;
  max?: number;
  step?: number;
  precision?: number;

  // Reference fields
  /** Array of content type names that can be referenced */
  allowedContentTypes?: string[];
  /** If true, accepts multiple references (array of IDs) */
  multiple?: boolean;
  /** Minimum number of references required (only when multiple is true) */
  minItems?: number;

  // Media fields
  allowedMimeTypes?: string[];
  maxFileSize?: number;

  // Select fields
  options?: Array<{
    value: string;
    label: string;
  }>;

  // Rich text fields
  allowedBlocks?: string[];
  allowedMarks?: string[];
}

// =============================================================================
// Reference Field Types
// =============================================================================

/**
 * A single reference to another content entry.
 * This is the value stored when `multiple: false` (default).
 */
export type SingleReference = string;

/**
 * Multiple references to other content entries.
 * This is the value stored when `multiple: true`.
 */
export type MultipleReferences = string[];

/**
 * Reference field value type.
 * Use this type when working with reference field values in content data.
 *
 * @example
 * ```typescript
 * interface BlogPostData {
 *   title: string;
 *   author: SingleReference;  // Single reference to a user
 *   relatedPosts: MultipleReferences;  // Multiple references to posts
 * }
 * ```
 */
export type ReferenceValue = SingleReference | MultipleReferences;

/**
 * A resolved reference with full content entry details.
 * This is the structure returned when populating references.
 */
export interface ResolvedReference {
  /** The content entry ID */
  id: string;
  /** The content type name */
  contentTypeName: string;
  /** The content type display name */
  contentTypeDisplayName: string;
  /** The entry's URL slug */
  slug: string;
  /** The entry's publishing status */
  status: ContentStatus;
  /** The entry's data (field values) */
  data: Record<string, unknown>;
  /** Whether the referenced entry exists */
  exists: boolean;
}

/**
 * A field definition within a content type.
 */
export interface FieldDefinition {
  /** Unique identifier for the field within the content type */
  name: string;
  /** Human-readable label for the field */
  label: string;
  /** The type of field */
  type: FieldType;
  /** Whether this field is required */
  required: boolean;
  /** Whether this field should be indexed for search */
  searchable?: boolean;
  /** Whether this field should support localization */
  localized?: boolean;
  /** Optional description/help text for the field */
  description?: string;
  /** Default value for the field */
  defaultValue?: unknown;
  /** Field-specific configuration options */
  options?: FieldOptions;
}

// =============================================================================
// Content Status
// =============================================================================

/**
 * Publishing status for content entries.
 */
export type ContentStatus = "draft" | "published" | "archived" | "scheduled";

// =============================================================================
// Media Types
// =============================================================================

/**
 * Classification of media assets.
 */
export type MediaType = "image" | "video" | "audio" | "document" | "other";

// =============================================================================
// Content Type
// =============================================================================

/**
 * A content type definition.
 */
export interface ContentType {
  _id: string;
  _creationTime: number;
  /** Unique machine-readable name (e.g., "blog_post") */
  name: string;
  /** Human-readable display name (e.g., "Blog Post") */
  displayName: string;
  /** Optional description */
  description?: string;
  /** Array of field definitions */
  fields: FieldDefinition[];
  /** Icon identifier for UI display */
  icon?: string;
  /** Whether only one entry is allowed */
  singleton?: boolean;
  /** Field name to use for generating slugs */
  slugField?: string;
  /** Field name to use as the display title */
  titleField?: string;
  /** Custom sort order for admin UI */
  sortOrder?: number;
  /** Whether the content type is active */
  isActive: boolean;
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who created this type */
  createdBy?: string;
  /** User who last updated this type */
  updatedBy?: string;
}

// =============================================================================
// Content Entry
// =============================================================================

/**
 * A content entry instance.
 */
export interface ContentEntry {
  _id: string;
  _creationTime: number;
  /** Reference to the content type */
  contentTypeId: string;
  /** URL-friendly slug */
  slug: string;
  /** Publishing status */
  status: ContentStatus;
  /** The actual content data */
  data: Record<string, unknown>;
  /** Locale code (e.g., "en-US") */
  locale?: string;
  /** Reference to primary entry for localized variants */
  primaryEntryId?: string;
  /** Current version number */
  version: number;
  /** Scheduled publish timestamp */
  scheduledPublishAt?: number;
  /** First publish timestamp */
  firstPublishedAt?: number;
  /** Last publish timestamp */
  lastPublishedAt?: number;
  /** User who has locked the entry */
  lockedBy?: string;
  /** Lock expiration timestamp */
  lockExpiresAt?: number;
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who created this entry */
  createdBy?: string;
  /** User who last updated this entry */
  updatedBy?: string;
}

// =============================================================================
// Content Version
// =============================================================================

/**
 * A version snapshot of a content entry.
 */
export interface ContentVersion {
  _id: string;
  _creationTime: number;
  /** Reference to the content entry */
  entryId: string;
  /** Version number */
  versionNumber: number;
  /** Snapshot of the content data */
  data: Record<string, unknown>;
  /** Snapshot of the slug */
  slug: string;
  /** Status when version was created */
  status: ContentStatus;
  /** Description of changes */
  changeDescription?: string;
  /** User who created this version */
  createdBy?: string;
  /** Whether this version was published */
  wasPublished: boolean;
  /** When this version was published */
  publishedAt?: number;
}

// =============================================================================
// Media Asset
// =============================================================================

/**
 * A media asset record.
 */
export interface MediaAsset {
  _id: string;
  _creationTime: number;
  /** Convex storage ID */
  storageId: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Classified media type */
  type: MediaType;
  /** Human-readable title */
  title?: string;
  /** Description/caption */
  description?: string;
  /** Alt text for accessibility */
  altText?: string;
  /** Reference to containing folder */
  folderId?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Duration in seconds (video/audio) */
  duration?: number;
  /** Additional extracted metadata */
  metadata?: Record<string, unknown>;
  /** Tags for organization */
  tags?: string[];
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who uploaded this asset */
  createdBy?: string;
}

// =============================================================================
// Media Folder
// =============================================================================

/**
 * A folder for organizing media assets.
 */
export interface MediaFolder {
  _id: string;
  _creationTime: number;
  /** Folder name */
  name: string;
  /** Reference to parent folder */
  parentId?: string;
  /** Full path from root */
  path: string;
  /** Description */
  description?: string;
  /** Custom sort order */
  sortOrder?: number;
  /** Soft delete timestamp */
  deletedAt?: number;
  /** User who created this folder */
  createdBy?: string;
}

// =============================================================================
// Pagination
// =============================================================================

/**
 * Legacy paginated response shape.
 * @deprecated Use PaginationResult for new implementations.
 */
export interface PaginatedResponse<T> {
  items: T[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * Standard Convex pagination result format.
 * This is compatible with:
 * - Convex's usePaginatedQuery React hook
 * - convex-helpers paginator
 * - Standard Convex pagination patterns
 */
export interface PaginationResult<T> {
  /** Array of items for the current page */
  page: T[];
  /** Cursor to continue fetching (null if no more results) */
  continueCursor: string | null;
  /** Whether this is the last page (no more results available) */
  isDone: boolean;
}

/**
 * Standard Convex pagination options.
 * Pass this to paginated queries.
 */
export interface PaginationOpts {
  /** Number of items to fetch per page */
  numItems: number;
  /** Cursor from previous page's continueCursor (omit for first page) */
  cursor?: string | null;
}

// =============================================================================
// Query Options
// =============================================================================

/**
 * Options for querying content entries with cursor-based pagination.
 */
export interface ContentQueryOptions {
  contentTypeId?: string;
  contentTypeName?: string;
  /** Filter by a single status (for backward compatibility) */
  status?: ContentStatus;
  /**
   * Filter by multiple statuses.
   * Useful for admin views that need to show draft AND scheduled content.
   *
   * @example
   * ```typescript
   * // Show all non-archived content in admin
   * const { page, continueCursor, isDone } = await cms.contentEntries.list(ctx, {
   *   statusIn: ["draft", "published", "scheduled"],
   *   paginationOpts: { numItems: 20 },
   * });
   *
   * // Show only editorial content (not yet published)
   * const { page } = await cms.contentEntries.list(ctx, {
   *   statusIn: ["draft", "scheduled"],
   *   paginationOpts: { numItems: 10 },
   * });
   * ```
   */
  statusIn?: ContentStatus[];
  locale?: string;
  search?: string;
  includeDeleted?: boolean;
  /**
   * Pagination options using standard Convex format.
   * Compatible with usePaginatedQuery hook.
   */
  paginationOpts: PaginationOpts;
}

/**
 * Options for querying media assets.
 */
export interface MediaQueryOptions {
  folderId?: string;
  type?: MediaType;
  mimeType?: string;
  search?: string;
  tags?: string[];
  includeDeleted?: boolean;
  cursor?: string;
  limit?: number;
}

// =============================================================================
// Component API Types
// =============================================================================

/**
 * Represents the API interface for the Convex CMS component.
 *
 * This type is used to provide type-safe access to the component's
 * functions when integrating with a parent application.
 *
 * @example
 * ```typescript
 * // Type-safe component API access
 * import type { ComponentApi } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * // The components.convexCms object is typed as ComponentApi
 * const cms: ComponentApi = components.convexCms;
 *
 * // Now you get full autocomplete and type checking
 * await ctx.runMutation(cms.contentTypes.create, { ... });
 * ```
 */
export interface ComponentApi {
  /**
   * Content type management functions.
   * Content types define the schema for content entries.
   */
  contentTypes: {
    create: unknown;
    update: unknown;
    delete: unknown;
    get: unknown;
    list: unknown;
  };

  /**
   * Content entry CRUD and workflow functions.
   */
  contentEntries: {
    create: unknown;
    update: unknown;
    delete: unknown;
    get: unknown;
    list: unknown;
    publish: unknown;
    unpublish: unknown;
    schedule: unknown;
  };

  /**
   * Content version history functions.
   */
  versions: {
    list: unknown;
    get: unknown;
    rollback: unknown;
  };

  /**
   * Media asset management functions.
   */
  mediaAssets: {
    create: unknown;
    update: unknown;
    delete: unknown;
    get: unknown;
    list: unknown;
  };

  /**
   * Media folder organization functions.
   */
  mediaFolders: {
    create: unknown;
    update: unknown;
    delete: unknown;
    get: unknown;
    list: unknown;
    move: unknown;
  };
}

/**
 * Base CMS Client interface with configuration and helper methods.
 *
 * @deprecated Use `EnhancedCmsClient` from the wrapper module for typed method access.
 * This interface is kept for backwards compatibility.
 *
 * @see EnhancedCmsClient for the full typed client with method wrappers
 */
export interface CmsClient {
  /**
   * The resolved configuration for this client instance.
   */
  readonly config: Required<ComponentConfig>;

  /**
   * The underlying component API reference.
   */
  readonly api: ComponentApi;

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
