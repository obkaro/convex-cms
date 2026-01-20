# Validators and Types

Patterns for schema reuse, validators, and TypeScript types in Convex.

## Export Validators from Schema

Define validators once in schema, export for reuse:

```typescript
// convex/schema.ts
export const jobStatusValidator = v.union(
  v.literal('discovered'),
  v.literal('applied'),
  v.literal('interviewing'),
  v.literal('rejected'),
  v.literal('offer'),
)

export const jobFields = {
  title: v.string(),
  company: v.string(),
  status: jobStatusValidator,
  userId: v.string(),
}

export default defineSchema({
  jobs: defineTable(jobFields).index('by_user', ['userId']),
})
```

## Access Schema Validators

Two ways to get validators:

```typescript
// 1. Direct export (preferred for fields)
import { jobFields, jobStatusValidator } from './schema'
// 2. Via schema object
import schema from './schema'

const validator = schema.tables.jobs.validator
const statusValidator = validator.fields.status
```

## TypeScript Types from Validators

Use `Infer<typeof validator>` for types:

```typescript
import { Infer } from 'convex/values'

import { jobStatusValidator } from './schema'

type JobStatus = Infer<typeof jobStatusValidator>
// "discovered" | "applied" | "interviewing" | "rejected" | "offer"
```

For objects, use `ObjectType`:

```typescript
import { ObjectType } from 'convex/values'

import { jobFields } from './schema'

type JobData = ObjectType<typeof jobFields>
```

## Pick and Omit Fields

Use JavaScript destructuring:

```typescript
// Pick specific fields
const { title, company } = jobFields
const createArgs = { title, company }

// Omit specific fields (rest operator)
const { status, ...jobWithoutStatus } = jobFields
```

Or use helpers from convex-helpers:

```typescript
import { omit, pick } from 'convex-helpers'

const createArgs = pick(jobFields, ['title', 'company'])
const updateArgs = omit(jobFields, ['userId'])
```

## Partial Validators

For patch operations where all fields are optional:

```typescript
import { partial } from 'convex-helpers/validators'

import schema from './schema'

const jobValidator = schema.tables.jobs.validator

export const update = mutation({
  args: {
    id: v.id('jobs'),
    update: partial(jobValidator),
  },
  handler: async (ctx, { id, update }) => {
    await ctx.db.patch('jobs', id, update)
  },
})
```

## System Fields

To include `_id` and `_creationTime` in validators:

```typescript
import { withSystemFields } from 'convex-helpers/validators'

const fullJobValidator = withSystemFields('jobs', jobFields)
```

Or use `doc()` for full document validation:

```typescript
import { doc } from 'convex-helpers/validators'

export const processJob = mutation({
  args: { job: doc(schema, 'jobs') },
  handler: async (ctx, { job }) => {
    console.log(job._id, job.title)
  },
})
```

## Type-Safe v.id

Use `typedV` for compile-time table name checking:

```typescript
// convex/schema.ts
import { typedV } from "convex-helpers/validators";

const schema = defineSchema({ ... });
export const vv = typedV(schema);

// convex/jobs.ts
import { vv } from "./schema";

export const get = query({
  args: { id: vv.id("jobs") },  // Type error if table name wrong
  returns: vv.doc("jobs"),
  handler: async (ctx, { id }) => ctx.db.get("jobs", id),
});
```

## Helper Function Types

For shared helper functions, derive types from validators:

```typescript
import { Infer } from 'convex/values'

import { QueryCtx } from './_generated/server'

const findJobArgs = v.object({
  userId: v.string(),
  status: jobStatusValidator,
})

async function findJob(ctx: QueryCtx, args: Infer<typeof findJobArgs>) {
  return ctx.db
    .query('jobs')
    .withIndex('by_user_status', (q) =>
      q.eq('userId', args.userId).eq('status', args.status),
    )
    .first()
}
```

## Built-in Types

Use generated types for documents:

```typescript
import { Doc, Id } from './_generated/dataModel'

type Job = Doc<'jobs'>
type JobId = Id<'jobs'>
```

With TypeScript utilities:

```typescript
import { WithoutSystemFields } from 'convex/server'

type JobInput = WithoutSystemFields<Doc<'jobs'>>
type JobSummary = Pick<Doc<'jobs'>, 'title' | 'company'>
```

## Quick Reference

| Need                    | Use                             |
| ----------------------- | ------------------------------- |
| Type from validator     | `Infer<typeof validator>`       |
| Object type from fields | `ObjectType<typeof fields>`     |
| Pick fields             | Destructuring or `pick()`       |
| Omit fields             | Rest operator or `omit()`       |
| All fields optional     | `partial(validator)`            |
| Include system fields   | `withSystemFields()` or `doc()` |
| Type-safe table IDs     | `typedV(schema).id("table")`    |
