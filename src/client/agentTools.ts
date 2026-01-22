/**
 * @convex-cms/core Agent Tools
 *
 * Tool-compatible function wrappers for @convex-dev/agent integration.
 * Provides structured tool definitions with clear parameter schemas for
 * content creation, querying, and management.
 *
 * @example
 * ```typescript
 * import { Agent } from "@convex-dev/agent";
 * import { createCmsTools } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * const cmsTools = createCmsTools(components.convexCms);
 *
 * const contentAgent = new Agent(components.agent, {
 *   name: "Content Manager",
 *   languageModel: openai.chat("gpt-4o"),
 *   tools: cmsTools,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Use individual tools
 * import { createCmsTools } from "@convex-cms/core";
 *
 * const { createContentEntry, listContentEntries, publishEntry } = createCmsTools(api);
 *
 * const agent = new Agent(components.agent, {
 *   tools: { createContentEntry, publishEntry },
 * });
 * ```
 */

import { createTool } from "@convex-dev/agent";
import { z } from "zod";

// =============================================================================
// Component API Type
// =============================================================================

/**
 * The component API type for agent tools.
 * This represents the actual structure of `components.convexCms` from the generated API.
 *
 * Uses `any` for internal function references since the exact types depend on
 * the generated Convex types which vary per project.
 *
 * Note: This matches the actual Convex component module structure:
 * - contentTypes: queries in contentTypes.ts (get handles both ID and name lookup via args)
 * - contentTypeMutations: mutations in contentTypeMutations.ts
 * - contentEntries: queries in contentEntries.ts
 * - contentEntryMutations: mutations in contentEntryMutations.ts
 * - scheduledPublish: schedule-related mutations in scheduledPublish.ts (separate module)
 * - mediaAssets: queries in mediaAssets.ts
 * - mediaAssetMutations: mutations in mediaAssetMutations.ts
 * - bulkOperations: bulk mutations in bulkOperations.ts
 *
 * IMPORTANT: This type represents the raw component API shape as exported from
 * `components.convexCms`. It differs from the wrapper API (createCmsClient) which
 * provides a different, more ergonomic namespace structure.
 */
export type AgentComponentApi = {
  /**
   * Content type queries (contentTypes.ts module)
   * @see src/component/contentTypes.ts
   */
  contentTypes: {
    /**
     * Get content type by ID or name.
     * Supports lookup by either `id` OR `name` argument (not both).
     * @example { id: "..." } or { name: "blog_post" }
     */
    get: any;
    /** List content types with filtering and pagination */
    list: any;
  };
  /**
   * Content type mutations (contentTypeMutations.ts module)
   * @see src/component/contentTypeMutations.ts
   */
  contentTypeMutations: {
    createContentType: any;
    updateContentType: any;
    deleteContentType: any;
  };
  /**
   * Content entry queries (contentEntries.ts module)
   * @see src/component/contentEntries.ts
   */
  contentEntries: {
    /** Get content entry by ID */
    get: any;
    /** Get content entry by slug and content type ID */
    getBySlug: any;
    /** Get content entry by slug and content type name */
    getBySlugAndTypeName: any;
    /** List content entries with filtering and pagination */
    list: any;
  };
  /**
   * Content entry mutations (contentEntryMutations.ts module)
   * @see src/component/contentEntryMutations.ts
   */
  contentEntryMutations: {
    createEntry: any;
    updateEntry: any;
    publishEntry: any;
    unpublishEntry: any;
    deleteEntry: any;
    duplicateEntry: any;
    restoreEntry: any;
  };
  /**
   * Scheduling-related mutations (scheduledPublish.ts module - SEPARATE from contentEntryMutations)
   * @see src/component/scheduledPublish.ts
   */
  scheduledPublish: {
    /** Schedule an entry for future publication */
    scheduleEntry: any;
    /** Cancel a scheduled publication */
    cancelScheduledPublish: any;
  };
  /**
   * Media asset queries (mediaAssets.ts module)
   * @see src/component/mediaAssets.ts
   */
  mediaAssets: {
    get: any;
    list: any;
  };
  /**
   * Media asset mutations (mediaAssetMutations.ts module)
   * @see src/component/mediaAssetMutations.ts
   */
  mediaAssetMutations: {
    createMediaAsset: any;
    updateMediaAsset: any;
    deleteMediaAsset: any;
  };
  /**
   * Bulk operations (bulkOperations.ts module)
   * @see src/component/bulkOperations.ts
   */
  bulkOperations: {
    bulkPublish: any;
    bulkUnpublish: any;
    bulkDelete: any;
    bulkUpdate: any;
    bulkRestore: any;
  };
};

