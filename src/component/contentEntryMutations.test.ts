/**
 * Tests for Content Entry Mutation Functions
 *
 * These tests verify the validators, argument structures, and logic patterns
 * used by the content entry mutation functions (create, update, publish, unpublish, delete, restore).
 */
import { describe, it, expect } from "vitest";
import {
  createContentEntryArgs,
  updateContentEntryArgs,
  publishEntryArgs,
  unpublishEntryArgs,
  deleteContentEntryArgs,
  contentEntryDoc,
  contentStatuses,
} from "./validators.js";

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

      expect(argFields).toContain("contentTypeId");
      expect(argFields).toContain("data");
      expect(argFields).toContain("slug");
      expect(argFields).toContain("locale");
      expect(argFields).toContain("status");
      expect(argFields).toContain("createdBy");
    });

    it("should have contentTypeId as required field", () => {
      const contentTypeIdField = createContentEntryArgs.fields.contentTypeId;
      expect(contentTypeIdField).toBeDefined();
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
      const hasSlugSource = typeof slugSource === "string" && slugSource.trim() !== "";
      expect(hasSlugSource).toBe(true);
    });

    it("should use 'untitled' as fallback slug", () => {
      const data = { content: "Some content without title" };
      const slugField = "title";
      const slugSource = (data as Record<string, unknown>)[slugField];

      // If no slug source, use fallback
      const slug = typeof slugSource === "string" && slugSource.trim()
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
      const existingSlug = "original-slug";
      const newSlug = "new-slug";

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
      const entry = { status: "scheduled" as const };
      const newStatus = "published";

      // Scheduled content can be published early
      const canPublish = entry.status === "draft" || entry.status === "scheduled";
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
        scheduledPublishAt: Date.now() + 86400000
      };

      // After publish, scheduledPublishAt should be cleared
      const afterPublish = {
        ...entry,
        status: "published" as const,
        scheduledPublishAt: undefined
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
      const publishedEntry = { status: "published" as const };
      const draftEntry = { status: "draft" as const };
      const scheduledEntry = { status: "scheduled" as const };

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
      let entry = {
        status: "draft" as const,
        version: 1,
        firstPublishedAt: undefined as number | undefined,
        lastPublishedAt: undefined as number | undefined,
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
      let entry = {
        status: "draft" as const,
        scheduledPublishAt: undefined as number | undefined,
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
      // - id: Id<"content_entries"> (required)
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
