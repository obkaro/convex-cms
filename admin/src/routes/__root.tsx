import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type ReactNode } from "react";
import appCss from "~/styles/app.css?url";
import { AdminLayout, RouteGuard } from "~/components";
import {
  AuthProvider,
  type GetUserHook,
  type GetUserRoleHook,
  type LogoutHook,
} from "~/contexts";
import { getServerConfig, type ServerConfig } from "~/lib/config.server";

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
      { rel: "stylesheet", href: appCss },
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
  // Get the server config from the loader
  const { config } = Route.useLoaderData();

  // Get auth config based on the auth mode from server
  const authConfig = useMemo(() => getAuthConfig(config.authMode), [config.authMode]);

  return (
    <RootDocument>
      <ConvexProviderWrapper config={config}>
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
    </RootDocument>
  );
}

function ConvexProviderWrapper({
  children,
  config,
}: {
  children: ReactNode;
  config: ServerConfig;
}) {
  // Create Convex client from runtime config
  // useMemo ensures we only create one client per URL
  const convex = useMemo(() => {
    if (!config.convexUrl) return null;
    return new ConvexReactClient(config.convexUrl);
  }, [config.convexUrl]);

  if (!convex) {
    return (
      <div className="convex-error">
        <h2>Convex Configuration Required</h2>
        <p>
          Please provide a Convex deployment URL to connect to your backend.
        </p>
        <p>Options:</p>
        <ul>
          <li>
            Run with URL: <code>npx convex-cms admin --url YOUR_URL</code>
          </li>
          <li>
            Set environment variable: <code>CONVEX_URL=YOUR_URL</code>
          </li>
          <li>
            Add to <code>.env.local</code>: <code>CONVEX_URL=YOUR_URL</code>
          </li>
        </ul>
        <p>
          Run <code>npx convex dev</code> to start Convex and get your URL.
        </p>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
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
