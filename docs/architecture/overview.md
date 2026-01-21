# Architecture Overview

This document explains the architecture of Convex CMS and how it integrates with your Convex application.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Your Application                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React/Next.js/etc.)                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │   Your Pages    │  │   Admin UI      │  │ Custom Editors   │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘ │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                │
├────────────────────────────────┼────────────────────────────────┤
│  Convex Backend                │                                │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │                     Your Convex Functions                  │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │  │
│  │  │  mutations.ts │  │  queries.ts   │  │  actions.ts   │  │  │
│  │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  │  │
│  │          │                  │                  │          │  │
│  │          └──────────────────┼──────────────────┘          │  │
│  │                             │                             │  │
│  │  ┌──────────────────────────┴──────────────────────────┐  │  │
│  │  │              CMS Client Wrapper                      │  │  │
│  │  │  createCmsClient(components.convexCms, config)      │  │  │
│  │  └──────────────────────────┬──────────────────────────┘  │  │
│  └─────────────────────────────┼─────────────────────────────┘  │
│                                │                                │
├────────────────────────────────┼────────────────────────────────┤
│  Convex CMS Component          │   (Isolated Sandbox)           │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ Content  │  │  Media   │  │ Versions │  │  Audit   │  │  │
│  │  │ Types    │  │  Assets  │  │  History │  │  Logs    │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ Content  │  │  Media   │  │ Webhooks │  │  Events  │  │  │
│  │  │ Entries  │  │ Variants │  │          │  │          │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │                  CMS Database Tables                  │ │  │
│  │  │  (13 isolated tables - separate from your app)       │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Convex Component Model

Convex CMS is built as a **Convex Component**, which provides:

### Isolation

- **Separate Database**: The CMS has its own 13 tables, completely isolated from your app's tables
- **No Direct Access**: The component cannot read your app's tables, and you cannot directly query CMS tables
- **Function Boundary**: All communication happens through defined component functions

### Composition

- **Self-Contained**: All CMS functionality is bundled in the component
- **Versioned**: The component can be updated independently
- **Reusable**: Same component can be used across multiple projects

### Integration Points

```typescript
// Your app installs the component
import { defineApp } from "convex/server";
import convexCms from "@convex-cms/core/convex.config";

const app = defineApp();
app.use(convexCms);  // Mount the CMS component
export default app;
```

## Database Schema

The CMS uses 13 primary tables:

### Core Content

| Table | Purpose |
|-------|---------|
| `content_types` | Content type definitions (schemas) |
| `content_entries` | Actual content instances |
| `content_versions` | Version snapshots for history |

### Media Management

| Table | Purpose |
|-------|---------|
| `media_assets` | File metadata and references |
| `media_folders` | Folder hierarchy |
| `media_variants` | Optimized image variants |

### Taxonomy

| Table | Purpose |
|-------|---------|
| `taxonomies` | Tag/category systems |
| `taxonomy_terms` | Individual terms |
| `content_entry_tags` | Entry-term relationships |

### Operations

| Table | Purpose |
|-------|---------|
| `trash_config` | Soft delete configuration |
| `cms_events` | Event stream for changes |
| `audit_logs` | Comprehensive audit trail |
| `webhook_configs` | Webhook endpoints |
| `webhook_deliveries` | Delivery tracking |

## Data Flow

### Creating Content

```
Client → Your Mutation → CMS Client → Component Mutation → Database
                           ↓
                    Authorization Check
                           ↓
                     Validation
                           ↓
                    Event Emission
                           ↓
                    Audit Logging
```

### Publishing Content

```
Publish Request
      ↓
Authorization (getUserRole → hasPermission)
      ↓
Lock Check (if content locking enabled)
      ↓
Validation (check required fields)
      ↓
Create Version Snapshot
      ↓
Update Entry Status
      ↓
Emit Events (for webhooks, search indexing)
      ↓
Create Audit Log
      ↓
Return Updated Entry
```

## Client Wrapper Architecture

The client wrapper (`createCmsClient`) provides:

### Type Safety

```typescript
// Raw component call (untyped)
await ctx.runMutation(components.convexCms.contentEntryMutations.create, {
  contentTypeId,
  data,
});

// Client wrapper (typed)
await cms.contentEntries.create(ctx, {
  contentTypeId,  // Autocomplete for Id<"content_types">
  data,           // Type-checked against content type
});
```

### Configuration Injection

```typescript
const cms = createCmsClient(components.convexCms, {
  defaultLocale: "en",
  getUserRole: async ({ userId }) => lookupRole(userId),
});

// Every call automatically includes configuration
await cms.contentEntries.create(ctx, { ... });
// Internally: { ...args, locale: "en", userId, role }
```

### API Organization

```typescript
// Namespaced methods for discoverability
cms.contentTypes.create()
cms.contentEntries.publish()
cms.mediaAssets.upload()
cms.versions.rollback()
```

### Typed Client (Code-First Schemas)

For applications using code-first schema definitions, a typed client provides full TypeScript inference:

```typescript
// Define schemas with Convex validators
const blogPost = defineContentType({
  name: "blog_post",
  validator: v.object({
    title: v.string(),
    content: v.string(),
  }),
});

const contentSchema = createContentSchema({ blogPost });

// Create typed client
const cms = createTypedCmsClient(components.convexCms, {
  schema: contentSchema,
});

// Full type inference
const post = await cms.typedContentEntries.get<"blog_post">(ctx, id);
post.data.title;  // TypeScript knows this is string
```

### Schema Utilities

Additional utilities for schema management:

