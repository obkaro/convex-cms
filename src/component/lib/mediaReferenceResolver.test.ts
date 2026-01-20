/**
 * Tests for Media Reference Resolver Utilities
 *
 * These tests verify the media reference extraction, MIME type matching,
 * and other pure utility functions.
 * Database-dependent tests would require convex-test setup.
 */
import { describe, it, expect } from "vitest";
import {
  extractMediaIds,
  matchesMimeTypePattern,
  matchesAnyMimeTypePattern,
} from "./mediaReferenceResolver.js";

// =============================================================================
// extractMediaIds Tests
// =============================================================================

describe("extractMediaIds", () => {
  it("should extract single media asset IDs", () => {
    const fields = [
      { name: "featuredImage", type: "media", options: {} },
      { name: "title", type: "text" },
    ];

    const data = {
      featuredImage: "media_123",
      title: "Hello World",
    };

    const ids = extractMediaIds(data, fields);
    expect(ids).toEqual(["media_123"]);
  });

  it("should extract multiple media asset IDs (gallery)", () => {
    const fields = [
      { name: "gallery", type: "media", options: { multiple: true } },
      { name: "title", type: "text" },
    ];

    const data = {
      gallery: ["media_1", "media_2", "media_3"],
      title: "Photo Gallery",
    };

    const ids = extractMediaIds(data, fields);
    expect(ids).toEqual(["media_1", "media_2", "media_3"]);
  });

  it("should extract from multiple media fields", () => {
    const fields = [
      { name: "featuredImage", type: "media", options: {} },
      { name: "thumbnail", type: "media", options: {} },
      { name: "gallery", type: "media", options: { multiple: true } },
    ];

    const data = {
      featuredImage: "media_1",
      thumbnail: "media_2",
      gallery: ["media_3", "media_4"],
    };

    const ids = extractMediaIds(data, fields);
    expect(ids).toEqual(["media_1", "media_2", "media_3", "media_4"]);
  });

  it("should skip null/undefined media values", () => {
    const fields = [
      { name: "featuredImage", type: "media", options: {} },
      { name: "thumbnail", type: "media", options: {} },
    ];

    const data = {
      featuredImage: "media_1",
      thumbnail: null,
    };

    const ids = extractMediaIds(data, fields);
    expect(ids).toEqual(["media_1"]);
  });

  it("should skip empty media arrays", () => {
    const fields = [{ name: "gallery", type: "media", options: { multiple: true } }];

    const data = {
      gallery: [],
    };

    const ids = extractMediaIds(data, fields);
    expect(ids).toEqual([]);
  });

  it("should skip non-string values in arrays", () => {
    const fields = [{ name: "gallery", type: "media", options: { multiple: true } }];

    const data = {
      gallery: ["media_1", 123, "media_2"],
    };

    const ids = extractMediaIds(data, fields);
    expect(ids).toEqual(["media_1", "media_2"]);
  });

  it("should ignore non-media fields", () => {
    const fields = [
      { name: "title", type: "text" },
      { name: "count", type: "number" },
      { name: "author", type: "reference", options: {} },
      { name: "featuredImage", type: "media", options: {} },
    ];

    const data = {
      title: "Hello",
      count: 42,
      author: "user_1",
      featuredImage: "media_1",
    };

    const ids = extractMediaIds(data, fields);
    expect(ids).toEqual(["media_1"]);
  });

  it("should return empty array when no media fields", () => {
    const fields = [
      { name: "title", type: "text" },
      { name: "body", type: "richText" },
    ];

    const data = {
      title: "Hello",
      body: "<p>World</p>",
    };

    const ids = extractMediaIds(data, fields);
    expect(ids).toEqual([]);
  });

  it("should return empty array when data is empty", () => {
    const fields = [{ name: "featuredImage", type: "media", options: {} }];

    const ids = extractMediaIds({}, fields);
    expect(ids).toEqual([]);
  });
});

// =============================================================================
// matchesMimeTypePattern Tests
// =============================================================================

