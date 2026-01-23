/**
 * Media Asset Query Functions
 *
 * Provides query functions for retrieving media assets from the CMS.
 * Media assets are file records that reference Convex's built-in file storage,
 * along with metadata like dimensions, MIME type, and organization tags.
 */

import { v, type Infer } from "convex/values";
import { isDeleted } from "./lib/softDelete.js";
import { paginationOptsValidator } from "convex/server";
import { stream } from "convex-helpers/server/stream";
import { query, type QueryCtx } from "./_generated/server.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import {
  // mediaItemDoc,
  listMediaAssetsArgs,
  paginationResultValidator,
  mediaSortFieldValidator,
  mediaSortDirectionValidator,
} from "./validators.js";
import schema, { mediaAssetItemValidator } from "./schema.js";

/**
 * Return type for the get query.
 * Extends the base media asset document with the resolved storage URL
 * and optimization hints for efficient asset delivery.
 */
const mediaAssetWithUrlDoc = v.object({
  ...mediaAssetItemValidator.fields,
  _id: v.id("mediaItems"),
  _creationTime: v.number(),
  /** The resolved public URL for accessing the asset file */
  url: v.union(v.string(), v.null()),
  /**
   * Optimization hints for efficient asset usage.
   * Includes dimensions for images, duration for audio/video,
   * and recommended transformations based on asset type.
   */
  optimizationHints: v.object({
    /** Whether the asset is an image that can be resized */
    isResizable: v.boolean(),
    /** Suggested aspect ratio for maintaining proportions (width / height) */
    aspectRatio: v.optional(v.number()),
    /** Whether the asset supports transparent backgrounds (PNG, WebP, GIF) */
    hasTransparency: v.optional(v.boolean()),
    /** Whether the asset is a vector format (SVG) that scales without loss */
    isVector: v.optional(v.boolean()),
    /** Suggested max display width based on original dimensions */
    suggestedMaxWidth: v.optional(v.number()),
    /** For video/audio: total duration in seconds */
    durationSeconds: v.optional(v.number()),
  }),
});

/**
 * Arguments for retrieving a single media asset.
 */
const getMediaAssetArgs = v.object({
  /** The ID of the media asset to retrieve */
  id: v.id("mediaItems"),
  /** Whether to include soft-deleted assets (default: false) */
  includeDeleted: v.optional(v.boolean()),
});

/**
 * Query to retrieve a single media asset by ID.
 *
 * Returns the asset metadata along with a resolved storage URL and
 * optimization hints for efficient frontend rendering.
 *
 * @param id - The media asset ID to retrieve
 * @param includeDeleted - Whether to include soft-deleted assets (default: false)
 * @returns The media asset document with URL and optimization hints, or null if not found
 *
 * @example
 * ```typescript
 * // Basic usage - get asset by ID
 * const asset = await ctx.runQuery(api.mediaAssets.get, {
 *   id: assetId,
 * });
 *
 * if (asset) {
 *   console.log("Asset URL:", asset.url);
 *   console.log("Dimensions:", asset.width, "x", asset.height);
 *
 *   // Use optimization hints for responsive images
 *   if (asset.optimizationHints.isResizable) {
 *     console.log("Aspect ratio:", asset.optimizationHints.aspectRatio);
 *     console.log("Max width:", asset.optimizationHints.suggestedMaxWidth);
 *   }
 * }
 *
 * // Including deleted assets (for admin recovery UI)
 * const deletedAsset = await ctx.runQuery(api.mediaAssets.get, {
 *   id: assetId,
 *   includeDeleted: true,
 * });
 * ```
 */
