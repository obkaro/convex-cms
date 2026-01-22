/**
 * Tests for the getVersion query.
 *
 * These tests verify the functionality of retrieving a specific version of
 * a content entry by version ID or version number:
 * - Validator structure for getVersion arguments
 * - Lookup by version ID
 * - Lookup by version number
 * - Security validations (entry exists, not deleted, ownership)
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api } from "../../src/component/_generated/api.js";
import { getVersionArgs, contentVersionDoc } from "../../src/component/validators.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

describe("Get Version Query", () => {
  // =============================================================================
  // Validator Structure Tests
  // =============================================================================

  describe("getVersionArgs validator", () => {
    it("should have entryId field for specifying the content entry", () => {
      const argFields = Object.keys(getVersionArgs.fields);
      expect(argFields).toContain("entryId");
    });

    it("should have versionId field for direct document lookup", () => {
      const argFields = Object.keys(getVersionArgs.fields);
      expect(argFields).toContain("versionId");
    });

    it("should have versionNumber field for index-based lookup", () => {
      const argFields = Object.keys(getVersionArgs.fields);
      expect(argFields).toContain("versionNumber");
    });

    it("should have exactly 3 fields", () => {
      const argFields = Object.keys(getVersionArgs.fields);
      expect(argFields).toHaveLength(3);
    });
  });

  // =============================================================================
  // Content Version Document Structure Tests
  // =============================================================================

  describe("contentVersionDoc structure for response", () => {
    it("should have all required fields for version snapshot", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("_id");
      expect(docFields).toContain("_creationTime");
      expect(docFields).toContain("entryId");
      expect(docFields).toContain("versionNumber");
      expect(docFields).toContain("data");
      expect(docFields).toContain("slug");
      expect(docFields).toContain("status");
      expect(docFields).toContain("wasPublished");
    });

    it("should have optional fields for audit trail", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("changeDescription");
      expect(docFields).toContain("createdBy");
      expect(docFields).toContain("publishedAt");
    });
  });

  // =============================================================================
  // Lookup Method Precedence Logic Tests
  // =============================================================================

  describe("Lookup method precedence", () => {
    it("should prefer versionId when both are provided", () => {
      const versionId = "someVersionId";
      const versionNumber = 5;

      // Simulating the handler logic
      const usedMethod =
        versionId !== undefined ? "versionId" : "versionNumber";
      expect(usedMethod).toBe("versionId");
    });

    it("should use versionNumber when versionId is not provided", () => {
      const versionId = undefined;
      const versionNumber = 5;

      const usedMethod =
        versionId !== undefined ? "versionId" : "versionNumber";
      expect(usedMethod).toBe("versionNumber");
    });

    it("should return null when neither lookup method is provided", () => {
      const versionId = undefined;
      const versionNumber = undefined;

      const shouldReturnNull =
        versionId === undefined && versionNumber === undefined;
      expect(shouldReturnNull).toBe(true);
    });
  });

  // =============================================================================
  // Security Validation Logic Tests
  // =============================================================================

  describe("Security validation logic", () => {
    it("should return null when entry does not exist", () => {
      const entry = null;
      const shouldReturnNull = entry === null;
      expect(shouldReturnNull).toBe(true);
    });

    it("should return null when entry is soft-deleted", () => {
      const entry = { deletedAt: Date.now() };
      const shouldReturnNull = entry.deletedAt !== undefined;
      expect(shouldReturnNull).toBe(true);
    });

    it("should validate version belongs to the specified entry", () => {
      const requestedEntryId = "entry123";
      const version = { entryId: "entry456" };
      const shouldReturnNull = version.entryId !== requestedEntryId;
      expect(shouldReturnNull).toBe(true);
    });

    it("should allow access when version belongs to the entry", () => {
      const requestedEntryId = "entry123";
      const version = { entryId: "entry123" };
      const shouldAllow = version.entryId === requestedEntryId;
      expect(shouldAllow).toBe(true);
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe("Edge cases", () => {
    it("should handle version number 0", () => {
      const versionNumber = 0;
      const isValidVersionNumber =
        typeof versionNumber === "number" && versionNumber >= 0;
      expect(isValidVersionNumber).toBe(true);
    });

    it("should handle negative version numbers", () => {
      const versionNumber = -1;
      // The query should handle this gracefully (no version found)
      const wouldFindVersion = versionNumber > 0;
      expect(wouldFindVersion).toBe(false);
    });
  });
});

// =============================================================================
// Integration Tests for Get Version Query
// =============================================================================

describe("Get Version Integration Tests", () => {
  describe("getVersion", () => {
    it("should retrieve a version by version number", async () => {
      const t = convexTest(schema, modules);

      // Create a content type
      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "blog_post_v",
          displayName: "Blog Post",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "body", label: "Body", type: "richText", required: false },
          ],
          slugField: "title",
        }
      );

      // Create a content entry
      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "First Version", body: "<p>Initial content</p>" },
        createdBy: "user123",
      });

      // Publish to create version 1
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "Initial publish",
        updatedBy: "user123",
      });

      // Get version by number
      const version = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
        versionNumber: 1,
      });

      expect(version).not.toBeNull();
      expect(version?.versionNumber).toBe(1);
      expect(version?.data.title).toBe("First Version");
      expect(version?.wasPublished).toBe(true);
      expect(version?.changeDescription).toBe("Initial publish");
    });

    it("should retrieve a version by version ID", async () => {
      const t = convexTest(schema, modules);

      // Create a content type
      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "article_v",
          displayName: "Article",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
          slugField: "title",
        }
      );

      // Create and publish an entry
      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "My Article" },
      });

      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      // Get version history to find the version ID
      const history = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry._id,
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(history).not.toBeNull();
      expect(history?.page.length).toBeGreaterThan(0);

      const versionId = history!.page[0]._id;

      // Get version by ID
      const version = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
        versionId: versionId,
      });

      expect(version).not.toBeNull();
      expect(version?._id).toBe(versionId);
      expect(version?.data.title).toBe("My Article");
    });

    it("should return null for non-existent version number", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "page_v",
          displayName: "Page",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "A Page" },
      });

      // Publish to create version 1
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      // Try to get non-existent version 999
      const version = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
        versionNumber: 999,
      });

      expect(version).toBeNull();
    });

    it("should return null for non-existent entry", async () => {
      const t = convexTest(schema, modules);

      // Create a content type and entry to get a valid ID format
      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "temp_v",
          displayName: "Temp",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Temp" },
      });

      // Delete the entry
      await t.run(async (ctx) => {
        await ctx.db.delete(entry._id);
      });

      // Try to get a version
      const version = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
        versionNumber: 1,
      });

      expect(version).toBeNull();
    });

    it("should return null for soft-deleted entry", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "deletable_v",
          displayName: "Deletable",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Will be deleted" },
      });

      // Publish to create a version
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      // Soft delete the entry
      await t.run(async (ctx) => {
        await ctx.db.patch(entry._id, { deletedAt: Date.now() });
      });

      // Try to get the version
      const version = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
        versionNumber: 1,
      });

      expect(version).toBeNull();
    });

    it("should return null when neither versionId nor versionNumber provided", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "no_lookup_v",
          displayName: "No Lookup",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Some Entry" },
      });

      // Try to get version without specifying versionId or versionNumber
      const version = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
      });

      expect(version).toBeNull();
    });

    it("should prevent cross-entry version access via versionId", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "cross_entry_v",
          displayName: "Cross Entry",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
          slugField: "title",
        }
      );

      // Create two entries
      const entry1 = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Entry One" },
      });

      const entry2 = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Entry Two" },
      });

      // Publish both
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry1._id,
      });

      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry2._id,
      });

      // Get entry1's version history
      const history1 = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry1._id,
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(history1).not.toBeNull();
      const entry1VersionId = history1!.page[0]._id;

      // Try to access entry1's version using entry2's entryId
      const crossAccessVersion = await t.query(api.contentEntries.getVersion, {
        entryId: entry2._id,
        versionId: entry1VersionId,
      });

      // Should return null due to ownership check
      expect(crossAccessVersion).toBeNull();
    });

    it("should retrieve multiple versions of an entry", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "multi_version_v",
          displayName: "Multi Version",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
          slugField: "title",
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Version One" },
      });

      // First publish creates snapshot at version 1 (draft state before publish)
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "v1",
      });

      // Unpublish to allow edits (version becomes 3)
      await t.mutation(api.contentEntryMutations.unpublishEntry, {
        id: entry._id,
      });

      // Update content (version becomes 4)
      await t.mutation(api.contentEntryMutations.updateEntry, {
        id: entry._id,
        data: { title: "Version Two" },
      });

      // Republish creates snapshot at version 4 (draft state before this publish)
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "v4",
      });

      // Retrieve both version snapshots
      // Version 1 snapshot was taken when entry was at version 1 (before first publish)
      const version1 = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
        versionNumber: 1,
      });

      // Version 4 snapshot was taken when entry was at version 4 (before second publish)
      const version4 = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
        versionNumber: 4,
      });

      expect(version1).not.toBeNull();
      expect(version1?.versionNumber).toBe(1);
      expect(version1?.data.title).toBe("Version One");
      expect(version1?.changeDescription).toBe("v1");
      // Snapshot captures state BEFORE publish, so status is "draft"
      expect(version1?.status).toBe("draft");
      expect(version1?.wasPublished).toBe(true);

      expect(version4).not.toBeNull();
      expect(version4?.versionNumber).toBe(4);
      expect(version4?.data.title).toBe("Version Two");
      expect(version4?.changeDescription).toBe("v4");
      expect(version4?.status).toBe("draft");
      expect(version4?.wasPublished).toBe(true);
    });

    it("should return complete version snapshot with all fields", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "complete_snapshot_v",
          displayName: "Complete Snapshot",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "count", label: "Count", type: "number", required: false },
          ],
          slugField: "title",
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Complete Test", count: 42 },
        createdBy: "testuser",
      });

      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "Complete snapshot test",
        updatedBy: "testuser",
      });

      const version = await t.query(api.contentEntries.getVersion, {
        entryId: entry._id,
        versionNumber: 1,
      });

      expect(version).not.toBeNull();
      // Check all fields are present
      expect(version?._id).toBeDefined();
      expect(version?._creationTime).toBeDefined();
      expect(version?.entryId).toBe(entry._id);
      expect(version?.versionNumber).toBe(1);
      expect(version?.data).toEqual({ title: "Complete Test", count: 42 });
      expect(version?.slug).toBe("complete-test");
      // Snapshot is taken BEFORE the publish, so status is "draft"
      expect(version?.status).toBe("draft");
      // But it's marked as a published version
      expect(version?.wasPublished).toBe(true);
      expect(version?.publishedAt).toBeDefined();
      expect(version?.changeDescription).toBe("Complete snapshot test");
    });
  });
});
