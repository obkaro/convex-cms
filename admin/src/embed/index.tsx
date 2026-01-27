/**
 * Embeddable CMS Admin Component
 *
 * Use this component to embed the CMS admin UI into your existing React app.
 * Provides a fully functional admin interface with router-agnostic navigation.
 *
 * @example
 * ```tsx
 * import { CmsAdmin } from "@convex-cms/admin/embed";
 *
 * function App() {
 *   return (
 *     <CmsAdmin
 *       convexUrl="https://your-deployment.convex.cloud"
 *       auth={{
 *         getUser: () => currentUser,
 *         getUserRole: (userId) => userRoles[userId] ?? null,
 *         onLogout: () => signOut(),
 *       }}
 *       config={{
 *         branding: { appName: "My CMS" },
 *         navigation: { showTaxonomies: false },
 *       }}
 *       basePath="/admin"
 *     />
 *   );
 * }
 * ```
 */

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";
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

function ConvexProviderWrapper({
  convexUrl,
  children,
}: {
  convexUrl: string;
  children: ReactNode;
}) {
  const convex = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!convex) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background p-6">
        <div className="diff-modified max-w-lg space-y-4 rounded-lg border p-6 text-center">
          <h2 className="text-xl font-semibold text-diff-modified">
            Convex Configuration Required
          </h2>
          <p className="text-sm text-diff-modified-foreground">
            Please provide a valid convexUrl prop to the CmsAdmin component.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
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
  convexUrl,
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
  const adminConfig = useMemo(() => resolveAdminConfig(config), [config]);
  const authConfig = useMemo(() => adaptAuthConfig(auth), [auth]);
  const settingsApi = useMemo(
    () => (api.getSettings ? { getSettings: api.getSettings } : undefined),
    [api]
  );

  return (
    <div className={className}>
      <ApiProvider api={api}>
        <ThemeProvider>
          <ConvexProviderWrapper convexUrl={convexUrl}>
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
          </ConvexProviderWrapper>
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
