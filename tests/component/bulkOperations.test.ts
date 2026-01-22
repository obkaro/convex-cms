/**
 * Tests for Bulk Operations
 *
 * These tests verify the bulk operation mutations for content entries:
 * - bulkPublish: Publish multiple entries at once
 * - bulkUnpublish: Revert multiple entries to draft
 * - bulkDelete: Delete multiple entries (soft/hard)
 * - bulkUpdate: Update multiple entries with same changes
 * - bulkRestore: Restore multiple soft-deleted entries
 */
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api } from "../../src/component/_generated/api.js";
import {
	bulkPublishArgs,
	bulkUnpublishArgs,
	bulkDeleteArgs,
	bulkUpdateArgs,
	bulkOperationResult,
	BULK_OPERATION_BATCH_SIZE,
} from "../../src/component/validators.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

// =============================================================================
// Validator Structure Tests
// =============================================================================

describe("Bulk Operation Validators", () => {
	describe("BULK_OPERATION_BATCH_SIZE", () => {
		it("should be a reasonable limit", () => {
			expect(BULK_OPERATION_BATCH_SIZE).toBe(100);
			expect(BULK_OPERATION_BATCH_SIZE).toBeGreaterThan(0);
			expect(BULK_OPERATION_BATCH_SIZE).toBeLessThanOrEqual(1000);
		});
	});

	describe("bulkPublishArgs", () => {
		it("should have correct argument structure", () => {
			const argFields = Object.keys(bulkPublishArgs.fields);

			expect(argFields).toContain("ids");
			expect(argFields).toContain("changeDescription");
			expect(argFields).toContain("updatedBy");
		});

		it("should have ids as required array field", () => {
			const idsField = bulkPublishArgs.fields.ids;
			expect(idsField).toBeDefined();
		});
	});

	describe("bulkUnpublishArgs", () => {
		it("should have correct argument structure", () => {
			const argFields = Object.keys(bulkUnpublishArgs.fields);

			expect(argFields).toContain("ids");
			expect(argFields).toContain("updatedBy");
		});
	});

	describe("bulkDeleteArgs", () => {
		it("should have correct argument structure", () => {
			const argFields = Object.keys(bulkDeleteArgs.fields);

			expect(argFields).toContain("ids");
			expect(argFields).toContain("deletedBy");
			expect(argFields).toContain("hardDelete");
		});
	});

	describe("bulkUpdateArgs", () => {
		it("should have correct argument structure", () => {
			const argFields = Object.keys(bulkUpdateArgs.fields);

			expect(argFields).toContain("ids");
			expect(argFields).toContain("data");
			expect(argFields).toContain("status");
			expect(argFields).toContain("updatedBy");
		});
	});

	describe("bulkOperationResult", () => {
		it("should have correct result structure", () => {
			const resultFields = Object.keys(bulkOperationResult.fields);

			expect(resultFields).toContain("total");
			expect(resultFields).toContain("succeeded");
			expect(resultFields).toContain("failed");
			expect(resultFields).toContain("results");
		});
	});
});

// =============================================================================
// Bulk Publish Integration Tests
// =============================================================================

