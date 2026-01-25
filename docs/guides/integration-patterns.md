# Integration Patterns

This guide covers common ways to integrate Convex CMS into your application.

---

## Decision Tree

```
Will AI agents manage content?
│
├── Yes → Pattern 5: Agent Integration (with optional Admin UI)
│
└── No
    │
    └── Do you need a visual content editor?
        │
        ├── Yes
        │   │
        │   └── Do you have your own React app with auth?
        │       │
        │       ├── Yes → Pattern 3: Admin UI + Custom Functions (most common)
        │       │
        │       └── No → Pattern 1: Admin UI Only
        │
        └── No → Pattern 2: Custom Functions Only
```

---

## Pattern 1: Admin UI Only

**Use when:** Simple sites, agencies managing client content, blogs, portfolios

**Setup:**
- `defineAdminAPI` for the admin backend
- CLI mode for development, embed mode for production
- No custom Convex functions needed

### Example

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms);
export default app;
```

```typescript
// convex/admin.ts
import { defineAdminAPI } from "convex-cms";
import { components } from "./_generated/api";

export const {
  listContentTypes,
  getEntry,
  publishEntry,
  // ... all admin functions
} = defineAdminAPI(components.convexCms);
```

```tsx
// Your frontend fetches published content directly
// from the CMS component or via a simple wrapper
```

### When to use

- Content editors use the Admin UI
- Frontend only needs to display published content
- No custom business logic around content

---

## Pattern 2: Custom Functions Only

**Use when:** Headless API, mobile app backend, no visual editing needed

**Setup:**
- `createCmsClient` for typed access in your functions
- No Admin UI
- Content managed programmatically or via scripts

### Example

```typescript
// convex/cms.ts
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

export const cms = createCmsClient(components.convexCms, {
  permissiveMode: true, // For development
});
```

```typescript
// convex/blog.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { cms } from "./cms";

export const getPosts = query({
  args: {},
  handler: async (ctx) => {
    const result = await cms.contentEntries.list(ctx, {
      status: "published",
    });
    return result.page;
  },
});

export const createPost = mutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    // Create and immediately publish
    const entry = await cms.contentEntries.create(ctx, {
      contentTypeId: blogTypeId,
      data: args,
      createdBy: "system",
    });
    await cms.contentEntries.publish(ctx, {
      id: entry._id,
      publishedBy: "system",
    });
    return entry;
  },
});
```

### When to use

- API-first architecture
- Content created by code, scripts, or AI agents
- Custom admin interface built from scratch
- Minimal setup, maximum control

**Enhancement:** For full TypeScript type inference, use [Code-First Schema](../api/code-first-schema.md) with `createTypedCmsClient`.

---

## Pattern 3: Admin UI + Custom Functions

**Use when:** Most applications — visual editing AND custom frontend queries

**Setup:**
- `defineAdminAPI` for the admin backend
- `createCmsClient` for your custom functions
- Both work together through the same CMS component

### Example

```typescript
// convex/admin.ts — for Admin UI
import { defineAdminAPI } from "convex-cms";
import { components } from "./_generated/api";

export const {
  listContentTypes,
  getEntry,
  publishEntry,
  // ... all admin functions
} = defineAdminAPI(components.convexCms, {
  auth: async (ctx, operation) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return identity.subject;
  },
});
```

```typescript
// convex/cms.ts — for your custom functions
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

export const cms = createCmsClient(components.convexCms, {
  getUserRole: async ({ userId }) => {
    // Map your users to CMS roles
    const user = await db.get(userId);
    return user?.cmsRole ?? "viewer";
  },
});
```

```typescript
// convex/blog.ts — custom queries for your frontend
import { query } from "./_generated/server";
import { cms } from "./cms";

export const getPublishedPosts = query({
  args: {},
  handler: async (ctx) => {
    const result = await cms.contentEntries.list(ctx, {
      status: "published",
    });
    return result.page.map(entry => ({
      id: entry._id,
      title: entry.data.title,
      slug: entry.slug,
      publishedAt: entry.publishedAt,
    }));
  },
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const entries = await cms.contentEntries.list(ctx, {
      status: "published",
    });
    return entries.page.find(e => e.slug === slug) ?? null;
  },
});
```

```tsx
// app/admin/page.tsx — embedded Admin UI
import { CmsAdmin } from "convex-cms/admin/embed";
import { api } from "@/convex/_generated/api";

export default function AdminPage() {
  return (
    <CmsAdmin
      api={api.admin}
      convexUrl={process.env.NEXT_PUBLIC_CONVEX_URL!}
      auth={authConfig}
    />
  );
}
```

### When to use

- Content editors need a visual interface
- Frontend needs custom queries (filtering, transforming, joining with other data)
- Different permissions for admin vs public access
- **This is the most common pattern**

---

## Pattern 4: Multi-Tenant

**Use when:** SaaS platform, multiple isolated CMS instances

**Setup:**
- Multiple component instances OR
- Single instance with tenant-aware authorization

### Option A: Multiple Component Instances

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms, { name: "tenant1Cms" });
app.use(convexCms, { name: "tenant2Cms" });
// ...
export default app;
```