// =============================================================================
// Zod Schemas for Tool Arguments
// =============================================================================

/**
 * Supported field types in the CMS.
 */
export const fieldTypeSchema = z.enum([
  "text",
  "richText",
  "number",
  "boolean",
  "date",
  "datetime",
  "reference",
  "media",
  "json",
  "select",
  "multiSelect",
]);

/**
 * Content entry status values.
 */
export const contentStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
  "scheduled",
]);

/**
 * Media type classification.
 */
export const mediaTypeSchema = z.enum([
  "image",
  "video",
  "audio",
  "document",
  "other",
]);

/**
 * Field-specific configuration options.
 */
export const fieldOptionsSchema = z.object({
  // Text fields
  minLength: z.number().optional().describe("Minimum text length"),
  maxLength: z.number().optional().describe("Maximum text length"),
  pattern: z.string().optional().describe("Regex pattern for validation"),

  // Number fields
  min: z.number().optional().describe("Minimum numeric value"),
  max: z.number().optional().describe("Maximum numeric value"),
  step: z.number().optional().describe("Step increment for numeric input"),
  precision: z.number().optional().describe("Decimal precision"),

  // Reference fields
  allowedContentTypes: z
    .array(z.string())
    .optional()
    .describe("Content type names that can be referenced"),
  multiple: z
    .boolean()
    .optional()
    .describe("Allow multiple references"),
  minItems: z
    .number()
    .optional()
    .describe("Minimum number of references when multiple is true"),

  // Media fields
  allowedMimeTypes: z
    .array(z.string())
    .optional()
    .describe("Allowed MIME types (e.g., 'image/*', 'application/pdf')"),
  maxFileSize: z
    .number()
    .optional()
    .describe("Maximum file size in bytes"),

  // Select fields
  options: z
    .array(
      z.object({
        value: z.string().describe("Option value"),
        label: z.string().describe("Display label"),
      })
    )
    .optional()
    .describe("Options for select/multiSelect fields"),

  // Rich text fields
  allowedBlocks: z
    .array(z.string())
    .optional()
    .describe("Allowed block types in rich text"),
  allowedMarks: z
    .array(z.string())
    .optional()
    .describe("Allowed inline marks in rich text"),
}).strict();

/**
 * Field definition schema for content types.
 */
export const fieldDefinitionSchema = z.object({
  name: z
    .string()
    .describe("Unique machine-readable field name (e.g., 'author_name')"),
  label: z.string().describe("Human-readable label for the field"),
  type: fieldTypeSchema.describe("The field data type"),
  required: z.boolean().describe("Whether the field is required"),
  searchable: z
    .boolean()
    .optional()
    .describe("Index this field for full-text search"),
  localized: z
    .boolean()
    .optional()
    .describe("Enable per-locale values for this field"),
  description: z
    .string()
    .optional()
    .describe("Help text shown in the editor"),
  defaultValue: z.any().optional().describe("Default value for new entries"),
  options: fieldOptionsSchema.optional().describe("Field-specific options"),
});

/**
 * Filter operators for content queries.
 */
export const filterOperatorSchema = z.enum([
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "startsWith",
  "endsWith",
  "in",
  "notIn",
]);

/**
 * Field filter for content queries.
 */
export const fieldFilterSchema = z.object({
  field: z.string().describe("Field name to filter on"),
  operator: filterOperatorSchema.describe("Comparison operator"),
  value: z.any().describe("Value to compare against"),
});

// =============================================================================
// Content Type Tool Schemas
// =============================================================================

/**
 * Arguments for creating a content type.
 */