describe("Bulk Publish Integration Tests", () => {
	it("should publish multiple draft entries", async () => {
		const t = convexTest(schema, modules);

		// Create a content type
		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "article",
				displayName: "Article",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		// Create multiple draft entries
		const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Article 1" },
		});

		const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Article 2" },
		});

		const entry3 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Article 3" },
		});

		// Bulk publish
		const result = await t.mutation(api.bulkOperations.bulkPublish, {
			ids: [entry1._id, entry2._id, entry3._id],
			changeDescription: "Initial bulk publish",
			updatedBy: "admin",
		});

		expect(result.total).toBe(3);
		expect(result.succeeded).toBe(3);
		expect(result.failed).toBe(0);

		// Verify all entries are published
		const published1 = await t.query(api.contentEntries.get, {
			id: entry1._id,
		});
		const published2 = await t.query(api.contentEntries.get, {
			id: entry2._id,
		});
		const published3 = await t.query(api.contentEntries.get, {
			id: entry3._id,
		});

		expect(published1?.status).toBe("published");
		expect(published2?.status).toBe("published");
		expect(published3?.status).toBe("published");

		// Verify firstPublishedAt and lastPublishedAt are set
		expect(published1?.firstPublishedAt).toBeDefined();
		expect(published1?.lastPublishedAt).toBeDefined();
	});

	it("should skip already published entries (idempotent)", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "post",
				displayName: "Post",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Already Published" },
		});

		// Publish once
		await t.mutation(api.contentEntryMutations.publishEntry, {
			id: entry._id,
		});

		// Try to bulk publish again
		const result = await t.mutation(api.bulkOperations.bulkPublish, {
			ids: [entry._id],
		});

		expect(result.total).toBe(1);
		expect(result.succeeded).toBe(1);
		expect(result.failed).toBe(0);
		expect(result.results[0].success).toBe(true);
	});

	it("should fail for deleted entries", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "deletable",
				displayName: "Deletable",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Will be deleted" },
		});

		// Soft delete
		await t.mutation(api.contentEntryMutations.deleteEntry, {
			id: entry._id,
		});

		// Try to bulk publish
		const result = await t.mutation(api.bulkOperations.bulkPublish, {
			ids: [entry._id],
		});

		expect(result.total).toBe(1);
		expect(result.succeeded).toBe(0);
		expect(result.failed).toBe(1);
		expect(result.results[0].error).toContain("deleted");
	});

	it("should fail for archived entries", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "archivable",
				displayName: "Archivable",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Archived" },
			status: "archived",
		});

		const result = await t.mutation(api.bulkOperations.bulkPublish, {
			ids: [entry._id],
		});

		expect(result.failed).toBe(1);
		expect(result.results[0].error).toContain("archived");
	});

	it("should create version snapshots for each published entry", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "versioned",
				displayName: "Versioned",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Versioned Entry" },
		});

		await t.mutation(api.bulkOperations.bulkPublish, {
			ids: [entry._id],
			changeDescription: "Publishing for version test",
		});

		// Check that version snapshot was created
		await t.run(async (ctx) => {
			const versions = await ctx.db
				.query("contentVersions")
				.withIndex("by_entry", (q) => q.eq("entryId", entry._id))
				.collect();

			expect(versions.length).toBe(1);
			expect(versions[0].wasPublished).toBe(true);
			expect(versions[0].changeDescription).toBe("Publishing for version test");
		});
	});

	it("should handle empty array gracefully", async () => {
		const t = convexTest(schema, modules);

		const result = await t.mutation(api.bulkOperations.bulkPublish, {
			ids: [],
		});

		expect(result.total).toBe(0);
		expect(result.succeeded).toBe(0);
		expect(result.failed).toBe(0);
		expect(result.results).toEqual([]);
	});

	it("should reject batch exceeding size limit", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "large_batch",
				displayName: "Large Batch",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		// Create more entries than allowed
		const ids = [];
		for (let i = 0; i < BULK_OPERATION_BATCH_SIZE + 1; i++) {
			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeId: contentType._id,
				data: { title: `Entry ${i}` },
			});
			ids.push(entry._id);
		}

		await expect(
			t.mutation(api.bulkOperations.bulkPublish, { ids }),
		).rejects.toThrow(/batch size exceeds limit/i);
	});

	it("should handle partial success (some entries succeed, some fail)", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "mixed",
				displayName: "Mixed",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		// Create one valid entry
		const validEntry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Valid" },
		});

		// Create and delete another entry
		const deletedEntry = await t.mutation(
			api.contentEntryMutations.createEntry,
			{
				contentTypeId: contentType._id,
				data: { title: "Deleted" },
			},
		);
		await t.mutation(api.contentEntryMutations.deleteEntry, {
			id: deletedEntry._id,
		});

		const result = await t.mutation(api.bulkOperations.bulkPublish, {
			ids: [validEntry._id, deletedEntry._id],
		});

		expect(result.total).toBe(2);
		expect(result.succeeded).toBe(1);
		expect(result.failed).toBe(1);
	});
});

// =============================================================================
// Bulk Unpublish Integration Tests
// =============================================================================

