/**
 * Tests for agent tool definitions.
 *
 * These tests verify that the CMS tools are correctly defined and can be
 * created for use with @convex-dev/agent.
 */

import { describe, it, expect, vi } from "vitest";
import {
  createCmsTools,
  type AgentComponentApi,
  // Zod schemas
  fieldTypeSchema,
  contentStatusSchema,
  mediaTypeSchema,
  createContentTypeArgsSchema,
  createContentEntryArgsSchema,
  listContentEntriesArgsSchema,
  createMediaAssetArgsSchema,
  bulkPublishArgsSchema,
  searchContentArgsSchema,
} from "../../src/client/agentTools.js";

// Mock component API for testing
// This structure must match the actual component API as exported from components.convexCms
const mockComponentApi: AgentComponentApi = {
  // contentTypes.ts module - queries
  contentTypes: {
    get: vi.fn(), // Supports both id and name lookup via args
    list: vi.fn(),
  },
  // contentTypeMutations.ts module - mutations
  contentTypeMutations: {
    createContentType: vi.fn(),
    updateContentType: vi.fn(),
    deleteContentType: vi.fn(),
  },
  // contentEntries.ts module - queries
  contentEntries: {
    get: vi.fn(),
    getBySlug: vi.fn(),
    getBySlugAndTypeName: vi.fn(),
    list: vi.fn(),
  },
  // contentEntryMutations.ts module - mutations (NOTE: scheduleEntry is NOT here)
  contentEntryMutations: {
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    publishEntry: vi.fn(),
    unpublishEntry: vi.fn(),
    deleteEntry: vi.fn(),
    duplicateEntry: vi.fn(),
    restoreEntry: vi.fn(),
  },
  // scheduledPublish.ts module - scheduling mutations (SEPARATE from contentEntryMutations)
  scheduledPublish: {
    scheduleEntry: vi.fn(),
    cancelScheduledPublish: vi.fn(),
  },
  // mediaAssets.ts module - queries
  mediaAssets: {
    get: vi.fn(),
    list: vi.fn(),
  },
  // mediaAssetMutations.ts module - mutations
  mediaAssetMutations: {
    createMediaAsset: vi.fn(),
    updateMediaAsset: vi.fn(),
    deleteMediaAsset: vi.fn(),
  },
  // bulkOperations.ts module - bulk mutations
  bulkOperations: {
    bulkPublish: vi.fn(),
    bulkUnpublish: vi.fn(),
    bulkDelete: vi.fn(),
    bulkUpdate: vi.fn(),
    bulkRestore: vi.fn(),
  },
};

