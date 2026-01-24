# Convex CMS

A headless CMS built as a [Convex Component](https://docs.convex.dev/components) — content management that runs inside your Convex app.

## Choose Your Path

### Need an Admin Interface?

Use **`defineAdminAPI`** — one line creates all the backend functions for a working admin UI.

```
Your App                         Admin UI
    │                               │
    └── convex/admin.ts ────────────┘
        defineAdminAPI()
            │
            ├── listContentTypes
            ├── getEntry
            ├── publishEntry
            └── ... (30+ functions)
                    │
                    ▼
            CMS Component
```

→ **[Admin UI Setup Guide](./docs/guides/admin-ui-setup.md)**

### Building Custom Content Logic?

Use **`createCmsClient`** — full programmatic control with typed methods in your Convex functions.

```
Your Convex Functions
    │
    └── cms.contentEntries.list(ctx, { status: "published" })
        cms.contentTypes.create(ctx, { name: "blog", ... })
        cms.mediaAssets.upload(ctx, { ... })
            │
            ▼
        CMS Component
```

→ **[Getting Started Guide](./docs/guides/getting-started.md)**

### Want Full Type Safety?

Use **code-first schemas** — define content types with Convex validators, get TypeScript inference.

```typescript
const blogPost = defineContentType({
  name: "blog_post",
  validator: v.object({
    title: v.string(),
    content: v.string(),
  }),
});

// TypeScript knows entry.data.title is string
const entry = await cms.typedContentEntries.get<"blog_post">(ctx, id);
```

→ **[Code-First Schema Reference](./docs/api/code-first-schema.md)**

### Need Both?

**Most apps use both.** This is the typical setup:

- `defineAdminAPI` powers the admin interface for content editors
- `createCmsClient` gives you typed methods for custom queries on your frontend

They work together through the same CMS component.

## Quick Start

### 1. Install

```bash
npm install convex-cms
```

### 2. Add the Component

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms);
export default app;
```

### 3. Choose Your Setup

**For Admin UI:** Run `npx convex-cms init` then `npx convex-cms admin`
→ [Full Admin UI Setup](./docs/guides/admin-ui-setup.md)

**For Custom Functions:** Create a CMS client and use it in your functions
→ [Full Getting Started Guide](./docs/guides/getting-started.md)

## What's Included

- **13 field types** — text, richText, media, reference, select, and more
- **Publishing workflows** — draft → scheduled → published with version history
- **Media management** — uploads, folders, variants, and metadata
- **RBAC** — 4 built-in roles + custom roles with fine-grained permissions
- **Multi-locale** — content localization with fallback chains
- **Admin UI** — pre-built React interface (CLI or embeddable)
- **Agent tools** — Zod schemas for AI integration

## Admin UI Modes

| Mode | Command | Best For |
|------|---------|----------|
| **CLI** | `npx convex-cms admin` | Development |
| **Embed** | `<CmsAdmin api={api.admin} />` | Production |

Both modes call the same functions from your `convex/admin.ts`.

## Documentation

| Guide | Description |
|-------|-------------|
| [Admin UI Setup](./docs/guides/admin-ui-setup.md) | CLI and embed modes, auth integration |
| [Getting Started](./docs/guides/getting-started.md) | Programmatic usage with createCmsClient |
| [Integration Patterns](./docs/guides/integration-patterns.md) | Common setups and when to use each |
| [Content Modeling](./docs/guides/content-modeling.md) | Content types and field definitions |
| [Authorization](./docs/guides/authorization.md) | Roles, permissions, and custom auth |
| [Media Management](./docs/guides/media.md) | Uploads, folders, and variants |

| Reference | Description |
|-----------|-------------|
| [Client API](./docs/api/client-api.md) | createCmsClient methods |
| [Admin API](./docs/api/admin-api.md) | defineAdminAPI functions |
| [Code-First Schema](./docs/api/code-first-schema.md) | TypeScript-first content types |
| [Field Types](./docs/api/field-types.md) | All 13 field types |
| [Configuration](./docs/api/configuration.md) | All config options |

## Requirements

- Convex ^1.17.0
- Node.js 18+

## License

Apache-2.0