describe("Bulk Unpublish Integration Tests", () => {
	it("should unpublish multiple published entries", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "unpublishable",
				displayName: "Unpublishable",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		// Create and publish entries
		const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 1" },
		});
		await t.mutation(api.contentEntryMutations.publishEntry, {
			id: entry1._id,
		});

		const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 2" },
		});
		await t.mutation(api.contentEntryMutations.publishEntry, {
			id: entry2._id,
		});

		// Bulk unpublish
		const result = await t.mutation(api.bulkOperations.bulkUnpublish, {
			ids: [entry1._id, entry2._id],
			updatedBy: "admin",
		});

		expect(result.total).toBe(2);
		expect(result.succeeded).toBe(2);
		expect(result.failed).toBe(0);

		// Verify entries are draft
		const unpublished1 = await t.query(api.contentEntries.get, {
			id: entry1._id,
		});
		const unpublished2 = await t.query(api.contentEntries.get, {
			id: entry2._id,
		});

		expect(unpublished1?.status).toBe("draft");
		expect(unpublished2?.status).toBe("draft");
	});

	it("should skip already draft entries (idempotent)", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "draft_entry",
				displayName: "Draft Entry",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Already Draft" },
		});

		const result = await t.mutation(api.bulkOperations.bulkUnpublish, {
			ids: [entry._id],
		});

		expect(result.succeeded).toBe(1);
		expect(result.results[0].success).toBe(true);
	});

	it("should preserve publication timestamps after unpublish", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "timestamp_test",
				displayName: "Timestamp Test",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Timestamp Entry" },
		});

		await t.mutation(api.contentEntryMutations.publishEntry, { id: entry._id });

		const published = await t.query(api.contentEntries.get, { id: entry._id });
		const firstPublishedAt = published?.firstPublishedAt;
		const lastPublishedAt = published?.lastPublishedAt;

		await t.mutation(api.bulkOperations.bulkUnpublish, {
			ids: [entry._id],
		});

		const unpublished = await t.query(api.contentEntries.get, {
			id: entry._id,
		});

		expect(unpublished?.firstPublishedAt).toBe(firstPublishedAt);
		expect(unpublished?.lastPublishedAt).toBe(lastPublishedAt);
	});
});

// =============================================================================
// Bulk Delete Integration Tests
// =============================================================================

describe("Bulk Delete Integration Tests", () => {
	it("should soft delete multiple entries by default", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "soft_deletable",
				displayName: "Soft Deletable",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 1" },
		});

		const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 2" },
		});

		const result = await t.mutation(api.bulkOperations.bulkDelete, {
			ids: [entry1._id, entry2._id],
			deletedBy: "admin",
		});

		expect(result.total).toBe(2);
		expect(result.succeeded).toBe(2);

		// Entries should still exist but be marked deleted
		// The get query filters out deleted entries, so we need to check directly
		await t.run(async (ctx) => {
			const d1 = await ctx.db.get(entry1._id);
			const d2 = await ctx.db.get(entry2._id);
			expect(d1?.deletedAt).toBeDefined();
			expect(d2?.deletedAt).toBeDefined();
		});
	});

	it("should hard delete entries and their versions", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "hard_deletable",
				displayName: "Hard Deletable",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Hard Delete Entry" },
		});

		// Publish to create a version
		await t.mutation(api.contentEntryMutations.publishEntry, { id: entry._id });

		// Hard delete
		const result = await t.mutation(api.bulkOperations.bulkDelete, {
			ids: [entry._id],
			deletedBy: "admin",
			hardDelete: true,
		});

		expect(result.succeeded).toBe(1);

		// Entry should be completely gone
		await t.run(async (ctx) => {
			const deleted = await ctx.db.get(entry._id);
			expect(deleted).toBeNull();

			// Versions should also be gone
			const versions = await ctx.db
				.query("contentVersions")
				.withIndex("by_entry", (q) => q.eq("entryId", entry._id))
				.collect();
			expect(versions.length).toBe(0);
		});
	});

	it("should skip already soft-deleted entries (idempotent)", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "already_deleted",
				displayName: "Already Deleted",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Already Deleted" },
		});

		// Soft delete first
		await t.mutation(api.contentEntryMutations.deleteEntry, {
			id: entry._id,
		});

		// Try bulk soft delete again
		const result = await t.mutation(api.bulkOperations.bulkDelete, {
			ids: [entry._id],
		});

		expect(result.succeeded).toBe(1);
		expect(result.results[0].success).toBe(true);
	});
});

// =============================================================================
// Bulk Update Integration Tests
// =============================================================================

