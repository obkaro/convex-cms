/**
 * Tests for the Media Metadata Extractor
 *
 * Comprehensive tests covering:
 * - MIME type classification
 * - Image metadata extraction (dimensions, transparency, vectors)
 * - Video metadata extraction (duration, codecs)
 * - Audio metadata extraction (duration, codecs)
 * - Document metadata extraction (categories, preview capability)
 * - Helper functions (extension extraction, aspect ratio, duration formatting)
 * - Edge cases and validation
 */

import { describe, it, expect } from "vitest";
import {
  extractMetadata,
  extractExtension,
  classifyMimeType,
  calculateAspectRatio,
  formatDuration,
  suggestImageFormat,
  categorizeDocument,
  canPreviewDocument,
  validateDimensions,
  validateDuration,
  validateFileSize,
  type ImageMetadata,
  type VideoMetadata,
  type AudioMetadata,
  type DocumentMetadata,
  type OtherMetadata,
} from "./metadataExtractor.js";

// =============================================================================
// Extension Extraction Tests
// =============================================================================

describe("extractExtension", () => {
  it("should extract simple extension", () => {
    expect(extractExtension("photo.jpg")).toBe("jpg");
  });

  it("should return lowercase extension", () => {
    expect(extractExtension("photo.JPG")).toBe("jpg");
    expect(extractExtension("document.PDF")).toBe("pdf");
  });

  it("should handle multiple dots in filename", () => {
    expect(extractExtension("my.vacation.photo.jpg")).toBe("jpg");
  });

  it("should handle no extension", () => {
    expect(extractExtension("filename")).toBe("");
  });

  it("should handle dot at end", () => {
    expect(extractExtension("filename.")).toBe("");
  });

  it("should handle hidden files (starting with dot)", () => {
    expect(extractExtension(".gitignore")).toBe("gitignore");
  });

  it("should handle complex extensions", () => {
    expect(extractExtension("archive.tar.gz")).toBe("gz");
  });
});

// =============================================================================
// MIME Type Classification Tests
// =============================================================================

