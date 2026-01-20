/**
 * Tests for Content Export/Import Functions
 *
 * These tests verify the export and import functionality:
 * - exportEntries: Export content to JSON format
 * - importEntries: Import content from JSON with validation
 * - getExportPreview: Preview what would be exported
 * - validateImportPackage: Validate import data without importing
 */
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import {
  exportedEntryValidator,
  exportedContentTypeValidator,
  exportPackageValidator,
  conflictStrategyValidator,
  importEntryResultValidator,
  importResultValidator,
} from "./exportImport.js";

// Import all component modules for testing
const modules = import.meta.glob("./**/*.ts");

// =============================================================================
// Validator Structure Tests
// =============================================================================

describe("Export/Import Validators", () => {
  describe("exportedEntryValidator", () => {
    it("should have correct structure", () => {
      const fields = Object.keys(exportedEntryValidator.fields);

      expect(fields).toContain("_originalId");
      expect(fields).toContain("contentTypeName");
      expect(fields).toContain("slug");
      expect(fields).toContain("status");
      expect(fields).toContain("data");
      expect(fields).toContain("locale");
      expect(fields).toContain("version");
      expect(fields).toContain("firstPublishedAt");
      expect(fields).toContain("lastPublishedAt");
      expect(fields).toContain("scheduledPublishAt");
      expect(fields).toContain("createdBy");
      expect(fields).toContain("createdAt");
    });
  });

  describe("exportedContentTypeValidator", () => {
    it("should have correct structure", () => {
      const fields = Object.keys(exportedContentTypeValidator.fields);

      expect(fields).toContain("name");
      expect(fields).toContain("displayName");
      expect(fields).toContain("description");
      expect(fields).toContain("fields");
      expect(fields).toContain("icon");
      expect(fields).toContain("singleton");
      expect(fields).toContain("slugField");
      expect(fields).toContain("titleField");
    });
  });

  describe("exportPackageValidator", () => {
    it("should have correct structure", () => {
      const fields = Object.keys(exportPackageValidator.fields);

      expect(fields).toContain("version");
      expect(fields).toContain("exportedAt");
      expect(fields).toContain("contentTypes");
      expect(fields).toContain("entries");
      expect(fields).toContain("metadata");
    });
  });

  describe("conflictStrategyValidator", () => {
    it("should accept valid strategies", () => {
      // The validator is a union type, so we just verify it exists
      expect(conflictStrategyValidator).toBeDefined();
    });
  });

  describe("importEntryResultValidator", () => {
    it("should have correct structure", () => {
      const fields = Object.keys(importEntryResultValidator.fields);

      expect(fields).toContain("originalId");
      expect(fields).toContain("newId");
      expect(fields).toContain("action");
      expect(fields).toContain("error");
      expect(fields).toContain("slug");
      expect(fields).toContain("contentTypeName");
    });
  });

  describe("importResultValidator", () => {
    it("should have correct structure", () => {
      const fields = Object.keys(importResultValidator.fields);

      expect(fields).toContain("success");
      expect(fields).toContain("totalProcessed");
      expect(fields).toContain("created");
      expect(fields).toContain("updated");
      expect(fields).toContain("skipped");
      expect(fields).toContain("failed");
      expect(fields).toContain("results");
      expect(fields).toContain("idMapping");
      expect(fields).toContain("validationErrors");
    });
  });
});

// =============================================================================
// Export Integration Tests
// =============================================================================