export const createContentTypeArgsSchema = z.object({
  name: z
    .string()
    .describe(
      "Unique machine-readable name (e.g., 'blog_post'). Use snake_case."
    ),
  displayName: z
    .string()
    .describe("Human-readable name shown in the admin UI (e.g., 'Blog Post')"),
  description: z
    .string()
    .optional()
    .describe("Description of what this content type is for"),
  fields: z
    .array(fieldDefinitionSchema)
    .describe("Array of field definitions that make up this content type"),
  icon: z
    .string()
    .optional()
    .describe("Icon identifier for the admin UI (e.g., 'document', 'image')"),
  singleton: z
    .boolean()
    .optional()
    .describe(
      "If true, only one entry of this type can exist (e.g., for settings pages)"
    ),
  slugField: z
    .string()
    .optional()
    .describe("Field name to auto-generate URL slugs from (e.g., 'title')"),
  titleField: z
    .string()
    .optional()
    .describe("Field name to use as the display title in lists"),
  sortOrder: z
    .number()
    .optional()
    .describe("Custom sort order in the admin sidebar"),
  createdBy: z
    .string()
    .optional()
    .describe("User ID of who created this type"),
});

/**
 * Arguments for updating a content type.
 */
export const updateContentTypeArgsSchema = z.object({
  id: z.string().describe("The content type ID to update"),
  displayName: z.string().optional().describe("New display name"),
  description: z.string().optional().describe("New description"),
  fields: z
    .array(fieldDefinitionSchema)
    .optional()
    .describe("Updated field definitions (replaces all fields)"),
  icon: z.string().optional().describe("New icon identifier"),
  singleton: z.boolean().optional().describe("Update singleton setting"),
  slugField: z.string().optional().describe("New slug field"),
  titleField: z.string().optional().describe("New title field"),
  sortOrder: z.number().optional().describe("New sort order"),
  isActive: z.boolean().optional().describe("Whether the type is active"),
  updatedBy: z.string().optional().describe("User ID performing the update"),
});

/**
 * Arguments for listing content types.
 */
export const listContentTypesArgsSchema = z.object({
  includeInactive: z
    .boolean()
    .optional()
    .describe("Include inactive content types in results"),
});

/**
 * Arguments for getting a single content type.
 */
export const getContentTypeArgsSchema = z.object({
  id: z.string().optional().describe("Get content type by ID"),
  name: z
    .string()
    .optional()
    .describe("Get content type by name (alternative to ID)"),
});

// =============================================================================
// Content Entry Tool Schemas
// =============================================================================

/**
 * Arguments for creating a content entry.
 */
export const createContentEntryArgsSchema = z.object({
  contentTypeId: z
    .string()
    .describe("The content type ID this entry belongs to"),
  slug: z
    .string()
    .optional()
    .describe(
      "URL-friendly slug (auto-generated from slugField if not provided)"
    ),
  data: z
    .record(z.string(), z.any())
    .describe("The entry's field values as key-value pairs"),
  locale: z
    .string()
    .optional()
    .describe("Locale code for localized content (e.g., 'en-US')"),
  status: contentStatusSchema
    .optional()
    .describe("Initial status (defaults to 'draft')"),
  createdBy: z.string().optional().describe("User ID of the creator"),
});

/**
 * Arguments for updating a content entry.
 */
export const updateContentEntryArgsSchema = z.object({
  id: z.string().describe("The content entry ID to update"),
  slug: z.string().optional().describe("New URL slug"),
  data: z.record(z.string(), z.any()).optional().describe("Updated field values to merge"),
  status: contentStatusSchema.optional().describe("New status"),
  scheduledPublishAt: z
    .number()
    .optional()
    .describe("Unix timestamp for scheduled publishing"),
  updatedBy: z.string().optional().describe("User ID performing the update"),
  regenerateSlug: z
    .boolean()
    .optional()
    .describe("Regenerate slug from slugField after update"),
});

/**
 * Arguments for publishing a content entry.
 */
export const publishEntryArgsSchema = z.object({
  id: z.string().describe("The content entry ID to publish"),
  changeDescription: z
    .string()
    .optional()
    .describe("Description of changes for version history"),
  updatedBy: z.string().optional().describe("User ID performing the publish"),
});

/**
 * Arguments for unpublishing a content entry.
 */
