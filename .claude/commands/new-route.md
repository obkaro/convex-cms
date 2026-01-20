---
description: Create a new TanStack Start route for the admin UI. Use when you need to "add a page", "create a route", or "new admin page".
argument-hint: "<route-path> - e.g., '/content-types/$id'"
allowed-tools: Read, Glob, Grep, Edit, Write
---

# Create New Route (Admin UI)

Create: $ARGUMENTS

**Context**: Routes are for the admin UI, not the main component. The admin UI is a TanStack Start app in `admin/`.

## Route Naming Conventions

| URL Pattern | File Name | Use Case |
|-------------|-----------|----------|
| `/content-types` | `content-types.tsx` | List page |
| `/content-types/$id` | `content-types.$id.tsx` | Detail page |
| `/content-types/new` | `content-types.new.tsx` | Create page |
| `/content-types/$id/edit` | `content-types.$id.edit.tsx` | Edit page |

## Steps

1. Determine route path and if dynamic (e.g., `$contentTypeId`)
2. Check existing routes in `admin/src/routes/` for patterns
3. Apply patterns from `tanstack-start` skill:
   - Use `createFileRoute` with correct path
   - Handle loading (`=== undefined`), empty, not found (`=== null`)
   - Use pluggable auth context from `admin/src/contexts/`
4. Use CMS component API via `components.convexCms`:
   ```tsx
   const { data } = useQuery(convexQuery(api.convexCms.contentTypes.list, {}))
   ```
5. Add navigation links if needed
6. Test all UI states

## State Handling Checklist

- [ ] Loading state: `data === undefined`
- [ ] Empty state: `data.length === 0`
- [ ] Not found: `data === null`
- [ ] Error state: try/catch or error boundary
