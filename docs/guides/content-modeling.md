# Content Modeling Guide

This guide covers how to define content structures (content types) and work with content entries in Convex CMS.

## Overview

Content modeling in Convex CMS follows a two-layer approach:

- **Content Types** - Define the schema (what fields exist, their types, validation rules)
- **Content Entries** - Instances of content types (the actual content)

Think of content types as templates and entries as filled-in documents using those templates.

---

## Choosing an Approach

Convex CMS supports two approaches for defining content types:

| Approach | Best For | Type Safety | Requires Deploy |
|----------|----------|-------------|-----------------|
| **Imperative** (this guide) | Dynamic schemas, admin UI creation | Runtime only | No |
| **Code-First** (`defineContentType`) | Static schemas, typed applications | Full TypeScript | Yes |

This guide covers the **imperative approach** - creating content types at runtime via API calls or Admin UI. For the code-first approach with TypeScript inference, see [Code-First Schema Reference](../api/code-first-schema.md).

**When to use imperative:**
- Content admins need to create/modify types via Admin UI
- You need runtime schema flexibility
- Building multi-tenant apps where each client defines their own schemas

**When to use code-first:**
- You want TypeScript compile-time type checking
- Content types are stable and version-controlled in git
- Building typed applications where `entry.data.title` should autocomplete

---

## Content Types

### Creating a Content Type

```typescript
import { mutation } from "./_generated/server";
import { cms } from "../cms";

export const createBlogType = mutation({
  args: {},
  handler: async (ctx) => {
    return await cms.contentTypes.create(ctx, {
      name: "blog_post",
      displayName: "Blog Post",
      description: "Articles for the company blog",
      icon: "document-text",

      fields: [
        {
          name: "title",
          type: "text",
          required: true,
          searchable: true,
          options: { minLength: 1, maxLength: 200 },
        },
        {
          name: "slug",
          type: "text",
          required: true,
          description: "URL-friendly identifier",
        },
        {
          name: "content",
          type: "richText",
          required: true,
          searchable: true,
        },
        {
          name: "excerpt",
          type: "text",
          options: { maxLength: 500 },
        },
        {
          name: "featuredImage",
          type: "media",
          options: { allowedTypes: ["image/*"] },
        },
        {
          name: "author",
          type: "reference",
          options: { contentTypes: ["author"] },
        },
        {
          name: "publishedAt",
          type: "datetime",
        },
        {
          name: "featured",
          type: "boolean",
          defaultValue: false,
        },
      ],

      slugField: "slug",
      titleField: "title",
      sortOrder: 1,
    });
  },
});
```

### Field Definition Structure

Each field has the following properties:

```typescript
interface FieldDefinition {
  // Required
  name: string;        // Unique identifier within the content type
  type: FieldType;     // One of the supported field types

  // Optional
  required?: boolean;          // Must have a value (default: false)
  searchable?: boolean;        // Include in search index (default: false)
  localized?: boolean;         // Per-locale values (default: false)
  description?: string;        // Help text shown in editor
  defaultValue?: any;          // Default value for new entries
  options?: FieldOptions;      // Type-specific options
}
```

---

## Field Types Reference

### text

Plain text input.

```typescript
{
  name: "title",
  type: "text",
  options: {
    minLength: 1,
    maxLength: 200,
    pattern: "^[A-Z].*",  // Regex pattern
    patternMessage: "Must start with uppercase letter",
  },
}
```

### richText

HTML rich text editor with formatting.

```typescript
{
  name: "content",
  type: "richText",
  options: {
    allowedFormats: ["bold", "italic", "link", "heading", "list"],
    maxLength: 50000,
  },
}
```

### number

Numeric values.

```typescript
{
  name: "price",
  type: "number",
  options: {
    min: 0,
    max: 10000,
    step: 0.01,
    precision: 2,
  },
}
```

### boolean

True/false toggle.

```typescript
{
  name: "featured",
  type: "boolean",
  defaultValue: false,
}
```

### date

Date without time.

```typescript
{
  name: "publishDate",
  type: "date",
  options: {
    minDate: "2020-01-01",
    maxDate: "2030-12-31",
  },
}
```

### datetime

Date with time.

