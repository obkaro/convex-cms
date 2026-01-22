/**
 * Media Variants Query Functions
 *
 * Provides query functions for retrieving media variants (optimized versions
 * of media assets like thumbnails, responsive sizes, and format conversions).
 *
 * Key features:
 * - Get individual variants by ID
 * - List all variants for a media asset
 * - Find best matching variant for target dimensions
 * - Generate responsive srcset data for HTML img tags
 * - Support for variant presets (thumbnail, small, medium, large, etc.)
 */

import { v, type Infer } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import { query } from "./_generated/server.js";
import {
  mediaVariantDoc,
  mediaVariantWithUrlDoc,
  listMediaVariantsArgs,
  getMediaVariantArgs,
  getBestVariantArgs,
  variantTypeValidator,
  // variantStatusValidator,
  srcsetEntryValidator,
  responsiveSrcsetResult,
} from "./validators.js";

// =============================================================================
// Types
// =============================================================================

// type VariantType = Infer<typeof variantTypeValidator>;
// type VariantStatus = Infer<typeof variantStatusValidator>;

/**
 * Default variant presets for common use cases.
 * These define standard sizes for responsive images and thumbnails.
 */
export const DEFAULT_VARIANT_PRESETS = {
  thumbnail: {
    name: "thumbnail",
    variantType: "thumbnail" as const,
    width: 150,
    height: 150,
    format: "webp",
    quality: 80,
    description: "Small square thumbnail for previews and lists",
  },
  small: {
    name: "small",
    variantType: "responsive" as const,
    width: 480,
    format: "webp",
    quality: 80,
    description: "Small responsive image (480px wide)",
  },
  medium: {
    name: "medium",
    variantType: "responsive" as const,
    width: 768,
    format: "webp",
    quality: 80,
    description: "Medium responsive image (768px wide)",
  },
  large: {
    name: "large",
    variantType: "responsive" as const,
    width: 1024,
    format: "webp",
    quality: 80,
    description: "Large responsive image (1024px wide)",
  },
  xlarge: {
    name: "xlarge",
    variantType: "responsive" as const,
    width: 1440,
    format: "webp",
    quality: 85,
    description: "Extra large responsive image (1440px wide)",
  },
  webp: {
    name: "webp",
    variantType: "format" as const,
    format: "webp",
    quality: 85,
    description: "WebP format conversion (same dimensions)",
  },
  avif: {
    name: "avif",
    variantType: "format" as const,
    format: "avif",
    quality: 80,
    description: "AVIF format conversion (same dimensions)",
  },
};

// =============================================================================
// Get Single Variant
// =============================================================================

/**
 * Query to retrieve a single media variant by ID.
 *
 * Returns the variant metadata along with a resolved storage URL.
 *
 * @param id - The media variant ID to retrieve
 * @param includeDeleted - Whether to include soft-deleted variants (default: false)
 * @returns The media variant document with URL, or null if not found
 *
 * @example
 * ```typescript
 * const variant = await ctx.runQuery(api.mediaVariants.get, {
 *   id: variantId,
 * });
 *
 * if (variant && variant.status === "completed") {
 *   console.log("Variant URL:", variant.url);
 *   console.log("Dimensions:", variant.width, "x", variant.height);
 * }
 * ```
 */
export const get = query({
  args: getMediaVariantArgs.fields,
  returns: v.union(mediaVariantWithUrlDoc, v.null()),
  handler: async (ctx, args) => {
    const { id, includeDeleted = false } = args;

    const variant = await ctx.db.get(id);

    if (!variant) {
      return null;
    }

    // Filter out soft-deleted variants unless explicitly requested
    if (!includeDeleted && variant.deletedAt !== undefined) {
      return null;
    }

    // Resolve the storage URL
    const url = await ctx.storage.getUrl(variant.storageId);

    return {
      ...variant,
      url,
    };
  },
});

// =============================================================================
// List Variants for Asset
// =============================================================================

