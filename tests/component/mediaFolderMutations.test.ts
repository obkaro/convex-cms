/**
 * Tests for the media folder mutations.
 *
 * These tests verify the validators and logic patterns for media folder mutations:
 * - createMediaFolder: Name validation, path computation, hierarchy validation
 * - updateMediaFolder: Metadata updates, path propagation on rename
 * - moveMediaFolder: Circular reference prevention, depth validation
 * - deleteMediaFolder: Soft/hard delete, recursive deletion
 * - restoreMediaFolder: Restore soft-deleted folders
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api } from "../../src/component/_generated/api.js";
import {
	createMediaFolderArgs,
	updateMediaFolderArgs,
	moveFolderArgs,
	mediaFolderDoc,
	deleteMediaFolderArgs,
	restoreMediaFolderArgs,
} from "../../src/component/validators.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

// =============================================================================
// Helper Functions (matching implementation logic)
// =============================================================================

/**
 * Builds the full path for a folder based on its parent.
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
 */
function getPathDepth(path: string): number {
	if (!path || path === "/") return 0;
	return path.split("/").filter((segment) => segment.length > 0).length;
}

describe("Media Folder Mutations", () => {
	// =============================================================================
	// Argument Validator Structure Tests
	// =============================================================================

	describe("createMediaFolderArgs structure", () => {
		it("should have name as required field", () => {
			const argFields = Object.keys(createMediaFolderArgs.fields);
			expect(argFields).toContain("name");
		});

		it("should have parentId as optional field for nesting", () => {
			const argFields = Object.keys(createMediaFolderArgs.fields);
			expect(argFields).toContain("parentId");
		});

		it("should have description as optional field", () => {
			const argFields = Object.keys(createMediaFolderArgs.fields);
			expect(argFields).toContain("description");
		});

		it("should have sortOrder as optional field", () => {
			const argFields = Object.keys(createMediaFolderArgs.fields);
			expect(argFields).toContain("sortOrder");
		});

		it("should have createdBy as optional field for audit trail", () => {
			const argFields = Object.keys(createMediaFolderArgs.fields);
			expect(argFields).toContain("createdBy");
		});
	});

	describe("updateMediaFolderArgs structure", () => {
		it("should have id as required field", () => {
			const argFields = Object.keys(updateMediaFolderArgs.fields);
			expect(argFields).toContain("id");
		});

		it("should have name as optional field", () => {
			const argFields = Object.keys(updateMediaFolderArgs.fields);
			expect(argFields).toContain("name");
		});

		it("should have description as optional field", () => {
			const argFields = Object.keys(updateMediaFolderArgs.fields);
			expect(argFields).toContain("description");
		});

		it("should have sortOrder as optional field", () => {
			const argFields = Object.keys(updateMediaFolderArgs.fields);
			expect(argFields).toContain("sortOrder");
		});
	});

	describe("moveFolderArgs structure", () => {
		it("should have id as required field", () => {
			const argFields = Object.keys(moveFolderArgs.fields);
			expect(argFields).toContain("id");
		});

		it("should have newParentId as optional field", () => {
			const argFields = Object.keys(moveFolderArgs.fields);
			expect(argFields).toContain("newParentId");
		});
	});

	describe("deleteMediaFolderArgs structure", () => {
		it("should have id as required field", () => {
			const argFields = Object.keys(deleteMediaFolderArgs.fields);
			expect(argFields).toContain("id");
		});

		it("should have deletedBy as optional field for audit trail", () => {
			const argFields = Object.keys(deleteMediaFolderArgs.fields);
			expect(argFields).toContain("deletedBy");
		});

		it("should have hardDelete as optional field", () => {
			const argFields = Object.keys(deleteMediaFolderArgs.fields);
			expect(argFields).toContain("hardDelete");
		});

		it("should have recursive as optional field", () => {
			const argFields = Object.keys(deleteMediaFolderArgs.fields);
			expect(argFields).toContain("recursive");
		});
	});

	describe("restoreMediaFolderArgs structure", () => {
		it("should have id as required field", () => {
			const argFields = Object.keys(restoreMediaFolderArgs.fields);
			expect(argFields).toContain("id");
		});

		it("should have restoredBy as optional field for audit trail", () => {
			const argFields = Object.keys(restoreMediaFolderArgs.fields);
			expect(argFields).toContain("restoredBy");
		});

		it("should have recursive as optional field", () => {
			const argFields = Object.keys(restoreMediaFolderArgs.fields);
			expect(argFields).toContain("recursive");
		});
	});

	// =============================================================================
	// Response Structure Tests
	// =============================================================================

	describe("mediaFolderDoc structure", () => {
		it("should have _id field for document identification", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("_id");
		});

		it("should have _creationTime field for timestamp", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("_creationTime");
		});

		it("should have name field", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("name");
		});

		it("should have parentId field for hierarchy", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("parentId");
		});

		it("should have path field for full path", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("path");
		});

		it("should have description field", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("description");
		});

		it("should have sortOrder field", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("sortOrder");
		});

		it("should have deletedAt field for soft delete", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("deletedAt");
		});

		it("should have createdBy field for audit trail", () => {
			const docFields = Object.keys(mediaFolderDoc.fields);
			expect(docFields).toContain("createdBy");
		});
	});

	// =============================================================================
	// Path Computation Logic Tests
	// =============================================================================

	describe("path computation logic", () => {
		it("should create root-level path for folders without parent", () => {
			const path = buildFolderPath("Images", "");
			expect(path).toBe("/Images");
		});

		it("should create nested path for folders with parent", () => {
			const path = buildFolderPath("Blog", "/Images");
			expect(path).toBe("/Images/Blog");
		});

		it("should handle deeply nested paths", () => {
			const path = buildFolderPath("2026", "/Images/Blog");
			expect(path).toBe("/Images/Blog/2026");
		});

		it("should trim folder names", () => {
			const path = buildFolderPath("  Blog  ", "/Images");
			expect(path).toBe("/Images/Blog");
		});

		it("should handle root parent path correctly", () => {
			const path = buildFolderPath("Test", "/");
			expect(path).toBe("/Test");
		});
	});

	describe("path depth calculation", () => {
		it("should return 0 for empty path", () => {
			expect(getPathDepth("")).toBe(0);
		});

		it("should return 0 for root path", () => {
			expect(getPathDepth("/")).toBe(0);
		});

		it("should return 1 for single-level path", () => {
			expect(getPathDepth("/Images")).toBe(1);
		});

		it("should return 2 for two-level path", () => {
			expect(getPathDepth("/Images/Blog")).toBe(2);
		});

		it("should return correct depth for deep paths", () => {
			expect(getPathDepth("/Images/Blog/2026/January")).toBe(4);
		});
	});

	// =============================================================================
	// Mutation Integration Tests (using convex-test)
	// =============================================================================

	describe("createMediaFolder mutation", () => {
		it("should create a root folder successfully", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
					description: "All image assets",
					createdBy: "user-123",
				},
			);

			expect(folder).toBeDefined();
			expect(folder.name).toBe("Images");
			expect(folder.path).toBe("/Images");
			expect(folder.parentId).toBeUndefined();
			expect(folder.description).toBe("All image assets");
			expect(folder.createdBy).toBe("user-123");
			expect(folder.deletedAt).toBeUndefined();
		});

		it("should create a nested folder successfully", async () => {
			const t = convexTest(schema, modules);

			// Create parent folder
			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			// Create nested folder
			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent._id,
					description: "Blog images",
				},
			);

			expect(child.name).toBe("Blog");
			expect(child.path).toBe("/Images/Blog");
			expect(child.parentId).toBe(parent._id);
		});

		it("should create deeply nested folders", async () => {
			const t = convexTest(schema, modules);

			const level1 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const level2 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: level1._id,
				},
			);

			const level3 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "2026",
					parentId: level2._id,
				},
			);

			expect(level3.path).toBe("/Images/Blog/2026");
		});

		it("should trim folder names", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "  Images  ",
				},
			);

			expect(folder.name).toBe("Images");
			expect(folder.path).toBe("/Images");
		});

		it("should reject empty folder names", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "",
				}),
			).rejects.toThrow(/MEDIA_FOLDER_NAME_INVALID.*cannot be empty/);
		});

		it("should reject whitespace-only folder names", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "   ",
				}),
			).rejects.toThrow(/MEDIA_FOLDER_NAME_INVALID.*cannot be empty/);
		});

		it("should reject folder names with invalid characters", async () => {
			const t = convexTest(schema, modules);

			const invalidNames = [
				"Images/Blog",
				"Images\\Blog",
				"Images:Blog",
				"Images*Blog",
				"Images?Blog",
				'Images"Blog',
				"Images<Blog",
				"Images>Blog",
				"Images|Blog",
			];

			for (const name of invalidNames) {
				await expect(
					t.mutation(api.mediaFolderMutations.createMediaFolder, { name }),
				).rejects.toThrow("invalid characters");
			}
		});

		it("should reject non-existent parent folder", async () => {
			const t = convexTest(schema, modules);

			// Create a folder to get a valid ID format, then delete it
			const tempFolder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Temp",
				},
			);

			// Delete it via direct DB access
			await t.run(async (ctx) => {
				await ctx.db.delete(tempFolder._id);
			});

			await expect(
				t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Child",
					parentId: tempFolder._id,
				}),
			).rejects.toThrow(/MEDIA_FOLDER_NOT_FOUND.*does not exist/);
		});

		it("should reject deleted parent folder", async () => {
			const t = convexTest(schema, modules);

			// Create a folder and soft-delete it
			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "DeletedParent",
				},
			);

			await t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
				id: parent._id,
			});

			await expect(
				t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Child",
					parentId: parent._id,
				}),
			).rejects.toThrow(/MEDIA_FOLDER_DELETED.*has been deleted/);
		});

		it("should reject duplicate folder names in same parent", async () => {
			const t = convexTest(schema, modules);

			await t.mutation(api.mediaFolderMutations.createMediaFolder, {
				name: "Images",
			});

			await expect(
				t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Images",
				}),
			).rejects.toThrow("already exists at this location");
		});

		it("should allow same name in different parents", async () => {
			const t = convexTest(schema, modules);

			const parent1 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const parent2 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Documents",
				},
			);

			// Same name "Blog" in different parents should work
			const child1 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent1._id,
				},
			);

			const child2 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent2._id,
				},
			);

			expect(child1.path).toBe("/Images/Blog");
			expect(child2.path).toBe("/Documents/Blog");
		});
	});

	describe("updateMediaFolder mutation", () => {
		it("should update folder description", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const updated = await t.mutation(
				api.mediaFolderMutations.updateMediaFolder,
				{
					id: folder._id,
					description: "Updated description",
				},
			);

			expect(updated.description).toBe("Updated description");
			expect(updated.name).toBe("Images"); // Unchanged
			expect(updated.path).toBe("/Images"); // Unchanged
		});

		it("should update folder name and path", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const updated = await t.mutation(
				api.mediaFolderMutations.updateMediaFolder,
				{
					id: folder._id,
					name: "Photos",
				},
			);

			expect(updated.name).toBe("Photos");
			expect(updated.path).toBe("/Photos");
		});

		it("should update descendant paths when renaming", async () => {
			const t = convexTest(schema, modules);

			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent._id,
				},
			);

			// Rename parent
			await t.mutation(api.mediaFolderMutations.updateMediaFolder, {
				id: parent._id,
				name: "Photos",
			});

			// Check child's path is updated
			const updatedChild = await t.query(
				api.mediaFolderMutations.getMediaFolder,
				{
					id: child._id,
				},
			);

			expect(updatedChild?.path).toBe("/Photos/Blog");
		});

		it("should reject updating non-existent folder", async () => {
			const t = convexTest(schema, modules);

			const tempFolder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Temp",
				},
			);

			await t.run(async (ctx) => {
				await ctx.db.delete(tempFolder._id);
			});

			await expect(
				t.mutation(api.mediaFolderMutations.updateMediaFolder, {
					id: tempFolder._id,
					name: "New Name",
				}),
			).rejects.toThrow(/MEDIA_FOLDER_NOT_FOUND.*does not exist/);
		});

		it("should reject updating deleted folder", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			await t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
				id: folder._id,
			});

			await expect(
				t.mutation(api.mediaFolderMutations.updateMediaFolder, {
					id: folder._id,
					name: "New Name",
				}),
			).rejects.toThrow(/MEDIA_FOLDER_DELETED.*has been deleted/);
		});
	});

	describe("moveMediaFolder mutation", () => {
		it("should move folder to different parent", async () => {
			const t = convexTest(schema, modules);

			const parent1 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const parent2 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Documents",
				},
			);

			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent1._id,
				},
			);

			const moved = await t.mutation(api.mediaFolderMutations.moveMediaFolder, {
				id: child._id,
				newParentId: parent2._id,
			});

			expect(moved.parentId).toBe(parent2._id);
			expect(moved.path).toBe("/Documents/Blog");
		});

		it("should move folder to root level", async () => {
			const t = convexTest(schema, modules);

			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent._id,
				},
			);

			const moved = await t.mutation(api.mediaFolderMutations.moveMediaFolder, {
				id: child._id,
				newParentId: undefined,
			});

			expect(moved.parentId).toBeUndefined();
			expect(moved.path).toBe("/Blog");
		});

		it("should update descendant paths when moving", async () => {
			const t = convexTest(schema, modules);

			const parent1 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const parent2 = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Documents",
				},
			);

			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent1._id,
				},
			);

			const grandchild = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "2026",
					parentId: child._id,
				},
			);

			// Move child to different parent
			await t.mutation(api.mediaFolderMutations.moveMediaFolder, {
				id: child._id,
				newParentId: parent2._id,
			});

			// Check grandchild's path is updated
			const updatedGrandchild = await t.query(
				api.mediaFolderMutations.getMediaFolder,
				{
					id: grandchild._id,
				},
			);

			expect(updatedGrandchild?.path).toBe("/Documents/Blog/2026");
		});

		it("should reject moving folder into itself", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			await expect(
				t.mutation(api.mediaFolderMutations.moveMediaFolder, {
					id: folder._id,
					newParentId: folder._id,
				}),
			).rejects.toThrow(/MEDIA_FOLDER_CIRCULAR_MOVE.*circular reference/);
		});

		it("should reject moving folder into its descendant", async () => {
			const t = convexTest(schema, modules);

			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent._id,
				},
			);

			await expect(
				t.mutation(api.mediaFolderMutations.moveMediaFolder, {
					id: parent._id,
					newParentId: child._id,
				}),
			).rejects.toThrow(/MEDIA_FOLDER_CIRCULAR_MOVE.*circular reference/);
		});

		it("should return unchanged folder if moving to same parent", async () => {
			const t = convexTest(schema, modules);

			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent._id,
				},
			);

			const moved = await t.mutation(api.mediaFolderMutations.moveMediaFolder, {
				id: child._id,
				newParentId: parent._id,
			});

			expect(moved._id).toBe(child._id);
			expect(moved.path).toBe("/Images/Blog");
		});
	});

	describe("deleteMediaFolder mutation", () => {
		it("should soft delete an empty folder", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const deleted = await t.mutation(
				api.mediaFolderMutations.deleteMediaFolder,
				{
					id: folder._id,
					deletedBy: "user-123",
				},
			);

			expect(deleted.deletedAt).toBeDefined();
			expect(deleted.deletedAt).toBeGreaterThan(0);
		});

		it("should not delete folder with subfolders by default", async () => {
			const t = convexTest(schema, modules);

			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			await t.mutation(api.mediaFolderMutations.createMediaFolder, {
				name: "Blog",
				parentId: parent._id,
			});

			await expect(
				t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
					id: parent._id,
				}),
			).rejects.toThrow(/MEDIA_FOLDER_HAS_CONTENTS.*subfolder/);
		});

		it("should recursively delete folder with subfolders", async () => {
			const t = convexTest(schema, modules);

			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent._id,
				},
			);

			await t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
				id: parent._id,
				recursive: true,
			});

			// Both should be soft-deleted
			const parentCheck = await t.query(
				api.mediaFolderMutations.getMediaFolder,
				{
					id: parent._id,
					includeDeleted: true,
				},
			);
			const childCheck = await t.query(
				api.mediaFolderMutations.getMediaFolder,
				{
					id: child._id,
					includeDeleted: true,
				},
			);

			expect(parentCheck?.deletedAt).toBeDefined();
			expect(childCheck?.deletedAt).toBeDefined();
		});

		it("should reject deleting already deleted folder", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			await t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
				id: folder._id,
			});

			await expect(
				t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
					id: folder._id,
				}),
			).rejects.toThrow(/MEDIA_FOLDER_DELETED.*has been deleted/);
		});
	});

	describe("restoreMediaFolder mutation", () => {
		it("should restore a soft-deleted folder", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			await t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
				id: folder._id,
			});

			const restored = await t.mutation(
				api.mediaFolderMutations.restoreMediaFolder,
				{
					id: folder._id,
					restoredBy: "user-123",
				},
			);

			expect(restored.deletedAt).toBeUndefined();
		});

		it("should reject restoring non-deleted folder", async () => {
			const t = convexTest(schema, modules);

			const folder = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			await expect(
				t.mutation(api.mediaFolderMutations.restoreMediaFolder, {
					id: folder._id,
				}),
			).rejects.toThrow(/MEDIA_FOLDER_NOT_DELETED.*is not deleted/);
		});

		it("should reject restoring when parent is still deleted", async () => {
			const t = convexTest(schema, modules);

			const parent = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Images",
				},
			);

			const child = await t.mutation(
				api.mediaFolderMutations.createMediaFolder,
				{
					name: "Blog",
					parentId: parent._id,
				},
			);

			// Delete both (recursive)
			await t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
				id: parent._id,
				recursive: true,
			});

			// Try to restore child without restoring parent first
			await expect(
				t.mutation(api.mediaFolderMutations.restoreMediaFolder, {
					id: child._id,
				}),
			).rejects.toThrow(
				/MEDIA_FOLDER_PARENT_DELETED.*parent folder.*still deleted/,
			);
		});
	});

	describe("query functions", () => {
		describe("getMediaFolder", () => {
			it("should return folder by ID", async () => {
				const t = convexTest(schema, modules);

				const folder = await t.mutation(
					api.mediaFolderMutations.createMediaFolder,
					{
						name: "Images",
					},
				);

				const result = await t.query(api.mediaFolderMutations.getMediaFolder, {
					id: folder._id,
				});

				expect(result).toBeDefined();
				expect(result?.name).toBe("Images");
			});

			it("should return null for soft-deleted folder by default", async () => {
				const t = convexTest(schema, modules);

				const folder = await t.mutation(
					api.mediaFolderMutations.createMediaFolder,
					{
						name: "Images",
					},
				);

				await t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
					id: folder._id,
				});

				const result = await t.query(api.mediaFolderMutations.getMediaFolder, {
					id: folder._id,
				});

				expect(result).toBeNull();
			});

			it("should return soft-deleted folder when includeDeleted is true", async () => {
				const t = convexTest(schema, modules);

				const folder = await t.mutation(
					api.mediaFolderMutations.createMediaFolder,
					{
						name: "Images",
					},
				);

				await t.mutation(api.mediaFolderMutations.deleteMediaFolder, {
					id: folder._id,
				});

				const result = await t.query(api.mediaFolderMutations.getMediaFolder, {
					id: folder._id,
					includeDeleted: true,
				});

				expect(result).toBeDefined();
				expect(result?.deletedAt).toBeDefined();
			});
		});

		describe("listMediaFolders", () => {
			it("should list root folders", async () => {
				const t = convexTest(schema, modules);

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Images",
				});

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Documents",
				});

				const folders = await t.query(
					api.mediaFolderMutations.listMediaFolders,
					{},
				);

				expect(folders.length).toBe(2);
			});

			it("should list child folders", async () => {
				const t = convexTest(schema, modules);

				const parent = await t.mutation(
					api.mediaFolderMutations.createMediaFolder,
					{
						name: "Images",
					},
				);

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Blog",
					parentId: parent._id,
				});

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Products",
					parentId: parent._id,
				});

				const folders = await t.query(
					api.mediaFolderMutations.listMediaFolders,
					{
						parentId: parent._id,
					},
				);

				expect(folders.length).toBe(2);
			});

			it("should sort by sortOrder then name", async () => {
				const t = convexTest(schema, modules);

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Zebra",
					sortOrder: 2,
				});

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Apple",
					sortOrder: 1,
				});

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Banana", // No sortOrder - should come after sorted items
				});

				const folders = await t.query(
					api.mediaFolderMutations.listMediaFolders,
					{},
				);

				expect(folders[0].name).toBe("Apple");
				expect(folders[1].name).toBe("Zebra");
				expect(folders[2].name).toBe("Banana");
			});
		});

		describe("getMediaFolderByPath", () => {
			it("should find folder by path", async () => {
				const t = convexTest(schema, modules);

				const parent = await t.mutation(
					api.mediaFolderMutations.createMediaFolder,
					{
						name: "Images",
					},
				);

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Blog",
					parentId: parent._id,
				});

				const result = await t.query(
					api.mediaFolderMutations.getMediaFolderByPath,
					{
						path: "/Images/Blog",
					},
				);

				expect(result).toBeDefined();
				expect(result?.name).toBe("Blog");
			});

			it("should return null for non-existent path", async () => {
				const t = convexTest(schema, modules);

				const result = await t.query(
					api.mediaFolderMutations.getMediaFolderByPath,
					{
						path: "/NonExistent/Path",
					},
				);

				expect(result).toBeNull();
			});
		});

		describe("getFolderTree", () => {
			it("should return all folders sorted by path", async () => {
				const t = convexTest(schema, modules);

				const images = await t.mutation(
					api.mediaFolderMutations.createMediaFolder,
					{
						name: "Images",
					},
				);

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Documents",
				});

				await t.mutation(api.mediaFolderMutations.createMediaFolder, {
					name: "Blog",
					parentId: images._id,
				});

				const tree = await t.query(api.mediaFolderMutations.getFolderTree, {});

				expect(tree.length).toBe(3);
				// Should be sorted: /Documents, /Images, /Images/Blog
				expect(tree[0].path).toBe("/Documents");
				expect(tree[1].path).toBe("/Images");
				expect(tree[2].path).toBe("/Images/Blog");
			});
		});
	});
});
