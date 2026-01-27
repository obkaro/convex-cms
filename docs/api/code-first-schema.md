# Code-First Schema System

This document describes the type-safe, code-first approach to defining content types using Convex validators.

## Overview

Convex CMS offers two approaches for defining content types:

| Approach | Use Case | Type Safety | Requires Deploy |
|----------|----------|-------------|-----------------|
| **Code-First** (`defineContentType`) | Static schemas, typed apps | Full TypeScript inference | Yes |
| **Imperative** (`cms.contentTypes.create`) | Dynamic schemas, admin UI | Runtime validation only | No |

The code-first approach is ideal when you want:
- TypeScript to catch errors at compile time
- Full autocompletion for content data
- Schemas version-controlled in git
- Stable content structures that rarely change

## Quick Start

```typescript
import { v } from "convex/values";
import { defineContentType, createContentSchema, createTypedCmsClient } from "convex-cms";
import { components } from "./_generated/api";

// 1. Define content types with Convex validators
const blogPost = defineContentType({
  name: "blog_post",
  validator: v.object({
    title: v.string(),
    content: v.string(),
    publishedAt: v.optional(v.number()),
  }),
  meta: {
    displayName: "Blog Post",
    titleField: "title",
  },
});

// 2. Combine into a schema
const contentSchema = createContentSchema({ blogPost });

// 3. Create a typed CMS client
export const cms = createTypedCmsClient(components.convexCms, {
  schema: contentSchema,
});

// 4. Use with full type inference
const post = await cms.typedContentEntries.get<"blog_post">(ctx, id);
post.data.title;    // string - TypeScript knows the type
post.data.typo;     // Error: Property 'typo' does not exist
```

---

## defineContentType

Creates a type-safe content type definition.

### Signature

```typescript
function defineContentType<TName extends string, TValidator extends ObjectValidator>(
  config: ContentTypeConfig<TName, TValidator>
): ContentTypeDefinition<TName, TValidator>
```

### Parameters

```typescript
interface ContentTypeConfig<TName, TValidator> {
  /**
   * Machine-readable name (lowercase, underscores, max 64 chars).
   * @example "blog_post", "product_variant"
   */
  name: TName;

  /**
   * Convex validator defining the data structure.
   * Use v.object() from "convex/values".
   */
  validator: TValidator;

  /**
   * UI and behavior configuration.
   */
  meta?: ContentTypeMeta<TValidator>;
}
```

### ContentTypeMeta

```typescript
interface ContentTypeMeta<TValidator> {
  /**
   * Human-readable name for admin UI.
   * @default Derived from name
   */
  displayName?: string;

  /**
   * Help text for content editors.
   */
  description?: string;

  /**
   * Field to use as the entry title in lists.
   * Must be a string field from the validator.
   */
  titleField?: string;

  /**
   * Field to use for URL slug generation.
   * If not set, slugs are generated from titleField.
   */
  slugField?: string;

  /**
   * Whether only one entry of this type can exist.
   * @default false
   */
  singleton?: boolean;

  /**
   * Field-level metadata for UI hints and validation.
   */
  fields?: Record<string, FieldMeta>;
}
```

### FieldMeta

Field-level configuration for UI rendering, validation, and behavior.

