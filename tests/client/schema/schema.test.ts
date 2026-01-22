/**
 * Tests for the Code-Only Schema System
 *
 * These tests verify:
 * 1. defineContentType() creates valid definitions
 * 2. Type inference works correctly with Convex validators
 * 3. createContentSchema() properly aggregates definitions
 * 4. toFieldDefinitions() correctly converts validators to database format
 * 5. Schema validation catches invalid configurations
 */

import { describe, it, expect } from "vitest";
import { v, Infer } from "convex/values";
import {
  defineContentType,
  createContentSchema,
  toFieldDefinitions,
} from "../../../src/client/../../src/client/schema/defineContentType.js";
import { isContentTypeDefinition } from "../../../src/client/../../src/client/schema/types.js";
import type { InferContentType, InferSchema } from "../../../src/client/../../src/client/schema/types.js";

// =============================================================================
// Test Content Type Definitions
// =============================================================================

describe("defineContentType", () => {
  it("creates a valid content type definition with a simple validator", () => {
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

    expect(blogPost.name).toBe("blog_post");
    expect(blogPost.meta.displayName).toBe("Blog Post");
    expect(blogPost.meta.titleField).toBe("title");
    expect(blogPost._type).toBe("content_type_definition");
  });

  it("creates a definition with complex nested validators", () => {
    const product = defineContentType({
      name: "product",
      validator: v.object({
        name: v.string(),
        price: v.number(),
        description: v.optional(v.string()),
        variants: v.array(
          v.object({
            sku: v.string(),
            name: v.string(),
            price: v.number(),
          })
        ),
        seo: v.optional(
          v.object({
            title: v.string(),
            description: v.string(),
          })
        ),
      }),
      meta: {
        displayName: "Product",
        titleField: "name",
        fields: {
          name: { label: "Product Name", searchable: true },
          price: { label: "Base Price" },
          variants: { label: "Variants", renderAs: "json" },
          seo: { label: "SEO Settings", renderAs: "json" },
        },
      },
    });

    expect(product.name).toBe("product");
    expect(product.meta.fields?.name?.searchable).toBe(true);
    expect(product.meta.fields?.variants?.renderAs).toBe("json");
  });

  it("creates a definition with union types (for select fields)", () => {
    const article = defineContentType({
      name: "article",
      validator: v.object({
        title: v.string(),
        category: v.union(
          v.literal("tech"),
          v.literal("news"),
          v.literal("opinion")
        ),
        status: v.optional(
          v.union(v.literal("draft"), v.literal("review"), v.literal("published"))
        ),
      }),
      meta: {
        displayName: "Article",
        titleField: "title",
        fields: {
          category: {
            label: "Category",
            renderAs: "select",
            options: [
              { value: "tech", label: "Technology" },
              { value: "news", label: "News" },
              { value: "opinion", label: "Opinion" },
            ],
          },
        },
      },
    });

    expect(article.name).toBe("article");
    expect(article.meta.fields?.category?.options?.length).toBe(3);
  });

  it("creates a frozen (immutable) definition", () => {
    const post = defineContentType({
      name: "post",
      validator: v.object({ title: v.string() }),
      meta: { displayName: "Post" },
    });

    // Should be frozen
    expect(Object.isFrozen(post)).toBe(true);

    // Attempting to modify should throw in strict mode or be silently ignored
    expect(() => {
      // @ts-expect-error Testing immutability
      post.name = "different_name";
    }).toThrow();
  });

  it("validates content type name format", () => {
    // Valid names
    expect(() =>
      defineContentType({
        name: "blog_post",
        validator: v.object({ title: v.string() }),
        meta: { displayName: "Blog Post" },
      })
    ).not.toThrow();

    expect(() =>
      defineContentType({
        name: "product123",
        validator: v.object({ name: v.string() }),
        meta: { displayName: "Product" },
      })
    ).not.toThrow();

    // Invalid names - must start with lowercase letter
    expect(() =>
      defineContentType({
        name: "BlogPost", // Uppercase
        validator: v.object({ title: v.string() }),
        meta: { displayName: "Blog Post" },
      })
    ).toThrow(/Invalid content type name/);

    expect(() =>
      defineContentType({
        name: "123post", // Starts with number
        validator: v.object({ title: v.string() }),
        meta: { displayName: "Post" },
      })
    ).toThrow(/Invalid content type name/);

    expect(() =>
      defineContentType({
        name: "blog-post", // Contains hyphen
        validator: v.object({ title: v.string() }),
        meta: { displayName: "Blog Post" },
      })
    ).toThrow(/Invalid content type name/);

    expect(() =>
      defineContentType({
        name: "", // Empty
        validator: v.object({ title: v.string() }),
        meta: { displayName: "Empty" },
      })
    ).toThrow(/Content type name is required/);
  });
});

