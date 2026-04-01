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
pnpm add convex-cms
```

### 2. Add the Component

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import cms from "convex-cms/convex.config";

const app = defineApp();
app.use(cms);
export default app;
```

### 3. Create CMS Files

```bash
pnpm convex-cms init
```

This creates 3 files:
- `convex/cms.ts` — Content type definitions and typed helpers
- `convex/admin.ts` — Admin API functions the Admin UI calls
- `convex/content.ts` — Public content queries for your frontend

It also updates `convex/convex.config.ts` to register the CMS component.

### 4. Start Convex

```bash
pnpm convex dev
```

---

## CLI Mode

The CLI runs a pre-built Admin UI that connects to your Convex deployment.

```bash
pnpm convex-cms admin
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
pnpm convex-cms admin              # Default port 3000
pnpm convex-cms admin --port 4000  # Custom port
pnpm convex-cms admin --url <url>  # Explicit Convex URL
pnpm convex-cms admin --demo       # Demo mode with mock auth
pnpm convex-cms admin --no-open    # Don't open browser
```

### Demo Mode

For quick testing without auth setup:

```bash
pnpm convex-cms admin --demo
```

This uses mock authentication with a demo admin user.

---

## Embed Mode

Embed the Admin UI in your React application for production use. The `CmsAdmin` component must be rendered inside a `ConvexProvider`.

### Required: Tailwind Source Scanning

The admin ships as `.tsx` source files. Tailwind v4 doesn't scan `node_modules`, so add this to your CSS entry:

```css
@source "../node_modules/convex-cms/admin/src/**/*.{ts,tsx}";
```

Without this, the admin renders with completely broken layout and styles.

### Required: Explicit Height

Pass `className="h-screen"` on `CmsAdmin` (or a calculated height if you have a header):

```tsx
<CmsAdmin api={api.admin} auth={authConfig} className="h-screen" />
// With a 64px header:
<CmsAdmin api={api.admin} auth={authConfig} className="h-[calc(100vh-64px)]" />
```

### Basic Example

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { CmsAdmin } from "convex-cms/admin";
import { api } from "./convex/_generated/api";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function AdminPage() {
  return (
    <ConvexProvider client={convex}>
      <CmsAdmin
        api={api.admin}
        className="h-screen"
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
    </ConvexProvider>
  );
}
```

### CmsAdmin Props

**Important:** `CmsAdmin` must be rendered inside a `ConvexProvider`. It uses `useConvex()` internally to connect to your Convex deployment.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `api` | `CmsAdminApi` | Yes | Your `api.admin` from generated types |
| `auth` | `CmsAdminAuthConfig` | Yes | Authentication configuration |
| `config` | `Partial<AdminConfig>` | No | UI customization |
| `basePath` | `string` | No | Base URL path (default: `/admin`) |
| `className` | `string` | No | CSS class for the container |
| `themeMode` | `"isolated" \| "inherit"` | No | CSS variable scoping (default: `isolated`) |
| `darkModeControl` | `"independent" \| "follow-parent"` | No | Dark mode behavior (default: `independent`) |
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
import { CmsAdmin } from "convex-cms/admin";
import { api } from "./convex/_generated/api";

function AdminPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return (
    <CmsAdmin
      api={api.admin}
      className="h-screen"
      auth={{
        getUser: () => ({
          id: user.id,
          name: user.fullName ?? undefined,
          email: user.primaryEmailAddress?.emailAddress,
          avatarUrl: user.imageUrl,
        }),
        getUserRole: () => {
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
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { CmsAdmin } from "convex-cms/admin";
import { api } from "./convex/_generated/api";

function AdminPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();

  if (isLoading || user === undefined) return <div>Loading...</div>;
  if (!isAuthenticated || !user) return <div>Please sign in</div>;

  return (
    <CmsAdmin
      api={api.admin}
      className="h-screen"
      auth={{
        getUser: () => ({
          id: user._id,
          name: user.name,
          email: user.email,
        }),
        getUserRole: () => user.cmsRole ?? null,
        onLogout: () => signOut(),
      }}
    />
  );
}
```

### With Custom Auth

```tsx
import { useAuth } from "./your-auth-provider";
import { CmsAdmin } from "convex-cms/admin";
import { api } from "./convex/_generated/api";

function AdminPage() {
  const { user, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return (
    <CmsAdmin
      api={api.admin}
      className="h-screen"
      auth={{
        getUser: () => ({
          id: user.id,
          name: user.name,
          email: user.email,
        }),
        getUserRole: () => user.role ?? "viewer",
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
} = defineAdminAPI(components.cms, {
  auth: async (ctx, operation) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Optional: check operation type for fine-grained control
    if (operation.type === "deleteContentType") {
      // Only allow admins to delete content types
      const isAdmin = await checkUserIsAdmin(identity.tokenIdentifier);
      if (!isAdmin) {
        throw new Error("Only admins can delete content types");
      }
    }

    return identity.tokenIdentifier;
  },
});
```