```typescript
interface FieldMeta {
  // General
  label?: string;              // Display label (defaults to field name)
  description?: string;        // Help text for editors
  renderAs?: FieldRenderAs;    // Override inferred field type
  searchable?: boolean;        // Include in search index
  localized?: boolean;         // Enable per-locale values
  placeholder?: string;        // Input placeholder
  hidden?: boolean;            // Hide in admin UI
  readOnly?: boolean;          // Disable editing
  defaultValue?: unknown;      // Default value

  // Text fields
  minLength?: number;
  maxLength?: number;
  pattern?: string;            // Regex validation
  patternMessage?: string;     // Error message for pattern
  multiline?: boolean;         // Use textarea

  // Number fields
  min?: number;
  max?: number;
  step?: number;
  precision?: number;          // Decimal places
  prefix?: string;             // e.g., "$"
  suffix?: string;             // e.g., "%"

  // Boolean fields
  trueLabel?: string;          // Label when true
  falseLabel?: string;         // Label when false

  // Date/datetime fields
  minDate?: string;            // ISO format
  maxDate?: string;
  timezone?: string;           // IANA timezone
  format?: string;             // Display format

  // Reference/media fields
  allowedContentTypes?: string[];  // Restrict references
  allowedMimeTypes?: string[];     // Restrict media types
  multiple?: boolean;          // Allow arrays
  minItems?: number;
  maxItems?: number;
  maxFileSize?: number;        // Bytes

  // Select fields
  options?: Array<{ value: string; label: string }>;
  minSelections?: number;
  maxSelections?: number;

  // Rich text fields
  allowedBlocks?: string[];    // Allowed block types
  allowedMarks?: string[];     // Allowed inline formatting

  // Taxonomy fields (tags/category)
  taxonomyId?: string;
  taxonomyName?: string;       // Alternative to ID
  allowCreate?: boolean;       // Create terms inline
  maxTags?: number;
  minTags?: number;
  depth?: number;              // Max category depth
  allowMultiple?: boolean;     // Multiple categories
}
```

### FieldRenderAs

Controls how the admin UI renders a field when the type can't be inferred:

| Value | Use Case |
|-------|----------|
| `text` | Single-line text input |
| `richText` | WYSIWYG editor |
| `textarea` | Multi-line plain text |
| `number` | Numeric input |
| `boolean` | Toggle switch |
| `date` | Date picker |
| `datetime` | Date + time picker |
| `reference` | Content entry selector |
| `media` | Media asset picker |
| `select` | Dropdown |
| `multiSelect` | Multi-select dropdown |
| `json` | JSON editor |
| `slug` | Slug input with auto-generation |
| `code` | Code editor |
| `color` | Color picker |
| `url` | URL input with validation |
| `email` | Email input with validation |

---

## Type Inference

Types are automatically inferred from Convex validators:

| Validator | Inferred Field Type |
|-----------|---------------------|
| `v.string()` | `text` |
| `v.number()` | `number` |
| `v.boolean()` | `boolean` |
| `v.id("table")` | `reference` |
| `v.bytes()` | `media` |
| `v.array()` / `v.object()` | `json` |
| `v.union(v.literal())` | `select` |

### Overriding Inferred Types

Use `renderAs` when the inferred type isn't what you want:

```typescript
const blogPost = defineContentType({
  name: "blog_post",
  validator: v.object({
    title: v.string(),
    content: v.string(),  // Would infer "text"
  }),
  meta: {
    fields: {
      content: {
        renderAs: "richText",  // Override to rich text editor
        searchable: true,
      },
    },
  },
});
```

---

## createContentSchema

Combines multiple content type definitions into a schema.

```typescript
function createContentSchema<T extends Record<string, ContentTypeDefinition>>(
  definitions: T
): ContentSchemaInstance<T>
```

### Example

```typescript
const blogPost = defineContentType({ ... });
const author = defineContentType({ ... });
const category = defineContentType({ ... });

const contentSchema = createContentSchema({
  blogPost,
  author,
  category,
});

// Access definitions
contentSchema.hasContentType("blog_post");  // true
contentSchema.getContentType("author");     // AuthorDefinition
```

---

## createTypedCmsClient

Creates a CMS client with type-safe content entry methods.

```typescript
function createTypedCmsClient<TSchema>(
  componentApi: ComponentApi,
  config: TypedCmsClientConfig<TSchema>
): TypedCmsClient<TSchema>
```

### Configuration

```typescript
interface TypedCmsClientConfig<TSchema> extends ComponentConfig {
  /**
   * The content schema with type definitions.
   */
  schema: TSchema;

  // ... all other ComponentConfig options
}
```

### Typed Methods

The client provides a `typedContentEntries` namespace with type-safe methods:

