# Access Control Patterns

Patterns for authentication and authorization in the convex-cms component.

## ⚠️ Component Note

**Convex components cannot access `ctx.auth`.** User identity must be passed as function arguments from the parent app. The parent app is responsible for authenticating users before calling component functions.

## Core Principle

**Every public function must verify access.** Public functions can be called by anyone, including attackers. Authorization is enforced via hooks that the parent app configures.

## Authorization Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Parent App                             │
│  1. Authenticate user (Clerk, Auth0, etc.)                  │
│  2. Get user identity from ctx.auth.getUserIdentity()       │
│  3. Pass userId/userRole to component function              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CMS Component                             │
│  1. Receive userId/userRole as function args                 │
│  2. Check authorization via hooks                            │
│  3. Execute business logic                                   │
└─────────────────────────────────────────────────────────────┘
```

## Authorization Hooks

The component uses hooks to allow the parent app to customize authorization:

```typescript
// src/client/index.ts - Parent app creates client with hooks
const cms = createCmsClient(components.convexCms, {
  defaultLocale: "en-US",
  features: { versioning: true },

  // Required: Map app users to CMS roles
  getUserRole: async ({ userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_id", (q) => q.eq("_id", userId))
      .unique()
    return user?.cmsRole ?? "viewer"
  },

  // Optional: Custom authorization logic
  authorize: async ({ userId, userRole, action, resource }) => {
    // Return true to allow, false to deny
    if (action === "delete" && resource.type === "content_entry") {
      return userRole === "admin"
    }
    return true // Fall through to default RBAC
  },
})
```

## Built-in RBAC Roles

The component has built-in roles with permissions:

| Role    | Permissions                                         |
| ------- | --------------------------------------------------- |
| admin   | All operations including delete, user management    |
| editor  | Create, update, publish content; manage media       |
| author  | Create, update own content; limited publish         |
| viewer  | Read-only access                                    |

See: `src/component/authorization.ts` for role definitions.

## Function Signature Pattern

Component functions receive user context as arguments:

```typescript
// src/component/contentEntryMutations.ts
export const publish = mutation({
  args: {
    entryId: v.id("content_entries"),
    userId: v.string(),      // From parent app's auth
    userRole: v.optional(v.string()), // Optional, can be derived
  },
  returns: v.id("content_entries"),
  handler: async (ctx, { entryId, userId, userRole }) => {
    // Authorization check via helper
    const resolvedRole = userRole ?? await resolveUserRole(ctx, userId)

    if (!hasPermission(resolvedRole, "publish")) {
      throw new ConvexError("Unauthorized")
    }

    // Business logic
    const entry = await ctx.db.get(entryId)
    if (!entry) throw new ConvexError("Entry not found")

    return ctx.db.patch(entryId, { status: "published" })
  },
})
```

## Permission Checks

Use the authorization helper functions:

```typescript
// src/component/lib/authorization.ts
import { hasPermission, checkAuthorization } from './lib/authorization'

// Simple permission check
if (!hasPermission(userRole, "content:publish")) {
  throw new ConvexError("Unauthorized")
}

// Full authorization check with hooks
await checkAuthorization(ctx, {
  userId,
  userRole,
  action: "publish",
  resource: { type: "content_entry", id: entryId },
})
```

## Ownership Checks

For user-owned resources, verify ownership:

```typescript
async function ensureOwnerOrAdmin(
  ctx: QueryCtx,
  entry: Doc<"content_entries">,
  userId: string,
  userRole: string,
) {
  if (userRole === "admin") return // Admins can access all

  if (entry.createdBy !== userId) {
    throw new ConvexError("You can only modify your own content")
  }
}
```

## Granular Functions

Prefer specific functions over generic update functions:

| Avoid                              | Prefer                            |
| ---------------------------------- | --------------------------------- |
| `updateEntry({ id, update })`      | `publishEntry()`, `archiveEntry()`|
| `updateContentType({ id, fields })`| `addField()`, `removeField()`     |

Granular functions allow specific access checks per operation.

## Access Control Patterns

| Pattern                      | Use Case                                  |
| ---------------------------- | ----------------------------------------- |
| Role-based (RBAC)            | General permission tiers                  |
| Ownership check              | User owns this resource                   |
| Content type permissions     | Different rules per content type          |
| Workflow state checks        | Only publish if in "review" state         |

## Security Checklist

- [ ] User context passed from parent app (not from client directly)
- [ ] All public functions check authorization
- [ ] Ownership verified before data modification
- [ ] Granular functions for different permission levels
- [ ] Authorization hooks allow customization
- [ ] Sensitive operations require admin role

## Common Mistakes

1. **Trying to use `ctx.auth`** - Components can't access it; use function args
2. **Trusting client-provided userId** - Parent app must validate identity
3. **Generic update functions** - Hard to apply granular permissions
4. **Missing ownership checks** - User could modify others' content
5. **Hardcoded permissions** - Use hooks for customization