describe("Bulk Update Integration Tests", () => {
	it("should update multiple entries with same data", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "updatable",
				displayName: "Updatable",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
					{
						name: "featured",
						label: "Featured",
						type: "boolean",
						required: false,
					},
				],
			},
		);

		const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 1", featured: false },
		});

		const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 2", featured: false },
		});

		// Bulk update to set featured: true
		const result = await t.mutation(api.bulkOperations.bulkUpdate, {
			ids: [entry1._id, entry2._id],
			data: { featured: true },
			updatedBy: "admin",
		});

		expect(result.total).toBe(2);
		expect(result.succeeded).toBe(2);

		const updated1 = await t.query(api.contentEntries.get, { id: entry1._id });
		const updated2 = await t.query(api.contentEntries.get, { id: entry2._id });

		expect(updated1?.data.featured).toBe(true);
		expect(updated2?.data.featured).toBe(true);
		// Original title should be preserved
		expect(updated1?.data.title).toBe("Entry 1");
		expect(updated2?.data.title).toBe("Entry 2");
	});

	it("should update status for multiple entries", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "status_update",
				displayName: "Status Update",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 1" },
		});

		const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 2" },
		});

		const result = await t.mutation(api.bulkOperations.bulkUpdate, {
			ids: [entry1._id, entry2._id],
			status: "archived",
			updatedBy: "admin",
		});

		expect(result.succeeded).toBe(2);

		const updated1 = await t.query(api.contentEntries.get, { id: entry1._id });
		const updated2 = await t.query(api.contentEntries.get, { id: entry2._id });

		expect(updated1?.status).toBe("archived");
		expect(updated2?.status).toBe("archived");
	});

	it("should validate data against content type schema", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "validated",
				displayName: "Validated",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
					{
						name: "rating",
						label: "Rating",
						type: "number",
						required: true,
						options: { min: 1, max: 5 },
					},
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry", rating: 3 },
		});

		// Try to update with invalid rating
		const result = await t.mutation(api.bulkOperations.bulkUpdate, {
			ids: [entry._id],
			data: { rating: 10 }, // Out of range
		});

		expect(result.failed).toBe(1);
		expect(result.results[0].error).toContain("Validation failed");
	});

	it("should fail if entry is deleted", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "deleted_update",
				displayName: "Deleted Update",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Deleted Entry" },
		});

		await t.mutation(api.contentEntryMutations.deleteEntry, {
			id: entry._id,
		});

		const result = await t.mutation(api.bulkOperations.bulkUpdate, {
			ids: [entry._id],
			data: { title: "Updated" },
		});

		expect(result.failed).toBe(1);
		expect(result.results[0].error).toContain("deleted");
	});

	it("should require at least data or status", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "no_update",
				displayName: "No Update",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry" },
		});

		await expect(
			t.mutation(api.bulkOperations.bulkUpdate, {
				ids: [entry._id],
				updatedBy: "admin",
				// No data or status provided
			}),
		).rejects.toThrow(/at least one of/i);
	});

	it("should increment version for each updated entry", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "version_increment",
				displayName: "Version Increment",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Version Test" },
		});

		expect(entry.version).toBe(1);

		await t.mutation(api.bulkOperations.bulkUpdate, {
			ids: [entry._id],
			data: { title: "Updated" },
		});

		const updated = await t.query(api.contentEntries.get, { id: entry._id });
		expect(updated?.version).toBe(2);
	});

	it("should regenerate searchText when data changes", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "search_update",
				displayName: "Search Update",
				fields: [
					{
						name: "title",
						label: "Title",
						type: "text",
						required: true,
						searchable: true,
					},
					{
						name: "description",
						label: "Description",
						type: "text",
						required: false,
						searchable: true,
					},
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Original", description: "Original desc" },
		});

		await t.mutation(api.bulkOperations.bulkUpdate, {
			ids: [entry._id],
			data: { title: "Updated Title" },
		});

		const updated = await t.query(api.contentEntries.get, { id: entry._id });
		expect(updated?.searchText).toContain("Updated Title");
		expect(updated?.searchText).toContain("Original desc");
	});
});

// =============================================================================
// Bulk Restore Integration Tests
// =============================================================================

