# Admin UI Setup

The Convex CMS Admin UI provides a visual interface for managing content. There are two ways to run it:

| Mode | Best For | How It Works |
|------|----------|--------------|
| **CLI Mode** | Development | Pre-built UI, connects to your Convex deployment |
| **Embed Mode** | Production | Component in your React app, your auth integration |

Both modes call the same backend functions from your `convex/admin.ts`.

---

## Prerequisites

Before using the Admin UI, you need the backend functions it calls.

### 1. Install convex-cms

```bash
npm install convex-cms
```

### 2. Add the Component

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms);
export default app;
```

### 3. Create Admin API Functions

```bash
npx convex-cms init
```

This creates `convex/admin.ts` with all the functions the Admin UI needs. The file exports functions like `listContentTypes`, `getEntry`, `publishEntry`, etc.

### 4. Start Convex

```bash
npx convex dev
```

---

## CLI Mode

The CLI runs a pre-built Admin UI that connects to your Convex deployment.

```bash
npx convex-cms admin
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  Pre-built Admin UI (localhost:3000)                            │
│                                                                 │
│  Makes requests to:                                             │
│  • api.admin.listContentTypes                                   │
│  • api.admin.getEntry                                           │
│  • api.admin.publishEntry                                       │
│  • ...                                                          │
│                                                                 │
│                         ▼                                       │
│                  Your CONVEX_URL                                │
│                  (from .env.local)                              │
│                                                                 │
│                         ▼                                       │
│              ┌──────────────────────┐                           │
│              │  convex/admin.ts     │                           │
│              │  defineAdminAPI()    │                           │
│              └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

The CLI detects your Convex URL from:
1. `--url` command line argument
2. `CONVEX_URL` environment variable
3. `VITE_CONVEX_URL` environment variable
4. `.env.local` file
5. `.env` file

### CLI Options

```bash
npx convex-cms admin              # Default port 3000
npx convex-cms admin --port 4000  # Custom port
npx convex-cms admin --url <url>  # Explicit Convex URL
npx convex-cms admin --demo       # Demo mode with mock auth
npx convex-cms admin --no-open    # Don't open browser
```

### Demo Mode

For quick testing without auth setup:

```bash
npx convex-cms admin --demo
```

This uses mock authentication with a demo admin user.

---

## Embed Mode

Embed the Admin UI in your React application for production use.

```tsx
import { CmsAdmin } from "convex-cms/admin/embed";
import { api } from "./convex/_generated/api";

function AdminPage() {
  return (
    <CmsAdmin
      api={api.admin}
      convexUrl={import.meta.env.VITE_CONVEX_URL}
      auth={{
        getUser: () => ({
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
        }),
        getUserRole: (userId) => getUserCmsRole(userId),
        onLogout: () => signOut(),
      }}
    />
  );
}
```

### CmsAdmin Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `api` | `CmsAdminApi` | Yes | Your `api.admin` from generated types |
| `convexUrl` | `string` | Yes | Your Convex deployment URL |
| `auth` | `CmsAdminAuthConfig` | Yes | Authentication configuration |
| `config` | `Partial<AdminConfig>` | No | UI customization |
| `basePath` | `string` | No | Base URL path (default: `/admin`) |
| `className` | `string` | No | CSS class for the container |
| `initialRoute` | `EmbedRoute` | No | Starting route (default: `dashboard`) |
| `onNavigate` | `function` | No | Callback when navigation occurs |

### Auth Configuration

```typescript
interface CmsAdminAuthConfig {
  // Return the current user, or null if not logged in
  getUser: () => CmsAdminUser | null | Promise<CmsAdminUser | null>;

  // Return the user's CMS role: "admin", "editor", "author", or "viewer"
  getUserRole: (userId: string) => string | null | Promise<string | null>;

  // Called when user clicks logout
  onLogout?: () => void | Promise<void>;
}

interface CmsAdminUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}
```

---

## Authentication Examples

### With Clerk

```tsx
import { useUser, useClerk } from "@clerk/clerk-react";
import { CmsAdmin } from "convex-cms/admin/embed";
import { api } from "./convex/_generated/api";

function AdminPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return (
    <CmsAdmin
      api={api.admin}
      convexUrl={import.meta.env.VITE_CONVEX_URL}
      auth={{
        getUser: () => ({
          id: user.id,
          name: user.fullName ?? undefined,
          email: user.primaryEmailAddress?.emailAddress,
          avatarUrl: user.imageUrl,
        }),
        getUserRole: () => {
          // Get role from Clerk public metadata
          return (user.publicMetadata?.cmsRole as string) ?? "viewer";
        },
        onLogout: () => signOut(),
      }}
    />
  );
}
```