export const get = query({
  args: getMediaAssetArgs.fields,
  returns: v.union(mediaAssetWithUrlDoc, v.null()),
  handler: async (ctx, args) => {
    const { id, includeDeleted = false } = args;

    const item = await ctx.db.get(id);

    // Return null if item doesn't exist or is not an asset
    if (!item || item.kind !== "asset") {
      return null;
    }

    // Filter out soft-deleted assets unless explicitly requested
    // This respects the soft delete pattern used throughout the CMS
    if (!includeDeleted && isDeleted(item)) {
      return null;
    }

    // Resolve the storage URL from Convex file storage
    // This generates a public URL that can be used directly in img/video tags
    const url = await ctx.storage.getUrl(item.storageId);

    // Build optimization hints based on asset type and metadata
    const optimizationHints = buildOptimizationHints(item);

    return {
      ...item,
      url,
      optimizationHints,
    };
  },
});

/**
 * MIME types that support transparency.
 */
const TRANSPARENT_MIME_TYPES = [
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

/**
 * MIME types that are vector formats.
 */
const VECTOR_MIME_TYPES = ["image/svg+xml"];

/**
 * MIME types that can be resized (raster images).
 */
const RESIZABLE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

/**
 * Builds optimization hints based on the asset's type and metadata.
 *
 * These hints help frontends make intelligent decisions about:
 * - Image sizing and responsive layouts
 * - Placeholder dimensions
 * - Format support (transparency, vectors)
 * - Media playback (duration)
 */
function buildOptimizationHints(asset: {
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}): {
  isResizable: boolean;
  aspectRatio?: number;
  hasTransparency?: boolean;
  isVector?: boolean;
  suggestedMaxWidth?: number;
  durationSeconds?: number;
} {
  const hints: {
    isResizable: boolean;
    aspectRatio?: number;
    hasTransparency?: boolean;
    isVector?: boolean;
    suggestedMaxWidth?: number;
    durationSeconds?: number;
  } = {
    isResizable: false,
  };

  // Check if the asset is a resizable raster image
  if (RESIZABLE_MIME_TYPES.includes(asset.mimeType)) {
    hints.isResizable = true;
  }

  // Check for transparency support
  if (TRANSPARENT_MIME_TYPES.includes(asset.mimeType)) {
    hints.hasTransparency = true;
  }

  // Check for vector format
  if (VECTOR_MIME_TYPES.includes(asset.mimeType)) {
    hints.isVector = true;
    // Vectors are infinitely resizable but in a different way
    hints.isResizable = false;
  }

  // Calculate aspect ratio if dimensions are available
  if (asset.width && asset.height && asset.height > 0) {
    hints.aspectRatio = Math.round((asset.width / asset.height) * 1000) / 1000;
    hints.suggestedMaxWidth = asset.width;
  }

  // Include duration for video/audio assets
  if (asset.duration !== undefined && asset.duration > 0) {
    hints.durationSeconds = asset.duration;
  }

  return hints;
}

// =============================================================================
// List Media Assets Query
// =============================================================================

/**
 * Default page size for media assets list queries.
 */
const DEFAULT_NUM_ITEMS = 50;

/**
 * Maximum page size for media assets list queries.
 */
const MAX_NUM_ITEMS = 250;

/**
 * Type for sort options.
 */
type MediaSortField = Infer<typeof mediaSortFieldValidator>;
type MediaSortDirection = Infer<typeof mediaSortDirectionValidator>;

interface MediaSortOptions {
  sortField: MediaSortField;
  sortDirection: MediaSortDirection;
}

/**
 * Paginated response type for media assets list.
 * Reuses the mediaAssetWithUrlDoc defined above.
 */
const paginatedMediaAssetsResponse = paginationResultValidator(
  mediaAssetWithUrlDoc
);

/**
 * Query to list media assets with optional folder filter and pagination.
 *
 * Supports filtering by:
 * - Folder: Filter to assets in a specific folder or root level
 * - MIME type: Exact match or prefix match (e.g., "image/")
 * - Media type: Category filter (image, video, audio, document, other)
 * - Tags: Assets must contain ALL specified tags
 * - Search: Full-text search on filename, title, description
 *
 * Supports sorting by:
 * - _creationTime (default, descending)
 * - filename
 * - size
 * - type
 * - mimeType
 *
 * @param folderId - Filter to assets in this folder (optional)
 * @param includeRootLevel - Include assets without a folder (default: false with folderId, true without)
 * @param type - Filter by media type category
 * @param mimeType - Filter by exact MIME type
 * @param mimeTypePrefix - Filter by MIME type prefix (e.g., "image/")
 * @param search - Full-text search term
 * @param tags - Filter by tags (must match ALL)
 * @param includeDeleted - Include soft-deleted assets (default: false)
 * @param sortField - Field to sort by (default: "_creationTime")
 * @param sortDirection - Sort direction (default: "desc")
 * @param paginationOpts - Pagination options with numItems and cursor
 * @returns Paginated list of media assets with URLs and optimization hints
 *
 * @example
 * ```typescript
 * // List all images in a specific folder
 * const result = await ctx.runQuery(api.mediaAssets.list, {
 *   folderId: folderId,
 *   type: "image",
 *   paginationOpts: { numItems: 20 }
 * });
 *
 * // Search for assets by name
 * const searchResult = await ctx.runQuery(api.mediaAssets.list, {
 *   search: "hero banner",
 *   mimeTypePrefix: "image/",
 *   paginationOpts: { numItems: 10 }
 * });
 *
 * // List all PDFs sorted by size
 * const pdfs = await ctx.runQuery(api.mediaAssets.list, {
 *   mimeType: "application/pdf",
 *   sortField: "size",
 *   sortDirection: "desc",
 *   paginationOpts: { numItems: 50 }
 * });
 *
 * // Paginate through results
 * const nextPage = await ctx.runQuery(api.mediaAssets.list, {
 *   paginationOpts: {
 *     numItems: 20,
 *     cursor: result.continueCursor
 *   }
 * });
 * ```
 */
export const list = query({
  args: listMediaAssetsArgs.fields,
  returns: paginatedMediaAssetsResponse,
  handler: async (ctx, args) => {
    const {
      folderId,
      includeRootLevel,
      type,
      mimeType,
      mimeTypePrefix,
      search,
      tags,
      includeDeleted = false,
      sortField = "_creationTime",
      sortDirection = "desc",
      paginationOpts,
    } = args;

    // Map folderId to parentId for the unified mediaItems table
    const parentId = folderId as Id<"mediaItems"> | undefined;

    // Clamp numItems to valid range
    const numItems = Math.min(
      Math.max(1, paginationOpts.numItems ?? DEFAULT_NUM_ITEMS),
      MAX_NUM_ITEMS
    );

    const clampedPaginationOpts = {
      ...paginationOpts,
      numItems,
    };

    const sortOptions: MediaSortOptions = {
      sortField,
      sortDirection,
    };

    // Handle full-text search queries
    if (search && search.trim().length > 0) {
      return handleSearchQuery(ctx, {
        search: search.trim(),
        parentId,
        includeRootLevel,
        type,
        mimeType,
        mimeTypePrefix,
        tags,
        includeDeleted,
        sortOptions,
        paginationOpts: clampedPaginationOpts,
      });
    }

    // Handle standard index-based queries
    return handleIndexQuery(ctx, {
      parentId,
      includeRootLevel,
      type,
      mimeType,
      mimeTypePrefix,
      tags,
      includeDeleted,
      sortOptions,
      paginationOpts: clampedPaginationOpts,
    });
  },
});

// Type for pagination options (using proper Convex pagination type)
type PaginationOpts = Infer<typeof paginationOptsValidator>;

// Type for pagination result
interface MediaAssetPaginationResult {
  page: any[];
  continueCursor: string | null;
  isDone: boolean;
}

/**
 * Get a sortable value from an asset based on the sort field.
 */
function getSortValue(asset: any, sortField: MediaSortField): unknown {
  return asset[sortField];
}

/**
 * Compare two values for sorting.
 * Handles null/undefined by pushing them to the end.
 */
function compareValues(a: unknown, b: unknown, direction: MediaSortDirection): number {
  // Handle null/undefined - push them to the end
  if (a === null || a === undefined) {
    return direction === "asc" ? 1 : -1;
  }
  if (b === null || b === undefined) {
    return direction === "asc" ? -1 : 1;
  }

  // Compare numbers
  if (typeof a === "number" && typeof b === "number") {
    return direction === "asc" ? a - b : b - a;
  }

  // Compare strings (case-insensitive)
  if (typeof a === "string" && typeof b === "string") {
    const comparison = a.toLowerCase().localeCompare(b.toLowerCase());
    return direction === "asc" ? comparison : -comparison;
  }

  // Fallback: convert to string and compare
  const aStr = String(a);
  const bStr = String(b);
  const comparison = aStr.localeCompare(bStr);
  return direction === "asc" ? comparison : -comparison;
}

/**
 * Sort an array of assets by the specified sort options.
 */
function sortAssets(assets: any[], sortOptions: MediaSortOptions): any[] {
  return [...assets].sort((a, b) => {
    const aValue = getSortValue(a, sortOptions.sortField);
    const bValue = getSortValue(b, sortOptions.sortField);
    return compareValues(aValue, bValue, sortOptions.sortDirection);
  });
}

/**
 * Check if an asset matches the MIME type filter criteria.
 */
function matchesMimeType(
  asset: { mimeType: string },
  mimeType?: string,
  mimeTypePrefix?: string
): boolean {
  if (mimeType && asset.mimeType !== mimeType) {
    return false;
  }
  if (mimeTypePrefix && !asset.mimeType.startsWith(mimeTypePrefix)) {
    return false;
  }
  return true;
}

/**
 * Check if an asset has all the specified tags.
 */
function matchesTags(asset: { tags?: string[] }, requiredTags?: string[]): boolean {
  if (!requiredTags || requiredTags.length === 0) {
    return true;
  }
  if (!asset.tags || asset.tags.length === 0) {
    return false;
  }
  return requiredTags.every((tag) => asset.tags!.includes(tag));
}

/**
 * Enrich an asset with URL and optimization hints.
 */
async function enrichAsset(
  ctx: QueryCtx,
  asset: Doc<"mediaItems"> & { kind: "asset" }
): Promise<Doc<"mediaItems"> & { kind: "asset"; url: string | null; optimizationHints: ReturnType<typeof buildOptimizationHints> }> {
  const url = await ctx.storage.getUrl(asset.storageId);
  const optimizationHints = buildOptimizationHints(asset);
  return {
    ...asset,
    url,
    optimizationHints,
  };
}

/**
 * Internal helper to handle full-text search queries.
 * Uses the search_assets search index for efficient text matching.
 */
async function handleSearchQuery(
  ctx: QueryCtx,
  args: {
    search: string;
    parentId?: Id<"mediaItems">;
    includeRootLevel?: boolean;
    type?: string;
    mimeType?: string;
    mimeTypePrefix?: string;
    tags?: string[];
    includeDeleted: boolean;
    sortOptions: MediaSortOptions;
    paginationOpts: PaginationOpts;
  }
): Promise<MediaAssetPaginationResult> {
  const {
    search,
    parentId,
    includeRootLevel,
    type,
    mimeType,
    mimeTypePrefix,
    tags,
    includeDeleted,
    sortOptions,
    paginationOpts,
  } = args;
  const { numItems, cursor } = paginationOpts;

  // Build search query with filter fields available in the index
  // The search_media index supports filtering by kind, type, and parentId
  const searchQuery = ctx.db
    .query("mediaItems")
    .withSearchIndex("search_media", (q: any) => {
      let query = q.search("searchText", search);

      // Always filter for assets only
      query = query.eq("kind", "asset");

      // Apply filter fields available in the search index
      if (type) {
        query = query.eq("type", type);
      }
      if (parentId) {
        query = query.eq("parentId", parentId);
      }

      return query;
    });

  // Fetch more results for post-filtering
  const hasMimeFilter = mimeType || mimeTypePrefix;
  const hasTagFilter = tags && tags.length > 0;
  const fetchMultiplier = !includeDeleted || hasMimeFilter || hasTagFilter ? 4 : 1;
  const results = await searchQuery.take((numItems + 1) * fetchMultiplier);

  // Apply post-processing filters
  let filteredResults = results;

  // Filter by soft-delete status
  if (!includeDeleted) {
    filteredResults = filteredResults.filter(
      (asset: any) => !isDeleted(asset)
    );
  }

  // Filter by folder (for root level handling)
  if (parentId && includeRootLevel) {
    // Show both folder assets and root-level assets
    filteredResults = filteredResults.filter(
      (asset: any) => asset.parentId === parentId || asset.parentId === undefined
    );
  } else if (!parentId && includeRootLevel === false) {
    // Explicitly exclude root-level assets when not filtering by folder
    filteredResults = filteredResults.filter(
      (asset: any) => asset.parentId !== undefined
    );
  }
  // Default (no parentId, includeRootLevel undefined/true): show all assets

  // Filter by MIME type
  if (hasMimeFilter) {
    filteredResults = filteredResults.filter((asset: any) =>
      matchesMimeType(asset, mimeType, mimeTypePrefix)
    );
  }

  // Filter by tags
  if (hasTagFilter) {
    filteredResults = filteredResults.filter((asset: any) =>
      matchesTags(asset, tags)
    );
  }

  // Apply sorting
  const sortedResults = sortAssets(filteredResults, sortOptions);

  // Handle cursor-based pagination
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = sortedResults.findIndex(
      (asset: any) => asset._id === cursor
    );
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Get the page of results
  const pageResults = sortedResults.slice(startIndex, startIndex + numItems + 1);
  const isDone = pageResults.length <= numItems;
  const page = isDone ? pageResults : pageResults.slice(0, numItems);

  // Enrich assets with URLs and optimization hints
  const enrichedPage = await Promise.all(
    page.map((asset: any) => enrichAsset(ctx, asset))
  );

  // Get continuation cursor
  const continueCursor =
    !isDone && page.length > 0 ? page[page.length - 1]._id : null;

  return {
    page: enrichedPage,
    continueCursor,
    isDone,
  };
}

/**
 * Internal helper to handle index-based queries using convex-helpers stream.
 * Selects the optimal index based on provided filters.
 */
async function handleIndexQuery(
  ctx: QueryCtx,
  args: {
    parentId?: Id<"mediaItems">;
    includeRootLevel?: boolean;
    type?: string;
    mimeType?: string;
    mimeTypePrefix?: string;
    tags?: string[];
    includeDeleted: boolean;
    sortOptions: MediaSortOptions;
    paginationOpts: PaginationOpts;
  }
): Promise<MediaAssetPaginationResult> {
  const {
    parentId,
    includeRootLevel,
    type,
    mimeType,
    mimeTypePrefix,
    tags,
    includeDeleted,
    sortOptions,
    paginationOpts,
  } = args;
  const { numItems, cursor } = paginationOpts;

  // Determine if we need in-memory sorting
  const needsCustomSort = sortOptions.sortField !== "_creationTime";

  // Check for post-processing filters
  const hasMimeFilter = mimeType || mimeTypePrefix;
  const hasTagFilter = tags && tags.length > 0;
  const hasFolderLogic = parentId || includeRootLevel !== undefined;
  const hasTypeFilter = !!type;
  const needsPostFiltering = !includeDeleted || hasMimeFilter || hasTagFilter || hasTypeFilter;

  // Create the stream-based query
  const streamDb = stream(ctx.db, schema);

  // Select the best index based on filters
  // Always need to filter for kind: "asset"
  // Note: `type` filtering is now done post-query since type is derived from mimeType
  let baseQuery;
  if (mimeType) {
    // Use by_mime_type index for exact MIME type match (assets only)
    baseQuery = streamDb
      .query("mediaItems")
      .withIndex("by_mime_type", (q: any) => q.eq("mimeType", mimeType));
  } else if (parentId) {
    // Use by_kind_and_parent index when filtering by folder
    baseQuery = streamDb
      .query("mediaItems")
      .withIndex("by_kind_and_parent", (q: any) => q.eq("kind", "asset").eq("parentId", parentId));
  } else {
    // Default: use by_kind index to get only assets
    baseQuery = streamDb
      .query("mediaItems")
      .withIndex("by_kind", (q: any) => q.eq("kind", "asset"));
  }

  // Apply order for index-based sorting
  const order = sortOptions.sortDirection;
  const orderedQuery = baseQuery.order(order);

  // Apply filterWith for post-processing filters
  const filteredQuery = orderedQuery.filterWith(async (item: any) => {
    // Ensure this is an asset (in case the query didn't filter by kind)
    if (item.kind !== "asset") {
      return false;
    }

    // Filter by soft-delete status
    if (!includeDeleted && isDeleted(item)) {
      return false;
    }

    // Filter by folder logic (when not already using folder index)
    if (!parentId && hasFolderLogic) {
      if (includeRootLevel === true && item.parentId !== undefined) {
        return false; // Only show root-level assets
      }
      if (includeRootLevel === false && item.parentId === undefined) {
        return false; // Exclude root-level assets
      }
    }

    // Filter by MIME type (when not already using mimeType index)
    if (hasMimeFilter && !mimeType) {
      if (!matchesMimeType(item, undefined, mimeTypePrefix)) {
        return false;
      }
    }

    // Filter by tags
    if (hasTagFilter && !matchesTags(item, tags)) {
      return false;
    }

    // Filter by media type category (type is derived from mimeType)
    if (type) {
      // Map type to mimeType prefix for filtering
      const mimePrefix = type === "other" ? null : `${type}/`;
      if (mimePrefix && !item.mimeType.startsWith(mimePrefix)) {
        return false;
      }
      // For "other" type, exclude known media types
      if (type === "other" && (
        item.mimeType.startsWith("image/") ||
        item.mimeType.startsWith("video/") ||
        item.mimeType.startsWith("audio/") ||
        item.mimeType.startsWith("application/pdf") ||
        item.mimeType.includes("document") ||
        item.mimeType.includes("sheet") ||
        item.mimeType.includes("presentation")
      )) {
        return false;
      }
    }

    return true;
  });

  // For custom sorting, we need to fetch all and sort in memory
  if (needsCustomSort) {
    // Fetch more results for in-memory sorting and filtering
    const fetchMultiplier = needsPostFiltering ? 10 : 5;
    const results: any[] = [];
    let fetchedCount = 0;
    const maxFetch = (numItems + 1) * fetchMultiplier;

    // Manual iteration with filterWith
    for await (const asset of filteredQuery) {
      results.push(asset);
      fetchedCount++;
      if (fetchedCount >= maxFetch) {
        break;
      }
    }

    // Apply custom sorting
    const sortedResults = sortAssets(results, sortOptions);

    // Handle cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = sortedResults.findIndex(
        (asset: any) => asset._id === cursor
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    // Get the page of results
    const pageResults = sortedResults.slice(startIndex, startIndex + numItems + 1);
    const isDone = pageResults.length <= numItems;
    const page = isDone ? pageResults : pageResults.slice(0, numItems);

    // Enrich assets with URLs and optimization hints
    const enrichedPage = await Promise.all(
      page.map((asset: any) => enrichAsset(ctx, asset))
    );

    const continueCursor =
      !isDone && page.length > 0 ? page[page.length - 1]._id : null;

    return {
      page: enrichedPage,
      continueCursor,
      isDone,
    };
  }

  // For default sorting (_creationTime), use paginator
  const result = await filteredQuery.paginate(paginationOpts);

  // Enrich assets with URLs and optimization hints
  const enrichedPage = await Promise.all(
    result.page.map((asset: any) => enrichAsset(ctx, asset))
  );

  return {
    page: enrichedPage,
    continueCursor: result.continueCursor,
    isDone: result.isDone,
  };
}