describe("matchesMimeTypePattern", () => {
  it("should match exact MIME types", () => {
    expect(matchesMimeTypePattern("image/jpeg", "image/jpeg")).toBe(true);
    expect(matchesMimeTypePattern("image/png", "image/png")).toBe(true);
    expect(matchesMimeTypePattern("video/mp4", "video/mp4")).toBe(true);
  });

  it("should not match different exact MIME types", () => {
    expect(matchesMimeTypePattern("image/jpeg", "image/png")).toBe(false);
    expect(matchesMimeTypePattern("video/mp4", "audio/mp3")).toBe(false);
  });

  it("should match wildcard patterns", () => {
    expect(matchesMimeTypePattern("image/jpeg", "image/*")).toBe(true);
    expect(matchesMimeTypePattern("image/png", "image/*")).toBe(true);
    expect(matchesMimeTypePattern("image/webp", "image/*")).toBe(true);
    expect(matchesMimeTypePattern("video/mp4", "video/*")).toBe(true);
    expect(matchesMimeTypePattern("audio/mp3", "audio/*")).toBe(true);
  });

  it("should not match different type wildcards", () => {
    expect(matchesMimeTypePattern("video/mp4", "image/*")).toBe(false);
    expect(matchesMimeTypePattern("audio/mp3", "image/*")).toBe(false);
    expect(matchesMimeTypePattern("image/jpeg", "video/*")).toBe(false);
  });

  it("should handle document MIME types", () => {
    expect(matchesMimeTypePattern("application/pdf", "application/pdf")).toBe(true);
    expect(matchesMimeTypePattern("application/pdf", "application/*")).toBe(true);
    expect(
      matchesMimeTypePattern(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/*"
      )
    ).toBe(true);
  });
});

// =============================================================================
// matchesAnyMimeTypePattern Tests
// =============================================================================

describe("matchesAnyMimeTypePattern", () => {
  it("should match if any pattern matches", () => {
    expect(matchesAnyMimeTypePattern("image/jpeg", ["image/jpeg", "image/png"])).toBe(true);
    expect(matchesAnyMimeTypePattern("image/png", ["image/jpeg", "image/png"])).toBe(true);
  });

  it("should match wildcard in pattern array", () => {
    expect(matchesAnyMimeTypePattern("image/jpeg", ["image/*"])).toBe(true);
    expect(matchesAnyMimeTypePattern("video/mp4", ["image/*", "video/*"])).toBe(true);
  });

  it("should match mixed exact and wildcard patterns", () => {
    const patterns = ["image/jpeg", "video/*", "application/pdf"];

    expect(matchesAnyMimeTypePattern("image/jpeg", patterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("video/mp4", patterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("video/webm", patterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("application/pdf", patterns)).toBe(true);
  });

  it("should return false if no pattern matches", () => {
    expect(matchesAnyMimeTypePattern("audio/mp3", ["image/*", "video/*"])).toBe(false);
    expect(matchesAnyMimeTypePattern("application/pdf", ["image/jpeg", "image/png"])).toBe(false);
  });

  it("should handle empty pattern array", () => {
    expect(matchesAnyMimeTypePattern("image/jpeg", [])).toBe(false);
  });

  it("should handle typical gallery constraints", () => {
    // Common pattern: only allow images for a gallery
    const imageOnlyPatterns = ["image/*"];

    expect(matchesAnyMimeTypePattern("image/jpeg", imageOnlyPatterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("image/png", imageOnlyPatterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("image/webp", imageOnlyPatterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("image/gif", imageOnlyPatterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("video/mp4", imageOnlyPatterns)).toBe(false);
    expect(matchesAnyMimeTypePattern("application/pdf", imageOnlyPatterns)).toBe(false);
  });

  it("should handle specific image type constraints", () => {
    // Specific pattern: only allow JPEG and PNG
    const specificPatterns = ["image/jpeg", "image/png"];

    expect(matchesAnyMimeTypePattern("image/jpeg", specificPatterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("image/png", specificPatterns)).toBe(true);
    expect(matchesAnyMimeTypePattern("image/webp", specificPatterns)).toBe(false);
    expect(matchesAnyMimeTypePattern("image/gif", specificPatterns)).toBe(false);
  });
});

// =============================================================================
// Integration: Media Field Configuration Scenarios
// =============================================================================

describe("Media Field Configuration Scenarios", () => {
  it("should support single featured image with image/* constraint", () => {
    // Configuration scenario: Featured image that accepts any image type
    const fields = [
      {
        name: "featuredImage",
        type: "media",
        options: {
          allowedMimeTypes: ["image/*"],
          multiple: false,
        },
      },
    ];

    const data = { featuredImage: "media_123" };
    const ids = extractMediaIds(data, fields);

    expect(ids).toEqual(["media_123"]);
    expect(matchesAnyMimeTypePattern("image/jpeg", fields[0].options.allowedMimeTypes!)).toBe(true);
    expect(matchesAnyMimeTypePattern("image/webp", fields[0].options.allowedMimeTypes!)).toBe(true);
    expect(matchesAnyMimeTypePattern("video/mp4", fields[0].options.allowedMimeTypes!)).toBe(false);
  });

  it("should support gallery with specific image types", () => {
    // Configuration scenario: Gallery with 2-10 images, JPEG/PNG/WebP only
    const fields = [
      {
        name: "gallery",
        type: "media",
        options: {
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          multiple: true,
          minItems: 2,
          max: 10,
        },
      },
    ];

    const data = { gallery: ["media_1", "media_2", "media_3"] };
    const ids = extractMediaIds(data, fields);

    expect(ids).toHaveLength(3);
    expect(matchesAnyMimeTypePattern("image/jpeg", fields[0].options.allowedMimeTypes!)).toBe(true);
    expect(matchesAnyMimeTypePattern("image/gif", fields[0].options.allowedMimeTypes!)).toBe(false);
  });

  it("should support document attachment field", () => {
    // Configuration scenario: Document attachment field for PDFs and Office docs
    const fields = [
      {
        name: "attachment",
        type: "media",
        options: {
          allowedMimeTypes: ["application/pdf", "application/*"],
          multiple: false,
        },
      },
    ];

    const data = { attachment: "media_doc_123" };
    const ids = extractMediaIds(data, fields);

    expect(ids).toEqual(["media_doc_123"]);
    expect(matchesAnyMimeTypePattern("application/pdf", fields[0].options.allowedMimeTypes!)).toBe(
      true
    );
  });

  it("should support mixed media gallery (images and videos)", () => {
    // Configuration scenario: Media gallery that accepts both images and videos
    const fields = [
      {
        name: "mediaGallery",
        type: "media",
        options: {
          allowedMimeTypes: ["image/*", "video/*"],
          multiple: true,
        },
      },
    ];

    const data = { mediaGallery: ["img_1", "img_2", "video_1"] };
    const ids = extractMediaIds(data, fields);

    expect(ids).toHaveLength(3);
    expect(matchesAnyMimeTypePattern("image/jpeg", fields[0].options.allowedMimeTypes!)).toBe(true);
    expect(matchesAnyMimeTypePattern("video/mp4", fields[0].options.allowedMimeTypes!)).toBe(true);
    expect(matchesAnyMimeTypePattern("audio/mp3", fields[0].options.allowedMimeTypes!)).toBe(false);
  });
});
