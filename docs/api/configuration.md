# Configuration Reference

Complete reference for all Convex CMS configuration options.

---

## Client Configuration

```typescript
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

const cms = createCmsClient(components.convexCms, {
  // All options documented below
});
```

---

## Locale Settings

### defaultLocale

Default locale for content entries.

```typescript
defaultLocale: "en"  // Default: "en"
```

### supportedLocales

Array of supported locale codes.

```typescript
supportedLocales: ["en", "es", "fr", "de", "ja"]
```

### localeFallbackChains

Define fallback chains for locale resolution.

```typescript
localeFallbackChains: {
  "es-MX": ["es", "en"],      // Mexican Spanish -> Spanish -> English
  "es-AR": ["es", "en"],      // Argentine Spanish -> Spanish -> English
  "fr-CA": ["fr", "en"],      // Canadian French -> French -> English
  "zh-TW": ["zh-Hans", "en"], // Traditional Chinese -> Simplified -> English
}
```

### autoGenerateLocaleFallbacks

Automatically generate fallback chains based on language codes.

```typescript
autoGenerateLocaleFallbacks: true  // Default: true

// With this enabled:
// "es-MX" automatically falls back to "es" then default locale
```

---

## Feature Flags

### features

Enable or disable CMS features.

```typescript
features: {
  versioning: true,        // Version history and rollback (default: true)
  localization: false,     // Multi-locale support (default: false)
  scheduling: true,        // Scheduled publishing (default: true)
  softDelete: true,        // Trash/restore functionality (default: true)
  contentLocking: true,    // Edit locks (default: true)
  mediaManagement: true,   // Media asset features (default: true)
  searchIndexing: true,    // Full-text search indexing (default: true)
}
```

---

## Version Settings

### maxVersionsPerEntry

Maximum number of versions to retain per entry.

```typescript
maxVersionsPerEntry: 50  // Default: 50
```

When exceeded, oldest versions are automatically deleted. Set to 0 for unlimited.

---

## Content Locking

### lockDurationMs

Default lock duration in milliseconds for content locking.

```typescript
lockDurationMs: 300000  // Default: 300000 (5 minutes)
```

---

## Media Settings

### maxMediaFileSize

Maximum file size for media uploads in bytes.

```typescript
maxMediaFileSize: 52428800  // Default: 52428800 (50MB)
```

---

## Authorization

### permissiveMode

Bypass all authorization (development only).

```typescript
permissiveMode: true  // Default: false
```

**Warning**: Never use in production.

### skipRbac

Skip role-based access control checks.

```typescript
skipRbac: true  // Default: false
```

Useful when implementing custom authorization via hooks.

### getUserRole

Map user IDs to CMS roles. This hook receives the Convex context as its first argument, allowing you to query your database directly.

**Signature**: `(ctx, { userId }) => Promise<string | null>`

```typescript
getUserRole: async (ctx, { userId }) => {
  if (!userId) return null;

  // Query your database directly!
  const user = await ctx.db.get(userId);
  return user?.cmsRole ?? null;
}
```

**Return values**:
- `"admin"`: Full access
- `"editor"`: Manage content and media
- `"author"`: Create and manage own content
- `"viewer"`: Read-only access
- Custom role name (defined in `customRoles`)
- `null`: No access

### customRoles

Define custom roles beyond built-in ones. This is an array of role objects, each requiring `name`, `displayName`, `description`, and `permissions`.

```typescript
customRoles: [
  {
    name: "content-manager",
    displayName: "Content Manager",
    description: "Can manage all content and media but not settings",
    permissions: [
      { resource: "contentTypes", action: "read", scope: "all" },
      { resource: "contentEntries", action: "create", scope: "all" },
      { resource: "contentEntries", action: "read", scope: "all" },
      { resource: "contentEntries", action: "update", scope: "all" },
      { resource: "contentEntries", action: "delete", scope: "own" },
      { resource: "contentEntries", action: "publish", scope: "all" },
      { resource: "mediaItems", action: "create", scope: "all" },
      { resource: "mediaItems", action: "read", scope: "all" },
      { resource: "mediaItems", action: "update", scope: "all" },
      { resource: "mediaItems", action: "delete", scope: "all" },
    ],
    // Optional: restrict permissions to specific content types
    // contentTypes: ["blog_post", "page"],  // on individual permissions
  },

  {
    name: "translator",
    displayName: "Translator",
    description: "Can read and update content entries",
    permissions: [
      { resource: "contentEntries", action: "read", scope: "all" },
      { resource: "contentEntries", action: "update", scope: "all" },
    ],
  },
]
```

