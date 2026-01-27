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
  { resource: "*", action: "*", scope: "all" }
]
```

Use for: CMS administrators, developers

### editor

Can manage all content and media, but no settings access.

```typescript
permissions: [
  { resource: "contentTypes", action: "read", scope: "all" },
  { resource: "contentEntries", action: "*", scope: "all" },
  { resource: "mediaAssets", action: "*", scope: "all" },
  { resource: "mediaFolders", action: "*", scope: "all" },
]
```

Use for: Content managers, senior editors

### author

Can create content and manage their own entries.

```typescript
permissions: [
  { resource: "contentTypes", action: "read", scope: "all" },
  { resource: "contentEntries", action: "create", scope: "all" },
  { resource: "contentEntries", action: "read", scope: "all" },
  { resource: "contentEntries", action: "update", scope: "own" },
  { resource: "contentEntries", action: "delete", scope: "own" },
  { resource: "contentEntries", action: "publish", scope: "own" },
  { resource: "mediaAssets", action: "create", scope: "all" },
  { resource: "mediaAssets", action: "read", scope: "all" },
]
```

Use for: Writers, contributors

### viewer

Read-only access to published content.

```typescript
permissions: [
  { resource: "contentTypes", action: "read", scope: "all" },
  { resource: "contentEntries", action: "read", scope: "all" },
  { resource: "mediaAssets", action: "read", scope: "all" },
]
```

Use for: Reviewers, stakeholders

## Permission Structure

Permissions define what users can do:

```typescript
interface Permission {
  resource: ResourceType;
  action: ActionType;
  scope: ScopeType;
}

type ResourceType =
  | "contentTypes"
  | "contentEntries"
  | "mediaAssets"
  | "mediaFolders"
  | "versions"
  | "*";  // All resources

type ActionType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "restore"
  | "manage"
  | "*";  // All actions

type ScopeType =
  | "all"    // Can act on any resource
  | "own";   // Can only act on resources they created
```

## Custom Roles

Define custom roles for your specific needs:

```typescript
const cms = createCmsClient(components.convexCms, {
  getUserRole: async (ctx, { userId }) => {
    // Query your database to get the user's role
    const user = await ctx.db.get(userId);
    return user?.cmsRole ?? null;
  },

  customRoles: {
    // Blog writer: can create/publish blogs, view everything else
    blogWriter: {
      displayName: "Blog Writer",
      permissions: [
        { resource: "contentTypes", action: "read", scope: "all" },
        { resource: "contentEntries", action: "create", scope: "all" },
        { resource: "contentEntries", action: "read", scope: "all" },
        { resource: "contentEntries", action: "update", scope: "own" },
        { resource: "contentEntries", action: "publish", scope: "own" },
        { resource: "mediaAssets", action: "create", scope: "all" },
        { resource: "mediaAssets", action: "read", scope: "all" },
      ],
      // Restrict to specific content types
      contentTypeRestrictions: ["blog_post"],
    },

    // Media manager: full media access, read-only content
    mediaManager: {
      displayName: "Media Manager",
      permissions: [
        { resource: "contentEntries", action: "read", scope: "all" },
        { resource: "mediaAssets", action: "*", scope: "all" },
        { resource: "mediaFolders", action: "*", scope: "all" },
      ],
    },

    // Translator: can update content in any locale
    translator: {
      displayName: "Translator",
      permissions: [
        { resource: "contentTypes", action: "read", scope: "all" },
        { resource: "contentEntries", action: "read", scope: "all" },
        { resource: "contentEntries", action: "update", scope: "all" },
        // No publish - needs editor approval
      ],
      localeRestrictions: ["es", "fr", "de"],  // Only these locales
    },
  },
});
```

## Authorization Hooks

For advanced authorization logic, use hooks:

### beforeRbac

Run before the RBAC check. Use for setup or logging:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    beforeRbac: async (context) => {
      // Log all operations
      console.log(`User ${context.userId} attempting ${context.action} on ${context.resource}`);
    },
  },
});
```

### authorize

Override the RBAC system entirely:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    authorize: async (context) => {
      // Superuser check
      const isSuperuser = await checkSuperuser(context.ctx, context.userId);
      if (isSuperuser) return true;

      // Custom workflow: drafts need manager approval
      if (context.action === "publish" && context.resource === "contentEntries") {
        const entry = await context.ctx.db.get(context.resourceId);
        const needsApproval = entry.data.requiresApproval;

        if (needsApproval) {
          return await isManager(context.userId);
        }
      }

      // Fall back to default RBAC
      return null;  // null means "use default RBAC"
    },
  },
});
```

### afterRbac

Run after RBAC check, before the operation:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    afterRbac: async (context, rbacResult) => {
      // Audit failed authorization attempts
      if (!rbacResult.allowed) {
        await logAuthFailure(context);
      }
    },
  },
});
```

### onDeny

Called when authorization is denied:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    onDeny: async (context) => {
      // Send alert for sensitive operations
      if (context.action === "delete" && context.resource === "contentTypes") {
        await sendSecurityAlert({
          userId: context.userId,
          action: "Attempted to delete content type",
        });
      }
    },
  },
});
```

### Operation Hooks

Per-operation authorization:

```typescript
const cms = createCmsClient(components.convexCms, {
  authorizationHooks: {
    operationHooks: {
      "contentEntries.publish": async (context) => {
        // Only allow publishing during business hours
        const hour = new Date().getHours();
        if (hour < 9 || hour > 17) {
          return false;  // Deny outside business hours
        }
        return null;  // Use default RBAC
      },

      "contentTypes.delete": async (context) => {
        // Require explicit confirmation via metadata
        const hasConfirmation = context.metadata?.confirmed === true;
        if (!hasConfirmation) {
          return false;
        }
        return null;
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
        action: context.action,
        resource: context.resource,
      });

      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: result.resetAt,
      };
    },

    consume: async (context) => {
      // Consume a rate limit token
      await consumeRateLimit({
        userId: context.userId,
        action: context.action,
      });
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
  args: { id: v.id("content_entries") },
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

For roles that should only access specific content types:

```typescript
customRoles: {
  productEditor: {
    displayName: "Product Editor",
    permissions: [
      { resource: "contentEntries", action: "*", scope: "all" },
    ],
    contentTypeRestrictions: ["product", "product_category"],
  },
}
```

### Log Security Events

```typescript
authorizationHooks: {
  onDeny: async (context) => {
    await ctx.db.insert("securityLogs", {
      event: "authorization_denied",
      userId: context.userId,
      action: context.action,
      resource: context.resource,
      resourceId: context.resourceId,
      timestamp: Date.now(),
    });
  },
}
```

---

See also:
- [Configuration Reference](../api/configuration.md)
- [Media Management Guide](./media.md)

---

Next: [Media Management Guide](./media.md)