/**
 * Query to list all variants for a media asset.
 *
 * Supports filtering by variant type, format, preset, and status.
 *
 * @param assetId - The parent media asset ID
 * @param variantType - Filter by variant type (thumbnail, responsive, format)
 * @param format - Filter by output format (webp, avif, jpeg, etc.)
 * @param preset - Filter by preset name
 * @param status - Filter by generation status
 * @param includeDeleted - Include soft-deleted variants (default: false)
 * @returns Array of media variant documents with URLs
 *
 * @example
 * ```typescript
 * // List all completed responsive variants
 * const variants = await ctx.runQuery(api.mediaVariants.list, {
 *   assetId: assetId,
 *   variantType: "responsive",
 *   status: "completed",
 * });
 *
 * // List all WebP variants
 * const webpVariants = await ctx.runQuery(api.mediaVariants.list, {
 *   assetId: assetId,
 *   format: "webp",
 * });
 * ```
 */
export const list = query({
  args: listMediaVariantsArgs.fields,
  returns: v.array(mediaVariantWithUrlDoc),
  handler: async (ctx, args) => {
    const {
      assetId,
      variantType,
      format,
      preset,
      status,
      includeDeleted = false,
    } = args;

    // Start with the base query using the asset index
    let variants;

    if (variantType) {
      // Use the compound index for type filtering
      variants = await ctx.db
        .query("mediaVariants")
        .withIndex("by_asset_and_type", (q) =>
          q.eq("assetId", assetId).eq("variantType", variantType)
        )
        .collect();
    } else if (preset) {
      // Use the preset index
      variants = await ctx.db
        .query("mediaVariants")
        .withIndex("by_asset_and_preset", (q) =>
          q.eq("assetId", assetId).eq("preset", preset)
        )
        .collect();
    } else if (format) {
      // Use the format index
      variants = await ctx.db
        .query("mediaVariants")
        .withIndex("by_asset_and_format", (q) =>
          q.eq("assetId", assetId).eq("format", format)
        )
        .collect();
    } else {
      // Default: get all variants for the asset
      variants = await ctx.db
        .query("mediaVariants")
        .withIndex("by_asset", (q) => q.eq("assetId", assetId))
        .collect();
    }

    // Apply post-filters
    let filteredVariants = variants;

    // Filter by soft-delete status
    if (!includeDeleted) {
      filteredVariants = filteredVariants.filter(
        (v) => v.deletedAt === undefined
      );
    }

    // Apply additional filters that weren't covered by the index
    if (format && !preset && variantType) {
      filteredVariants = filteredVariants.filter((v) => v.format === format);
    }
    if (preset && !format && variantType) {
      filteredVariants = filteredVariants.filter((v) => v.preset === preset);
    }
    if (status) {
      filteredVariants = filteredVariants.filter((v) => v.status === status);
    }

    // Resolve URLs for all variants
    const variantsWithUrls = await Promise.all(
      filteredVariants.map(async (variant) => {
        const url = await ctx.storage.getUrl(variant.storageId);
        return {
          ...variant,
          url,
        };
      })
    );

    return variantsWithUrls;
  },
});

// =============================================================================
// Get Best Matching Variant
// =============================================================================

/**
 * Query to find the best matching variant for target dimensions.
 *
 * This is useful for serving appropriately sized images based on
 * the display context (e.g., viewport width, container size).
 *
 * Selection logic:
 * 1. Prefer variants matching the preferred format
 * 2. Choose smallest variant that is >= target dimensions
 * 3. If no variant is large enough, choose the largest available
 * 4. Optionally fall back to original asset
 *
 * @param assetId - The parent media asset ID
 * @param targetWidth - Target display width in pixels
 * @param targetHeight - Target display height in pixels
 * @param preferredFormat - Preferred format (e.g., "webp")
 * @param fallbackToOriginal - Return original if no variant matches (default: true)
 * @returns Best matching variant with URL, or null if none found
 *
 * @example
 * ```typescript
 * // Get best variant for a 400px wide container, preferring WebP
 * const variant = await ctx.runQuery(api.mediaVariants.getBestVariant, {
 *   assetId: assetId,
 *   targetWidth: 400,
 *   preferredFormat: "webp",
 * });
 *
 * if (variant) {
 *   console.log("Using variant:", variant.width, "x", variant.height);
 *   console.log("URL:", variant.url);
 * }
 * ```
 */
