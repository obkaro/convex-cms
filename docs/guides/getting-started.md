# Getting Started with Convex CMS

This guide covers **programmatic usage** with `createCmsClient` for full control over content in your Convex functions.

> **Need a visual editor instead?** See [Admin UI Setup](./admin-ui-setup.md) for the visual content management interface.

---

## Prerequisites

- Node.js 18 or later
- An existing Convex project, or willingness to create one
- Basic familiarity with Convex and TypeScript

## Installation

### 1. Install the Package

```bash
pnpm add convex-cms
```

### 2. Configure the Convex Component

In your `convex/convex.config.ts`, add the CMS component:

```typescript
import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms);

export default app;
```

### 3. Generate Types

Run the Convex dev server to generate types:

```bash
pnpm convex dev
```

This creates the necessary type definitions including the component API.

### 4. Create Your CMS Client

Create a file to configure and export your CMS client. This is typically `convex/cms.ts`:

```typescript
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

export const cms = createCmsClient(components.convexCms, {
  permissiveMode: true,  // For development only
  defaultLocale: "en",
  features: {
    versioning: true,
    scheduling: true,
    softDelete: true,
  },
});
```

For all configuration options, see [Configuration Reference](../api/configuration.md).

---

## Tutorial: Build a Blog in 10 Minutes

### Step 1: Create a Content Type

Create `convex/setup.ts`:

```typescript
import { mutation } from "./_generated/server";
import { cms } from "./cms";

export const setupBlog = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already exists
    const existing = await cms.contentTypes.getByName(ctx, "blog_post");
    if (existing) {
      return { message: "Already set up!" };
    }

    // Create blog post type
    const blogPost = await cms.contentTypes.create(ctx, {
      name: "blog_post",
      displayName: "Blog Post",
      createdBy: "system",
      fields: [
        { name: "title", label: "Title", type: "text", required: true },
        { name: "slug", label: "Slug", type: "text", required: true },
        { name: "content", label: "Content", type: "richText", required: true },
        { name: "excerpt", label: "Excerpt", type: "text", required: false },
        { name: "featured", label: "Featured", type: "boolean", required: false, defaultValue: false },
      ],
      slugField: "slug",
      titleField: "title",
    });

    return { contentType: blogPost };
  },
});
```

### Step 2: Create Blog Functions

Create `convex/blog.ts`:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { cms } from "./cms";

// List all published posts
export const listPosts = query({
  args: {},
  handler: async (ctx) => {
    const result = await cms.contentEntries.list(ctx, {
      contentTypeName: "blog_post",
      status: "published",
      paginationOpts: { numItems: 50, cursor: null },
    });

    return result.page;
  },
});

// Get single post by slug
export const getPost = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await cms.contentEntries.getBySlug(ctx, {
      contentTypeName: "blog_post",
      slug,
    });
  },
});

// Create a new post
export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slug = args.title.toLowerCase().replace(/\s+/g, "-");

    return await cms.contentEntries.create(ctx, {
      contentTypeName: "blog_post",
      data: {
        title: args.title,
        slug,
        content: args.content,
        excerpt: args.excerpt ?? "",
        featured: false,
      },
    });
  },
});

// Publish a post
export const publishPost = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    return await cms.contentEntries.publish(ctx, { id });
  },
});
```

### Step 3: Run Setup

Start the Convex dev server if not already running:

```bash
pnpm convex dev
```

In another terminal, run the setup:

```bash
pnpm convex run setup:setupBlog
```

### Step 4: Create Your First Post

```bash
pnpm convex run blog:createPost '{"title": "Hello World", "content": "<p>My first post!</p>"}'
```

Copy the returned ID and publish it:

```bash
pnpm convex run blog:publishPost '{"id": "YOUR_ENTRY_ID"}'
```

### Step 5: Build the Frontend

Here's a minimal React example:

```tsx
// src/App.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const posts = useQuery(api.blog.listPosts);
  const createPost = useMutation(api.blog.createPost);
  const publishPost = useMutation(api.blog.publishPost);

  const handleCreate = async () => {
    const post = await createPost({
      title: "New Post " + Date.now(),
      content: "<p>This is a new post.</p>",
    });
    await publishPost({ id: post._id });
  };

  return (
    <div>
      <h1>My Blog</h1>
      <button onClick={handleCreate}>Create Post</button>

      {posts?.map((post) => (
        <article key={post._id}>
          <h2>{post.data.title}</h2>
          <p>{post.data.excerpt || "No excerpt"}</p>
        </article>
      ))}
    </div>
  );
}
```

### Step 6: Add Visual Editing (Optional)

For visual content management, add the Admin UI. See [Admin UI Setup](./admin-ui-setup.md) for CLI and embed mode options.

---

## Alternative: Code-First Schema Definition

> **Shortcut:** `pnpm convex-cms init` generates code-first schemas by default. It uses `defineContentType()` + `createTypedHelpers()` for type-safe content access without manual setup.

The tutorial above uses the **imperative API** (runtime content type creation). For type-safe applications with stable schemas, consider the **code-first approach**:

```typescript
// convex/cms.ts
import { v } from "convex/values";
import { defineContentType, createContentSchema, createTypedCmsClient } from "convex-cms";
import { components } from "./_generated/api";

// Define content types with Convex validators
const blogPost = defineContentType({
  name: "blog_post",
  validator: v.object({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    excerpt: v.optional(v.string()),
    featured: v.boolean(),
  }),
  meta: {
    displayName: "Blog Post",
    titleField: "title",
    slugField: "slug",
    fields: {
      content: { renderAs: "richText" },
    },
  },
});

const contentSchema = createContentSchema({ blogPost });

// Create typed CMS client
export const cms = createTypedCmsClient(components.convexCms, {
  schema: contentSchema,
  permissiveMode: true,
});

// Now use typed methods
// const post = await cms.typedContentEntries.get<"blog_post">(ctx, id);
// post.data.title;  // TypeScript knows this is string!
```

**When to use code-first:**
- You want TypeScript to catch errors at compile time
- Content types are stable and rarely change
- You want schemas version-controlled in git

**When to use imperative (admin UI):**
- Content admins need to create custom types
- You need to add/modify fields without code deploys
- Building a multi-tenant CMS

See [Code-First Schema Reference](../api/code-first-schema.md) for full documentation.

---

## Troubleshooting

### "Content type not found" errors

Make sure you've created your content types before trying to create entries. You can create a setup mutation or use the Admin UI.

### "Unauthorized" errors

If you're getting auth errors:
1. Check that `permissiveMode: true` is set for development
2. Verify your `getUserRole` hook returns a valid role
3. Ensure the user has the required permissions for the operation

### Type errors

Run `pnpm convex dev` to regenerate types after making changes to your Convex functions.

---

## Next Steps

1. **[Query Builder](./query-builder.md)** for fluent API queries
2. **[Add the Admin UI](./admin-ui-setup.md)** for visual content editing
3. **[Code-First Schema](../api/code-first-schema.md)** for TypeScript-first with full type inference
4. **[Set up authorization](./authorization.md)** for user roles and permissions
5. **[Learn content modeling](./content-modeling.md)** for rich content types
6. **[Taxonomies](./taxonomies.md)** for organizing content with categories and tags
7. **[Agent Tools](./agent-tools.md)** for integrating with AI agents

---

Next: [Query Builder](./query-builder.md)
