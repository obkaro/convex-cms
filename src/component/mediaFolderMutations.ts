/**
 * Media Folder Mutation Functions
 *
 * Provides mutation functions for creating, updating, moving, and deleting media folders.
 * Media folders organize media assets into a hierarchical structure with path validation.
 *
 * Folder Hierarchy:
 * - Root folders have no parentId
 * - Nested folders reference their parent folder
 * - Path is automatically computed from the folder hierarchy (e.g., "/images/blog/2026")
 * - Moving folders updates paths for the folder and all descendants
 */

import { mutation, query, type MutationCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { v } from "convex/values";
import {
	createMediaFolderArgs,
	updateMediaFolderArgs,
	moveFolderArgs,
	mediaItemDoc,
	mutationAuthContext,
} from "./validators.js";
import {
	mediaFolderNotFound,
	mediaFolderDeleted,
	mediaFolderNotDeleted,
	mediaFolderNameInvalid,
	mediaFolderNameDuplicate,
	mediaFolderDepthExceeded,
	mediaFolderPathTooLong,
	mediaFolderHasContents,
	mediaFolderCircularMove,
	mediaFolderParentDeleted,
	mediaFolderCreateFailed,
	internalError,
} from "./lib/errors.js";
import { requireMutationAuth } from "./lib/mutationAuth.js";

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum depth of folder nesting.
 * Prevents excessively deep hierarchies that could impact performance.
 */
const MAX_FOLDER_DEPTH = 10;

/**
 * Maximum length of a folder path.
 * Prevents extremely long paths that could cause issues.
 */
const MAX_PATH_LENGTH = 500;

/**
 * Invalid characters in folder names.
 * These characters are not allowed because they could break path parsing.
 */
const INVALID_NAME_CHARS = /[/\\:*?"<>|]/;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates a folder name.
 *
 * @param name - The folder name to validate
 * @throws Error if the name is invalid
 */
function validateFolderName(name: string): void {
	// Check for empty or whitespace-only names
	const trimmed = name.trim();
	if (trimmed.length === 0) {
		throw mediaFolderNameInvalid(name, "Name cannot be empty");
	}

	// Check for invalid characters
	if (INVALID_NAME_CHARS.test(trimmed)) {
		throw mediaFolderNameInvalid(
			name,
			`Contains invalid characters. The following are not allowed: / \\ : * ? " < > |`,
		);
	}

	// Check length
	if (trimmed.length > 255) {
		throw mediaFolderNameInvalid(name, "Name cannot exceed 255 characters");
	}
}

/**
 * Builds the full path for a folder based on its parent.
 *
 * @param name - The folder name
 * @param parentPath - The parent folder's path (empty string for root)
 * @returns The full path for the folder
 */
function buildFolderPath(name: string, parentPath: string): string {
	const trimmedName = name.trim();
	if (!parentPath || parentPath === "/") {
		return `/${trimmedName}`;
	}
	return `${parentPath}/${trimmedName}`;
}

/**
 * Calculates the depth of a path.
 *
 * @param path - The folder path
 * @returns The depth (number of segments)
 */
function getPathDepth(path: string): number {
	if (!path || path === "/") return 0;
	// Split by "/" and filter out empty strings
	return path.split("/").filter((segment) => segment.length > 0).length;
}

// =============================================================================
// Create Media Folder Mutation
// =============================================================================

/**
 * Mutation to create a new media folder.
 *
 * Creates a folder in the media library hierarchy. Folders can be nested
 * within other folders up to MAX_FOLDER_DEPTH levels deep. The full path
 * is automatically computed based on the parent folder hierarchy.
 *
 * Validation Rules:
 * - Folder name must not be empty or whitespace-only
 * - Folder name must not contain: / \ : * ? " < > |
 * - Folder name must not exceed 255 characters
 * - Full path must not exceed MAX_PATH_LENGTH characters
 * - Folder depth must not exceed MAX_FOLDER_DEPTH levels
 * - Parent folder must exist and not be soft-deleted (if provided)
 * - Folder name must be unique within the parent folder
 *
 * @param name - The folder name (required)
 * @param parentId - Optional parent folder ID for nesting
 * @param description - Optional description of the folder
 * @param sortOrder - Optional custom sort order
 * @param createdBy - Optional user ID for audit trail
 *
 * @returns The created media folder document
 *
 * @throws Error if the folder name is invalid
 * @throws Error if the parent folder does not exist
 * @throws Error if the parent folder has been deleted
 * @throws Error if the folder depth would exceed the maximum
 * @throws Error if the path length would exceed the maximum
 * @throws Error if a folder with the same name already exists in the parent
 *
 * @example
 * ```typescript
 * // Create a root folder
 * const imagesFolder = await ctx.runMutation(api.mediaFolderMutations.createMediaFolder, {
 *   name: "Images",
 *   description: "All image assets",
 *   createdBy: currentUserId,
 * });
 *
 * // Create a nested folder
 * const blogFolder = await ctx.runMutation(api.mediaFolderMutations.createMediaFolder, {
 *   name: "Blog",
 *   parentId: imagesFolder._id,
 *   description: "Blog post images",
 *   createdBy: currentUserId,
 * });
 *
 * // Result: blogFolder.path === "/Images/Blog"
 * ```
 */
export const createMediaFolder = mutation({
	args: {
		...createMediaFolderArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaItemDoc,
	handler: async (ctx, args) => {
		const { name, parentId, description, sortOrder, createdBy, _auth } = args;

		// Authorization check - mediaFolders.create permission
		requireMutationAuth(_auth, "mediaItems", "create");

		// Validate folder name
		validateFolderName(name);

		// Determine parent path and validate parent folder
		let parentPath = "";

		if (parentId !== undefined) {
			// Fetch parent folder
			const parentFolder = await ctx.db.get(parentId);

			if (!parentFolder) {
				throw mediaFolderNotFound((parentId as unknown) as string);
			}

			if (parentFolder.deletedAt !== undefined) {
				throw mediaFolderDeleted((parentId as unknown) as string);
			}

			parentPath = parentFolder.path;

			// Check folder depth limit
			const parentDepth = getPathDepth(parentPath);
			if (parentDepth >= MAX_FOLDER_DEPTH) {
				throw mediaFolderDepthExceeded(MAX_FOLDER_DEPTH, parentDepth + 1);
			}
		}

		// Build the full path
		const path = buildFolderPath(name, parentPath);

		// Check path length limit
		if (path.length > MAX_PATH_LENGTH) {
			throw mediaFolderPathTooLong(MAX_PATH_LENGTH, path.length);
		}

		// Check for duplicate folder name in the same parent
		const existingFolder = await ctx.db
			.query("mediaItems")
			.withIndex("by_path", (q) => q.eq("path", path))
			.filter((q) => q.and(
				q.eq(q.field("kind"), "folder"),
				q.eq(q.field("deletedAt"), undefined)
			))
			.first();

		if (existingFolder) {
			throw mediaFolderNameDuplicate(name.trim(), parentPath || undefined);
		}

		// Create the folder
		const folderId = await ctx.db.insert("mediaItems", {
			kind: "folder",
			name: name.trim(),
			parentId,
			path,
			description,
			sortOrder,
			createdBy,
		});

		// Retrieve and return the created folder
		const folder = await ctx.db.get(folderId);
		if (!folder) {
			throw mediaFolderCreateFailed();
		}

		return folder;
	},
});

// =============================================================================
// Update Media Folder Mutation
// =============================================================================

/**
 * Mutation to update a media folder's metadata.
 *
 * Updates the folder name, description, or sort order. If the name is changed,
 * the path is automatically updated for this folder and all its descendants.
 *
 * @param id - The folder ID to update
 * @param name - Optional new folder name
 * @param description - Optional new description
 * @param sortOrder - Optional new sort order
 *
 * @returns The updated media folder document
 *
 * @throws Error if the folder does not exist
 * @throws Error if the folder has been deleted
 * @throws Error if the new name is invalid
 * @throws Error if a folder with the new name already exists in the same parent
 *
 * @example
 * ```typescript
 * const updated = await ctx.runMutation(api.mediaFolderMutations.updateMediaFolder, {
 *   id: folderId,
 *   name: "Blog Images",
 *   description: "Updated description",
 * });
 * ```
 */
export const updateMediaFolder = mutation({
	args: {
		...updateMediaFolderArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaItemDoc,
	handler: async (ctx, args) => {
		const { id, name, description, sortOrder, _auth } = args;

		// Authorization check - mediaFolders.update permission
		requireMutationAuth(_auth, "mediaItems", "update");

		// Retrieve the folder
		const folder = await ctx.db.get(id);

		if (!folder) {
			throw mediaFolderNotFound((id as unknown) as string);
		}

		if (folder.deletedAt !== undefined) {
			throw mediaFolderDeleted((id as unknown) as string);
		}

		// Build updates object
		const updates: Record<string, unknown> = {};

		// Handle name change (requires path update)
		if (name !== undefined && name.trim() !== folder.name) {
			validateFolderName(name);

			// Get parent path
			let parentPath = "";
			if (folder.parentId) {
				const parentFolder = await ctx.db.get(folder.parentId);
				if (parentFolder) {
					parentPath = parentFolder.path;
				}
			}

			// Build new path
			const newPath = buildFolderPath(name, parentPath);

			// Check path length
			if (newPath.length > MAX_PATH_LENGTH) {
				throw mediaFolderPathTooLong(MAX_PATH_LENGTH, newPath.length);
			}

			// Check for duplicate name in same parent
			const existingFolder = await ctx.db
				.query("mediaItems")
				.withIndex("by_path", (q) => q.eq("path", newPath))
				.filter((q) => q.eq(q.field("deletedAt"), undefined))
				.first();

			if (existingFolder && existingFolder._id !== id) {
				throw mediaFolderNameDuplicate(name.trim(), parentPath || undefined);
			}

			updates.name = name.trim();
			const oldPath = folder.path;
			updates.path = newPath;

			// Update all descendant folder paths
			await updateDescendantPaths(ctx, oldPath, newPath);
		}

		if (description !== undefined) {
			updates.description = description;
		}

		if (sortOrder !== undefined) {
			updates.sortOrder = sortOrder;
		}

		// Apply updates if any
		if (Object.keys(updates).length > 0) {
			await ctx.db.patch(id, updates);
		}

		// Retrieve and return the updated folder
		const updatedFolder = await ctx.db.get(id);
		if (!updatedFolder) {
			throw new Error("Failed to retrieve updated media folder");
		}

		return updatedFolder;
	},
});

/**
 * Updates paths for all descendant folders when a parent folder is renamed.
 */
async function updateDescendantPaths(
	ctx: MutationCtx,
	oldParentPath: string,
	newParentPath: string,
): Promise<void> {
	// Find all folders whose path starts with the old path
	const descendants = await ctx.db
		.query("mediaItems")
		.filter((q) => q.eq(q.field("deletedAt"), undefined))
		.collect();

	for (const descendant of descendants) {
		if (
			descendant.path.startsWith(oldParentPath + "/") &&
			descendant.path !== oldParentPath
		) {
			const newDescendantPath = descendant.path.replace(
				oldParentPath,
				newParentPath,
			);
			await ctx.db.patch(descendant._id, { path: newDescendantPath });
		}
	}
}

// =============================================================================
// Move Media Folder Mutation
// =============================================================================

/**
 * Mutation to move a folder to a different parent.
 *
 * Moves a folder and all its contents (assets and subfolders) to a new
 * location in the hierarchy. Updates paths for the folder and all descendants.
 *
 * @param id - The folder ID to move
 * @param newParentId - The new parent folder ID (undefined for root level)
 *
 * @returns The moved media folder document
 *
 * @throws Error if the folder does not exist
 * @throws Error if the folder has been deleted
 * @throws Error if the new parent does not exist
 * @throws Error if the new parent has been deleted
 * @throws Error if moving would create a circular reference
 * @throws Error if moving would exceed the maximum depth
 *
 * @example
 * ```typescript
 * // Move folder to a different parent
 * const moved = await ctx.runMutation(api.mediaFolderMutations.moveMediaFolder, {
 *   id: folderId,
 *   newParentId: newParentFolderId,
 * });
 *
 * // Move folder to root level
 * const movedToRoot = await ctx.runMutation(api.mediaFolderMutations.moveMediaFolder, {
 *   id: folderId,
 *   newParentId: undefined,
 * });
 * ```
 */
export const moveMediaFolder = mutation({
	args: {
		...moveFolderArgs.fields,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaItemDoc,
	handler: async (ctx, args) => {
		const { id, newParentId, _auth } = args;

		// Authorization check - mediaFolders.update permission (move is a form of update)
		requireMutationAuth(_auth, "mediaItems", "update");

		// Retrieve the folder
		const folder = await ctx.db.get(id);

		if (!folder) {
			throw mediaFolderNotFound((id as unknown) as string);
		}

		if (folder.deletedAt !== undefined) {
			throw mediaFolderDeleted((id as unknown) as string);
		}

		// No change needed if parent is the same
		if (folder.parentId === newParentId) {
			return folder;
		}

		// Determine new parent path
		let newParentPath = "";

		if (newParentId !== undefined) {
			// Fetch new parent folder
			const newParentFolder = await ctx.db.get(newParentId);

			if (!newParentFolder) {
				throw mediaFolderNotFound((newParentId as unknown) as string);
			}

			if (newParentFolder.deletedAt !== undefined) {
				throw mediaFolderDeleted((newParentId as unknown) as string);
			}

			// Check for circular reference
			// Cannot move a folder into itself or one of its descendants
			if (
				newParentFolder.path.startsWith(folder.path + "/") ||
				newParentFolder._id === id
			) {
				throw mediaFolderCircularMove((id as unknown) as string);
			}

			newParentPath = newParentFolder.path;

			// Check depth limit
			const newParentDepth = getPathDepth(newParentPath);
			const folderSubtreeDepth = await getMaxSubtreeDepth(ctx, folder.path);
			const totalDepth = newParentDepth + 1 + folderSubtreeDepth;

			if (totalDepth > MAX_FOLDER_DEPTH) {
				throw mediaFolderDepthExceeded(MAX_FOLDER_DEPTH, totalDepth);
			}
		}

		// Build new path
		const oldPath = folder.path;
		const newPath = buildFolderPath(folder.name, newParentPath);

		// Check path length
		if (newPath.length > MAX_PATH_LENGTH) {
			throw mediaFolderPathTooLong(MAX_PATH_LENGTH, newPath.length);
		}

		// Check for duplicate name in new parent
		const existingFolder = await ctx.db
			.query("mediaItems")
			.withIndex("by_path", (q) => q.eq("path", newPath))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.first();

		if (existingFolder && existingFolder._id !== id) {
			throw mediaFolderNameDuplicate(folder.name, newParentPath || undefined);
		}

		// Update the folder
		await ctx.db.patch(id, {
			parentId: newParentId,
			path: newPath,
		});

		// Update all descendant folder paths
		await updateDescendantPaths(ctx, oldPath, newPath);

		// Retrieve and return the moved folder
		const movedFolder = await ctx.db.get(id);
		if (!movedFolder) {
			throw internalError("Failed to retrieve moved media folder");
		}

		return movedFolder;
	},
});

/**
 * Gets the maximum depth of descendants under a folder path.
 */
async function getMaxSubtreeDepth(
	ctx: MutationCtx,
	folderPath: string,
): Promise<number> {
	const descendants = await ctx.db
		.query("mediaItems")
		.filter((q) => q.eq(q.field("deletedAt"), undefined))
		.collect();

	let maxDepth = 0;
	const baseDepth = getPathDepth(folderPath);

	for (const descendant of descendants) {
		if (descendant.path.startsWith(folderPath + "/")) {
			const descendantDepth = getPathDepth(descendant.path);
			const relativeDepth = descendantDepth - baseDepth;
			if (relativeDepth > maxDepth) {
				maxDepth = relativeDepth;
			}
		}
	}

	return maxDepth;
}

// =============================================================================
// Delete Media Folder Mutation
// =============================================================================

/**
 * Validator for delete folder arguments.
 */
export const deleteMediaFolderArgs = {
	id: v.id("mediaItems"),
	deletedBy: v.optional(v.string()),
	hardDelete: v.optional(v.boolean()),
	recursive: v.optional(v.boolean()),
};

/**
 * Mutation to delete a media folder.
 *
 * Supports two modes:
 * - Soft delete (default): Sets deletedAt timestamp, folder can be restored
 * - Hard delete: Permanently removes the folder from the database
 *
 * By default, deletion fails if the folder contains assets or subfolders.
 * Use recursive: true to delete the folder and all its contents.
 *
 * @param id - The folder ID to delete
 * @param deletedBy - Optional user ID for audit trail
 * @param hardDelete - If true, permanently deletes the folder
 * @param recursive - If true, deletes folder and all contents
 *
 * @returns The deleted media folder document
 *
 * @throws Error if the folder does not exist
 * @throws Error if the folder is already deleted (for soft delete)
 * @throws Error if the folder has contents and recursive is not true
 *
 * @example
 * ```typescript
 * // Soft delete an empty folder
 * const deleted = await ctx.runMutation(api.mediaFolderMutations.deleteMediaFolder, {
 *   id: folderId,
 *   deletedBy: currentUserId,
 * });
 *
 * // Recursively delete folder and all contents
 * const deleted = await ctx.runMutation(api.mediaFolderMutations.deleteMediaFolder, {
 *   id: folderId,
 *   deletedBy: currentUserId,
 *   recursive: true,
 * });
 * ```
 */
export const deleteMediaFolder = mutation({
	args: {
		...deleteMediaFolderArgs,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaItemDoc,
	handler: async (ctx, args) => {
		const {
			id,
			// deletedBy,
			hardDelete = false,
			recursive = false,
			_auth,
		} = args;

		// Authorization check - mediaFolders.delete permission
		requireMutationAuth(_auth, "mediaItems", "delete");

		// Retrieve the folder
		const folder = await ctx.db.get(id);

		if (!folder) {
			throw mediaFolderNotFound((id as unknown) as string);
		}

		// For soft delete, check if already deleted
		if (!hardDelete && folder.deletedAt !== undefined) {
			throw mediaFolderDeleted((id as unknown) as string);
		}

		// Check for contents (subfolders and assets)
		const subfolders = await ctx.db
			.query("mediaItems")
			.withIndex("by_parent", (q) => q.eq("parentId", id))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.take(1);

		const assets = await ctx.db
			.query("mediaItems")
			.withIndex("by_parent", (q) => q.eq("parentId", id))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.take(1);

		const hasContents = subfolders.length > 0 || assets.length > 0;

		if (hasContents && !recursive) {
			throw mediaFolderHasContents(
				(id as unknown) as string,
				subfolders.length,
				assets.length,
			);
		}

		// If recursive, delete all contents first
		if (recursive && hasContents) {
			await deleteContentsRecursively(ctx, id, hardDelete);
		}

		if (hardDelete) {
			// Permanently delete the folder
			await ctx.db.delete(id);

			return {
				...folder,
				deletedAt: Date.now(),
			};
		} else {
			// Soft delete
			const now = Date.now();
			await ctx.db.patch(id, {
				deletedAt: now,
			});

			return {
				...folder,
				deletedAt: now,
			};
		}
	},
});

/**
 * Recursively deletes all contents of a folder.
 */
async function deleteContentsRecursively(
	ctx: MutationCtx,
	folderId: Id<"mediaItems">,
	hardDelete: boolean,
): Promise<void> {
	// Get all subfolders
	const subfolders = await ctx.db
		.query("mediaItems")
		.withIndex("by_kind_and_parent", (q) =>
			q.eq("kind", "folder").eq("parentId", folderId),
		)
		.filter((q) => q.eq(q.field("deletedAt"), undefined))
		.collect();

	// Recursively delete subfolders first
	for (const subfolder of subfolders) {
		await deleteContentsRecursively(ctx, subfolder._id, hardDelete);

		if (hardDelete) {
			await ctx.db.delete(subfolder._id);
		} else {
			await ctx.db.patch(subfolder._id, { deletedAt: Date.now() });
		}
	}

	// Delete/soft-delete all assets in this folder
	const assets = await ctx.db
		.query("mediaItems")
		.withIndex("by_kind_and_parent", (q) =>
			q.eq("kind", "asset").eq("parentId", folderId),
		)
		.filter((q) => q.eq(q.field("deletedAt"), undefined))
		.collect();

	for (const item of assets) {
		// Type guard for asset (we already filtered by kind="asset" in the query)
		if (item.kind !== "asset") continue;
		const asset = item;

		if (hardDelete) {
			// For hard delete, also delete the storage file
			try {
				await ctx.storage.delete(asset.storageId);
			} catch (error) {
				console.warn(
					`Could not delete storage file for asset ${asset._id}:`,
					error instanceof Error ? error.message : error,
				);
			}
			await ctx.db.delete(asset._id);
		} else {
			await ctx.db.patch(asset._id, { deletedAt: Date.now() });
		}
	}
}

// =============================================================================
// Restore Media Folder Mutation
// =============================================================================

/**
 * Validator for restore folder arguments.
 */
export const restoreMediaFolderArgs = {
	id: v.id("mediaItems"),
	restoredBy: v.optional(v.string()),
	recursive: v.optional(v.boolean()),
};

/**
 * Mutation to restore a soft-deleted media folder.
 *
 * Removes the deletedAt timestamp from the folder.
 * Optionally restores all contents recursively.
 *
 * @param id - The folder ID to restore
 * @param restoredBy - Optional user ID for audit trail
 * @param recursive - If true, restores folder and all contents
 *
 * @returns The restored media folder document
 *
 * @throws Error if the folder does not exist
 * @throws Error if the folder is not deleted
 * @throws Error if the parent folder is still deleted
 *
 * @example
 * ```typescript
 * const restored = await ctx.runMutation(api.mediaFolderMutations.restoreMediaFolder, {
 *   id: folderId,
 *   restoredBy: currentUserId,
 *   recursive: true,
 * });
 * ```
 */
export const restoreMediaFolder = mutation({
	args: {
		...restoreMediaFolderArgs,
		/** Optional auth context for mutation-level authorization */
		_auth: v.optional(mutationAuthContext),
	},
	returns: mediaItemDoc,
	handler: async (ctx, args) => {
		const { id,
			// restoredBy,
			recursive = false, _auth } = args;

		// Authorization check - use update permission for restore
		requireMutationAuth(_auth, "mediaItems", "update");

		// Retrieve the folder
		const folder = await ctx.db.get(id);

		if (!folder) {
			throw mediaFolderNotFound((id as unknown) as string);
		}

		if (folder.deletedAt === undefined) {
			throw mediaFolderNotDeleted((id as unknown) as string);
		}

		// Check that parent folder is not deleted (if it exists)
		if (folder.parentId) {
			const parentFolder = await ctx.db.get(folder.parentId);
			if (parentFolder && parentFolder.deletedAt !== undefined) {
				throw mediaFolderParentDeleted(
					(id as unknown) as string,
					(folder.parentId as unknown) as string,
				);
			}
		}

		// Restore the folder
		await ctx.db.patch(id, {
			deletedAt: undefined,
		});

		// If recursive, restore all contents
		if (recursive) {
			await restoreContentsRecursively(ctx, id);
		}

		// Retrieve and return the restored folder
		const restoredFolder = await ctx.db.get(id);
		if (!restoredFolder) {
			throw internalError("Failed to restore media folder");
		}

		return restoredFolder;
	},
});

/**
 * Recursively restores all contents of a folder.
 */
async function restoreContentsRecursively(
	ctx: MutationCtx,
	folderId: Id<"mediaItems">,
): Promise<void> {
	// Get all soft-deleted subfolders
	const subfolders = await ctx.db
		.query("mediaItems")
		.withIndex("by_kind_and_parent", (q) =>
			q.eq("kind", "folder").eq("parentId", folderId),
		)
		.filter((q) => q.neq(q.field("deletedAt"), undefined))
		.collect();

	for (const subfolder of subfolders) {
		await ctx.db.patch(subfolder._id, { deletedAt: undefined });
		await restoreContentsRecursively(ctx, subfolder._id);
	}

	// Restore all soft-deleted assets in this folder
	const assets = await ctx.db
		.query("mediaItems")
		.withIndex("by_kind_and_parent", (q) =>
			q.eq("kind", "asset").eq("parentId", folderId),
		)
		.filter((q) => q.neq(q.field("deletedAt"), undefined))
		.collect();

	for (const asset of assets) {
		await ctx.db.patch(asset._id, { deletedAt: undefined });
	}
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Query to get a media folder by ID.
 *
 * @param id - The folder ID
 * @param includeDeleted - If true, returns soft-deleted folders
 *
 * @returns The folder document or null if not found
 */
export const getMediaFolder = query({
	args: {
		id: v.id("mediaItems"),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.union(mediaItemDoc, v.null()),
	handler: async (ctx, args) => {
		const { id, includeDeleted = false } = args;

		const item = await ctx.db.get(id);

		// Must be a folder
		if (!item || item.kind !== "folder") {
			return null;
		}

		if (!includeDeleted && item.deletedAt !== undefined) {
			return null;
		}

		return item;
	},
});

/**
 * Query to list folders in a parent folder.
 *
 * @param parentId - The parent folder ID (undefined for root folders)
 * @param includeDeleted - If true, includes soft-deleted folders
 *
 * @returns Array of folder documents sorted by sortOrder, then name
 */
export const listMediaFolders = query({
	args: {
		parentId: v.optional(v.id("mediaItems")),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.array(mediaItemDoc),
	handler: async (ctx, args) => {
		const { parentId, includeDeleted = false } = args;

		let query = ctx.db
			.query("mediaItems")
			.withIndex("by_kind_and_parent", (q) =>
				q.eq("kind", "folder").eq("parentId", parentId),
			);

		if (!includeDeleted) {
			query = query.filter((q) => q.eq(q.field("deletedAt"), undefined));
		}

		const folders = await query.collect();

		// Sort by sortOrder (nulls last), then by name
		// Note: sortOrder is only defined on folders, so these are safe after kind filter
		folders.sort((a, b) => {
			const aOrder = a.kind === "folder" ? a.sortOrder : undefined;
			const bOrder = b.kind === "folder" ? b.sortOrder : undefined;
			if (aOrder !== undefined && bOrder !== undefined) {
				return aOrder - bOrder;
			}
			if (aOrder !== undefined) return -1;
			if (bOrder !== undefined) return 1;
			return a.name.localeCompare(b.name);
		});

		return folders;
	},
});

/**
 * Query to get a folder by its path.
 *
 * @param path - The full folder path (e.g., "/Images/Blog")
 * @param includeDeleted - If true, returns soft-deleted folders
 *
 * @returns The folder document or null if not found
 */
export const getMediaFolderByPath = query({
	args: {
		path: v.string(),
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.union(mediaItemDoc, v.null()),
	handler: async (ctx, args) => {
		const { path, includeDeleted = false } = args;

		let query = ctx.db
			.query("mediaItems")
			.withIndex("by_path", (q) => q.eq("path", path))
			.filter((q) => q.eq(q.field("kind"), "folder"));

		if (!includeDeleted) {
			query = query.filter((q) => q.eq(q.field("deletedAt"), undefined));
		}

		return await query.first();
	},
});

/**
 * Query to get the folder tree (all folders as a flat list with hierarchy info).
 *
 * @param includeDeleted - If true, includes soft-deleted folders
 *
 * @returns Array of all folders
 */
export const getFolderTree = query({
	args: {
		includeDeleted: v.optional(v.boolean()),
	},
	returns: v.array(mediaItemDoc),
	handler: async (ctx, args) => {
		const { includeDeleted = false } = args;

		let query = ctx.db
			.query("mediaItems")
			.withIndex("by_kind", (q) => q.eq("kind", "folder"));

		if (!includeDeleted) {
			query = query.filter((q) => q.eq(q.field("deletedAt"), undefined));
		}

		const folders = await query.collect();

		// Sort by path for hierarchical display
		folders.sort((a, b) => a.path.localeCompare(b.path));

		return folders;
	},
});