Each tenant gets completely isolated tables.

### Option B: Single Instance with Authorization

```typescript
// convex/cms.ts
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

export const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    authorize: async (ctx, { userId, operation }) => {
      const user = await getUser(ctx, userId);
      const tenantId = user?.tenantId;

      // Only allow operations on own tenant's content
      if (operation.resourceId) {
        const resource = await getResource(ctx, operation.resourceId);
        if (resource.tenantId !== tenantId) {
          return { allowed: false, reason: "Wrong tenant" };
        }
      }

      return { allowed: true };
    },
  },
});
```

---

## Pattern 5: Agent Integration

**Use when:** AI agents creating/managing content, automated content workflows

**Setup:**
- `createCmsTools` for pre-built agent tools
- Use with `@convex-dev/agent` or custom agent frameworks
- Optional Admin UI for human oversight

### Example

```typescript
// convex/agentTools.ts
import { createCmsTools } from "convex-cms";
import { components } from "./_generated/api";

export const cmsTools = createCmsTools(components.convexCms, {
  defaultUserId: "content-agent",
});
```

```typescript
// convex/contentAgent.ts
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { cmsTools } from "./agentTools";

export const contentAgent = new Agent(components.agent, {
  name: "Content Manager",
  languageModel: openai.chat("gpt-4o"),
  tools: cmsTools,
  systemPrompt: `You are a content management assistant. You can:
- Create, update, and publish content entries
- Organize content with tags and categories
- Search for existing content
- Perform bulk operations on content`,
});
```

```typescript
// convex/chat.ts - Use agent in a conversation
import { mutation } from "./_generated/server";
import { contentAgent } from "./contentAgent";

export const chat = mutation({
  args: { message: v.string() },
  handler: async (ctx, { message }) => {
    const result = await contentAgent.run(ctx, {
      messages: [{ role: "user", content: message }],
    });
    return result;
  },
});
```

### Selective Tool Access

Give agents only the tools they need:

```typescript
// Read-only research agent
const { listContentEntries, searchContent, getContentEntry } =
  createCmsTools(components.convexCms);

const researchAgent = new Agent(components.agent, {
  name: "Content Researcher",
  tools: { listContentEntries, searchContent, getContentEntry },
});

// Publishing workflow agent
const { publishEntry, unpublishEntry, scheduleEntry, bulkPublish } =
  createCmsTools(components.convexCms);

const publishingAgent = new Agent(components.agent, {
  name: "Publishing Workflow",
  tools: { publishEntry, unpublishEntry, scheduleEntry, bulkPublish },
});
```

### When to use

- AI-generated content at scale
- Automated content workflows
- Chat interfaces for content management
- Content migration and bulk operations
- Agents that assist human editors

See [Agent Tools Guide](./agent-tools.md) for full documentation.

---

## Comparison Table

| Pattern | Admin UI | Custom Functions | Complexity | Use Case |
|---------|----------|------------------|------------|----------|
| **1. Admin UI Only** | ✓ | ✗ | Low | Blogs, portfolios |
| **2. Custom Only** | ✗ | ✓ | Low | APIs, scripts |
| **3. Both** | ✓ | ✓ | Medium | Most apps |
| **4. Multi-Tenant** | ✓/✗ | ✓ | High | SaaS platforms |
| **5. Agent Integration** | Optional | ✓ | Medium | AI-driven content |

---

## Migrating Between Patterns

### From Pattern 1 to Pattern 3

Add `createCmsClient` alongside your existing `defineAdminAPI`:

```typescript
// convex/cms.ts (new file)
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

export const cms = createCmsClient(components.convexCms);
```

Now you can use `cms.*` in your custom functions while Admin UI continues working.

### From Pattern 2 to Pattern 3

Add `defineAdminAPI` alongside your existing `createCmsClient`:

```typescript
// convex/admin.ts (new file)
import { defineAdminAPI } from "convex-cms";
import { components } from "./_generated/api";

export const {
  listContentTypes,
  // ... all admin functions
} = defineAdminAPI(components.convexCms);
```

Run `npx convex-cms admin` to access the Admin UI.

---

## See Also

- [Admin UI Setup](./admin-ui-setup.md) — CLI and embed modes
- [Getting Started](./getting-started.md) — `createCmsClient` usage
- [Agent Tools](./agent-tools.md) — AI agent integration with Zod schemas
- [Query Builder](./query-builder.md) — Fluent API for complex queries
- [Code-First Schema](../api/code-first-schema.md) — TypeScript-first content types with full type inference
- [Authorization](./authorization.md) — RBAC and custom roles
