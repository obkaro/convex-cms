# Plan: CLI Admin SPA Refactor

> **Status:** Planning  
> **Created:** Feb 26, 2026  
> **Goal:** Refactor the standalone CLI admin from TanStack Start + Nitro SSR to a simple Vite SPA.

## Why

The current CLI admin (`npx convex-cms admin`) has a critical issue: the browser bundle includes `convex/server` code, producing 64 `console.error` warnings per page load ("Convex functions should not be imported in the browser"). Convex has stated this **will become a hard error** in a future version, which would break the admin entirely.

Root causes:
1. `admin/src/lib/convex.ts` re-exports `api` from `../../convex/_generated/api`, pulling in function registration code.
2. `admin/src/lib/cmsExports.ts` imports runtime values from `../../../src/client/index`, which imports from `convex/server` (via `wrapper.ts`).

The CLI admin doesn't need SSR. It's a development tool that talks to Convex via WebSocket. TanStack Start + Nitro adds complexity (SSR hydration, server functions, Nitro server) with no benefit for this use case.

## Current Architecture

```
admin/
├── convex/                    # Admin's own Convex backend (parallel to host app)
│   ├── convex.config.ts       # defineComponent for admin
│   ├── admin.ts               # defineAdminAPI wrapper
│   └── _generated/            # Requires separate codegen
├── src/
│   ├── routes/                # TanStack Start file-based routes (STANDALONE ONLY)
│   │   ├── __root.tsx         # Root layout, ConvexProvider, imports api from ../../convex/_generated/api
│   │   ├── index.tsx          # Dashboard route, imports api
│   │   ├── content.tsx        # Content route, imports api
│   │   ├── media.tsx          # etc.
│   │   ├── settings.tsx
│   │   ├── taxonomies.tsx
│   │   ├── trash.tsx
│   │   ├── content-types.tsx
│   │   └── entries/           # Dynamic entry routes
│   ├── pages/                 # SHARED page components (used by both routes/ and embed/)
│   │   ├── DashboardPage.tsx  # Receives api + navigation as props
│   │   ├── ContentPage.tsx    # Same pattern
│   │   └── ...
│   ├── embed/                 # EMBED MODE components
│   │   ├── index.tsx          # CmsAdmin component (entry point)
│   │   ├── contexts/          # ApiContext (provides api to embed pages)
│   │   ├── navigation.tsx     # EmbedNavigationProvider
│   │   ├── pages/             # Thin wrappers: useApi() + useEmbedNavigation() -> SharedPage
│   │   └── components/        # EmbedLayout
│   ├── components/            # Shared UI components (design system, forms, etc.)
│   ├── contexts/              # AuthContext, ThemeContext, BreadcrumbContext, etc.
│   └── lib/                   # Utilities
│       ├── convex.ts          # PROBLEM: re-exports api from ../../convex/_generated/api
│       ├── cmsExports.ts      # PROBLEM: imports from ../../../src/client/index
│       ├── config.server.ts   # TanStack Start server function (getServerConfig)
│       ├── admin-config.ts    # Config resolution
│       └── ...
```

### Key Insight: The Shared Pages Are Already Clean

The shared page components (`pages/*.tsx`) follow a clean pattern:
```tsx
// pages/DashboardPage.tsx
interface DashboardPageProps {
  api: CmsAdminApi;          // Function references (not imports)
  navigation: AdminNavigation; // Navigation adapter
}
export function DashboardPage({ api, navigation }: DashboardPageProps) {
  const stats = useQuery(api.getDashboardStats, {});
  // ...
}
```

They receive `api` and `navigation` as props. They never import from `convex/_generated` or `convex/server` directly. This is the foundation that makes the refactor feasible.

### What Standalone Routes Currently Do

Each route is a thin wrapper:
```tsx
// routes/index.tsx (CURRENT)
import { api } from "../../convex/_generated/api";  // <-- PROBLEM: pulls in server code
import { DashboardPage } from "~/pages";

function DashboardRoute() {
  const navigation = useTanStackNavigation();
  return <DashboardPage api={api.admin} navigation={navigation} />;
}
```

### What Embed Pages Currently Do

```tsx
// embed/pages/Dashboard.tsx
import { useApi } from "../contexts/ApiContext";  // <-- CLEAN: uses context
import { DashboardPage } from "../../pages";

export function EmbedDashboard() {
  const api = useApi();
  const navigation = useEmbedAdapter(useEmbedNavigation());
  return <DashboardPage api={api} navigation={navigation} />;
}
```