export const getBestVariant = query({
  args: getBestVariantArgs.fields,
  returns: v.union(
    v.object({
      ...mediaVariantWithUrlDoc.fields,
      isOriginal: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const {
      assetId,
      targetWidth,
      targetHeight,
      preferredFormat,
      fallbackToOriginal = true,
    } = args;

    // Get all completed variants for the asset
    const variants = await ctx.db
      .query("mediaVariants")
      .withIndex("by_asset", (q) => q.eq("assetId", assetId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    if (variants.length === 0) {
      // No variants available, try fallback to original
      if (fallbackToOriginal) {
        const item = await ctx.db.get(assetId);
        // Must be an asset (not folder) and not deleted
        if (item && item.kind === "asset" && item.deletedAt === undefined) {
          const asset = item;
          const url = await ctx.storage.getUrl(asset.storageId);
          return {
            // When isOriginal=true, _id is actually an asset ID, not variant ID.
            // Consumers should check isOriginal before using _id.
            _id: asset._id as unknown as Id<"mediaVariants">,
            _creationTime: asset._creationTime,
            assetId: asset._id,
            storageId: asset.storageId,
            variantType: "format" as const,
            width: asset.width,
            height: asset.height,
            format: getFormatFromMimeType(asset.mimeType),
            mimeType: asset.mimeType,
            size: asset.size ?? 0,
            quality: undefined,
            preset: undefined,
            autoGenerated: false,
            status: "completed" as const,
            errorMessage: undefined,
            processingStartedAt: undefined,
            processingCompletedAt: undefined,
            deletedAt: undefined,
            createdBy: asset.createdBy,
            url,
            isOriginal: true,
          };
        }
      }
      return null;
    }

    // Score variants based on match quality
    const scoredVariants = variants.map((variant) => {
      let score = 0;

      // Prefer matching format (+10 points)
      if (preferredFormat && variant.format === preferredFormat) {
        score += 10;
      }

      // Score based on size match
      if (targetWidth && variant.width) {
        if (variant.width >= targetWidth) {
          // Variant is large enough
          // Smaller oversizing is better (less wasted bandwidth)
          const oversizeRatio = variant.width / targetWidth;
          score += 5 - Math.min(4, oversizeRatio - 1); // 5 points for perfect match, down to 1
        } else {
          // Variant is too small, but still usable
          const undersizeRatio = variant.width / targetWidth;
          score += undersizeRatio * 2; // Up to 2 points based on how close
        }
      }

      if (targetHeight && variant.height) {
        if (variant.height >= targetHeight) {
          const oversizeRatio = variant.height / targetHeight;
          score += 5 - Math.min(4, oversizeRatio - 1);
        } else {
          const undersizeRatio = variant.height / targetHeight;
          score += undersizeRatio * 2;
        }
      }

      // Prefer smaller file sizes for equally scored variants
      score -= variant.size / 1000000; // Subtract MB

      return { variant, score };
    });

    // Sort by score (descending) and pick the best
    scoredVariants.sort((a, b) => b.score - a.score);
    const bestVariant = scoredVariants[0].variant;

    const url = await ctx.storage.getUrl(bestVariant.storageId);

    return {
      ...bestVariant,
      url,
      isOriginal: false,
    };
  },
});

// =============================================================================
// Get Responsive Srcset
// =============================================================================

/**
 * Query to generate responsive srcset data for HTML img/picture tags.
 *
 * Returns a complete srcset string and entries array for building
 * responsive images with proper format support.
 *
 * @param assetId - The parent media asset ID
 * @param format - Filter variants by format (optional)
 * @returns Srcset data including src fallback, srcset string, and entries array
 *
 * @example
 * ```typescript
 * const srcsetData = await ctx.runQuery(api.mediaVariants.getResponsiveSrcset, {
 *   assetId: assetId,
 *   format: "webp",
 * });
 *
 * // Use in HTML:
 * // <img src={srcsetData.src} srcset={srcsetData.srcset} sizes="100vw" />
 *
 * // Or build a picture element:
 * // <picture>
 * //   <source srcset={srcsetData.srcset} type="image/webp" />
 * //   <img src={srcsetData.src} />
 * // </picture>
 * ```
 */
export const getResponsiveSrcset = query({
  args: {
    assetId: v.id("mediaItems"),
    format: v.optional(v.string()),
  },
  returns: responsiveSrcsetResult,
  handler: async (ctx, args) => {
    const { assetId, format } = args;

    // Get the original asset for fallback
    const item = await ctx.db.get(assetId);
    // Must be an asset (not folder) and not deleted
    if (!item || item.kind !== "asset" || item.deletedAt !== undefined) {
      return {
        src: null,
        srcset: "",
        entries: [],
        sizes: undefined,
      };
    }
    const asset = item;

    const originalUrl = await ctx.storage.getUrl(asset.storageId);

    // Get all completed responsive variants
    let variants;
    if (format) {
      variants = await ctx.db
        .query("mediaVariants")
        .withIndex("by_asset_and_format", (q) =>
          q.eq("assetId", assetId).eq("format", format)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "completed"),
            q.eq(q.field("deletedAt"), undefined),
            q.or(
              q.eq(q.field("variantType"), "responsive"),
              q.eq(q.field("variantType"), "format")
            )
          )
        )
        .collect();
    } else {
      variants = await ctx.db
        .query("mediaVariants")
        .withIndex("by_asset", (q) => q.eq("assetId", assetId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "completed"),
            q.eq(q.field("deletedAt"), undefined),
            q.or(
              q.eq(q.field("variantType"), "responsive"),
              q.eq(q.field("variantType"), "format")
            )
          )
        )
        .collect();
    }

    // Build srcset entries, filtering for variants with width
    const entries: Infer<typeof srcsetEntryValidator>[] = [];

    for (const variant of variants) {
      if (variant.width) {
        const url = await ctx.storage.getUrl(variant.storageId);
        if (url) {
          entries.push({
            url,
            descriptor: `${variant.width}w`,
            width: variant.width,
            format: variant.format,
          });
        }
      }
    }

    // Sort by width ascending
    entries.sort((a, b) => a.width - b.width);

    // Build srcset string
    const srcset = entries.map((e) => `${e.url} ${e.descriptor}`).join(", ");

    // Generate a sizes hint based on available widths
    let sizes: string | undefined;
    if (entries.length > 0) {
      const maxWidth = entries[entries.length - 1].width;
      sizes = `(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`;
    }

    return {
      src: originalUrl,
      srcset,
      entries,
      sizes,
    };
  },
});

// =============================================================================
// Get Variant Presets
// =============================================================================

/**
 * Query to get available variant presets.
 *
 * Returns the default preset configurations that can be used
 * when requesting variant generation.
 *
 * @returns Array of preset definitions
 *
 * @example
 * ```typescript
 * const presets = await ctx.runQuery(api.mediaVariants.getPresets);
 *
 * // Available presets: thumbnail, small, medium, large, xlarge, webp, avif
 * for (const preset of presets) {
 *   console.log(`${preset.name}: ${preset.width}x${preset.height} ${preset.format}`);
 * }
 * ```
 */
export const getPresets = query({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      variantType: variantTypeValidator,
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      format: v.string(),
      quality: v.optional(v.number()),
      description: v.optional(v.string()),
    })
  ),
  handler: async () => {
    return Object.values(DEFAULT_VARIANT_PRESETS);
  },
});

