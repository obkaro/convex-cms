/**
 * Media Reference Resolution Utilities
 *
 * Provides functions for resolving and validating media asset references.
 * These utilities help with fetching referenced media assets and validating
 * MIME type constraints for media fields.
 */

import {
	// Doc,
	Id,
} from "../_generated/dataModel.js";
import { QueryCtx } from "../_generated/server.js";
import { classifyMimeType } from "./metadataExtractor.js";

// =============================================================================
// Types
// =============================================================================

/**
 * A single media reference value (media asset ID as string)
 */
export type SingleMediaReference = string;

/**
 * Multiple media reference values (array of media asset IDs) - used for galleries
 */
export type MultipleMediaReferences = string[];

/**
 * Media field value - either single or multiple based on field configuration
 */
export type MediaReferenceValue =
	| SingleMediaReference
	| MultipleMediaReferences;

/**
 * A resolved media reference with full asset data
 */
export interface ResolvedMediaReference {
	/** The media asset ID */
	id: string;
	/** The storage ID for the file */
	storageId: string;
	/** The resolved public URL for the asset */
	url: string | null;
	/** Original filename (name field) */
	name: string;
	/** MIME type of the file */
	mimeType: string;
	/** File size in bytes */
	size: number;
	/** Classified media type */
	type: "image" | "video" | "audio" | "document" | "other";
	/** Human-readable title */
	title?: string;
	/** Description/caption */
	description?: string;
	/** Alt text for accessibility */
	altText?: string;
	/** Image dimensions (if applicable) */
	width?: number;
	height?: number;
	/** Duration in seconds (for video/audio) */
	duration?: number;
	/** Whether the asset exists and is not deleted */
	exists: boolean;
}

/**
 * Options for resolving media references
 */
export interface MediaResolveOptions {
	/** Include soft-deleted assets (default: false) */
	includeDeleted?: boolean;
}

/**
 * Result of a media resolution operation
 */
export interface MediaResolveResult {
	/** Successfully resolved media references */
	resolved: ResolvedMediaReference[];
	/** IDs that could not be resolved (not found or deleted) */
	unresolved: string[];
}

/**
 * Result of validating a media reference
 */
export interface MediaValidationResult {
	/** Whether the reference is valid */
	valid: boolean;
	/** Error message if not valid */
	error?: string;
	/** The MIME type of the referenced asset (if found) */
	mimeType?: string;
}

// =============================================================================
// Core Resolution Functions
// =============================================================================

/**
 * Resolve a single media reference to its full asset data.
 *
 * @param ctx - Convex query context
 * @param mediaId - The media asset ID to resolve
 * @param options - Resolution options
 * @returns The resolved media reference or null if not found
 *
 * @example
 * ```typescript
 * // In a query handler:
 * const image = await resolveMediaReference(ctx, entry.data.featuredImage);
 * if (image) {
 *   console.log("Image URL:", image.url);
 *   console.log("Alt text:", image.altText);
 * }
 * ```
 */
export async function resolveMediaReference(
	ctx: QueryCtx,
	mediaId: string,
	options: MediaResolveOptions = {},
): Promise<ResolvedMediaReference | null> {
	const { includeDeleted = false } = options;

	try {
		// Get the media item
		const item = await ctx.db.get(mediaId as Id<"mediaItems">);

		if (!item) {
			return null;
		}

		// Only assets can be resolved as media references
		if (item.kind !== "asset") {
			return null;
		}

		// Check soft-delete status
		if (!includeDeleted && item.deletedAt !== undefined) {
			return null;
		}

		// Resolve the storage URL
		const url = await ctx.storage.getUrl(item.storageId);

		return {
			id: mediaId,
			storageId: item.storageId as string,
			url,
			name: item.name,
			mimeType: item.mimeType,
			size: item.size ?? 0,
			type: classifyMimeType(item.mimeType),
			title: item.title,
			description: item.description,
			altText: item.altText,
			width: item.width,
			height: item.height,
			duration: item.duration,
			exists: true,
		};
	} catch {
		// Invalid ID format or other error
		return null;
	}
}

