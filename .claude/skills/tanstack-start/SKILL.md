---
name: tanstack-start
description: This skill should be used when the user asks to "create a page", "add a route", "handle navigation", "add search params", "protect a route", or mentions TanStack Start, TanStack Router, file-based routing, route params, loaders, server functions, or SSR.
---

# TanStack Start Patterns

TanStack Start with Convex component integration patterns for the convex-cms admin UI.

**Context**: This skill applies to the **admin UI** in `admin/`, not the main component library.

## Core Architecture

The admin UI uses:

- **TanStack Start** - Full-stack React framework with file-based routing
- **Convex** - Real-time backend (via `@convex-dev/react-query`)
- **Pluggable Auth** - Authentication context in `admin/src/contexts/`
- **TanStack Query** - Data fetching layer bridging Convex

## File-Based Routing

Routes live in `admin/src/routes/`. File names map to URL paths.

| File                         | URL                | Description               |
| ---------------------------- | ------------------ | ------------------------- |
| `index.tsx`                  | `/`                | Dashboard                 |
| `content-types/index.tsx`    | `/content-types`   | Content type list         |
| `content-types/$typeId.tsx`  | `/content-types/x` | Content type detail       |
| `_authed.tsx`                | -                  | Layout route (prefix `_`) |
| `_authed/entries.tsx`        | `/entries`         | Protected route           |
| `__root.tsx`                 | -                  | Root layout (all routes)  |

## Route Creation

Basic route with component:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/content-types/')({
  component: ContentTypesPage,
})

function ContentTypesPage() {
  return <div>Content Types</div>
}
```

## Route Params

Access dynamic segments via `useParams`:

```tsx
export const Route = createFileRoute('/content-types/$typeId')({
  component: ContentTypeDetailPage,
})

function ContentTypeDetailPage() {
  const { typeId } = Route.useParams()
  // typeId is typed as string
}
```

## Search Params

Define and validate with Zod:

```tsx
import { z } from 'zod'

const searchSchema = z.object({
  page: z.number().optional().default(1),
  status: z.enum(['draft', 'published']).optional(),
})

export const Route = createFileRoute('/entries/')({
  validateSearch: searchSchema,
  component: EntriesPage,
})

function EntriesPage() {
  const { page, status } = Route.useSearch()
}
```

## Navigation

**Link component** - Declarative navigation:

```tsx
import { Link } from '@tanstack/react-router'

<Link to="/content-types/$typeId" params={{ typeId: '123' }}>View Type</Link>
<Link to="/entries" search={{ page: 2 }}>Page 2</Link>
<Link to="." search={(prev) => ({ ...prev, page: prev.page + 1 })}>Next</Link>
```

**useNavigate** - Programmatic navigation:

```tsx
const navigate = useNavigate()
navigate({ to: '/content-types/$typeId', params: { typeId } })
navigate({ to: '/entries', search: { status: 'published' } })
```

## Protected Routes (Layout Routes)

The `_authed.tsx` layout protects child routes:

```tsx
// admin/src/routes/_authed.tsx
import { useAuthContext } from '../contexts/AuthContext'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.userId) {
      throw new Error('Not authenticated')
    }
  },
  errorComponent: ({ error }) => {
    if (error.message === 'Not authenticated') {
      return <SignInPrompt />
    }
    throw error
  },
})
```

Child routes under `_authed/` are automatically protected.

## Convex Component Data Loading

Use TanStack Query with the CMS component API:

```tsx
import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../convex/_generated/api'

function ContentTypesList() {
  // Access CMS component via api.convexCms
  const { data: types, isPending } = useQuery(
    convexQuery(api.convexCms.contentTypes.list, {}),
  )

  if (isPending) return <Loading />
  return (
    <ul>
      {types?.map((type) => (
        <li key={type._id}>{type.name}</li>
      ))}
    </ul>
  )
}
```

## Mutations

Use `useConvexMutation` for writes:

```tsx
import { useConvexMutation } from '@convex-dev/react-query'
import { useMutation } from '@tanstack/react-query'

function CreateContentTypeButton() {
  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.convexCms.contentTypes.create),
  })

  return (
    <button
      onClick={() => mutate({ name: 'blog_post', displayName: 'Blog Post' })}
      disabled={isPending}
    >
      {isPending ? 'Creating...' : 'Create Type'}
    </button>
  )
}
```

## Server Functions

For server-only operations (not Convex):

```tsx
import { createServerFn } from '@tanstack/react-start'

const getSecretData = createServerFn({ method: 'GET' }).handler(async () => {
  const secret = process.env.API_SECRET // Server-only
  return fetchExternalAPI(secret)
})
```

**Note**: Use Convex queries/mutations for CMS operations. Server functions are for external APIs or server-only logic.

## SSR Modes

| Mode        | `ssr` Value   | Behavior                            |
| ----------- | ------------- | ----------------------------------- |
| Full SSR    | `true`        | Component + data on server          |
| Data-only   | `'data-only'` | Data on server, component on client |
| Client-only | `false`       | Everything on client                |

```tsx
export const Route = createFileRoute('/dashboard')({
  ssr: 'data-only', // Loader runs server-side, component client-side
  component: Dashboard,
})
```

## Common Mistakes

1. **Using loader for Convex** - Use `useQuery(convexQuery(...))` in components instead; Convex is reactive
2. **Missing auth check in \_authed** - Always check `context.userId` in `beforeLoad`
3. **Forgetting to type params** - Route params are strings; parse to `Id<"table">` when needed
4. **Not handling loading states** - Always check `isPending` from useQuery
5. **Server functions for Convex** - Don't use `createServerFn` for CMS ops; use Convex mutations
6. **Accessing component directly** - Use `api.convexCms.*` not raw component functions
