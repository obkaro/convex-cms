/**
 * Wrapper functions for media asset and folder operations.
 *
 * These functions wrap the internal CMS component functions to expose
 * them as public API for the admin UI media library.
 */

import { v } from "convex/values";
import { omit } from "convex-helpers";
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import {
	mediaTypeValidator,
	variantTypeValidator,
	variantStatusValidator,
} from "../../src/component/schema.js";
import {
	createMediaAssetArgs,
	updateMediaAssetArgs,
	deleteMediaAssetArgs,
	createMediaFolderArgs,
	updateMediaFolderArgs,
	deleteMediaFolderArgs,
	moveMediaAssetsArgs,
	moveFolderArgs,
	createMediaVariantArgs,
	requestVariantGenerationArgs,
	deleteMediaVariantArgs,
	deleteAssetVariantsArgs,
} from "../../src/component/validators.js";

// =============================================================================
// Media Asset Queries
// =============================================================================

/**
 * List media assets with optional filtering and pagination.
 *
 * Note: folderId uses v.string() because IDs from the CMS component
 * become plain strings when crossing the component boundary.
 */
export const listAssets = query({
	args: {
		folderId: v.optional(v.string()),
		type: v.optional(mediaTypeValidator),
		search: v.optional(v.string()),
		includeDeleted: v.optional(v.boolean()),
		deletedOnly: v.optional(v.boolean()),
		paginationOpts: v.object({
			numItems: v.number(),
			cursor: v.union(v.string(), v.null()),
		}),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(components.convexCms.mediaAssets.list, {
			folderId: args.folderId,
			type: args.type,
			search: args.search,
			includeDeleted: args.includeDeleted,
			deletedOnly: args.deletedOnly,
			paginationOpts: args.paginationOpts,
		});
	},
});

/**
 * Get a single media asset by ID.
 */
export const getAsset = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(components.convexCms.mediaAssets.get, {
			id: args.id,
		});
	},
});

// =============================================================================
// Media Folder Queries
// =============================================================================

/**
 * List folders in a parent folder (or root if no parent specified).
 * When deletedOnly is true, shows all deleted folders regardless of parent.
 */
export const listFolders = query({
	args: {
		parentId: v.optional(v.string()),
		deletedOnly: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.mediaFolderMutations.listMediaFolders,
			{
				parentId: args.parentId,
				deletedOnly: args.deletedOnly,
			},
		);
	},
});

/**
 * Get the full folder tree for navigation.
 */
export const getFolderTree = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.runQuery(
			components.convexCms.mediaFolderMutations.getFolderTree,
			{},
		);
	},
});

/**
 * Get a single folder by ID.
 */
export const getFolder = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.mediaFolderMutations.getMediaFolder,
			{
				id: args.id,
			},
		);
	},
});

// =============================================================================
// Media Folder Mutations
// =============================================================================

/**
 * Create a new folder.
 * Derives args from component validator with string IDs.
 */
export const createFolder = mutation({
	args: {
		...omit(createMediaFolderArgs.fields, ["parentId"]),
		parentId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaFolderMutations.createMediaFolder,
			args,
		);
	},
});

/**
 * Update a folder's name, description, or sort order.
 * Derives args from component validator with string IDs.
 */
export const updateFolder = mutation({
	args: {
		...omit(updateMediaFolderArgs.fields, ["id", "parentId"]),
		id: v.string(),
		parentId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaFolderMutations.updateMediaFolder,
			args,
		);
	},
});

/**
 * Move a folder to a different parent.
 * Derives args from component validator with string IDs.
 */
export const moveFolder = mutation({
	args: {
		...omit(moveFolderArgs.fields, ["id", "newParentId"]),
		id: v.string(),
		newParentId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaFolderMutations.moveMediaFolder,
			args,
		);
	},
});

/**
 * Delete a folder.
 * Derives args from component validator with string ID.
 */
export const deleteFolder = mutation({
	args: {
		...omit(deleteMediaFolderArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaFolderMutations.deleteMediaFolder,
			args,
		);
	},
});

/**
 * Restore a soft-deleted folder.
 * Optionally restores all contents recursively.
 */
export const restoreFolder = mutation({
	args: {
		id: v.string(),
		recursive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaFolderMutations.restoreMediaFolder,
			{
				id: args.id,
				recursive: args.recursive,
			},
		);
	},
});

// =============================================================================
// Media Asset Mutations
// =============================================================================

/**
 * Create a new media asset.
 * Derives args from component validator with string IDs.
 */
export const createAsset = mutation({
	args: {
		...omit(createMediaAssetArgs.fields, ["storageId", "parentId"]),
		storageId: v.string(),
		parentId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaAssetMutations.createMediaAsset,
			args,
		);
	},
});

/**
 * Update a media asset's metadata.
 * Derives args from component validator with string IDs.
 */
export const updateAsset = mutation({
	args: {
		...omit(updateMediaAssetArgs.fields, ["id", "parentId"]),
		id: v.string(),
		parentId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaAssetMutations.updateMediaAsset,
			args,
		);
	},
});

/**
 * Delete a media asset.
 * Derives args from component validator with string ID.
 */
export const deleteAsset = mutation({
	args: {
		...omit(deleteMediaAssetArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaAssetMutations.deleteMediaAsset,
			args,
		);
	},
});