// =============================================================================
// Type Inference Tests
// =============================================================================

describe("type inference", () => {
  it("infers correct types from simple validators", () => {
    const blogPost = defineContentType({
      name: "blog_post",
      validator: v.object({
        title: v.string(),
        content: v.string(),
        views: v.number(),
        published: v.boolean(),
      }),
      meta: { displayName: "Blog Post" },
    });

    // Runtime verification that the definition was created
    expect(blogPost.name).toBe("blog_post");

    // Type test: InferContentType should match Infer<typeof validator>
    type BlogPostData = InferContentType<typeof blogPost>;
    type ExpectedType = Infer<typeof blogPost.validator>;

    // These type assertions verify the types match at compile time
    const _typeCheck1: BlogPostData = {
      title: "Hello",
      content: "World",
      views: 100,
      published: true,
    };

    const _typeCheck2: ExpectedType = _typeCheck1;

    // Runtime check - data structure is valid
    expect(_typeCheck1.title).toBe("Hello");
    expect(_typeCheck1.views).toBe(100);
  });

  it("infers correct types with optional fields", () => {
    const author = defineContentType({
      name: "author",
      validator: v.object({
        name: v.string(),
        bio: v.optional(v.string()),
        avatar: v.optional(v.string()),
        socialLinks: v.optional(
          v.array(
            v.object({
              platform: v.string(),
              url: v.string(),
            })
          )
        ),
      }),
      meta: { displayName: "Author" },
    });

    // Runtime verification that the definition was created
    expect(author.name).toBe("author");

    type AuthorData = InferContentType<typeof author>;

    // With all fields
    const fullAuthor: AuthorData = {
      name: "John Doe",
      bio: "A writer",
      avatar: "https://example.com/avatar.jpg",
      socialLinks: [{ platform: "twitter", url: "https://twitter.com/johndoe" }],
    };

    // With only required fields
    const minimalAuthor: AuthorData = {
      name: "Jane Doe",
    };

    expect(fullAuthor.name).toBe("John Doe");
    expect(minimalAuthor.bio).toBeUndefined();
  });

  it("infers correct types with nested objects", () => {
    const product = defineContentType({
      name: "product",
      validator: v.object({
        name: v.string(),
        pricing: v.object({
          basePrice: v.number(),
          currency: v.string(),
          discount: v.optional(v.number()),
        }),
      }),
      meta: { displayName: "Product" },
    });

    // Runtime verification
    expect(product.name).toBe("product");

    type ProductData = InferContentType<typeof product>;

    const product1: ProductData = {
      name: "Widget",
      pricing: {
        basePrice: 99.99,
        currency: "USD",
        discount: 10,
      },
    };

    expect(product1.pricing.basePrice).toBe(99.99);
    expect(product1.pricing.discount).toBe(10);
  });
});

// =============================================================================
// Content Schema Tests
// =============================================================================

