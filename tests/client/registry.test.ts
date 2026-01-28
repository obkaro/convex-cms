/**
 * Tests for the Content Type Registry
 */

import { describe, it, expect, beforeEach } from "vitest";
import { v } from "convex/values";
import {
  registerContentType,
  getCodeDefinedType,
  getAllCodeDefinedTypes,
  getCodeDefinedTypeNames,
  isCodeDefinedType,
  clearRegistry,
  getRegistrySize,
} from "../../src/client/registry.js";
import { defineContentType } from "../../src/client/schema/defineContentType.js";

describe("Content Type Registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe("registerContentType", () => {
    it("registers a content type definition", () => {
      const blogPost = defineContentType({
        name: "blog_post",
        validator: v.object({
          title: v.string(),
          content: v.string(),
        }),
        meta: {
          displayName: "Blog Post",
          titleField: "title",
        },
      });

      registerContentType(blogPost);

      expect(getRegistrySize()).toBe(1);
      expect(isCodeDefinedType("blog_post")).toBe(true);
    });

    it("throws when registering duplicate names", () => {
      const type1 = defineContentType({
        name: "article",
        validator: v.object({ title: v.string() }),
        meta: { displayName: "Article" },
      });

      const type2 = defineContentType({
        name: "article",
        validator: v.object({ name: v.string() }),
        meta: { displayName: "Article V2" },
      });

      registerContentType(type1);

      expect(() => registerContentType(type2)).toThrow(
        'Content type "article" is already registered'
      );
    });

    it("registers multiple distinct types", () => {
      const types = [
        defineContentType({
          name: "blog_post",
          validator: v.object({ title: v.string() }),
          meta: { displayName: "Blog Post" },
        }),
        defineContentType({
          name: "author",
          validator: v.object({ name: v.string() }),
          meta: { displayName: "Author" },
        }),
        defineContentType({
          name: "category",
          validator: v.object({ label: v.string() }),
          meta: { displayName: "Category" },
        }),
      ];

      types.forEach(registerContentType);

      expect(getRegistrySize()).toBe(3);
    });
  });

  describe("getCodeDefinedType", () => {
    it("returns the definition for a registered type", () => {
      const blogPost = defineContentType({
        name: "blog_post",
        validator: v.object({
          title: v.string(),
          content: v.string(),
        }),
        meta: {
          displayName: "Blog Post",
          titleField: "title",
        },
      });

      registerContentType(blogPost);

      const retrieved = getCodeDefinedType("blog_post");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.slug).toBe("blog_post");
      expect(retrieved?.name).toBe("Blog Post"); // Display name from meta
      expect(retrieved?.meta.displayName).toBe("Blog Post");
      expect(retrieved?.meta.titleField).toBe("title");
    });

    it("returns null for unregistered types", () => {
      const result = getCodeDefinedType("nonexistent");
      expect(result).toBeNull();
    });

    it("preserves validator reference", () => {
      const validator = v.object({ title: v.string() });
      const blogPost = defineContentType({
        name: "blog_post",
        validator,
        meta: { displayName: "Blog Post" },
      });

      registerContentType(blogPost);

      const retrieved = getCodeDefinedType("blog_post");
      expect(retrieved?.validator).toBe(validator);
    });
  });

  describe("getAllCodeDefinedTypes", () => {
    it("returns all registered types", () => {
      const blogPost = defineContentType({
        name: "blog_post",
        validator: v.object({ title: v.string() }),
        meta: { displayName: "Blog Post" },
      });

      const author = defineContentType({
        name: "author",
        validator: v.object({ name: v.string() }),
        meta: { displayName: "Author" },
      });

      registerContentType(blogPost);
      registerContentType(author);

      const all = getAllCodeDefinedTypes();

      expect(all).toHaveLength(2);
      expect(all.map((t) => t.slug)).toContain("blog_post");
      expect(all.map((t) => t.slug)).toContain("author");
    });

  });

  describe("getCodeDefinedTypeNames", () => {
    it("returns all registered type names", () => {
      registerContentType(
        defineContentType({
          name: "blog_post",
          validator: v.object({ title: v.string() }),
          meta: { displayName: "Blog Post" },
        })
      );

      registerContentType(
        defineContentType({
          name: "product",
          validator: v.object({ name: v.string() }),
          meta: { displayName: "Product" },
        })
      );

      const names = getCodeDefinedTypeNames();

      expect(names).toHaveLength(2);
      expect(names).toContain("blog_post");
      expect(names).toContain("product");
    });
  });

  describe("isCodeDefinedType", () => {
    it("returns true for registered types", () => {
      registerContentType(
        defineContentType({
          name: "blog_post",
          validator: v.object({ title: v.string() }),
          meta: { displayName: "Blog Post" },
        })
      );

      expect(isCodeDefinedType("blog_post")).toBe(true);
    });

    it("returns false for unregistered types", () => {
      expect(isCodeDefinedType("nonexistent")).toBe(false);
    });
  });

  describe("clearRegistry", () => {
    it("removes all registered types", () => {
      registerContentType(
        defineContentType({
          name: "blog_post",
          validator: v.object({ title: v.string() }),
          meta: { displayName: "Blog Post" },
        })
      );

      registerContentType(
        defineContentType({
          name: "author",
          validator: v.object({ name: v.string() }),
          meta: { displayName: "Author" },
        })
      );

      expect(getRegistrySize()).toBe(2);

      clearRegistry();

      expect(getRegistrySize()).toBe(0);
      expect(getAllCodeDefinedTypes()).toEqual([]);
      expect(isCodeDefinedType("blog_post")).toBe(false);
    });

    it("allows re-registering after clear", () => {
      const blogPost = defineContentType({
        name: "blog_post",
        validator: v.object({ title: v.string() }),
        meta: { displayName: "Blog Post" },
      });

      registerContentType(blogPost);
      clearRegistry();
      registerContentType(blogPost);

      expect(getRegistrySize()).toBe(1);
      expect(isCodeDefinedType("blog_post")).toBe(true);
    });
  });

});
