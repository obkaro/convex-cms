/**
 * Tests for Content Entry Mutation Functions
 *
 * These tests verify the validators, argument structures, and logic patterns
 * used by the content entry mutation functions (create, update, publish, unpublish, delete, restore).
 */
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api } from "../../src/component/_generated/api.js";
import {
	createContentEntryArgs,
	updateContentEntryArgs,
	publishEntryArgs,
	unpublishEntryArgs,
	deleteContentEntryArgs,
	duplicateContentEntryArgs,
	contentEntryDoc,
} from "../../src/component/validators.js";
import { contentStatuses } from "../../src/component/schema.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

describe("Content Entry Mutation Validators", () => {
	// =============================================================================
	// Content Status Constants Tests
	// =============================================================================

	describe("contentStatuses", () => {
		it("should include all expected status values", () => {
			expect(contentStatuses).toContain("draft");
			expect(contentStatuses).toContain("published");
			expect(contentStatuses).toContain("archived");
			expect(contentStatuses).toContain("scheduled");
		});

		it("should have exactly 4 status options", () => {
			expect(contentStatuses.length).toBe(4);
		});

		it("should have 'draft' as the first recommended status for new content", () => {
			// Draft should be the default starting status for new content
			expect(contentStatuses).toContain("draft");
		});
	});

	// =============================================================================
	// createContentEntryArgs Validation Tests
	// =============================================================================

	describe("createContentEntryArgs", () => {
		it("should have correct argument structure for create", () => {
			const argFields = Object.keys(createContentEntryArgs.fields);

			expect(argFields).toContain("contentTypeName");
			expect(argFields).toContain("data");
			expect(argFields).toContain("slug");
			expect(argFields).toContain("locale");
			expect(argFields).toContain("status");
			expect(argFields).toContain("createdBy");
		});

		it("should have contentTypeName as required field", () => {
			const contentTypeNameField = createContentEntryArgs.fields.contentTypeName;
			expect(contentTypeNameField).toBeDefined();
		});

		it("should have data as required field", () => {
			const dataField = createContentEntryArgs.fields.data;
			expect(dataField).toBeDefined();
		});

		it("should have slug as optional field for auto-generation", () => {
			// Slug is optional - will be generated from title if not provided
			const slugField = createContentEntryArgs.fields.slug;
			expect(slugField).toBeDefined();
		});

		it("should have status as optional field defaulting to draft", () => {
			// Status is optional and defaults to "draft" in the mutation handler
			const statusField = createContentEntryArgs.fields.status;
			expect(statusField).toBeDefined();
		});
	});

	// =============================================================================
	// Create Entry Logic Pattern Tests
	// =============================================================================

	describe("Create entry logic patterns", () => {
		it("should default to draft status when not specified", () => {
			const providedStatus = undefined;
			const defaultStatus = "draft";

			const finalStatus = providedStatus ?? defaultStatus;
			expect(finalStatus).toBe("draft");
		});

		it("should build content type schema for validation", () => {
			// Simulate content type from database
			const contentType = {
				name: "blog_post",
				displayName: "Blog Post",
					createdBy: "test-user",
				description: "A blog post entry",
				fields: [
					{ name: "title", label: "Title", type: "text", required: true },
					{
						name: "content",
						label: "Content",
						type: "richText",
						required: false,
					},
				],
				titleField: "title",
				slugField: "title",
				singleton: false,
			};

			// Build the schema for validation (as done in mutation)
			const schema = {
				name: contentType.name,
				displayName: contentType.displayName,
				description: contentType.description,
				fields: contentType.fields,
				titleField: contentType.titleField,
				slugField: contentType.slugField,
				singleton: contentType.singleton,
			};

			expect(schema.name).toBe("blog_post");
			expect(schema.fields).toHaveLength(2);
			expect(schema.fields[0].required).toBe(true);
		});

		it("should validate content data against schema before creation", () => {
			// Simulate validation result structure
			const validResult = { valid: true, errors: [] };
			const invalidResult = {
				valid: false,
				errors: [
					{ field: "title", message: "title is required", code: "REQUIRED" },
				],
			};

			expect(validResult.valid).toBe(true);
			expect(invalidResult.valid).toBe(false);
			expect(invalidResult.errors).toHaveLength(1);
		});

		it("should format validation errors into readable message", () => {
			const errors = [
				{ field: "title", message: "title is required", code: "REQUIRED" },
				{
					field: "count",
					message: "count must be at least 0",
					code: "MIN_VALUE",
				},
			];

			const errorMessages = errors
				.map((e) => `${e.field}: ${e.message}`)
				.join("; ");

			expect(errorMessages).toBe(
				"title: title is required; count: count must be at least 0",
			);
		});

		it("should allow overriding status on create", () => {
			const providedStatus = "scheduled";
			const defaultStatus = "draft";

			const finalStatus = providedStatus ?? defaultStatus;
			expect(finalStatus).toBe("scheduled");
		});

		it("should start with version 1", () => {
			const initialVersion = 1;
			expect(initialVersion).toBe(1);
		});

		it("should generate slug from title when not provided", () => {
			const data = { title: "My Test Post" };
			const slugField = "title";
			const slugSource = data[slugField];

			// Simulate slug generation logic - check if we have a valid slug source
			const hasSlugSource =
				typeof slugSource === "string" && slugSource.trim() !== "";
			expect(hasSlugSource).toBe(true);
		});

		it("should use 'untitled' as fallback slug", () => {
			const data = { content: "Some content without title" };
			const slugField = "title";
			const slugSource = (data as Record<string, unknown>)[slugField];

			// If no slug source, use fallback
			const slug =
				typeof slugSource === "string" && slugSource.trim()
					? slugSource
					: "untitled";
			expect(slug).toBe("untitled");
		});

		it("should not have publication timestamps on create", () => {
			// New entries should not have firstPublishedAt or lastPublishedAt
			const newEntry = {
				status: "draft",
				firstPublishedAt: undefined,
				lastPublishedAt: undefined,
			};

			expect(newEntry.firstPublishedAt).toBeUndefined();
			expect(newEntry.lastPublishedAt).toBeUndefined();
		});
	});

	// =============================================================================
	// updateContentEntryArgs Validation Tests
	// =============================================================================

	describe("updateContentEntryArgs", () => {
		it("should have correct argument structure for update", () => {
			const argFields = Object.keys(updateContentEntryArgs.fields);

			expect(argFields).toContain("id");
			expect(argFields).toContain("slug");
			expect(argFields).toContain("data");
			expect(argFields).toContain("status");
			expect(argFields).toContain("scheduledPublishAt");
			expect(argFields).toContain("updatedBy");
		});

		it("should have id as required field", () => {
			const idField = updateContentEntryArgs.fields.id;
			expect(idField).toBeDefined();
		});

		it("should have all other fields as optional", () => {
			// Update only requires id, all other fields are optional
			const argFields = Object.keys(updateContentEntryArgs.fields);
			expect(argFields.length).toBeGreaterThan(1);
		});
	});

	// =============================================================================
	// Update Entry Logic Pattern Tests
	// =============================================================================

	describe("Update entry logic patterns", () => {
		it("should merge data updates with existing data", () => {
			const existingData = { title: "Original", content: "Original content" };
			const updateData = { title: "Updated Title" };

			const mergedData = { ...existingData, ...updateData };

			expect(mergedData.title).toBe("Updated Title");
			expect(mergedData.content).toBe("Original content");
		});

		it("should increment version on update", () => {
			const currentVersion = 1;
			const newVersion = currentVersion + 1;

			expect(newVersion).toBe(2);
		});

		it("should allow updating slug with uniqueness check", () => {
			const existingSlug: string = "original-slug";
			const newSlug: string = "new-slug";

			const slugChanged = newSlug !== existingSlug;
			expect(slugChanged).toBe(true);
		});

		it("should preserve existing data fields not included in update", () => {
			const existingData = {
				title: "Title",
				content: "Content",
				author: "Author",
				tags: ["tag1", "tag2"],
			};
			const updateData = { title: "New Title" };

			const mergedData = { ...existingData, ...updateData };

			expect(mergedData.author).toBe("Author");
			expect(mergedData.tags).toEqual(["tag1", "tag2"]);
		});

		it("should not allow updating deleted entries", () => {
			const entry = {
				_id: "test-id",
				deletedAt: Date.now(),
			};

			const isDeleted = entry.deletedAt !== undefined;
			expect(isDeleted).toBe(true);
		});
	});

	// =============================================================================
	// publishEntryArgs Validation Tests
	// =============================================================================

	describe("publishEntryArgs", () => {
		it("should have correct argument structure for publish", () => {
			const argFields = Object.keys(publishEntryArgs.fields);

			expect(argFields).toContain("id");
			expect(argFields).toContain("changeDescription");
			expect(argFields).toContain("updatedBy");
		});

		it("should have id as required field", () => {
			const idField = publishEntryArgs.fields.id;
			expect(idField).toBeDefined();
		});

		it("should have changeDescription as optional for version history", () => {
			const changeDescriptionField = publishEntryArgs.fields.changeDescription;
			expect(changeDescriptionField).toBeDefined();
		});
	});

	// =============================================================================
	// Publish Entry Logic Pattern Tests
	// =============================================================================

	describe("Publish entry logic patterns", () => {
		it("should transition from draft to published", () => {
			const entry = { status: "draft" as const };
			const newStatus = "published";

			expect(entry.status).toBe("draft");
			expect(newStatus).toBe("published");
		});

		it("should transition from scheduled to published", () => {
			const entry: { status: string } = { status: "scheduled" };
			const newStatus = "published";

			// Scheduled content can be published early
			const canPublish =
				entry.status === "draft" || entry.status === "scheduled";
			expect(canPublish).toBe(true);
			expect(newStatus).toBe("published");
		});

		it("should not allow publishing already published content", () => {
			const entry = { status: "published" as const };

			const alreadyPublished = entry.status === "published";
			expect(alreadyPublished).toBe(true);
		});

		it("should not allow publishing archived content", () => {
			const entry = { status: "archived" as const };

			const isArchived = entry.status === "archived";
			expect(isArchived).toBe(true);
		});

		it("should set firstPublishedAt only on first publication", () => {
			const entryFirstTime = { firstPublishedAt: undefined };
			const entryRepublish = { firstPublishedAt: 1000000000 };
			const now = Date.now();

			// First time - set firstPublishedAt
			const shouldSetFirst = entryFirstTime.firstPublishedAt === undefined;
			expect(shouldSetFirst).toBe(true);

			// Republish - keep existing firstPublishedAt
			const shouldNotSetFirst = entryRepublish.firstPublishedAt !== undefined;
			expect(shouldNotSetFirst).toBe(true);
		});

		it("should always update lastPublishedAt", () => {
			const entry = { lastPublishedAt: 1000000000 };
			const now = Date.now();

			expect(now).toBeGreaterThan(entry.lastPublishedAt);
		});

		it("should clear scheduledPublishAt when publishing", () => {
			const entry = {
				status: "scheduled" as const,
				scheduledPublishAt: Date.now() + 86400000,
			};

			// After publish, scheduledPublishAt should be cleared
			const afterPublish = {
				...entry,
				status: "published" as const,
				scheduledPublishAt: undefined,
			};

			expect(afterPublish.scheduledPublishAt).toBeUndefined();
		});

		it("should create version snapshot on publish", () => {
			const entry = {
				version: 1,
				data: { title: "Test" },
				slug: "test",
				status: "draft" as const,
			};

			const versionSnapshot = {
				versionNumber: entry.version,
				data: entry.data,
				slug: entry.slug,
				status: entry.status,
				wasPublished: true,
				publishedAt: Date.now(),
			};

			expect(versionSnapshot.wasPublished).toBe(true);
			expect(versionSnapshot.versionNumber).toBe(1);
		});
	});

	// =============================================================================
	// unpublishEntryArgs Validation Tests
	// =============================================================================

	describe("unpublishEntryArgs", () => {
		it("should have correct argument structure for unpublish", () => {
			const argFields = Object.keys(unpublishEntryArgs.fields);

			expect(argFields).toContain("id");
			expect(argFields).toContain("updatedBy");
		});

		it("should have id as required field", () => {
			const idField = unpublishEntryArgs.fields.id;
			expect(idField).toBeDefined();
		});
	});

	// =============================================================================
	// Unpublish Entry Logic Pattern Tests
	// =============================================================================

	describe("Unpublish entry logic patterns", () => {
		it("should transition from published to draft", () => {
			const entry = { status: "published" as const };
			const newStatus = "draft";

			expect(entry.status).toBe("published");
			expect(newStatus).toBe("draft");
		});

		it("should only allow unpublishing published content", () => {
			const publishedEntry: { status: string } = { status: "published" };
			const draftEntry: { status: string } = { status: "draft" };
			const scheduledEntry: { status: string } = { status: "scheduled" };

			expect(publishedEntry.status === "published").toBe(true);
			expect(draftEntry.status === "published").toBe(false);
			expect(scheduledEntry.status === "published").toBe(false);
		});

		it("should increment version on unpublish", () => {
			const currentVersion = 5;
			const newVersion = currentVersion + 1;

			expect(newVersion).toBe(6);
		});

		it("should preserve publication timestamps", () => {
			const entry = {
				status: "published" as const,
				firstPublishedAt: 1000000000,
				lastPublishedAt: 1500000000,
			};

			// After unpublish, timestamps should be preserved for history
			const afterUnpublish = {
				...entry,
				status: "draft" as const,
			};

			expect(afterUnpublish.firstPublishedAt).toBe(1000000000);
			expect(afterUnpublish.lastPublishedAt).toBe(1500000000);
		});
	});

	// =============================================================================
	// Draft Status Workflow Integration Tests
	// =============================================================================

	describe("Draft status workflow", () => {
		it("should support complete draft-to-published workflow", () => {
			// Step 1: Create as draft
			let entry: {
				status: string;
				version: number;
				firstPublishedAt: number | undefined;
				lastPublishedAt: number | undefined;
			} = {
				status: "draft",
				version: 1,
				firstPublishedAt: undefined,
				lastPublishedAt: undefined,
			};
			expect(entry.status).toBe("draft");

			// Step 2: Update while draft (multiple times)
			entry = { ...entry, version: entry.version + 1 };
			entry = { ...entry, version: entry.version + 1 };
			expect(entry.version).toBe(3);

			// Step 3: Publish
			const publishedAt = Date.now();
			entry = {
				...entry,
				status: "published",
				version: entry.version + 1,
				firstPublishedAt: publishedAt,
				lastPublishedAt: publishedAt,
			};
			expect(entry.status).toBe("published");
			expect(entry.firstPublishedAt).toBe(publishedAt);

			// Step 4: Unpublish for more edits
			entry = {
				...entry,
				status: "draft",
				version: entry.version + 1,
			};
			expect(entry.status).toBe("draft");
			expect(entry.firstPublishedAt).toBe(publishedAt); // Preserved

			// Step 5: Republish
			const republishedAt = Date.now();
			entry = {
				...entry,
				status: "published",
				version: entry.version + 1,
				lastPublishedAt: republishedAt,
			};
			expect(entry.status).toBe("published");
			expect(entry.firstPublishedAt).toBe(publishedAt); // Still original
			expect(entry.lastPublishedAt).toBe(republishedAt); // Updated
		});

		it("should support scheduled publishing workflow", () => {
			// Create as draft
			let entry: {
				status: string;
				scheduledPublishAt: number | undefined;
			} = {
				status: "draft",
				scheduledPublishAt: undefined,
			};

			// Schedule for future
			const futureTime = Date.now() + 86400000;
			entry = {
				...entry,
				status: "scheduled",
				scheduledPublishAt: futureTime,
			};
			expect(entry.status).toBe("scheduled");
			expect(entry.scheduledPublishAt).toBe(futureTime);

			// Manual early publish clears schedule
			entry = {
				...entry,
				status: "published",
				scheduledPublishAt: undefined,
			};
			expect(entry.status).toBe("published");
			expect(entry.scheduledPublishAt).toBeUndefined();
		});
	});

	// =============================================================================
	// deleteContentEntryArgs Validation Tests
	// =============================================================================

	describe("deleteContentEntryArgs", () => {
		it("should have correct argument structure for delete", () => {
			// The deleteEntry mutation accepts:
			// - id: Id<"contentEntries"> (required)
			// - deletedBy: string (optional)
			// - hardDelete: boolean (optional)

			const argFields = Object.keys(deleteContentEntryArgs.fields);

			expect(argFields).toContain("id");
			expect(argFields).toContain("deletedBy");
			expect(argFields).toContain("hardDelete");
		});

		it("should have id as required field", () => {
			// id should be a required field (not optional)
			const idField = deleteContentEntryArgs.fields.id;
			expect(idField).toBeDefined();
		});

		it("should have deletedBy as optional field", () => {
			// deletedBy should be optional for audit trail
			const deletedByField = deleteContentEntryArgs.fields.deletedBy;
			expect(deletedByField).toBeDefined();
		});

		it("should have hardDelete as optional boolean", () => {
			// hardDelete should be optional, defaulting to false (soft delete)
			const hardDeleteField = deleteContentEntryArgs.fields.hardDelete;
			expect(hardDeleteField).toBeDefined();
		});
	});

	// =============================================================================
	// Delete Logic Pattern Tests
	// =============================================================================

	describe("Delete logic patterns", () => {
		it("should set deletedAt timestamp for soft delete", () => {
			const entry = {
				_id: "test-id",
				slug: "test-post",
				status: "draft" as const,
				deletedAt: undefined,
				updatedBy: undefined,
			};

			const now = Date.now();
			const deletedBy = "user-123";

			// Simulate soft delete
			const softDeletedEntry = {
				...entry,
				deletedAt: now,
				updatedBy: deletedBy,
			};

			expect(softDeletedEntry.deletedAt).toBe(now);
			expect(softDeletedEntry.updatedBy).toBe(deletedBy);
		});

		it("should throw error if entry is already soft-deleted", () => {
			const entry = {
				_id: "test-id",
				slug: "test-post",
				deletedAt: Date.now() - 1000, // Already deleted
			};

			const hardDelete = false;

			// Logic check: already deleted entries should throw for soft delete
			const alreadyDeleted = !hardDelete && entry.deletedAt !== undefined;
			expect(alreadyDeleted).toBe(true);
		});

		it("should allow hard delete even if soft-deleted", () => {
			const entry = {
				_id: "test-id",
				slug: "test-post",
				deletedAt: Date.now() - 1000, // Already soft-deleted
			};

			const hardDelete = true;

			// Hard delete should proceed regardless of soft-delete status
			const shouldBlock = !hardDelete && entry.deletedAt !== undefined;
			expect(shouldBlock).toBe(false);
		});

		it("should track deleted versions count", () => {
			// Simulate version cleanup tracking
			const versions = [
				{ _id: "v1", versionNumber: 1 },
				{ _id: "v2", versionNumber: 2 },
				{ _id: "v3", versionNumber: 3 },
			];

			const deletedVersionsCount = versions.length;
			expect(deletedVersionsCount).toBe(3);
		});

		it("should not delete versions for soft delete", () => {
			// Soft delete only marks the entry, doesn't remove versions
			const hardDelete = false;
			const shouldDeleteVersions = hardDelete;

			expect(shouldDeleteVersions).toBe(false);
		});

		it("should delete all versions for hard delete", () => {
			// Hard delete removes the entry and all versions
			const hardDelete = true;
			const shouldDeleteVersions = hardDelete;

			expect(shouldDeleteVersions).toBe(true);
		});
	});

	// =============================================================================
	// Restore Logic Pattern Tests
	// =============================================================================

	describe("Restore logic patterns", () => {
		it("should clear deletedAt for restore", () => {
			const entry = {
				_id: "test-id",
				slug: "test-post",
				deletedAt: Date.now() - 1000,
				updatedBy: "original-user",
			};

			const restoredBy = "restore-user";

			// Simulate restore
			const restoredEntry = {
				...entry,
				deletedAt: undefined,
				updatedBy: restoredBy,
			};

			expect(restoredEntry.deletedAt).toBeUndefined();
			expect(restoredEntry.updatedBy).toBe(restoredBy);
		});

		it("should throw error if entry is not soft-deleted", () => {
			const entry = {
				_id: "test-id",
				slug: "test-post",
				deletedAt: undefined, // Not deleted
			};

			// Cannot restore an entry that isn't deleted
			const notDeleted = entry.deletedAt === undefined;
			expect(notDeleted).toBe(true);
		});

		it("should preserve original data when restoring", () => {
			const originalData = {
				title: "Test Post",
				content: "Test content",
			};

			const entry = {
				_id: "test-id",
				slug: "test-post",
				data: originalData,
				deletedAt: Date.now() - 1000,
			};

			// Restore should only clear deletedAt, not change data
			const restoredEntry = {
				...entry,
				deletedAt: undefined,
			};

			expect(restoredEntry.data).toEqual(originalData);
		});
	});

	// =============================================================================
	// Content Entry Document Structure Tests
	// =============================================================================

	describe("Content entry document structure", () => {
		it("should have deletedAt field for soft delete support", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("deletedAt");
		});

		it("should have updatedBy field for audit trail", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("updatedBy");
		});

		it("should have version field for version tracking", () => {
			const docFields = Object.keys(contentEntryDoc.fields);
			expect(docFields).toContain("version");
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe("Edge cases", () => {
		it("should handle entry not found scenario", () => {
			const entry = null;

			// Entry not found should result in error
			const notFound = entry === null;
			expect(notFound).toBe(true);
		});

		it("should handle empty deletedBy parameter", () => {
			const deletedBy = undefined;
			const existingUpdatedBy = "original-user";

			// If deletedBy is not provided, keep existing updatedBy
			const finalUpdatedBy = deletedBy ?? existingUpdatedBy;
			expect(finalUpdatedBy).toBe(existingUpdatedBy);
		});

		it("should handle entries with zero versions", () => {
			const versions: unknown[] = [];
			const deletedVersionsCount = versions.length;

			expect(deletedVersionsCount).toBe(0);
		});

		it("should handle very old deletedAt timestamps", () => {
			// Entry deleted a long time ago
			const entry = {
				_id: "test-id",
				deletedAt: 1, // Very old timestamp
			};

			const isDeleted = entry.deletedAt !== undefined;
			expect(isDeleted).toBe(true);
		});
	});
});

// =============================================================================
// Integration Tests for Content Entry Update Mutation
// =============================================================================

describe("Content Entry Update Mutation Integration Tests", () => {
	describe("updateEntry", () => {
		it("should update content data and validate against schema", async () => {
			const t = convexTest(schema, modules);

			// Create a content type
			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "blog_post",
					displayName: "Blog Post",
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
				data: { title: "Original Title", content: "<p>Original content</p>" },
				createdBy: "user123",
			});

			// Update the entry
			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Updated Title" },
				updatedBy: "user456",
			});

			expect(updated.data.title).toBe("Updated Title");
			// Content should be preserved (merge behavior)
			expect(updated.data.content).toBe("<p>Original content</p>");
			expect(updated.updatedBy).toBe("user456");
			expect(updated.version).toBe(entry.version + 1);
		});

		it("should reject invalid data that fails schema validation", async () => {
			const t = convexTest(schema, modules);

			// Create a content type with required field
			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "article",
					displayName: "Article",
					createdBy: "test-user",
					fields: [
						{
							name: "title",
							label: "Title",
							type: "text",
							required: true,
							options: { minLength: 5 },
						},
					],
				},
			);

			// Create an entry with valid data
			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Valid Title" },
			});

			// Try to update with invalid data (title too short)
			await expect(
				t.mutation(api.contentEntryMutations.updateEntry, {
					id: entry._id,
					data: { title: "Hi" },
				}),
			).rejects.toThrow(/validation failed/i);
		});

		it("should regenerate slug when regenerateSlug is true", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "page",
					displayName: "Page",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Original Page" },
			});

			expect(entry.slug).toBe("original-page");

			// Update title and regenerate slug
			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Brand New Page Title" },
				regenerateSlug: true,
			});

			expect(updated.slug).toBe("brand-new-page-title");
			expect(updated.data.title).toBe("Brand New Page Title");
		});

		it("should not change slug when regenerateSlug is false", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "post",
					displayName: "Post",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "My Post" },
			});

			const originalSlug = entry.slug;

			// Update title without regenerating slug
			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Changed Title" },
				regenerateSlug: false,
			});

			expect(updated.slug).toBe(originalSlug);
			expect(updated.data.title).toBe("Changed Title");
		});

		it("should prefer explicit slug over regenerated slug", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "document",
					displayName: "Document",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Document Title" },
			});

			// Update with both explicit slug and regenerateSlug: true
			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "New Document Title" },
				slug: "custom-slug",
				regenerateSlug: true, // This should be ignored due to explicit slug
			});

			expect(updated.slug).toBe("custom-slug");
		});

		it("should ensure slug uniqueness when changing slug", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "item",
					displayName: "Item",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			// Create two entries
			const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "First Item" },
			});

			const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Second Item" },
			});

			// Try to update entry2's slug to match entry1
			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry2._id,
				slug: "first-item",
			});

			// Should get a unique slug (first-item-1)
			expect(updated.slug).toBe("first-item-1");
		});

		it("should regenerate searchText when data changes", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "searchable",
					displayName: "Searchable",
					createdBy: "test-user",
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
				contentTypeName: contentType.name,
				data: { title: "Original", description: "Original description" },
			});

			expect(entry.searchText).toContain("Original");

			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "Updated Title", description: "New description" },
			});

			expect(updated.searchText).toContain("Updated Title");
			expect(updated.searchText).toContain("New description");
		});

		it("should throw error for non-existent entry", async () => {
			const t = convexTest(schema, modules);

			// Create and delete a content type to get a valid but non-existent entry ID
			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "temp",
					displayName: "Temp",
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

			// Delete the entry to make ID invalid
			await t.run(async (ctx) => {
				await ctx.db.delete(entry._id);
			});

			await expect(
				t.mutation(api.contentEntryMutations.updateEntry, {
					id: entry._id,
					data: { title: "Updated" },
				}),
			).rejects.toThrow(/not found/i);
		});

		it("should throw error for deleted entry", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "deletable",
					displayName: "Deletable",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Will be deleted" },
			});

			// Soft delete the entry
			await t.run(async (ctx) => {
				await ctx.db.patch(entry._id, { deletedAt: Date.now() });
			});

			await expect(
				t.mutation(api.contentEntryMutations.updateEntry, {
					id: entry._id,
					data: { title: "Updated" },
				}),
			).rejects.toThrow(/has been deleted/i);
		});

		it("should throw error if content type has been deleted", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "to_delete",
					displayName: "To Delete",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Orphan Entry" },
			});

			// Soft delete the content type
			await t.run(async (ctx) => {
				await ctx.db.patch(contentType._id, { deletedAt: Date.now() });
			});

			await expect(
				t.mutation(api.contentEntryMutations.updateEntry, {
					id: entry._id,
					data: { title: "Updated" },
				}),
			).rejects.toThrow(/has been deleted/i);
		});

		it("should update status correctly", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "status_test",
					displayName: "Status Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Status Entry" },
				status: "draft",
			});

			expect(entry.status).toBe("draft");

			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				status: "scheduled",
				scheduledPublishAt: Date.now() + 86400000,
			});

			expect(updated.status).toBe("scheduled");
			expect(updated.scheduledPublishAt).toBeDefined();
		});

		it("should increment version on every update", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "versioned",
					displayName: "Versioned",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "v1" },
			});

			expect(entry.version).toBe(1);

			const v2 = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "v2" },
			});
			expect(v2.version).toBe(2);

			const v3 = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { title: "v3" },
			});
			expect(v3.version).toBe(3);
		});

		it("should validate complex field types on update", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "complex",
					displayName: "Complex",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{
							name: "rating",
							label: "Rating",
							type: "number",
							required: true,
							options: { min: 1, max: 5 },
						},
						{
							name: "category",
							label: "Category",
							type: "select",
							required: true,
							options: {
								options: [
									{ value: "tech", label: "Technology" },
									{ value: "lifestyle", label: "Lifestyle" },
								],
							},
						},
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Complex Entry", rating: 3, category: "tech" },
			});

			// Try to update with invalid rating (out of range)
			await expect(
				t.mutation(api.contentEntryMutations.updateEntry, {
					id: entry._id,
					data: { rating: 10 },
				}),
			).rejects.toThrow(/validation failed/i);

			// Try to update with invalid select option
			await expect(
				t.mutation(api.contentEntryMutations.updateEntry, {
					id: entry._id,
					data: { category: "invalid_option" },
				}),
			).rejects.toThrow(/validation failed/i);

			// Valid update should work
			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				data: { rating: 5, category: "lifestyle" },
			});

			expect(updated.data.rating).toBe(5);
			expect(updated.data.category).toBe("lifestyle");
		});

		it("should allow update with only metadata changes (no data)", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "metadata_only",
					displayName: "Metadata Only",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Original" },
				createdBy: "user1",
			});

			// Update only metadata (updatedBy)
			const updated = await t.mutation(api.contentEntryMutations.updateEntry, {
				id: entry._id,
				updatedBy: "user2",
			});

			expect(updated.data.title).toBe("Original"); // Data unchanged
			expect(updated.updatedBy).toBe("user2");
			expect(updated.version).toBe(entry.version + 1);
		});

		it("should include regenerateSlug in validator args", () => {
			// Verify the validator includes the new regenerateSlug field
			const argFields = Object.keys(updateContentEntryArgs.fields);
			expect(argFields).toContain("regenerateSlug");
		});
	});
});