describe("createContentSchema", () => {
  const blogPost = defineContentType({
    name: "blog_post",
    validator: v.object({
      title: v.string(),
      content: v.string(),
    }),
    meta: { displayName: "Blog Post" },
  });

  const author = defineContentType({
    name: "author",
    validator: v.object({
      name: v.string(),
      bio: v.optional(v.string()),
    }),
    meta: { displayName: "Author" },
  });

  const product = defineContentType({
    name: "product",
    validator: v.object({
      name: v.string(),
      price: v.number(),
    }),
    meta: { displayName: "Product" },
  });

  it("creates a schema from multiple definitions", () => {
    const schema = createContentSchema({ blogPost, author, product });

    expect(schema.getContentTypeNames()).toEqual(["blog_post", "author", "product"]);
    expect(schema.hasContentType("blog_post")).toBe(true);
    expect(schema.hasContentType("nonexistent")).toBe(false);
  });

  it("provides getDefinition by name", () => {
    const schema = createContentSchema({ blogPost, author });

    const blogDef = schema.getDefinition("blog_post");
    expect(blogDef?.name).toBe("blog_post");
    expect(blogDef?.meta.displayName).toBe("Blog Post");

    const notFound = schema.getDefinition("nonexistent");
    expect(notFound).toBeUndefined();
  });

  it("provides getDefinitionByKey for typed access", () => {
    const schema = createContentSchema({ blogPost, author });

    const blogDef = schema.getDefinitionByKey("blogPost");
    expect(blogDef.name).toBe("blog_post");

    const authorDef = schema.getDefinitionByKey("author");
    expect(authorDef.name).toBe("author");
  });

  it("detects duplicate content type names", () => {
    const duplicateBlog = defineContentType({
      name: "blog_post", // Same name as blogPost
      validator: v.object({ headline: v.string() }),
      meta: { displayName: "Duplicate Blog" },
    });

    expect(() =>
      createContentSchema({ blogPost, duplicateBlog })
    ).toThrow(/Duplicate content type name "blog_post"/);
  });

  it("freezes the schema to prevent mutation", () => {
    const schema = createContentSchema({ blogPost });

    expect(Object.isFrozen(schema)).toBe(true);
  });
});

// =============================================================================
// Schema Type Inference Tests
// =============================================================================

describe("InferSchema", () => {
  it("infers all content types from a schema", () => {
    const blogPost = defineContentType({
      name: "blog_post",
      validator: v.object({
        title: v.string(),
        content: v.string(),
      }),
      meta: { displayName: "Blog Post" },
    });

    const author = defineContentType({
      name: "author",
      validator: v.object({
        name: v.string(),
        email: v.string(),
      }),
      meta: { displayName: "Author" },
    });

    const schema = createContentSchema({ blogPost, author });

    // Runtime verification
    expect(schema.getContentTypeNames().length).toBe(2);

    // Type test: InferSchema gives us a mapped type
    type ContentTypes = InferSchema<typeof schema.definitions>;

    // Type checks at compile time
    const blogData: ContentTypes["blog_post"] = {
      title: "Hello",
      content: "World",
    };

    const authorData: ContentTypes["author"] = {
      name: "John",
      email: "john@example.com",
    };

    expect(blogData.title).toBe("Hello");
    expect(authorData.email).toBe("john@example.com");
  });
});

// =============================================================================
// toFieldDefinitions Tests
// =============================================================================

describe("toFieldDefinitions", () => {
  it("converts a simple definition to field definitions", () => {
    const blogPost = defineContentType({
      name: "blog_post",
      validator: v.object({
        title: v.string(),
        content: v.string(),
      }),
      meta: {
        displayName: "Blog Post",
        fields: {
          title: { label: "Title", maxLength: 200 },
          content: { label: "Content", renderAs: "richText", searchable: true },
        },
      },
    });

    const fields = toFieldDefinitions(blogPost);

    // Should extract field metadata
    const titleField = fields.find((f) => f.name === "title");
    const contentField = fields.find((f) => f.name === "content");

    expect(titleField).toBeDefined();
    expect(titleField?.label).toBe("Title");
    expect(titleField?.options?.maxLength).toBe(200);

    expect(contentField).toBeDefined();
    expect(contentField?.label).toBe("Content");
    expect(contentField?.type).toBe("richText");
    expect(contentField?.searchable).toBe(true);
  });

  it("uses field name as label if not specified in meta", () => {
    const simple = defineContentType({
      name: "simple",
      validator: v.object({
        myField: v.string(),
      }),
      meta: {
        displayName: "Simple",
        // No fields metadata
      },
    });

    const fields = toFieldDefinitions(simple);
    const myField = fields.find((f) => f.name === "myField");

    // Should use field name as label
    expect(myField?.label).toBe("myField");
  });
});

