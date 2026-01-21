# Getting Started with Convex CMS

This guide walks you through installing and configuring Convex CMS in your Convex application.

## Prerequisites

- Node.js 18 or later
- An existing Convex project, or willingness to create one
- Basic familiarity with Convex and TypeScript

## Installation

### 1. Install the Package

```bash
npm install @convex-cms/core
```

### 2. Configure the Convex Component

In your `convex/convex.config.ts`, add the CMS component:

```typescript
import { defineApp } from "convex/server";
import convexCms from "@convex-cms/core/convex.config";

const app = defineApp();
app.use(convexCms);

export default app;
```

### 3. Generate Types

Run the Convex dev server to generate types:

```bash
npx convex dev
```

This creates the necessary type definitions including the component API.

### 4. Create Your CMS Client

Create a file to configure and export your CMS client. This is typically `convex/cms.ts`:

```typescript
import { createCmsClient } from "@convex-cms/core";
import { components } from "./_generated/api";

// Basic configuration for development
export const cms = createCmsClient(components.convexCms, {
  // Start in permissive mode for development (no auth required)
  permissiveMode: true,

  // Default locale for content
  defaultLocale: "en",

  // Enable features
  features: {
    versioning: true,
    localization: false,  // Enable later if needed
    scheduling: true,
    softDelete: true,
  },
});
```

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
    const types = await cms.contentTypes.list(ctx);
    if (types.items.find(t => t.name === "blog_post")) {
      return { message: "Already set up!" };
    }

    // Create blog post type
    const blogPost = await cms.contentTypes.create(ctx, {
      name: "blog_post",
      displayName: "Blog Post",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "slug", type: "text", required: true },
        { name: "content", type: "richText", required: true },
        { name: "excerpt", type: "text" },
        { name: "featured", type: "boolean", defaultValue: false },
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
    const types = await cms.contentTypes.list(ctx);
    const blogType = types.items.find(t => t.name === "blog_post");
    if (!blogType) return [];

    const result = await cms.contentEntries.list(ctx, {
      contentTypeId: blogType._id,
      status: "published",
    });

    return result.items;
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
    const types = await cms.contentTypes.list(ctx);
    const blogType = types.items.find(t => t.name === "blog_post");
    if (!blogType) throw new Error("Run setup first!");

    const slug = args.title.toLowerCase().replace(/\s+/g, "-");

    return await cms.contentEntries.create(ctx, {
      contentTypeId: blogType._id,
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
  args: { id: v.id("content_entries") },
  handler: async (ctx, { id }) => {
    return await cms.contentEntries.publish(ctx, { id });
  },
});
```

### Step 3: Run Setup

Start the Convex dev server if not already running:

```bash
npx convex dev
```

In another terminal, run the setup:

```bash
npx convex run setup:setupBlog
```

### Step 4: Create Your First Post

```bash
npx convex run blog:createPost '{"title": "Hello World", "content": "<p>My first post!</p>"}'
```

Copy the returned ID and publish it:

```bash
npx convex run blog:publishPost '{"id": "YOUR_ENTRY_ID"}'
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

### Step 6: Launch Admin UI

Use the Admin UI to manage content visually:

```bash
npx convex-cms admin
```

---

## Alternative: Code-First Schema Definition

The tutorial above uses the **imperative API** (runtime content type creation). For type-safe applications with stable schemas, consider the **code-first approach**:

```typescript
// convex/cms.ts
import { v } from "convex/values";
import { defineContentType, createContentSchema, createTypedCmsClient } from "@convex-cms/core";
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

## Development Mode

For development, you can use `permissiveMode: true` to bypass authentication:

```typescript
const cms = createCmsClient(components.convexCms, {
  permissiveMode: true,  // No auth required
  // ...
});
```

**Warning**: Never use `permissiveMode: true` in production! Always configure proper authorization.

---

## Configuration Options

See the [Configuration Reference](../api/configuration.md) for all available options:

```typescript
const cms = createCmsClient(components.convexCms, {
  // Locale settings
  defaultLocale: "en",
  supportedLocales: ["en", "es", "fr"],
  localeFallbackChains: {
    "es-MX": ["es", "en"],
    "fr-CA": ["fr", "en"],
  },

  // Features
  features: {
    versioning: true,
    localization: true,
    scheduling: true,
    softDelete: true,
    contentLocking: true,
  },

  // Version retention
  maxVersionsPerEntry: 50,

  // Authorization
  getUserRole: async ({ userId }) => {
    // Your logic to map userId to CMS role
    return "editor";
  },

  // Custom roles (optional)
  customRoles: {
    contentManager: {
      displayName: "Content Manager",
      permissions: [
        { resource: "contentEntries", action: "create", scope: "all" },
        { resource: "contentEntries", action: "read", scope: "all" },
        { resource: "contentEntries", action: "update", scope: "all" },
        { resource: "contentEntries", action: "publish", scope: "all" },
        { resource: "mediaAssets", action: "create", scope: "all" },
        { resource: "mediaAssets", action: "read", scope: "all" },
      ],
    },
  },
});
```

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

Run `npx convex dev` to regenerate types after making changes to your Convex functions.

---

## Next Steps

Now that you have the basics working:

1. **[Set up authorization](./authorization.md)** - Add user roles and permissions
2. **[Learn content modeling](./content-modeling.md)** - Define rich content types
3. **[Add media management](./media.md)** - Upload and manage images

---

Next: [Content Modeling Guide](./content-modeling.md)
