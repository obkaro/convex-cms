# Authorization & RBAC

Convex CMS provides a comprehensive role-based access control (RBAC) system to secure your content. This guide covers how to configure and use authorization.

## Understanding Component Authorization

While Convex CMS runs as an isolated component, the wrapper code runs in your app's context. This means authorization hooks receive the full Convex context (`ctx`) and can access your database directly.

Authorization works through:

1. **getUserRole hook**: Receives `ctx` and can query your database to map user IDs to CMS roles
2. **RBAC system**: Built-in roles with permission sets
3. **Authorization hooks**: Optional custom logic with full database access

## Quick Setup

### Development Mode (No Auth)

For development without auth:

```typescript
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

const cms = createCmsClient(components.convexCms, {
  permissiveMode: true,  // Bypass all authorization
});
```

**Warning**: Never use `permissiveMode: true` in production.

### Production Setup

The `getUserRole` hook receives `ctx` as its first argument, allowing you to query your database directly to determine user roles.

```typescript
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

const cms = createCmsClient(components.convexCms, {
  // Map user IDs to CMS roles
  // ctx gives you full database access!
  getUserRole: async (ctx, { userId }) => {
    if (!userId) return null;

    // Query your database directly
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), userId))
      .first();

    return user?.cmsRole ?? "viewer";
  },
});
```

## Built-in Roles

### admin

Full access to all CMS features.

```typescript
permissions: [
  // Content types - full CRUD
  { resource: "contentTypes", action: "create" },
  { resource: "contentTypes", action: "read" },
  { resource: "contentTypes", action: "update" },
  { resource: "contentTypes", action: "delete" },
  // Content entries - full CRUD + publish + restore
  { resource: "contentEntries", action: "create" },
  { resource: "contentEntries", action: "read" },
  { resource: "contentEntries", action: "update" },
  { resource: "contentEntries", action: "delete" },
  { resource: "contentEntries", action: "publish" },
  { resource: "contentEntries", action: "unpublish" },
  { resource: "contentEntries", action: "restore" },
  // Media - full CRUD
  { resource: "mediaItems", action: "create" },
  { resource: "mediaItems", action: "read" },
  { resource: "mediaItems", action: "update" },
  { resource: "mediaItems", action: "delete" },
  // Settings
  { resource: "settings", action: "manage" },
  { resource: "settings", action: "read" },
]
```

Use for: CMS administrators, developers

### editor

Can manage all content and media, but no settings access.

```typescript
permissions: [
  // Content types - read only
  { resource: "contentTypes", action: "read" },
  // Content entries - full CRUD + publish + restore
  { resource: "contentEntries", action: "create" },
  { resource: "contentEntries", action: "read" },
  { resource: "contentEntries", action: "update" },
  { resource: "contentEntries", action: "delete" },
  { resource: "contentEntries", action: "publish" },
  { resource: "contentEntries", action: "unpublish" },
  { resource: "contentEntries", action: "restore" },
  // Media - full CRUD
  { resource: "mediaItems", action: "create" },
  { resource: "mediaItems", action: "read" },
  { resource: "mediaItems", action: "update" },
  { resource: "mediaItems", action: "delete" },
]
```

Use for: Content managers, senior editors

### author

Can create content and manage their own entries.

```typescript
permissions: [
  // Content types - read only
  { resource: "contentTypes", action: "read" },
  // Content entries - own content only
  { resource: "contentEntries", action: "create" },
  { resource: "contentEntries", action: "read", scope: "own" },
  { resource: "contentEntries", action: "update", scope: "own" },
  { resource: "contentEntries", action: "delete", scope: "own" },
  { resource: "contentEntries", action: "publish", scope: "own" },
  { resource: "contentEntries", action: "unpublish", scope: "own" },
  // Media - create + read all, manage own
  { resource: "mediaItems", action: "create" },
  { resource: "mediaItems", action: "read", scope: "all" },
  { resource: "mediaItems", action: "update", scope: "own" },
  { resource: "mediaItems", action: "delete", scope: "own" },
]
```

Use for: Writers, contributors

### viewer

Read-only access to published content.

```typescript
permissions: [
  { resource: "contentTypes", action: "read" },
  { resource: "contentEntries", action: "read" },
  { resource: "mediaItems", action: "read" },
]
```

Use for: Reviewers, stakeholders

## Permission Structure

Permissions define what users can do:

