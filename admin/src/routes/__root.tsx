import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import type { ReactNode } from 'react'
import appCss from '~/styles/app.css?url'
import { AdminLayout, RouteGuard } from '~/components'
import { AuthProvider, type GetUserHook, type GetUserRoleHook, type LogoutHook } from '~/contexts'

// Initialize Convex client
// In production, this URL should come from environment variables
const convexUrl = import.meta.env.VITE_CONVEX_URL as string

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

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

// Check for auth configuration in environment
const authMode = import.meta.env.VITE_AUTH_MODE as string | undefined

/**
 * Mock user for development.
 * Set VITE_AUTH_MODE=mock to use this, or customize for your auth provider.
 */
const mockGetUser: GetUserHook = () => {
  // In development/demo mode, return a mock admin user
  return {
    id: 'mock_user_123',
    name: 'Demo Admin',
    email: 'admin@example.com',
  }
}

/**
 * Mock role resolver for development.
 * Returns 'admin' for the mock user.
 */
const mockGetUserRole: GetUserRoleHook = ({ userId }) => {
  // In development/demo mode, return admin role
  return 'admin'
}

/**
 * Mock logout handler.
 */
const mockLogout: LogoutHook = () => {
  console.log('Logout called (mock mode)')
}

/**
 * No-auth mode - for when auth is not configured.
 * Returns null to indicate unauthenticated state.
 */
const noAuthGetUser: GetUserHook = () => null
const noAuthGetUserRole: GetUserRoleHook = () => null
const noAuthLogout: LogoutHook = () => {}

/**
 * Get auth hooks based on configuration.
 * Extend this to support different auth providers.
 */
function getAuthConfig(): {
  getUser: GetUserHook
  getUserRole: GetUserRoleHook
  onLogout: LogoutHook
} {
  switch (authMode) {
    case 'mock':
    case 'demo':
      return {
        getUser: mockGetUser,
        getUserRole: mockGetUserRole,
        onLogout: mockLogout,
      }
    case 'none':
    case 'disabled':
      return {
        getUser: noAuthGetUser,
        getUserRole: noAuthGetUserRole,
        onLogout: noAuthLogout,
      }
    default:
      // Default to mock mode for development convenience
      // In production, you should configure your actual auth provider
      return {
        getUser: mockGetUser,
        getUserRole: mockGetUserRole,
        onLogout: mockLogout,
      }
  }
}

const authConfig = getAuthConfig()

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Convex CMS Admin',
      },
      {
        name: 'description',
        content: 'Admin interface for Convex CMS - manage content, media, and publishing workflows',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <ConvexProviderWrapper>
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
  )
}

function ConvexProviderWrapper({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="convex-error">
        <h2>Convex Configuration Required</h2>
        <p>
          Please set the <code>VITE_CONVEX_URL</code> environment variable to connect to your Convex deployment.
        </p>
        <p>
          Run <code>npx convex dev</code> to start the Convex development server and generate the URL.
        </p>
      </div>
    )
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
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
  )
}