export const unpublishEntryArgsSchema = z.object({
  id: z.string().describe("The content entry ID to unpublish (revert to draft)"),
  updatedBy: z.string().optional().describe("User ID performing the unpublish"),
});

/**
 * Arguments for scheduling a content entry.
 */
export const scheduleEntryArgsSchema = z.object({
  id: z.string().describe("The content entry ID to schedule"),
  publishAt: z.number().describe("Unix timestamp for when to publish"),
  updatedBy: z.string().optional().describe("User ID performing the schedule"),
});

/**
 * Arguments for deleting a content entry.
 */
export const deleteContentEntryArgsSchema = z.object({
  id: z.string().describe("The content entry ID to delete"),
  deletedBy: z.string().optional().describe("User ID performing the deletion"),
  hardDelete: z
    .boolean()
    .optional()
    .describe("If true, permanently delete. Otherwise soft delete (default)."),
});

/**
 * Arguments for duplicating a content entry.
 */
export const duplicateContentEntryArgsSchema = z.object({
  sourceEntryId: z.string().describe("The content entry ID to duplicate"),
  slug: z
    .string()
    .optional()
    .describe("Custom slug for the duplicate (auto-generated if not provided)"),
  copyMediaReferences: z
    .boolean()
    .optional()
    .describe("Whether to copy media references (default: true)"),
  locale: z.string().optional().describe("Locale for the duplicated entry"),
  createdBy: z
    .string()
    .optional()
    .describe("User ID performing the duplication"),
});

/**
 * Arguments for listing content entries.
 */
export const listContentEntriesArgsSchema = z.object({
  contentTypeId: z.string().optional().describe("Filter by content type ID"),
  contentTypeName: z
    .string()
    .optional()
    .describe("Filter by content type name (alternative to ID)"),
  status: contentStatusSchema.optional().describe("Filter by single status"),
  statusIn: z
    .array(contentStatusSchema)
    .optional()
    .describe("Filter by multiple statuses"),
  locale: z.string().optional().describe("Filter by locale"),
  search: z.string().optional().describe("Full-text search query"),
  includeDeleted: z
    .boolean()
    .optional()
    .describe("Include soft-deleted entries"),
  fieldFilters: z
    .array(fieldFilterSchema)
    .optional()
    .describe("Field-level filters"),
  limit: z
    .number()
    .optional()
    .describe("Maximum number of entries to return (default: 50)"),
  cursor: z.string().optional().describe("Pagination cursor from previous page"),
});

/**
 * Arguments for getting a single content entry.
 */
export const getContentEntryArgsSchema = z.object({
  id: z.string().optional().describe("Get entry by ID"),
  slug: z.string().optional().describe("Get entry by slug (requires contentTypeId or contentTypeName)"),
  contentTypeId: z.string().optional().describe("Content type ID (required when using slug)"),
  contentTypeName: z.string().optional().describe("Content type name (alternative to contentTypeId when using slug)"),
});

/**
 * Arguments for restoring a soft-deleted content entry.
 */
export const restoreContentEntryArgsSchema = z.object({
  id: z.string().describe("The content entry ID to restore from trash"),
  updatedBy: z.string().optional().describe("User ID performing the restore"),
});

// =============================================================================
// Media Asset Tool Schemas
// =============================================================================

/**
 * Arguments for creating a media asset.
 */
export const createMediaAssetArgsSchema = z.object({
  storageId: z.string().describe("Convex storage ID from file upload"),
  filename: z.string().describe("Original filename"),
  mimeType: z.string().describe("MIME type (e.g., 'image/jpeg')"),
  size: z.number().describe("File size in bytes"),
  type: mediaTypeSchema.describe("Classified media type"),
  title: z.string().optional().describe("Human-readable title"),
  description: z.string().optional().describe("Description or caption"),
  altText: z.string().optional().describe("Alt text for accessibility"),
  folderId: z.string().optional().describe("Parent folder ID"),
  width: z.number().optional().describe("Image/video width in pixels"),
  height: z.number().optional().describe("Image/video height in pixels"),
  duration: z.number().optional().describe("Audio/video duration in seconds"),
  metadata: z.record(z.string(), z.any()).optional().describe("Additional metadata"),
  tags: z.array(z.string()).optional().describe("Tags for organization"),
  createdBy: z.string().optional().describe("User ID of the uploader"),
});