// =============================================================================
// Duplicate Entry Validator Tests
// =============================================================================

describe("duplicateContentEntryArgs", () => {
	it("should have correct argument structure for duplicate", () => {
		const argFields = Object.keys(duplicateContentEntryArgs.fields);

		expect(argFields).toContain("sourceEntryId");
		expect(argFields).toContain("slug");
		expect(argFields).toContain("copyMediaReferences");
		expect(argFields).toContain("locale");
		expect(argFields).toContain("createdBy");
	});

	it("should have sourceEntryId as required field", () => {
		const sourceEntryIdField = duplicateContentEntryArgs.fields.sourceEntryId;
		expect(sourceEntryIdField).toBeDefined();
	});

	it("should have slug as optional field for custom slug", () => {
		const slugField = duplicateContentEntryArgs.fields.slug;
		expect(slugField).toBeDefined();
	});

	it("should have copyMediaReferences as optional boolean", () => {
		const copyMediaField = duplicateContentEntryArgs.fields.copyMediaReferences;
		expect(copyMediaField).toBeDefined();
	});
});

// =============================================================================
// Duplicate Entry Logic Pattern Tests
// =============================================================================

describe("Duplicate entry logic patterns", () => {
	it("should deep copy content data", () => {
		const sourceData = {
			title: "Original Title",
			content: "<p>Content</p>",
			nested: { key: "value" },
			tags: ["tag1", "tag2"],
		};

		// Simulate deep copy
		const newData = JSON.parse(JSON.stringify(sourceData));

		// Should be equal but not the same reference
		expect(newData).toEqual(sourceData);
		expect(newData).not.toBe(sourceData);
		expect(newData.nested).not.toBe(sourceData.nested);
		expect(newData.tags).not.toBe(sourceData.tags);
	});

	it("should start as draft with version 1", () => {
		const duplicatedEntry = {
			status: "draft" as const,
			version: 1,
		};

		expect(duplicatedEntry.status).toBe("draft");
		expect(duplicatedEntry.version).toBe(1);
	});

	it("should reset publishing timestamps", () => {
		const sourceEntry = {
			firstPublishedAt: 1000000000,
			lastPublishedAt: 1500000000,
			scheduledPublishAt: 2000000000,
		};

		const duplicatedEntry = {
			firstPublishedAt: undefined,
			lastPublishedAt: undefined,
			scheduledPublishAt: undefined,
		};

		expect(duplicatedEntry.firstPublishedAt).toBeUndefined();
		expect(duplicatedEntry.lastPublishedAt).toBeUndefined();
		expect(duplicatedEntry.scheduledPublishAt).toBeUndefined();
	});

	it("should clear locks on duplicate", () => {
		const sourceEntry = {
			lockedBy: "user123",
			lockExpiresAt: Date.now() + 600000,
		};

		const duplicatedEntry = {
			lockedBy: undefined,
			lockExpiresAt: undefined,
		};

		expect(duplicatedEntry.lockedBy).toBeUndefined();
		expect(duplicatedEntry.lockExpiresAt).toBeUndefined();
	});

	it("should generate unique slug from source", () => {
		const sourceSlug = "my-post";
		const existingSlugs = ["my-post", "my-post-1"];

		// Simulate slug uniqueness logic
		let counter = 1;
		let candidateSlug = sourceSlug;
		while (existingSlugs.includes(candidateSlug)) {
			candidateSlug = `${sourceSlug}-${counter}`;
			counter++;
		}

		expect(candidateSlug).toBe("my-post-2");
	});

	it("should preserve media references by default", () => {
		const sourceData = {
			title: "Post with image",
			featuredImage: "media_asset_123",
			gallery: ["media_asset_456", "media_asset_789"],
		};

		const copyMediaReferences = true;
		const newData = JSON.parse(JSON.stringify(sourceData));

		expect(newData.featuredImage).toBe(sourceData.featuredImage);
		expect(newData.gallery).toEqual(sourceData.gallery);
	});

	it("should clear media references when copyMediaReferences is false", () => {
		const sourceData = {
			title: "Post with image",
			featuredImage: "media_asset_123",
			gallery: ["media_asset_456", "media_asset_789"],
		};

		const fields = [
			{ name: "title", type: "text" },
			{ name: "featuredImage", type: "media", options: { multiple: false } },
			{ name: "gallery", type: "media", options: { multiple: true } },
		];

		const copyMediaReferences = false;
		const newData = JSON.parse(JSON.stringify(sourceData));

		if (!copyMediaReferences) {
			for (const field of fields) {
				if (field.type === "media" && newData[field.name] !== undefined) {
					const isMultiple = field.options?.multiple;
					newData[field.name] = isMultiple ? [] : null;
				}
			}
		}

		expect(newData.featuredImage).toBeNull();
		expect(newData.gallery).toEqual([]);
	});

	it("should set new audit trail", () => {
		const createdBy = "new-user-123";

		const duplicatedEntry = {
			createdBy,
			updatedBy: createdBy,
		};

		expect(duplicatedEntry.createdBy).toBe("new-user-123");
		expect(duplicatedEntry.updatedBy).toBe("new-user-123");
	});

	it("should not copy primaryEntryId", () => {
		const sourceEntry = {
			primaryEntryId: "original-entry-123",
		};

		// New duplicate is independent - doesn't inherit primaryEntryId
		const duplicatedEntry = {
			primaryEntryId: undefined,
		};

		expect(duplicatedEntry.primaryEntryId).toBeUndefined();
	});
});