/**
 * Restore a soft-deleted media asset.
 */
export const restoreAsset = mutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaAssetMutations.restoreMediaAsset,
			{
				id: args.id,
			},
		);
	},
});

/**
 * Move multiple media assets to a different folder.
 * Supports bulk operations up to 100 assets at a time.
 * Derives args from component validator with string IDs.
 */
export const moveAssets = mutation({
	args: {
		...omit(moveMediaAssetsArgs.fields, ["assetIds", "targetFolderId"]),
		assetIds: v.array(v.string()),
		targetFolderId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaAssetMutations.moveMediaAssets,
			args,
		);
	},
});

/**
 * Generate an upload URL for file uploads.
 * Delegates to the CMS component so files are stored in the component's storage namespace.
 */
export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		const result = await ctx.runMutation(
			components.convexCms.mediaUploadMutations.generateUploadUrl,
			{},
		);
		return result.uploadUrl;
	},
});

// =============================================================================
// Media Variant Queries
// =============================================================================

/**
 * List variants for a media asset with optional filtering.
 */
export const listVariants = query({
	args: {
		assetId: v.string(),
		variantType: v.optional(variantTypeValidator),
		format: v.optional(v.string()),
		preset: v.optional(v.string()),
		status: v.optional(variantStatusValidator),
		includeDeleted: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(components.convexCms.mediaVariants.list, {
			assetId: args.assetId,
			variantType: args.variantType,
			format: args.format,
			preset: args.preset,
			status: args.status,
			includeDeleted: args.includeDeleted,
		});
	},
});

/**
 * Get a single variant by ID.
 */
export const getVariant = query({
	args: {
		id: v.string(),
		includeDeleted: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(components.convexCms.mediaVariants.get, {
			id: args.id,
			includeDeleted: args.includeDeleted,
		});
	},
});

/**
 * Get the best matching variant for target dimensions.
 * Useful for serving appropriately sized images.
 */
export const getBestVariant = query({
	args: {
		assetId: v.string(),
		targetWidth: v.optional(v.number()),
		targetHeight: v.optional(v.number()),
		preferredFormat: v.optional(v.string()),
		fallbackToOriginal: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.mediaVariants.getBestVariant,
			{
				assetId: args.assetId,
				targetWidth: args.targetWidth,
				targetHeight: args.targetHeight,
				preferredFormat: args.preferredFormat,
				fallbackToOriginal: args.fallbackToOriginal,
			},
		);
	},
});

/**
 * Get responsive srcset data for HTML img/picture tags.
 */
export const getResponsiveSrcset = query({
	args: {
		assetId: v.string(),
		format: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.mediaVariants.getResponsiveSrcset,
			{
				assetId: args.assetId,
				format: args.format,
			},
		);
	},
});

/**
 * Get available variant presets (thumbnail, small, medium, large, etc.).
 */
export const getVariantPresets = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.runQuery(
			components.convexCms.mediaVariants.getPresets,
			{},
		);
	},
});

/**
 * Get a media asset with all its completed variants.
 */
export const getAssetWithVariants = query({
	args: {
		assetId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runQuery(
			components.convexCms.mediaVariants.getAssetWithVariants,
			{
				assetId: args.assetId,
			},
		);
	},
});

// =============================================================================
// Media Variant Mutations
// =============================================================================

/**
 * Create a completed variant (after external processing).
 * Derives args from component validator with string IDs.
 */
export const createVariant = mutation({
	args: {
		...omit(createMediaVariantArgs.fields, ["assetId", "storageId"]),
		assetId: v.string(),
		storageId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaVariantMutations.createMediaVariant,
			args,
		);
	},
});

/**
 * Request async generation of a variant.
 * Derives args from component validator with string ID.
 */
export const requestVariantGeneration = mutation({
	args: {
		...omit(requestVariantGenerationArgs.fields, ["assetId"]),
		assetId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaVariantMutations.requestVariantGeneration,
			args,
		);
	},
});

/**
 * Delete a media variant.
 * Derives args from component validator with string ID.
 */
export const deleteVariant = mutation({
	args: {
		...omit(deleteMediaVariantArgs.fields, ["id"]),
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaVariantMutations.deleteMediaVariant,
			args,
		);
	},
});

/**
 * Delete all variants for a media asset.
 * Derives args from component validator with string ID.
 */
export const deleteAssetVariants = mutation({
	args: {
		...omit(deleteAssetVariantsArgs.fields, ["assetId"]),
		assetId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaVariantMutations.deleteAssetVariants,
			args,
		);
	},
});

/**
 * Generate multiple variants from presets.
 * Queues pending variants for external processing.
 */
export const generateVariantsFromPresets = mutation({
	args: {
		assetId: v.string(),
		presets: v.array(v.string()),
		requestedBy: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaVariantMutations.generateFromPresets,
			{
				assetId: args.assetId,
				presets: args.presets,
				requestedBy: args.requestedBy,
			},
		);
	},
});

/**
 * Restore a soft-deleted variant.
 */
export const restoreVariant = mutation({
	args: {
		id: v.string(),
		restoredBy: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(
			components.convexCms.mediaVariantMutations.restoreMediaVariant,
			{
				id: args.id,
				restoredBy: args.restoredBy,
			},
		);
	},
});
