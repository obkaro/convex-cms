/**
 * Media Metadata Extractor
 *
 * Internal utility functions for extracting and normalizing metadata from uploaded files.
 * This module provides type-safe metadata extraction based on file MIME types.
 *
 * Since Convex functions don't have direct file access (files are in storage),
 * this extractor works with:
 * 1. Client-provided metadata (dimensions, duration from browser APIs)
 * 2. MIME type analysis for capability detection
 * 3. Filename analysis for additional hints
 *
 * The extractor normalizes and validates this information into a structured format
 * that can be stored in the media asset's metadata field.
 */

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Base metadata properties common to all media types.
 */
export interface BaseMetadata {
  /** Original filename */
  filename: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Classified media type */
  mediaType: "image" | "video" | "audio" | "document" | "other";
  /** File extension (lowercase, without dot) */
  extension: string;
  /** Whether this file type is typically web-compatible */
  isWebCompatible: boolean;
}

/**
 * Extended metadata for image files.
 */
export interface ImageMetadata extends BaseMetadata {
  mediaType: "image";
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Aspect ratio (width / height) */
  aspectRatio?: number;
  /** Whether the format supports transparency */
  supportsTransparency: boolean;
  /** Whether this is a vector format (infinitely scalable) */
  isVector: boolean;
  /** Whether this format supports animation */
  supportsAnimation: boolean;
  /** Suggested image optimization format */
  suggestedFormat?: "webp" | "avif" | "jpeg" | "png" | "svg";
}

/**
 * Extended metadata for video files.
 */
export interface VideoMetadata extends BaseMetadata {
  mediaType: "video";
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Aspect ratio (width / height) */
  aspectRatio?: number;
  /** Duration in seconds */
  duration?: number;
  /** Duration formatted as HH:MM:SS */
  durationFormatted?: string;
  /** Video codec (if known) */
  codec?: string;
  /** Whether the format is widely supported in browsers */
  hasBroadBrowserSupport: boolean;
}

/**
 * Extended metadata for audio files.
 */
export interface AudioMetadata extends BaseMetadata {
  mediaType: "audio";
  /** Duration in seconds */
  duration?: number;
  /** Duration formatted as HH:MM:SS */
  durationFormatted?: string;
  /** Audio codec (if known) */
  codec?: string;
  /** Whether the format is widely supported in browsers */
  hasBroadBrowserSupport: boolean;
}

/**
 * Extended metadata for document files.
 */
export interface DocumentMetadata extends BaseMetadata {
  mediaType: "document";
  /** Page count (if known, typically from PDF) */
  pageCount?: number;
  /** Document category */
  documentCategory:
    | "pdf"
    | "word"
    | "spreadsheet"
    | "presentation"
    | "text"
    | "other";
  /** Whether the document can be previewed in browser */
  canPreviewInBrowser: boolean;
}

/**
 * Metadata for unrecognized file types.
 */
export interface OtherMetadata extends BaseMetadata {
  mediaType: "other";
}

/**
 * Union type for all possible metadata shapes.
 */
export type ExtractedMetadata =
  | ImageMetadata
  | VideoMetadata
  | AudioMetadata
  | DocumentMetadata
  | OtherMetadata;

/**
 * Input parameters for metadata extraction.
 */
export interface MetadataExtractionInput {
  /** Original filename */
  filename: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Optional width in pixels (for images/videos, from client) */
  width?: number;
  /** Optional height in pixels (for images/videos, from client) */
  height?: number;
  /** Optional duration in seconds (for audio/video, from client) */
  duration?: number;
  /** Optional page count (for documents, from client) */
  pageCount?: number;
}

// =============================================================================
// MIME Type Mappings
// =============================================================================

/**
 * MIME types classified as images.
 */
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "image/ico",
  "image/heic",
  "image/heif",
]);

/**
 * MIME types classified as videos.
 */
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "video/3gpp",
  "video/x-matroska",
  "video/x-flv",
]);

/**
 * MIME types classified as audio.
 */
const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/aac",
  "audio/flac",
  "audio/x-m4a",
  "audio/mp4",
  "audio/x-wav",
]);

/**
 * MIME types classified as documents.
 */
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/rtf",
  "application/json",
  "application/xml",
  "text/xml",
]);

/**
 * MIME types that support transparency.
 */