describe("Export Entries Integration Tests", () => {
  it("should export all entries when no filters specified", async () => {
    const t = convexTest(schema, modules);

    // Create content type
    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "blog_post",
        displayName: "Blog Post",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "content", label: "Content", type: "richText", required: false },
        ],
      }
    );

    // Create entries
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Post 1", content: "<p>Content 1</p>" },
    });

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Post 2", content: "<p>Content 2</p>" },
    });

    // Export
    const exportData = await t.query(api.exportImport.exportEntries, {});

    expect(exportData.version).toBe("1.0");
    expect(exportData.exportedAt).toBeDefined();
    expect(exportData.entries.length).toBe(2);
    expect(exportData.contentTypes).toBeDefined();
    expect(exportData.contentTypes?.length).toBe(1);
    expect(exportData.metadata?.totalEntries).toBe(2);
  });

  it("should export entries filtered by content type name", async () => {
    const t = convexTest(schema, modules);

    // Create two content types
    const blogType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "blog",
        displayName: "Blog",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    const pageType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "page",
        displayName: "Page",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create entries for both types
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: blogType._id,
      data: { title: "Blog 1" },
    });

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: pageType._id,
      data: { title: "Page 1" },
    });

    // Export only blogs
    const exportData = await t.query(api.exportImport.exportEntries, {
      contentTypeName: "blog",
    });

    expect(exportData.entries.length).toBe(1);
    expect(exportData.entries[0].contentTypeName).toBe("blog");
  });

  it("should export entries filtered by status", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "article",
        displayName: "Article",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create draft entry
    const draftEntry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Draft Article" },
    });

    // Create and publish another entry
    const publishedEntry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Published Article" },
    });
    await t.mutation(api.contentEntryMutations.publishEntry, {
      id: publishedEntry._id,
    });

    // Export only published
    const exportData = await t.query(api.exportImport.exportEntries, {
      status: "published",
    });

    expect(exportData.entries.length).toBe(1);
    expect(exportData.entries[0].status).toBe("published");
    expect(exportData.entries[0].slug).toBe("published-article");
  });

  it("should export entries filtered by multiple statuses", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "post",
        displayName: "Post",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create entries with different statuses
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Draft" },
    });

    const published = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Published" },
    });
    await t.mutation(api.contentEntryMutations.publishEntry, {
      id: published._id,
    });

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Archived" },
      status: "archived",
    });

    // Export draft and published
    const exportData = await t.query(api.exportImport.exportEntries, {
      statusIn: ["draft", "published"],
    });

    expect(exportData.entries.length).toBe(2);
    const statuses = exportData.entries.map((e) => e.status);
    expect(statuses).toContain("draft");
    expect(statuses).toContain("published");
    expect(statuses).not.toContain("archived");
  });

  it("should exclude deleted entries by default", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "deletable",
        displayName: "Deletable",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create and delete an entry
    const entry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Will be deleted" },
    });
    await t.mutation(api.contentEntryMutations.deleteEntry, {
      id: entry._id,
    });

    // Create a non-deleted entry
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Not deleted" },
    });

    // Export
    const exportData = await t.query(api.exportImport.exportEntries, {});

    expect(exportData.entries.length).toBe(1);
    expect(exportData.entries[0].slug).toBe("not-deleted");
  });

  it("should include deleted entries when includeDeleted is true", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "with_deleted",
        displayName: "With Deleted",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create and delete an entry
    const entry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Deleted entry" },
    });
    await t.mutation(api.contentEntryMutations.deleteEntry, {
      id: entry._id,
    });

    // Export with includeDeleted
    const exportData = await t.query(api.exportImport.exportEntries, {
      includeDeleted: true,
    });

    expect(exportData.entries.length).toBe(1);
  });

  it("should include metadata with export", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "metadata_test",
        displayName: "Metadata Test",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Entry 1" },
    });

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Entry 2" },
    });

    const exportData = await t.query(api.exportImport.exportEntries, {
      description: "Test export",
      source: "test-system",
    });

    expect(exportData.metadata?.description).toBe("Test export");
    expect(exportData.metadata?.source).toBe("test-system");
    expect(exportData.metadata?.totalEntries).toBe(2);
    expect(exportData.metadata?.entriesByType?.metadata_test).toBe(2);
  });

  it("should preserve original IDs in exported entries", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "id_preservation",
        displayName: "ID Preservation",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    const entry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Test Entry" },
    });

    const exportData = await t.query(api.exportImport.exportEntries, {});

    expect(exportData.entries[0]._originalId).toBe(entry._id);
  });

  it("should respect limit parameter", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "limit_test",
        displayName: "Limit Test",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create 5 entries
    for (let i = 0; i < 5; i++) {
      await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: `Entry ${i}` },
      });
    }

    // Export with limit of 3
    const exportData = await t.query(api.exportImport.exportEntries, {
      limit: 3,
    });

    expect(exportData.entries.length).toBe(3);
  });
});

