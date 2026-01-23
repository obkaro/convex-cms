# Convex CMS

A developer-first headless CMS built as a [Convex Component](https://docs.convex.dev/components).

## Features

- **Type-safe APIs** - Full TypeScript support with generated types
- **Flexible content modeling** - Define content types with 13 field types
- **Publishing workflows** - Draft, publish, schedule, and version content
- **Media management** - Upload, organize, and serve media with variants
- **Role-based access control** - Fine-grained permissions with custom roles
- **Multi-locale support** - Content localization with fallback chains
- **Admin UI** - Ready-to-use React admin interface (CLI or embeddable)

## Installation

```bash
npm install convex-cms
```

## Quick Start

### 1. Configure Convex Component

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms);
export default app;
```

### 2. Initialize Admin API

```bash
npx convex-cms init
```

This creates `convex/admin.ts` with all the admin functions the UI needs.

### 3. Start Development

```bash
npx convex dev
```

### 4. Access Admin UI

```bash
npx convex-cms admin
```

This opens the CMS admin interface at http://localhost:3000.

## Admin UI Options

### Option 1: Standalone CLI (Development)

Perfect for quick access during development:

```bash
npx convex-cms admin
npx convex-cms admin --port 4000      # Custom port
npx convex-cms admin --demo           # Demo mode with mock data
```

### Option 2: Embed in Your App (Production)

For production deployments, embed the admin UI in your application:

```tsx
import { CmsAdmin } from "convex-cms-admin";

function AdminPage() {
  return (
    <CmsAdmin
      convexUrl={process.env.VITE_CONVEX_URL}
      auth={{
        getUser: () => yourAuthProvider.getUser(),
        getUserRole: (id) => yourAuthProvider.getRole(id),
        onLogout: () => yourAuthProvider.signOut(),
      }}
      config={{
        branding: {
          appName: "My CMS",
          logoUrl: "/logo.svg",
        },
      }}
    />
  );
}
```

## Using the CMS Client

For programmatic access in your Convex functions:

```typescript
// convex/cms.ts
import { createCmsClient } from "convex-cms";
import { components } from "./_generated/api";

export const cms = createCmsClient(components.convexCms, {
  defaultLocale: "en",
  features: {
    versioning: true,
    localization: true,
  },
});
```

```typescript
// convex/blog.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { cms } from "./cms";

export const getPosts = query({
  handler: async (ctx) => {
    const result = await cms.contentEntries.list(ctx, {
      status: "published",
    });
    return result.items;
  },
});

export const createPost = mutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    return await cms.contentEntries.create(ctx, {
      contentTypeId: blogTypeId,
      data: args,
    });
  },
});
```

## Auth Integration

The admin UI is auth-agnostic - integrate with any provider:

### Frontend Auth Config

```typescript
<CmsAdmin
  auth={{
    // Return current user for display
    getUser: () => ({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
    }),
    // Map user ID to CMS role
    getUserRole: (userId) => userRoles[userId] ?? null,
    // Handle logout
    onLogout: () => signOut(),
  }}
/>
```

### Backend Auth (Optional)

Add auth validation to admin operations:

```typescript
// convex/admin.ts
export const { ... } = defineAdminAPI(components.convexCms, {
  auth: async (ctx, operation) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Optionally check operation.type for fine-grained access
    return identity.subject;
  },
});
```

## Documentation

- [Getting Started Guide](./docs/guides/getting-started.md)
- [Content Modeling](./docs/guides/content-modeling.md)
- [Media Management](./docs/guides/media.md)
- [Authorization](./docs/guides/authorization.md)
- [API Reference](./docs/api/client-api.md)

## Requirements

- Convex ^1.17.0
- Node.js 18+

## License

Apache-2.0
