/**
 * Tests for defineContent API
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { v } from "convex/values";
import { createCms } from "../../src/client/defineContent.js";
import {
  clearRegistry,
  getCodeDefinedType,
  getAllCodeDefinedTypes,
} from "../../src/client/registry.js";

// Mock component API
function createMockComponentApi() {
  return {
    contentEntries: {
      get: vi.fn(),
      getBySlug: vi.fn(),
      list: vi.fn(),
      compareVersions: vi.fn(),
      count: vi.fn(),
      getBySlugAndTypeName: vi.fn(),
    },
    contentEntryMutations: {
      createEntry: vi.fn(),
      updateEntry: vi.fn(),
      publishEntry: vi.fn(),
      unpublishEntry: vi.fn(),
      deleteEntry: vi.fn(),
      restoreEntry: vi.fn(),
      duplicateEntry: vi.fn(),
    },
  } as unknown as Parameters<typeof createCms>[0];
}

// Mock context
function createMockQueryCtx() {
  return {
    runQuery: vi.fn(),
  };
}

function createMockMutationCtx() {
  return {
    runQuery: vi.fn(),
    runMutation: vi.fn(),
  };
}

describe("createCms", () => {
  beforeEach(() => {
    clearRegistry();
    vi.clearAllMocks();
  });

  it("creates a CMS instance with defineContent method", () => {
    const mockApi = createMockComponentApi();
    const cms = createCms(mockApi);

    expect(cms).toHaveProperty("defineContent");
    expect(typeof cms.defineContent).toBe("function");
  });
});

describe("defineContent", () => {
  beforeEach(() => {
    clearRegistry();
    vi.clearAllMocks();
  });

  describe("type definition", () => {
    it("generates slug from display name", () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({
          title: v.string(),
        }),
      });

      expect(blogPost.name).toBe("Blog Post");
      expect(blogPost.slug).toBe("blog_post");
    });

    it("registers the content type in the registry", () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);

      cms.defineContent({
        name: "Blog Post",
        fields: v.object({
          title: v.string(),
        }),
      });

      const registered = getCodeDefinedType("blog_post");
      expect(registered).not.toBeNull();
      expect(registered?.meta.displayName).toBe("Blog Post");
    });

    it("creates ContentTypeDefinition with proper structure", () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({
          title: v.string(),
          content: v.string(),
        }),
        display: {
          titleField: "title",
          icon: "📝",
          description: "Blog posts",
        },
      });

      expect(blogPost.definition).toBeDefined();
      expect(blogPost.definition.slug).toBe("blog_post");
      expect(blogPost.definition.name).toBe("Blog Post"); // Display name
      expect(blogPost.definition.meta.displayName).toBe("Blog Post");
      expect(blogPost.definition.meta.titleField).toBe("title");
      expect(blogPost.definition.meta.icon).toBe("📝");
      expect(blogPost.definition.meta.description).toBe("Blog posts");
    });

    it("throws for invalid content type names", () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);

      expect(() =>
        cms.defineContent({
          name: "123 Invalid",
          fields: v.object({ x: v.string() }),
        })
      ).toThrow("Invalid content type name");
    });

    it("allows defining multiple content types", () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);

      cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      cms.defineContent({
        name: "Author",
        fields: v.object({ name: v.string() }),
      });

      const types = getAllCodeDefinedTypes();
      expect(types).toHaveLength(2);
    });

    it("throws when defining duplicate type names", () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);

      cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      expect(() =>
        cms.defineContent({
          name: "Blog Post",
          fields: v.object({ content: v.string() }),
        })
      ).toThrow("already registered");
    });
  });

  describe("helper methods", () => {
    it("returns get method that calls component API", async () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);
      const ctx = createMockQueryCtx();

      const mockEntry = {
        _id: "entry123",
        _creationTime: Date.now(),
        contentTypeName: "blog_post",
        slug: "test-post",
        status: "published",
        data: { title: "Test" },
        version: 1,
      };

      ctx.runQuery.mockResolvedValue(mockEntry);

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      const result = await blogPost.get(ctx, { id: "entry123" });

      expect(ctx.runQuery).toHaveBeenCalledWith(
        mockApi.contentEntries.get,
        { id: "entry123" }
      );
      expect(result).toEqual(mockEntry);
    });

    it("returns getBySlug method that includes content type name", async () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);
      const ctx = createMockQueryCtx();

      ctx.runQuery.mockResolvedValue(null);

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      await blogPost.getBySlug(ctx, { slug: "my-post" });

      expect(ctx.runQuery).toHaveBeenCalledWith(
        mockApi.contentEntries.getBySlug,
        {
          contentTypeName: "blog_post",
          slug: "my-post",
          status: undefined,
        }
      );
    });

    it("returns list method with pagination", async () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);
      const ctx = createMockQueryCtx();

      ctx.runQuery.mockResolvedValue({
        page: [],
        continueCursor: null,
        isDone: true,
      });

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      await blogPost.list(ctx);

      expect(ctx.runQuery).toHaveBeenCalledWith(
        mockApi.contentEntries.list,
        {
          contentTypeName: "blog_post",
          status: undefined,
          locale: undefined,
          includeDeleted: undefined,
          paginationOpts: { numItems: 50, cursor: null },
        }
      );
    });

    it("returns create method that calls mutation API", async () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);
      const ctx = createMockMutationCtx();

      const mockEntry = {
        _id: "new123",
        _creationTime: Date.now(),
        contentTypeName: "blog_post",
        slug: "new-post",
        status: "draft",
        data: { title: "New Post" },
        version: 1,
      };

      ctx.runMutation.mockResolvedValue(mockEntry);

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      const result = await blogPost.create(ctx, {
        data: { title: "New Post" },
        slug: "new-post",
      });

      expect(ctx.runMutation).toHaveBeenCalledWith(
        mockApi.contentEntryMutations.createEntry,
        {
          contentTypeName: "blog_post",
          slug: "new-post",
          data: { title: "New Post" },
          status: "draft",
          locale: undefined,
          createdBy: undefined,
        }
      );
      expect(result).toEqual(mockEntry);
    });

    it("returns update method", async () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);
      const ctx = createMockMutationCtx();

      ctx.runMutation.mockResolvedValue({
        _id: "entry123",
        data: { title: "Updated" },
      });

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      await blogPost.update(ctx, {
        id: "entry123",
        data: { title: "Updated" },
      });

      expect(ctx.runMutation).toHaveBeenCalledWith(
        mockApi.contentEntryMutations.updateEntry,
        {
          id: "entry123",
          data: { title: "Updated" },
          slug: undefined,
          updatedBy: undefined,
        }
      );
    });

    it("returns publish method", async () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);
      const ctx = createMockMutationCtx();

      ctx.runMutation.mockResolvedValue({
        _id: "entry123",
        status: "published",
      });

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      await blogPost.publish(ctx, { id: "entry123" });

      expect(ctx.runMutation).toHaveBeenCalledWith(
        mockApi.contentEntryMutations.publishEntry,
        {
          id: "entry123",
          updatedBy: undefined,
        }
      );
    });

    it("returns unpublish method", async () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);
      const ctx = createMockMutationCtx();

      ctx.runMutation.mockResolvedValue({
        _id: "entry123",
        status: "draft",
      });

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      await blogPost.unpublish(ctx, { id: "entry123" });

      expect(ctx.runMutation).toHaveBeenCalledWith(
        mockApi.contentEntryMutations.unpublishEntry,
        {
          id: "entry123",
          updatedBy: undefined,
        }
      );
    });

    it("returns delete method", async () => {
      const mockApi = createMockComponentApi();
      const cms = createCms(mockApi);
      const ctx = createMockMutationCtx();

      ctx.runMutation.mockResolvedValue({
        _id: "entry123",
        deletedAt: Date.now(),
      });

      const blogPost = cms.defineContent({
        name: "Blog Post",
        fields: v.object({ title: v.string() }),
      });

      await blogPost.delete(ctx, { id: "entry123" });

      expect(ctx.runMutation).toHaveBeenCalledWith(
        mockApi.contentEntryMutations.deleteEntry,
        {
          id: "entry123",
          deletedBy: undefined,
          hardDelete: undefined,
        }
      );
    });
  });
});
