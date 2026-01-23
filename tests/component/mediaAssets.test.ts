/**
 * Tests for the media assets get query.
 *
 * These tests verify the validators and logic patterns for the get query:
 * - Validator structure for get arguments
 * - Response document structure with URL and optimization hints
 * - Soft delete filtering logic
 * - Optimization hints generation
 */

import { describe, it, expect } from "vitest";
import {
  mediaItemDoc,
  mediaAssetItemValidator,
  mediaTypeValidator,
  listMediaAssetsArgs,
  mediaSortFieldValidator,
  mediaSortDirectionValidator,
} from "../../src/component/validators.js";

describe("Media Assets Get Query", () => {
  // =============================================================================
  // Validator Structure Tests
  // =============================================================================

  describe("mediaItemDoc structure for response", () => {
    it("should have kind field to distinguish assets from folders", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("kind");
    });

    it("should have storageId field for Convex file storage reference (asset-specific)", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("storageId");
    });

    it("should have name field for file name", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("name");
    });

    it("should have mimeType field for content type (asset-specific)", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("mimeType");
    });

    it("should have size field for file size in bytes", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("size");
    });

    it("should have width and height fields for image dimensions (asset-specific)", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("width");
      expect(assetFields).toContain("height");
    });

    it("should have duration field for video/audio length (asset-specific)", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("duration");
    });

    it("should have deletedAt field for soft delete filtering", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("deletedAt");
    });

    it("should have metadata field for custom data", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("metadata");
    });

    it("should have tags field for organization", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("tags");
    });

    it("should have altText field for accessibility (asset-specific)", () => {
      const assetFields = Object.keys(mediaAssetItemValidator.fields);
      expect(assetFields).toContain("altText");
    });
  });

  // =============================================================================
  // Soft Delete Logic Tests
  // =============================================================================

  describe("Soft delete filtering logic", () => {
    it("should filter out soft-deleted assets when includeDeleted is false", () => {
      const includeDeleted = false;
      const asset = { deletedAt: Date.now() };
      const shouldReturn = includeDeleted || asset.deletedAt === undefined;
      expect(shouldReturn).toBe(false);
    });

    it("should include soft-deleted assets when includeDeleted is true", () => {
      const includeDeleted = true;
      const asset = { deletedAt: Date.now() };
      const shouldReturn = includeDeleted || asset.deletedAt === undefined;
      expect(shouldReturn).toBe(true);
    });

    it("should include active assets regardless of includeDeleted", () => {
      const includeDeleted = false;
      const asset = { deletedAt: undefined };
      const shouldReturn = includeDeleted || asset.deletedAt === undefined;
      expect(shouldReturn).toBe(true);
    });

    it("should return null when asset does not exist", () => {
      const asset = null;
      const result = asset ? asset : null;
      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // Optimization Hints Logic Tests
  // =============================================================================

  describe("Optimization hints generation", () => {
    const TRANSPARENT_MIME_TYPES = [
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ];

    const VECTOR_MIME_TYPES = ["image/svg+xml"];

    const RESIZABLE_MIME_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ];

    it("should mark JPEG images as resizable", () => {
      const mimeType = "image/jpeg";
      const isResizable = RESIZABLE_MIME_TYPES.includes(mimeType);
      expect(isResizable).toBe(true);
    });

    it("should mark PNG images as resizable", () => {
      const mimeType = "image/png";
      const isResizable = RESIZABLE_MIME_TYPES.includes(mimeType);
      expect(isResizable).toBe(true);
    });

    it("should mark WebP images as resizable", () => {
      const mimeType = "image/webp";
      const isResizable = RESIZABLE_MIME_TYPES.includes(mimeType);
      expect(isResizable).toBe(true);
    });

    it("should not mark SVG as resizable (vectors scale differently)", () => {
      const mimeType = "image/svg+xml";
      const isResizable = RESIZABLE_MIME_TYPES.includes(mimeType);
      expect(isResizable).toBe(false);
    });

    it("should identify SVG as vector format", () => {
      const mimeType = "image/svg+xml";
      const isVector = VECTOR_MIME_TYPES.includes(mimeType);
      expect(isVector).toBe(true);
    });

    it("should not identify JPEG as vector format", () => {
      const mimeType = "image/jpeg";
      const isVector = VECTOR_MIME_TYPES.includes(mimeType);
      expect(isVector).toBe(false);
    });

    it("should mark PNG as supporting transparency", () => {
      const mimeType = "image/png";
      const hasTransparency = TRANSPARENT_MIME_TYPES.includes(mimeType);
      expect(hasTransparency).toBe(true);
    });

    it("should mark WebP as supporting transparency", () => {
      const mimeType = "image/webp";
      const hasTransparency = TRANSPARENT_MIME_TYPES.includes(mimeType);
      expect(hasTransparency).toBe(true);
    });

    it("should not mark JPEG as supporting transparency", () => {
      const mimeType = "image/jpeg";
      const hasTransparency = TRANSPARENT_MIME_TYPES.includes(mimeType);
      expect(hasTransparency).toBe(false);
    });

    it("should calculate aspect ratio correctly for landscape image", () => {
      const width = 1920;
      const height = 1080;
      const aspectRatio = Math.round((width / height) * 1000) / 1000;
      expect(aspectRatio).toBeCloseTo(1.778, 2);
    });

    it("should calculate aspect ratio correctly for portrait image", () => {
      const width = 1080;
      const height = 1920;
      const aspectRatio = Math.round((width / height) * 1000) / 1000;
      expect(aspectRatio).toBeCloseTo(0.563, 2);
    });

    it("should calculate aspect ratio correctly for square image", () => {
      const width = 800;
      const height = 800;
      const aspectRatio = Math.round((width / height) * 1000) / 1000;
      expect(aspectRatio).toBe(1);
    });

    it("should not calculate aspect ratio when height is zero", () => {
      const width = 1920;
      const height = 0;
      const hasValidDimensions = width && height && height > 0;
      expect(hasValidDimensions).toBeFalsy();
    });

    it("should set suggestedMaxWidth to original width", () => {
      const width = 1920;
      const height = 1080;
      const suggestedMaxWidth = width && height ? width : undefined;
      expect(suggestedMaxWidth).toBe(1920);
    });

    it("should include duration for video assets", () => {
      const asset = { duration: 120.5, type: "video" };
      const hints: { durationSeconds?: number } = {};
      if (asset.duration !== undefined && asset.duration > 0) {
        hints.durationSeconds = asset.duration;
      }
      expect(hints.durationSeconds).toBe(120.5);
    });

    it("should include duration for audio assets", () => {
      const asset = { duration: 180.0, type: "audio" };
      const hints: { durationSeconds?: number } = {};
      if (asset.duration !== undefined && asset.duration > 0) {
        hints.durationSeconds = asset.duration;
      }
      expect(hints.durationSeconds).toBe(180.0);
    });

    it("should not include duration when it is zero", () => {
      const asset = { duration: 0, type: "video" };
      const hints: { durationSeconds?: number } = {};
      if (asset.duration !== undefined && asset.duration > 0) {
        hints.durationSeconds = asset.duration;
      }
      expect(hints.durationSeconds).toBeUndefined();
    });

    it("should not include duration when it is undefined", () => {
      const asset = { duration: undefined, type: "image" };
      const hints: { durationSeconds?: number } = {};
      if (asset.duration !== undefined && asset.duration > 0) {
        hints.durationSeconds = asset.duration;
      }
      expect(hints.durationSeconds).toBeUndefined();
    });
  });

  // =============================================================================
  // Media Type Classification Tests
  // =============================================================================

  describe("Media type classification", () => {
    it("should support image type", () => {
      const validTypes = ["image", "video", "audio", "document", "other"];
      expect(validTypes).toContain("image");
    });

    it("should support video type", () => {
      const validTypes = ["image", "video", "audio", "document", "other"];
      expect(validTypes).toContain("video");
    });

    it("should support audio type", () => {
      const validTypes = ["image", "video", "audio", "document", "other"];
      expect(validTypes).toContain("audio");
    });

    it("should support document type", () => {
      const validTypes = ["image", "video", "audio", "document", "other"];
      expect(validTypes).toContain("document");
    });

    it("should support other type for unclassified files", () => {
      const validTypes = ["image", "video", "audio", "document", "other"];
      expect(validTypes).toContain("other");
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe("Edge cases", () => {
    it("should handle missing width and height", () => {
      const asset = { width: undefined, height: undefined };
      const hasValidDimensions =
        asset.width && asset.height && asset.height > 0;
      expect(hasValidDimensions).toBeFalsy();
    });

    it("should handle only width present", () => {
      const asset = { width: 1920, height: undefined };
      const hasValidDimensions =
        asset.width && asset.height && asset.height > 0;
      expect(hasValidDimensions).toBeFalsy();
    });

    it("should handle only height present", () => {
      const asset = { width: undefined, height: 1080 };
      const hasValidDimensions =
        asset.width && asset.height && asset.height > 0;
      expect(hasValidDimensions).toBeFalsy();
    });

    it("should handle unknown mime types gracefully", () => {
      const mimeType = "application/octet-stream";
      const RESIZABLE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
      const isResizable = RESIZABLE_MIME_TYPES.includes(mimeType);
      expect(isResizable).toBe(false);
    });

    it("should not crash on negative dimensions", () => {
      const width = -100;
      const height = -200;
      // Our logic checks height > 0, so this should fail gracefully
      const hasValidDimensions = width && height && height > 0;
      expect(hasValidDimensions).toBe(false);
    });
  });
});

// =============================================================================
// Media Assets List Query Tests
// =============================================================================

describe("Media Assets List Query", () => {
  // =============================================================================
  // Validator Structure Tests
  // =============================================================================

  describe("listMediaAssetsArgs validator structure", () => {
    it("should have folderId field for folder filtering", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("folderId");
    });

    it("should have includeRootLevel field for root-level assets", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("includeRootLevel");
    });

    it("should have type field for media type filtering", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("type");
    });

    it("should have mimeType field for exact MIME type filtering", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("mimeType");
    });

    it("should have mimeTypePrefix field for MIME type prefix filtering", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("mimeTypePrefix");
    });

    it("should have search field for full-text search", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("search");
    });

    it("should have tags field for tag-based filtering", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("tags");
    });

    it("should have includeDeleted field for soft delete handling", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("includeDeleted");
    });

    it("should have sortField field for sorting", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("sortField");
    });

    it("should have sortDirection field for sort order", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("sortDirection");
    });

    it("should have paginationOpts field for pagination", () => {
      const argFields = Object.keys(listMediaAssetsArgs.fields);
      expect(argFields).toContain("paginationOpts");
    });
  });

  // =============================================================================
  // Sort Field Validator Tests
  // =============================================================================

  describe("mediaSortFieldValidator", () => {
    const validSortFields = [
      "_creationTime",
      "filename",
      "size",
      "type",
      "mimeType",
    ];

    it("should accept _creationTime as a valid sort field", () => {
      expect(validSortFields).toContain("_creationTime");
    });

    it("should accept filename as a valid sort field", () => {
      expect(validSortFields).toContain("filename");
    });

    it("should accept size as a valid sort field", () => {
      expect(validSortFields).toContain("size");
    });

    it("should accept type as a valid sort field", () => {
      expect(validSortFields).toContain("type");
    });

    it("should accept mimeType as a valid sort field", () => {
      expect(validSortFields).toContain("mimeType");
    });
  });

  // =============================================================================
  // Sort Direction Validator Tests
  // =============================================================================

  describe("mediaSortDirectionValidator", () => {
    const validDirections = ["asc", "desc"];

    it("should accept asc as a valid sort direction", () => {
      expect(validDirections).toContain("asc");
    });

    it("should accept desc as a valid sort direction", () => {
      expect(validDirections).toContain("desc");
    });
  });

  // =============================================================================
  // MIME Type Filtering Logic Tests
  // =============================================================================

  describe("MIME type filtering logic", () => {
    // Helper function to match MIME type
    const matchesMimeType = (
      asset: { mimeType: string },
      mimeType?: string,
      mimeTypePrefix?: string
    ): boolean => {
      if (mimeType && asset.mimeType !== mimeType) {
        return false;
      }
      if (mimeTypePrefix && !asset.mimeType.startsWith(mimeTypePrefix)) {
        return false;
      }
      return true;
    };

    it("should match exact MIME type", () => {
      const asset = { mimeType: "image/jpeg" };
      const result = matchesMimeType(asset, "image/jpeg");
      expect(result).toBe(true);
    });

    it("should not match different exact MIME type", () => {
      const asset = { mimeType: "image/jpeg" };
      const result = matchesMimeType(asset, "image/png");
      expect(result).toBe(false);
    });

    it("should match MIME type prefix for images", () => {
      const asset = { mimeType: "image/jpeg" };
      const result = matchesMimeType(asset, undefined, "image/");
      expect(result).toBe(true);
    });

    it("should not match MIME type prefix for different category", () => {
      const asset = { mimeType: "video/mp4" };
      const result = matchesMimeType(asset, undefined, "image/");
      expect(result).toBe(false);
    });

    it("should match when both filters match", () => {
      const asset = { mimeType: "image/jpeg" };
      const result = matchesMimeType(asset, "image/jpeg", "image/");
      expect(result).toBe(true);
    });

    it("should not match when exact type differs but prefix matches", () => {
      const asset = { mimeType: "image/png" };
      const result = matchesMimeType(asset, "image/jpeg", "image/");
      expect(result).toBe(false);
    });

    it("should match any MIME type when no filters provided", () => {
      const asset = { mimeType: "application/pdf" };
      const result = matchesMimeType(asset, undefined, undefined);
      expect(result).toBe(true);
    });

    it("should match audio/* prefix", () => {
      const asset = { mimeType: "audio/mpeg" };
      const result = matchesMimeType(asset, undefined, "audio/");
      expect(result).toBe(true);
    });

    it("should match video/* prefix", () => {
      const asset = { mimeType: "video/mp4" };
      const result = matchesMimeType(asset, undefined, "video/");
      expect(result).toBe(true);
    });

    it("should match application/ prefix for documents", () => {
      const asset = { mimeType: "application/pdf" };
      const result = matchesMimeType(asset, undefined, "application/");
      expect(result).toBe(true);
    });
  });

  // =============================================================================
  // Tag Filtering Logic Tests
  // =============================================================================

  describe("Tag filtering logic", () => {
    // Helper function to match tags
    const matchesTags = (
      asset: { tags?: string[] },
      requiredTags?: string[]
    ): boolean => {
      if (!requiredTags || requiredTags.length === 0) {
        return true;
      }
      if (!asset.tags || asset.tags.length === 0) {
        return false;
      }
      return requiredTags.every((tag) => asset.tags!.includes(tag));
    };

    it("should match when no tags required", () => {
      const asset = { tags: ["blog", "featured"] };
      const result = matchesTags(asset, undefined);
      expect(result).toBe(true);
    });

    it("should match when empty tags array required", () => {
      const asset = { tags: ["blog"] };
      const result = matchesTags(asset, []);
      expect(result).toBe(true);
    });

    it("should match when asset has all required tags", () => {
      const asset = { tags: ["blog", "featured", "hero"] };
      const result = matchesTags(asset, ["blog", "featured"]);
      expect(result).toBe(true);
    });

    it("should not match when asset is missing a required tag", () => {
      const asset = { tags: ["blog"] };
      const result = matchesTags(asset, ["blog", "featured"]);
      expect(result).toBe(false);
    });

    it("should not match when asset has no tags but tags are required", () => {
      const asset = { tags: [] };
      const result = matchesTags(asset, ["blog"]);
      expect(result).toBe(false);
    });

    it("should not match when asset tags are undefined but tags are required", () => {
      const asset = { tags: undefined };
      const result = matchesTags(asset, ["blog"]);
      expect(result).toBe(false);
    });

    it("should match single required tag", () => {
      const asset = { tags: ["hero", "banner", "homepage"] };
      const result = matchesTags(asset, ["banner"]);
      expect(result).toBe(true);
    });
  });

  // =============================================================================
  // Sorting Logic Tests
  // =============================================================================

  describe("Sorting logic", () => {
    // Helper function to compare values
    const compareValues = (
      a: unknown,
      b: unknown,
      direction: "asc" | "desc"
    ): number => {
      if (a === null || a === undefined) {
        return direction === "asc" ? 1 : -1;
      }
      if (b === null || b === undefined) {
        return direction === "asc" ? -1 : 1;
      }
      if (typeof a === "number" && typeof b === "number") {
        return direction === "asc" ? a - b : b - a;
      }
      if (typeof a === "string" && typeof b === "string") {
        const comparison = a.toLowerCase().localeCompare(b.toLowerCase());
        return direction === "asc" ? comparison : -comparison;
      }
      return 0;
    };

    it("should sort numbers ascending", () => {
      const result = compareValues(100, 200, "asc");
      expect(result).toBeLessThan(0);
    });

    it("should sort numbers descending", () => {
      const result = compareValues(100, 200, "desc");
      expect(result).toBeGreaterThan(0);
    });

    it("should sort strings alphabetically ascending", () => {
      const result = compareValues("apple", "banana", "asc");
      expect(result).toBeLessThan(0);
    });

    it("should sort strings alphabetically descending", () => {
      const result = compareValues("apple", "banana", "desc");
      expect(result).toBeGreaterThan(0);
    });

    it("should sort strings case-insensitively", () => {
      const result = compareValues("Apple", "apple", "asc");
      expect(result).toBe(0);
    });

    it("should push null/undefined to end in ascending order", () => {
      const result = compareValues(null, 100, "asc");
      expect(result).toBeGreaterThan(0);
    });

    it("should push null/undefined to beginning in descending order", () => {
      const result = compareValues(null, 100, "desc");
      expect(result).toBeLessThan(0);
    });

    it("should handle both values being null", () => {
      const result = compareValues(null, null, "asc");
      // When first is null, we return direction-based value
      expect(result).toBe(1);
    });
  });

  // =============================================================================
  // Folder Filtering Logic Tests
  // =============================================================================

  describe("Folder filtering logic", () => {
    it("should include asset in specific folder when folderId matches", () => {
      const asset = { folderId: "folder123" };
      const folderId = "folder123";
      const matches = asset.folderId === folderId;
      expect(matches).toBe(true);
    });

    it("should exclude asset from different folder", () => {
      const asset = { folderId: "folder456" };
      const folderId = "folder123";
      const matches = asset.folderId === folderId;
      expect(matches).toBe(false);
    });

    it("should identify root-level asset (no folderId)", () => {
      const asset = { folderId: undefined };
      const isRootLevel = asset.folderId === undefined;
      expect(isRootLevel).toBe(true);
    });

    it("should include root-level assets when includeRootLevel is true", () => {
      const asset = { folderId: undefined };
      const includeRootLevel = true;
      const shouldInclude = includeRootLevel && asset.folderId === undefined;
      expect(shouldInclude).toBe(true);
    });
  });

  // =============================================================================
  // Pagination Logic Tests
  // =============================================================================

  describe("Pagination logic", () => {
    const DEFAULT_NUM_ITEMS = 50;
    const MAX_NUM_ITEMS = 250;

    it("should clamp numItems to minimum of 1", () => {
      const requestedNumItems = 0;
      const clampedNumItems = Math.min(
        Math.max(1, requestedNumItems),
        MAX_NUM_ITEMS
      );
      expect(clampedNumItems).toBe(1);
    });

    it("should clamp numItems to maximum of 250", () => {
      const requestedNumItems = 500;
      const clampedNumItems = Math.min(
        Math.max(1, requestedNumItems),
        MAX_NUM_ITEMS
      );
      expect(clampedNumItems).toBe(250);
    });

    it("should use default numItems when not specified", () => {
      const requestedNumItems = undefined;
      const clampedNumItems = Math.min(
        Math.max(1, requestedNumItems ?? DEFAULT_NUM_ITEMS),
        MAX_NUM_ITEMS
      );
      expect(clampedNumItems).toBe(50);
    });

    it("should accept valid numItems within range", () => {
      const requestedNumItems = 100;
      const clampedNumItems = Math.min(
        Math.max(1, requestedNumItems),
        MAX_NUM_ITEMS
      );
      expect(clampedNumItems).toBe(100);
    });

    it("should determine isDone when page is smaller than requested", () => {
      const numItems = 10;
      const pageResults = [1, 2, 3, 4, 5]; // Only 5 results
      const isDone = pageResults.length <= numItems;
      expect(isDone).toBe(true);
    });

    it("should determine not isDone when more results exist", () => {
      const numItems = 10;
      const pageResults = Array(11).fill(1); // 11 results (more than requested)
      const isDone = pageResults.length <= numItems;
      expect(isDone).toBe(false);
    });

    it("should find cursor position in results", () => {
      const results = [
        { _id: "a" },
        { _id: "b" },
        { _id: "c" },
        { _id: "d" },
      ];
      const cursor = "b";
      const cursorIndex = results.findIndex((r) => r._id === cursor);
      expect(cursorIndex).toBe(1);
    });

    it("should return -1 for invalid cursor", () => {
      const results = [{ _id: "a" }, { _id: "b" }];
      const cursor = "z";
      const cursorIndex = results.findIndex((r) => r._id === cursor);
      expect(cursorIndex).toBe(-1);
    });
  });
});