```typescript
interface CustomPermission {
  resource: "contentTypes" | "contentEntries" | "mediaItems" | "settings";
  action: "create" | "read" | "update" | "delete" | "publish" | "unpublish" | "restore" | "manage" | "move";
  scope?: "all" | "own";
  contentTypes?: string[];
  excludeContentTypes?: string[];
}
```

- **scope** defaults to `"all"` if omitted
- `"own"` scope restricts the action to resources created by the user
- **contentTypes** / **excludeContentTypes** narrow permissions to specific content types

## Custom Roles

Define custom roles for your specific needs. Custom roles are provided as an array of `CustomRoleInput` objects:

```typescript
const cms = createCmsClient(components.convexCms, {
  getUserRole: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), userId))
      .first();
    return user?.cmsRole ?? null;
  },

  customRoles: [
    // Blog writer: can create/publish blogs, view everything else
    {
      name: "blogWriter",
      displayName: "Blog Writer",
      description: "Can create and manage blog posts",
      permissions: [
        { resource: "contentTypes", action: "read" },
        { resource: "contentEntries", action: "create", contentTypes: ["blog_post"] },
        { resource: "contentEntries", action: "read", contentTypes: ["blog_post"] },
        { resource: "contentEntries", action: "update", scope: "own", contentTypes: ["blog_post"] },
        { resource: "contentEntries", action: "publish", scope: "own", contentTypes: ["blog_post"] },
        { resource: "mediaItems", action: "create" },
        { resource: "mediaItems", action: "read" },
      ],
    },

    // Media manager: full media access, read-only content
    {
      name: "mediaManager",
      displayName: "Media Manager",
      description: "Full media access with read-only content",
      permissions: [
        { resource: "contentEntries", action: "read" },
        { resource: "mediaItems", action: "create" },
        { resource: "mediaItems", action: "read" },
        { resource: "mediaItems", action: "update" },
        { resource: "mediaItems", action: "delete" },
        { resource: "mediaItems", action: "move" },
      ],
    },

    // Translator: can update content in any locale
    {
      name: "translator",
      displayName: "Translator",
      description: "Can read and update all content entries",
      permissions: [
        { resource: "contentTypes", action: "read" },
        { resource: "contentEntries", action: "read" },
        { resource: "contentEntries", action: "update" },
      ],
    },
  ],
});
```

## Authorization Hooks

For advanced authorization logic, use hooks:

### beforeRbac

Run before the RBAC check. Return `{ allowed: false }` for early rejection, or `{ allowed: true }` to continue to RBAC:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    beforeRbac: async (context) => {
      // Log all operations (context.operation is e.g. "contentEntries.publish")
      console.log(`User ${context.userId} attempting ${context.operation}`);
      return { allowed: true };
    },
  },
});
```

### authorize

Runs after RBAC regardless of outcome. Receives `context.defaultDecision` showing what RBAC decided, and can override it:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    authorize: async (context) => {
      // Superuser check - override RBAC denial
      const isSuperuser = await checkSuperuser(context.ctx, context.userId);
      if (isSuperuser) return { allowed: true };

      // Custom workflow: drafts need manager approval
      if (context.operation === "contentEntries.publish") {
        const entry = await context.ctx.db.get(context.resourceId);
        const needsApproval = entry.data.requiresApproval;

        if (needsApproval) {
          const mgr = await isManager(context.userId);
          return { allowed: mgr, reason: mgr ? undefined : "Manager approval required" };
        }
      }

      // Accept the default RBAC decision
      return { allowed: context.defaultDecision.allowed };
    },
  },
});
```

### afterRbac

Run after RBAC passes. Add additional restrictions (team membership, quotas, etc.):

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    afterRbac: async (context) => {
      // Additional team-based restriction
      const isMember = await checkTeamMembership(context.ctx, context.userId);
      if (!isMember) {
        return { allowed: false, reason: "Not a team member" };
      }
      return { allowed: true };
    },
  },
});
```

### onDeny

Called when authorization is denied. Return `{ allowed: true }` to override the denial:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    onDeny: async (context) => {
      // Send alert for sensitive operations
      if (context.operation === "contentTypes.delete") {
        await sendSecurityAlert({
          userId: context.userId,
          operation: context.operation,
        });
      }
      return { allowed: false };
    },
  },
});
```

### Operation Hooks