### authorizationHooks

Custom authorization logic hooks.

```typescript
authorizationHooks: {
  // Run before RBAC check
  beforeRbac: async (context) => {
    console.log(`Auth check: ${context.userId} -> ${context.operation}`);
    return { allowed: true };
  },

  // Override RBAC decision (runs after RBAC)
  // Return allowed: true/false to override, or respect default
  authorize: async (context) => {
    // context.defaultDecision contains RBAC result
    if (context.defaultDecision.allowed) {
      return { allowed: true };
    }

    // Custom override logic
    if (await isSuperuser(context.userId)) {
      return { allowed: true };
    }

    return { allowed: false, reason: context.defaultDecision.reason };
  },

  // Run after RBAC check passes
  afterRbac: async (context) => {
    // Additional restrictions
    return { allowed: true };
  },

  // Called when access is denied
  onDeny: async (context) => {
    await logDeniedAccess(context);
    return { allowed: false };
  },

  // Per-operation hooks
  operationHooks: {
    "contentEntries.publish": async (context) => {
      // Custom publish authorization
      return { allowed: true };
    },
  },
}
```

---

## Rate Limiting

### rateLimitHooks

Implement rate limiting via hooks.

```typescript
rateLimitHooks: {
  // Check if operation is allowed (should NOT modify state)
  check: async (context) => {
    const result = await checkRateLimit({
      userId: context.userId,
      operation: context.operation,
      category: context.operationCategory,
    });

    return {
      allowed: result.remaining > 0,
      reason: result.remaining <= 0 ? "Rate limit exceeded" : undefined,
      retryAt: result.resetAt,
      rateLimitInfo: {
        remaining: result.remaining,
        limit: result.limit,
      },
    };
  },

  // Consume a rate limit token (called after check passes)
  consume: async (context) => {
    const result = await consumeRateLimit({
      userId: context.userId,
      operation: context.operation,
    });

    return {
      allowed: true,
      consumed: true,
    };
  },

  // Dynamic rate limit configuration
  getConfig: async (context) => {
    return {
      enabled: true,
      config: {
        rate: 100,
        period: 3600000,  // 1 hour in ms
      },
    };
  },

  // Skip rate limiting for admin role
  skipForAdmin: true,
}
```

---

## Complete Example

```typescript
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

export const cms = createCmsClient(components.convexCms, {
  // Locale
  defaultLocale: "en",
  supportedLocales: ["en", "es", "fr"],
  localeFallbackChains: {
    "es-MX": ["es", "en"],
    "fr-CA": ["fr", "en"],
  },
  autoGenerateLocaleFallbacks: true,

  // Features
  features: {
    versioning: true,
    localization: true,
    scheduling: true,
    softDelete: true,
    contentLocking: true,
    mediaManagement: true,
    searchIndexing: true,
  },

  // Limits
  maxVersionsPerEntry: 25,
  lockDurationMs: 600000,  // 10 minutes
  maxMediaFileSize: 25 * 1024 * 1024,  // 25MB

  // Authorization
  getUserRole: async (ctx, { userId }) => {
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user?.cmsRole ?? "viewer";
  },

  customRoles: [
    {
      name: "blog-editor",
      displayName: "Blog Editor",
      description: "Can manage blog posts and media",
      permissions: [
        { resource: "contentTypes", action: "read" },
        { resource: "contentEntries", action: "create", contentTypes: ["blog_post"] },
        { resource: "contentEntries", action: "read", scope: "all", contentTypes: ["blog_post"] },
        { resource: "contentEntries", action: "update", scope: "all", contentTypes: ["blog_post"] },
        { resource: "contentEntries", action: "delete", scope: "all", contentTypes: ["blog_post"] },
        { resource: "contentEntries", action: "publish", scope: "all", contentTypes: ["blog_post"] },
        { resource: "mediaItems", action: "create" },
        { resource: "mediaItems", action: "read" },
        { resource: "mediaItems", action: "update" },
        { resource: "mediaItems", action: "delete" },
      ],
    },
  ],

  authorizationHooks: {
    onDeny: async (context) => {
      console.warn(`Access denied: ${context.userId} -> ${context.operation}`);
      return { allowed: false };
    },
  },
});
```

---

## Environment Variables

These can be set in your Convex dashboard or `.env.local`:

```bash
# Convex deployment URL (required)
CONVEX_URL=https://your-deployment.convex.cloud

# For Admin UI
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

---

See also:
- [Client API Reference](./client-api.md)
- [Authorization Guide](../guides/authorization.md)
- [Architecture Overview](../architecture/overview.md)
