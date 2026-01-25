# Convex CMS

[![npm version](https://badge.fury.io/js/convex-cms.svg)](https://www.npmjs.com/package/convex-cms)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **Alpha Status (v0.0.6)** — Actively developed. APIs may change. [Report issues](https://github.com/obkaro/convex-cms/issues).

A headless CMS built as a [Convex Component](https://docs.convex.dev/components) — content management that runs inside your Convex app.

## Why Convex CMS?

If you're building on Convex and need content management, this is the most integrated option:

- **Zero infrastructure** — Runs entirely within your Convex deployment
- **True real-time** — Content updates via Convex subscriptions, not polling
- **Type-safe** — Code-first schemas with full TypeScript inference
- **Component isolation** — Separate database tables, versioned independently
- **Agent-native** — 23 pre-built tools for AI agent integration via `@convex-dev/agent`

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
            └── ... (60+ functions across 11 domains)
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
pnpm add convex-cms
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

**For Admin UI:** Run `pnpm convex-cms init` then `pnpm convex-cms admin`
→ [Full Admin UI Setup](./docs/guides/admin-ui-setup.md)

**For Custom Functions:** Create a CMS client and use it in your functions
→ [Full Getting Started Guide](./docs/guides/getting-started.md)

## What's Included

### Core Content
- **13 field types** — text, richText, number, boolean, date, datetime, select, multiSelect, reference, media, json, tags, category
- **Publishing workflows** — draft → scheduled → published with version history
- **Content versioning** — Snapshots, comparison, and rollback
- **Scheduled publishing** — Convex scheduler integration for future publish dates

### Media Management
- **File uploads** — Direct to Convex storage with folder organization
- **Image variants** — Automatic resizing and format conversion
- **Metadata & tagging** — Alt text, descriptions, taxonomy support

### Organization
- **Taxonomies** — Hierarchical categories and flat tags
- **Content locking** — Prevent concurrent edit conflicts
- **Soft delete & trash** — Configurable retention with restore

### Integration
- **RBAC** — 4 built-in roles + custom roles with fine-grained permissions
- **Multi-locale** — Content localization with fallback chains
- **Webhooks** — Event-driven integration with external systems
- **Event system** — All mutations emit events for async processing
- **Agent tools** — 23 pre-built tools with Zod schemas for AI integration
- **Query builder** — Fluent API for complex content queries

### Admin UI
- **Pre-built React interface** — CLI mode for development, embeddable for production
- **Visual content editing** — Rich text, media picker, reference selector

## Admin UI Modes

| Mode | Command | Best For |
|------|---------|----------|
| **CLI** | `pnpm convex-cms admin` | Development |
| **Embed** | `<CmsAdmin api={api.admin} />` | Production |

Both modes call the same functions from your `convex/admin.ts`.

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/guides/getting-started.md) | Programmatic usage with createCmsClient |
| [Admin UI Setup](./docs/guides/admin-ui-setup.md) | CLI and embed modes, auth integration |
| [Content Modeling](./docs/guides/content-modeling.md) | Content types and field definitions |
| [Query Builder](./docs/guides/query-builder.md) | Fluent API for complex queries |
| [Taxonomies](./docs/guides/taxonomies.md) | Categories, tags, and organization |
| [Authorization](./docs/guides/authorization.md) | Roles, permissions, and custom auth |
| [Media Management](./docs/guides/media.md) | Uploads, folders, and variants |
| [Agent Tools](./docs/guides/agent-tools.md) | AI agent integration with Zod schemas |
| [Integration Patterns](./docs/guides/integration-patterns.md) | Common setups and when to use each |

| Reference | Description |
|-----------|-------------|
| [Client API](./docs/api/client-api.md) | createCmsClient methods |
| [Admin API](./docs/api/admin-api.md) | 60+ defineAdminAPI functions |
| [Code-First Schema](./docs/api/code-first-schema.md) | TypeScript-first content types |
| [Field Types](./docs/api/field-types.md) | All 13 field types |
| [Configuration](./docs/api/configuration.md) | All config options |

## Requirements

- Convex ^1.17.0
- Node.js 18+

## License

Apache-2.0
