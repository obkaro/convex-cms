/**
 * Tests for Trash Management Functions
 *
 * These tests verify the validators, argument structures, and logic patterns
 * used by the trash management functions (list, empty, config, cleanup).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api, internal } from "../../src/component/_generated/api.js";
import {
  DEFAULT_TRASH_RETENTION_DAYS,
  trashConfigDoc,
  updateTrashConfigArgs,
  listTrashArgs,
  emptyTrashArgs,
  emptyTrashResult,
  trashItemDoc,
} from "../../src/component/validators.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

// =============================================================================
// Constants Tests
// =============================================================================

describe("Trash Constants", () => {
  it("should have a default retention period of 30 days", () => {
    expect(DEFAULT_TRASH_RETENTION_DAYS).toBe(30);
  });

  it("should export retention period for external configuration", () => {
    expect(typeof DEFAULT_TRASH_RETENTION_DAYS).toBe("number");
    expect(DEFAULT_TRASH_RETENTION_DAYS).toBeGreaterThan(0);
  });
});

// =============================================================================
// Validator Tests
// =============================================================================

describe("Trash Validators", () => {
  describe("trashConfigDoc", () => {
    it("should have correct fields for trash configuration", () => {
      const fields = Object.keys(trashConfigDoc.fields);
      expect(fields).toContain("_id");
      expect(fields).toContain("_creationTime");
      expect(fields).toContain("retentionDays");
      expect(fields).toContain("autoCleanupEnabled");
      expect(fields).toContain("lastCleanupAt");
      expect(fields).toContain("lastCleanupCount");
      expect(fields).toContain("updatedBy");
    });
  });

  describe("updateTrashConfigArgs", () => {
    it("should have correct fields for updating config", () => {
      const fields = Object.keys(updateTrashConfigArgs.fields);
      expect(fields).toContain("retentionDays");
      expect(fields).toContain("autoCleanupEnabled");
      expect(fields).toContain("updatedBy");
    });

    it("should allow partial updates (all fields optional)", () => {
      // All fields should be optional for partial updates
      expect(updateTrashConfigArgs.fields.retentionDays).toBeDefined();
      expect(updateTrashConfigArgs.fields.autoCleanupEnabled).toBeDefined();
    });
  });

  describe("listTrashArgs", () => {
    it("should have correct fields for listing trash", () => {
      const fields = Object.keys(listTrashArgs.fields);
      expect(fields).toContain("contentTypeName");
      expect(fields).toContain("search");
      expect(fields).toContain("paginationOpts");
    });

    it("should support pagination", () => {
      expect(listTrashArgs.fields.paginationOpts).toBeDefined();
    });
  });

  describe("emptyTrashArgs", () => {
    it("should have correct fields for emptying trash", () => {
      const fields = Object.keys(emptyTrashArgs.fields);
      expect(fields).toContain("olderThanDays");
      expect(fields).toContain("contentTypeName");
      expect(fields).toContain("deletedBy");
    });

    it("should support filtering by age", () => {
      expect(emptyTrashArgs.fields.olderThanDays).toBeDefined();
    });
  });

  describe("emptyTrashResult", () => {
    it("should have correct fields for result", () => {
      const fields = Object.keys(emptyTrashResult.fields);
      expect(fields).toContain("deletedCount");
      expect(fields).toContain("deletedVersionsCount");
      expect(fields).toContain("errors");
    });
  });

  describe("trashItemDoc", () => {
    it("should extend content entry with deletion metadata", () => {
      const fields = Object.keys(trashItemDoc.fields);
      // Should have base content entry fields
      expect(fields).toContain("_id");
      expect(fields).toContain("slug");
      expect(fields).toContain("status");
      expect(fields).toContain("deletedAt");
      // Should have additional trash metadata
      expect(fields).toContain("deletedDaysAgo");
      expect(fields).toContain("expiresAt");
      expect(fields).toContain("contentTypeName");
    });
  });
});

// =============================================================================
// Logic Pattern Tests
// =============================================================================

describe("Trash Logic Patterns", () => {
  describe("Retention period calculation", () => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    it("should calculate expiration correctly", () => {
      const deletedAt = Date.now() - 10 * MS_PER_DAY; // 10 days ago
      const retentionDays = 30;
      const expiresAt = deletedAt + retentionDays * MS_PER_DAY;

      expect(expiresAt).toBeGreaterThan(Date.now()); // Should be in future
    });

    it("should identify expired items correctly", () => {
      const now = Date.now();
      const retentionDays = 30;
      const cutoffTime = now - retentionDays * MS_PER_DAY;

      const recentlyDeleted = now - 5 * MS_PER_DAY; // 5 days ago
      const oldDeleted = now - 45 * MS_PER_DAY; // 45 days ago

      expect(recentlyDeleted > cutoffTime).toBe(true); // Not expired
      expect(oldDeleted > cutoffTime).toBe(false); // Expired
    });

    it("should calculate deletedDaysAgo correctly", () => {
      const now = Date.now();
      const deletedAt = now - 7 * MS_PER_DAY;
      const deletedDaysAgo = Math.floor((now - deletedAt) / MS_PER_DAY);

      expect(deletedDaysAgo).toBe(7);
    });
  });

  describe("Retention configuration", () => {
    it("should disable auto-cleanup when retention is 0", () => {
      const retentionDays = 0;
      const shouldCleanup = retentionDays > 0;

      expect(shouldCleanup).toBe(false);
    });

    it("should enable cleanup when retention is positive", () => {
      const retentionDays = 30;
      const shouldCleanup = retentionDays > 0;

      expect(shouldCleanup).toBe(true);
    });
  });

  describe("Filter logic", () => {
    it("should filter by content type", () => {
      const entries = [
        { contentTypeName: "type1", deletedAt: Date.now() },
        { contentTypeName: "type2", deletedAt: Date.now() },
        { contentTypeName: "type1", deletedAt: Date.now() },
      ];
      const filterTypeName = "type1";

      const filtered = entries.filter((e) => e.contentTypeName === filterTypeName);

      expect(filtered.length).toBe(2);
    });

    it("should filter by age (olderThanDays)", () => {
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const olderThanDays = 7;
      const cutoffTime = now - olderThanDays * MS_PER_DAY;

      const entries = [
        { deletedAt: now - 3 * MS_PER_DAY }, // 3 days ago - keep
        { deletedAt: now - 10 * MS_PER_DAY }, // 10 days ago - delete
        { deletedAt: now - 5 * MS_PER_DAY }, // 5 days ago - keep
        { deletedAt: now - 14 * MS_PER_DAY }, // 14 days ago - delete
      ];

      const toDelete = entries.filter((e) => e.deletedAt < cutoffTime);
      const toKeep = entries.filter((e) => e.deletedAt >= cutoffTime);

      expect(toDelete.length).toBe(2);
      expect(toKeep.length).toBe(2);
    });
  });
});

// =============================================================================
// Integration Tests with Convex Test Framework
// =============================================================================

describe("Trash Integration", () => {
  it("should create trash config with defaults", async () => {
    const t = convexTest(schema, modules);

    // Initially, getTrashConfig should return defaults
    const config = await t.query(api.trash.getTrashConfig, {});

    expect(config.retentionDays).toBe(DEFAULT_TRASH_RETENTION_DAYS);
    expect(config.autoCleanupEnabled).toBe(true);
    expect(config.lastCleanupAt).toBeUndefined();
  });

  it("should update trash config", async () => {
    const t = convexTest(schema, modules);

    // Update config
    const updated = await t.mutation(api.trash.updateTrashConfig, {
      retentionDays: 7,
      autoCleanupEnabled: false,
      updatedBy: "test-user",
    });

    expect(updated.retentionDays).toBe(7);
    expect(updated.autoCleanupEnabled).toBe(false);

    // Verify config was persisted
    const config = await t.query(api.trash.getTrashConfig, {});
    expect(config.retentionDays).toBe(7);
    expect(config.autoCleanupEnabled).toBe(false);
  });

  it("should reject invalid retention days", async () => {
    const t = convexTest(schema, modules);

    // Negative retention should fail
    await expect(
      t.mutation(api.trash.updateTrashConfig, { retentionDays: -1 })
    ).rejects.toThrow(/between 0 and 365/);

    // Too high retention should fail
    await expect(
      t.mutation(api.trash.updateTrashConfig, { retentionDays: 500 })
    ).rejects.toThrow(/between 0 and 365/);
  });

  it("should list trash with pagination", async () => {
    const t = convexTest(schema, modules);

    // Create a content type first
    const contentType = await t.mutation(api.contentTypeMutations.createContentType, {
      name: "blog_post",
      displayName: "Blog Post",
					createdBy: "test-user",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    // Create and delete some entries
    const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeName: contentType.name,
      data: { title: "Post 1" },
    });
    const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeName: contentType.name,
      data: { title: "Post 2" },
    });

    // Delete the entries (soft delete)
    await t.mutation(api.contentEntryMutations.deleteEntry, { id: entry1._id });
    await t.mutation(api.contentEntryMutations.deleteEntry, { id: entry2._id });

    // List trash
    const trash = await t.query(api.trash.listTrash, {
      paginationOpts: { numItems: 10, cursor: null },
    });

    expect(trash.page.length).toBe(2);
    expect(trash.page[0].deletedDaysAgo).toBeDefined();
    expect(trash.isDone).toBe(true);
  });

  it("should get trash statistics", async () => {
    const t = convexTest(schema, modules);

    // Initial stats should be empty
    const stats = await t.query(api.trash.getTrashStats, {});

    expect(stats.totalCount).toBe(0);
    expect(stats.expiredCount).toBe(0);
    expect(stats.retentionDays).toBe(DEFAULT_TRASH_RETENTION_DAYS);
  });

  it("should restore entries from trash", async () => {
    const t = convexTest(schema, modules);

    // Create a content type
    const contentType = await t.mutation(api.contentTypeMutations.createContentType, {
      name: "article",
      displayName: "Article",
					createdBy: "test-user",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    // Create an entry
    const entry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeName: contentType.name,
      data: { title: "My Article" },
    });

    // Delete it
    const deleted = await t.mutation(api.contentEntryMutations.deleteEntry, {
      id: entry._id,
    });
    expect(deleted.deletedAt).toBeDefined();

    // Verify it's in trash
    const trashBefore = await t.query(api.trash.listTrash, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(trashBefore.page.length).toBe(1);

    // Restore it
    const restored = await t.mutation(api.contentEntryMutations.restoreEntry, {
      id: entry._id,
    });
    expect(restored.deletedAt).toBeUndefined();

    // Verify it's no longer in trash
    const trashAfter = await t.query(api.trash.listTrash, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(trashAfter.page.length).toBe(0);
  });

  it("should empty trash with filters", async () => {
    const t = convexTest(schema, modules);

    // Create a content type
    const contentType = await t.mutation(api.contentTypeMutations.createContentType, {
      name: "note",
      displayName: "Note",
					createdBy: "test-user",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    // Create and delete entries
    const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeName: contentType.name,
      data: { title: "Note 1" },
    });
    await t.mutation(api.contentEntryMutations.deleteEntry, { id: entry1._id });

    // Empty all trash
    const result = await t.mutation(api.trash.emptyTrash, {
      deletedBy: "test-user",
    });

    expect(result.deletedCount).toBe(1);
    expect(result.errors.length).toBe(0);

    // Verify trash is empty
    const trash = await t.query(api.trash.listTrash, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(trash.page.length).toBe(0);
  });

  it("should run manual trash cleanup", async () => {
    const t = convexTest(schema, modules);

    // Run cleanup (nothing to clean with default retention)
    const result = await t.mutation(api.trash.runTrashCleanup, {
      updatedBy: "test-user",
    });

    expect(result.deletedCount).toBe(0);
    expect(result.message).toContain("Successfully deleted");
  });

  it("should filter trash by content type", async () => {
    const t = convexTest(schema, modules);

    // Create two content types
    const blogType = await t.mutation(api.contentTypeMutations.createContentType, {
      name: "blog",
      displayName: "Blog",
					createdBy: "test-user",
      fields: [{ name: "title", label: "Title", type: "text", required: true }],
    });
    const pageType = await t.mutation(api.contentTypeMutations.createContentType, {
      name: "page",
      displayName: "Page",
					createdBy: "test-user",
      fields: [{ name: "title", label: "Title", type: "text", required: true }],
    });

    // Create and delete entries of each type
    const blog1 = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeName: blogType.name,
      data: { title: "Blog 1" },
    });
    const page1 = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeName: pageType.name,
      data: { title: "Page 1" },
    });

    await t.mutation(api.contentEntryMutations.deleteEntry, { id: blog1._id });
    await t.mutation(api.contentEntryMutations.deleteEntry, { id: page1._id });

    // List only blog trash
    const blogTrash = await t.query(api.trash.listTrash, {
      contentTypeName: blogType.name,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(blogTrash.page.length).toBe(1);
    expect(blogTrash.page[0].contentTypeName).toBe(blogType.name);

    // List all trash
    const allTrash = await t.query(api.trash.listTrash, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(allTrash.page.length).toBe(2);
  });
});