See [Admin API Reference](../api/admin-api.md) for all operation types.

---

## UI Configuration

Customize the Admin UI appearance and behavior:

```tsx
import { CmsAdmin, defineAdminConfig } from "convex-cms/admin";

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
  auth={authConfig}
  config={config}
  className="h-screen"
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
| **Users** | Manage CMS user roles and access |

---

## User Management

The admin UI includes a built-in Users page for managing CMS access. No user table setup required — the CMS manages user roles internally.

### How It Works

1. **Auto-registration**: When a user accesses the CMS, they're automatically registered via the `auth` callback
2. **First-user bootstrap**: If no CMS users exist, the first user is automatically assigned the `admin` role
3. **Profile sync**: The admin UI calls `registerSelf` on mount to sync the user's display name and email from your `getUser()` callback

### Custom Roles

By default, the Users page shows the 4 built-in roles (Admin, Editor, Author, Viewer). You can customize the role list:

```tsx
<CmsAdmin
  api={api.admin}
  auth={authConfig}
  config={{
    // Replace built-in roles with your own
    overrideBuiltInRoles: true,
    customRoles: [
      { value: "admin", label: "Admin", description: "Full access" },
      { value: "editor", label: "Editor", description: "Manage content" },
      { value: "kitchen", label: "Kitchen Staff", description: "Kitchen only" },
    ],
  }}
/>
```

| Config Option | Type | Default | Description |
|---------------|------|---------|-------------|
| `customRoles` | `Array<{ value, label, description? }>` | `[]` | Additional roles for the role dropdown |
| `overrideBuiltInRoles` | `boolean` | `false` | Replace built-in roles entirely with `customRoles` |

### Auth Callback Profile

The `auth` callback in `defineAdminAPI` can return a profile object to enrich user data in the Users page:

```typescript
auth: async (ctx, operation) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  // Simple: return just the user ID
  return identity.tokenIdentifier;

  // Rich: return profile for the Users page
  return {
    userId: identity.tokenIdentifier,
    name: "Ovie",
    email: "ovie@restaurant.ca",
  };
}
```

### Backend Setup

Export the user management operations from your `convex/admin.ts`:

```typescript
export const {
  // ... existing exports ...
  listCmsUsers,
  getCmsUser,
  setCmsUserRole,
  inviteCmsUser,
  removeCmsUser,
  registerSelf,
} = defineAdminAPI(components.cms, { ... });
```

---

## Schema Drift Warnings

When using [code-first content type definitions](../api/code-first-schema.md), the Admin UI displays a warning banner if schema drift is detected between your code and the database.

### What the Warning Shows

- **Errors** (red): Critical issues like missing fields or type mismatches that may cause validation failures
- **Warnings** (amber): Non-critical issues like unsynced types or extra database fields

### Resolving Drift

Click the **Sync Now** button in the warning banner to automatically:

1. Create database records for new code-defined types
2. Update existing code-defined types with changed fields
3. Remove orphaned code-defined types no longer in your code (soft-deleted with entries)
4. Leave manually-created database types unchanged

The warning disappears once all code-defined types are in sync.

### When Drift Occurs

Drift commonly occurs when:

- You add or modify a `defineContentType()` definition and deploy
- You remove a code-defined type from your codebase
- The Convex deployment restarts before sync runs

For programmatic drift detection, see [Schema Drift Detection](../api/code-first-schema.md#schema-drift-detection).

---

## Troubleshooting

### Admin layout is broken (sidebar not full height, missing styles)

Add the Tailwind `@source` directive — see [Required: Tailwind Source Scanning](#required-tailwind-source-scanning). This is the most common embed issue.

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
pnpm convex-cms init
```

And that your `convex/admin.ts` exports all required functions. See [Admin API Reference](../api/admin-api.md) for the complete list.

### Auth not working in embed mode

1. Verify `CmsAdmin` is rendered inside a `ConvexProvider`
2. Check that `getUser` returns a valid user object with `id`
3. Check that `getUserRole` returns one of: `admin`, `editor`, `author`, `viewer`
4. Check browser console for errors

### Media uploads failing

1. Ensure `generateUploadUrl` is exported from `convex/admin.ts`
2. Check file size limits (default 50MB)
3. Verify CORS settings for your Convex deployment

---

## See Also

- [Admin API Reference](../api/admin-api.md): All admin functions
- [Authorization](./authorization.md): Roles and permissions
- [Integration Patterns](./integration-patterns.md): Common setups