const TRANSPARENT_MIME_TYPES = new Set([
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

/**
 * Vector image MIME types.
 */
const VECTOR_MIME_TYPES = new Set(["image/svg+xml"]);

/**
 * MIME types that support animation.
 */
const ANIMATED_MIME_TYPES = new Set([
  "image/gif",
  "image/webp",
  "image/avif",
  "image/png", // APNG
]);

/**
 * Web-compatible image MIME types (work natively in all modern browsers).
 */
const WEB_COMPATIBLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
]);

/**
 * Web-compatible video MIME types.
 */
const WEB_COMPATIBLE_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
]);

/**
 * Web-compatible audio MIME types.
 */
const WEB_COMPATIBLE_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/aac",
]);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extracts the file extension from a filename.
 *
 * @param filename - The filename to extract the extension from
 * @returns The lowercase extension without the dot, or empty string if none
 */
export function extractExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Classifies a MIME type into a media category.
 *
 * @param mimeType - The MIME type to classify
 * @returns The media type category
 */
export function classifyMimeType(
  mimeType: string
): "image" | "video" | "audio" | "document" | "other" {
  const normalizedMime = mimeType.toLowerCase();

  if (IMAGE_MIME_TYPES.has(normalizedMime)) {
    return "image";
  }
  if (VIDEO_MIME_TYPES.has(normalizedMime)) {
    return "video";
  }
  if (AUDIO_MIME_TYPES.has(normalizedMime)) {
    return "audio";
  }
  if (DOCUMENT_MIME_TYPES.has(normalizedMime)) {
    return "document";
  }

  // Fallback: check MIME type prefix
  if (normalizedMime.startsWith("image/")) {
    return "image";
  }
  if (normalizedMime.startsWith("video/")) {
    return "video";
  }
  if (normalizedMime.startsWith("audio/")) {
    return "audio";
  }
  if (
    normalizedMime.startsWith("text/") ||
    normalizedMime.startsWith("application/")
  ) {
    // Check for common document patterns
    if (
      normalizedMime.includes("document") ||
      normalizedMime.includes("sheet") ||
      normalizedMime.includes("presentation")
    ) {
      return "document";
    }
  }

  return "other";
}

/**
 * Calculates aspect ratio from dimensions.
 *
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Aspect ratio rounded to 3 decimal places, or undefined if invalid
 */
export function calculateAspectRatio(
  width?: number,
  height?: number
): number | undefined {
  if (!width || !height || height <= 0 || width <= 0) {
    return undefined;
  }
  return Math.round((width / height) * 1000) / 1000;
}

/**
 * Formats duration in seconds to HH:MM:SS format.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string, or undefined if invalid
 */
