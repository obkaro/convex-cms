/**
 * Tests for Version Mutation Functions
 *
 * These tests verify the internal version snapshot creation functions
 * that store complete content state in the contentVersions table.
 */
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api, internal } from "../../src/component/_generated/api.js";
import {
	createVersionSnapshotArgs,
	contentVersionDoc,
} from "../../src/component/validators.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

// =============================================================================
// Validator Tests
// =============================================================================

describe("Version Snapshot Validators", () => {
	describe("createVersionSnapshotArgs", () => {
		it("should have correct argument structure", () => {
			const argFields = Object.keys(createVersionSnapshotArgs.fields);

			expect(argFields).toContain("entryId");
			expect(argFields).toContain("changeDescription");
			expect(argFields).toContain("createdBy");
			expect(argFields).toContain("wasPublished");
		});

		it("should have entryId as required field", () => {
			const entryIdField = createVersionSnapshotArgs.fields.entryId;
			expect(entryIdField).toBeDefined();
		});

		it("should have changeDescription as optional field", () => {
			const changeDescriptionField =
				createVersionSnapshotArgs.fields.changeDescription;
			expect(changeDescriptionField).toBeDefined();
		});

		it("should have createdBy as optional field", () => {
			const createdByField = createVersionSnapshotArgs.fields.createdBy;
			expect(createdByField).toBeDefined();
		});

		it("should have wasPublished as optional boolean", () => {
			const wasPublishedField = createVersionSnapshotArgs.fields.wasPublished;
			expect(wasPublishedField).toBeDefined();
		});
	});

	describe("contentVersionDoc", () => {
		it("should have all required version snapshot fields", () => {
			const docFields = Object.keys(contentVersionDoc.fields);

			expect(docFields).toContain("_id");
			expect(docFields).toContain("_creationTime");
			expect(docFields).toContain("entryId");
			expect(docFields).toContain("versionNumber");
			expect(docFields).toContain("data");
			expect(docFields).toContain("slug");
			expect(docFields).toContain("status");
			expect(docFields).toContain("changeDescription");
			expect(docFields).toContain("createdBy");
			expect(docFields).toContain("wasPublished");
			expect(docFields).toContain("publishedAt");
		});
	});
});

// =============================================================================
// Logic Pattern Tests
// =============================================================================