/**
 * Resolve multiple media references to their full asset data.
 *
 * @param ctx - Convex query context
 * @param mediaIds - Array of media asset IDs to resolve
 * @param options - Resolution options
 * @returns Result with resolved references and unresolved IDs
 *
 * @example
 * ```typescript
 * // In a query handler - resolving a gallery:
 * const result = await resolveMediaReferences(ctx, entry.data.galleryImages);
 *
 * console.log("Found:", result.resolved.length, "images");
 * console.log("Missing:", result.unresolved);
 *
 * for (const image of result.resolved) {
 *   console.log(image.url, image.width, "x", image.height);
 * }
 * ```
 */
export async function resolveMediaReferences(
	ctx: QueryCtx,
	mediaIds: string[],
	options: MediaResolveOptions = {},
): Promise<MediaResolveResult> {
	const resolved: ResolvedMediaReference[] = [];
	const unresolved: string[] = [];

	// Resolve each reference in parallel for efficiency
	const promises = mediaIds.map(async (id) => {
		const result = await resolveMediaReference(ctx, id, options);
		return { id, result };
	});

	const results = await Promise.all(promises);

	for (const { id, result } of results) {
		if (result) {
			resolved.push(result);
		} else {
			unresolved.push(id);
		}
	}

	return { resolved, unresolved };
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Check if a media reference ID points to a valid, existing media asset.
 *
 * @param ctx - Convex query context
 * @param mediaId - The media asset ID to check
 * @param allowedMimeTypes - Optional array of allowed MIME types
 * @returns Object with validity status and optional error message
 *
 * @example
 * ```typescript
 * // Validate a media reference before saving:
 * const check = await isValidMediaReference(ctx, imageId, ["image/jpeg", "image/png"]);
 * if (!check.valid) {
 *   throw new Error(check.error);
 * }
 * ```
 */
export async function isValidMediaReference(
	ctx: QueryCtx,
	mediaId: string,
	allowedMimeTypes?: string[],
): Promise<MediaValidationResult> {
	try {
		// Get the media item
		const item = await ctx.db.get(mediaId as Id<"mediaItems">);

		if (!item) {
			return { valid: false, error: `Media asset not found: ${mediaId}` };
		}

		// Only assets can be validated as media references
		if (item.kind !== "asset") {
			return {
				valid: false,
				error: `Media reference is a folder, not an asset: ${mediaId}`,
			};
		}

		// Check soft-delete status
		if (item.deletedAt !== undefined) {
			return {
				valid: false,
				error: `Media asset has been deleted: ${mediaId}`,
			};
		}

		// If MIME type constraints specified, check them
		if (allowedMimeTypes && allowedMimeTypes.length > 0) {
			// Support wildcard patterns like "image/*"
			const isAllowed = allowedMimeTypes.some((pattern) => {
				if (pattern.endsWith("/*")) {
					// Wildcard pattern: "image/*" matches "image/jpeg", "image/png", etc.
					const prefix = pattern.slice(0, -1); // Remove the trailing "*"
					return item.mimeType.startsWith(prefix);
				}
				return item.mimeType === pattern;
			});

			if (!isAllowed) {
				return {
					valid: false,
					error: `Media asset MIME type "${
						item.mimeType
					}" is not allowed. Expected: ${allowedMimeTypes.join(", ")}`,
					mimeType: item.mimeType,
				};
			}
		}

		return { valid: true, mimeType: item.mimeType };
	} catch {
		return { valid: false, error: `Invalid media asset ID format: ${mediaId}` };
	}
}

/**
 * Validate all media references in a content entry's data.
 *
 * Iterates through all media fields and validates that each reference
 * points to a valid, existing media asset with an allowed MIME type.
 *
 * @param ctx - Convex query context
 * @param data - The content entry data containing media fields
 * @param fields - Array of field definitions (to identify media fields)
 * @returns Object with overall validity and array of errors
 *
 * @example
 * ```typescript
 * // Validate all media references before creating/updating an entry:
 * const validation = await validateAllMediaReferences(ctx, data, contentType.fields);
 * if (!validation.valid) {
 *   throw new Error(validation.errors.join(", "));
 * }
 * ```
 */
export async function validateAllMediaReferences(
	ctx: QueryCtx,
	data: Record<string, unknown>,
	fields: Array<{
		name: string;
		type: string;
		options?: {
			allowedMimeTypes?: string[];
			multiple?: boolean;
		};
	}>,
): Promise<{ valid: boolean; errors: string[] }> {
	const errors: string[] = [];

	// Find all media fields
	const mediaFields = fields.filter((f) => f.type === "media");

	for (const field of mediaFields) {
		const value = data[field.name];

		if (value === null || value === undefined) {
			continue; // Skip empty values (required validation is separate)
		}

		const allowedMimeTypes = field.options?.allowedMimeTypes;
		const multiple = field.options?.multiple ?? false;

		if (multiple) {
			// Validate array of media references (gallery)
			if (!Array.isArray(value)) {
				errors.push(`${field.name}: Expected array of media asset IDs`);
				continue;
			}

			for (const mediaId of value) {
				if (typeof mediaId !== "string") {
					errors.push(`${field.name}: Invalid media asset ID type`);
					continue;
				}

				const check = await isValidMediaReference(
					ctx,
					mediaId,
					allowedMimeTypes,
				);
				if (!check.valid) {
					errors.push(`${field.name}: ${check.error}`);
				}
			}
		} else {
			// Validate single media reference
			if (typeof value !== "string") {
				errors.push(`${field.name}: Expected string media asset ID`);
				continue;
			}

			const check = await isValidMediaReference(ctx, value, allowedMimeTypes);
			if (!check.valid) {
				errors.push(`${field.name}: ${check.error}`);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract all media asset IDs from a content entry's data.
 *
 * @param data - The content entry data
 * @param fields - Array of field definitions
 * @returns Array of all media asset IDs found in the data
 */
export function extractMediaIds(
	data: Record<string, unknown>,
	fields: Array<{
		name: string;
		type: string;
		options?: { multiple?: boolean };
	}>,
): string[] {
	const ids: string[] = [];

	const mediaFields = fields.filter((f) => f.type === "media");

	for (const field of mediaFields) {
		const value = data[field.name];

		if (value === null || value === undefined) {
			continue;
		}

		const multiple = field.options?.multiple ?? false;

		if (multiple && Array.isArray(value)) {
			for (const id of value) {
				if (typeof id === "string") {
					ids.push(id);
				}
			}
		} else if (typeof value === "string") {
			ids.push(value);
		}
	}

	return ids;
}

/**
 * Get the MIME type for a media asset ID.
 *
 * This is a helper function for validation purposes.
 *
 * @param ctx - Convex query context
 * @param mediaId - The media asset ID
 * @returns The MIME type or null if not found
 */
export async function getMediaMimeType(
	ctx: QueryCtx,
	mediaId: string,
): Promise<string | null> {
	try {
		const item = await ctx.db.get(mediaId as Id<"mediaItems">);

		if (!item || item.kind !== "asset" || item.deletedAt !== undefined) {
			return null;
		}

		return item.mimeType;
	} catch {
		return null;
	}
}

/**
 * Check if a MIME type matches a pattern (supports wildcards like "image/*").
 *
 * @param mimeType - The MIME type to check
 * @param pattern - The pattern to match against (e.g., "image/*", "image/jpeg")
 * @returns Whether the MIME type matches the pattern
 *
 * @example
 * ```typescript
 * matchesMimeTypePattern("image/jpeg", "image/*"); // true
 * matchesMimeTypePattern("image/jpeg", "image/jpeg"); // true
 * matchesMimeTypePattern("image/jpeg", "video/*"); // false
 * ```
 */
export function matchesMimeTypePattern(
	mimeType: string,
	pattern: string,
): boolean {
	if (pattern.endsWith("/*")) {
		const prefix = pattern.slice(0, -1);
		return mimeType.startsWith(prefix);
	}
	return mimeType === pattern;
}

/**
 * Check if a MIME type matches any of the given patterns.
 *
 * @param mimeType - The MIME type to check
 * @param patterns - Array of patterns to match against
 * @returns Whether the MIME type matches any pattern
 */
export function matchesAnyMimeTypePattern(
	mimeType: string,
	patterns: string[],
): boolean {
	return patterns.some((pattern) => matchesMimeTypePattern(mimeType, pattern));
}