### With Convex Auth

```tsx
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { CmsAdmin } from "convex-cms/admin/embed";
import { api } from "./convex/_generated/api";

function AdminPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;

  return (
    <CmsAdmin
      api={api.admin}
      convexUrl={import.meta.env.VITE_CONVEX_URL}
      auth={{
        getUser: () => user ? {
          id: user._id,
          name: user.name,
          email: user.email,
        } : null,
        getUserRole: () => user?.cmsRole ?? null,
        onLogout: async () => {
          // Your logout logic
        },
      }}
    />
  );
}
```

### With Custom Auth

```tsx
import { useAuth } from "./your-auth-provider";
import { CmsAdmin } from "convex-cms/admin/embed";
import { api } from "./convex/_generated/api";

function AdminPage() {
  const { user, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return (
    <CmsAdmin
      api={api.admin}
      convexUrl={import.meta.env.VITE_CONVEX_URL}
      auth={{
        getUser: () => ({
          id: user.id,
          name: user.name,
          email: user.email,
        }),
        getUserRole: async (userId) => {
          // Fetch role from your backend
          const response = await fetch(`/api/users/${userId}/role`);
          const { role } = await response.json();
          return role;
        },
        onLogout: logout,
      }}
    />
  );
}
```

---

## Backend Authentication

For production, also validate authentication on the backend:

```typescript
// convex/admin.ts
import { defineAdminAPI } from "convex-cms";
import { components } from "./_generated/api";

export const {
  listContentTypes,
  getEntry,
  // ... all exports
} = defineAdminAPI(components.convexCms, {
  auth: async (ctx, operation) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Optional: check operation type for fine-grained control
    if (operation.type === "deleteContentType") {
      // Only allow admins to delete content types
      const isAdmin = await checkUserIsAdmin(identity.subject);
      if (!isAdmin) {
        throw new Error("Only admins can delete content types");
      }
    }

    return identity.subject;
  },
});
```

See [Admin API Reference](../api/admin-api.md) for all operation types.

---

## UI Configuration

Customize the Admin UI appearance and behavior:

```tsx
import { CmsAdmin, defineAdminConfig } from "convex-cms/admin/embed";

const config = defineAdminConfig({
  branding: {
    appName: "My CMS",
    logo: "/logo.svg",
    favicon: "/favicon.ico",
  },

  layout: {
    sidebarWidth: 280,
    sidebarCollapsible: true,
  },

  navigation: {
    showDashboard: true,
    showContent: true,
    showMedia: true,
    showTaxonomies: true,
    showContentTypes: true,
    showTrash: true,
    showSettings: true,

    // Add custom navigation items
    customItems: [
      {
        id: "analytics",
        path: "/analytics",
        label: "Analytics",
        icon: "BarChart",
        section: "main",
      },
    ],
  },

  theme: {
    mode: "system", // "light" | "dark" | "system"
    allowModeSwitch: true,
  },
});

<CmsAdmin
  api={api.admin}
  convexUrl={import.meta.env.VITE_CONVEX_URL}
  auth={authConfig}
  config={config}
/>
```

---

## Admin UI Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview with quick stats and navigation |
| **Content Types** | Define schemas with 13 field types |
| **Content Editor** | Edit entries with field-specific editors |
| **Media Library** | Upload, organize in folders, manage variants |
| **Taxonomies** | Tags, categories, hierarchical terms |
| **Version History** | View and rollback to previous versions |
| **Publishing** | Draft → Scheduled → Published workflow |
| **Bulk Operations** | Publish, unpublish, delete multiple items |
| **Trash** | Soft-deleted items with restore option |
| **Content Locking** | Prevent editing conflicts |

---

## Troubleshooting

### "Convex URL not found"

Ensure your environment has the Convex URL:

```bash
# .env.local
CONVEX_URL=https://your-deployment.convex.cloud
# or
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

### "Function not found" errors

The Admin UI expects specific function names. Ensure you've run:

```bash
npx convex-cms init
```

And that your `convex/admin.ts` exports all required functions. See [Admin API Reference](../api/admin-api.md) for the complete list.

### Auth not working in embed mode

1. Check that `getUser` returns a valid user object with `id`
2. Check that `getUserRole` returns one of: `admin`, `editor`, `author`, `viewer`
3. Check browser console for errors

### Media uploads failing

1. Ensure `generateUploadUrl` is exported from `convex/admin.ts`
2. Check file size limits (default 50MB)
3. Verify CORS settings for your Convex deployment

---

## See Also

- [Admin API Reference](../api/admin-api.md) — All admin functions
- [Authorization](./authorization.md) — Roles and permissions
- [Integration Patterns](./integration-patterns.md) — Common setups