// =============================================================================
// Import Integration Tests
// =============================================================================

describe("Import Entries Integration Tests", () => {
  it("should import entries successfully", async () => {
    const t = convexTest(schema, modules);

    // Create content type
    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "import_test",
        displayName: "Import Test",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "body", label: "Body", type: "text", required: false },
        ],
      }
    );

    // Create import package
    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "import_test",
          slug: "imported-entry-1",
          status: "draft" as const,
          data: { title: "Imported Entry 1", body: "Content 1" },
          version: 1,
          createdAt: Date.now(),
        },
        {
          _originalId: "old-id-2",
          contentTypeName: "import_test",
          slug: "imported-entry-2",
          status: "draft" as const,
          data: { title: "Imported Entry 2", body: "Content 2" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
      importedBy: "test-user",
    });

    expect(result.success).toBe(true);
    expect(result.totalProcessed).toBe(2);
    expect(result.created).toBe(2);
    expect(result.failed).toBe(0);
    expect(Object.keys(result.idMapping).length).toBe(2);

    // Verify entries were created
    const entry1 = await t.query(api.contentEntries.getBySlug, {
      contentTypeId: contentType._id,
      slug: "imported-entry-1",
    });
    expect(entry1).not.toBeNull();
    expect(entry1?.data.title).toBe("Imported Entry 1");
  });

  it("should skip entries with conflicting slugs when onConflict is skip", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "conflict_skip",
        displayName: "Conflict Skip",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create existing entry
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Existing Entry" },
      slug: "existing-slug",
    });

    // Try to import with same slug
    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "conflict_skip",
          slug: "existing-slug",
          status: "draft" as const,
          data: { title: "New Entry" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
      onConflict: "skip",
    });

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(result.results[0].action).toBe("skipped");

    // Verify original entry wasn't changed
    const existing = await t.query(api.contentEntries.getBySlug, {
      contentTypeId: contentType._id,
      slug: "existing-slug",
    });
    expect(existing?.data.title).toBe("Existing Entry");
  });

  it("should update entries with conflicting slugs when onConflict is update", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "conflict_update",
        displayName: "Conflict Update",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create existing entry
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Original Title" },
      slug: "update-slug",
    });

    // Import with update strategy
    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "conflict_update",
          slug: "update-slug",
          status: "draft" as const,
          data: { title: "Updated Title" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
      onConflict: "update",
    });

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);
    expect(result.results[0].action).toBe("updated");

    // Verify entry was updated
    const updated = await t.query(api.contentEntries.getBySlug, {
      contentTypeId: contentType._id,
      slug: "update-slug",
    });
    expect(updated?.data.title).toBe("Updated Title");
  });

  it("should fail when onConflict is error and slug exists", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "conflict_error",
        displayName: "Conflict Error",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create existing entry
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Existing Entry" },
      slug: "error-slug",
    });

    // Try to import with error strategy
    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "conflict_error",
          slug: "error-slug",
          status: "draft" as const,
          data: { title: "New Entry" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
      onConflict: "error",
    });

    expect(result.failed).toBe(1);
    expect(result.results[0].action).toBe("failed");
    expect(result.results[0].error).toContain("already exists");
  });

  it("should validate entries against content type schema", async () => {
    const t = convexTest(schema, modules);

    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "validation_test",
        displayName: "Validation Test",
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
      }
    );

    // Try to import with invalid data
    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "validation_test",
          slug: "invalid-entry",
          status: "draft" as const,
          data: { title: "Invalid Entry", rating: 10 }, // rating out of range
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
    });

    expect(result.failed).toBe(1);
    expect(result.results[0].action).toBe("failed");
    expect(result.results[0].error).toContain("Validation failed");
  });

  it("should handle missing content types gracefully", async () => {
    const t = convexTest(schema, modules);

    // Import without creating the content type
    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "nonexistent_type",
          slug: "orphan-entry",
          status: "draft" as const,
          data: { title: "Orphan Entry" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
    });

    expect(result.failed).toBe(1);
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors?.some((e) => e.includes("not found"))).toBe(true);
  });

  it("should preserve status when preserveStatus is true", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "status_preserve",
      displayName: "Status Preserve",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "status_preserve",
          slug: "published-import",
          status: "published" as const,
          data: { title: "Published Entry" },
          version: 1,
          createdAt: Date.now(),
          firstPublishedAt: Date.now() - 10000,
          lastPublishedAt: Date.now() - 5000,
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
      preserveStatus: true,
    });

    expect(result.success).toBe(true);

    // Check the entry has the preserved status
    const entry = await t.query(api.contentEntries.getBySlugAndTypeName, {
      contentTypeName: "status_preserve",
      slug: "published-import",
    });
    expect(entry?.status).toBe("published");
  });

  it("should set entries to draft when preserveStatus is false", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "status_draft",
      displayName: "Status Draft",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "status_draft",
          slug: "draft-import",
          status: "published" as const,
          data: { title: "Becomes Draft" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
      preserveStatus: false,
    });

    expect(result.success).toBe(true);

    const entry = await t.query(api.contentEntries.getBySlugAndTypeName, {
      contentTypeName: "status_draft",
      slug: "draft-import",
    });
    expect(entry?.status).toBe("draft");
  });

  it("should run in dry-run mode without creating entries", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "dry_run_test",
      displayName: "Dry Run Test",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "dry_run_test",
          slug: "dry-run-entry",
          status: "draft" as const,
          data: { title: "Dry Run Entry" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
      dryRun: true,
    });

    expect(result.created).toBe(1);
    expect(result.results[0].action).toBe("created");
    expect(result.results[0].newId).toBeUndefined(); // No ID in dry run

    // Verify entry was NOT actually created
    const entry = await t.query(api.contentEntries.getBySlugAndTypeName, {
      contentTypeName: "dry_run_test",
      slug: "dry-run-entry",
    });
    expect(entry).toBeNull();
  });

  it("should filter imports by content type", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "type_a",
      displayName: "Type A",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "type_b",
      displayName: "Type B",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "type_a",
          slug: "entry-a",
          status: "draft" as const,
          data: { title: "Entry A" },
          version: 1,
          createdAt: Date.now(),
        },
        {
          _originalId: "old-id-2",
          contentTypeName: "type_b",
          slug: "entry-b",
          status: "draft" as const,
          data: { title: "Entry B" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
      contentTypeFilter: ["type_a"],
    });

    expect(result.totalProcessed).toBe(1);
    expect(result.created).toBe(1);

    // Verify only type_a was imported
    const entryA = await t.query(api.contentEntries.getBySlugAndTypeName, {
      contentTypeName: "type_a",
      slug: "entry-a",
    });
    expect(entryA).not.toBeNull();

    const entryB = await t.query(api.contentEntries.getBySlugAndTypeName, {
      contentTypeName: "type_b",
      slug: "entry-b",
    });
    expect(entryB).toBeNull();
  });

  it("should update reference fields with new IDs after import", async () => {
    const t = convexTest(schema, modules);

    // Create content types with references
    const authorType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "author",
        displayName: "Author",
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
        ],
      }
    );

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "article",
      displayName: "Article",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        {
          name: "author",
          label: "Author",
          type: "reference",
          required: false,
          options: { allowedContentTypes: ["author"] },
        },
      ],
    });

    // Import both author and article in the same batch
    // This is the typical use case: importing a full export package
    // where references between entries need to be remapped
    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-author-id",
          contentTypeName: "author",
          slug: "john-doe",
          status: "draft" as const,
          data: { name: "John Doe" },
          version: 1,
          createdAt: Date.now(),
        },
        {
          _originalId: "old-article-id",
          contentTypeName: "article",
          slug: "my-article",
          status: "draft" as const,
          data: {
            title: "My Article",
            author: "old-author-id", // References the old author ID
          },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const result = await t.mutation(api.exportImport.importEntries, {
      data: importPackage,
    });

    expect(result.success).toBe(true);
    expect(result.created).toBe(2);

    // Check that the reference was updated to the new author ID
    const article = await t.query(api.contentEntries.getBySlugAndTypeName, {
      contentTypeName: "article",
      slug: "my-article",
    });

    // The reference should be updated to the new author ID
    expect(article?.data.author).toBe(result.idMapping["old-author-id"]);
  });
});