/**
 * Arguments for updating a media asset.
 */
export const updateMediaAssetArgsSchema = z.object({
  id: z.string().describe("The media asset ID to update"),
  title: z.string().optional().describe("New title"),
  description: z.string().optional().describe("New description"),
  altText: z.string().optional().describe("New alt text"),
  folderId: z.string().optional().describe("Move to new folder"),
  tags: z.array(z.string()).optional().describe("New tags (replaces existing)"),
});

/**
 * Arguments for listing media assets.
 */
export const listMediaAssetsArgsSchema = z.object({
  folderId: z.string().optional().describe("Filter by folder ID"),
  type: mediaTypeSchema.optional().describe("Filter by media type"),
  mimeType: z.string().optional().describe("Filter by MIME type"),
  search: z.string().optional().describe("Search in filename, title, description"),
  tags: z.array(z.string()).optional().describe("Filter by tags (any match)"),
  includeDeleted: z.boolean().optional().describe("Include soft-deleted assets"),
  limit: z.number().optional().describe("Maximum number of assets to return"),
  cursor: z.string().optional().describe("Pagination cursor"),
});

/**
 * Arguments for getting a single media asset.
 */
export const getMediaAssetArgsSchema = z.object({
  id: z.string().describe("The media asset ID to retrieve"),
});

/**
 * Arguments for deleting a media asset.
 */
export const deleteMediaAssetArgsSchema = z.object({
  id: z.string().describe("The media asset ID to delete"),
  deletedBy: z.string().optional().describe("User ID performing the deletion"),
  hardDelete: z.boolean().optional().describe("If true, permanently delete"),
});

// =============================================================================
// Bulk Operation Tool Schemas
// =============================================================================

/**
 * Arguments for bulk publishing content entries.
 */
export const bulkPublishArgsSchema = z.object({
  ids: z.array(z.string()).describe("Array of content entry IDs to publish"),
  changeDescription: z
    .string()
    .optional()
    .describe("Version history description"),
  updatedBy: z.string().optional().describe("User ID performing the operation"),
});

/**
 * Arguments for bulk unpublishing content entries.
 */
export const bulkUnpublishArgsSchema = z.object({
  ids: z.array(z.string()).describe("Array of content entry IDs to unpublish"),
  updatedBy: z.string().optional().describe("User ID performing the operation"),
});

/**
 * Arguments for bulk deleting content entries.
 */
export const bulkDeleteArgsSchema = z.object({
  ids: z.array(z.string()).describe("Array of content entry IDs to delete"),
  deletedBy: z.string().optional().describe("User ID performing the deletion"),
  hardDelete: z.boolean().optional().describe("If true, permanently delete"),
});

// =============================================================================
// Search Tool Schema
// =============================================================================

/**
 * Arguments for searching content.
 */
export const searchContentArgsSchema = z.object({
  query: z.string().describe("Search query string"),
  contentTypeId: z.string().optional().describe("Limit search to content type"),
  contentTypeName: z.string().optional().describe("Limit search to content type by name"),
  status: contentStatusSchema.optional().describe("Filter by status"),
  limit: z.number().optional().describe("Maximum results to return"),
});

// =============================================================================
// Tool Factory Function
// =============================================================================

/**
 * Options for creating CMS tools.
 */
export interface CreateCmsToolsOptions {
  /**
   * Optional user ID to use as the creator/updater for all operations.
   * If not provided, tools will not set createdBy/updatedBy fields.
   */
  defaultUserId?: string;
}

/**
 * Creates a set of CMS tools compatible with @convex-dev/agent.
 *
 * These tools provide AI agents with structured access to CMS operations
 * including content type management, content entry CRUD, publishing workflows,
 * and media asset management.
 *
 * @param componentApi - The CMS component API from `components.convexCms`
 * @param options - Optional configuration for the tools
 * @returns An object containing all CMS tools
 *
 * @example
 * ```typescript
 * import { Agent } from "@convex-dev/agent";
 * import { createCmsTools } from "@convex-cms/core";
 * import { components } from "./_generated/api";
 *
 * // Create all CMS tools
 * const cmsTools = createCmsTools(components.convexCms);
 *
 * // Use with an agent
 * const contentAgent = new Agent(components.agent, {
 *   name: "Content Manager",
 *   languageModel: openai.chat("gpt-4o"),
 *   tools: cmsTools,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Use selected tools with a specialized agent
 * const { listContentEntries, searchContent, getContentEntry } = createCmsTools(api);
 *
 * const researchAgent = new Agent(components.agent, {
 *   name: "Content Researcher",
 *   tools: { listContentEntries, searchContent, getContentEntry },
 * });
 * ```
 */