```typescript
// Get with typed data
const post = await cms.typedContentEntries.get<"blog_post">(ctx, id);
post.data.title;  // TypeScript knows this is string

// Create with typed data
const newPost = await cms.typedContentEntries.create<"blog_post">(ctx, {
  contentTypeName: "blog_post",
  data: {
    title: "Hello World",    // Required - TypeScript checks this
    content: "<p>...</p>",   // Required
    publishedAt: Date.now(), // Optional
  },
});

// Update with partial typed data
await cms.typedContentEntries.update<"blog_post">(ctx, {
  id: post._id,
  data: { title: "Updated Title" },  // Only update title
});

// List with typed results
const { page } = await cms.typedContentEntries.list<"blog_post">(ctx, {
  contentTypeName: "blog_post",
  paginationOpts: { numItems: 10 },
});
for (const entry of page) {
  console.log(entry.data.title);  // Typed
}

// Publish/unpublish
await cms.typedContentEntries.publish<"blog_post">(ctx, post._id);
await cms.typedContentEntries.unpublish<"blog_post">(ctx, post._id);
```

---

## toFieldDefinitions

Converts a code-first definition to the database format for registration.

```typescript
function toFieldDefinitions(
  definition: ContentTypeDefinition
): DatabaseFieldDefinition[]
```

### Registering Code-First Types

After defining content types in code, register them in the database:

```typescript
import { toFieldDefinitions } from "convex-cms";

// In a mutation or setup script:
const blogPost = defineContentType({ ... });

const fields = toFieldDefinitions(blogPost);

await cms.contentTypes.create(ctx, {
  name: blogPost.name,
  displayName: blogPost.meta.displayName,
  fields,
  titleField: blogPost.meta.titleField,
  slugField: blogPost.meta.slugField,
  createdBy: userId,
});
```

---

## Full Example

```typescript
// convex/schema.ts
import { v } from "convex/values";
import { defineContentType, createContentSchema } from "convex-cms";

export const blogPost = defineContentType({
  name: "blog_post",
  validator: v.object({
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    content: v.string(),
    coverImage: v.optional(v.string()),
    authorId: v.id("users"),
    tags: v.array(v.string()),
    publishedAt: v.optional(v.number()),
    featured: v.boolean(),
  }),
  meta: {
    displayName: "Blog Post",
    description: "Articles for the company blog",
    titleField: "title",
    slugField: "slug",
    fields: {
      title: {
        label: "Title",
        maxLength: 200,
        searchable: true,
      },
      slug: {
        label: "URL Slug",
        renderAs: "slug",
        pattern: "^[a-z0-9-]+$",
        patternMessage: "Slug must be lowercase letters, numbers, and hyphens",
      },
      excerpt: {
        label: "Excerpt",
        maxLength: 500,
        multiline: true,
        description: "Brief summary for previews",
      },
      content: {
        label: "Content",
        renderAs: "richText",
        searchable: true,
        allowedBlocks: ["paragraph", "heading", "list", "image", "code"],
      },
      coverImage: {
        label: "Cover Image",
        renderAs: "media",
        allowedMimeTypes: ["image/*"],
      },
      authorId: {
        label: "Author",
        allowedContentTypes: ["author"],
      },
      tags: {
        label: "Tags",
        maxItems: 10,
      },
      publishedAt: {
        label: "Publish Date",
        renderAs: "datetime",
      },
      featured: {
        label: "Featured",
        defaultValue: false,
        trueLabel: "Yes, feature this post",
        falseLabel: "No",
      },
    },
  },
});

export const author = defineContentType({
  name: "author",
  validator: v.object({
    name: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
  }),
  meta: {
    displayName: "Author",
    titleField: "name",
    fields: {
      name: { label: "Full Name", maxLength: 100 },
      email: { label: "Email", renderAs: "email" },
      bio: { label: "Biography", renderAs: "richText" },
      avatar: { label: "Profile Photo", renderAs: "media" },
    },
  },
});

export const contentSchema = createContentSchema({
  blogPost,
  author,
});

// Infer types for external use
export type BlogPostData = Infer<typeof blogPost.validator>;
export type AuthorData = Infer<typeof author.validator>;
```

```typescript
// convex/cms.ts
import { createTypedCmsClient } from "convex-cms";
import { components } from "./_generated/api";
import { contentSchema } from "./schema";

export const cms = createTypedCmsClient(components.convexCms, {
  schema: contentSchema,
  defaultLocale: "en-US",
  features: {
    versioning: true,
    localization: true,
  },
  getUserRole: async ({ userId }) => {
    // Map your app's users to CMS roles
    return "editor";
  },
});
```

