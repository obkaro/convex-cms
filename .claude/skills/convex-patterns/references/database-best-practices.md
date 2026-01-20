# Database Best Practices

Detailed guidance on Convex database operations for performance and correctness.

## Use Built-in System Fields

Convex automatically adds `_id` and `_creationTime` to every document. **Do not manually add `createdAt` fields.**

| Field           | Type              | Description                   |
| --------------- | ----------------- | ----------------------------- |
| `_id`           | `Id<"tableName">` | Unique document identifier    |
| `_creationTime` | `number`          | Milliseconds since Unix epoch |

```typescript
// ❌ Redundant - Convex already tracks this
jobs: defineTable({
  title: v.string(),
  createdAt: v.number(), // Don't add this!
})

// ✅ Correct - use _creationTime
const jobs = await ctx.db.query('jobs').order('desc').take(10)
// Sort by newest: uses _creationTime by default
jobs.forEach((job) => console.log(job._creationTime))
```

**Note:** `_creationTime` is indexed by default, so ordering by creation time is efficient.

## Await All Promises

Every `ctx.db`, `ctx.scheduler`, and `ctx.storage` call returns a Promise. Failing to await can cause:

- Missed writes or schedules
- Unhandled errors
- Unexpected behavior

**ESLint Rule**: Enable `@typescript-eslint/no-floating-promises`

## Avoid `.filter()` on Queries

`.filter()` has the same performance as filtering in TypeScript code but is harder to read and write.

**Replace with:**

1. **Index conditions** - Most efficient, use `.withIndex()` or `.withSearchIndex()`
2. **TypeScript filtering** - Same performance as `.filter()`, more readable

| Scenario                       | Solution                                |
| ------------------------------ | --------------------------------------- |
| Filtering by exact field value | Use `.withIndex()`                      |
| Filtering by text search       | Use `.withSearchIndex()`                |
| Complex boolean logic          | Filter in TypeScript after `.collect()` |
| Pagination with filter         | Use `.filter()` (only exception)        |

**Exception**: `.filter()` on paginated queries ensures page sizes stay consistent.

## Limit `.collect()` Usage

`.collect()` loads all matching documents. This is problematic for:

- Large result sets (1000+ documents)
- Unbounded queries (could grow indefinitely)
- Queries where any document change triggers re-run

**Alternatives:**

| Pattern                  | Use Case                           |
| ------------------------ | ---------------------------------- |
| `.withIndex()`           | Narrow results before collecting   |
| `.paginate()`            | User-facing lists, infinite scroll |
| `.take(n)`               | "Top N" results, previews          |
| `.first()` / `.unique()` | Single document lookups            |
| Denormalization          | Counts, aggregates                 |

**Denormalization example**: Store count in separate table, update via mutation, instead of counting documents each time.

## Use Table Names in ctx.db Calls

Since Convex 1.31.0, pass table name as first argument:

```typescript
// Preferred (explicit table)
await ctx.db.get('jobs', jobId)
await ctx.db.patch('jobs', jobId, update)
await ctx.db.replace('jobs', jobId, doc)
await ctx.db.delete('jobs', jobId)
```

Benefits:

- Additional safety check
- Required for future custom ID generation
- Clearer code

**ESLint Rule**: Enable `@convex-dev/explicit-table-ids`

## Avoid Redundant Indexes

Indexes have storage and write overhead. Common redundancy:

- `by_user` on `["userId"]`
- `by_user_and_status` on `["userId", "status"]`

The second index can serve queries for just `userId` too - drop the first.

**Exception**: Order matters. `by_channel` (sorted by `_creationTime`) vs `by_channel_and_author` (sorted by `author`) serve different use cases when ordering is important.

## Query Performance Checklist

- [ ] All `.collect()` calls have bounded results (via index, take, or known limit)
- [ ] No `.filter()` usage (except paginated queries)
- [ ] Indexes defined for all query patterns
- [ ] No redundant indexes
- [ ] Table names passed to `ctx.db.get/patch/replace/delete`