```typescript
{
  name: "eventTime",
  type: "datetime",
  options: {
    minDate: "2020-01-01T00:00:00Z",
  },
}
```

### select

Single selection from options.

```typescript
{
  name: "status",
  type: "select",
  options: {
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "archived", label: "Archived" },
    ],
    defaultValue: "active",
  },
}
```

### multiSelect

Multiple selections from options.

```typescript
{
  name: "categories",
  type: "multiSelect",
  options: {
    options: [
      { value: "tech", label: "Technology" },
      { value: "business", label: "Business" },
      { value: "lifestyle", label: "Lifestyle" },
    ],
    minSelections: 1,
    maxSelections: 3,
  },
}
```

### reference

Link to other content entries.

```typescript
// Single reference
{
  name: "author",
  type: "reference",
  options: {
    contentTypes: ["author"],
    multiple: false,
  },
}

// Multiple references
{
  name: "relatedPosts",
  type: "reference",
  options: {
    contentTypes: ["blog_post"],
    multiple: true,
    maxItems: 5,
  },
}
```

### media

Link to media assets.

```typescript
// Single image
{
  name: "featuredImage",
  type: "media",
  options: {
    allowedTypes: ["image/*"],
    maxSize: 5 * 1024 * 1024,  // 5MB
    multiple: false,
  },
}

// Gallery
{
  name: "gallery",
  type: "media",
  options: {
    allowedTypes: ["image/*"],
    multiple: true,
    maxItems: 10,
  },
}
```

### json

Arbitrary JSON data.

```typescript
{
  name: "metadata",
  type: "json",
  options: {
    schema: {
      type: "object",
      properties: {
        seoTitle: { type: "string" },
        seoDescription: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
      },
    },
  },
}
```

---

## Singleton Mode

For content that should only have one entry (e.g., site settings):

```typescript
await cms.contentTypes.create(ctx, {
  name: "site_settings",
  displayName: "Site Settings",
  singleton: true,
  fields: [
    { name: "siteName", type: "text", required: true },
    { name: "logo", type: "media" },
    { name: "contactEmail", type: "text" },
  ],
});
```

---

## Content Entries

### Content Lifecycle

```
                    ┌──────────────┐
                    │    draft     │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌───────────┐
    │ publish  │    │ schedule │    │  delete   │
    └────┬─────┘    └────┬─────┘    └─────┬─────┘
         │               │                │
         ▼               │                ▼
   ┌───────────┐         │         ┌───────────┐
   │ published │◄────────┘         │   trash   │
   └─────┬─────┘                   └─────┬─────┘
         │                               │
         ▼                               ▼
  ┌────────────┐                   ┌───────────┐
  │ unpublish  │                   │  restore  │
  └──────┬─────┘                   └───────────┘
         │
         ▼
   ┌───────────┐
   │   draft   │
   └───────────┘
```

### Creating Entries

```typescript
export const createBlogPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const types = await cms.contentTypes.list(ctx);
    const blogType = types.items.find(t => t.name === "blog_post");

    const entry = await cms.contentEntries.create(ctx, {
      contentTypeId: blogType._id,
      data: {
        title: args.title,
        content: args.content,
        slug: args.title.toLowerCase().replace(/\s+/g, "-"),
      },
      status: "draft",
    });

    return entry;
  },
});
```

### With Custom Slug

```typescript
const entry = await cms.contentEntries.create(ctx, {
  contentTypeId: blogType._id,
  slug: "my-custom-url-slug",
  data: { title: "My Post Title", content: "..." },
});
```

### With Locale

```typescript
const entry = await cms.contentEntries.create(ctx, {
  contentTypeId: blogType._id,
  locale: "es",
  primaryEntryId: englishEntry._id,
  data: { title: "Título del artículo", content: "..." },
});
```

### Scheduled Publishing

```typescript
await cms.contentEntries.schedule(ctx, {
  id: entryId,
  scheduledPublishAt: Date.now() + 24 * 60 * 60 * 1000,  // Tomorrow
});
```

---

### Updating Entries

```typescript
const entry = await cms.contentEntries.update(ctx, {
  id: entryId,
  data: {
    title: "Updated Title",
    content: "Updated content...",
  },
  changeDescription: "Fixed typo in title",  // For version history
});
```

---

### Publishing

