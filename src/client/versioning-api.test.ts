/**
 * Client Versioning API Tests
 *
 * Verifies that the VersionsApi class provides correct version management
 * functionality including history retrieval, comparison, and rollback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCmsClient,
  VersionsApi,
  type TypedComponentApi,
  type ConvexContext,
  type ContentVersion,
  type PaginationResult,
} from "./index";

// Create a mock version document
const createMockVersion = (overrides: Partial<ContentVersion> = {}): ContentVersion => ({
  _id: "version_123",
  _creationTime: Date.now(),
  entryId: "entry_123",
  versionNumber: 1,
  data: { title: "Test Entry", body: "Test content" },
  slug: "test-entry",
  status: "draft",
  wasPublished: false,
  ...overrides,
});

// Create a mock pagination result for versions
const createMockVersionHistory = (
  versions: ContentVersion[] = [createMockVersion()],
  isDone = true
): PaginationResult<ContentVersion> => ({
  page: versions,
  continueCursor: isDone ? null : "cursor_abc",
  isDone,
});

// Mock component API - cast as TypedComponentApi for test flexibility
// In production, the actual generated ComponentApi provides full type safety
const createMockComponentApi = (): TypedComponentApi => ({
  contentEntries: {
    list: { _type: "query" } as any,
    get: { _type: "query" } as any,
    getBySlug: { _type: "query" } as any,
    getVersion: { _type: "query" } as any,
    getVersionHistory: { _type: "query" } as any,
    compareVersions: { _type: "query" } as any,
  },
  versionMutations: {
    rollbackVersion: { _type: "mutation" } as any,
  },
  // Minimal stubs for other namespaces
  contentTypes: {
    get: { _type: "query" } as any,
    list: { _type: "query" } as any,
  },
} as TypedComponentApi);

// Mock Convex context
const createMockContext = (mockImpl?: {
  runQuery?: (...args: any[]) => any;
  runMutation?: (...args: any[]) => any;
}): ConvexContext => ({
  runMutation: mockImpl?.runMutation ?? vi.fn().mockResolvedValue({ _id: "test-id", _creationTime: Date.now() }),
  runQuery: mockImpl?.runQuery ?? vi.fn().mockResolvedValue(null),
});

describe("VersionsApi", () => {
  let mockApi: TypedComponentApi;
  let mockCtx: ConvexContext;

  beforeEach(() => {
    mockApi = createMockComponentApi();
  });

  describe("getHistory", () => {
    it("calls getVersionHistory query with pagination options", async () => {
      const mockHistory = createMockVersionHistory([
        createMockVersion({ versionNumber: 3 }),
        createMockVersion({ versionNumber: 2 }),
        createMockVersion({ versionNumber: 1 }),
      ]);
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockHistory),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getHistory(mockCtx, {
        entryId: "entry_123",
        paginationOpts: { numItems: 10, cursor: null },
      });

      expect(result).not.toBeNull();
      expect(result!.page).toHaveLength(3);
      expect(mockCtx.runQuery).toHaveBeenCalledWith(
        mockApi.contentEntries.getVersionHistory,
        { entryId: "entry_123", paginationOpts: { numItems: 10, cursor: null } }
      );
    });

    it("throws error when versioning is disabled", async () => {
      mockCtx = createMockContext();
      const cms = createCmsClient(mockApi, {
        features: { versioning: false },
      });

      await expect(
        cms.versions.getHistory(mockCtx, {
          entryId: "entry_123",
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).rejects.toThrow("Versioning feature is not enabled");
    });
  });

  describe("get", () => {
    it("gets version by version number", async () => {
      const mockVersion = createMockVersion({ versionNumber: 3 });
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockVersion),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.get(mockCtx, {
        entryId: "entry_123",
        versionNumber: 3,
      });

      expect(result).not.toBeNull();
      expect(result!.versionNumber).toBe(3);
      expect(mockCtx.runQuery).toHaveBeenCalledWith(
        mockApi.contentEntries.getVersion,
        { entryId: "entry_123", versionNumber: 3 }
      );
    });

    it("gets version by version ID", async () => {
      const mockVersion = createMockVersion({ _id: "version_abc" });
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockVersion),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.get(mockCtx, {
        entryId: "entry_123",
        versionId: "version_abc",
      });

      expect(result).not.toBeNull();
      expect(result!._id).toBe("version_abc");
    });
  });

  describe("getByNumber", () => {
    it("is a convenience method for get with versionNumber", async () => {
      const mockVersion = createMockVersion({ versionNumber: 5 });
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockVersion),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getByNumber(mockCtx, "entry_123", 5);

      expect(result).not.toBeNull();
      expect(result!.versionNumber).toBe(5);
    });
  });

  describe("getById", () => {
    it("is a convenience method for get with versionId", async () => {
      const mockVersion = createMockVersion({ _id: "version_xyz" });
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockVersion),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getById(mockCtx, "entry_123", "version_xyz");

      expect(result).not.toBeNull();
      expect(result!._id).toBe("version_xyz");
    });
  });

  describe("getLatest", () => {
    it("returns the first version from history (newest)", async () => {
      const latestVersion = createMockVersion({ versionNumber: 5 });
      const mockHistory = createMockVersionHistory([latestVersion]);
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockHistory),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getLatest(mockCtx, "entry_123");

      expect(result).not.toBeNull();
      expect(result!.versionNumber).toBe(5);
    });

    it("returns null when no versions exist", async () => {
      const emptyHistory = createMockVersionHistory([]);
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(emptyHistory),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getLatest(mockCtx, "entry_123");

      expect(result).toBeNull();
    });
  });

  describe("getLatestPublished", () => {
    it("returns the first published version from history", async () => {
      const publishedVersion = createMockVersion({
        versionNumber: 3,
        wasPublished: true,
        publishedAt: Date.now(),
      });
      const draftVersion = createMockVersion({
        versionNumber: 5,
        wasPublished: false,
      });
      const mockHistory = createMockVersionHistory([draftVersion, publishedVersion]);
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockHistory),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getLatestPublished(mockCtx, "entry_123");

      expect(result).not.toBeNull();
      expect(result!.versionNumber).toBe(3);
      expect(result!.wasPublished).toBe(true);
    });

    it("returns null when no published versions exist", async () => {
      const draftVersions = [
        createMockVersion({ versionNumber: 2, wasPublished: false }),
        createMockVersion({ versionNumber: 1, wasPublished: false }),
      ];
      const mockHistory = createMockVersionHistory(draftVersions);
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockHistory),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getLatestPublished(mockCtx, "entry_123");

      expect(result).toBeNull();
    });
  });

  describe("getPublishedHistory", () => {
    it("returns only published versions", async () => {
      const versions = [
        createMockVersion({ versionNumber: 5, wasPublished: false }),
        createMockVersion({ versionNumber: 4, wasPublished: true }),
        createMockVersion({ versionNumber: 3, wasPublished: false }),
        createMockVersion({ versionNumber: 2, wasPublished: true }),
        createMockVersion({ versionNumber: 1, wasPublished: true }),
      ];
      const mockHistory = createMockVersionHistory(versions);
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockHistory),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getPublishedHistory(mockCtx, "entry_123");

      expect(result).toHaveLength(3);
      expect(result.every((v) => v.wasPublished)).toBe(true);
      expect(result.map((v) => v.versionNumber)).toEqual([4, 2, 1]);
    });

    it("respects the limit parameter", async () => {
      const versions = [
        createMockVersion({ versionNumber: 4, wasPublished: true }),
        createMockVersion({ versionNumber: 2, wasPublished: true }),
        createMockVersion({ versionNumber: 1, wasPublished: true }),
      ];
      const mockHistory = createMockVersionHistory(versions);
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(mockHistory),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.getPublishedHistory(mockCtx, "entry_123", 2);

      expect(result).toHaveLength(2);
    });
  });

  describe("compare", () => {
    it("compares two versions and detects changes", async () => {
      const v1 = createMockVersion({
        versionNumber: 1,
        data: { title: "Original Title", body: "Original body" },
        slug: "original-slug",
        status: "draft",
      });
      const v2 = createMockVersion({
        versionNumber: 3,
        data: { title: "Updated Title", body: "Original body", newField: "added" },
        slug: "updated-slug",
        status: "published",
      });

      mockCtx = createMockContext({
        runQuery: vi.fn()
          .mockResolvedValueOnce(v1) // First call for fromVersion
          .mockResolvedValueOnce(v2), // Second call for toVersion
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const diff = await cms.versions.compare(mockCtx, {
        entryId: "entry_123",
        fromVersion: 1,
        toVersion: 3,
      });

      expect(diff).not.toBeNull();
      expect(diff!.fromVersion.versionNumber).toBe(1);
      expect(diff!.toVersion.versionNumber).toBe(3);
      expect(diff!.slugChanged).toBe(true);
      expect(diff!.statusChanged).toBe(true);
      expect(diff!.summary.fieldsAdded).toBe(1); // newField
      expect(diff!.summary.fieldsModified).toBe(1); // title
      expect(diff!.summary.fieldsRemoved).toBe(0);
      expect(diff!.summary.totalChanges).toBe(2);
    });

    it("detects removed fields", async () => {
      const v1 = createMockVersion({
        versionNumber: 1,
        data: { title: "Title", subtitle: "Subtitle", body: "Body" },
      });
      const v2 = createMockVersion({
        versionNumber: 2,
        data: { title: "Title", body: "Body" }, // subtitle removed
      });

      mockCtx = createMockContext({
        runQuery: vi.fn()
          .mockResolvedValueOnce(v1)
          .mockResolvedValueOnce(v2),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const diff = await cms.versions.compare(mockCtx, {
        entryId: "entry_123",
        fromVersion: 1,
        toVersion: 2,
      });

      expect(diff).not.toBeNull();
      expect(diff!.summary.fieldsRemoved).toBe(1);
      expect(diff!.changes.find((c) => c.field === "subtitle")?.changeType).toBe("removed");
    });

    it("returns null when fromVersion not found", async () => {
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(null),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const diff = await cms.versions.compare(mockCtx, {
        entryId: "entry_123",
        fromVersion: 99,
        toVersion: 100,
      });

      expect(diff).toBeNull();
    });

    it("handles nested object comparison", async () => {
      const v1 = createMockVersion({
        versionNumber: 1,
        data: { metadata: { author: "John", tags: ["a", "b"] } },
      });
      const v2 = createMockVersion({
        versionNumber: 2,
        data: { metadata: { author: "Jane", tags: ["a", "b", "c"] } },
      });

      mockCtx = createMockContext({
        runQuery: vi.fn()
          .mockResolvedValueOnce(v1)
          .mockResolvedValueOnce(v2),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const diff = await cms.versions.compare(mockCtx, {
        entryId: "entry_123",
        fromVersion: 1,
        toVersion: 2,
      });

      expect(diff).not.toBeNull();
      expect(diff!.summary.fieldsModified).toBe(1); // metadata changed
    });
  });

  describe("exists", () => {
    it("returns true when version exists", async () => {
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(createMockVersion()),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.exists(mockCtx, "entry_123", 1);

      expect(result).toBe(true);
    });

    it("returns false when version does not exist", async () => {
      mockCtx = createMockContext({
        runQuery: vi.fn().mockResolvedValue(null),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.exists(mockCtx, "entry_123", 99);

      expect(result).toBe(false);
    });
  });

  describe("count", () => {
    it("counts total versions across pagination", async () => {
      const page1 = createMockVersionHistory(
        [createMockVersion(), createMockVersion()],
        false // has more
      );
      const page2 = createMockVersionHistory(
        [createMockVersion()],
        true // done
      );

      let callCount = 0;
      mockCtx = createMockContext({
        runQuery: vi.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? page1 : page2;
        }),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const count = await cms.versions.count(mockCtx, "entry_123");

      expect(count).toBe(3);
    });
  });

  describe("rollback", () => {
    it("calls rollbackVersion mutation", async () => {
      const rolledBackEntry = {
        _id: "entry_123",
        _creationTime: Date.now(),
        contentTypeId: "type_123",
        slug: "test-entry",
        status: "draft",
        data: { title: "Restored content" },
        version: 5,
      };
      mockCtx = createMockContext({
        runMutation: vi.fn().mockResolvedValue(rolledBackEntry),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const result = await cms.versions.rollback(mockCtx, {
        entryId: "entry_123",
        versionNumber: 3,
        updatedBy: "user_456",
      });

      expect(result._id).toBe("entry_123");
      expect(result.version).toBe(5);
      expect(mockCtx.runMutation).toHaveBeenCalledWith(
        mockApi.versionMutations.rollbackVersion,
        { entryId: "entry_123", versionNumber: 3, updatedBy: "user_456" }
      );
    });
  });

  describe("compareWithCurrent", () => {
    it("compares a version with the latest version", async () => {
      const v1 = createMockVersion({
        versionNumber: 1,
        data: { title: "Old Title" },
      });
      const latest = createMockVersion({
        versionNumber: 5,
        data: { title: "Current Title" },
      });
      const mockHistory = createMockVersionHistory([latest]);

      let queryCallCount = 0;
      mockCtx = createMockContext({
        runQuery: vi.fn().mockImplementation(() => {
          queryCallCount++;
          if (queryCallCount === 1) return v1; // getByNumber call
          return mockHistory; // getHistory call
        }),
      });

      const cms = createCmsClient(mockApi, { permissiveMode: true });
      const diff = await cms.versions.compareWithCurrent(mockCtx, "entry_123", 1);

      expect(diff).not.toBeNull();
      expect(diff!.fromVersion.versionNumber).toBe(1);
      expect(diff!.toVersion.versionNumber).toBe(5);
    });
  });
});

describe("VersionComparison Types", () => {
  it("exports VersionComparison type", async () => {
    // This test verifies the type is exported correctly
    const comparison: import("./types").VersionComparison = {
      fromVersion: createMockVersion({ versionNumber: 1 }),
      toVersion: createMockVersion({ versionNumber: 2 }),
      changes: [
        { field: "title", changeType: "modified", oldValue: "Old", newValue: "New" },
      ],
      slugChanged: false,
      statusChanged: false,
      summary: {
        fieldsAdded: 0,
        fieldsRemoved: 0,
        fieldsModified: 1,
        totalChanges: 1,
      },
    };

    expect(comparison.changes).toHaveLength(1);
    expect(comparison.summary.totalChanges).toBe(1);
  });

  it("exports FieldChange type with correct changeTypes", () => {
    const addedChange: import("./types").FieldChange = {
      field: "newField",
      changeType: "added",
      newValue: "value",
    };
    const removedChange: import("./types").FieldChange = {
      field: "oldField",
      changeType: "removed",
      oldValue: "value",
    };
    const modifiedChange: import("./types").FieldChange = {
      field: "existingField",
      changeType: "modified",
      oldValue: "old",
      newValue: "new",
    };

    expect(addedChange.changeType).toBe("added");
    expect(removedChange.changeType).toBe("removed");
    expect(modifiedChange.changeType).toBe("modified");
  });
});