## Target Architecture

```
admin/
├── src/
│   ├── standalone/            # NEW: SPA shell for CLI mode
│   │   ├── main.tsx           # Vite SPA entry point
│   │   ├── App.tsx            # Router + providers + layout
│   │   ├── router.tsx         # TanStack Router (client-only, no Start)
│   │   ├── api.ts             # Runtime API construction (see below)
│   │   └── config.ts          # Config loading (fetch from CLI server or window.__CMS_CONFIG__)
│   ├── pages/                 # UNCHANGED: shared page components
│   ├── embed/                 # UNCHANGED: embed mode
│   ├── components/            # UNCHANGED: shared UI components
│   ├── contexts/              # UNCHANGED: shared contexts
│   └── lib/                   # CLEANED UP
│       ├── cn.ts              # Unchanged
│       ├── navigation.ts      # Unchanged
│       ├── admin-config.ts    # Unchanged
│       ├── roles.ts           # NEW: Pure utility (getRole, getRolePermissions) - no convex/server
│       └── ...
├── index.html                 # NEW: Vite SPA entry HTML
└── vite.config.ts             # SIMPLIFIED: plain Vite SPA config (no TanStack Start plugin)
```

**Deleted:**
- `admin/convex/` (entire directory; no more parallel Convex backend)
- `admin/src/routes/` (entire directory; replaced by standalone/router.tsx)
- `admin/src/lib/convex.ts` (was re-exporting generated api)
- `admin/src/lib/cmsExports.ts` (was importing from core package source)
- `admin/src/lib/config.server.ts` (was TanStack Start server function)
- TanStack Start dependency (`@tanstack/react-start`)
- Vinxi/Nitro dependencies

## Detailed Implementation

### Step 1: Create the Runtime API Helper

The standalone admin needs function references without importing `convex/_generated/api`. Use `anyApi` from `convex/server`, but import it carefully to avoid pulling in registration code.

**Important finding:** `anyApi` lives in `convex/server/api.js` which does NOT import `registration_impl.js` (where the browser warning lives). However, importing via the barrel export (`import { anyApi } from "convex/server"`) may pull in everything depending on bundler tree-shaking.

**Safest approach:** Use `makeFunctionReference` from `convex/server` or construct references manually. The function reference is just `{ [Symbol("functionName")]: "admin:listContentTypes" }`.

However, the cleanest approach for a Vite SPA (which uses ESM + Rollup with tree-shaking, and `convex` has `"sideEffects": false`) is:

```tsx
// standalone/api.ts
import { anyApi } from "convex/server";

// The standalone admin always calls functions exported from the host app's convex/admin.ts
// These were created by defineAdminAPI and have the shape: api.admin.<functionName>
export const adminApi = anyApi.admin;
```

**If tree-shaking doesn't eliminate the warning**, fall back to a direct import:
```tsx
// standalone/api.ts
// Import anyApi from the specific module, not the barrel export
// @ts-ignore - deep import to avoid pulling in registration code
import { anyApi } from "convex/server/api.js";

export const adminApi = anyApi.admin;
```

**If even that doesn't work**, construct references manually:
```tsx
// standalone/api.ts  
import { makeFunctionReference } from "convex/server";

// Helper to create a proxy that constructs function references on-the-fly
function createAdminApi(): any {
  return new Proxy({}, {
    get(_, prop: string) {
      return makeFunctionReference(`admin:${prop}`);
    }
  });
}

export const adminApi = createAdminApi();
```

**Recommendation:** Try the approaches in order during implementation. The first one that produces zero console warnings wins. Verify with a browser DevTools check.

### Step 2: Create the Standalone SPA Shell

```tsx
// standalone/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```tsx
// standalone/App.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { RouterProvider } from "@tanstack/react-router";
import { useMemo } from "react";
import { router } from "./router";
import { adminApi } from "./api";
import { ApiProvider } from "../embed/contexts/ApiContext";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { BreadcrumbProvider } from "../contexts/BreadcrumbContext";
import { SettingsConfigProvider } from "../contexts/SettingsConfigContext";
import { RouteGuard } from "../components/RouteGuard";
import { resolveAdminConfig } from "../lib/admin-config";
import { getStandaloneConfig } from "./config";

