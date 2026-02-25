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
│  │  │  (14 isolated tables, separate from your app)        │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Convex Component Model

Convex CMS is built as a **Convex Component**, which provides:

### Isolation

- **Separate Database**: The CMS has its own 14 tables, completely isolated from your app's tables
- **No Direct Access**: The component cannot read your app's tables, and you cannot directly query CMS tables
- **Function Boundary**: All communication happens through defined component functions

### Composition

- **Self-Contained**: All CMS functionality is bundled in the component
- **Versioned**: The component can be updated independently
- **Reusable**: Same component can be used across multiple projects

### Integration

```typescript
// Your app installs the component
import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms);  // Mount the CMS component
export default app;
```

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
  contentTypeName,
  data,
});

// Client wrapper (typed)
await cms.contentEntries.create(ctx, {
  contentTypeName,  // Autocomplete for content type names
  data,             // Type-checked against content type
});
```

### Configuration Injection

```typescript
const cms = createCmsClient(components.convexCms, {
  defaultLocale: "en",
  getUserRole: async (ctx, { userId }) => lookupRole(ctx, userId),
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
cms.mediaAssets.generateUploadUrl()
cms.versions.rollback()
```

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

---

See also:
- [Integration Patterns](../guides/integration-patterns.md) for common setups
- [Code-First Schema Reference](../api/code-first-schema.md)
- [Authorization Guide](../guides/authorization.md)
- [Configuration Reference](../api/configuration.md)
