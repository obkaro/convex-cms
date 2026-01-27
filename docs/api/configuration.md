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

Define custom roles beyond built-in ones.

```typescript
customRoles: {
  contentManager: {
    displayName: "Content Manager",
    permissions: [
      { resource: "contentTypes", action: "read", scope: "all" },
      { resource: "contentEntries", action: "create", scope: "all" },
      { resource: "contentEntries", action: "read", scope: "all" },
      { resource: "contentEntries", action: "update", scope: "all" },
      { resource: "contentEntries", action: "delete", scope: "own" },
      { resource: "contentEntries", action: "publish", scope: "all" },
      { resource: "mediaAssets", action: "*", scope: "all" },
    ],
    // Optional: restrict to specific content types
    contentTypeRestrictions: ["blog_post", "page"],
    // Optional: restrict to specific locales
    localeRestrictions: ["en", "es"],
  },

  translator: {
    displayName: "Translator",
    permissions: [
      { resource: "contentEntries", action: "read", scope: "all" },
      { resource: "contentEntries", action: "update", scope: "all" },
    ],
    localeRestrictions: ["es", "fr", "de"],
  },
}
```

### authorizationHooks

Custom authorization logic hooks.

```typescript
authorizationHooks: {
  // Run before RBAC check
  beforeRbac: async (context) => {
    console.log(`Auth check: ${context.userId} -> ${context.action}`);
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
  // Check if action is allowed
  check: async (context) => {
    const result = await checkRateLimit({
      userId: context.userId,
      action: context.action,
      resource: context.resource,
    });

    return {
      allowed: result.remaining > 0,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  },

  // Consume a rate limit token
  consume: async (context) => {
    await consumeRateLimit({
      userId: context.userId,
      action: context.action,
    });
  },

  // Get rate limit configuration
  getConfig: async (context) => {
    return {
      limit: 100,
      window: "1h",
    };
  },
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

  customRoles: {
    blogEditor: {
      displayName: "Blog Editor",
      permissions: [
        { resource: "contentEntries", action: "*", scope: "all" },
        { resource: "mediaAssets", action: "*", scope: "all" },
      ],
      contentTypeRestrictions: ["blog_post", "author"],
    },
  },

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
