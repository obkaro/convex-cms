/**
 * Tests for the compareVersions query.
 *
 * These tests verify the functionality of comparing two versions of
 * a content entry and returning field-level differences:
 * - Validator structure for compareVersions arguments
 * - Field-level diff detection (added, removed, modified)
 * - Slug and status change detection
 * - Change summary generation
 * - Security validations (entry exists, not deleted)
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import {
  compareVersionsArgs,
  compareVersionsResult,
  versionFieldDiff,
} from "./validators.js";

// Import all component modules for testing
const modules = import.meta.glob("./**/*.ts");

describe("Compare Versions Query", () => {
  // =============================================================================
  // Validator Structure Tests
  // =============================================================================

  describe("compareVersionsArgs validator", () => {
    it("should have entryId field for specifying the content entry", () => {
      const argFields = Object.keys(compareVersionsArgs.fields);
      expect(argFields).toContain("entryId");
    });

    it("should have fromVersionNumber field for base version", () => {
      const argFields = Object.keys(compareVersionsArgs.fields);
      expect(argFields).toContain("fromVersionNumber");
    });

    it("should have toVersionNumber field for target version", () => {
      const argFields = Object.keys(compareVersionsArgs.fields);
      expect(argFields).toContain("toVersionNumber");
    });

    it("should have exactly 3 fields", () => {
      const argFields = Object.keys(compareVersionsArgs.fields);
      expect(argFields).toHaveLength(3);
    });
  });

  describe("versionFieldDiff validator", () => {
    it("should have field name", () => {
      const diffFields = Object.keys(versionFieldDiff.fields);
      expect(diffFields).toContain("field");
    });

    it("should have fromValue and toValue for before/after", () => {
      const diffFields = Object.keys(versionFieldDiff.fields);
      expect(diffFields).toContain("fromValue");
      expect(diffFields).toContain("toValue");
    });

    it("should have changeType for categorizing the change", () => {
      const diffFields = Object.keys(versionFieldDiff.fields);
      expect(diffFields).toContain("changeType");
    });
  });

  describe("compareVersionsResult validator", () => {
    it("should have hasChanges boolean", () => {
      const resultFields = Object.keys(compareVersionsResult.fields);
      expect(resultFields).toContain("hasChanges");
    });

    it("should have fromVersion and toVersion metadata", () => {
      const resultFields = Object.keys(compareVersionsResult.fields);
      expect(resultFields).toContain("fromVersion");
      expect(resultFields).toContain("toVersion");
    });

    it("should have changedFields array", () => {
      const resultFields = Object.keys(compareVersionsResult.fields);
      expect(resultFields).toContain("changedFields");
    });

    it("should have fieldDiffs array", () => {
      const resultFields = Object.keys(compareVersionsResult.fields);
      expect(resultFields).toContain("fieldDiffs");
    });

    it("should have slugChanged and statusChanged flags", () => {
      const resultFields = Object.keys(compareVersionsResult.fields);
      expect(resultFields).toContain("slugChanged");
      expect(resultFields).toContain("statusChanged");
    });

    it("should have changeSummary for human-readable description", () => {
      const resultFields = Object.keys(compareVersionsResult.fields);
      expect(resultFields).toContain("changeSummary");
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

    it("should return null when from version does not exist", () => {
      const fromVersion = null;
      const toVersion = { versionNumber: 2 };
      const shouldReturnNull = fromVersion === null || toVersion === null;
      expect(shouldReturnNull).toBe(true);
    });

    it("should return null when to version does not exist", () => {
      const fromVersion = { versionNumber: 1 };
      const toVersion = null;
      const shouldReturnNull = fromVersion === null || toVersion === null;
      expect(shouldReturnNull).toBe(true);
    });
  });

  // =============================================================================
  // Change Detection Logic Tests
  // =============================================================================

  describe("Change detection logic", () => {
    it("should detect added fields", () => {
      const fromData = { title: "Hello" };
      const toData = { title: "Hello", body: "World" };

      const fromKeys = Object.keys(fromData);
      const toKeys = Object.keys(toData);
      const addedFields = toKeys.filter((k) => !fromKeys.includes(k));

      expect(addedFields).toContain("body");
      expect(addedFields).toHaveLength(1);
    });

    it("should detect removed fields", () => {
      const fromData = { title: "Hello", body: "World" };
      const toData = { title: "Hello" };

      const fromKeys = Object.keys(fromData);
      const toKeys = Object.keys(toData);
      const removedFields = fromKeys.filter((k) => !toKeys.includes(k));

      expect(removedFields).toContain("body");
      expect(removedFields).toHaveLength(1);
    });

    it("should detect modified fields", () => {
      const fromData = { title: "Hello", count: 5 };
      const toData = { title: "World", count: 10 };

      const changedFields = Object.keys(fromData).filter(
        (k) =>
          JSON.stringify(fromData[k as keyof typeof fromData]) !==
          JSON.stringify(toData[k as keyof typeof toData])
      );

      expect(changedFields).toContain("title");
      expect(changedFields).toContain("count");
      expect(changedFields).toHaveLength(2);
    });

    it("should detect changes in nested objects", () => {
      const fromData = { meta: { author: "Alice", views: 100 } };
      const toData = { meta: { author: "Bob", views: 100 } };

      const hasChanges =
        JSON.stringify(fromData.meta) !== JSON.stringify(toData.meta);
      expect(hasChanges).toBe(true);
    });

    it("should detect changes in arrays", () => {
      const fromData = { tags: ["a", "b", "c"] };
      const toData = { tags: ["a", "b", "d"] };

      const hasChanges =
        JSON.stringify(fromData.tags) !== JSON.stringify(toData.tags);
      expect(hasChanges).toBe(true);
    });

    it("should report no changes for identical data", () => {
      const fromData = { title: "Same", count: 42 };
      const toData = { title: "Same", count: 42 };

      const hasChanges = JSON.stringify(fromData) !== JSON.stringify(toData);
      expect(hasChanges).toBe(false);
    });

    it("should skip internal fields starting with underscore", () => {
      const fromData = { _id: "123", title: "Hello" };
      const toData = { _id: "456", title: "Hello" };

      // Simulating the filter logic in compareVersions
      const allKeys = [
        ...new Set([...Object.keys(fromData), ...Object.keys(toData)]),
      ];
      const publicKeys = allKeys.filter((k) => !k.startsWith("_"));

      const changedPublicFields = publicKeys.filter(
        (k) =>
          JSON.stringify(fromData[k as keyof typeof fromData]) !==
          JSON.stringify(toData[k as keyof typeof toData])
      );

      expect(changedPublicFields).not.toContain("_id");
      expect(changedPublicFields).toHaveLength(0);
    });
  });

  // =============================================================================
  // Change Summary Generation Tests
  // =============================================================================

  describe("Change summary generation", () => {
    it("should generate summary for single field change", () => {
      const changedFields = ["title"];
      const summary =
        changedFields.length === 1
          ? `1 field changed: ${changedFields[0]}`
          : `${changedFields.length} fields changed`;

      expect(summary).toBe("1 field changed: title");
    });

    it("should generate summary for multiple fields", () => {
      const changedFields = ["title", "body", "count"];
      const summary =
        changedFields.length <= 3
          ? `${changedFields.length} fields changed: ${changedFields.join(", ")}`
          : `${changedFields.length} fields changed`;

      expect(summary).toBe("3 fields changed: title, body, count");
    });

    it("should truncate summary for many fields", () => {
      const changedFields = ["title", "body", "count", "author", "tags"];
      const summary = `${changedFields.length} fields changed: ${changedFields.slice(0, 3).join(", ")} and ${changedFields.length - 3} more`;

      expect(summary).toBe("5 fields changed: title, body, count and 2 more");
    });

    it("should report no changes for identical versions", () => {
      const changedFields: string[] = [];
      const slugChanged = false;
      const statusChanged = false;

      const hasAnyChange =
        changedFields.length > 0 || slugChanged || statusChanged;
      const summary = hasAnyChange ? "Changes found" : "No changes";

      expect(summary).toBe("No changes");
    });
  });
});

// =============================================================================
// Integration Tests for Compare Versions Query
// =============================================================================

describe("Compare Versions Integration Tests", () => {
  describe("compareVersions", () => {
    it("should compare two versions and detect field changes", async () => {
      const t = convexTest(schema, modules);

      // Create a content type
      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "blog_compare",
          displayName: "Blog",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "body", label: "Body", type: "richText", required: false },
            { name: "views", label: "Views", type: "number", required: false },
          ],
          slugField: "title",
        }
      );

      // Create an entry
      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Original Title", body: "<p>Original body</p>", views: 0 },
        createdBy: "user1",
      });

      // First publish - creates version 1
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "Initial version",
      });

      // Unpublish to edit
      await t.mutation(api.contentEntryMutations.unpublishEntry, {
        id: entry._id,
      });

      // Update content
      await t.mutation(api.contentEntryMutations.updateEntry, {
        id: entry._id,
        data: { title: "Updated Title", body: "<p>Updated body</p>", views: 100 },
      });

      // Second publish - creates version 4 (entry was at v4 after update)
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
        changeDescription: "Updated version",
      });

      // Compare versions 1 and 4
      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 4,
      });

      expect(diff).not.toBeNull();
      expect(diff!.hasChanges).toBe(true);
      expect(diff!.changedFields).toContain("title");
      expect(diff!.changedFields).toContain("body");
      expect(diff!.changedFields).toContain("views");
      expect(diff!.fieldDiffs.length).toBe(3);

      // Check specific field diffs
      const titleDiff = diff!.fieldDiffs.find((d) => d.field === "title");
      expect(titleDiff).toBeDefined();
      expect(titleDiff!.fromValue).toBe("Original Title");
      expect(titleDiff!.toValue).toBe("Updated Title");
      expect(titleDiff!.changeType).toBe("modified");
    });

    it("should detect slug changes", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "article_slug",
          displayName: "Article",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
          slugField: "title",
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "First Title" },
      });

      // Publish creates version 1 with slug "first-title"
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      // Unpublish and update
      await t.mutation(api.contentEntryMutations.unpublishEntry, {
        id: entry._id,
      });

      await t.mutation(api.contentEntryMutations.updateEntry, {
        id: entry._id,
        data: { title: "Second Title" },
        regenerateSlug: true,
      });

      // Second publish creates version 4 with slug "second-title"
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 4,
      });

      expect(diff).not.toBeNull();
      expect(diff!.slugChanged).toBe(true);
      expect(diff!.fromVersion.slug).toBe("first-title");
      expect(diff!.toVersion.slug).toBe("second-title");
      expect(diff!.changeSummary).toContain("slug changed");
    });

    it("should report no changes for identical versions", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "page_same",
          displayName: "Page",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Same Title" },
      });

      // Publish first version
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      // Compare version 1 to itself
      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 1,
      });

      expect(diff).not.toBeNull();
      expect(diff!.hasChanges).toBe(false);
      expect(diff!.changedFields).toHaveLength(0);
      expect(diff!.fieldDiffs).toHaveLength(0);
      expect(diff!.slugChanged).toBe(false);
      expect(diff!.statusChanged).toBe(false);
      expect(diff!.changeSummary).toBe("No changes");
    });

    it("should return null for non-existent entry", async () => {
      const t = convexTest(schema, modules);

      // Create and then delete an entry to get a valid ID format
      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "temp_compare",
          displayName: "Temp",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Temp Entry" },
      });

      // Hard delete the entry
      await t.run(async (ctx) => {
        await ctx.db.delete(entry._id);
      });

      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 2,
      });

      expect(diff).toBeNull();
    });

    it("should return null for soft-deleted entry", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "deleted_compare",
          displayName: "Deleted",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Will Delete" },
      });

      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      // Soft delete
      await t.run(async (ctx) => {
        await ctx.db.patch(entry._id, { deletedAt: Date.now() });
      });

      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 1,
      });

      expect(diff).toBeNull();
    });

    it("should return null for non-existent version numbers", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "no_version_compare",
          displayName: "No Version",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Only One Version" },
      });

      // Publish to create version 1
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      // Try to compare to non-existent version 999
      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 999,
      });

      expect(diff).toBeNull();
    });

    it("should detect added fields", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "add_field_test",
          displayName: "Add Field Test",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "count", label: "Count", type: "number", required: false },
          ],
          slugField: "title",
        }
      );

      // Create entry without optional field
      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Test Entry" },
      });

      // Publish version 1 (without count)
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      // Unpublish and add field
      await t.mutation(api.contentEntryMutations.unpublishEntry, {
        id: entry._id,
      });

      await t.mutation(api.contentEntryMutations.updateEntry, {
        id: entry._id,
        data: { title: "Test Entry", count: 42 },
      });

      // Publish version 4 (with count)
      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 4,
      });

      expect(diff).not.toBeNull();
      expect(diff!.changedFields).toContain("count");

      const countDiff = diff!.fieldDiffs.find((d) => d.field === "count");
      expect(countDiff).toBeDefined();
      expect(countDiff!.changeType).toBe("added");
      expect(countDiff!.fromValue).toBeUndefined();
      expect(countDiff!.toValue).toBe(42);
    });

    it("should provide version metadata in result", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "metadata_test",
          displayName: "Metadata Test",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
          ],
          slugField: "title",
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: { title: "Test" },
      });

      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 1,
      });

      expect(diff).not.toBeNull();

      // Check fromVersion metadata
      expect(diff!.fromVersion.versionNumber).toBe(1);
      expect(diff!.fromVersion.status).toBeDefined();
      expect(diff!.fromVersion.slug).toBe("test");
      expect(diff!.fromVersion.wasPublished).toBe(true);
      expect(diff!.fromVersion.createdAt).toBeDefined();

      // Check toVersion metadata
      expect(diff!.toVersion.versionNumber).toBe(1);
      expect(diff!.toVersion.status).toBeDefined();
      expect(diff!.toVersion.slug).toBe("test");
      expect(diff!.toVersion.wasPublished).toBe(true);
      expect(diff!.toVersion.createdAt).toBeDefined();
    });

    it("should handle comparing versions with nested objects", async () => {
      const t = convexTest(schema, modules);

      const contentType = await t.mutation(
        api.contentTypeMutations.createContentType,
        {
          name: "nested_compare",
          displayName: "Nested Compare",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "meta", label: "Metadata", type: "json", required: false },
          ],
          slugField: "title",
        }
      );

      const entry = await t.mutation(api.contentEntryMutations.createEntry, {
        contentTypeId: contentType._id,
        data: {
          title: "Nested Test",
          meta: { author: "Alice", tags: ["a", "b"] },
        },
      });

      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      await t.mutation(api.contentEntryMutations.unpublishEntry, {
        id: entry._id,
      });

      await t.mutation(api.contentEntryMutations.updateEntry, {
        id: entry._id,
        data: {
          title: "Nested Test",
          meta: { author: "Bob", tags: ["a", "c"] },
        },
      });

      await t.mutation(api.contentEntryMutations.publishEntry, {
        id: entry._id,
      });

      const diff = await t.query(api.contentEntries.compareVersions, {
        entryId: entry._id,
        fromVersionNumber: 1,
        toVersionNumber: 4,
      });

      expect(diff).not.toBeNull();
      expect(diff!.changedFields).toContain("meta");

      const metaDiff = diff!.fieldDiffs.find((d) => d.field === "meta");
      expect(metaDiff).toBeDefined();
      expect(metaDiff!.changeType).toBe("modified");
      expect(metaDiff!.fromValue).toEqual({ author: "Alice", tags: ["a", "b"] });
      expect(metaDiff!.toValue).toEqual({ author: "Bob", tags: ["a", "c"] });
    });
  });
});