describe("classifyMimeType", () => {
  describe("image types", () => {
    it("should classify JPEG as image", () => {
      expect(classifyMimeType("image/jpeg")).toBe("image");
      expect(classifyMimeType("image/jpg")).toBe("image");
    });

    it("should classify PNG as image", () => {
      expect(classifyMimeType("image/png")).toBe("image");
    });

    it("should classify GIF as image", () => {
      expect(classifyMimeType("image/gif")).toBe("image");
    });

    it("should classify WebP as image", () => {
      expect(classifyMimeType("image/webp")).toBe("image");
    });

    it("should classify AVIF as image", () => {
      expect(classifyMimeType("image/avif")).toBe("image");
    });

    it("should classify SVG as image", () => {
      expect(classifyMimeType("image/svg+xml")).toBe("image");
    });

    it("should classify HEIC/HEIF as image", () => {
      expect(classifyMimeType("image/heic")).toBe("image");
      expect(classifyMimeType("image/heif")).toBe("image");
    });

    it("should classify unknown image/* types as image", () => {
      expect(classifyMimeType("image/x-custom")).toBe("image");
    });
  });

  describe("video types", () => {
    it("should classify MP4 as video", () => {
      expect(classifyMimeType("video/mp4")).toBe("video");
    });

    it("should classify WebM as video", () => {
      expect(classifyMimeType("video/webm")).toBe("video");
    });

    it("should classify QuickTime as video", () => {
      expect(classifyMimeType("video/quicktime")).toBe("video");
    });

    it("should classify unknown video/* types as video", () => {
      expect(classifyMimeType("video/x-custom")).toBe("video");
    });
  });

  describe("audio types", () => {
    it("should classify MP3 as audio", () => {
      expect(classifyMimeType("audio/mpeg")).toBe("audio");
      expect(classifyMimeType("audio/mp3")).toBe("audio");
    });

    it("should classify WAV as audio", () => {
      expect(classifyMimeType("audio/wav")).toBe("audio");
    });

    it("should classify OGG audio as audio", () => {
      expect(classifyMimeType("audio/ogg")).toBe("audio");
    });

    it("should classify unknown audio/* types as audio", () => {
      expect(classifyMimeType("audio/x-custom")).toBe("audio");
    });
  });

  describe("document types", () => {
    it("should classify PDF as document", () => {
      expect(classifyMimeType("application/pdf")).toBe("document");
    });

    it("should classify Word documents as document", () => {
      expect(classifyMimeType("application/msword")).toBe("document");
      expect(
        classifyMimeType(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe("document");
    });

    it("should classify Excel as document", () => {
      expect(classifyMimeType("application/vnd.ms-excel")).toBe("document");
    });

    it("should classify plain text as document", () => {
      expect(classifyMimeType("text/plain")).toBe("document");
    });

    it("should classify CSV as document", () => {
      expect(classifyMimeType("text/csv")).toBe("document");
    });

    it("should classify JSON as document", () => {
      expect(classifyMimeType("application/json")).toBe("document");
    });
  });

  describe("other types", () => {
    it("should classify ZIP as other", () => {
      expect(classifyMimeType("application/zip")).toBe("other");
    });

    it("should classify octet-stream as other", () => {
      expect(classifyMimeType("application/octet-stream")).toBe("other");
    });

    it("should classify unknown types as other", () => {
      expect(classifyMimeType("application/x-unknown")).toBe("other");
    });
  });

  it("should be case-insensitive", () => {
    expect(classifyMimeType("IMAGE/JPEG")).toBe("image");
    expect(classifyMimeType("Video/MP4")).toBe("video");
    expect(classifyMimeType("AUDIO/MPEG")).toBe("audio");
  });
});

// =============================================================================
// Aspect Ratio Calculation Tests
// =============================================================================

describe("calculateAspectRatio", () => {
  it("should calculate 16:9 aspect ratio", () => {
    expect(calculateAspectRatio(1920, 1080)).toBe(1.778);
  });

  it("should calculate 4:3 aspect ratio", () => {
    expect(calculateAspectRatio(1024, 768)).toBe(1.333);
  });

  it("should calculate 1:1 aspect ratio", () => {
    expect(calculateAspectRatio(500, 500)).toBe(1);
  });

  it("should calculate portrait aspect ratio", () => {
    expect(calculateAspectRatio(1080, 1920)).toBe(0.563);
  });

  it("should return undefined for missing width", () => {
    expect(calculateAspectRatio(undefined, 1080)).toBeUndefined();
  });

  it("should return undefined for missing height", () => {
    expect(calculateAspectRatio(1920, undefined)).toBeUndefined();
  });

  it("should return undefined for zero height", () => {
    expect(calculateAspectRatio(1920, 0)).toBeUndefined();
  });

  it("should return undefined for zero width", () => {
    expect(calculateAspectRatio(0, 1080)).toBeUndefined();
  });

  it("should return undefined for negative dimensions", () => {
    expect(calculateAspectRatio(-1920, 1080)).toBeUndefined();
    expect(calculateAspectRatio(1920, -1080)).toBeUndefined();
  });
});

// =============================================================================
// Duration Formatting Tests
// =============================================================================

describe("formatDuration", () => {
  it("should format seconds only", () => {
    expect(formatDuration(45)).toBe("00:45");
  });

  it("should format minutes and seconds", () => {
    expect(formatDuration(125)).toBe("02:05");
  });

  it("should format hours, minutes, and seconds", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("should handle zero duration", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("should handle exact minute", () => {
    expect(formatDuration(60)).toBe("01:00");
  });

  it("should handle exact hour", () => {
    expect(formatDuration(3600)).toBe("01:00:00");
  });

  it("should return undefined for undefined input", () => {
    expect(formatDuration(undefined)).toBeUndefined();
  });

  it("should return undefined for negative duration", () => {
    expect(formatDuration(-10)).toBeUndefined();
  });

  it("should return undefined for NaN", () => {
    expect(formatDuration(NaN)).toBeUndefined();
  });

  it("should return undefined for Infinity", () => {
    expect(formatDuration(Infinity)).toBeUndefined();
  });

  it("should handle fractional seconds by flooring", () => {
    expect(formatDuration(65.7)).toBe("01:05");
  });
});

// =============================================================================
// Image Format Suggestion Tests
// =============================================================================

describe("suggestImageFormat", () => {
  it("should suggest SVG for SVG input", () => {
    expect(suggestImageFormat("image/svg+xml", false)).toBe("svg");
  });

  it("should suggest WebP for JPEG", () => {
    expect(suggestImageFormat("image/jpeg", false)).toBe("webp");
  });

  it("should suggest WebP for transparent images", () => {
    expect(suggestImageFormat("image/png", true)).toBe("webp");
  });

  it("should suggest WebP for GIF", () => {
    expect(suggestImageFormat("image/gif", true)).toBe("webp");
  });
});

// =============================================================================
// Document Categorization Tests
// =============================================================================

describe("categorizeDocument", () => {
  it("should categorize PDF correctly", () => {
    expect(categorizeDocument("application/pdf")).toBe("pdf");
  });

  it("should categorize Word documents correctly", () => {
    expect(categorizeDocument("application/msword")).toBe("word");
    expect(
      categorizeDocument(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("word");
  });

  it("should categorize Excel as spreadsheet", () => {
    expect(categorizeDocument("application/vnd.ms-excel")).toBe("spreadsheet");
    expect(
      categorizeDocument(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe("spreadsheet");
  });

  it("should categorize CSV as spreadsheet", () => {
    expect(categorizeDocument("text/csv")).toBe("spreadsheet");
  });

  it("should categorize PowerPoint as presentation", () => {
    expect(categorizeDocument("application/vnd.ms-powerpoint")).toBe(
      "presentation"
    );
  });

  it("should categorize plain text as text", () => {
    expect(categorizeDocument("text/plain")).toBe("text");
  });

  it("should categorize JSON as text", () => {
    expect(categorizeDocument("application/json")).toBe("text");
  });

  it("should categorize unknown as other", () => {
    expect(categorizeDocument("application/x-unknown")).toBe("other");
  });
});

// =============================================================================
// Document Preview Capability Tests
// =============================================================================

describe("canPreviewDocument", () => {
  it("should return true for PDF", () => {
    expect(canPreviewDocument("application/pdf")).toBe(true);
  });

  it("should return true for plain text", () => {
    expect(canPreviewDocument("text/plain")).toBe(true);
  });

  it("should return true for JSON", () => {
    expect(canPreviewDocument("application/json")).toBe(true);
  });

  it("should return true for XML", () => {
    expect(canPreviewDocument("application/xml")).toBe(true);
    expect(canPreviewDocument("text/xml")).toBe(true);
  });

  it("should return false for Word documents", () => {
    expect(canPreviewDocument("application/msword")).toBe(false);
  });

  it("should return false for Excel", () => {
    expect(canPreviewDocument("application/vnd.ms-excel")).toBe(false);
  });
});

// =============================================================================
// Main extractMetadata Tests
// =============================================================================

describe("extractMetadata", () => {
  describe("image extraction", () => {
    it("should extract basic image metadata", () => {
      const result = extractMetadata({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        size: 500000,
      });

      expect(result.mediaType).toBe("image");
      expect(result.filename).toBe("photo.jpg");
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.size).toBe(500000);
      expect(result.extension).toBe("jpg");
      expect(result.isWebCompatible).toBe(true);
    });

    it("should extract image with dimensions", () => {
      const result = extractMetadata({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        size: 500000,
        width: 1920,
        height: 1080,
      }) as ImageMetadata;

      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.aspectRatio).toBe(1.778);
    });

    it("should detect transparency support for PNG", () => {
      const result = extractMetadata({
        filename: "icon.png",
        mimeType: "image/png",
        size: 10000,
      }) as ImageMetadata;

      expect(result.supportsTransparency).toBe(true);
    });

    it("should not detect transparency for JPEG", () => {
      const result = extractMetadata({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        size: 500000,
      }) as ImageMetadata;

      expect(result.supportsTransparency).toBe(false);
    });

    it("should detect vector format for SVG", () => {
      const result = extractMetadata({
        filename: "logo.svg",
        mimeType: "image/svg+xml",
        size: 5000,
      }) as ImageMetadata;

      expect(result.isVector).toBe(true);
      expect(result.supportsTransparency).toBe(true);
    });

    it("should detect animation support for GIF", () => {
      const result = extractMetadata({
        filename: "animation.gif",
        mimeType: "image/gif",
        size: 100000,
      }) as ImageMetadata;

      expect(result.supportsAnimation).toBe(true);
    });

    it("should suggest optimal format", () => {
      const result = extractMetadata({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        size: 500000,
      }) as ImageMetadata;

      expect(result.suggestedFormat).toBe("webp");
    });

    it("should suggest SVG for SVG files", () => {
      const result = extractMetadata({
        filename: "logo.svg",
        mimeType: "image/svg+xml",
        size: 5000,
      }) as ImageMetadata;

      expect(result.suggestedFormat).toBe("svg");
    });
  });

  describe("video extraction", () => {
    it("should extract basic video metadata", () => {
      const result = extractMetadata({
        filename: "clip.mp4",
        mimeType: "video/mp4",
        size: 10000000,
      });

      expect(result.mediaType).toBe("video");
      expect(result.extension).toBe("mp4");
      expect(result.isWebCompatible).toBe(true);
    });

    it("should extract video with dimensions and duration", () => {
      const result = extractMetadata({
        filename: "clip.mp4",
        mimeType: "video/mp4",
        size: 10000000,
        width: 1920,
        height: 1080,
        duration: 120,
      }) as VideoMetadata;

      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.aspectRatio).toBe(1.778);
      expect(result.duration).toBe(120);
      expect(result.durationFormatted).toBe("02:00");
    });

    it("should detect codec for MP4", () => {
      const result = extractMetadata({
        filename: "clip.mp4",
        mimeType: "video/mp4",
        size: 10000000,
      }) as VideoMetadata;

      expect(result.codec).toBe("H.264/AVC");
    });

    it("should detect codec for WebM", () => {
      const result = extractMetadata({
        filename: "clip.webm",
        mimeType: "video/webm",
        size: 10000000,
      }) as VideoMetadata;

      expect(result.codec).toBe("VP8/VP9");
    });

    it("should mark broad browser support for MP4", () => {
      const result = extractMetadata({
        filename: "clip.mp4",
        mimeType: "video/mp4",
        size: 10000000,
      }) as VideoMetadata;

      expect(result.hasBroadBrowserSupport).toBe(true);
    });

    it("should mark limited browser support for MKV", () => {
      const result = extractMetadata({
        filename: "clip.mkv",
        mimeType: "video/x-matroska",
        size: 10000000,
      }) as VideoMetadata;

      expect(result.hasBroadBrowserSupport).toBe(false);
    });
  });

  describe("audio extraction", () => {
    it("should extract basic audio metadata", () => {
      const result = extractMetadata({
        filename: "song.mp3",
        mimeType: "audio/mpeg",
        size: 5000000,
      });

      expect(result.mediaType).toBe("audio");
      expect(result.extension).toBe("mp3");
      expect(result.isWebCompatible).toBe(true);
    });

    it("should extract audio with duration", () => {
      const result = extractMetadata({
        filename: "podcast.mp3",
        mimeType: "audio/mpeg",
        size: 50000000,
        duration: 1800,
      }) as AudioMetadata;

      expect(result.duration).toBe(1800);
      expect(result.durationFormatted).toBe("30:00");
    });

    it("should detect codec for MP3", () => {
      const result = extractMetadata({
        filename: "song.mp3",
        mimeType: "audio/mpeg",
        size: 5000000,
      }) as AudioMetadata;

      expect(result.codec).toBe("MP3");
    });

    it("should detect codec for FLAC", () => {
      const result = extractMetadata({
        filename: "song.flac",
        mimeType: "audio/flac",
        size: 30000000,
      }) as AudioMetadata;

      expect(result.codec).toBe("FLAC");
    });

    it("should mark broad browser support for MP3", () => {
      const result = extractMetadata({
        filename: "song.mp3",
        mimeType: "audio/mpeg",
        size: 5000000,
      }) as AudioMetadata;

      expect(result.hasBroadBrowserSupport).toBe(true);
    });
  });

  describe("document extraction", () => {
    it("should extract basic document metadata", () => {
      const result = extractMetadata({
        filename: "report.pdf",
        mimeType: "application/pdf",
        size: 2000000,
      });

      expect(result.mediaType).toBe("document");
      expect(result.extension).toBe("pdf");
    });

    it("should extract document with page count", () => {
      const result = extractMetadata({
        filename: "report.pdf",
        mimeType: "application/pdf",
        size: 2000000,
        pageCount: 25,
      }) as DocumentMetadata;

      expect(result.pageCount).toBe(25);
    });

    it("should categorize PDF correctly", () => {
      const result = extractMetadata({
        filename: "report.pdf",
        mimeType: "application/pdf",
        size: 2000000,
      }) as DocumentMetadata;

      expect(result.documentCategory).toBe("pdf");
      expect(result.canPreviewInBrowser).toBe(true);
    });

    it("should categorize Word document correctly", () => {
      const result = extractMetadata({
        filename: "document.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 500000,
      }) as DocumentMetadata;

      expect(result.documentCategory).toBe("word");
      expect(result.canPreviewInBrowser).toBe(false);
    });

    it("should categorize spreadsheet correctly", () => {
      const result = extractMetadata({
        filename: "data.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 100000,
      }) as DocumentMetadata;

      expect(result.documentCategory).toBe("spreadsheet");
    });

    it("should categorize text files correctly", () => {
      const result = extractMetadata({
        filename: "readme.txt",
        mimeType: "text/plain",
        size: 1000,
      }) as DocumentMetadata;

      expect(result.documentCategory).toBe("text");
      expect(result.canPreviewInBrowser).toBe(true);
    });
  });

  describe("other file types", () => {
    it("should handle ZIP files as other", () => {
      const result = extractMetadata({
        filename: "archive.zip",
        mimeType: "application/zip",
        size: 10000000,
      }) as OtherMetadata;

      expect(result.mediaType).toBe("other");
      expect(result.isWebCompatible).toBe(false);
    });

    it("should handle unknown MIME types", () => {
      const result = extractMetadata({
        filename: "data.xyz",
        mimeType: "application/x-custom",
        size: 1000,
      }) as OtherMetadata;

      expect(result.mediaType).toBe("other");
    });
  });

  describe("edge cases", () => {
    it("should handle uppercase MIME type", () => {
      const result = extractMetadata({
        filename: "photo.jpg",
        mimeType: "IMAGE/JPEG",
        size: 500000,
      });

      expect(result.mediaType).toBe("image");
      expect(result.mimeType).toBe("image/jpeg");
    });

    it("should handle missing dimensions gracefully", () => {
      const result = extractMetadata({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        size: 500000,
      }) as ImageMetadata;

      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
      expect(result.aspectRatio).toBeUndefined();
    });

    it("should handle zero dimensions", () => {
      const result = extractMetadata({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        size: 500000,
        width: 0,
        height: 0,
      }) as ImageMetadata;

      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
      expect(result.aspectRatio).toBeUndefined();
    });

    it("should handle zero duration for video", () => {
      const result = extractMetadata({
        filename: "clip.mp4",
        mimeType: "video/mp4",
        size: 10000000,
        duration: 0,
      }) as VideoMetadata;

      expect(result.duration).toBe(0);
      expect(result.durationFormatted).toBe("00:00");
    });

    it("should handle filename without extension", () => {
      const result = extractMetadata({
        filename: "README",
        mimeType: "text/plain",
        size: 1000,
      });

      expect(result.extension).toBe("");
    });

    it("should handle very long duration", () => {
      const result = extractMetadata({
        filename: "movie.mp4",
        mimeType: "video/mp4",
        size: 5000000000,
        duration: 7200,
      }) as VideoMetadata;

      expect(result.durationFormatted).toBe("02:00:00");
    });
  });
});

// =============================================================================
// Validation Helper Tests
// =============================================================================

describe("validateDimensions", () => {
  it("should accept valid dimensions", () => {
    expect(validateDimensions(1920, 1080)).toBe(true);
  });

  it("should accept undefined dimensions", () => {
    expect(validateDimensions(undefined, undefined)).toBe(true);
  });

  it("should accept one undefined dimension", () => {
    expect(validateDimensions(1920, undefined)).toBe(true);
    expect(validateDimensions(undefined, 1080)).toBe(true);
  });

  it("should reject zero width", () => {
    expect(validateDimensions(0, 1080)).toBe(false);
  });

  it("should reject zero height", () => {
    expect(validateDimensions(1920, 0)).toBe(false);
  });

  it("should reject negative dimensions", () => {
    expect(validateDimensions(-100, 1080)).toBe(false);
    expect(validateDimensions(1920, -100)).toBe(false);
  });

  it("should reject non-integer dimensions", () => {
    expect(validateDimensions(1920.5, 1080)).toBe(false);
    expect(validateDimensions(1920, 1080.5)).toBe(false);
  });
});

describe("validateDuration", () => {
  it("should accept valid duration", () => {
    expect(validateDuration(120)).toBe(true);
  });

  it("should accept zero duration", () => {
    expect(validateDuration(0)).toBe(true);
  });

  it("should accept undefined duration", () => {
    expect(validateDuration(undefined)).toBe(true);
  });

  it("should accept fractional duration", () => {
    expect(validateDuration(120.5)).toBe(true);
  });

  it("should reject negative duration", () => {
    expect(validateDuration(-10)).toBe(false);
  });

  it("should reject NaN", () => {
    expect(validateDuration(NaN)).toBe(false);
  });

  it("should reject Infinity", () => {
    expect(validateDuration(Infinity)).toBe(false);
  });
});

describe("validateFileSize", () => {
  it("should accept valid file size", () => {
    expect(validateFileSize(1000)).toBe(true);
  });

  it("should accept minimum file size of 1", () => {
    expect(validateFileSize(1)).toBe(true);
  });

  it("should reject zero file size", () => {
    expect(validateFileSize(0)).toBe(false);
  });

  it("should reject negative file size", () => {
    expect(validateFileSize(-100)).toBe(false);
  });

  it("should reject non-integer file size", () => {
    expect(validateFileSize(1000.5)).toBe(false);
  });
});

// =============================================================================
// Real-World Scenario Tests
// =============================================================================

describe("Real-world scenarios", () => {
  it("should handle iPhone photo", () => {
    const result = extractMetadata({
      filename: "IMG_1234.HEIC",
      mimeType: "image/heic",
      size: 3500000,
      width: 4032,
      height: 3024,
    }) as ImageMetadata;

    expect(result.mediaType).toBe("image");
    expect(result.aspectRatio).toBe(1.333);
    expect(result.isWebCompatible).toBe(false); // HEIC not widely supported
  });

  it("should handle YouTube-style video", () => {
    const result = extractMetadata({
      filename: "tutorial.mp4",
      mimeType: "video/mp4",
      size: 150000000,
      width: 1920,
      height: 1080,
      duration: 600, // 10 minutes
    }) as VideoMetadata;

    expect(result.aspectRatio).toBe(1.778); // 16:9
    expect(result.durationFormatted).toBe("10:00");
    expect(result.hasBroadBrowserSupport).toBe(true);
  });

  it("should handle podcast episode", () => {
    const result = extractMetadata({
      filename: "episode-42.mp3",
      mimeType: "audio/mpeg",
      size: 72000000,
      duration: 3600, // 1 hour
    }) as AudioMetadata;

    expect(result.durationFormatted).toBe("01:00:00");
    expect(result.codec).toBe("MP3");
    expect(result.hasBroadBrowserSupport).toBe(true);
  });

  it("should handle business document", () => {
    const result = extractMetadata({
      filename: "Q4-Report.pdf",
      mimeType: "application/pdf",
      size: 5000000,
      pageCount: 42,
    }) as DocumentMetadata;

    expect(result.documentCategory).toBe("pdf");
    expect(result.pageCount).toBe(42);
    expect(result.canPreviewInBrowser).toBe(true);
  });

  it("should handle website favicon", () => {
    const result = extractMetadata({
      filename: "favicon.ico",
      mimeType: "image/x-icon",
      size: 15086,
      width: 32,
      height: 32,
    }) as ImageMetadata;

    expect(result.mediaType).toBe("image");
    expect(result.aspectRatio).toBe(1);
  });

  it("should handle animated WebP", () => {
    const result = extractMetadata({
      filename: "animation.webp",
      mimeType: "image/webp",
      size: 250000,
      width: 400,
      height: 300,
    }) as ImageMetadata;

    expect(result.supportsAnimation).toBe(true);
    expect(result.supportsTransparency).toBe(true);
    expect(result.isWebCompatible).toBe(true);
  });
});
