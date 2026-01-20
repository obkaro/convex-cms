---
name: convex-patterns
description: This skill should be used when the user asks to "create a Convex function", "write a query", "write a mutation", "add validation", "add access control", "optimize queries", or mentions Convex backend, validators, custom functions, helper functions, model layer, database operations, indexes, authentication, or authorization.
---

# Convex Patterns

**Component Note**: This is a Convex Component. Components run in an isolated sandbox and **cannot access `ctx.auth`**. User identity must be passed as function arguments.

## Core Principles

1. **Await all promises** - Always `await` ctx.db, ctx.scheduler calls; use `no-floating-promises` ESLint rule
2. **Helper functions over handlers** - Business logic in `src/component/lib/`, thin wrappers as public API
3. **Validate all public function arguments** - For security; internal functions can be more relaxed
4. **Add `returns` validators** - Document and enforce return types
5. **Access control via hooks** - Use authorization hooks, pass user context as args
6. **Actions are not retried** - Handle errors explicitly

## Function Types

| Type        | Use For                 | Transactional | External Calls |
| ----------- | ----------------------- | ------------- | -------------- |
| `query`     | Reading data            | Yes           | No             |
| `mutation`  | Writing data            | Yes           | No             |
| `action`    | External APIs, AI calls | No            | Yes            |
| `internal*` | Server-to-server only   | Varies        | Varies         |

## Database Best Practices

**Avoid `.filter()`** - Use `.withIndex()` or filter in TypeScript instead. `.filter()` has same performance as code filtering but worse readability.

**Limit `.collect()` results** - Only use when results are small (<1000 docs). For large/unbounded data, use:

- Indexes to narrow results
- `.paginate()` for pagination
- `.take(n)` for limits
- Denormalization for counts

**Use table names in ctx.db calls** - Pass table name as first arg for safety:

```typescript
await ctx.db.get('content_entries', entryId) // Good
await ctx.db.patch('content_entries', entryId, { status }) // Good
```

**Avoid redundant indexes** - `by_foo` and `by_foo_and_bar` are redundant; keep only `by_foo_and_bar`.

See: `references/database-best-practices.md`

## Access Control (Component Pattern)

**Components cannot use `ctx.auth`** - Pass user context as function arguments:

```typescript
// Component function signature
export const publish = mutation({
  args: {
    entryId: v.id("content_entries"),
    userId: v.string(),      // Passed from parent app
    userRole: v.string(),    // Passed from parent app
  },
  returns: v.id("content_entries"),
  handler: async (ctx, { entryId, userId, userRole }) => {
    // Check authorization via hooks
    await checkAuthorization(ctx, { userId, userRole, action: "publish" })
    // ...
  },
})
```

**Use authorization hooks** - Create authenticated wrappers in `src/component/authorization.ts`:

```typescript
// Parent app provides getUserRole hook
const cms = createCmsClient(components.convexCms, {
  getUserRole: async ({ userId }) => {
    const user = await ctx.db.get("users", userId)
    return user?.role ?? "viewer"
  },
})
```

See: `references/access-control.md`

## Internal Functions

**Only schedule internal functions** - Use `internal.foo.bar`, never `api.foo.bar` for:

- `ctx.scheduler.runAfter/runAt`
- `ctx.runQuery/runMutation/runAction`
- Cron jobs

**Use runAction sparingly** - Only when calling code that needs different runtime (e.g., Node.js from Convex runtime). Otherwise, use plain TypeScript functions.

**Avoid sequential ctx.run\* in actions** - Combine into single query/mutation for consistency:

```typescript
// Bad: Two transactions, could be inconsistent
const entry = await ctx.runQuery(...);
const contentType = await ctx.runQuery(...);

// Good: One transaction, guaranteed consistent
const { entry, contentType } = await ctx.runQuery(internal.content.getEntryAndType, { entryId });
```

**Use ctx.run\* sparingly in queries/mutations** - Prefer plain TypeScript helper functions; ctx.run\* has overhead.

## Schema Best Practices

**Don't add `createdAt` fields** - Convex provides `_creationTime` automatically on every document. Use it instead of manually tracking creation time:

```typescript
// ❌ Bad - redundant field
content_entries: defineTable({
  title: v.string(),
  createdAt: v.number(), // Don't do this!
})

// ✅ Good - use built-in _creationTime
content_entries: defineTable({
  title: v.string(),
})
// Access via doc._creationTime (milliseconds since epoch)
```

**System fields** - All documents automatically have `_id` (type: `Id<"tableName">`) and `_creationTime` (type: `number`, milliseconds since epoch). These are indexed by default.

## Schema Validator Patterns

**Export validators from schema** for reuse:

```typescript
// schema.ts
export const contentStatusValidator = v.union(
  v.literal('draft'),
  v.literal('published'),
  v.literal('scheduled'),
)

export const contentEntryFields = { title: v.string(), status: contentStatusValidator }
```

**Use `Infer<typeof validator>`** for TypeScript types derived from validators.

**Pick/omit fields** via destructuring:

```typescript
const { status, ...entryWithoutStatus } = contentEntryFields // Omit
const { title, slug } = contentEntryFields // Pick
```

**Partial validators** for patch operations - use `partial()` from convex-helpers.

See: `references/validators-and-types.md`

## Error Handling

```typescript
import { ConvexError } from 'convex/values'

// Application errors (message reaches client)
throw new ConvexError('Content entry not found')

// Structured errors
throw new ConvexError({ code: 'NOT_FOUND', message: 'Content entry not found' })
```

## Common Mistakes

1. **Unawaited promises** - Always await db/scheduler operations
2. **Using `.filter()` on queries** - Use indexes or TypeScript filtering
3. **Using `.collect()` on unbounded data** - Use pagination or limits
4. **Trying to use `ctx.auth` in component** - Components can't access it; pass user context as args
5. **Trusting client identity** - Validate in parent app before passing to component
6. **Using `api.*` in scheduler/ctx.run** - Use `internal.*` only
7. **Sequential ctx.run\* calls** - Combine into single transaction
8. **Bulky handlers** - Extract to `src/component/lib/` for business logic
9. **Adding `createdAt` fields** - Use built-in `_creationTime` instead