Per-operation authorization, keyed by `CmsOperation` strings:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    operationHooks: {
      "contentEntries.publish": async (context) => {
        // Only allow publishing during business hours
        const hour = new Date().getHours();
        if (hour < 9 || hour > 17) {
          return { allowed: false, reason: "Publishing outside business hours" };
        }
        return { allowed: true };
      },

      "contentTypes.delete": async (context) => {
        // Require explicit confirmation via operationData
        const hasConfirmation = context.operationData?.confirmed === true;
        if (!hasConfirmation) {
          return { allowed: false, reason: "Confirmation required" };
        }
        return { allowed: true };
      },
    },
  },
});
```

## Checking Permissions

### In Your Code

```typescript
// Check if user has a specific permission
const canPublish = await cms.hasPermissionForUser(ctx, userId, {
  resource: "contentEntries",
  action: "publish",
  scope: "all",
});

if (!canPublish) {
  throw new Error("You don't have permission to publish");
}
```

### Content Type Specific

```typescript
// Check permission for a specific content type
const canEditBlogs = await cms.hasContentTypePermissionForUser(
  ctx,
  userId,
  { resource: "contentEntries", action: "update" },
  "blog_post"
);
```

### In React (Admin UI)

```typescript
import { usePermissions } from "@convex-cms/admin";

function PublishButton({ entryId }) {
  const { hasPermission } = usePermissions();

  if (!hasPermission("contentEntries", "publish")) {
    return null;  // Don't show button
  }

  return <button onClick={() => publish(entryId)}>Publish</button>;
}
```

## Rate Limiting

Prevent abuse with rate limiting hooks:

```typescript
const cms = createCmsClient(components.convexCms, {
  rateLimitHooks: {
    check: async (context) => {
      // Use your rate limiter
      const result = await checkRateLimit({
        userId: context.userId,
        operation: context.operation,
        operationCategory: context.operationCategory,
      });

      return {
        allowed: result.allowed,
        retryAt: result.retryAt,
        reason: result.reason,
      };
    },

    consume: async (context) => {
      // Consume a rate limit token after check passes
      await consumeRateLimit({
        userId: context.userId,
        operation: context.operation,
      });
      return { allowed: true, consumed: true };
    },
  },
});
```

## Security Best Practices

### Never Trust Client Data

```typescript
// Bad: trusting client-provided userId
export const createEntry = mutation({
  args: { userId: v.string(), title: v.string() },
  handler: async (ctx, { userId, title }) => {
    return cms.contentEntries.create(ctx, {
      data: { title },
      createdBy: userId,  // Client could send any userId!
    });
  },
});

// Good: get userId from authenticated session
export const createEntry = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const { userId } = await getAuth(ctx);
    if (!userId) throw new Error("Not authenticated");

    return cms.contentEntries.create(ctx, {
      data: { title },
      createdBy: userId,  // Server-verified userId
    });
  },
});
```

### Validate Permissions Before Operations

```typescript
export const deleteEntry = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const { userId } = await getAuth(ctx);

    // Check permission before deleting
    const entry = await cms.contentEntries.get(ctx, id);
    const canDelete = await cms.hasPermissionForUser(ctx, userId, {
      resource: "contentEntries",
      action: "delete",
      scope: entry.createdBy === userId ? "own" : "all",
    });

    if (!canDelete) {
      throw new Error("Permission denied");
    }

    return cms.contentEntries.delete(ctx, { id });
  },
});
```

### Use Content Type Restrictions

For roles that should only access specific content types, use the `contentTypes` field on individual permissions:

```typescript
customRoles: [
  {
    name: "productEditor",
    displayName: "Product Editor",
    description: "Can manage product content only",
    permissions: [
      { resource: "contentTypes", action: "read" },
      { resource: "contentEntries", action: "create", contentTypes: ["product", "product_category"] },
      { resource: "contentEntries", action: "read", contentTypes: ["product", "product_category"] },
      { resource: "contentEntries", action: "update", contentTypes: ["product", "product_category"] },
      { resource: "contentEntries", action: "delete", contentTypes: ["product", "product_category"] },
      { resource: "contentEntries", action: "publish", contentTypes: ["product", "product_category"] },
    ],
  },
]
```

### Log Security Events

```typescript
authorizationHooks: {
  onDeny: async (context) => {
    await context.ctx.db.insert("securityLogs", {
      event: "authorization_denied",
      userId: context.userId,
      operation: context.operation,
      resourceId: context.resourceId,
      timestamp: Date.now(),
    });
    return { allowed: false };
  },
}
```

---

See also:
- [Configuration Reference](../api/configuration.md)
- [Media Management Guide](./media.md)

---

Next: [Media Management Guide](./media.md)