export function App() {
  const config = getStandaloneConfig();
  
  const convex = useMemo(() => {
    return new ConvexReactClient(config.convexUrl);
  }, [config.convexUrl]);

  const adminConfig = useMemo(
    () => resolveAdminConfig(config.adminConfig),
    [config.adminConfig]
  );

  // In standalone mode, always use demo/mock auth
  const authConfig = useMemo(() => ({
    getUser: () => ({ id: "demo_admin", name: "Demo Admin", email: "admin@demo.com" }),
    getUserRole: () => "admin" as const,
    onLogout: () => console.log("Logout (standalone mode)"),
  }), []);

  return (
    <ThemeProvider>
      <BreadcrumbProvider>
        <ConvexProvider client={convex}>
          <ApiProvider api={adminApi}>
            <SettingsConfigProvider
              baseConfig={adminConfig}
              api={{ getSettings: adminApi.getSettings }}
            >
              <AuthProvider
                getUser={authConfig.getUser}
                getUserRole={authConfig.getUserRole}
                onLogout={authConfig.onLogout}
              >
                <RouteGuard>
                  <RouterProvider router={router} />
                </RouteGuard>
              </AuthProvider>
            </SettingsConfigProvider>
          </ApiProvider>
        </ConvexProvider>
      </BreadcrumbProvider>
    </ThemeProvider>
  );
}
```

### Step 3: Create the Client-Side Router

Replace TanStack Start's file-based routing with explicit TanStack Router routes (client-only):

```tsx
// standalone/router.tsx
import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router";
import { AdminLayout } from "../components/AdminLayout";
import {
  DashboardPage,
  ContentPage,
  ContentTypesPage,
  ContentTypeEntriesPage,
  MediaPage,
  SettingsPage,
  TaxonomiesPage,
  TrashPage,
} from "../pages";
// Import entry editor pages too
import { adminApi } from "./api";
import { useTanStackNavigation } from "./navigation";

// Root route provides the layout
const rootRoute = createRootRoute({
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});

// Each route is a thin wrapper, same as the old routes/ but using adminApi instead of api
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => {
    const nav = useTanStackNavigation();
    return <DashboardPage api={adminApi} navigation={nav} />;
  },
});

const contentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/content",
  component: () => {
    const nav = useTanStackNavigation();
    return <ContentPage api={adminApi} navigation={nav} />;
  },
});

// ... same pattern for all routes

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  contentRoute,
  contentTypesRoute,
  mediaRoute,
  settingsRoute,
  taxonomiesRoute,
  trashRoute,
  entriesRoutes, // entries/$entryId, entries/new.$contentTypeId, entries/type/$contentTypeId
]);

export const router = createRouter({ routeTree });
```

### Step 4: Config Loading

The current `config.server.ts` uses TanStack Start's `createServerFn` to load config server-side. In the SPA, the CLI injects config into the HTML:

```tsx
// standalone/config.ts
export interface StandaloneConfig {
  convexUrl: string;
  authMode: string;
  adminConfig: Record<string, unknown>;
}

// The CLI server injects this into the HTML via a script tag:
// <script>window.__CMS_CONFIG__ = { convexUrl: "...", authMode: "demo", adminConfig: {} }</script>
export function getStandaloneConfig(): StandaloneConfig {
  const config = (window as any).__CMS_CONFIG__;
  if (!config?.convexUrl) {
    throw new Error("CMS admin config not found. Are you running via 'npx convex-cms admin'?");
  }
  return config;
}
```

Update the CLI's admin command to inject the config:

```typescript
// src/cli/commands/admin.ts (MODIFY)
// Instead of starting a Nitro server, serve static files with config injection

import express from 'express'; // or use a lighter alternative
import path from 'path';