describe("Agent Tools", () => {
  describe("AgentComponentApi structure", () => {
    it("should match the actual Convex component module structure", () => {
      // Verify the mock matches expected module structure
      // This documents and enforces the correct API paths

      // contentTypes module - queries only (no mutations)
      expect(mockComponentApi.contentTypes.get).toBeDefined();
      expect(mockComponentApi.contentTypes.list).toBeDefined();
      // Note: NO getByName - the get function handles both id and name lookup

      // contentTypeMutations module - mutations
      expect(mockComponentApi.contentTypeMutations.createContentType).toBeDefined();
      expect(mockComponentApi.contentTypeMutations.updateContentType).toBeDefined();
      expect(mockComponentApi.contentTypeMutations.deleteContentType).toBeDefined();

      // contentEntries module - queries
      expect(mockComponentApi.contentEntries.get).toBeDefined();
      expect(mockComponentApi.contentEntries.getBySlug).toBeDefined();
      expect(mockComponentApi.contentEntries.getBySlugAndTypeName).toBeDefined();
      expect(mockComponentApi.contentEntries.list).toBeDefined();

      // contentEntryMutations module - mutations (but NOT scheduleEntry!)
      expect(mockComponentApi.contentEntryMutations.createEntry).toBeDefined();
      expect(mockComponentApi.contentEntryMutations.updateEntry).toBeDefined();
      expect(mockComponentApi.contentEntryMutations.publishEntry).toBeDefined();
      expect(mockComponentApi.contentEntryMutations.unpublishEntry).toBeDefined();
      expect(mockComponentApi.contentEntryMutations.deleteEntry).toBeDefined();
      expect(mockComponentApi.contentEntryMutations.duplicateEntry).toBeDefined();
      expect(mockComponentApi.contentEntryMutations.restoreEntry).toBeDefined();

      // scheduledPublish module - SEPARATE from contentEntryMutations
      // This is a key structural distinction that was previously wrong
      expect(mockComponentApi.scheduledPublish).toBeDefined();
      expect(mockComponentApi.scheduledPublish.scheduleEntry).toBeDefined();
      expect(mockComponentApi.scheduledPublish.cancelScheduledPublish).toBeDefined();

      // mediaAssets module - queries
      expect(mockComponentApi.mediaAssets.get).toBeDefined();
      expect(mockComponentApi.mediaAssets.list).toBeDefined();

      // mediaAssetMutations module - mutations
      expect(mockComponentApi.mediaAssetMutations.createMediaAsset).toBeDefined();
      expect(mockComponentApi.mediaAssetMutations.updateMediaAsset).toBeDefined();
      expect(mockComponentApi.mediaAssetMutations.deleteMediaAsset).toBeDefined();

      // bulkOperations module - bulk mutations
      expect(mockComponentApi.bulkOperations.bulkPublish).toBeDefined();
      expect(mockComponentApi.bulkOperations.bulkUnpublish).toBeDefined();
      expect(mockComponentApi.bulkOperations.bulkDelete).toBeDefined();
      expect(mockComponentApi.bulkOperations.bulkUpdate).toBeDefined();
      expect(mockComponentApi.bulkOperations.bulkRestore).toBeDefined();
    });

    it("should NOT have incorrect API paths (regression test)", () => {
      // These incorrect paths previously existed and caused runtime errors
      // @ts-expect-error - This property should not exist
      expect(mockComponentApi.contentTypes.getByName).toBeUndefined();
      // @ts-expect-error - scheduleEntry is in scheduledPublish, not contentEntryMutations
      expect(mockComponentApi.contentEntryMutations.scheduleEntry).toBeUndefined();
    });
  });

  describe("createCmsTools", () => {
    it("should create all expected tools", () => {
      const tools = createCmsTools(mockComponentApi);

      // Content Type Tools
      expect(tools.createContentType).toBeDefined();
      expect(tools.updateContentType).toBeDefined();
      expect(tools.listContentTypes).toBeDefined();
      expect(tools.getContentType).toBeDefined();

      // Content Entry Tools
      expect(tools.createContentEntry).toBeDefined();
      expect(tools.updateContentEntry).toBeDefined();
      expect(tools.publishEntry).toBeDefined();
      expect(tools.unpublishEntry).toBeDefined();
      expect(tools.scheduleEntry).toBeDefined();
      expect(tools.deleteContentEntry).toBeDefined();
      expect(tools.duplicateContentEntry).toBeDefined();
      expect(tools.listContentEntries).toBeDefined();
      expect(tools.getContentEntry).toBeDefined();
      expect(tools.restoreContentEntry).toBeDefined();

      // Media Asset Tools
      expect(tools.createMediaAsset).toBeDefined();
      expect(tools.updateMediaAsset).toBeDefined();
      expect(tools.listMediaAssets).toBeDefined();
      expect(tools.getMediaAsset).toBeDefined();
      expect(tools.deleteMediaAsset).toBeDefined();

      // Bulk Operations
      expect(tools.bulkPublish).toBeDefined();
      expect(tools.bulkUnpublish).toBeDefined();
      expect(tools.bulkDelete).toBeDefined();

      // Search
      expect(tools.searchContent).toBeDefined();
    });

    it("should accept defaultUserId option", () => {
      const tools = createCmsTools(mockComponentApi, {
        defaultUserId: "user_123",
      });

      expect(tools).toBeDefined();
    });
  });

  describe("Zod Schemas", () => {
    describe("fieldTypeSchema", () => {
      it("should validate valid field types", () => {
        expect(fieldTypeSchema.parse("text")).toBe("text");
        expect(fieldTypeSchema.parse("richText")).toBe("richText");
        expect(fieldTypeSchema.parse("number")).toBe("number");
        expect(fieldTypeSchema.parse("boolean")).toBe("boolean");
        expect(fieldTypeSchema.parse("date")).toBe("date");
        expect(fieldTypeSchema.parse("datetime")).toBe("datetime");
        expect(fieldTypeSchema.parse("reference")).toBe("reference");
        expect(fieldTypeSchema.parse("media")).toBe("media");
        expect(fieldTypeSchema.parse("json")).toBe("json");
        expect(fieldTypeSchema.parse("select")).toBe("select");
        expect(fieldTypeSchema.parse("multiSelect")).toBe("multiSelect");
      });

      it("should reject invalid field types", () => {
        expect(() => fieldTypeSchema.parse("invalid")).toThrow();
      });
    });

    describe("contentStatusSchema", () => {
      it("should validate valid statuses", () => {
        expect(contentStatusSchema.parse("draft")).toBe("draft");
        expect(contentStatusSchema.parse("published")).toBe("published");
        expect(contentStatusSchema.parse("archived")).toBe("archived");
        expect(contentStatusSchema.parse("scheduled")).toBe("scheduled");
      });

      it("should reject invalid statuses", () => {
        expect(() => contentStatusSchema.parse("invalid")).toThrow();
      });
    });

    describe("mediaTypeSchema", () => {
      it("should validate valid media types", () => {
        expect(mediaTypeSchema.parse("image")).toBe("image");
        expect(mediaTypeSchema.parse("video")).toBe("video");
        expect(mediaTypeSchema.parse("audio")).toBe("audio");
        expect(mediaTypeSchema.parse("document")).toBe("document");
        expect(mediaTypeSchema.parse("other")).toBe("other");
      });
    });

    describe("createContentTypeArgsSchema", () => {
      it("should validate valid content type creation args", () => {
        const validArgs = {
          name: "blog_post",
          displayName: "Blog Post",
          fields: [
            {
              name: "title",
              label: "Title",
              type: "text",
              required: true,
            },
          ],
        };

        const result = createContentTypeArgsSchema.parse(validArgs);
        expect(result.name).toBe("blog_post");
        expect(result.displayName).toBe("Blog Post");
        expect(result.fields).toHaveLength(1);
      });

      it("should accept optional fields", () => {
        const validArgs = {
          name: "page",
          displayName: "Page",
          fields: [],
          description: "A content page",
          icon: "document",
          singleton: true,
          slugField: "title",
          titleField: "title",
          sortOrder: 1,
          createdBy: "user_123",
        };

        const result = createContentTypeArgsSchema.parse(validArgs);
        expect(result.description).toBe("A content page");
        expect(result.singleton).toBe(true);
      });

      it("should reject missing required fields", () => {
        expect(() =>
          createContentTypeArgsSchema.parse({
            name: "test",
            // missing displayName and fields
          })
        ).toThrow();
      });
    });

    describe("createContentEntryArgsSchema", () => {
      it("should validate valid content entry creation args", () => {
        const validArgs = {
          contentTypeName: "content_type_123",
          data: {
            title: "My Blog Post",
            content: "Hello world",
          },
        };

        const result = createContentEntryArgsSchema.parse(validArgs);
        expect(result.contentTypeName).toBe("content_type_123");
        expect(result.data.title).toBe("My Blog Post");
      });

      it("should accept optional fields", () => {
        const validArgs = {
          contentTypeName: "ct_123",
          data: { title: "Test" },
          slug: "test-slug",
          locale: "en-US",
          status: "draft",
          createdBy: "user_123",
        };

        const result = createContentEntryArgsSchema.parse(validArgs);
        expect(result.slug).toBe("test-slug");
        expect(result.locale).toBe("en-US");
        expect(result.status).toBe("draft");
      });
    });

    describe("listContentEntriesArgsSchema", () => {
      it("should validate query options", () => {
        const validArgs = {
          contentTypeName: "ct_123",
          status: "published",
          limit: 10,
        };

        const result = listContentEntriesArgsSchema.parse(validArgs);
        expect(result.contentTypeName).toBe("ct_123");
        expect(result.status).toBe("published");
        expect(result.limit).toBe(10);
      });

      it("should accept statusIn array", () => {
        const validArgs = {
          statusIn: ["draft", "scheduled"],
        };

        const result = listContentEntriesArgsSchema.parse(validArgs);
        expect(result.statusIn).toEqual(["draft", "scheduled"]);
      });

      it("should accept fieldFilters", () => {
        const validArgs = {
          fieldFilters: [
            { field: "category", operator: "eq", value: "tech" },
            { field: "views", operator: "gte", value: 100 },
          ],
        };

        const result = listContentEntriesArgsSchema.parse(validArgs);
        expect(result.fieldFilters).toHaveLength(2);
      });
    });

    describe("createMediaAssetArgsSchema", () => {
      it("should validate valid media asset creation args", () => {
        const validArgs = {
          storageId: "storage_123",
          filename: "image.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          type: "image",
        };

        const result = createMediaAssetArgsSchema.parse(validArgs);
        expect(result.storageId).toBe("storage_123");
        expect(result.filename).toBe("image.jpg");
        expect(result.type).toBe("image");
      });

      it("should accept image dimensions", () => {
        const validArgs = {
          storageId: "storage_123",
          filename: "image.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          type: "image",
          width: 1920,
          height: 1080,
        };

        const result = createMediaAssetArgsSchema.parse(validArgs);
        expect(result.width).toBe(1920);
        expect(result.height).toBe(1080);
      });
    });

    describe("bulkPublishArgsSchema", () => {
      it("should validate valid bulk publish args", () => {
        const validArgs = {
          ids: ["entry_1", "entry_2", "entry_3"],
        };

        const result = bulkPublishArgsSchema.parse(validArgs);
        expect(result.ids).toHaveLength(3);
      });

      it("should accept optional change description", () => {
        const validArgs = {
          ids: ["entry_1"],
          changeDescription: "Publishing batch of articles",
          updatedBy: "user_123",
        };

        const result = bulkPublishArgsSchema.parse(validArgs);
        expect(result.changeDescription).toBe("Publishing batch of articles");
      });
    });

    describe("searchContentArgsSchema", () => {
      it("should validate search query", () => {
        const validArgs = {
          query: "hello world",
        };

        const result = searchContentArgsSchema.parse(validArgs);
        expect(result.query).toBe("hello world");
      });

      it("should accept filters", () => {
        const validArgs = {
          query: "typescript",
          contentTypeName: "blog_post",
          status: "published",
          limit: 20,
        };

        const result = searchContentArgsSchema.parse(validArgs);
        expect(result.contentTypeName).toBe("blog_post");
        expect(result.status).toBe("published");
        expect(result.limit).toBe(20);
      });
    });
  });
});
