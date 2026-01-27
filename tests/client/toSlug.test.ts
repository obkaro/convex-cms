/**
 * Tests for toSlug utility
 */

import { describe, it, expect } from "vitest";
import { toSlug, isValidSlug } from "../../src/client/utils/toSlug.js";

describe("toSlug", () => {
  it("converts display names to slugs", () => {
    expect(toSlug("Blog Post")).toBe("blog_post");
    expect(toSlug("FAQ Page")).toBe("faq_page");
    expect(toSlug("Product Review")).toBe("product_review");
    expect(toSlug("About Us")).toBe("about_us");
  });

  it("handles single words", () => {
    expect(toSlug("Blog")).toBe("blog");
    expect(toSlug("Product")).toBe("product");
  });

  it("handles multiple spaces", () => {
    expect(toSlug("Blog   Post")).toBe("blog_post");
    expect(toSlug("  Spaced  Title  ")).toBe("spaced_title");
  });

  it("handles special characters", () => {
    expect(toSlug("Blog & News")).toBe("blog_news");
    expect(toSlug("FAQ's")).toBe("faq_s");
    expect(toSlug("Test-Case")).toBe("test_case");
    expect(toSlug("Version 2.0")).toBe("version_2_0");
  });

  it("handles numbers", () => {
    expect(toSlug("Page 1")).toBe("page_1");
    expect(toSlug("Section 2A")).toBe("section_2a");
  });

  it("handles already lowercase input", () => {
    expect(toSlug("blog_post")).toBe("blog_post");
    expect(toSlug("simple")).toBe("simple");
  });

  it("handles edge cases", () => {
    expect(toSlug("   ")).toBe("");
    expect(toSlug("---")).toBe("");
    expect(toSlug("A")).toBe("a");
  });
});

describe("isValidSlug", () => {
  it("accepts valid slugs", () => {
    expect(isValidSlug("blog_post")).toBe(true);
    expect(isValidSlug("product")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
    expect(isValidSlug("a1")).toBe(true);
    expect(isValidSlug("type_with_numbers_123")).toBe(true);
  });

  it("rejects slugs starting with numbers", () => {
    expect(isValidSlug("1blog")).toBe(false);
    expect(isValidSlug("123")).toBe(false);
  });

  it("rejects slugs starting with underscores", () => {
    expect(isValidSlug("_blog")).toBe(false);
    expect(isValidSlug("_")).toBe(false);
  });

  it("rejects slugs with uppercase letters", () => {
    expect(isValidSlug("Blog")).toBe(false);
    expect(isValidSlug("blogPost")).toBe(false);
  });

  it("rejects slugs with special characters", () => {
    expect(isValidSlug("blog-post")).toBe(false);
    expect(isValidSlug("blog.post")).toBe(false);
    expect(isValidSlug("blog post")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects slugs over 50 characters", () => {
    const longSlug = "a".repeat(51);
    expect(isValidSlug(longSlug)).toBe(false);

    const maxSlug = "a".repeat(50);
    expect(isValidSlug(maxSlug)).toBe(true);
  });
});