export async function adminCommand(options: AdminOptions) {
  const config = {
    convexUrl: options.url || process.env.CONVEX_URL || await readConvexUrl(),
    authMode: options.demo ? 'demo' : 'none',
    adminConfig: await loadAdminConfig(),
  };
  
  const app = express();
  const distPath = path.resolve(__dirname, '../../admin-dist');
  
  // Serve static assets
  app.use('/assets', express.static(path.join(distPath, 'assets')));
  
  // For all routes, serve index.html with config injected
  app.get('*', (req, res) => {
    let html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
    html = html.replace(
      '</head>',
      `<script>window.__CMS_CONFIG__ = ${JSON.stringify(config)}</script></head>`
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
  
  app.listen(options.port || 4000, () => {
    console.log(`CMS Admin running at http://localhost:${options.port || 4000}`);
  });
}
```

Note: The current CLI already uses Nitro's built-in server. Replacing it with a simple static file server (express, sirv, or even node's built-in http) is straightforward and eliminates the Nitro dependency for the CLI.

### Step 5: Fix the cmsExports Problem

The shared components (`UploadDropzone.tsx`, `Header.tsx`) import runtime values from `cmsExports.ts`:

```tsx
// Current: admin/src/lib/cmsExports.ts
export { getRole, getRolePermissions } from '../../../src/client/index';  // PULLS IN convex/server
export { useMediaUploadQueue } from '../../../src/react/index';           // SAFE (type-only convex/server import)
```

**Fix:** Create `admin/src/lib/roles.ts` with the pure utility functions copied from `src/component/roles.ts`. These functions are simple lookups against a static roles table; they don't use Convex at all:

```tsx
// admin/src/lib/roles.ts (NEW)
// Pure utility functions for role resolution. No convex/server dependency.
// Mirrors the role definitions from src/component/roles.ts

export type RoleName = "admin" | "editor" | "author" | "viewer";

interface RoleDefinition {
  name: string;
  description: string;
  permissions: string[];
}

const DEFAULT_ROLES: Record<RoleName, RoleDefinition> = {
  admin: { name: "Admin", description: "Full access", permissions: [/* ... copy from roles.ts */] },
  editor: { name: "Editor", description: "Can edit all content", permissions: [/* ... */] },
  author: { name: "Author", description: "Can create and edit own content", permissions: [/* ... */] },
  viewer: { name: "Viewer", description: "Read-only access", permissions: [/* ... */] },
};

export function getRole(roleName: string): RoleDefinition | undefined {
  return DEFAULT_ROLES[roleName as RoleName];
}

export function getRolePermissions(roleName: string): string[] {
  return DEFAULT_ROLES[roleName as RoleName]?.permissions ?? [];
}
```

Then update `UploadDropzone.tsx` and `Header.tsx` to import from `~/lib/roles` instead of `~/lib/cmsExports`.

For `useMediaUploadQueue`: this hook is from `convex-cms/react` which only has type-only imports from `convex/server`. It should be safe to import in the browser. Update the import to:
```tsx
import { useMediaUploadQueue } from "convex-cms/react";
// or keep the relative import from ../../../src/react/index which is safe
```

### Step 6: Simplify admin/vite.config.ts

```tsx
// admin/vite.config.ts (NEW - replaces current)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../admin-dist",   // Build output goes to package root's admin-dist/
    emptyDirBeforeWrite: true,
  },
});
```

### Step 7: Update admin/package.json

Remove TanStack Start, Vinxi, and Nitro dependencies:

```diff
- "@tanstack/react-start": "..."
- "vinxi": "..."
- "@vinxi/server-functions": "..."
- "nitropack": "..."
+ (no replacements needed; Vite + TanStack Router is already a dependency)
```

Update scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Step 8: Update the Build Pipeline

The root `package.json`'s `build:admin` script needs to build the SPA:

```json
{
  "scripts": {
    "build:admin": "cd admin && pnpm build"
  }
}
```

The output goes to `admin-dist/` which is included in the npm package via the `files` field. This replaces the current Nitro build output. The structure changes from:

```
admin-dist/           # CURRENT (Nitro)
├── server/           # Nitro server bundle
│   ├── index.mjs
│   ├── _ssr/
│   └── _chunks/
├── public/           # Static assets
│   └── assets/
└── nitro.json
```

To:

```
admin-dist/           # NEW (Vite SPA)
├── index.html        # SPA entry (config placeholder injected at serve time)
└── assets/           # JS, CSS, fonts
    ├── index-[hash].js
    ├── index-[hash].css
    └── ...