export function formatDuration(seconds?: number): string | undefined {
  if (seconds === undefined || seconds < 0 || !Number.isFinite(seconds)) {
    return undefined;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Determines the optimal image format for web delivery.
 *
 * @param mimeType - Original MIME type
 * @param supportsTransparency - Whether transparency is needed
 * @returns Suggested format for optimization
 */
export function suggestImageFormat(
  mimeType: string,
  supportsTransparency: boolean
): "webp" | "avif" | "jpeg" | "png" | "svg" | undefined {
  const normalizedMime = mimeType.toLowerCase();

  // SVG stays as SVG (vector)
  if (normalizedMime === "image/svg+xml") {
    return "svg";
  }

  // For photos/complex images, suggest modern formats
  if (supportsTransparency) {
    return "webp"; // WebP supports transparency and has broad support
  }

  // For photos without transparency, AVIF or WebP
  if (normalizedMime === "image/jpeg" || normalizedMime === "image/jpg") {
    return "webp"; // Better compression than JPEG
  }

  return "webp"; // Default to WebP for best compatibility
}

/**
 * Categorizes document MIME types into subcategories.
 *
 * @param mimeType - The document MIME type
 * @returns Document category
 */
export function categorizeDocument(
  mimeType: string
): "pdf" | "word" | "spreadsheet" | "presentation" | "text" | "other" {
  const normalizedMime = mimeType.toLowerCase();

  if (normalizedMime === "application/pdf") {
    return "pdf";
  }

  if (
    normalizedMime === "application/msword" ||
    normalizedMime.includes("wordprocessingml")
  ) {
    return "word";
  }

  if (
    normalizedMime === "application/vnd.ms-excel" ||
    normalizedMime.includes("spreadsheetml") ||
    normalizedMime === "text/csv"
  ) {
    return "spreadsheet";
  }

  if (
    normalizedMime === "application/vnd.ms-powerpoint" ||
    normalizedMime.includes("presentationml")
  ) {
    return "presentation";
  }

  if (
    normalizedMime.startsWith("text/") ||
    normalizedMime === "application/json" ||
    normalizedMime === "application/xml"
  ) {
    return "text";
  }

  return "other";
}

/**
 * Determines if a document can be previewed in the browser.
 *
 * @param mimeType - The document MIME type
 * @returns Whether the document can be previewed
 */
export function canPreviewDocument(mimeType: string): boolean {
  const normalizedMime = mimeType.toLowerCase();

  // PDFs can be previewed in most browsers
  if (normalizedMime === "application/pdf") {
    return true;
  }

  // Text-based formats can be displayed
  if (normalizedMime.startsWith("text/")) {
    return true;
  }

  // JSON and XML can be displayed
  if (
    normalizedMime === "application/json" ||
    normalizedMime === "application/xml" ||
    normalizedMime === "text/xml"
  ) {
    return true;
  }

  return false;
}

// =============================================================================
// Main Extraction Function
// =============================================================================

/**
 * Extracts and normalizes metadata from uploaded file information.
 *
 * This is the main function to call for metadata extraction. It analyzes
 * the MIME type, filename, and any provided dimensions/duration to build
 * a comprehensive metadata object specific to the file type.
 *
 * @param input - The file information to extract metadata from
 * @returns Structured metadata object with type-specific properties
 *
 * @example
 * ```typescript
 * // Image with dimensions from browser
 * const imageMetadata = extractMetadata({
 *   filename: "photo.jpg",
 *   mimeType: "image/jpeg",
 *   size: 500000,
 *   width: 1920,
 *   height: 1080,
 * });
 * // Returns ImageMetadata with aspectRatio, suggestedFormat, etc.
 *
 * // Video with duration from browser
 * const videoMetadata = extractMetadata({
 *   filename: "clip.mp4",
 *   mimeType: "video/mp4",
 *   size: 10000000,
 *   width: 1920,
 *   height: 1080,
 *   duration: 120,
 * });
 * // Returns VideoMetadata with durationFormatted, hasBroadBrowserSupport, etc.
 *
 * // Document
 * const docMetadata = extractMetadata({
 *   filename: "report.pdf",
 *   mimeType: "application/pdf",
 *   size: 2000000,
 *   pageCount: 15,
 * });
 * // Returns DocumentMetadata with documentCategory, canPreviewInBrowser, etc.
 * ```
 */
export function extractMetadata(input: MetadataExtractionInput): ExtractedMetadata {
  const { filename, mimeType, size, width, height, duration, pageCount } = input;

  const normalizedMime = mimeType.toLowerCase();
  const extension = extractExtension(filename);
  const mediaType = classifyMimeType(normalizedMime);

  // Build base metadata
  const base: BaseMetadata = {
    filename,
    mimeType: normalizedMime,
    size,
    mediaType,
    extension,
    isWebCompatible: false, // Will be set by type-specific logic
  };

  switch (mediaType) {
    case "image":
      return extractImageMetadata(base, normalizedMime, width, height);

    case "video":
      return extractVideoMetadata(base, normalizedMime, width, height, duration);

    case "audio":
      return extractAudioMetadata(base, normalizedMime, duration);

    case "document":
      return extractDocumentMetadata(base, normalizedMime, pageCount);

    default:
      return {
        ...base,
        mediaType: "other",
        isWebCompatible: false,
      };
  }
}

/**
 * Extracts image-specific metadata.
 */
function extractImageMetadata(
  base: BaseMetadata,
  mimeType: string,
  width?: number,
  height?: number
): ImageMetadata {
  const supportsTransparency = TRANSPARENT_MIME_TYPES.has(mimeType);
  const isVector = VECTOR_MIME_TYPES.has(mimeType);
  const supportsAnimation = ANIMATED_MIME_TYPES.has(mimeType);
  const isWebCompatible = WEB_COMPATIBLE_IMAGE_TYPES.has(mimeType);

  const metadata: ImageMetadata = {
    ...base,
    mediaType: "image",
    isWebCompatible,
    supportsTransparency,
    isVector,
    supportsAnimation,
  };

  if (width !== undefined && width > 0) {
    metadata.width = width;
  }
  if (height !== undefined && height > 0) {
    metadata.height = height;
  }

  const aspectRatio = calculateAspectRatio(width, height);
  if (aspectRatio !== undefined) {
    metadata.aspectRatio = aspectRatio;
  }

  const suggestedFormat = suggestImageFormat(mimeType, supportsTransparency);
  if (suggestedFormat) {
    metadata.suggestedFormat = suggestedFormat;
  }

  return metadata;
}

/**
 * Extracts video-specific metadata.
 */
function extractVideoMetadata(
  base: BaseMetadata,
  mimeType: string,
  width?: number,
  height?: number,
  duration?: number
): VideoMetadata {
  const hasBroadBrowserSupport = WEB_COMPATIBLE_VIDEO_TYPES.has(mimeType);
  const isWebCompatible = hasBroadBrowserSupport;

  const metadata: VideoMetadata = {
    ...base,
    mediaType: "video",
    isWebCompatible,
    hasBroadBrowserSupport,
  };

  if (width !== undefined && width > 0) {
    metadata.width = width;
  }
  if (height !== undefined && height > 0) {
    metadata.height = height;
  }

  const aspectRatio = calculateAspectRatio(width, height);
  if (aspectRatio !== undefined) {
    metadata.aspectRatio = aspectRatio;
  }

  if (duration !== undefined && duration >= 0) {
    metadata.duration = duration;
    metadata.durationFormatted = formatDuration(duration);
  }

  // Infer codec from MIME type
  if (mimeType === "video/mp4") {
    metadata.codec = "H.264/AVC";
  } else if (mimeType === "video/webm") {
    metadata.codec = "VP8/VP9";
  } else if (mimeType === "video/ogg") {
    metadata.codec = "Theora";
  }

  return metadata;
}

/**
 * Extracts audio-specific metadata.
 */
function extractAudioMetadata(
  base: BaseMetadata,
  mimeType: string,
  duration?: number
): AudioMetadata {
  const hasBroadBrowserSupport = WEB_COMPATIBLE_AUDIO_TYPES.has(mimeType);
  const isWebCompatible = hasBroadBrowserSupport;

  const metadata: AudioMetadata = {
    ...base,
    mediaType: "audio",
    isWebCompatible,
    hasBroadBrowserSupport,
  };

  if (duration !== undefined && duration >= 0) {
    metadata.duration = duration;
    metadata.durationFormatted = formatDuration(duration);
  }

  // Infer codec from MIME type
  if (mimeType === "audio/mpeg" || mimeType === "audio/mp3") {
    metadata.codec = "MP3";
  } else if (mimeType === "audio/ogg") {
    metadata.codec = "Vorbis";
  } else if (mimeType === "audio/wav" || mimeType === "audio/x-wav") {
    metadata.codec = "PCM";
  } else if (mimeType === "audio/aac") {
    metadata.codec = "AAC";
  } else if (mimeType === "audio/flac") {
    metadata.codec = "FLAC";
  }

  return metadata;
}

/**
 * Extracts document-specific metadata.
 */
function extractDocumentMetadata(
  base: BaseMetadata,
  mimeType: string,
  pageCount?: number
): DocumentMetadata {
  const documentCategory = categorizeDocument(mimeType);
  const canPreview = canPreviewDocument(mimeType);

  const metadata: DocumentMetadata = {
    ...base,
    mediaType: "document",
    isWebCompatible: canPreview,
    documentCategory,
    canPreviewInBrowser: canPreview,
  };

  if (pageCount !== undefined && pageCount > 0) {
    metadata.pageCount = pageCount;
  }

  return metadata;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validates that dimensions are positive integers.
 *
 * @param width - Width to validate
 * @param height - Height to validate
 * @returns Whether both dimensions are valid
 */
export function validateDimensions(width?: number, height?: number): boolean {
  if (width !== undefined) {
    if (!Number.isInteger(width) || width <= 0) {
      return false;
    }
  }
  if (height !== undefined) {
    if (!Number.isInteger(height) || height <= 0) {
      return false;
    }
  }
  return true;
}

/**
 * Validates that duration is a non-negative number.
 *
 * @param duration - Duration to validate
 * @returns Whether the duration is valid
 */
export function validateDuration(duration?: number): boolean {
  if (duration === undefined) {
    return true;
  }
  return Number.isFinite(duration) && duration >= 0;
}

/**
 * Validates that file size is a positive integer.
 *
 * @param size - File size to validate
 * @returns Whether the size is valid
 */
export function validateFileSize(size: number): boolean {
  return Number.isInteger(size) && size > 0;
}
