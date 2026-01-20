/**
 * Integration Tests for Test Helpers Module
 *
 * Verifies that test helpers work correctly with convex-test.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import {
  contentTypeFactory,
  contentEntryFactory,
  mediaFolderFactory,
  assertContentType,
  assertContentEntry,
  schema,
} from "./test.js";

// Import all component modules for testing
const modules = import.meta.glob("./component/**/*.ts");

describe("Test Helpers Integration with convex-test", () => {
  beforeEach(() => {
    contentEntryFactory.resetCounter();
  });

  describe("contentTypeFactory with convex-test", () => {
    it("can insert a blogPost content type into the database", async () => {
      const t = convexTest(schema, modules);

      // Create content type using factory
      const blogPostData = contentTypeFactory.blogPost();

      // Insert into database
      const contentTypeId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_types", blogPostData);
      });

      // Retrieve and verify
      const result = await t.run(async (ctx) => {
        return await ctx.db.get(contentTypeId);
      });

      expect(result).not.toBeNull();
      assertContentType(result);
      expect(result?.name).toBe("blog_post");
      expect(result?.fields.length).toBeGreaterThan(0);
    });

    it("can create multiple content types using factories", async () => {
      const t = convexTest(schema, modules);

      // Create multiple content types
      await t.run(async (ctx) => {
        await ctx.db.insert("content_types", contentTypeFactory.blogPost());
        await ctx.db.insert("content_types", contentTypeFactory.product());
        await ctx.db.insert("content_types", contentTypeFactory.author());
        await ctx.db.insert("content_types", contentTypeFactory.category());
      });

      // Verify all were created
      const types = await t.run(async (ctx) => {
        return await ctx.db.query("content_types").collect();
      });

      expect(types).toHaveLength(4);

      const names = types.map((t) => t.name);
      expect(names).toContain("blog_post");
      expect(names).toContain("product");
      expect(names).toContain("author");
      expect(names).toContain("category");
    });

    it("can use overrides to customize factory output", async () => {
      const t = convexTest(schema, modules);

      const customType = contentTypeFactory.blogPost({
        name: "news_article",
        displayName: "News Article",
        description: "Breaking news articles",
        singleton: false,
      });

      const typeId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_types", customType);
      });

      const result = await t.run(async (ctx) => {
        return await ctx.db.get(typeId);
      });

      expect(result?.name).toBe("news_article");
      expect(result?.displayName).toBe("News Article");
      expect(result?.description).toBe("Breaking news articles");
      // Should still have blog post fields
      expect(result?.fields.length).toBeGreaterThan(0);
    });
  });

  describe("contentEntryFactory with convex-test", () => {
    it("can insert entries using factory data", async () => {
      const t = convexTest(schema, modules);

      // First create a content type
      const contentTypeId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_types", contentTypeFactory.blogPost());
      });

      // Create entry using factory
      const entryData = contentEntryFactory.draft(
        contentTypeId as unknown as string,
        { title: "My First Post", content: "<p>Hello world!</p>" }
      );

      // Insert (need to cast contentTypeId properly)
      const entryId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_entries", {
          ...entryData,
          contentTypeId: contentTypeId,
        });
      });

      // Retrieve and verify
      const result = await t.run(async (ctx) => {
        return await ctx.db.get(entryId);
      });

      expect(result).not.toBeNull();
      assertContentEntry(result);
      expect(result?.status).toBe("draft");
      expect(result?.data.title).toBe("My First Post");
    });

    it("can create published entries with proper timestamps", async () => {
      const t = convexTest(schema, modules);

      const contentTypeId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_types", contentTypeFactory.blogPost());
      });

      const publishedData = contentEntryFactory.published(
        contentTypeId as unknown as string,
        { title: "Published Article" }
      );

      const entryId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_entries", {
          ...publishedData,
          contentTypeId: contentTypeId,
        });
      });

      const result = await t.run(async (ctx) => {
        return await ctx.db.get(entryId);
      });

      expect(result?.status).toBe("published");
      expect(result?.firstPublishedAt).toBeDefined();
      expect(result?.lastPublishedAt).toBeDefined();
    });

    it("can create batch entries", async () => {
      const t = convexTest(schema, modules);

      const contentTypeId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_types", contentTypeFactory.blogPost());
      });

      // Create batch of entries
      const batchData = contentEntryFactory.batch(
        contentTypeId as unknown as string,
        5,
        (_, index) => ({
          data: { title: `Post ${index + 1}` },
          slug: `post-${index + 1}`,
        })
      );

      // Insert all entries
      await t.run(async (ctx) => {
        for (const entry of batchData) {
          await ctx.db.insert("content_entries", {
            ...entry,
            contentTypeId: contentTypeId,
          });
        }
      });

      // Verify
      const entries = await t.run(async (ctx) => {
        return await ctx.db.query("content_entries").collect();
      });

      expect(entries).toHaveLength(5);
    });
  });

  describe("mediaFolderFactory with convex-test", () => {
    it("can create folder hierarchy", async () => {
      const t = convexTest(schema, modules);

      // Create root folder
      const rootFolderId = await t.run(async (ctx) => {
        return await ctx.db.insert(
          "media_folders",
          mediaFolderFactory.root("images")
        );
      });

      // Create child folder
      const childFolderId = await t.run(async (ctx) => {
        return await ctx.db.insert(
          "media_folders",
          mediaFolderFactory.child("2024", rootFolderId as unknown as string, "/images")
        );
      });

      // Verify structure
      const folders = await t.run(async (ctx) => {
        return await ctx.db.query("media_folders").collect();
      });

      expect(folders).toHaveLength(2);

      const rootFolder = folders.find((f) => f.name === "images");
      const childFolder = folders.find((f) => f.name === "2024");

      expect(rootFolder?.path).toBe("/images");
      expect(childFolder?.path).toBe("/images/2024");
      expect(childFolder?.parentId).toBe(rootFolderId);
    });

    it("can create common folder structure", async () => {
      const t = convexTest(schema, modules);

      const commonFolders = mediaFolderFactory.common();

      await t.run(async (ctx) => {
        await ctx.db.insert("media_folders", commonFolders.images);
        await ctx.db.insert("media_folders", commonFolders.videos);
        await ctx.db.insert("media_folders", commonFolders.documents);
      });

      const folders = await t.run(async (ctx) => {
        return await ctx.db.query("media_folders").collect();
      });

      expect(folders).toHaveLength(3);

      const names = folders.map((f) => f.name);
      expect(names).toContain("images");
      expect(names).toContain("videos");
      expect(names).toContain("documents");
    });
  });

  describe("Using allFieldTypes for comprehensive testing", () => {
    it("validates all field types are properly stored", async () => {
      const t = convexTest(schema, modules);

      const allFieldsType = contentTypeFactory.allFieldTypes();

      const typeId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_types", allFieldsType);
      });

      const result = await t.run(async (ctx) => {
        return await ctx.db.get(typeId);
      });

      // Verify all 11 field types are present
      expect(result?.fields).toHaveLength(11);

      const fieldTypes = result?.fields.map((f: { type: string }) => f.type);
      expect(fieldTypes).toContain("text");
      expect(fieldTypes).toContain("richText");
      expect(fieldTypes).toContain("number");
      expect(fieldTypes).toContain("boolean");
      expect(fieldTypes).toContain("date");
      expect(fieldTypes).toContain("datetime");
      expect(fieldTypes).toContain("reference");
      expect(fieldTypes).toContain("media");
      expect(fieldTypes).toContain("json");
      expect(fieldTypes).toContain("select");
      expect(fieldTypes).toContain("multiSelect");
    });
  });

  describe("Soft delete scenarios", () => {
    it("creates properly soft-deleted entries", async () => {
      const t = convexTest(schema, modules);

      const contentTypeId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_types", contentTypeFactory.minimal());
      });

      const deletedData = contentEntryFactory.deleted(
        contentTypeId as unknown as string,
        { title: "Deleted Post" }
      );

      const entryId = await t.run(async (ctx) => {
        return await ctx.db.insert("content_entries", {
          ...deletedData,
          contentTypeId: contentTypeId,
        });
      });

      const result = await t.run(async (ctx) => {
        return await ctx.db.get(entryId);
      });

      expect(result?.deletedAt).toBeDefined();
      expect(typeof result?.deletedAt).toBe("number");
    });
  });
});