// =============================================================================
// isContentTypeDefinition Tests
// =============================================================================

describe("isContentTypeDefinition", () => {
  it("returns true for valid content type definitions", () => {
    const blogPost = defineContentType({
      name: "blog_post",
      validator: v.object({ title: v.string() }),
      meta: { displayName: "Blog Post" },
    });

    expect(isContentTypeDefinition(blogPost)).toBe(true);
  });

  it("returns false for non-definitions", () => {
    expect(isContentTypeDefinition(null)).toBe(false);
    expect(isContentTypeDefinition(undefined)).toBe(false);
    expect(isContentTypeDefinition({})).toBe(false);
    expect(isContentTypeDefinition({ name: "test" })).toBe(false);
    expect(isContentTypeDefinition({ _type: "something_else" })).toBe(false);
    expect(isContentTypeDefinition("string")).toBe(false);
    expect(isContentTypeDefinition(123)).toBe(false);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("edge cases", () => {
  it("handles empty fields object in meta", () => {
    const empty = defineContentType({
      name: "empty_fields",
      validator: v.object({
        title: v.string(),
      }),
      meta: {
        displayName: "Empty Fields",
        fields: {},
      },
    });

    expect(empty.meta.fields).toEqual({});
  });

  it("handles deeply nested validators", () => {
    const complex = defineContentType({
      name: "complex",
      validator: v.object({
        level1: v.object({
          level2: v.object({
            level3: v.object({
              value: v.string(),
            }),
          }),
        }),
      }),
      meta: { displayName: "Complex" },
    });

    // Runtime verification
    expect(complex.name).toBe("complex");

    type ComplexData = InferContentType<typeof complex>;

    const data: ComplexData = {
      level1: {
        level2: {
          level3: {
            value: "deep",
          },
        },
      },
    };

    expect(data.level1.level2.level3.value).toBe("deep");
  });

  it("handles arrays of primitives and objects", () => {
    const withArrays = defineContentType({
      name: "with_arrays",
      validator: v.object({
        tags: v.array(v.string()),
        items: v.array(
          v.object({
            id: v.string(),
            value: v.number(),
          })
        ),
      }),
      meta: { displayName: "With Arrays" },
    });

    // Runtime verification
    expect(withArrays.name).toBe("with_arrays");

    type ArrayData = InferContentType<typeof withArrays>;

    const data: ArrayData = {
      tags: ["a", "b", "c"],
      items: [
        { id: "1", value: 10 },
        { id: "2", value: 20 },
      ],
    };

    expect(data.tags).toHaveLength(3);
    expect(data.items[0].value).toBe(10);
  });

  it("handles record types", () => {
    const withRecord = defineContentType({
      name: "with_record",
      validator: v.object({
        attributes: v.record(v.string(), v.string()),
        metadata: v.optional(v.record(v.string(), v.number())),
      }),
      meta: { displayName: "With Record" },
    });

    // Runtime verification
    expect(withRecord.name).toBe("with_record");

    type RecordData = InferContentType<typeof withRecord>;

    const data: RecordData = {
      attributes: {
        color: "red",
        size: "large",
      },
      metadata: {
        count: 5,
        rating: 4.5,
      },
    };

    expect(data.attributes.color).toBe("red");
    expect(data.metadata?.count).toBe(5);
  });
});