```typescript
// convex/posts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { cms } from "./cms";

export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Full type safety - TypeScript validates the data shape
    return await cms.typedContentEntries.create<"blog_post">(ctx, {
      contentTypeName: "blog_post",
      data: {
        title: args.title,
        slug: args.title.toLowerCase().replace(/\s+/g, "-"),
        content: args.content,
        tags: args.tags,
        featured: false,
        authorId: "user_123" as any,  // Would come from auth
      },
    });
  },
});

export const getPost = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const post = await cms.typedContentEntries.get<"blog_post">(ctx, args.id);
    if (!post) return null;

    // TypeScript knows all properties
    return {
      title: post.data.title,
      excerpt: post.data.excerpt ?? post.data.content.slice(0, 200),
      featured: post.data.featured,
    };
  },
});
```

---

## When to Use Each Approach

### Use Code-First When:
- You're building a typed application
- Content types are stable and rarely change
- You want compile-time type checking
- You want schemas in version control

### Use Imperative When:
- Content admins need to create custom types
- You need to modify schemas without code deploys
- Building a multi-tenant CMS
- You need all 13 field types with full options

### Hybrid Approach

You can use both! Define core types in code for type safety, while allowing runtime types via admin UI:

```typescript
// Static, typed content types
const blogPost = defineContentType({ ... });
const author = defineContentType({ ... });

const coreSchema = createContentSchema({ blogPost, author });

// CMS client supports both
const cms = createTypedCmsClient(components.convexCms, {
  schema: coreSchema,
});

// Typed access for code-defined types
await cms.typedContentEntries.get<"blog_post">(ctx, id);

// Untyped access for admin-created types
await cms.contentEntries.get(ctx, { id: dynamicTypeEntryId });
```

---

## Schema Drift Detection

When using code-first schemas, drift can occur between your code definitions and the database. This happens when:

- You add or modify a `defineContentType()` and deploy
- You remove a code-defined type from your codebase
- Database records get out of sync with code definitions

The CMS provides tools to detect and resolve schema drift.

### Checking for Drift

Use `checkSchemaDrift` to compare code definitions against database records:

```typescript
// In a query or action
const driftIssues = await ctx.runQuery(api.admin.checkSchemaDrift, {});

if (driftIssues.length > 0) {
  for (const issue of driftIssues) {
    console.log(`[${issue.severity}] ${issue.contentTypeName}: ${issue.message}`);
  }
}
```

### Drift Types

| Type | Severity | Description |
|------|----------|-------------|
| `CONTENT_TYPE_MISSING_IN_DB` | warning | Code type not yet synced to database |
| `CONTENT_TYPE_MISSING_IN_CODE` | warning | DB type was code-defined but no longer exists in code |
| `FIELD_MISSING_IN_DB` | error | Code field not present in database schema |
| `FIELD_MISSING_IN_CODE` | warning | Database has field not defined in code |
| `FIELD_TYPE_MISMATCH` | error | Field type differs between code and database |
| `FIELD_REQUIRED_MISMATCH` | warning | Required status differs |

**Errors** indicate critical issues that may cause validation failures. **Warnings** indicate non-critical mismatches that should be reviewed.

### Syncing Code-Defined Types

Use `syncCodeDefinedTypes` to sync all code-defined types to the database:

```typescript
const result = await ctx.runMutation(api.admin.syncCodeDefinedTypes, {});

console.log(`Created: ${result.created}`);   // New types added to DB
console.log(`Updated: ${result.updated}`);   // Existing types updated
console.log(`Unchanged: ${result.unchanged}`); // Already in sync
```

The sync operation:
- Creates database records for new code-defined types
- Updates existing code-defined types if fields have changed
- Only modifies types with `createdBy: "code"`. Manually created database types are never affected

### Admin UI Integration

The Admin UI automatically checks for schema drift and displays a warning banner when issues are detected. Click **Sync Now** to resolve drift with a single click.

---

See also:
- [Field Types Reference](./field-types.md)
- [Client API Reference](./client-api.md)
- [Getting Started Guide](../guides/getting-started.md)