export function createCmsTools(
  componentApi: AgentComponentApi,
  options: CreateCmsToolsOptions = {}
) {
  const { defaultUserId } = options;

  // ==========================================================================
  // Content Type Tools
  // ==========================================================================

  /**
   * Create a new content type with field definitions.
   */
  const createContentType = createTool({
    description:
      "Create a new content type (schema) that defines the structure for content entries. " +
      "Content types have a name, display name, and array of field definitions. " +
      "Each field has a name, label, type, and validation options.",
    args: createContentTypeArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentTypeMutations.createContentType,
        {
          ...args,
          createdBy: args.createdBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Update an existing content type.
   */
  const updateContentType = createTool({
    description:
      "Update an existing content type's properties or field definitions. " +
      "Can modify display name, description, fields, and other settings.",
    args: updateContentTypeArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentTypeMutations.updateContentType,
        {
          ...args,
          id: args.id ,
          updatedBy: args.updatedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * List all content types.
   */
  const listContentTypes = createTool({
    description:
      "List all content types defined in the CMS. " +
      "Returns an array of content type definitions with their field schemas.",
    args: listContentTypesArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runQuery(
        componentApi.contentTypes.list,
        args
      );
      return result;
    },
  });

  /**
   * Get a single content type by ID or name.
   */
  const getContentType = createTool({
    description:
      "Get a single content type by ID or by name. " +
      "Returns the full content type definition including all field schemas.",
    args: getContentTypeArgsSchema,
    handler: async (ctx, args) => {
      // The contentTypes.get query supports both id and name lookup via args
      if (args.id) {
        const result = await ctx.runQuery(componentApi.contentTypes.get, {
          id: args.id ,
        });
        return result;
      } else if (args.name) {
        // Use the same get query with name argument (not a separate getByName)
        const result = await ctx.runQuery(componentApi.contentTypes.get, {
          name: args.name,
        });
        return result;
      }
      throw new Error("Either id or name must be provided");
    },
  });

  // ==========================================================================
  // Content Entry Tools
  // ==========================================================================

  /**
   * Create a new content entry.
   */
  const createContentEntry = createTool({
    description:
      "Create a new content entry for a specific content type. " +
      "Entries start as drafts by default. " +
      "Provide field values in the 'data' object matching the content type's field definitions.",
    args: createContentEntryArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentEntryMutations.createEntry,
        {
          ...args,
          contentTypeId: args.contentTypeId ,
          createdBy: args.createdBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Update an existing content entry.
   */
  const updateContentEntry = createTool({
    description:
      "Update an existing content entry's data, status, or slug. " +
      "Only provide the fields you want to update.",
    args: updateContentEntryArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentEntryMutations.updateEntry,
        {
          ...args,
          id: args.id ,
          updatedBy: args.updatedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Publish a content entry.
   */
  const publishEntry = createTool({
    description:
      "Publish a draft content entry, making it publicly visible. " +
      "Creates a version snapshot for history tracking.",
    args: publishEntryArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentEntryMutations.publishEntry,
        {
          ...args,
          id: args.id ,
          updatedBy: args.updatedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Unpublish a content entry.
   */
  const unpublishEntry = createTool({
    description:
      "Unpublish a published content entry, reverting it to draft status. " +
      "The entry will no longer be publicly visible.",
    args: unpublishEntryArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentEntryMutations.unpublishEntry,
        {
          ...args,
          id: args.id ,
          updatedBy: args.updatedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Schedule a content entry for future publishing.
   */
  const scheduleEntry = createTool({
    description:
      "Schedule a content entry to be published at a specific time. " +
      "The entry will automatically be published at the scheduled time.",
    args: scheduleEntryArgsSchema,
    handler: async (ctx, args) => {
      // Note: scheduleEntry is in the scheduledPublish module, NOT contentEntryMutations
      const result = await ctx.runMutation(
        componentApi.scheduledPublish.scheduleEntry,
        {
          ...args,
          id: args.id ,
          updatedBy: args.updatedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Delete a content entry.
   */
  const deleteContentEntry = createTool({
    description:
      "Delete a content entry. By default performs soft delete (recoverable). " +
      "Set hardDelete to true for permanent deletion.",
    args: deleteContentEntryArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentEntryMutations.deleteEntry,
        {
          ...args,
          id: args.id ,
          deletedBy: args.deletedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Duplicate a content entry.
   */
  const duplicateContentEntry = createTool({
    description:
      "Create a copy of an existing content entry with a new unique slug. " +
      "Useful for creating templates or variations.",
    args: duplicateContentEntryArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentEntryMutations.duplicateEntry,
        {
          ...args,
          sourceEntryId: args.sourceEntryId ,
          createdBy: args.createdBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * List content entries with filtering and pagination.
   */
  const listContentEntries = createTool({
    description:
      "List content entries with optional filtering by content type, status, locale, and more. " +
      "Supports pagination through cursor and limit parameters. " +
      "Use fieldFilters for advanced filtering on entry data fields.",
    args: listContentEntriesArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runQuery(componentApi.contentEntries.list, {
        contentTypeId: args.contentTypeId ,
        contentTypeName: args.contentTypeName,
        status: args.status,
        statusIn: args.statusIn,
        locale: args.locale,
        search: args.search,
        includeDeleted: args.includeDeleted,
        fieldFilters: args.fieldFilters,
        paginationOpts: {
          numItems: args.limit ?? 50,
          cursor: args.cursor ?? null,
        },
      });
      return result;
    },
  });

  /**
   * Get a single content entry.
   */
  const getContentEntry = createTool({
    description:
      "Get a single content entry by ID or by slug. " +
      "When using slug, you must also provide contentTypeId or contentTypeName.",
    args: getContentEntryArgsSchema,
    handler: async (ctx, args) => {
      if (args.id) {
        const result = await ctx.runQuery(componentApi.contentEntries.get, {
          id: args.id ,
        });
        return result;
      } else if (args.slug) {
        if (args.contentTypeId) {
          const result = await ctx.runQuery(
            componentApi.contentEntries.getBySlug,
            {
              slug: args.slug,
              contentTypeId: args.contentTypeId ,
            }
          );
          return result;
        } else if (args.contentTypeName) {
          const result = await ctx.runQuery(
            componentApi.contentEntries.getBySlugAndTypeName,
            {
              slug: args.slug,
              contentTypeName: args.contentTypeName,
            }
          );
          return result;
        }
        throw new Error(
          "When using slug, contentTypeId or contentTypeName must be provided"
        );
      }
      throw new Error("Either id or slug must be provided");
    },
  });

  /**
   * Restore a soft-deleted content entry.
   */
  const restoreContentEntry = createTool({
    description:
      "Restore a soft-deleted content entry from the trash. " +
      "Only works on entries that were soft-deleted, not hard-deleted.",
    args: restoreContentEntryArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.contentEntryMutations.restoreEntry,
        {
          id: args.id ,
          updatedBy: args.updatedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  // ==========================================================================
  // Media Asset Tools
  // ==========================================================================

  /**
   * Create a media asset record.
   */
  const createMediaAsset = createTool({
    description:
      "Create a media asset record after uploading a file to Convex storage. " +
      "Requires the storageId from the upload, along with file metadata.",
    args: createMediaAssetArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.mediaAssetMutations.createMediaAsset,
        {
          ...args,
          storageId: args.storageId ,
          folderId: args.folderId ,
          createdBy: args.createdBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Update a media asset.
   */
  const updateMediaAsset = createTool({
    description:
      "Update a media asset's metadata (title, description, alt text, tags, folder).",
    args: updateMediaAssetArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.mediaAssetMutations.updateMediaAsset,
        {
          ...args,
          id: args.id ,
          folderId: args.folderId ,
        }
      );
      return result;
    },
  });

  /**
   * List media assets.
   */
  const listMediaAssets = createTool({
    description:
      "List media assets with optional filtering by folder, type, MIME type, tags, and search.",
    args: listMediaAssetsArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runQuery(componentApi.mediaAssets.list, {
        folderId: args.folderId ,
        type: args.type,
        mimeType: args.mimeType,
        search: args.search,
        tags: args.tags,
        includeDeleted: args.includeDeleted,
        cursor: args.cursor,
        limit: args.limit,
      });
      return result;
    },
  });

  /**
   * Get a single media asset.
   */
  const getMediaAsset = createTool({
    description:
      "Get a single media asset by ID, including its download URL.",
    args: getMediaAssetArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runQuery(componentApi.mediaAssets.get, {
        id: args.id ,
      });
      return result;
    },
  });

  /**
   * Delete a media asset.
   */
  const deleteMediaAsset = createTool({
    description:
      "Delete a media asset. By default performs soft delete (recoverable).",
    args: deleteMediaAssetArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.mediaAssetMutations.deleteMediaAsset,
        {
          id: args.id ,
          deletedBy: args.deletedBy ?? defaultUserId,
          hardDelete: args.hardDelete,
        }
      );
      return result;
    },
  });

  // ==========================================================================
  // Bulk Operation Tools
  // ==========================================================================

  /**
   * Bulk publish multiple content entries.
   */
  const bulkPublish = createTool({
    description:
      "Publish multiple content entries at once. " +
      "More efficient than publishing entries one by one.",
    args: bulkPublishArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.bulkOperations.bulkPublish,
        {
          ids: args.ids,
          changeDescription: args.changeDescription,
          updatedBy: args.updatedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Bulk unpublish multiple content entries.
   */
  const bulkUnpublish = createTool({
    description:
      "Unpublish multiple content entries at once, reverting them to draft status.",
    args: bulkUnpublishArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.bulkOperations.bulkUnpublish,
        {
          ids: args.ids,
          updatedBy: args.updatedBy ?? defaultUserId,
        }
      );
      return result;
    },
  });

  /**
   * Bulk delete multiple content entries.
   */
  const bulkDelete = createTool({
    description:
      "Delete multiple content entries at once. " +
      "By default performs soft delete. Set hardDelete for permanent deletion.",
    args: bulkDeleteArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runMutation(
        componentApi.bulkOperations.bulkDelete,
        {
          ids: args.ids,
          deletedBy: args.deletedBy ?? defaultUserId,
          hardDelete: args.hardDelete,
        }
      );
      return result;
    },
  });

  // ==========================================================================
  // Search Tool
  // ==========================================================================

  /**
   * Search content entries.
   */
  const searchContent = createTool({
    description:
      "Search content entries by text query across all searchable fields. " +
      "Optionally filter by content type and status.",
    args: searchContentArgsSchema,
    handler: async (ctx, args) => {
      const result = await ctx.runQuery(componentApi.contentEntries.list, {
        contentTypeId: args.contentTypeId ,
        contentTypeName: args.contentTypeName,
        status: args.status,
        search: args.query,
        paginationOpts: {
          numItems: args.limit ?? 20,
          cursor: null,
        },
      });
      return result;
    },
  });

  // ==========================================================================
  // Return all tools
  // ==========================================================================

  return {
    // Content Type Tools
    createContentType,
    updateContentType,
    listContentTypes,
    getContentType,

    // Content Entry Tools
    createContentEntry,
    updateContentEntry,
    publishEntry,
    unpublishEntry,
    scheduleEntry,
    deleteContentEntry,
    duplicateContentEntry,
    listContentEntries,
    getContentEntry,
    restoreContentEntry,

    // Media Asset Tools
    createMediaAsset,
    updateMediaAsset,
    listMediaAssets,
    getMediaAsset,
    deleteMediaAsset,

    // Bulk Operations
    bulkPublish,
    bulkUnpublish,
    bulkDelete,

    // Search
    searchContent,
  };
}

/**
 * Type representing all available CMS tools.
 */
export type CmsTools = ReturnType<typeof createCmsTools>;

/**
 * Tool names available in the CMS tools object.
 */
export type CmsToolName = keyof CmsTools;
