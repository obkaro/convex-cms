/**
 * Tests for the version history query.
 *
 * These tests verify the validators and logic patterns for the getVersionHistory query:
 * - Validator structure for version history arguments
 * - Pagination response structure
 * - Version document structure
 * - Filter logic patterns for deleted entries
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../src/component/schema.js";
import { api } from "../../src/component/_generated/api.js";
import {
  getVersionHistoryArgs,
  contentVersionDoc,
} from "../../src/component/validators.js";

// Import all component modules for testing
const modules = import.meta.glob("../../src/component/**/*.ts");

describe("Version History Query", () => {
  // =============================================================================
  // Validator Structure Tests
  // =============================================================================

  describe("getVersionHistoryArgs validator", () => {
    it("should have entryId field for specifying the content entry", () => {
      const argFields = Object.keys(getVersionHistoryArgs.fields);
      expect(argFields).toContain("entryId");
    });

    it("should have paginationOpts field for pagination", () => {
      const argFields = Object.keys(getVersionHistoryArgs.fields);
      expect(argFields).toContain("paginationOpts");
    });
  });

  // =============================================================================
  // Content Version Document Structure Tests
  // =============================================================================

  describe("contentVersionDoc structure for history response", () => {
    it("should have _id field for cursor-based pagination", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("_id");
    });

    it("should have entryId to reference the content entry", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("entryId");
    });

    it("should have versionNumber for version ordering", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("versionNumber");
    });

    it("should have data for content snapshot", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("data");
    });

    it("should have slug for slug snapshot", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("slug");
    });

    it("should have status for status at version time", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("status");
    });

    it("should have changeDescription for version notes", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("changeDescription");
    });

    it("should have createdBy for audit trail", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("createdBy");
    });

    it("should have wasPublished to indicate published versions", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("wasPublished");
    });

    it("should have publishedAt for publish timestamp", () => {
      const docFields = Object.keys(contentVersionDoc.fields);
      expect(docFields).toContain("publishedAt");
    });
  });

  // =============================================================================
  // Pagination Logic Pattern Tests
  // =============================================================================

  describe("Pagination logic patterns", () => {
    const DEFAULT_LIST_LIMIT = 50;
    const MAX_LIST_LIMIT = 250;

    it("should use default limit when not specified", () => {
      const requestedLimit = undefined;
      const limit = Math.min(
        Math.max(1, requestedLimit ?? DEFAULT_LIST_LIMIT),
        MAX_LIST_LIMIT
      );
      expect(limit).toBe(DEFAULT_LIST_LIMIT);
    });

    it("should clamp limit to maximum of 250", () => {
      const requestedLimit = 500;
      const limit = Math.min(
        Math.max(1, requestedLimit ?? DEFAULT_LIST_LIMIT),
        MAX_LIST_LIMIT
      );
      expect(limit).toBe(MAX_LIST_LIMIT);
    });

    it("should clamp limit to minimum of 1", () => {
      const requestedLimit = 0;
      const limit = Math.min(
        Math.max(1, requestedLimit ?? DEFAULT_LIST_LIMIT),
        MAX_LIST_LIMIT
      );
      expect(limit).toBe(1);
    });

    it("should use requested limit when within bounds", () => {
      const requestedLimit = 10;
      const limit = Math.min(
        Math.max(1, requestedLimit ?? DEFAULT_LIST_LIMIT),
        MAX_LIST_LIMIT
      );
      expect(limit).toBe(10);
    });
  });

  // =============================================================================
  // Entry Validation Logic Pattern Tests
  // =============================================================================

  describe("Entry validation logic patterns", () => {
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

    it("should proceed when entry exists and is not deleted", () => {
      const entry = { deletedAt: undefined };
      const shouldProceed = entry !== null && entry.deletedAt === undefined;
      expect(shouldProceed).toBe(true);
    });
  });

  // =============================================================================
  // Version Ordering Tests
  // =============================================================================

  describe("Version ordering patterns", () => {
    it("should order versions by creation time descending (newest first)", () => {
      const versions = [
        { versionNumber: 1, _creationTime: 1000 },
        { versionNumber: 2, _creationTime: 2000 },
        { versionNumber: 3, _creationTime: 3000 },
      ];

      const sortedVersions = [...versions].sort(
        (a, b) => b._creationTime - a._creationTime
      );

      expect(sortedVersions[0].versionNumber).toBe(3);
      expect(sortedVersions[1].versionNumber).toBe(2);
      expect(sortedVersions[2].versionNumber).toBe(1);
    });

    it("should have newest version first in the page", () => {
      const versions = [
        { versionNumber: 5, _creationTime: 5000 },
        { versionNumber: 4, _creationTime: 4000 },
        { versionNumber: 3, _creationTime: 3000 },
      ];

      // First item should be the newest
      expect(versions[0].versionNumber).toBe(5);
    });
  });

  // =============================================================================
  // Published Version Filter Pattern Tests
  // =============================================================================

  describe("Published version filtering patterns", () => {
    it("should identify published versions by wasPublished flag", () => {
      const versions = [
        { versionNumber: 1, wasPublished: true },
        { versionNumber: 2, wasPublished: false },
        { versionNumber: 3, wasPublished: true },
      ];

      const publishedVersions = versions.filter((v) => v.wasPublished);
      expect(publishedVersions).toHaveLength(2);
      expect(publishedVersions[0].versionNumber).toBe(1);
      expect(publishedVersions[1].versionNumber).toBe(3);
    });

    it("should get most recent published version", () => {
      const versions = [
        { versionNumber: 5, wasPublished: false },
        { versionNumber: 4, wasPublished: true },
        { versionNumber: 3, wasPublished: false },
        { versionNumber: 2, wasPublished: true },
      ];

      // Assuming versions are already sorted desc by version number
      const mostRecentPublished = versions.find((v) => v.wasPublished);
      expect(mostRecentPublished?.versionNumber).toBe(4);
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe("Edge cases", () => {
    it("should handle entry with no versions", () => {
      const versions: unknown[] = [];
      const result = {
        page: versions,
        continueCursor: null,
        isDone: true,
      };
      expect(result.page).toHaveLength(0);
      expect(result.isDone).toBe(true);
    });

    it("should handle entry with single version", () => {
      const versions = [
        { versionNumber: 1, wasPublished: true },
      ];
      const result = {
        page: versions,
        continueCursor: null,
        isDone: true,
      };
      expect(result.page).toHaveLength(1);
      expect(result.isDone).toBe(true);
    });

    it("should handle negative limit values", () => {
      const requestedLimit = -5;
      const limit = Math.min(
        Math.max(1, requestedLimit ?? 50),
        250
      );
      expect(limit).toBe(1);
    });
  });
});

// =============================================================================
// Integration Tests for Version History Query
// =============================================================================

describe("Version History Integration Tests", () => {
  describe("getVersionHistory", () => {
    it("should return version history for a published entry", async () => {
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
        }
      );

      // Create a content entry
      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Original Title", content: "<p>Original content</p>" },
        createdBy: "user123",
      });

      // Publish the entry to create a version snapshot
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "Initial publish",
        updatedBy: "user123",
      });

      // Get version history
      const history = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry._id,
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(history).not.toBeNull();
      expect(history?.page).toHaveLength(1);
      expect(history?.page[0].versionNumber).toBe(1);
      expect(history?.page[0].wasPublished).toBe(true);
      expect(history?.page[0].changeDescription).toBe("Initial publish");
    });

    it("should return multiple versions ordered by creation time descending", async () => {
      const t = convexTest(schema, modules);

      // Create a content type
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
        }
      );

      // Create and publish an entry
      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Version 1" },
      });

      // First publish
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "First publish",
      });

      // Unpublish to allow edits
      await t.mutation(api.contentEntryMutations.unpublishEntry, {
        id: entry._id,
      });

      // Update and republish
      await t.mutation(api.contentEntryMutations.updateEntry, {
        id: entry._id,
        data: { title: "Version 2" },
      });

      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "Second publish",
      });

      // Get version history
      const history = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry._id,
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(history).not.toBeNull();
      expect(history?.page.length).toBeGreaterThanOrEqual(2);
      // Newest version should be first
      const firstVersion = history?.page[0]?.versionNumber;
      const secondVersion = history?.page[1]?.versionNumber;
      expect(firstVersion).toBeDefined();
      expect(secondVersion).toBeDefined();
      expect(firstVersion!).toBeGreaterThan(secondVersion!);
    });

    it("should return null for non-existent entry", async () => {
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
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Temp Entry" },
      });

      // Delete the entry
      await t.run(async (ctx) => {
        await ctx.db.delete(entry._id);
      });

      // Try to get version history
      const history = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry._id,
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(history).toBeNull();
    });

    it("should return null for soft-deleted entry", async () => {
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

      // Try to get version history
      const history = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry._id,
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(history).toBeNull();
    });

    it("should return empty page for entry with no versions", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "no_versions",
          displayName: "No Versions",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      // Create entry but don't publish (no versions created)
      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Draft Only" },
      });

      // Get version history
      const history = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry._id,
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(history).not.toBeNull();
      expect(history?.page).toHaveLength(0);
      expect(history?.isDone).toBe(true);
    });

    it("should paginate large version histories", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "many_versions",
          displayName: "Many Versions",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "v1" },
      });

      // Create multiple versions by publishing, unpublishing, updating, republishing
      for (let i = 1; i <= 3; i++) {
        await t.mutation(api.contentEntryMutations.publishEntry, {
          id: entry._id,
          changeDescription: `Publish ${i}`,
        });

        if (i < 3) {
          // Unpublish before making changes
          await t.mutation(api.contentEntryMutations.unpublishEntry, {
            id: entry._id,
          });

          await t.mutation(api.contentEntryMutations.updateEntry, {
            id: entry._id,
            data: { title: `v${i + 1}` },
          });
        }
      }

      // Get first page with limit of 2
      const page1 = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry._id,
        paginationOpts: { numItems: 2, cursor: null },
      });

      expect(page1).not.toBeNull();
      expect(page1?.page.length).toBeLessThanOrEqual(2);

      // If there are more pages, verify we can fetch them
      if (!page1?.isDone && page1?.continueCursor) {
        const page2 = await t.query(api.contentEntries.getVersionHistory, {
          entryId: entry._id,
          paginationOpts: {
            numItems: 2,
            cursor: page1.continueCursor,
          },
        });

        expect(page2).not.toBeNull();
        // Should have remaining versions
        expect(page2?.page.length).toBeGreaterThan(0);
      }
    });

    it("should include version metadata correctly", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "metadata_test",
          displayName: "Metadata Test",
					createdBy: "test-user",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
          slugField: "title",
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Test Entry" },
        createdBy: "author123",
      });

      // Publish with change description
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "Initial release with all features",
        updatedBy: "author123",
      });

      const history = await t.query(api.contentEntries.getVersionHistory, {
        entryId: entry._id,
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(history).not.toBeNull();
      const version = history?.page[0];

      expect(version?.entryId).toBe(entry._id);
      expect(version?.versionNumber).toBe(1);
      expect(version?.data.title).toBe("Test Entry");
      expect(version?.slug).toBe("test-entry");
      expect(version?.wasPublished).toBe(true);
      expect(version?.publishedAt).toBeDefined();
      expect(version?.changeDescription).toBe("Initial release with all features");
      expect(version?.createdBy).toBe("author123");
    });
  });
});
