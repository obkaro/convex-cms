# Convex CMS Documentation

A headless CMS built as a Convex Component — content management that runs inside your Convex app.

---

## I want to...

### ...get an admin UI running

→ **[Admin UI Setup](./guides/admin-ui-setup.md)** — CLI or embedded, 5 minutes

### ...build custom content queries

→ **[Getting Started](./guides/getting-started.md)** — programmatic usage with `createCmsClient`

### ...write complex queries with filters

→ **[Query Builder](./guides/query-builder.md)** — fluent API for filtering, sorting, pagination

### ...understand the integration options

→ **[Integration Patterns](./guides/integration-patterns.md)** — which approach fits your use case

### ...define my content structure

- **[Content Modeling](./guides/content-modeling.md)** — define types at runtime or via Admin UI
- **[Code-First Schema](./api/code-first-schema.md)** — TypeScript-first with full type inference

### ...organize content with categories and tags

→ **[Taxonomies](./guides/taxonomies.md)** — hierarchical categories and flat tags

### ...integrate with AI agents

→ **[Agent Tools](./guides/agent-tools.md)** — 23 pre-built tools with Zod schemas

### ...set up authentication and permissions

→ **[Authorization](./guides/authorization.md)** — RBAC with 4 built-in roles + custom roles

### ...understand how it works

→ **[Architecture Overview](./architecture/overview.md)** — component model, data flow, design

---

## Quick Reference

### Guides

| Guide | Description |
|-------|-------------|
| [Getting Started](./guides/getting-started.md) | First setup with `createCmsClient` |
| [Admin UI Setup](./guides/admin-ui-setup.md) | CLI and embed modes, auth integration |
| [Content Modeling](./guides/content-modeling.md) | Content types and field definitions |
| [Query Builder](./guides/query-builder.md) | Fluent API for complex queries |
| [Taxonomies](./guides/taxonomies.md) | Categories, tags, and content organization |
| [Media Management](./guides/media.md) | Uploads, folders, and variants |
| [Authorization](./guides/authorization.md) | Roles, permissions, custom auth |
| [Agent Tools](./guides/agent-tools.md) | AI agent integration |
| [Content Locking](./guides/content-locking.md) | Prevent concurrent edit conflicts |
| [Integration Patterns](./guides/integration-patterns.md) | Common setups and when to use each |

### API Reference

| Reference | Description |
|-----------|-------------|
| [Admin API](./api/admin-api.md) | 60+ `defineAdminAPI` functions across 11 domains |
| [Client API](./api/client-api.md) | `createCmsClient` methods and query builder |
| [Field Types](./api/field-types.md) | All 13 field types |
| [Configuration](./api/configuration.md) | All config options |
| [Code-First Schema](./api/code-first-schema.md) | TypeScript schema definitions |

### Architecture

| Document | Description |
|----------|-------------|
| [Architecture Overview](./architecture/overview.md) | System design and data flow |

---

## Two Integration Paths

Most apps use both of these together:

| Path | Purpose | Use When |
|------|---------|----------|
| `defineAdminAPI()` | Backend for Admin UI | You need visual content editing |
| `createCmsClient()` | Typed methods for your functions | You need custom queries/mutations |

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Convex App                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │  Your Functions     │      │   convex/admin.ts   │          │
│  │  createCmsClient()  │      │  defineAdminAPI()   │          │
│  │         ↓           │      │         ↓           │          │
│  │  Typed methods      │      │  Admin UI backend   │          │
│  └──────────┬──────────┘      └──────────┬──────────┘          │
│             └────────────┬───────────────┘                      │
│                          ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Convex CMS Component                      │ │
│  │                  (isolated database)                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### Convex Component

Convex CMS runs as an **isolated component** within your Convex app:

- **Separate database** — CMS has its own tables, isolated from your app's data
- **No `ctx.auth`** — User context is passed via hooks, not accessed directly
- **Composable** — Use alongside other components and your own functions

### Admin UI Modes

| Mode | Command | Best For |
|------|---------|----------|
| CLI | `npx convex-cms admin` | Development |
| Embed | `<CmsAdmin api={api.admin} />` | Production |

Both call the same functions from your `convex/admin.ts`.

---

## Support

- [GitHub Issues](https://github.com/obkaro/convex-cms/issues) — Bug reports and feature requests
- [Discord Community](https://discord.gg/convex) — Chat with other users
- [Convex Documentation](https://docs.convex.dev) — Learn about Convex