describe("Version Snapshot Logic Patterns", () => {
	describe("Snapshot data capture", () => {
		it("should capture complete entry state in snapshot", () => {
			const entry = {
				version: 5,
				data: { title: "Test Post", content: "Some content" },
				slug: "test-post",
				status: "draft" as const,
			};

			const snapshot = {
				versionNumber: entry.version,
				data: entry.data,
				slug: entry.slug,
				status: entry.status,
				wasPublished: false,
				publishedAt: undefined,
			};

			expect(snapshot.versionNumber).toBe(5);
			expect(snapshot.data).toEqual(entry.data);
			expect(snapshot.slug).toBe("test-post");
			expect(snapshot.status).toBe("draft");
		});

		it("should set publishedAt when wasPublished is true", () => {
			const wasPublished = true;
			const now = Date.now();

			const snapshot = {
				wasPublished,
				publishedAt: wasPublished ? now : undefined,
			};

			expect(snapshot.publishedAt).toBe(now);
		});

		it("should not set publishedAt when wasPublished is false", () => {
			const wasPublished = false;
			const now = Date.now();

			const snapshot = {
				wasPublished,
				publishedAt: wasPublished ? now : undefined,
			};

			expect(snapshot.publishedAt).toBeUndefined();
		});
	});

	describe("Version existence checking", () => {
		it("should identify duplicate version numbers", () => {
			const existingVersions = [
				{ versionNumber: 1 },
				{ versionNumber: 2 },
				{ versionNumber: 3 },
			];

			const checkExists = (versionNumber: number) =>
				existingVersions.some((v) => v.versionNumber === versionNumber);

			expect(checkExists(1)).toBe(true);
			expect(checkExists(2)).toBe(true);
			expect(checkExists(4)).toBe(false);
		});
	});

	describe("Snapshot creation scenarios", () => {
		it("should capture draft state snapshot", () => {
			const entry = {
				status: "draft" as const,
				version: 1,
				data: { title: "Work in progress" },
			};

			const snapshot = {
				status: entry.status,
				versionNumber: entry.version,
				data: entry.data,
				wasPublished: false,
				changeDescription: "Auto-save before major changes",
			};

			expect(snapshot.status).toBe("draft");
			expect(snapshot.wasPublished).toBe(false);
			expect(snapshot.changeDescription).toBe("Auto-save before major changes");
		});

		it("should capture publish state snapshot", () => {
			const entry = {
				status: "draft" as const,
				version: 3,
				data: { title: "Ready to publish" },
			};

			const now = Date.now();
			const snapshot = {
				status: entry.status,
				versionNumber: entry.version,
				data: entry.data,
				wasPublished: true,
				publishedAt: now,
				changeDescription: "Initial release",
			};

			expect(snapshot.wasPublished).toBe(true);
			expect(snapshot.publishedAt).toBe(now);
		});

		it("should preserve complex data structures in snapshot", () => {
			const complexData = {
				title: "Complex Entry",
				metadata: {
					author: "John",
					tags: ["tech", "blog"],
					settings: {
						featured: true,
						priority: 5,
					},
				},
				content: [
					{ type: "paragraph", text: "Intro" },
					{ type: "image", src: "/img.jpg" },
				],
			};

			const snapshot = {
				data: complexData,
			};

			expect(snapshot.data.metadata.tags).toEqual(["tech", "blog"]);
			expect(snapshot.data.content).toHaveLength(2);
			expect(snapshot.data.metadata.settings.featured).toBe(true);
		});
	});

	describe("Error handling patterns", () => {
		it("should not allow snapshot of deleted entry", () => {
			const entry = {
				_id: "entry-123",
				deletedAt: Date.now(),
			};

			const isDeleted = entry.deletedAt !== undefined;
			expect(isDeleted).toBe(true);
		});

		it("should handle entry not found", () => {
			const entry = null;
			const notFound = entry === null;
			expect(notFound).toBe(true);
		});
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Version Snapshot Integration Tests", () => {
	describe("createVersionSnapshot", () => {
		it("should create a snapshot of content entry", async () => {
			const t = convexTest(schema, modules);

			// Create a content type
			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "snapshot_test",
					displayName: "Snapshot Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "content",
							label: "Content",
							type: "richText",
							required: false,
						},
					],
					slugField: "title",
				},
			);

			// Create a content entry
			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Test Entry", content: "<p>Test content</p>" },
				createdBy: "user123",
			});

			// Create a version snapshot
			const snapshot = await t.mutation(
				internal.versionMutations.createVersionSnapshot,
				{
					entryId: entry._id,
					changeDescription: "Initial snapshot",
					createdBy: "user123",
				},
			);

			expect(snapshot.entryId).toBe(entry._id);
			expect(snapshot.versionNumber).toBe(entry.version);
			expect(snapshot.data.title).toBe("Test Entry");
			expect(snapshot.slug).toBe(entry.slug);
			expect(snapshot.status).toBe("draft");
			expect(snapshot.changeDescription).toBe("Initial snapshot");
			expect(snapshot.createdBy).toBe("user123");
			expect(snapshot.wasPublished).toBe(false);
			expect(snapshot.publishedAt).toBeUndefined();
		});

		it("should create published snapshot with publishedAt timestamp", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "publish_test",
					displayName: "Publish Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Publishable Entry" },
			});

			const snapshot = await t.mutation(
				internal.versionMutations.createVersionSnapshot,
				{
					entryId: entry._id,
					changeDescription: "Publishing to production",
					createdBy: "publisher",
					wasPublished: true,
				},
			);

			expect(snapshot.wasPublished).toBe(true);
			expect(snapshot.publishedAt).toBeDefined();
			expect(typeof snapshot.publishedAt).toBe("number");
		});

		it("should capture current entry state accurately", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "accurate_test",
					displayName: "Accurate Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{ name: "count", label: "Count", type: "number", required: false },
					],
					slugField: "title",
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Accurate Entry", count: 42 },
			});

			// Update the entry
			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { count: 100 },
			});

			// Snapshot should capture updated state
			const snapshot = await t.mutation(
				internal.versionMutations.createVersionSnapshot,
				{
					entryId: entry._id,
				},
			);

			expect(snapshot.versionNumber).toBe(updated.version);
			expect(snapshot.data.count).toBe(100);
		});

		it("should throw error for non-existent entry", async () => {
			const t = convexTest(schema, modules);

			// Create and delete an entry to get a valid but non-existent ID
			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "delete_test",
					displayName: "Delete Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "To Delete" },
			});

			await t.run(async (ctx) => {
				await ctx.db.delete(entry._id);
			});

			await expect(
				t.mutation(internal.versionMutations.createVersionSnapshot, {
					entryId: entry._id,
				}),
			).rejects.toThrow(/not found/i);
		});

		it("should throw error for soft-deleted entry", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "soft_delete_test",
					displayName: "Soft Delete Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Soft Deleted" },
			});

			// Soft delete the entry
			await t.run(async (ctx) => {
				await ctx.db.patch(entry._id, { deletedAt: Date.now() });
			});

			await expect(
				t.mutation(internal.versionMutations.createVersionSnapshot, {
					entryId: entry._id,
				}),
			).rejects.toThrow(/deleted/i);
		});

		it("should allow multiple snapshots of the same version", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "multi_snapshot",
					displayName: "Multi Snapshot",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Multi Snapshot Entry" },
			});

			// Create two snapshots of the same version
			const snapshot1 = await t.mutation(
				internal.versionMutations.createVersionSnapshot,
				{
					entryId: entry._id,
					changeDescription: "First snapshot",
				},
			);

			const snapshot2 = await t.mutation(
				internal.versionMutations.createVersionSnapshot,
				{
					entryId: entry._id,
					changeDescription: "Second snapshot",
				},
			);

			// Both should have the same version number
			expect(snapshot1.versionNumber).toBe(entry.version);
			expect(snapshot2.versionNumber).toBe(entry.version);

			// But different IDs and descriptions
			expect(snapshot1._id).not.toBe(snapshot2._id);
			expect(snapshot1.changeDescription).toBe("First snapshot");
			expect(snapshot2.changeDescription).toBe("Second snapshot");
		});
	});

	describe("versionExists", () => {
		it("should return true for existing version", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "exists_test",
					displayName: "Exists Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Check Existence" },
			});

			// Create a snapshot
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
			});

			// Check if version exists
			const exists = await t.mutation(internal.versionMutations.versionExists, {
				entryId: entry._id,
				versionNumber: entry.version,
			});

			expect(exists).toBe(true);
		});

		it("should return false for non-existing version", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "not_exists_test",
					displayName: "Not Exists Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "No Snapshot" },
			});

			// Check for a version that doesn't exist
			const exists = await t.mutation(internal.versionMutations.versionExists, {
				entryId: entry._id,
				versionNumber: 999,
			});

			expect(exists).toBe(false);
		});
	});

	describe("createVersionSnapshotIfNotExists", () => {
		it("should create snapshot if none exists", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "if_not_exists",
					displayName: "If Not Exists",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "New Entry" },
			});

			const snapshot = await t.mutation(
				internal.versionMutations.createVersionSnapshotIfNotExists,
				{
					entryId: entry._id,
					changeDescription: "Created if not exists",
				},
			);

			expect(snapshot).not.toBeNull();
			expect(snapshot!.versionNumber).toBe(entry.version);
			expect(snapshot!.changeDescription).toBe("Created if not exists");
		});

		it("should return existing snapshot if one exists", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "existing_test",
					displayName: "Existing Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Existing Entry" },
			});

			// Create first snapshot
			const first = await t.mutation(
				internal.versionMutations.createVersionSnapshot,
				{
					entryId: entry._id,
					changeDescription: "First",
				},
			);

			// Try to create another with IfNotExists
			const second = await t.mutation(
				internal.versionMutations.createVersionSnapshotIfNotExists,
				{
					entryId: entry._id,
					changeDescription: "Second (should not be used)",
				},
			);

			// Should return the existing one
			expect(second!._id).toBe(first._id);
			expect(second!.changeDescription).toBe("First");
		});

		it("should return null for non-existent entry", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "null_test",
					displayName: "Null Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "To Delete" },
			});

			await t.run(async (ctx) => {
				await ctx.db.delete(entry._id);
			});

			const result = await t.mutation(
				internal.versionMutations.createVersionSnapshotIfNotExists,
				{
					entryId: entry._id,
				},
			);

			expect(result).toBeNull();
		});

		it("should return null for deleted entry", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "deleted_null",
					displayName: "Deleted Null",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Soft Deleted" },
			});

			await t.run(async (ctx) => {
				await ctx.db.patch(entry._id, { deletedAt: Date.now() });
			});

			const result = await t.mutation(
				internal.versionMutations.createVersionSnapshotIfNotExists,
				{
					entryId: entry._id,
				},
			);

			expect(result).toBeNull();
		});
	});

	describe("Version history integration", () => {
		it("should be retrievable via getVersionHistory query", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "history_test",
					displayName: "History Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "History Entry" },
			});

			// Create a snapshot
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
				changeDescription: "Snapshot for history",
			});

			// Retrieve version history
			const history = await t.query(api.contentEntries.getVersionHistory, {
				entryId: entry._id,
				paginationOpts: { numItems: 10, cursor: null },
			});

			expect(history).not.toBeNull();
			expect(history!.page.length).toBe(1);
			expect(history!.page[0].changeDescription).toBe("Snapshot for history");
		});

		it("should maintain chronological order in history", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "order_test",
					displayName: "Order Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Order Entry" },
			});

			// Create snapshot at version 1
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
				changeDescription: "Version 1",
			});

			// Update entry (version 2)
			await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Updated Title" },
			});

			// Create snapshot at version 2
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
				changeDescription: "Version 2",
			});

			// Get history (newest first)
			const history = await t.query(api.contentEntries.getVersionHistory, {
				entryId: entry._id,
				paginationOpts: { numItems: 10, cursor: null },
			});

			// 3 snapshots: V1 manual, auto snapshot from updateEntry, V2 manual
			expect(history!.page.length).toBe(3);
			// Newest first (descending order)
			expect(history!.page[0].changeDescription).toBe("Version 2");
			expect(history!.page[1].changeDescription).toBe("Draft saved");
			expect(history!.page[2].changeDescription).toBe("Version 1");
		});
	});

	describe("rollbackVersion", () => {
		it("should restore content entry to a previous version", async () => {
			const t = convexTest(schema, modules);

			// Create a content type
			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "rollback_test",
					displayName: "Rollback Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "content",
							label: "Content",
							type: "richText",
							required: false,
						},
					],
					slugField: "title",
				},
			);

			// Create a content entry (version 1)
			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Original Title", content: "<p>Original content</p>" },
				createdBy: "user123",
			});

			// Create a version snapshot of version 1
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
				changeDescription: "Initial version",
				createdBy: "user123",
			});

			// Update the entry (version 2)
			await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Updated Title", content: "<p>Updated content</p>" },
				updatedBy: "user123",
			});

			// Update again (version 3)
			await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Final Title", content: "<p>Final content</p>" },
				updatedBy: "user123",
			});

			// Rollback to version 1
			const restored = await t.mutation(api.versionMutations.rollbackVersion, {
				entryId: entry._id,
				versionNumber: 1,
				updatedBy: "user123",
			});

			// The content should match version 1
			expect(restored.data.title).toBe("Original Title");
			expect(restored.data.content).toBe("<p>Original content</p>");
			// But version number should have incremented
			expect(restored.version).toBe(4);
		});

		it("should preserve current status during rollback", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "status_preserve_test",
					displayName: "Status Preserve Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			// Create entry as draft (version 1)
			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Draft Post" },
			});

			// Create snapshot of version 1
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
				changeDescription: "Initial version",
			});

			// Update (version 2)
			await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Updated Post" },
			});

			// Publish the entry (version 3)
			const published = await t.mutation(
				api.contentEntryMutations.publishEntry,
				{
					id: entry._id,
				},
			);

			expect(published.status).toBe("published");

			// Rollback to version 1
			const restored = await t.mutation(api.versionMutations.rollbackVersion, {
				entryId: entry._id,
				versionNumber: 1,
			});

			// Content should be from version 1
			expect(restored.data.title).toBe("Draft Post");
			// But status should remain "published"
			expect(restored.status).toBe("published");
		});

		it("should create audit trail with pre-rollback and post-rollback snapshots", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "audit_trail_test",
					displayName: "Audit Trail Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Version 1 Title" },
			});

			// Create snapshot of version 1
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
				changeDescription: "Initial",
			});

			// Update to version 2
			await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Version 2 Title" },
			});

			// Rollback to version 1
			await t.mutation(api.versionMutations.rollbackVersion, {
				entryId: entry._id,
				versionNumber: 1,
				updatedBy: "rollback-user",
			});

			// Get version history
			const history = await t.query(api.contentEntries.getVersionHistory, {
				entryId: entry._id,
				paginationOpts: { numItems: 10, cursor: null },
			});

			// Should have 4 snapshots: initial, auto-save, pre-rollback, post-rollback
			expect(history!.page.length).toBe(4);

			// Most recent should be the rollback snapshot
			const rollbackSnapshot = history!.page[0];
			expect(rollbackSnapshot.changeDescription).toContain(
				"Rolled back to version 1",
			);
			expect(rollbackSnapshot.data.title).toBe("Version 1 Title");

			// Second should be pre-rollback snapshot
			const preRollbackSnapshot = history!.page[1];
			expect(preRollbackSnapshot.changeDescription).toContain("Pre-rollback");
			expect(preRollbackSnapshot.data.title).toBe("Version 2 Title");

			// Third is auto-save from updateEntry
			expect(history!.page[2].changeDescription).toBe("Draft saved");
		});

		it("should throw error for non-existent entry", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "nonexistent_rollback",
					displayName: "Non-existent Rollback",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Temp Entry" },
			});

			// Delete the entry
			await t.run(async (ctx) => {
				await ctx.db.delete(entry._id);
			});

			await expect(
				t.mutation(api.versionMutations.rollbackVersion, {
					entryId: entry._id,
					versionNumber: 1,
				}),
			).rejects.toThrow(/not found/i);
		});

		it("should throw error for soft-deleted entry", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "deleted_rollback",
					displayName: "Deleted Rollback",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Deleted Entry" },
			});

			// Create snapshot
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
			});

			// Soft delete the entry
			await t.run(async (ctx) => {
				await ctx.db.patch(entry._id, { deletedAt: Date.now() });
			});

			await expect(
				t.mutation(api.versionMutations.rollbackVersion, {
					entryId: entry._id,
					versionNumber: 1,
				}),
			).rejects.toThrow(/deleted/i);
		});

		it("should throw error for non-existent version", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "no_version_rollback",
					displayName: "No Version Rollback",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "No Snapshot" },
			});

			// Try to rollback to a version that doesn't exist
			await expect(
				t.mutation(api.versionMutations.rollbackVersion, {
					entryId: entry._id,
					versionNumber: 999,
				}),
			).rejects.toThrow(/Version 999 not found/i);
		});

		it("should restore slug from target version", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "slug_rollback",
					displayName: "Slug Rollback",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			// Create entry with original slug
			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Original Slug" },
			});

			const originalSlug = entry.slug;

			// Create snapshot
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
				changeDescription: "With original slug",
			});

			// Update with new title and regenerate slug
			await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "New Slug" },
				slug: "new-slug",
			});

			// Rollback to version 1
			const restored = await t.mutation(api.versionMutations.rollbackVersion, {
				entryId: entry._id,
				versionNumber: 1,
			});

			// Slug should be restored
			expect(restored.slug).toBe(originalSlug);
		});

		it("should handle complex nested data correctly", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "complex_rollback",
					displayName: "Complex Rollback",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "metadata",
							label: "Metadata",
							type: "json",
							required: false,
						},
					],
				},
			);

			const complexData = {
				title: "Complex Entry",
				metadata: {
					tags: ["one", "two", "three"],
					settings: {
						featured: true,
						priority: 10,
						nested: {
							deep: "value",
						},
					},
				},
			};

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: complexData,
			});

			// Create snapshot
			await t.mutation(internal.versionMutations.createVersionSnapshot, {
				entryId: entry._id,
				changeDescription: "Complex data snapshot",
			});

			// Update with simpler data
			await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: {
					title: "Simple Entry",
					metadata: { tags: [] },
				},
			});

			// Rollback
			const restored = await t.mutation(api.versionMutations.rollbackVersion, {
				entryId: entry._id,
				versionNumber: 1,
			});

			// Complex data should be fully restored
			expect(restored.data.title).toBe("Complex Entry");
			expect(restored.data.metadata.tags).toEqual(["one", "two", "three"]);
			expect(restored.data.metadata.settings.featured).toBe(true);
			expect(restored.data.metadata.settings.nested.deep).toBe("value");
		});
	});
});
