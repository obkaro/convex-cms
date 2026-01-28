import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";
import globalsCss from "~/styles/globals.css?url";
import { AdminLayout, RouteGuard } from "~/components";
import {
  AuthProvider,
  BreadcrumbProvider,
  SettingsConfigProvider,
  ThemeProvider,
  type GetUserHook,
  type GetUserRoleHook,
  type LogoutHook,
} from "~/contexts";
import { ApiProvider } from "~/embed/contexts/ApiContext";
import type { AdminConfig } from "~/lib/admin-config";
import { resolveAdminConfig } from "~/lib/admin-config";
import { getServerConfig, type ServerConfig } from "~/lib/config.server";
import { api } from "../../convex/_generated/api";

/**
 * Auth Configuration
 *
 * These hooks integrate with the parent app's authentication system.
 * In a real deployment, these would be provided by your auth provider
 * (Clerk, Auth0, Convex Auth, etc.).
 *
 * For development/demo purposes, we provide a mock implementation.
 * Replace these with actual auth integration in production.
 */

/**
 * Mock user for development.
 * Set AUTH_MODE=demo to use this, or customize for your auth provider.
 */
const mockGetUser: GetUserHook = () => {
  // In development/demo mode, return a mock admin user
  return {
    id: "mock_user_123",
    name: "Demo Admin",
    email: "admin@example.com",
  };
};

/**
 * Mock role resolver for development.
 * Returns 'admin' for the mock user.
 */
const mockGetUserRole: GetUserRoleHook = () => {
  // In development/demo mode, return admin role
  return "admin";
};

/**
 * Mock logout handler.
 */
const mockLogout: LogoutHook = () => {
  console.log("Logout called (mock mode)");
};

/**
 * No-auth mode - for when auth is not configured.
 * Returns null to indicate unauthenticated state.
 */
const noAuthGetUser: GetUserHook = () => null;
const noAuthGetUserRole: GetUserRoleHook = () => null;
const noAuthLogout: LogoutHook = () => {};

/**
 * Get auth hooks based on configuration.
 * Extend this to support different auth providers.
 */
function getAuthConfig(authMode: string): {
  getUser: GetUserHook;
  getUserRole: GetUserRoleHook;
  onLogout: LogoutHook;
} {
  switch (authMode) {
    case "mock":
    case "demo":
      return {
        getUser: mockGetUser,
        getUserRole: mockGetUserRole,
        onLogout: mockLogout,
      };
    case "none":
    case "disabled":
      return {
        getUser: noAuthGetUser,
        getUserRole: noAuthGetUserRole,
        onLogout: noAuthLogout,
      };
    default:
      // Default to mock mode for development convenience
      // In production, you should configure your actual auth provider
      return {
        getUser: mockGetUser,
        getUserRole: mockGetUserRole,
        onLogout: mockLogout,
      };
  }
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Convex CMS Admin",
      },
      {
        name: "description",
        content:
          "Admin interface for Convex CMS - manage content, media, and publishing workflows",
      },
    ],
    links: [
      { rel: "stylesheet", href: globalsCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  // Load server config at route initialization
  loader: async () => {
    const config = await getServerConfig();
    return { config };
  },
  component: RootComponent,
});

function RootComponent() {
  const { config } = Route.useLoaderData();

  const authConfig = useMemo(() => getAuthConfig(config.authMode), [config.authMode]);
  const adminConfig = useMemo(
    () => resolveAdminConfig(config.adminConfig),
    [config.adminConfig]
  );

  return (
    <RootDocument>
      <ThemeProvider>
        <BreadcrumbProvider>
          <ConvexProviderWrapper config={config} adminConfig={adminConfig}>
            <AuthProvider
              getUser={authConfig.getUser}
              getUserRole={authConfig.getUserRole}
              onLogout={authConfig.onLogout}
            >
              <RouteGuard>
                <AdminLayout>
                  <Outlet />
                </AdminLayout>
              </RouteGuard>
            </AuthProvider>
          </ConvexProviderWrapper>
        </BreadcrumbProvider>
      </ThemeProvider>
    </RootDocument>
  );
}

function ConvexProviderWrapper({
  children,
  config,
  adminConfig,
}: {
  children: ReactNode;
  config: ServerConfig;
  adminConfig: AdminConfig;
}) {
  const convex = useMemo(() => {
    if (!config.convexUrl) return null;
    return new ConvexReactClient(config.convexUrl);
  }, [config.convexUrl]);

  if (!convex) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="diff-modified max-w-lg space-y-4 rounded-lg border p-6 text-center">
          <h2 className="text-xl font-semibold text-diff-modified">
            Convex Configuration Required
          </h2>
          <p className="text-sm text-diff-modified-foreground">
            Please provide a Convex deployment URL to connect to your backend.
          </p>
          <div className="space-y-2 text-left text-sm text-diff-modified-foreground">
            <p className="font-medium">Options:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                Run with URL:{" "}
                <code className="rounded bg-diff-modified-bg/50 px-1">
                  npx convex-cms admin --url YOUR_URL
                </code>
              </li>
              <li>
                Set environment variable:{" "}
                <code className="rounded bg-diff-modified-bg/50 px-1">
                  CONVEX_URL=YOUR_URL
                </code>
              </li>
              <li>
                Add to{" "}
                <code className="rounded bg-diff-modified-bg/50 px-1">.env.local</code>:{" "}
                <code className="rounded bg-diff-modified-bg/50 px-1">
                  CONVEX_URL=YOUR_URL
                </code>
              </li>
            </ul>
          </div>
          <p className="text-sm text-diff-modified-foreground">
            Run{" "}
            <code className="rounded bg-diff-modified-bg/50 px-1">npx convex dev</code> to
            start Convex and get your URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <ApiProvider api={api.admin}>
        <SettingsConfigProvider baseConfig={adminConfig}>
          {children}
        </SettingsConfigProvider>
      </ApiProvider>
    </ConvexProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