// =============================================================================
// Get Pending Variants (for processing queue)
// =============================================================================

/**
 * Query to get variants that are pending or processing.
 *
 * Useful for monitoring the variant generation queue or
 * building a processing system.
 *
 * @param status - Filter by status (pending or processing)
 * @param limit - Maximum number of variants to return (default: 100)
 * @returns Array of variants awaiting processing
 *
 * @example
 * ```typescript
 * // Get pending variants for processing
 * const pending = await ctx.runQuery(api.mediaVariants.getPendingVariants, {
 *   status: "pending",
 *   limit: 10,
 * });
 *
 * for (const variant of pending) {
 *   // Process variant...
 * }
 * ```
 */
export const getPendingVariants = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("processing"))
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(mediaVariantDoc),
  handler: async (ctx, args) => {
    const { status, limit = 100 } = args;

    let variants;

    if (status) {
      variants = await ctx.db
        .query("mediaVariants")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("asc") // Process oldest first
        .take(limit);
    } else {
      // Get both pending and processing
      const pending = await ctx.db
        .query("mediaVariants")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .order("asc")
        .take(limit);

      const processing = await ctx.db
        .query("mediaVariants")
        .withIndex("by_status", (q) => q.eq("status", "processing"))
        .order("asc")
        .take(limit);

      variants = [...pending, ...processing].slice(0, limit);
    }

    return variants;
  },
});