describe("Bulk Restore Integration Tests", () => {
	it("should restore multiple soft-deleted entries", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "restorable",
				displayName: "Restorable",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 1" },
		});

		const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Entry 2" },
		});

		// Soft delete both
		await t.mutation(api.contentEntryMutations.deleteEntry, { id: entry1._id });
		await t.mutation(api.contentEntryMutations.deleteEntry, { id: entry2._id });

		// Bulk restore
		const result = await t.mutation(api.bulkOperations.bulkRestore, {
			ids: [entry1._id, entry2._id],
			restoredBy: "admin",
		});

		expect(result.total).toBe(2);
		expect(result.succeeded).toBe(2);

		// Verify entries are restored
		await t.run(async (ctx) => {
			const restored1 = await ctx.db.get(entry1._id);
			const restored2 = await ctx.db.get(entry2._id);
			expect(restored1?.deletedAt).toBeUndefined();
			expect(restored2?.deletedAt).toBeUndefined();
		});
	});

	it("should skip non-deleted entries (idempotent)", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "not_deleted",
				displayName: "Not Deleted",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Not Deleted" },
		});

		const result = await t.mutation(api.bulkOperations.bulkRestore, {
			ids: [entry._id],
		});

		expect(result.succeeded).toBe(1);
		expect(result.results[0].success).toBe(true);
	});

	it("should fail for non-existent entries", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "exists_test",
				displayName: "Exists Test",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		const entry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Will be hard deleted" },
		});

		// Hard delete
		await t.run(async (ctx) => {
			await ctx.db.delete(entry._id);
		});

		const result = await t.mutation(api.bulkOperations.bulkRestore, {
			ids: [entry._id],
		});

		expect(result.failed).toBe(1);
		expect(result.results[0].error).toContain("not found");
	});
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe("Bulk Operations Edge Cases", () => {
	it("should handle mixed success/failure across entries", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "mixed_results",
				displayName: "Mixed Results",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
				],
			},
		);

		// Create entries in different states
		const draftEntry = await t.mutation(api.contentEntryMutations.createEntry, {
			contentTypeId: contentType._id,
			data: { title: "Draft" },
		});

		const deletedEntry = await t.mutation(
			api.contentEntryMutations.createEntry,
			{
				contentTypeId: contentType._id,
				data: { title: "Deleted" },
			},
		);
		await t.mutation(api.contentEntryMutations.deleteEntry, {
			id: deletedEntry._id,
		});

		const archivedEntry = await t.mutation(
			api.contentEntryMutations.createEntry,
			{
				contentTypeId: contentType._id,
				data: { title: "Archived" },
				status: "archived",
			},
		);

		// Try to publish all
		const result = await t.mutation(api.bulkOperations.bulkPublish, {
			ids: [draftEntry._id, deletedEntry._id, archivedEntry._id],
		});

		expect(result.total).toBe(3);
		expect(result.succeeded).toBe(1);
		expect(result.failed).toBe(2);

		// Verify the results are in correct order
		expect(result.results[0].id).toBe(draftEntry._id);
		expect(result.results[0].success).toBe(true);

		expect(result.results[1].id).toBe(deletedEntry._id);
		expect(result.results[1].success).toBe(false);

		expect(result.results[2].id).toBe(archivedEntry._id);
		expect(result.results[2].success).toBe(false);
	});

	it("should cache content types for bulk update efficiency", async () => {
		const t = convexTest(schema, modules);

		const contentType = await t.mutation(
			api.contentTypeMutations.createContentType,
			{
				name: "cached_type",
				displayName: "Cached Type",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
					{ name: "count", label: "Count", type: "number", required: false },
				],
			},
		);

		// Create multiple entries of same type
		const entries = [];
		for (let i = 0; i < 5; i++) {
			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeId: contentType._id,
				data: { title: `Entry ${i}`, count: i },
			});
			entries.push(entry);
		}

		// Bulk update all - should use cached content type
		const result = await t.mutation(api.bulkOperations.bulkUpdate, {
			ids: entries.map((e) => e._id),
			data: { count: 100 },
		});

		expect(result.succeeded).toBe(5);

		// Verify all were updated
		for (const entry of entries) {
			const updated = await t.query(api.contentEntries.get, { id: entry._id });
			expect(updated?.data.count).toBe(100);
		}
	});
});