// =============================================================================
// Export Preview Integration Tests
// =============================================================================

describe("Export Preview Integration Tests", () => {
  it("should return accurate preview statistics", async () => {
    const t = convexTest(schema, modules);

    const blogType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "preview_blog",
        displayName: "Preview Blog",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create entries with different statuses
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: blogType._id,
      data: { title: "Draft 1" },
    });

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: blogType._id,
      data: { title: "Draft 2" },
    });

    const published = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: blogType._id,
      data: { title: "Published" },
    });
    await t.mutation(api.contentEntryMutations.publishEntry, {
      id: published._id,
    });

    const preview = await t.query(api.exportImport.getExportPreview, {});

    expect(preview.totalEntries).toBe(3);
    expect(preview.entriesByType.preview_blog).toBe(3);
    expect(preview.entriesByStatus.draft).toBe(2);
    expect(preview.entriesByStatus.published).toBe(1);
    expect(preview.contentTypes).toContain("preview_blog");
  });

  it("should filter preview by content type", async () => {
    const t = convexTest(schema, modules);

    const typeA = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "preview_type_a",
        displayName: "Preview Type A",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    const typeB = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "preview_type_b",
        displayName: "Preview Type B",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: typeA._id,
      data: { title: "A Entry" },
    });

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: typeB._id,
      data: { title: "B Entry 1" },
    });

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: typeB._id,
      data: { title: "B Entry 2" },
    });

    const preview = await t.query(api.exportImport.getExportPreview, {
      contentTypeName: "preview_type_b",
    });

    expect(preview.totalEntries).toBe(2);
    expect(preview.contentTypes).toEqual(["preview_type_b"]);
  });
});

