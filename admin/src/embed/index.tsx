/**
 * Embeddable CMS Admin Component
 *
 * Prerequisites:
 * 1. Render inside a ConvexProvider.
 * 2. Add Tailwind v4 source scanning in your CSS (see admin-ui-setup guide).
 * 3. Pass className="h-screen" for correct layout height.
 *
 * See docs/guides/admin-ui-setup.md for full setup instructions.
 */

import { useConvex, useMutation } from "convex/react";
import { useMemo, useEffect, useRef } from "react";
import { cn } from "../lib/cn";
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
  EmbedUsers,
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
      case "users":
        return <EmbedUsers />;
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
  themeMode = "isolated",
  darkModeControl = "independent",
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

  // Auto-register the current user's profile in CMS on mount
  const registerSelf = api.registerSelf ? useMutation(api.registerSelf) : null;
  const hasRegistered = useRef(false);
  useEffect(() => {
    if (hasRegistered.current || !registerSelf) return;
    hasRegistered.current = true;

    // Get user profile from the auth config and send to server
    Promise.resolve(auth.getUser()).then((user) => {
      if (user) {
        registerSelf({
          displayName: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        }).catch(() => {
          // Non-critical — profile registration failed silently
        });
      }
    });
  }, [registerSelf, auth]);

  if (!convex) {
    return (
      <div
        className={cn("flex h-full items-center justify-center bg-background p-6", className)}
        data-cms-admin={themeMode}
      >
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
    <div className={cn("h-full", className)} data-cms-admin={themeMode}>
      <ApiProvider api={api}>
        <ThemeProvider themeMode={themeMode} darkModeControl={darkModeControl}>
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
                  <EmbedRouter />
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
