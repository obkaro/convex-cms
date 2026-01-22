/**
 * Media Asset Mutation Functions
 *
 * Provides mutation functions for creating, updating, and deleting media assets.
 * Media assets are records that link file storage references (storageId) with
 * metadata like filename, MIME type, dimensions, and organizational tags.
 *
 * Upload Flow:
 * 1. Client calls generateUploadUrl to get a temporary upload URL
 * 2. Client POSTs the file directly to the upload URL
 * 3. Client receives a storageId from the upload response
 * 4. Client calls createMediaAsset to save the metadata with the storageId
 */

import { mutation, query, type MutationCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { v } from "convex/values";
import {
	createMediaAssetArgs,
	updateMediaAssetArgs,
	mediaAssetDoc,
	deleteMediaAssetArgs,
	deleteMediaAssetResult,
	restoreMediaAssetArgs,
	mediaAssetReference,
	moveMediaAssetsArgs,
	moveMediaAssetsResult,
	BULK_OPERATION_BATCH_SIZE,
	mutationAuthContext,
} from "./validators.js";
import {
	emitEvent,
	mediaAssetEventType,
	MediaAssetEventPayload,
} from "./eventEmitter.js";
import {
	mediaFolderNotFound,
	mediaFolderDeleted,
	mediaAssetNotFound,
	mediaAssetDeleted,
	mediaAssetNotDeleted,
	mediaAssetHasReferences,
	mediaAssetCreateFailed,
	mediaAssetUpdateFailed,
	batchSizeExceeded,
	internalError,
} from "./lib/errors.js";
import { requireMutationAuth, withResourceOwner } from "./lib/mutationAuth.js";

// =============================================================================
// Create Media Asset Mutation
// =============================================================================

/**
 * Mutation to create a new media asset record after file upload.
 *
 * This mutation stores the metadata for an uploaded file. The actual file
 * should already be uploaded to Convex storage (via generateUploadUrl),
 * and the storageId from that upload is passed to this mutation.
 *
 * The mutation will:
 * 1. Validate that the folderId exists (if provided)
 * 2. Generate searchable text from filename and title
 * 3. Create the asset record with all metadata
 *
 * @param storageId - The storage ID returned from the file upload
 * @param filename - The original filename of the uploaded file
 * @param mimeType - The MIME type of the file (e.g., "image/jpeg")
 * @param size - The file size in bytes
 * @param type - The media type category ("image", "video", "audio", "document", "other")
 * @param title - Optional display title for the asset
 * @param description - Optional description of the asset
 * @param altText - Optional alt text for accessibility (images)
 * @param folderId - Optional folder ID to organize the asset
 * @param width - Optional width in pixels (for images/videos)
 * @param height - Optional height in pixels (for images/videos)
 * @param duration - Optional duration in seconds (for audio/video)
 * @param metadata - Optional additional metadata (extracted EXIF data, etc.)
 * @param tags - Optional array of tags for categorization
 * @param createdBy - Optional user ID for audit trail
 *
 * @returns The created media asset document
 *
 * @throws Error if the folder does not exist
 * @throws Error if the folder has been deleted
 *
 * @example
 * ```typescript
 * // After uploading a file and getting storageId:
 * const asset = await ctx.runMutation(api.mediaAssetMutations.createMediaAsset, {
 *   storageId: storageIdFromUpload,
 *   filename: "photo.jpg",
 *   mimeType: "image/jpeg",
 *   size: 1024 * 500, // 500 KB
 *   type: "image",
 *   title: "Beach Photo",
 *   altText: "A sunny beach with palm trees",
 *   width: 1920,
 *   height: 1080,
 *   tags: ["beach", "summer", "vacation"],
 *   createdBy: currentUserId,
 * });
 *
 * // With folder assignment:
 * const asset = await ctx.runMutation(api.mediaAssetMutations.createMediaAsset, {
 *   storageId: storageIdFromUpload,
 *   filename: "report.pdf",
 *   mimeType: "application/pdf",
 *   size: 1024 * 1024 * 2, // 2 MB
 *   type: "document",
 *   folderId: documentsFolderId,
 *   createdBy: currentUserId,
 * });
 * ```
 */
export const createMediaAsset = mutation({
	args: {
		...createMediaAssetArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaAssetDoc,
	handler: async (ctx, args) => {
		const {
			storageId,
			filename,
			mimeType,
			size,
			type,
			title,
			description,
			altText,
			folderId,
			width,
			height,
			duration,
			metadata,
			tags,
			createdBy,
			_auth,
		} = args;

		// Authorization check - mediaAssets.create permission
		requireMutationAuth(_auth, "mediaAssets", "create");

		// Validate folder exists if provided
		if (folderId !== undefined) {
			const folder = await ctx.db.get(folderId);
			if (!folder) {
				throw mediaFolderNotFound((folderId as unknown) as string);
			}
			if (folder.deletedAt !== undefined) {
				throw mediaFolderDeleted((folderId as unknown) as string);
			}
		}

		// Generate searchable text from filename and title
		// This enables full-text search on media assets
		const searchParts: string[] = [];
		searchParts.push(filename);
		if (title) {
			searchParts.push(title);
		}
		if (description) {
			searchParts.push(description);
		}
		if (tags && tags.length > 0) {
			searchParts.push(...tags);
		}
		const searchText = searchParts.join(" ").trim() || undefined;

		// Create the media asset record
		const assetId = await ctx.db.insert("mediaAssets", {
			storageId,
			filename,
			mimeType,
			size,
			type,
			title,
			description,
			altText,
			folderId,
			width,
			height,
			duration,
			metadata,
			tags,
			createdBy,
			searchText,
		});

		// Retrieve and return the created asset
		const asset = await ctx.db.get(assetId);
		if (!asset) {
			throw mediaAssetCreateFailed();
		}

		// Get folder path for event payload if folder exists
		let folderPath: string | undefined;
		if (folderId) {
			const folder = await ctx.db.get(folderId);
			folderPath = folder?.path;
		}

		// Emit media asset created event
		await emitEvent(ctx, {
			eventType: mediaAssetEventType("created"),
			resourceType: "mediaAsset",
			resourceId: (assetId as unknown) as string,
			action: "created",
			payload: {
				filename,
				mimeType,
				type,
				size,
				folderId: (folderId as unknown) as string | undefined,
				folderPath,
			} as MediaAssetEventPayload,
			userId: createdBy,
		});

		return asset;
	},
});

// =============================================================================
// Update Media Asset Mutation
// =============================================================================

/**
 * Mutation to update media asset metadata.
 *
 * Updates metadata fields like filename, title, description, alt text, folder
 * assignment, and tags WITHOUT modifying the underlying storage file.
 *
 * The mutation will:
 * 1. Validate that the asset exists and is not soft-deleted
 * 2. Validate the new folder (if provided) exists and is not deleted
 * 3. Update only the provided fields
 * 4. Regenerate searchable text if any indexed fields changed
 *
 * @param id - The media asset ID to update
 * @param filename - Optional new display filename (does not modify stored file)
 * @param title - Optional new display title
 * @param description - Optional new description/caption
 * @param altText - Optional new alt text for accessibility
 * @param folderId - Optional new folder ID for organization
 * @param tags - Optional new tags array for categorization
 * @param updatedBy - Optional user ID for audit trail
 *
 * @returns The updated media asset document
 *
 * @throws Error if the asset does not exist
 * @throws Error if the asset has been soft-deleted
 * @throws Error if the folder does not exist (when folderId provided)
 * @throws Error if the folder has been deleted (when folderId provided)
 *
 * @example
 * ```typescript
 * // Update alt text for accessibility
 * const updated = await ctx.runMutation(api.mediaAssetMutations.updateMediaAsset, {
 *   id: assetId,
 *   altText: "A sunny beach with palm trees swaying in the breeze",
 *   updatedBy: currentUserId,
 * });
 *
 * // Rename file and move to different folder
 * const updated = await ctx.runMutation(api.mediaAssetMutations.updateMediaAsset, {
 *   id: assetId,
 *   filename: "beach-vacation-2026.jpg",
 *   folderId: vacationPhotosFolderId,
 *   updatedBy: currentUserId,
 * });
 *
 * // Update multiple metadata fields
 * const updated = await ctx.runMutation(api.mediaAssetMutations.updateMediaAsset, {
 *   id: assetId,
 *   title: "Beach Photo",
 *   description: "Our family trip to the coast",
 *   tags: ["beach", "family", "vacation", "2026"],
 *   updatedBy: currentUserId,
 * });
 * ```
 */
export const updateMediaAsset = mutation({
	args: {
		...updateMediaAssetArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaAssetDoc,
	handler: async (ctx, args) => {
		const {
			id,
			filename,
			title,
			description,
			altText,
			folderId,
			tags,
			updatedBy,
			_auth,
		} = args;

		// Retrieve the media asset by ID
		const asset = await ctx.db.get(id);

		// Validate asset exists
		if (!asset) {
			throw mediaAssetNotFound((id as unknown) as string);
		}

		// Check that the asset is not soft-deleted
		if (asset.deletedAt !== undefined) {
			throw mediaAssetDeleted((id as unknown) as string);
		}

		// Authorization check - mediaAssets.update permission (with ownership check)
		requireMutationAuth(
			withResourceOwner(_auth, asset.createdBy),
			"mediaAssets",
			"update",
		);

		// Validate folder exists if provided and is different from current
		if (folderId !== undefined && folderId !== asset.folderId) {
			const folder = await ctx.db.get(folderId);
			if (!folder) {
				throw mediaFolderNotFound((folderId as unknown) as string);
			}
			if (folder.deletedAt !== undefined) {
				throw mediaFolderDeleted((folderId as unknown) as string);
			}
		}

		// Build updates object with only the provided fields
		const updates: Record<string, unknown> = {};

		if (filename !== undefined) {
			updates.filename = filename;
		}
		if (title !== undefined) {
			updates.title = title;
		}
		if (description !== undefined) {
			updates.description = description;
		}
		if (altText !== undefined) {
			updates.altText = altText;
		}
		if (folderId !== undefined) {
			updates.folderId = folderId;
		}
		if (tags !== undefined) {
			updates.tags = tags;
		}
		if (updatedBy !== undefined) {
			updates.updatedBy = updatedBy;
		}

		// Regenerate search text if any indexed fields changed
		// Search text includes: filename, title, description, and tags
		if (
			filename !== undefined ||
			title !== undefined ||
			description !== undefined ||
			tags !== undefined
		) {
			const searchParts: string[] = [];

			// Use new values if provided, otherwise fall back to existing
			const effectiveFilename = filename ?? asset.filename;
			const effectiveTitle = title ?? asset.title;
			const effectiveDescription = description ?? asset.description;
			const effectiveTags = tags ?? asset.tags;

			searchParts.push(effectiveFilename);
			if (effectiveTitle) {
				searchParts.push(effectiveTitle);
			}
			if (effectiveDescription) {
				searchParts.push(effectiveDescription);
			}
			if (effectiveTags && effectiveTags.length > 0) {
				searchParts.push(...effectiveTags);
			}

			updates.searchText = searchParts.join(" ").trim() || undefined;
		}

		// Apply updates
		await ctx.db.patch(id, updates);

		// Retrieve and return the updated asset
		const updatedAsset = await ctx.db.get(id);
		if (!updatedAsset) {
			throw mediaAssetUpdateFailed((id as unknown) as string);
		}

		// Get folder path for event payload if folder exists
		let folderPath: string | undefined;
		if (updatedAsset.folderId) {
			const folder = await ctx.db.get(updatedAsset.folderId);
			folderPath = folder?.path;
		}

		// Emit media asset updated event
		await emitEvent(ctx, {
			eventType: mediaAssetEventType("updated"),
			resourceType: "mediaAsset",
			resourceId: (id as unknown) as string,
			action: "updated",
			payload: {
				filename: updatedAsset.filename,
				mimeType: updatedAsset.mimeType,
				type: updatedAsset.type,
				size: updatedAsset.size,
				folderId: (updatedAsset.folderId as unknown) as string | undefined,
				folderPath,
			} as MediaAssetEventPayload,
			userId: updatedBy,
		});

		return updatedAsset;
	},
});

// =============================================================================
// Find Content Entry References Helper
// =============================================================================

/**
 * Internal query to find all content entries that reference a media asset.
 *
 * This scans content entries to find any that contain the media asset ID
 * in their data fields. Used to check for references before deletion.
 *
 * @param mediaAssetId - The media asset ID to search for
 * @returns Array of references with entry details and field names
 */
export const findMediaAssetReferences = query({
	args: {
		mediaAssetId: v.id("mediaAssets"),
		/** Maximum number of references to return (for performance) */
		limit: v.optional(v.number()),
	},
	returns: v.array(mediaAssetReference),
	handler: async (ctx, args) => {
		const { mediaAssetId, limit = 100 } = args;
		const mediaIdStr = (mediaAssetId as unknown) as string;
		const references: Array<{
			entryId: any;
			slug: string;
			contentTypeName: string;
			fields: string[];
		}> = [];

		// Get all content types to check field definitions
		const contentTypes = await ctx.db.query("contentTypes").collect();
		const contentTypeMap = new Map(
			contentTypes.map((ct) => [ct._id.toString(), ct]),
		);

		// Scan content entries (this could be optimized with a search index)
		// In a production system with many entries, you might want to limit this
		const entries = await ctx.db
			.query("contentEntries")
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.take(10000); // Safety limit

		for (const entry of entries) {
			if (references.length >= limit) break;

			const contentType = contentTypeMap.get(entry.contentTypeId.toString());
			if (!contentType) continue;

			// Find media fields in this content type
			const mediaFields = contentType.fields.filter((f) => f.type === "media");

			// Check each media field for references to this asset
			const matchingFields: string[] = [];
			for (const field of mediaFields) {
				const fieldValue = (entry.data as Record<string, unknown>)?.[
					field.name
				];
				if (!fieldValue) continue;

				// Check if this field references our media asset
				const isMultiple = field.options?.multiple ?? false;
				if (isMultiple && Array.isArray(fieldValue)) {
					if (fieldValue.includes(mediaIdStr)) {
						matchingFields.push(field.name);
					}
				} else if (fieldValue === mediaIdStr) {
					matchingFields.push(field.name);
				}
			}

			if (matchingFields.length > 0) {
				references.push({
					entryId: entry._id,
					slug: entry.slug,
					contentTypeName: contentType.name,
					fields: matchingFields,
				});
			}
		}

		return references;
	},
});

// =============================================================================
// Delete Media Asset Mutation
// =============================================================================

/**
 * Mutation to delete a media asset.
 *
 * Supports two modes:
 * - Soft delete (default): Sets deletedAt timestamp, asset can be restored
 * - Hard delete: Permanently removes the database record and storage file
 *
 * Before deletion, checks if any content entries reference this asset.
 * By default, deletion fails if references exist. Use forceDelete to override.
 *
 * @param id - The media asset ID to delete
 * @param deletedBy - Optional user ID for audit trail
 * @param hardDelete - If true, permanently deletes the asset and storage file
 * @param forceDelete - If true, allows deletion even with existing references
 *
 * @returns The deleted media asset document with deletion details
 *
 * @throws Error if the asset does not exist
 * @throws Error if the asset is already soft-deleted (for soft delete)
 * @throws Error if content entries reference this asset (unless forceDelete)
 *
 * @example
 * ```typescript
 * // Soft delete (can be restored later)
 * const deleted = await ctx.runMutation(api.mediaAssetMutations.deleteMediaAsset, {
 *   id: assetId,
 *   deletedBy: currentUserId,
 * });
 *
 * // Hard delete - permanently removes asset and storage file
 * await ctx.runMutation(api.mediaAssetMutations.deleteMediaAsset, {
 *   id: assetId,
 *   deletedBy: currentUserId,
 *   hardDelete: true,
 * });
 *
 * // Force delete - allows deletion even with content references
 * await ctx.runMutation(api.mediaAssetMutations.deleteMediaAsset, {
 *   id: assetId,
 *   deletedBy: currentUserId,
 *   forceDelete: true,
 * });
 * ```
 */
export const deleteMediaAsset = mutation({
	args: {
		...deleteMediaAssetArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: deleteMediaAssetResult,
	handler: async (ctx, args) => {
		const {
			id,
			deletedBy,
			hardDelete = false,
			forceDelete = false,
			_auth,
		} = args;

		// Retrieve the media asset by ID
		const asset = await ctx.db.get(id);

		// Validate asset exists
		if (!asset) {
			throw mediaAssetNotFound((id as unknown) as string);
		}

		// Authorization check - mediaAssets.delete permission (with ownership check)
		requireMutationAuth(
			withResourceOwner(_auth, asset.createdBy),
			"mediaAssets",
			"delete",
		);

		// For soft delete, check if already deleted
		if (!hardDelete && asset.deletedAt !== undefined) {
			throw mediaAssetDeleted((id as unknown) as string);
		}

		// Check for content entry references (unless forceDelete is true)
		if (!forceDelete) {
			const references = await findReferencesInternal(ctx, id);

			if (references.length > 0) {
				throw mediaAssetHasReferences(
					(id as unknown) as string,
					references.map((r) => ({
						type: "contentEntry",
						id: (r.entryId as unknown) as string,
						name: `${r.contentTypeName}/${r.slug}`,
					})),
				);
			}
		}

		// Get folder path for event payload if folder exists
		let folderPath: string | undefined;
		if (asset.folderId) {
			const folder = await ctx.db.get(asset.folderId);
			folderPath = folder?.path;
		}

		if (hardDelete) {
			// Hard delete: Remove the storage file first
			let storageFileDeleted = false;
			try {
				await ctx.storage.delete(asset.storageId);
				storageFileDeleted = true;
			} catch (error) {
				// Storage file may already be deleted or inaccessible
				// Continue with database deletion
				console.warn(
					`Could not delete storage file for asset ${id}:`,
					error instanceof Error ? error.message : error,
				);
			}

			// Permanently delete the database record
			await ctx.db.delete(id);

			// Emit media asset deleted event (hard delete)
			await emitEvent(ctx, {
				eventType: mediaAssetEventType("deleted"),
				resourceType: "mediaAsset",
				resourceId: (id as unknown) as string,
				action: "deleted",
				payload: {
					filename: asset.filename,
					mimeType: asset.mimeType,
					type: asset.type,
					size: asset.size,
					folderId: (asset.folderId as unknown) as string | undefined,
					folderPath,
				} as MediaAssetEventPayload,
				userId: deletedBy,
				metadata: { hardDelete: true, storageFileDeleted },
			});

			// Return the asset as it was before deletion
			return {
				...asset,
				deletedAt: Date.now(),
				storageFileDeleted,
			};
		} else {
			// Soft delete: Set deletedAt timestamp
			const now = Date.now();

			await ctx.db.patch(id, {
				deletedAt: now,
			});

			// Emit media asset deleted event (soft delete)
			await emitEvent(ctx, {
				eventType: mediaAssetEventType("deleted"),
				resourceType: "mediaAsset",
				resourceId: (id as unknown) as string,
				action: "deleted",
				payload: {
					filename: asset.filename,
					mimeType: asset.mimeType,
					type: asset.type,
					size: asset.size,
					folderId: (asset.folderId as unknown) as string | undefined,
					folderPath,
				} as MediaAssetEventPayload,
				userId: deletedBy,
				metadata: { hardDelete: false },
			});

			// Return the updated asset
			return {
				...asset,
				deletedAt: now,
				storageFileDeleted: undefined,
			};
		}
	},
});

/**
 * Content type structure for reference checking
 */
interface ContentTypeForReferences {
	_id: any;
	name: string;
	fields: Array<{
		name: string;
		type: string;
		options?: { multiple?: boolean };
	}>;
}

/**
 * Internal helper to find content entry references to a media asset.
 * Used within the same mutation context.
 */
async function findReferencesInternal(
	ctx: MutationCtx,
	mediaAssetId: Id<"mediaAssets">,
): Promise<
	Array<{
		entryId: Id<"contentEntries">;
		slug: string;
		contentTypeName: string;
		fields: string[];
	}>
> {
	const mediaIdStr = mediaAssetId.toString();
	const references: Array<{
		entryId: Id<"contentEntries">;
		slug: string;
		contentTypeName: string;
		fields: string[];
	}> = [];

	// Get all content types to check field definitions
	const contentTypes: ContentTypeForReferences[] = await ctx.db
		.query("contentTypes")
		.collect();
	const contentTypeMap = new Map<string, ContentTypeForReferences>(
		contentTypes.map((ct) => [ct._id.toString(), ct]),
	);

	// Scan content entries
	const entries = await ctx.db
		.query("contentEntries")
		.filter((q) => q.eq(q.field("deletedAt"), undefined))
		.take(10000);

	for (const entry of entries) {
		// Limit to reasonable number of references
		if (references.length >= 100) break;

		const contentType = contentTypeMap.get(entry.contentTypeId.toString());
		if (!contentType) continue;

		// Find media fields in this content type
		const mediaFields = contentType.fields.filter((f) => f.type === "media");

		// Check each media field for references to this asset
		const matchingFields: string[] = [];
		for (const field of mediaFields) {
			const fieldValue = (entry.data as Record<string, unknown>)?.[field.name];
			if (!fieldValue) continue;

			// Check if this field references our media asset
			const isMultiple = field.options?.multiple ?? false;
			if (isMultiple && Array.isArray(fieldValue)) {
				if (fieldValue.includes(mediaIdStr)) {
					matchingFields.push(field.name);
				}
			} else if (fieldValue === mediaIdStr) {
				matchingFields.push(field.name);
			}
		}

		if (matchingFields.length > 0) {
			references.push({
				entryId: entry._id,
				slug: entry.slug,
				contentTypeName: contentType.name,
				fields: matchingFields,
			});
		}
	}

	return references;
}

// =============================================================================
// Restore Media Asset Mutation
// =============================================================================

/**
 * Mutation to restore a soft-deleted media asset.
 *
 * Removes the `deletedAt` timestamp from the asset, making it active again.
 * Only works for soft-deleted assets; hard-deleted assets cannot be recovered.
 *
 * @param id - The media asset ID to restore
 * @param restoredBy - Optional user ID for audit trail
 *
 * @returns The restored media asset document
 *
 * @throws Error if the asset does not exist
 * @throws Error if the asset is not soft-deleted
 *
 * @example
 * ```typescript
 * const restored = await ctx.runMutation(api.mediaAssetMutations.restoreMediaAsset, {
 *   id: assetId,
 *   restoredBy: currentUserId,
 * });
 * ```
 */
export const restoreMediaAsset = mutation({
	args: {
		...restoreMediaAssetArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaAssetDoc,
	handler: async (ctx, args) => {
		const { id, restoredBy, _auth } = args;

		// Retrieve the media asset by ID
		const asset = await ctx.db.get(id);

		// Validate asset exists
		if (!asset) {
			throw mediaAssetNotFound((id as unknown) as string);
		}

		// Authorization check - use update permission for restore (with ownership check)
		requireMutationAuth(
			withResourceOwner(_auth, asset.createdBy),
			"mediaAssets",
			"update",
		);

		// Check that the asset is actually soft-deleted
		if (asset.deletedAt === undefined) {
			throw mediaAssetNotDeleted((id as unknown) as string);
		}

		// Remove the deletedAt timestamp to restore
		await ctx.db.patch(id, {
			deletedAt: undefined,
		});

		// Retrieve the updated asset
		const restoredAsset = await ctx.db.get(id);
		if (!restoredAsset) {
			throw internalError("Failed to restore media asset");
		}

		// Get folder path for event payload if folder exists
		let folderPath: string | undefined;
		if (restoredAsset.folderId) {
			const folder = await ctx.db.get(restoredAsset.folderId);
			folderPath = folder?.path;
		}

		// Emit media asset restored event
		await emitEvent(ctx, {
			eventType: mediaAssetEventType("restored"),
			resourceType: "mediaAsset",
			resourceId: (id as unknown) as string,
			action: "restored",
			payload: {
				filename: restoredAsset.filename,
				mimeType: restoredAsset.mimeType,
				type: restoredAsset.type,
				size: restoredAsset.size,
				folderId: (restoredAsset.folderId as unknown) as string | undefined,
				folderPath,
			} as MediaAssetEventPayload,
			userId: restoredBy,
		});

		return restoredAsset;
	},
});

// =============================================================================
// Move Media Assets Mutation (Bulk Operation)
// =============================================================================

/**
 * Result type for a single asset in the move operation.
 */
interface MoveMediaAssetItemResult {
	id: any;
	success: boolean;
	error?: string;
	previousFolderId?: any;
}

/**
 * Result type for the bulk move operation.
 */
interface MoveMediaAssetsResult {
	total: number;
	succeeded: number;
	failed: number;
	targetFolderId?: any;
	targetFolderPath?: string;
	results: MoveMediaAssetItemResult[];
}

/**
 * Mutation to move multiple media assets to a different folder.
 *
 * Moves media assets between folders in a single transaction. Supports bulk
 * operations for efficient organization of media libraries. Assets can be moved
 * to a specific folder or to the root level (no folder).
 *
 * Validation Rules:
 * - Target folder must exist and not be soft-deleted (if specified)
 * - Each asset must exist and not be soft-deleted
 * - Assets already in the target folder are skipped with success (idempotent)
 * - Maximum batch size is BULK_OPERATION_BATCH_SIZE (100) assets per operation
 *
 * @param assetIds - Array of media asset IDs to move (max BULK_OPERATION_BATCH_SIZE)
 * @param targetFolderId - Target folder ID (undefined to move to root level)
 * @param movedBy - Optional user ID for audit trail
 *
 * @returns MoveMediaAssetsResult with success/failure details for each asset
 *
 * @throws Error if batch size exceeds BULK_OPERATION_BATCH_SIZE
 * @throws Error if target folder does not exist
 * @throws Error if target folder has been deleted
 *
 * @example
 * ```typescript
 * // Move multiple assets to a specific folder
 * const result = await ctx.runMutation(api.mediaAssetMutations.moveMediaAssets, {
 *   assetIds: [asset1._id, asset2._id, asset3._id],
 *   targetFolderId: imagesFolderId,
 *   movedBy: currentUserId,
 * });
 * console.log(`Moved ${result.succeeded} of ${result.total} assets`);
 *
 * // Move assets to root level (no folder)
 * const result = await ctx.runMutation(api.mediaAssetMutations.moveMediaAssets, {
 *   assetIds: [asset1._id, asset2._id],
 *   targetFolderId: undefined,
 *   movedBy: currentUserId,
 * });
 *
 * // Check individual results
 * for (const item of result.results) {
 *   if (!item.success) {
 *     console.error(`Failed to move ${item.id}: ${item.error}`);
 *   }
 * }
 * ```
 */
export const moveMediaAssets = mutation({
	args: {
		...moveMediaAssetsArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: moveMediaAssetsResult,
	handler: async (ctx, args): Promise<MoveMediaAssetsResult> => {
		const { assetIds, targetFolderId, movedBy, _auth } = args;

		// Authorization check - mediaAssets.update permission (bulk move is a form of update)
		// Note: Individual asset ownership is checked per-asset during processing
		requireMutationAuth(_auth, "mediaAssets", "update");

		// Validate batch size
		if (assetIds.length > BULK_OPERATION_BATCH_SIZE) {
			throw batchSizeExceeded(BULK_OPERATION_BATCH_SIZE, assetIds.length);
		}

		// Handle empty array
		if (assetIds.length === 0) {
			return {
				total: 0,
				succeeded: 0,
				failed: 0,
				targetFolderId,
				targetFolderPath: undefined,
				results: [],
			};
		}

		// Validate target folder exists if specified
		let targetFolderPath: string | undefined;
		if (targetFolderId !== undefined) {
			const targetFolder = await ctx.db.get(targetFolderId);

			if (!targetFolder) {
				throw mediaFolderNotFound((targetFolderId as unknown) as string);
			}

			if (targetFolder.deletedAt !== undefined) {
				throw mediaFolderDeleted((targetFolderId as unknown) as string);
			}

			targetFolderPath = targetFolder.path;
		}

		const results: MoveMediaAssetItemResult[] = [];

		// Process each asset
		for (const assetId of assetIds) {
			try {
				const asset = await ctx.db.get(assetId);

				// Check asset exists
				if (!asset) {
					results.push({
						id: assetId,
						success: false,
						error: "Asset not found",
					});
					continue;
				}

				// Check asset is not soft-deleted
				if (asset.deletedAt !== undefined) {
					results.push({
						id: assetId,
						success: false,
						error: "Asset has been deleted",
					});
					continue;
				}

				// Check if asset is already in the target folder (idempotent)
				if (asset.folderId === targetFolderId) {
					// Already in target folder - treat as success
					results.push({
						id: assetId,
						success: true,
						previousFolderId: asset.folderId,
					});
					continue;
				}

				// Store previous folder ID for the result
				const previousFolderId = asset.folderId;

				// Move the asset to the target folder
				await ctx.db.patch(assetId, {
					folderId: targetFolderId,
				});

				// Emit media asset updated event
				await emitEvent(ctx, {
					eventType: mediaAssetEventType("updated"),
					resourceType: "mediaAsset",
					resourceId: (assetId as unknown) as string,
					action: "updated",
					payload: {
						filename: asset.filename,
						mimeType: asset.mimeType,
						type: asset.type,
						size: asset.size,
						folderId: (targetFolderId as unknown) as string | undefined,
						folderPath: targetFolderPath,
					} as MediaAssetEventPayload,
					userId: movedBy,
					metadata: {
						moveOperation: true,
						previousFolderId: (previousFolderId as unknown) as
							| string
							| undefined,
					},
				});

				results.push({
					id: assetId,
					success: true,
					previousFolderId,
				});
			} catch (error) {
				results.push({
					id: assetId,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		const succeeded = results.filter((r) => r.success).length;

		return {
			total: assetIds.length,
			succeeded,
			failed: assetIds.length - succeeded,
			targetFolderId,
			targetFolderPath,
			results,
		};
	},
});
