import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import type { ReactNode } from 'react'
import appCss from '~/styles/app.css?url'
import { AdminLayout } from '~/components'

// Initialize Convex client
// In production, this URL should come from environment variables
const convexUrl = import.meta.env.VITE_CONVEX_URL as string

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

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
        <AdminLayout>
          <Outlet />
        </AdminLayout>
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