```
┌────────────────────┐     ┌─────────────────────┐
│  Code-First Types  │     │   Database Types    │
│  defineContentType │     │  (admin UI created) │
└────────┬───────────┘     └──────────┬──────────┘
         │                            │
         │   detectSchemaDrift()      │
         └──────────┬─────────────────┘
                    ↓
            Drift Report
                    │
         ┌──────────┴──────────┐
         ↓                     ↓
    Fix in Code        generateTypesFromDatabase()
                               ↓
                        Generated .ts file
```

- **Schema Drift Detection**: Compares code schemas against database to find mismatches
- **Type Code Generation**: Creates TypeScript types from database content type definitions

## Authorization Architecture

Since components can't access `ctx.auth`, authorization flows through hooks:

```
Request with userId
        ↓
getUserRole Hook (your code)
        ↓
Returns role: "admin" | "editor" | "author" | "viewer" | custom
        ↓
RBAC Check (built-in)
  - Check role has required permission
  - Check scope (all vs own)
  - Check content type restrictions
        ↓
Authorization Hooks (optional)
  - beforeRbac: pre-processing
  - authorize: custom override
  - afterRbac: post-processing
  - onDeny: handle denials
        ↓
Allow or Deny
```

### Permission Model

```typescript
// Permission tuple
{
  resource: "contentEntries",  // What
  action: "publish",           // Operation
  scope: "own"                 // Whose (all | own)
}

// Role has array of permissions
const editor = {
  permissions: [
    { resource: "contentEntries", action: "create", scope: "all" },
    { resource: "contentEntries", action: "update", scope: "all" },
    { resource: "contentEntries", action: "publish", scope: "all" },
    // ...
  ]
};
```

## Event-Driven Architecture

All mutations emit events that drive downstream functionality:

```
Mutation
    ↓
Event Emitted to cms_events table
    │
    ├──→ Webhook System
    │    - Matches event against webhook configs
    │    - Delivers to external endpoints
    │    - Tracks delivery status
    │
    ├──→ Audit Logging
    │    - Records before/after state
    │    - Captures user context
    │
    ├──→ Search Indexing
    │    - Updates search text
    │    - Triggers re-indexing
    │
    └──→ RAG Indexing
         - Prepares content for vector embeddings
         - Signals need for re-embedding
```

### Event Types

- `contentType.created`, `contentType.updated`, `contentType.deleted`
- `contentEntry.created`, `contentEntry.updated`, `contentEntry.published`, `contentEntry.unpublished`, `contentEntry.deleted`, `contentEntry.restored`
- `mediaAsset.created`, `mediaAsset.updated`, `mediaAsset.deleted`
- `webhook.delivered`, `webhook.failed`

## Versioning Architecture

Version snapshots capture complete state:

```
Entry State at Version N
┌─────────────────────────┐
│ versionNumber: N        │
│ data: { all fields }    │
│ slug: "current-slug"    │
│ status: "published"     │
│ createdBy: "user123"    │
│ publishedAt: timestamp  │
└─────────────────────────┘

Rollback Process:
1. Load version N snapshot
2. Create new entry with version N+1
3. Copy data from snapshot
4. Record rollback in audit log
5. Preserve all previous versions
```

## Media Architecture

### Upload Flow

```
Client                    Convex                    Storage
   │                         │                         │
   │─── generateUploadUrl ──→│                         │
   │                         │                         │
   │←── { uploadUrl, id } ───│                         │
   │                         │                         │
   │─────── PUT file ────────────────────────────────→│
   │                         │                         │
   │←────── 200 OK ──────────────────────────────────│
   │                         │                         │
   │─── createMediaAsset ───→│                         │
   │    (storageId, meta)    │                         │
   │                         │                         │
   │←── MediaAsset record ───│                         │
```

### Variant Processing

```
Original Image (media_assets)
        │
        ├──→ Request variant generation
        │
        ↓
Variant Record Created (media_variants)
  - status: "pending"
        │
        ↓
Background Processing
  - Resize
  - Convert format
  - Optimize quality
        │
        ↓
Variant Complete
  - status: "completed"
  - storageId: new file
```

## Admin UI Architecture

Built with TanStack Start (React 19 + Vite + Nitro):

```
Admin UI
├── TanStack Router (file-based routing)
│   └── routes/
│       ├── __root.tsx     → Layout + Auth
│       ├── index.tsx      → Dashboard
│       ├── content-types.tsx
│       ├── content.tsx
│       ├── entries/
│       │   ├── $entryId.tsx   → Edit entry
│       │   └── new.$typeId.tsx → Create entry
│       ├── media.tsx
│       └── settings.tsx
│
├── Convex React Hooks
│   └── useQuery, useMutation
│
└── Components
    ├── AdminLayout
    ├── ContentEntryEditor
    └── Field Renderers (dynamic per field type)
```

## Performance Considerations

### Indexing Strategy

All tables have carefully designed indexes:

```typescript
// content_entries indexes
by_content_type: ["contentTypeId"]
by_slug: ["contentTypeId", "slug", "locale"]
by_status: ["status"]
by_locale: ["locale"]
by_scheduled_publish: ["scheduledPublishAt"]
```

### Pagination

Uses cursor-based pagination via `convex-helpers`:

```typescript
const result = await cms.contentEntries.list(ctx, {
  skip: 0,
  limit: 20,
});
// Returns: { items: [], totalCount: number }
```

### Query Optimization

- Uses `.withIndex()` instead of `.filter()` for efficient queries
- Avoids full table scans
- Leverages compound indexes for multi-field queries

### Caching

- No built-in caching (Convex handles reactivity)
- Recommend edge caching for public content APIs
- Consider CDN for media assets

---

See also:
- [Code-First Schema Reference](../api/code-first-schema.md)
- [Database Schema Reference](./database-schema.md)
- [Authorization Hooks](./authorization-hooks.md)
- [Performance Guide](./performance.md)
