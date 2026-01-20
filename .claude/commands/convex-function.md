---
description: Create a new Convex query, mutation, or action. Use when you need to "add a query", "create a mutation", or "new convex function".
argument-hint: "<type> <name> - e.g., 'query getContentEntry'"
allowed-tools: Read, Glob, Grep, Edit, Write
---

# Create Convex Function

Create: $ARGUMENTS

## Function Type Selection

| Type | Use When | Example |
|------|----------|---------|
| `query` | Reading data, no side effects | `getContentEntry`, `listByType` |
| `mutation` | Writing data, database changes | `createEntry`, `publishEntry` |
| `action` | External APIs, file storage, non-transactional | `generateThumbnail`, `sendWebhook` |
| `internalQuery` | Called only by other functions | `_getEntryWithRelations` |
| `internalMutation` | Internal writes, scheduled jobs | `_cleanupExpiredDrafts` |

## Steps

1. Read `src/component/schema.ts` for validators
2. Check `src/component/lib/` for existing helpers
3. Apply patterns from `convex-patterns` skill:
   - Extract business logic to `src/component/lib/` as helper functions
   - Keep public handlers thin (authorization + delegation)
   - Add `returns` validator
   - **Component Note**: Cannot use `ctx.auth` - pass user context as function arguments
4. Verify: `npx convex codegen --component-dir ./src/component`

## Validation Checklist

- [ ] Added `args` validator for all parameters
- [ ] Added `returns` validator matching return type
- [ ] Used `v.null()` for void/null returns
- [ ] No `ctx.auth` usage (component constraint)
- [ ] User context passed as argument if needed