// =============================================================================
// Get Asset with Variants
// =============================================================================

/**
 * Query to get a media asset with all its completed variants.
 *
 * Combines the original asset with all available variants
 * for comprehensive media delivery.
 *
 * @param assetId - The media asset ID
 * @returns Asset with variants and URLs
 *
 * @example
 * ```typescript
 * const assetWithVariants = await ctx.runQuery(api.mediaVariants.getAssetWithVariants, {
 *   assetId: assetId,
 * });
 *
 * if (assetWithVariants) {
 *   console.log("Original:", assetWithVariants.original.url);
 *   console.log("Variants:", assetWithVariants.variants.length);
 *
 *   // Find thumbnail
 *   const thumbnail = assetWithVariants.variants.find(v => v.preset === "thumbnail");
 * }
 * ```
 */
export const getAssetWithVariants = query({
  args: {
    assetId: v.id("mediaItems"),
  },
  returns: v.union(
    v.object({
      original: v.object({
        _id: v.id("mediaItems"),
        _creationTime: v.number(),
        name: v.string(),
        mimeType: v.string(),
        size: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        url: v.union(v.string(), v.null()),
      }),
      variants: v.array(mediaVariantWithUrlDoc),
      variantsByType: v.object({
        thumbnail: v.optional(mediaVariantWithUrlDoc),
        responsive: v.array(mediaVariantWithUrlDoc),
        format: v.array(mediaVariantWithUrlDoc),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { assetId } = args;

    // Get the original asset
    const item = await ctx.db.get(assetId);
    // Must be an asset (not folder) and not deleted
    if (!item || item.kind !== "asset" || item.deletedAt !== undefined) {
      return null;
    }
    const asset = item;

    const originalUrl = await ctx.storage.getUrl(asset.storageId);

    // Get all completed variants
    const variants = await ctx.db
      .query("mediaVariants")
      .withIndex("by_asset", (q) => q.eq("assetId", assetId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Resolve URLs for all variants
    const variantsWithUrls = await Promise.all(
      variants.map(async (variant) => {
        const url = await ctx.storage.getUrl(variant.storageId);
        return { ...variant, url };
      })
    );

    // Organize variants by type
    const thumbnail = variantsWithUrls.find(
      (v) => v.variantType === "thumbnail"
    );
    const responsive = variantsWithUrls
      .filter((v) => v.variantType === "responsive")
      .sort((a, b) => (a.width || 0) - (b.width || 0));
    const formatVariants = variantsWithUrls.filter(
      (v) => v.variantType === "format"
    );

    return {
      original: {
        _id: asset._id,
        _creationTime: asset._creationTime,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size ?? 0,
        width: asset.width,
        height: asset.height,
        url: originalUrl,
      },
      variants: variantsWithUrls,
      variantsByType: {
        thumbnail,
        responsive,
        format: formatVariants,
      },
    };
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract format string from MIME type.
 */
function getFormatFromMimeType(mimeType: string): string {
  const formatMap: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return formatMap[mimeType] || mimeType.split("/")[1] || "unknown";
}
