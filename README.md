# Convex CMS

[![npm version](https://badge.fury.io/js/convex-cms.svg)](https://www.npmjs.com/package/convex-cms)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> **Alpha (v0.0.7)** Actively developed. APIs may change. [Report issues](https://github.com/obkaro/convex-cms/issues).

A headless CMS built as a [Convex Component](https://docs.convex.dev/components). Content management that runs inside your Convex app.

## Quick Start

### 1. Install

```bash
pnpm add convex-cms
```

### 2. Add the Component

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import cms from "convex-cms/convex.config";

const app = defineApp();
app.use(cms);
export default app;
```

### 3. Initialize

**For Admin UI:** Run `pnpm convex-cms init` then `pnpm convex-cms admin`
→ [Full Admin UI Setup](./docs/guides/admin-ui-setup.md)

**For Custom Functions:** Create a CMS client and use it in your functions
→ [Full Getting Started Guide](./docs/guides/getting-started.md)

## Why Convex CMS?

If you're building on Convex and need content management without the overhead of all the CMS plumbing, this is the most integrated option.

### What you get:

- **Typesafe admin API** Admin APIs exported directly from your backend for use in your React queries and mutations
- **Built in admin UI** A well designed admin UI that you can view and edit content from
- **Embeddable content manager** Ability to embed and serve the prebuilt UI as part of you React application
- **Data independence** CMS that lives in your own convex deployment, extendable and customizable with your convex functions
- **Agent-native.** Pre-built tools useful for AI agent integration with `@convex-dev/agent`

## Features

| Feature | What it does |
|---------|--------------|
| **Code-first config** | Define content types in TypeScript with full type inference |
| **UI-defined config** | Create and modify content types through the admin interface |
| **CMS Client** | Programmatic access for custom queries and mutations |
| **Admin API** | Pre-built functions that power the admin UI |
| **CLI Admin UI** | Run for local development, content entry, and management |
| **Embedded Admin UI** | Ship the admin interface as part of your React app |

## In Practice

**Full control over the editorial experience?**  
Code-first config + CMS Client. You define the schema in TypeScript and build exactly the UI you want.

**Ship fast with a ready-made admin?**  
Code-first config + Admin API + Embedded Admin UI. Type-safe schemas with a working admin interface out of the box.

**Content team needs to modify schemas without deploys?**  
UI-defined config + Admin API + Embedded Admin UI. Non-developers can add fields and content types.

**Automated content pipelines?**  
CMS Client + agent tools. Pre-built tools for AI-driven workflows.

*Any combination of these features works together seamlessly. Pick what fits your workflow.*


## Batteries Included

Leverage included features or extend and customize within your own convex functions to your desire.

### Core Content
- **13 field types.** text, richText, number, boolean, date, datetime, select, multiSelect, reference, media, json, tags, category
- **Publishing workflows.** Draft → scheduled → published with version history
- **Content versioning.** Snapshots, comparison, and rollback
- **Scheduled publishing.** Convex scheduler integration for future publish dates

### Media Management
- **File uploads.** Direct to Convex storage with folder organization
- **Image variants.** Automatic resizing and format conversion
- **Metadata & tagging.** Alt text, descriptions, taxonomy support

### Organization
- **Taxonomies.** Hierarchical categories and flat tags
- **Content locking.** Prevent concurrent edit conflicts
- **Soft delete & trash.** Configurable retention with restore

### Integration
- **RBAC.** 4 built-in roles + custom roles with fine-grained permissions
- **Multi-locale.** Content localization with fallback chains
- **Webhooks.** Event-driven integration with external systems
- **Event system.** All mutations emit events for async processing
- **Agent tools.** 23 pre-built tools with Zod schemas for AI integration
- **Query builder.** Fluent API for complex content queries

### Admin UI
- **Pre-built React interface.** CLI mode for development, embeddable for production
- **Visual content editing.** Rich text, media picker, reference selector

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