```typescript
// Publish
await cms.contentEntries.publish(ctx, { id: entryId });

// Unpublish (back to draft)
await cms.contentEntries.unpublish(ctx, { id: entryId });
```

Publishing:
- Changes status from `draft` to `published`
- Sets `firstPublishedAt` (if first publish)
- Updates `lastPublishedAt`
- Creates a version snapshot

---

### Querying Entries

```typescript
// Get by ID
const entry = await cms.contentEntries.get(ctx, entryId);

// Get by slug
const entry = await cms.contentEntries.getBySlug(ctx, {
  contentTypeName: "blog_post",
  slug: "my-post-slug",
});

// List with filters
const result = await cms.contentEntries.list(ctx, {
  contentTypeId: blogType._id,
  status: "published",
  locale: "en",
  limit: 10,
});

// Search
const result = await cms.contentEntries.list(ctx, {
  contentTypeId: blogType._id,
  search: "typescript react",
});
```

---

### Deleting Entries

```typescript
// Soft delete (can be restored)
await cms.contentEntries.delete(ctx, { id: entryId });

// Hard delete (permanent)
await cms.contentEntries.delete(ctx, { id: entryId, hardDelete: true });

// Restore from trash
await cms.contentEntries.restore(ctx, { id: entryId });
```

---

### Duplicating Entries

```typescript
const copy = await cms.contentEntries.duplicate(ctx, {
  id: originalId,
  slug: "copied-post",
});
```

---

### Bulk Operations

```typescript
// Publish multiple
await cms.contentEntries.bulkPublish(ctx, { entryIds: [id1, id2, id3] });

// Delete multiple
await cms.contentEntries.bulkDelete(ctx, { entryIds: [id1, id2, id3] });

// Update multiple
await cms.contentEntries.bulkUpdate(ctx, {
  entryIds: [id1, id2, id3],
  data: { featured: false },
});
```

---

## Version History

The CMS automatically creates version snapshots when content is published.

```typescript
// List versions
const versions = await cms.versions.list(ctx, { entryId });

// Get specific version
const version = await cms.versions.get(ctx, { entryId, versionNumber: 3 });

// Compare versions
const diff = await cms.versions.compare(ctx, { entryId, v1: 2, v2: 5 });

// Rollback to previous version
await cms.versions.rollback(ctx, {
  entryId,
  versionNumber: 3,
  reason: "Reverting to approved version",
});
```

Rollback creates a new version with the old content (preserves full history).

---

## Best Practices

### Naming Conventions

```typescript
// Good
{ name: "blog_post", displayName: "Blog Post" }
{ name: "publishedAt", type: "datetime" }

// Avoid
{ name: "BlogPost", displayName: "blog post" }
{ name: "dt", type: "datetime" }
```

### Field Organization

1. Put required fields first
2. Group related fields together
3. Put optional/advanced fields last

### Searchable Fields

Only mark fields as `searchable: true` that users will actually search:

```typescript
{ name: "title", type: "text", searchable: true },      // Yes
{ name: "content", type: "richText", searchable: true }, // Yes
{ name: "slug", type: "text", searchable: false },       // No
```

### Localization

Enable localization only for fields that vary by locale:

```typescript
{ name: "title", type: "text", localized: true },       // Translatable
{ name: "price", type: "number", localized: false },    // Same everywhere
```

---

## Updating Content Types

```typescript
await cms.contentTypes.update(ctx, {
  id: contentTypeId,
  displayName: "Updated Name",
  fields: [/* updated field list */],
});
```

The update returns a `breakingChanges` array if updates would affect existing content:
- Removing a field that has data
- Changing a field type
- Adding a required field without default

---

## Deleting Content Types

```typescript
// Soft delete
await cms.contentTypes.delete(ctx, { id: contentTypeId });

// Hard delete with cascade
await cms.contentTypes.delete(ctx, {
  id: contentTypeId,
  cascade: true,
  hardDelete: true,
});
```

---

See also:
- [Code-First Schema Reference](../api/code-first-schema.md) - Type-safe schema definition
- [Field Types Reference](../api/field-types.md)
- [Client API Reference](../api/client-api.md)
- [Media Guide](./media.md)

---

Next: [Media Management Guide](./media.md)