// =============================================================================
// Validate Import Package Integration Tests
// =============================================================================

describe("Validate Import Package Integration Tests", () => {
  it("should validate a valid import package", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "valid_import",
      displayName: "Valid Import",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "valid_import",
          slug: "valid-entry",
          status: "draft" as const,
          data: { title: "Valid Entry" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const validation = await t.query(api.exportImport.validateImportPackage, {
      data: importPackage,
    });

    expect(validation.valid).toBe(true);
    expect(validation.totalEntries).toBe(1);
    expect(validation.validEntries).toBe(1);
    expect(validation.invalidEntries).toBe(0);
    expect(validation.missingContentTypes).toEqual([]);
    expect(validation.validationErrors).toEqual([]);
  });

  it("should detect missing content types", async () => {
    const t = convexTest(schema, modules);

    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "missing_type",
          slug: "orphan-entry",
          status: "draft" as const,
          data: { title: "Orphan Entry" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const validation = await t.query(api.exportImport.validateImportPackage, {
      data: importPackage,
    });

    expect(validation.valid).toBe(false);
    expect(validation.missingContentTypes).toContain("missing_type");
    expect(validation.invalidEntries).toBe(1);
  });

  it("should detect validation errors in entries", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "invalid_entries",
      displayName: "Invalid Entries",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "count", label: "Count", type: "number", required: true },
      ],
    });

    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "invalid_entries",
          slug: "invalid-entry",
          status: "draft" as const,
          data: { title: "Invalid Entry" }, // Missing required 'count' field
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    const validation = await t.query(api.exportImport.validateImportPackage, {
      data: importPackage,
    });

    expect(validation.valid).toBe(false);
    expect(validation.invalidEntries).toBe(1);
    expect(validation.validationErrors.length).toBeGreaterThan(0);
    expect(validation.validationErrors[0].errors.some((e) => e.includes("required"))).toBe(
      true
    );
  });

  it("should filter validation by content type", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.contentTypeMutations.createContentType, {
      name: "filter_type_a",
      displayName: "Filter Type A",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
      ],
    });

    const importPackage = {
      version: "1.0" as const,
      exportedAt: Date.now(),
      entries: [
        {
          _originalId: "old-id-1",
          contentTypeName: "filter_type_a",
          slug: "entry-a",
          status: "draft" as const,
          data: { title: "Entry A" },
          version: 1,
          createdAt: Date.now(),
        },
        {
          _originalId: "old-id-2",
          contentTypeName: "filter_type_b", // This type doesn't exist
          slug: "entry-b",
          status: "draft" as const,
          data: { title: "Entry B" },
          version: 1,
          createdAt: Date.now(),
        },
      ],
    };

    // Validate only type A
    const validation = await t.query(api.exportImport.validateImportPackage, {
      data: importPackage,
      contentTypeFilter: ["filter_type_a"],
    });

    expect(validation.valid).toBe(true);
    expect(validation.totalEntries).toBe(1);
    expect(validation.validEntries).toBe(1);
  });
});

