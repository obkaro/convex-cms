# Convex CMS Documentation

Welcome to the documentation for `@convex-cms/core` - a developer-first headless CMS built as a Convex Component.

## What is Convex CMS?

Convex CMS is a headless content management system designed for Convex applications:

- **Type-safe APIs** - Full TypeScript support with generated types
- **Flexible content modeling** - Define content types with 13 field types
- **Publishing workflows** - Draft, publish, schedule, and version content
- **Media management** - Upload, organize, and serve media with variants
- **Role-based access control** - Fine-grained permissions with custom roles
- **Multi-locale support** - Content localization with fallback chains
- **Admin UI** - Ready-to-use React admin interface

## Documentation

### Getting Started
- [Getting Started](./guides/getting-started.md) - Install, configure, and build your first CMS app
- [Admin UI Setup](./guides/admin-ui-setup.md) - Launch the admin interface

### Guides
- [Content Modeling](./guides/content-modeling.md) - Define content types and work with entries
- [Media Management](./guides/media.md) - Upload and organize media assets
- [Authorization](./guides/authorization.md) - Set up roles and permissions

### API Reference
- [Client API](./api/client-api.md) - Complete API reference
- [Field Types](./api/field-types.md) - All supported field types
- [Configuration](./api/configuration.md) - All configuration options

### Architecture
- [Architecture Overview](./architecture/overview.md) - How Convex CMS works

---

## Key Concepts

### Convex Component Architecture

Convex CMS runs as an **isolated component** within your Convex app:

1. **Separate Database** - The CMS has its own tables, isolated from your app's data
2. **Explicit User Context** - You must pass user information to CMS functions (no `ctx.auth`)
3. **Composable** - Use alongside other Convex components and your own functions

```typescript
// In convex/convex.config.ts
import { defineApp } from "convex/server";
import convexCms from "@convex-cms/core/convex.config";

const app = defineApp();
app.use(convexCms);
export default app;
```

### Client Wrapper Pattern

Use a typed client wrapper for all CMS operations:

```typescript
import { createCmsClient } from "@convex-cms/core";
import { components } from "./_generated/api";

const cms = createCmsClient(components.convexCms, {
  defaultLocale: "en",
  features: {
    versioning: true,
    localization: true,
  },
  // Map user IDs to CMS roles (note: no ctx parameter)
  getUserRole: async ({ userId }) => {
    return "editor";  // Your role lookup logic
  },
});

// Use typed methods
const entry = await cms.contentEntries.create(ctx, {
  contentTypeId: typeId,
  data: { title: "Hello World" },
});
```

---

## Quick Example

```typescript
// convex/cms.ts - Configure the CMS client
import { createCmsClient } from "@convex-cms/core";
import { components } from "./_generated/api";

export const cms = createCmsClient(components.convexCms, {
  permissiveMode: true,  // For development only
});

// convex/blog.ts - Use the CMS
import { query, mutation } from "./_generated/server";
import { cms } from "./cms";

export const getPosts = query({
  handler: async (ctx) => {
    const result = await cms.contentEntries.list(ctx, {
      status: "published",
    });
    return result.items;
  },
});

export const createPost = mutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    return await cms.contentEntries.create(ctx, {
      contentTypeId: blogTypeId,
      data: args,
    });
  },
});
```

---

## Support

- [GitHub Issues](https://github.com/obkaro/convex-cms/issues) - Bug reports and feature requests
- [Discord Community](https://discord.gg/convex) - Chat with other users
- [Convex Documentation](https://docs.convex.dev) - Learn about Convex

---

Next: [Getting Started Guide](./guides/getting-started.md)
