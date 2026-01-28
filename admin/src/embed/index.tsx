/**
 * Embeddable CMS Admin Component
 *
 * Use this component to embed the CMS admin UI into your existing React app.
 * Provides a fully functional admin interface with router-agnostic navigation.
 *
 * IMPORTANT: The CmsAdmin component must be rendered within a ConvexProvider.
 * Your app should already have this if you're using Convex.
 *
 * @example
 * ```tsx
 * import { CmsAdmin } from "convex-cms/admin";
 * import { api } from "./convex/_generated/api";
 *
 * function App() {
 *   return (
 *     <ConvexProvider client={convex}>
 *       <CmsAdmin
 *         api={api.admin}
 *         auth={{
 *           getUser: () => currentUser,
 *           getUserRole: (userId) => userRoles[userId] ?? null,
 *           onLogout: () => signOut(),
 *         }}
 *         config={{
 *           branding: { appName: "My CMS" },
 *           navigation: { showTaxonomies: false },
 *         }}
 *         basePath="/admin"
 *       />
 *     </ConvexProvider>
 *   );
 * }
 * ```
 */

import { useConvex } from "convex/react";
import { useMemo } from "react";
import { SettingsConfigProvider } from "../contexts/SettingsConfigContext";
import {
  AuthProvider,
  type GetUserHook,
  type GetUserRoleHook,
  type LogoutHook,
} from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { RouteGuard } from "../components/RouteGuard";
import { resolveAdminConfig } from "../lib/admin-config";
import type { CmsAdminProps, CmsAdminAuthConfig } from "./types";
import { ApiProvider } from "./contexts/ApiContext";
import {
  EmbedNavigationProvider,
  useEmbedNavigation,
  type EmbedRoute,
} from "./navigation";
import { EmbedLayout } from "./components/EmbedLayout";
import {
  EmbedDashboard,
  EmbedContent,
  EmbedContentTypeEntries,
  EmbedContentTypes,
  EmbedMedia,
  EmbedSettings,
  EmbedTrash,
  EmbedTaxonomies,
  EmbedNewEntry,
  EmbedEntry,
} from "./pages";

function adaptAuthConfig(auth: CmsAdminAuthConfig): {
  getUser: GetUserHook;
  getUserRole: GetUserRoleHook;
  onLogout: LogoutHook;
} {
  return {
    getUser: auth.getUser,
    getUserRole: ({ userId }) => auth.getUserRole(userId),
    onLogout: auth.onLogout ?? (() => {}),
  };
}

function EmbedRouter() {
  const { currentRoute } = useEmbedNavigation();

  const renderPage = () => {
    switch (currentRoute.route) {
      case "dashboard":
        return <EmbedDashboard />;
      case "content":
        return <EmbedContent />;
      case "content-types":
        return <EmbedContentTypes />;
      case "media":
        return <EmbedMedia />;
      case "settings":
        return <EmbedSettings />;
      case "taxonomies":
        return <EmbedTaxonomies />;
      case "trash":
        return <EmbedTrash />;
      case "entries": {
        // Handle new entry action
        if (currentRoute.params.action === "new") {
          return <EmbedNewEntry />;
        }
        // Handle existing entry edit
        if (currentRoute.params.entryId) {
          return <EmbedEntry />;
        }
        // Handle content type specific entries
        if (currentRoute.params.contentTypeId) {
          return <EmbedContentTypeEntries contentTypeId={currentRoute.params.contentTypeId} />;
        }
        return <EmbedContent />;
      }
      default:
        return <EmbedDashboard />;
    }
  };

  return <EmbedLayout>{renderPage()}</EmbedLayout>;
}

export function CmsAdmin({
  api,
  config,
  auth,
  basePath = "/admin",
  className,
  initialRoute = "dashboard",
  onNavigate,
}: CmsAdminProps & {
  initialRoute?: EmbedRoute;
  onNavigate?: (path: string, params: Record<string, string>) => void;
}) {
  const convex = useConvex();
  const adminConfig = useMemo(() => resolveAdminConfig(config), [config]);
  const authConfig = useMemo(() => adaptAuthConfig(auth), [auth]);
  const settingsApi = useMemo(
    () => (api.getSettings ? { getSettings: api.getSettings } : undefined),
    [api]
  );

  if (!convex) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background p-6">
        <div className="diff-modified max-w-lg space-y-4 rounded-lg border p-6 text-center">
          <h2 className="text-xl font-semibold text-diff-modified">
            ConvexProvider Required
          </h2>
          <p className="text-sm text-diff-modified-foreground">
            CmsAdmin must be rendered within a ConvexProvider. Wrap your app or
            this component with ConvexProvider.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ApiProvider api={api}>
        <ThemeProvider>
          <SettingsConfigProvider baseConfig={adminConfig} api={settingsApi}>
            <AuthProvider
              getUser={authConfig.getUser}
              getUserRole={authConfig.getUserRole}
              onLogout={authConfig.onLogout}
            >
              <EmbedNavigationProvider
                initialRoute={initialRoute}
                basePath={basePath}
                onNavigate={onNavigate}
              >
                <RouteGuard>
                  <div className="min-h-screen">
                    <EmbedRouter />
                  </div>
                </RouteGuard>
              </EmbedNavigationProvider>
            </AuthProvider>
          </SettingsConfigProvider>
        </ThemeProvider>
      </ApiProvider>
    </div>
  );
}

export type { CmsAdminProps, CmsAdminAuthConfig, CmsAdminUser } from "./types";
export type { CmsAdminApi } from "./contexts/ApiContext";
export type { AdminConfig, NavItem } from "../lib/admin-config";
export { resolveAdminConfig, defineAdminConfig } from "../lib/admin-config";
export type { EmbedRoute, EmbedRouteState } from "./navigation";
export { useEmbedNavigation, useEmbedParams, useEmbedRoute } from "./navigation";