// =============================================================================
// Round-Trip Export/Import Tests
// =============================================================================

describe("Round-Trip Export/Import Tests", () => {
  it("should successfully export and import entries", async () => {
    const t = convexTest(schema, modules);

    // Create content type
    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "roundtrip_test",
        displayName: "Roundtrip Test",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "description", label: "Description", type: "text", required: false },
          { name: "featured", label: "Featured", type: "boolean", required: false },
        ],
      }
    );

    // Create original entries
    const originalEntry = await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: {
        title: "Original Entry",
        description: "This is the original",
        featured: true,
      },
      createdBy: "original-author",
    });

    // Export
    const exportData = await t.query(api.exportImport.exportEntries, {
      contentTypeName: "roundtrip_test",
    });

    expect(exportData.entries.length).toBe(1);
    expect(exportData.entries[0].data.title).toBe("Original Entry");

    // Delete the original entry
    await t.mutation(api.contentEntryMutations.deleteEntry, {
      id: originalEntry._id,
      hardDelete: true,
    });

    // Verify it's gone
    const deleted = await t.query(api.contentEntries.get, {
      id: originalEntry._id,
    });
    expect(deleted).toBeNull();

    // Import the exported data
    const importResult = await t.mutation(api.exportImport.importEntries, {
      data: exportData,
      importedBy: "import-user",
    });

    expect(importResult.success).toBe(true);
    expect(importResult.created).toBe(1);

    // Verify the entry was recreated
    const recreated = await t.query(api.contentEntries.getBySlugAndTypeName, {
      contentTypeName: "roundtrip_test",
      slug: "original-entry",
    });

    expect(recreated).not.toBeNull();
    expect(recreated?.data.title).toBe("Original Entry");
    expect(recreated?.data.description).toBe("This is the original");
    expect(recreated?.data.featured).toBe(true);
  });

  it("should handle locale data in round-trip", async () => {
    const t = convexTest(schema, modules);

    // Create content type
    const contentType = await t.mutation(
      api.contentTypeMutations.createContentType,
      {
        name: "locale_roundtrip",
        displayName: "Locale Roundtrip",
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
        ],
      }
    );

    // Create entry with locale
    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "English Entry" },
      locale: "en-US",
    });

    await t.mutation(api.contentEntryMutations.createEntry, {
      contentTypeId: contentType._id,
      data: { title: "Spanish Entry" },
      locale: "es-ES",
    });

    // Export with locale filter
    const exportData = await t.query(api.exportImport.exportEntries, {
      locale: "en-US",
    });

    expect(exportData.entries.length).toBe(1);
    expect(exportData.entries[0].locale).toBe("en-US");
  });
});