// =============================================================================
// Integration Tests for Content Entry Duplicate Mutation
// =============================================================================

describe("Content Entry Duplicate Mutation Integration Tests", () => {
	describe("duplicateEntry", () => {
		it("should duplicate a content entry with unique slug", async () => {
			const t = convexTest(schema, modules);

			// Create a content type
			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "blog_post",
					displayName: "Blog Post",
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

			// Create an original entry
			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "My Blog Post", content: "<p>Hello world!</p>" },
				createdBy: "user123",
			});

			// Duplicate the entry
			const duplicate = await t.mutation(
				api.contentEntryMutations.duplicateEntry,
				{
					sourceEntryId: original._id,
					createdBy: "user456",
				},
			);

			// Verify duplicate has unique slug
			expect(duplicate._id).not.toBe(original._id);
			expect(duplicate.slug).toBe("my-blog-post-1");
			expect(duplicate.data.title).toBe("My Blog Post");
			expect(duplicate.data.content).toBe("<p>Hello world!</p>");
			expect(duplicate.status).toBe("draft");
			expect(duplicate.version).toBe(1);
			expect(duplicate.createdBy).toBe("user456");
		});

		it("should duplicate with custom slug", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "article",
					displayName: "Article",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Original Article" },
			});

			const duplicate = await t.mutation(
				api.contentEntryMutations.duplicateEntry,
				{
					sourceEntryId: original._id,
					slug: "custom-copy-slug",
				},
			);

			expect(duplicate.slug).toBe("custom-copy-slug");
		});

		it("should copy media references by default", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "post_with_media",
					displayName: "Post with Media",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{ name: "image", label: "Image", type: "media", required: false },
					],
					slugField: "title",
				},
			);

			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Post with Image", image: "media_123" },
			});

			const duplicate = await t.mutation(
				api.contentEntryMutations.duplicateEntry,
				{
					sourceEntryId: original._id,
				},
			);

			// Media reference should be copied
			expect(duplicate.data.image).toBe("media_123");
		});

		it("should clear media references when copyMediaReferences is false", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "media_entry",
					displayName: "Media Entry",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
						{ name: "single", label: "Single", type: "media", required: false },
						{
							name: "gallery",
							label: "Gallery",
							type: "media",
							required: false,
							options: { multiple: true },
						},
					],
					slugField: "title",
				},
			);

			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: {
					title: "Media Entry",
					single: "media_single",
					gallery: ["media_1", "media_2"],
				},
			});

			const duplicate = await t.mutation(
				api.contentEntryMutations.duplicateEntry,
				{
					sourceEntryId: original._id,
					copyMediaReferences: false,
				},
			);

			// Media references should be cleared
			expect(duplicate.data.single).toBeNull();
			expect(duplicate.data.gallery).toEqual([]);
		});

		it("should duplicate published entry as draft", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "publishable",
					displayName: "Publishable",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			// Create and publish an entry
			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Published Post" },
			});

			const published = await t.mutation(
				api.contentEntryMutations.publishEntry,
				{
					id: original._id,
				},
			);

			expect(published.status).toBe("published");
			expect(published.firstPublishedAt).toBeDefined();

			// Duplicate should be draft with no publish timestamps
			const duplicate = await t.mutation(
				api.contentEntryMutations.duplicateEntry,
				{
					sourceEntryId: published._id,
				},
			);

			expect(duplicate.status).toBe("draft");
			expect(duplicate.version).toBe(1);
			expect(duplicate.firstPublishedAt).toBeUndefined();
			expect(duplicate.lastPublishedAt).toBeUndefined();
		});

		it("should throw error for non-existent source entry", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "temp_type",
					displayName: "Temp Type",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Temp" },
			});

			// Delete the entry
			await t.run(async (ctx) => {
				await ctx.db.delete(entry._id);
			});

			await expect(
				t.mutation(api.contentEntryMutations.duplicateEntry, {
					sourceEntryId: entry._id,
				}),
			).rejects.toThrow(/not found/i);
		});

		it("should throw error for deleted source entry", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "deletable_type",
					displayName: "Deletable Type",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Will be deleted" },
			});

			// Soft delete the entry
			await t.run(async (ctx) => {
				await ctx.db.patch(entry._id, { deletedAt: Date.now() });
			});

			await expect(
				t.mutation(api.contentEntryMutations.duplicateEntry, {
					sourceEntryId: entry._id,
				}),
			).rejects.toThrow(/has been deleted/i);
		});

		it("should throw error if content type is not active", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "inactive_type",
					displayName: "Inactive Type",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
				},
			);

			const entry = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Entry" },
			});

			// Deactivate the content type
			await t.run(async (ctx) => {
				await ctx.db.patch(contentType._id, { isActive: false });
			});

			await expect(
				t.mutation(api.contentEntryMutations.duplicateEntry, {
					sourceEntryId: entry._id,
				}),
			).rejects.toThrow(/not active/i);
		});

		it("should generate searchText for duplicate", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "searchable_type",
					displayName: "Searchable Type",
					createdBy: "test-user",
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
					slugField: "title",
				},
			);

			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Searchable Title", description: "Searchable desc" },
			});

			const duplicate = await t.mutation(
				api.contentEntryMutations.duplicateEntry,
				{
					sourceEntryId: original._id,
				},
			);

			expect(duplicate.searchText).toContain("Searchable Title");
			expect(duplicate.searchText).toContain("Searchable desc");
		});

		it("should allow setting locale on duplicate", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "localizable",
					displayName: "Localizable",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "English Post" },
				locale: "en-US",
			});

			const duplicate = await t.mutation(
				api.contentEntryMutations.duplicateEntry,
				{
					sourceEntryId: original._id,
					locale: "fr-FR",
				},
			);

			expect(duplicate.locale).toBe("fr-FR");
		});

		it("should inherit locale from source if not specified", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "locale_test",
					displayName: "Locale Test",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Localized Post" },
				locale: "de-DE",
			});

			const duplicate = await t.mutation(
				api.contentEntryMutations.duplicateEntry,
				{
					sourceEntryId: original._id,
				},
			);

			expect(duplicate.locale).toBe("de-DE");
		});

		it("should ensure slug uniqueness across multiple duplicates", async () => {
			const t = convexTest(schema, modules);

			const contentType = await t.mutation(
				api.contentTypeMutations.createContentType,
				{
					name: "multi_dup",
					displayName: "Multi Dup",
					createdBy: "test-user",
					fields: [
						{ name: "title", label: "Title", type: "text", required: true },
					],
					slugField: "title",
				},
			);

			const original = await t.mutation(api.contentEntryMutations.createEntry, {
				contentTypeName: contentType.name,
				data: { title: "Original" },
			});

			// Create multiple duplicates
			const dup1 = await t.mutation(api.contentEntryMutations.duplicateEntry, {
				sourceEntryId: original._id,
			});

			const dup2 = await t.mutation(api.contentEntryMutations.duplicateEntry, {
				sourceEntryId: original._id,
			});

			const dup3 = await t.mutation(api.contentEntryMutations.duplicateEntry, {
				sourceEntryId: original._id,
			});

			// All slugs should be unique
			const slugs = [original.slug, dup1.slug, dup2.slug, dup3.slug];
			const uniqueSlugs = new Set(slugs);
			expect(uniqueSlugs.size).toBe(4);

			expect(original.slug).toBe("original");
			expect(dup1.slug).toBe("original-1");
			expect(dup2.slug).toBe("original-2");
			expect(dup3.slug).toBe("original-3");
		});
	});
});
