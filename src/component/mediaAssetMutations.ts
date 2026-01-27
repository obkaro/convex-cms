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
	mediaItemDoc,
	mediaAssetItemValidator,
	deleteMediaAssetArgs,
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
import { classifyMimeType } from "./lib/metadataExtractor.js";
import { isDeleted } from "./lib/softDelete.js";

// =============================================================================
// Delete Media Asset Result Type
// =============================================================================

export const deleteMediaAssetResult = v.object({
	...mediaAssetItemValidator.fields,
	_id: v.id("mediaItems"),
	_creationTime: v.number(),
	deletedAt: v.optional(v.number()),
	storageFileDeleted: v.optional(v.boolean()),
});

// =============================================================================
// Create Media Asset Mutation
// =============================================================================

export const createMediaAsset = mutation({
	args: {
		...createMediaAssetArgs.fields,
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaItemDoc,
	handler: async (ctx, args) => {
		const {
			storageId,
			name,
			mimeType,
			size,
			title,
			description,
			altText,
			parentId,
			width,
			height,
			duration,
			metadata,
			tags,
			createdBy,
			_auth,
		} = args;

		requireMutationAuth(_auth, "mediaItems", "create");

		// Validate folder exists if provided
		if (parentId !== undefined) {
			const folder = await ctx.db.get(parentId);
			if (!folder) {
				throw mediaFolderNotFound((parentId as unknown) as string);
			}
			if (isDeleted(folder)) {
				throw mediaFolderDeleted((parentId as unknown) as string);
			}
		}

		// Generate searchable text
		const searchParts: string[] = [];
		searchParts.push(name);
		if (title) searchParts.push(title);
		if (description) searchParts.push(description);
		if (tags && tags.length > 0) searchParts.push(...tags);
		const searchText = searchParts.join(" ").trim() || undefined;

		// Compute the path for the asset
		let path = "/";
		if (parentId) {
			const folder = await ctx.db.get(parentId);
			if (folder && folder.kind === "folder") {
				path = folder.path + name;
			} else {
				path = "/" + name;
			}
		} else {
			path = "/" + name;
		}

		// Create the media asset record
		const assetId = await ctx.db.insert("mediaItems", {
			kind: "asset",
			storageId,
			name,
			mimeType,
			size,
			title,
			description,
			altText,
			parentId,
			path,
			width,
			height,
			duration,
			metadata,
			tags,
			createdBy,
			searchText,
		});

		const asset = await ctx.db.get(assetId);
		if (!asset) {
			throw mediaAssetCreateFailed();
		}

		// Get folder path for event
		let folderPath: string | undefined;
		if (parentId) {
			const folder = await ctx.db.get(parentId);
			if (folder && folder.kind === "folder") {
				folderPath = folder.path;
			}
		}

		await emitEvent(ctx, {
			eventType: mediaAssetEventType("created"),
			resourceType: "mediaAsset",
			resourceId: (assetId as unknown) as string,
			action: "created",
			payload: {
				name,
				mimeType,
				type: classifyMimeType(mimeType),
				size: size ?? 0,
				parentId: (parentId as unknown) as string | undefined,
				path: folderPath,
			} as MediaAssetEventPayload,
			userId: createdBy,
		});

		return asset;
	},
});

// =============================================================================
// Update Media Asset Mutation
// =============================================================================

export const updateMediaAsset = mutation({
	args: {
		...updateMediaAssetArgs.fields,
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaItemDoc,
	handler: async (ctx, args) => {
		const {
			id,
			name,
			title,
			description,
			altText,
			parentId,
			tags,
			_auth,
		} = args;

		const item = await ctx.db.get(id);
		if (!item || item.kind !== "asset") {
			throw mediaAssetNotFound((id as unknown) as string);
		}
		const asset = item;

		if (isDeleted(asset)) {
			throw mediaAssetDeleted((id as unknown) as string);
		}

		requireMutationAuth(
			withResourceOwner(_auth, asset.createdBy),
			"mediaItems",
			"update",
		);

		// Validate folder if provided
		if (parentId !== undefined && parentId !== asset.parentId) {
			const folder = await ctx.db.get(parentId);
			if (!folder || folder.kind !== "folder") {
				throw mediaFolderNotFound((parentId as unknown) as string);
			}
			if (isDeleted(folder)) {
				throw mediaFolderDeleted((parentId as unknown) as string);
			}
		}

		const updates: Record<string, unknown> = {};
		if (name !== undefined) updates.name = name;
		if (title !== undefined) updates.title = title;
		if (description !== undefined) updates.description = description;
		if (altText !== undefined) updates.altText = altText;
		if (parentId !== undefined) updates.parentId = parentId;
		if (tags !== undefined) updates.tags = tags;

		// Regenerate search text if needed
		if (name !== undefined || title !== undefined || description !== undefined || tags !== undefined) {
			const searchParts: string[] = [];
			const effectiveName = name ?? asset.name;
			const effectiveTitle = title ?? asset.title;
			const effectiveDescription = description ?? asset.description;
			const effectiveTags = tags ?? asset.tags;

			searchParts.push(effectiveName);
			if (effectiveTitle) searchParts.push(effectiveTitle);
			if (effectiveDescription) searchParts.push(effectiveDescription);
			if (effectiveTags && effectiveTags.length > 0) searchParts.push(...effectiveTags);

			updates.searchText = searchParts.join(" ").trim() || undefined;
		}

		await ctx.db.patch(id, updates);

		const updatedItem = await ctx.db.get(id);
		if (!updatedItem || updatedItem.kind !== "asset") {
			throw mediaAssetUpdateFailed((id as unknown) as string);
		}

		// Emit event
		let folderPath: string | undefined;
		if (updatedItem.parentId) {
			const folder = await ctx.db.get(updatedItem.parentId);
			if (folder && folder.kind === "folder") {
				folderPath = folder.path;
			}
		}

		await emitEvent(ctx, {
			eventType: mediaAssetEventType("updated"),
			resourceType: "mediaAsset",
			resourceId: (id as unknown) as string,
			action: "updated",
			payload: {
				name: updatedItem.name,
				mimeType: updatedItem.mimeType,
				type: classifyMimeType(updatedItem.mimeType),
				size: updatedItem.size ?? 0,
				parentId: (updatedItem.parentId as unknown) as string | undefined,
				path: folderPath,
			} as MediaAssetEventPayload,
			userId: asset.createdBy,
		});

		return updatedItem;
	},
});

// =============================================================================
// Find Media Asset References
// =============================================================================

export const findMediaAssetReferences = query({
	args: {
		mediaAssetId: v.id("mediaItems"),
		limit: v.optional(v.number()),
	},
	returns: v.array(mediaAssetReference),
	handler: async (ctx, args) => {
		const { mediaAssetId, limit = 100 } = args;
		const mediaIdStr = (mediaAssetId as unknown) as string;
		const references: Array<{
			entryId: Id<"contentEntries">;
			slug: string;
			contentTypeName: string;
			fields: string[];
		}> = [];

		const contentTypes = await ctx.db.query("contentTypes").collect();
		const contentTypeMap = new Map(
			contentTypes.map((ct) => [ct.name, ct]),
		);

		const entries = await ctx.db
			.query("contentEntries")
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.take(10000);

		for (const entry of entries) {
			if (references.length >= limit) break;

			const contentType = contentTypeMap.get(entry.contentTypeName);
			if (!contentType) continue;

			const mediaFields = contentType.fields.filter((f) => f.type === "media");
			const matchingFields: string[] = [];

			for (const field of mediaFields) {
				const fieldValue = (entry.data as Record<string, unknown>)?.[field.name];
				if (!fieldValue) continue;

				const isMultiple = (field.options as { multiple?: boolean } | undefined)?.multiple ?? false;
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
// Internal helper for reference checking
// =============================================================================

async function findReferencesInternal(
	ctx: MutationCtx,
	mediaAssetId: Id<"mediaItems">,
): Promise<Array<{
	entryId: Id<"contentEntries">;
	slug: string;
	contentTypeName: string;
	fields: string[];
}>> {
	const mediaIdStr = mediaAssetId.toString();
	const references: Array<{
		entryId: Id<"contentEntries">;
		slug: string;
		contentTypeName: string;
		fields: string[];
	}> = [];

	const contentTypes = await ctx.db.query("contentTypes").collect();
	const contentTypeMap = new Map(
		contentTypes.map((ct) => [ct.name, ct]),
	);

	const entries = await ctx.db
		.query("contentEntries")
		.filter((q) => q.eq(q.field("deletedAt"), undefined))
		.take(10000);

	for (const entry of entries) {
		if (references.length >= 100) break;

		const contentType = contentTypeMap.get(entry.contentTypeName);
		if (!contentType) continue;

		const mediaFields = contentType.fields.filter((f: { type: string }) => f.type === "media");
		const matchingFields: string[] = [];

		for (const field of mediaFields) {
			const fieldValue = (entry.data as Record<string, unknown>)?.[field.name];
			if (!fieldValue) continue;

			const isMultiple = (field as { options?: { multiple?: boolean } }).options?.multiple ?? false;
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
// Delete Media Asset Mutation
// =============================================================================

export const deleteMediaAsset = mutation({
	args: {
		...deleteMediaAssetArgs.fields,
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

		const item = await ctx.db.get(id);
		if (!item || item.kind !== "asset") {
			throw mediaAssetNotFound((id as unknown) as string);
		}
		const asset = item;

		requireMutationAuth(
			withResourceOwner(_auth, asset.createdBy),
			"mediaItems",
			"delete",
		);

		if (!hardDelete && isDeleted(asset)) {
			throw mediaAssetDeleted((id as unknown) as string);
		}

		// Check for references
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

		// Get folder path for event
		let folderPath: string | undefined;
		if (asset.parentId) {
			const folder = await ctx.db.get(asset.parentId);
			if (folder && folder.kind === "folder") {
				folderPath = folder.path;
			}
		}

		if (hardDelete) {
			let storageFileDeleted = false;
			try {
				await ctx.storage.delete(asset.storageId);
				storageFileDeleted = true;
			} catch (error) {
				console.warn(
					`Could not delete storage file for asset ${id}:`,
					error instanceof Error ? error.message : error,
				);
			}

			await ctx.db.delete(id);

			await emitEvent(ctx, {
				eventType: mediaAssetEventType("deleted"),
				resourceType: "mediaAsset",
				resourceId: (id as unknown) as string,
				action: "deleted",
				payload: {
					name: asset.name,
					mimeType: asset.mimeType,
					type: classifyMimeType(asset.mimeType),
					size: asset.size ?? 0,
					parentId: (asset.parentId as unknown) as string | undefined,
					path: folderPath,
				} as MediaAssetEventPayload,
				userId: deletedBy,
				metadata: { hardDelete: true, storageFileDeleted },
			});

			return {
				...asset,
				deletedAt: Date.now(),
				storageFileDeleted,
			};
		} else {
			const now = Date.now();
			await ctx.db.patch(id, { deletedAt: now });

			await emitEvent(ctx, {
				eventType: mediaAssetEventType("deleted"),
				resourceType: "mediaAsset",
				resourceId: (id as unknown) as string,
				action: "deleted",
				payload: {
					name: asset.name,
					mimeType: asset.mimeType,
					type: classifyMimeType(asset.mimeType),
					size: asset.size ?? 0,
					parentId: (asset.parentId as unknown) as string | undefined,
					path: folderPath,
				} as MediaAssetEventPayload,
				userId: deletedBy,
				metadata: { hardDelete: false },
			});

			return {
				...asset,
				deletedAt: now,
				storageFileDeleted: undefined,
			};
		}
	},
});

// =============================================================================
// Restore Media Asset Mutation
// =============================================================================

export const restoreMediaAsset = mutation({
	args: {
		...restoreMediaAssetArgs.fields,
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaItemDoc,
	handler: async (ctx, args) => {
		const { id, restoredBy, _auth } = args;

		const item = await ctx.db.get(id);
		if (!item || item.kind !== "asset") {
			throw mediaAssetNotFound((id as unknown) as string);
		}
		const asset = item;

		requireMutationAuth(
			withResourceOwner(_auth, asset.createdBy),
			"mediaItems",
			"update",
		);

		if (asset.deletedAt === undefined) {
			throw mediaAssetNotDeleted((id as unknown) as string);
		}

		await ctx.db.patch(id, { deletedAt: undefined });

		const restoredItem = await ctx.db.get(id);
		if (!restoredItem || restoredItem.kind !== "asset") {
			throw internalError("Failed to restore media asset");
		}

		let folderPath: string | undefined;
		if (restoredItem.parentId) {
			const folder = await ctx.db.get(restoredItem.parentId);
			if (folder && folder.kind === "folder") {
				folderPath = folder.path;
			}
		}

		await emitEvent(ctx, {
			eventType: mediaAssetEventType("restored"),
			resourceType: "mediaAsset",
			resourceId: (id as unknown) as string,
			action: "restored",
			payload: {
				name: restoredItem.name,
				mimeType: restoredItem.mimeType,
				type: classifyMimeType(restoredItem.mimeType),
				size: restoredItem.size ?? 0,
				parentId: (restoredItem.parentId as unknown) as string | undefined,
				path: folderPath,
			} as MediaAssetEventPayload,
			userId: restoredBy,
		});

		return restoredItem;
	},
});

// =============================================================================
// Move Media Assets Mutation
// =============================================================================

export const moveMediaAssets = mutation({
	args: {
		...moveMediaAssetsArgs.fields,
		_auth: v.optional(mutationAuthContext),
	},
	returns: moveMediaAssetsResult,
	handler: async (ctx, args) => {
		const { assetIds, targetFolderId, movedBy, _auth } = args;

		requireMutationAuth(_auth, "mediaItems", "update");

		if (assetIds.length > BULK_OPERATION_BATCH_SIZE) {
			throw batchSizeExceeded(BULK_OPERATION_BATCH_SIZE, assetIds.length);
		}

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

		let targetFolderPath: string | undefined;
		if (targetFolderId !== undefined) {
			const targetFolder = await ctx.db.get(targetFolderId);
			if (!targetFolder) {
				throw mediaFolderNotFound((targetFolderId as unknown) as string);
			}
			if (isDeleted(targetFolder)) {
				throw mediaFolderDeleted((targetFolderId as unknown) as string);
			}
			targetFolderPath = targetFolder.path;
		}

		const results: Array<{
			id: Id<"mediaItems">;
			success: boolean;
			error?: string;
			previousFolderId?: Id<"mediaItems">;
		}> = [];

		for (const assetId of assetIds) {
			try {
				const item = await ctx.db.get(assetId);
				if (!item || item.kind !== "asset") {
					results.push({ id: assetId, success: false, error: "Asset not found" });
					continue;
				}

				if (isDeleted(item)) {
					results.push({ id: assetId, success: false, error: "Asset has been deleted" });
					continue;
				}

				if (item.parentId === targetFolderId) {
					results.push({ id: assetId, success: true, previousFolderId: item.parentId });
					continue;
				}

				const previousFolderId = item.parentId;
				await ctx.db.patch(assetId, { parentId: targetFolderId });

				await emitEvent(ctx, {
					eventType: mediaAssetEventType("updated"),
					resourceType: "mediaAsset",
					resourceId: (assetId as unknown) as string,
					action: "updated",
					payload: {
						name: item.name,
						mimeType: item.mimeType,
						type: classifyMimeType(item.mimeType),
						size: item.size ?? 0,
						parentId: (targetFolderId as unknown) as string | undefined,
						path: targetFolderPath,
					} as MediaAssetEventPayload,
					userId: movedBy,
					metadata: {
						moveOperation: true,
						previousFolderId: (previousFolderId as unknown) as string | undefined,
					},
				});

				results.push({ id: assetId, success: true, previousFolderId });
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