```

## Type Safety Analysis

### End Developer (someone installing convex-cms)

**Unchanged.** They interact with:
1. `defineAdminAPI(components.cms, { contentTypes: {...} })` in `convex/admin.ts` - fully typed, returns typed function references
2. `<CmsAdmin api={api.admin} auth={...} />` in their React app - `api.admin` is typed from their codegen
3. `createCmsClient(components.cms)` - fully typed wrapper
4. All React hooks (`useContentEntries`, etc.) - fully typed

None of these touch the standalone admin's internals.

### Embed Mode

**Unchanged.** `CmsAdmin` receives `api` as a prop typed as `CmsAdminApi`. The host app's bundler processes the embed source. No `convex/server` imports in the embed path (after the `cmsExports.ts` fix).

### Standalone CLI Admin (package author DX)

**Slightly changed.** The standalone SPA uses `anyApi` which returns `AnyFunctionReference` (untyped args/returns). In practice:
- `useQuery(adminApi.listContentTypes, {})` works at runtime but TypeScript won't check the args
- The shared page components ARE still typed via `CmsAdminApi` (the interface from `ApiContext.tsx`)
- Autocomplete still works for function names (anyApi uses a Proxy)

**Mitigation (B2 from earlier):** Generate a `.d.ts` file that types the `adminApi` object. Since `defineAdminAPI` has a known, fixed return type, you can create:

```tsx
// standalone/api.d.ts (generated or hand-maintained)
import type { CmsAdminApi } from "../embed/contexts/ApiContext";
export declare const adminApi: CmsAdminApi;
```

This gives full type safety in the standalone app during development. At runtime, `anyApi` handles the actual calls.

## Migration Checklist

- [ ] Create `admin/src/standalone/` directory with main.tsx, App.tsx, router.tsx, api.ts, config.ts
- [ ] Create `admin/src/lib/roles.ts` (pure utility, no convex/server)
- [ ] Create `admin/index.html` (Vite SPA entry)
- [ ] Update `admin/vite.config.ts` (plain Vite SPA, remove TanStack Start plugin)
- [ ] Update `admin/package.json` (remove Start/Vinxi/Nitro deps, update scripts)
- [ ] Update shared component imports: `UploadDropzone.tsx` and `Header.tsx` use `~/lib/roles` instead of `~/lib/cmsExports`
- [ ] Verify `useMediaUploadQueue` import is browser-safe (it should be; `convex-cms/react` has type-only `convex/server` imports)
- [ ] Port all routes from `admin/src/routes/` to `admin/src/standalone/router.tsx` (mechanical, ~10 routes)
- [ ] Port navigation adapter from `admin/src/lib/tanstack-adapter.ts` to `admin/src/standalone/navigation.ts`
- [ ] Update `src/cli/commands/admin.ts` to serve static files with config injection instead of Nitro
- [ ] Delete: `admin/convex/`, `admin/src/routes/`, `admin/src/lib/convex.ts`, `admin/src/lib/cmsExports.ts`, `admin/src/lib/config.server.ts`
- [ ] Update root `package.json` build scripts
- [ ] Build and verify: zero console warnings, all pages load, navigation works
- [ ] Test `npx convex-cms admin` end-to-end against a real Convex deployment
- [ ] Update `admin/src/embed/` to also use `~/lib/roles` instead of `~/lib/cmsExports` (same fix)
- [ ] Verify embed mode still works (no regressions)
- [ ] Update docs if they reference the admin architecture

## Risks and Edge Cases

1. **TanStack Router vs TanStack Start:** The current routes use file-based routing from Start. Switching to explicit route definitions means manually maintaining the route tree. This is straightforward for ~10 routes but is a thing to keep consistent.

2. **`anyApi` and tree-shaking:** If importing `anyApi` from `convex/server` still pulls in `registration_impl.js` despite tree-shaking, use the `makeFunctionReference` Proxy approach (Step 1, third option). Test this early.

3. **CSS/Tailwind:** The standalone SPA needs the same Tailwind config as the current app. The `index.css` already imports the Tailwind styles. Verify the Vite SPA build produces correct CSS.

4. **Hot reload during admin development:** With the current setup, `admin/` has its own `dev` script. The new Vite SPA dev server needs to know the Convex URL. During development, set `VITE_CONVEX_URL` in a `.env` file or pass it via CLI: `VITE_CONVEX_URL=... pnpm dev`.

5. **Duplicate role definitions:** Copying `getRole`/`getRolePermissions` to `admin/src/lib/roles.ts` means two copies of the role table. If roles change in the component, the admin copy needs updating. Consider: export a pure `roles.ts` from the package root (no `convex/server` dependency) that both the component and admin can import. Add this as a new package export: `"./roles"`.

6. **Admin config loading:** The current system uses `createServerFn` to load config from files or env vars on the server. The SPA approach injects config via `window.__CMS_CONFIG__`. This means config file loading (`cms-admin.config.ts`) happens in the CLI process (Node.js) before serving, not at request time. This is actually better (faster, no server-side processing per request).

## Alternative Considered: Keep TanStack Start, Fix Imports Only (Path A)

This would fix the immediate console errors but:
- Still requires the admin's own `convex/` backend and codegen
- TanStack Start + Nitro adds ~200KB to the bundle for no benefit
- Build pipeline remains complex (codegen -> Start build -> Nitro bundle)
- Contributors still need a separate Convex project to build the admin
- Doesn't address the root architectural issue

Path B is more work upfront but results in a simpler, faster, more maintainable system.
