/**
 * Media Upload Mutation Functions
 *
 * Provides mutation functions for generating upload URLs for client-side file uploads.
 * Uses Convex's built-in file storage system which handles the actual file storage.
 *
 * Upload Flow:
 * 1. Client calls generateUploadUrl to get a temporary upload URL
 * 2. Client POSTs the file directly to the upload URL
 * 3. Client receives a storageId from the upload response
 * 4. Client calls createMediaAsset to save the metadata with the storageId
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server.js";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default maximum file size in bytes (50 MB).
 * This is a reasonable default that can be overridden per-request.
 */
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Maximum allowed file size in bytes (500 MB).
 * This is the absolute upper limit to prevent abuse.
 */
const ABSOLUTE_MAX_FILE_SIZE = 500 * 1024 * 1024;

// =============================================================================
// Generate Upload URL Mutation
// =============================================================================

/**
 * Arguments for generating an upload URL.
 */
const generateUploadUrlArgs = v.object({
	/**
	 * Optional maximum file size in bytes for the upload.
	 * This is a client-side hint that should be validated when creating the media asset.
	 * Default: 50 MB, Maximum: 500 MB
	 */
	maxFileSize: v.optional(v.number()),
	/**
	 * Optional array of allowed MIME types for the upload.
	 * Supports patterns like "image/*" for all image types.
	 * This is a client-side hint that should be validated when creating the media asset.
	 */
	allowedMimeTypes: v.optional(v.array(v.string())),
	/**
	 * Optional user ID for audit logging.
	 * Can be used to track who initiated the upload.
	 */
	requestedBy: v.optional(v.string()),
});

/**
 * Return type for the generateUploadUrl mutation.
 */
const uploadUrlResultDoc = v.object({
	/** The temporary upload URL. Valid for 1 hour. */
	uploadUrl: v.string(),
	/**
	 * Expiration timestamp in milliseconds since epoch.
	 * The URL becomes invalid after this time.
	 */
	expiresAt: v.number(),
	/**
	 * Maximum file size in bytes that will be accepted.
	 * Client should validate file size before uploading.
	 */
	maxFileSize: v.number(),
	/**
	 * Allowed MIME types for the upload (if specified).
	 * Client should validate file type before uploading.
	 */
	allowedMimeTypes: v.optional(v.array(v.string())),
});

/**
 * Mutation to generate a temporary upload URL for client-side file uploads.
 *
 * This mutation creates a short-lived URL that allows clients to upload files
 * directly to Convex's file storage. The URL expires after 1 hour.
 *
 * The upload flow works as follows:
 * 1. Call this mutation to get a temporary upload URL
 * 2. POST the file to the URL with Content-Type header set to the file's MIME type
 * 3. The response contains a `storageId` that references the uploaded file
 * 4. Call createMediaAsset mutation to save metadata and link the storageId
 *
 * @param maxFileSize - Optional maximum file size in bytes (default: 50 MB, max: 500 MB)
 * @param allowedMimeTypes - Optional array of allowed MIME type patterns (e.g., ["image/*", "video/mp4"])
 * @param requestedBy - Optional user ID for audit purposes
 *
 * @returns An object containing the upload URL, expiration time, and constraints
 *
 * @example
 * ```typescript
 * // Basic usage - generate URL with defaults
 * const { uploadUrl, expiresAt, maxFileSize } = await ctx.runMutation(
 *   api.mediaUploadMutations.generateUploadUrl,
 *   {}
 * );
 *
 * // With size limit - for avatar uploads
 * const result = await ctx.runMutation(
 *   api.mediaUploadMutations.generateUploadUrl,
 *   { maxFileSize: 5 * 1024 * 1024 } // 5 MB limit
 * );
 *
 * // With MIME type restrictions - for image gallery
 * const result = await ctx.runMutation(
 *   api.mediaUploadMutations.generateUploadUrl,
 *   {
 *     maxFileSize: 10 * 1024 * 1024,
 *     allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
 *   }
 * );
 *
 * // Client-side upload after getting URL:
 * const response = await fetch(uploadUrl, {
 *   method: "POST",
 *   headers: { "Content-Type": file.type },
 *   body: file,
 * });
 * const { storageId } = await response.json();
 *
 * // Then save metadata with createMediaAsset
 * await ctx.runMutation(api.mediaMutations.createMediaAsset, {
 *   storageId,
 *   filename: file.name,
 *   mimeType: file.type,
 *   size: file.size,
 *   type: "image",
 * });
 * ```
 */
export const generateUploadUrl = mutation({
	args: generateUploadUrlArgs.fields,
	returns: uploadUrlResultDoc,
	handler: async (ctx, args) => {
		const { maxFileSize, allowedMimeTypes } = args;

		// Validate and normalize maxFileSize
		let effectiveMaxFileSize = DEFAULT_MAX_FILE_SIZE;
		if (maxFileSize !== undefined) {
			if (maxFileSize <= 0) {
				throw new Error("maxFileSize must be a positive number");
			}
			if (maxFileSize > ABSOLUTE_MAX_FILE_SIZE) {
				throw new Error(
					`maxFileSize cannot exceed ${ABSOLUTE_MAX_FILE_SIZE} bytes (500 MB)`,
				);
			}
			effectiveMaxFileSize = maxFileSize;
		}

		// Validate allowedMimeTypes if provided
		if (allowedMimeTypes !== undefined) {
			if (allowedMimeTypes.length === 0) {
				throw new Error("allowedMimeTypes cannot be an empty array");
			}
			// Validate MIME type patterns
			for (const mimeType of allowedMimeTypes) {
				if (!isValidMimeTypePattern(mimeType)) {
					throw new Error(`Invalid MIME type pattern: ${mimeType}`);
				}
			}
		}

		// Generate the upload URL using Convex's storage API
		// The URL is valid for 1 hour from generation
		const uploadUrl = await ctx.storage.generateUploadUrl();

		// Calculate expiration time (1 hour from now)
		const expiresAt = Date.now() + 60 * 60 * 1000;

		return {
			uploadUrl,
			expiresAt,
			maxFileSize: effectiveMaxFileSize,
			allowedMimeTypes,
		};
	},
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates a MIME type pattern.
 *
 * Accepts:
 * - Full MIME types: "image/png", "video/mp4", "application/pdf"
 * - Wildcard patterns: "image/*", "video/*", "audio/*"
 *
 * Per RFC 6838, MIME type names must start with a letter.
 *
 * @param pattern - The MIME type pattern to validate
 * @returns True if the pattern is valid
 */
function isValidMimeTypePattern(pattern: string): boolean {
	// Check for empty or whitespace-only strings
	if (!pattern || pattern.trim() === "") {
		return false;
	}

	// MIME type pattern: type/subtype or type/*
	// type: must start with letter, followed by alphanumeric, hyphens, underscores
	// subtype: alphanumeric, hyphens, underscores, periods, plus signs, or wildcard
	const mimeTypeRegex = /^[a-zA-Z][a-zA-Z0-9\-_]*\/(\*|[a-zA-Z0-9][a-zA-Z0-9\-_.+]*)$/;
	return mimeTypeRegex.test(pattern);
}

// =============================================================================
// Export validators for use in other modules
// =============================================================================

export { generateUploadUrlArgs, uploadUrlResultDoc };
