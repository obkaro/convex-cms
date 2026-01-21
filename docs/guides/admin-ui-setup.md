# Admin UI Setup

The Convex CMS Admin UI is a ready-to-use React application for managing your content. This guide covers how to set it up and customize it.

## Quick Start with NPX

The fastest way to launch the Admin UI:

```bash
npx convex-cms admin
```

This command:
1. Detects your Convex deployment URL from `.env.local`
2. Starts a local development server
3. Opens the Admin UI in your browser

## Admin UI Features

The Admin UI provides:

- **Content Type Management** - Create and edit content type schemas visually
- **Content Entry Editor** - WYSIWYG editing with all field types
- **Media Library** - Upload, organize, and browse media assets
- **Version History** - View and rollback to previous versions
- **Publishing Workflow** - Draft, publish, schedule, and unpublish
- **Search & Filter** - Find content quickly
- **Bulk Operations** - Publish, unpublish, or delete multiple entries

## Routes Overview

| Route | Description |
|-------|-------------|
| `/` | Dashboard with recent activity |
| `/content-types` | Manage content type definitions |
| `/content` | Browse all content entries |
| `/entries/:id` | Edit a specific entry |
| `/entries/new/:typeId` | Create new entry of a type |
| `/entries/type/:typeId` | Entries filtered by type |
| `/media` | Media library browser |
| `/settings` | CMS configuration |

## Authentication Setup

The Admin UI uses a pluggable authentication system. You need to configure it based on your app's auth provider.

### Option 1: Development Mode (Mock Auth)

For local development without auth setup:

```typescript
// admin/src/contexts/AuthContext.tsx
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mock user for development
  const mockUser = {
    id: "dev-user-123",
    email: "dev@example.com",
    name: "Developer",
    role: "admin",
  };

  return (
    <AuthContext.Provider value={{
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: async () => {},
      logout: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Option 2: Clerk Authentication

If using Clerk:

```typescript
// admin/src/contexts/AuthContext.tsx
import { useUser, useClerk } from "@clerk/clerk-react";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  const authUser = user ? {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? "",
    name: user.fullName ?? user.firstName ?? "User",
    role: user.publicMetadata?.cmsRole as string ?? "viewer",
  } : null;

  return (
    <AuthContext.Provider value={{
      user: authUser,
      isAuthenticated: isSignedIn ?? false,
      isLoading: !isLoaded,
      login: async () => {
        // Redirect to Clerk sign-in
        window.location.href = "/sign-in";
      },
      logout: async () => {
        await signOut();
      },
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Option 3: Custom Auth Provider

Integrate with your own auth system:

```typescript
// admin/src/contexts/AuthContext.tsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get current user from your Convex backend
  const currentUser = useQuery(api.users.getCurrentUser);

  return (
    <AuthContext.Provider value={{
      user: currentUser ? {
        id: currentUser._id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.cmsRole,
      } : null,
      isAuthenticated: !!currentUser,
      isLoading: currentUser === undefined,
      login: async () => {
        // Your login logic
      },
      logout: async () => {
        // Your logout logic
      },
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Embedding in Your App

You can embed the Admin UI within your existing application:

### As a Route

```typescript
// In your TanStack Router setup
import { createFileRoute } from "@tanstack/react-router";
import { AdminUI } from "@convex-cms/admin";

export const Route = createFileRoute("/admin")({
  component: () => <AdminUI />,
});
```

### As a Standalone Page

```typescript
// pages/admin.tsx (Next.js example)
import dynamic from "next/dynamic";

const AdminUI = dynamic(() => import("@convex-cms/admin"), {
  ssr: false, // Admin UI requires client-side rendering
});

export default function AdminPage() {
  return <AdminUI />;
}
```

## Customization

### Custom Theme

Override CSS variables to match your brand:

```css
/* admin/src/styles/custom.css */
:root {
  --cms-primary: #6366f1;
  --cms-primary-hover: #4f46e5;
  --cms-background: #ffffff;
  --cms-surface: #f8fafc;
  --cms-text: #1e293b;
  --cms-text-muted: #64748b;
  --cms-border: #e2e8f0;
  --cms-error: #ef4444;
  --cms-success: #22c55e;
  --cms-warning: #f59e0b;
}

/* Dark mode */
[data-theme="dark"] {
  --cms-background: #0f172a;
  --cms-surface: #1e293b;
  --cms-text: #f8fafc;
  --cms-text-muted: #94a3b8;
  --cms-border: #334155;
}
```

### Custom Field Components

Register custom field renderers:

```typescript
// admin/src/components/fields/CustomFieldRenderer.tsx
import { registerFieldRenderer } from "@convex-cms/admin";

// Custom renderer for a "color" field type
const ColorField: React.FC<FieldProps> = ({ value, onChange, field }) => {
  return (
    <div className="color-field">
      <input
        type="color"
        value={value ?? "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>{value}</span>
    </div>
  );
};

registerFieldRenderer("color", ColorField);
```

### Custom Dashboard Widgets

Add widgets to the dashboard:

```typescript
// admin/src/components/Dashboard.tsx
import { DashboardWidget } from "@convex-cms/admin";

export function CustomDashboard() {
  return (
    <div className="dashboard-grid">
      <DashboardWidget title="Recent Posts">
        <RecentPostsList />
      </DashboardWidget>

      <DashboardWidget title="Analytics">
        <AnalyticsChart />
      </DashboardWidget>

      <DashboardWidget title="Quick Actions">
        <QuickActionButtons />
      </DashboardWidget>
    </div>
  );
}
```

## Configuration Options

The Admin UI accepts configuration via environment variables or props:

```bash
# .env.local
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CMS_DEFAULT_LOCALE=en
VITE_CMS_ENABLE_MEDIA_VARIANTS=true
```

Or pass as props:

```typescript
<AdminUI
  config={{
    defaultLocale: "en",
    enableMediaVariants: true,
    maxUploadSize: 10 * 1024 * 1024, // 10MB
    allowedMediaTypes: ["image/*", "video/*", "application/pdf"],
  }}
/>
```

## Role-Based UI Visibility

The Admin UI automatically shows/hides features based on user permissions:

| Feature | Required Permission |
|---------|-------------------|
| Content Types menu | `contentTypes.read` |
| Create Content Type | `contentTypes.create` |
| Edit Content Type | `contentTypes.update` |
| Delete Content Type | `contentTypes.delete` |
| Media Library | `mediaAssets.read` |
| Upload Media | `mediaAssets.create` |
| Settings Page | `settings.read` |
| Publish Entry | `contentEntries.publish` |

## Development Workflow

1. **Start the Admin UI dev server:**
   ```bash
   cd admin
   npm run dev
   ```

2. **Start Convex dev server (in another terminal):**
   ```bash
   npx convex dev
   ```

3. **Access the UI** at `http://localhost:5173`

## Building for Production

Build the Admin UI for deployment:

```bash
cd admin
npm run build
```

This creates a static build in `admin/dist/` that can be deployed to any static hosting service.

## Troubleshooting

### "Convex URL not found"

Ensure your `.env.local` file contains `CONVEX_URL` or `VITE_CONVEX_URL`.

### Components not loading

The Admin UI requires TanStack Router. Ensure it's properly configured in `admin/src/routeTree.gen.ts`.

### Auth not working

1. Check your AuthContext implementation
2. Verify the user object includes `id`, `email`, `name`, and `role`
3. Ensure the role matches one defined in your CMS config

### Media uploads failing

1. Check the `generateUploadUrl` mutation is accessible
2. Verify file size limits in your configuration
3. Ensure CORS is configured for your Convex deployment

---

Next: [Content Types Guide](./content-types.md)
