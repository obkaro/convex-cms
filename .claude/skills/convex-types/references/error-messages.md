# Common TS2589 Error Messages and Fixes

<role>
This reference serves as an error message decoder and diagnostic guide. Use it when you have a specific TS2589 error and need to quickly identify the root cause and apply the correct fix.
</role>

<usage_context>
**When to use this guide:**

- User has active TS2589 compilation error in terminal
- Need to decode cryptic TypeScript error message
- Want immediate fix without reading full principles
- Debugging regression after code changes

**What this guide provides:**

- Error message → root cause mapping
- Location-based diagnosis (schema vs functions vs types)
- Step-by-step fix instructions with reasoning
- Prevention strategies

**Don't use this for:**

- Understanding fundamental principles (use 12-principles.md)
- Complex refactoring strategies (use refactoring-guide.md)
- Recognizing patterns in existing code (use anti-patterns.md)
  </usage_context>

---

## 🔍 Error Message Decoder

<error_decoder>
**Quick Matcher: Copy your error message and match against these patterns**

| If error says...                         | And it's in...                 | Root Cause              | Jump To   |
| ---------------------------------------- | ------------------------------ | ----------------------- | --------- |
| "Type instantiation is excessively deep" | `schema.ts` near `defineTable` | Deep object nesting     | Pattern 1 |
| "Type instantiation is excessively deep" | `schema.ts` with union         | Large union type        | Pattern 4 |
| "Type instantiation is excessively deep" | Function return statement      | Missing return type     | Pattern 3 |
| "Type instantiation is excessively deep" | `.then()` or `.map()` chain    | Complex inference chain | Pattern 5 |
| "Type instantiation is excessively deep" | With `extends ? :`             | Conditional type        | Pattern 6 |
| "Type instantiation is excessively deep" | Type references itself         | Recursive type          | Pattern 7 |
| "Type instantiation is excessively deep" | `Record<string, Record<...>>`  | Nested Record types     | Pattern 8 |

**Visual Quick Check:**

```
Error in schema.ts + see `v.object({ ... v.object({ ... })})`? → Pattern 1
Error in types.ts + see `type A = "a" | "b" | ... | "h"`? → Pattern 4
Error in function + no `: Promise<Type>` annotation? → Pattern 3
```

</error_decoder>

---

## 📋 Error Patterns (By Severity)

<pattern id="1" severity="Critical" file_type="schema.ts">
### Pattern 1: Deep Schema Nesting

**Error Message:**

```
TS2589: Type instantiation is excessively deep and possibly infinite.
  at defineTable(...)
```

**Why TypeScript Fails:**
Each `v.object()` nesting level multiplies type instantiation depth:

- 1 level: N field type checks
- 2 levels: N × M field type checks
- 3 levels: N × M × O field type checks
- **4 levels: Exceeds TypeScript's ~50 instantiation limit → TS2589**

With just 5 fields per level: 5^4 = **625 type instantiations** for one table access.

**Visual Recognition:**

```typescript
// Count opening braces from defineTable
defineTable({           // Level 1
  profile: v.object({   // Level 2
    settings: v.object({  // Level 3
      privacy: v.object({ // Level 4 → TS2589!
        ...
      })
    })
  })
})
```

<diagnosis>
```xml
<thinking>
Error in schema.ts at defineTable → check object nesting depth

Step 1: Count nesting levels

- Start from defineTable(...
- Count each v.object({ as +1 level
- If ≥4 levels → this is the cause

Step 2: Identify which table

- Error points to specific defineTable call
- That table has the violation

Step 3: Choose fix strategy

- If nested data is independent → Strategy A: Separate tables
- If nested data is cohesive → Strategy B: Flatten with prefixes
- If need exact structure for external API → Strategy C: Use JSON field
  </thinking>

````
</diagnosis>

**Fix Options:**

<fix_option id="A" label="Separate Tables (Recommended)" difficulty="Medium" performance="Best">
**How:**
Extract nested objects into separate tables linked by IDs.

**Trade-offs:**
- ✅ **Pros:** Best performance, no TS2589, maintains relationships, queryable
- ⚠️ **Cons:** Requires joins (ctx.db.get per relation), more schema complexity
- 📊 **Performance:** Fastest queries (indexed ID lookups)

**When to use:** Nested data represents separate entities (user → profile → settings)

```typescript
// Before (TS2589)
users: defineTable({
  name: v.string(),
  profile: v.object({
    bio: v.string(),
    settings: v.object({
      theme: v.string(),
      privacy: v.object({
        showEmail: v.boolean()
      })
    })
  })
}),

// After (Fixed)
users: defineTable({
  name: v.string(),
  profileId: v.id("profiles")
}),
profiles: defineTable({
  bio: v.string(),
  settingsId: v.id("settings")
}),
settings: defineTable({
  theme: v.string(),
  showEmail: v.boolean()  // Flattened privacy settings
})
````

</fix_option>

<fix_option id="B" label="Flatten with Prefixes" difficulty="Easy" performance="Good">
**How:**
Remove nesting by using prefixed field names.

**Trade-offs:**

- ✅ **Pros:** Simplest fix, fastest queries (single table), no joins needed
- ⚠️ **Cons:** Long field names, loses semantic grouping, harder to maintain
- 📊 **Performance:** Fastest (single table scan, no joins)

**When to use:** Nested data is tightly coupled, rarely queried independently

```typescript
// Before (TS2589)
users: defineTable({
  profile: v.object({
    settings: v.object({
      privacy: v.object({
        showEmail: v.boolean()
      })
    })
  })
}),

// After (Fixed)
users: defineTable({
  profile_bio: v.string(),
  settings_theme: v.string(),
  privacy_showEmail: v.boolean()  // Flattened to 1 level
})
```

</fix_option>

<fix_option id="C" label="JSON Field (Escape Hatch)" difficulty="Easy" performance="Poor">
**How:**
Store nested structure as JSON string (untyped).

**Trade-offs:**

- ✅ **Pros:** Preserves exact structure, no schema changes
- ❌ **Cons:** Loses type safety, not queryable, requires manual serialization
- 📊 **Performance:** Okay for reads, bad for filtered queries

**When to use:** External API contracts require specific shape, data rarely queried

```typescript
// Before (TS2589)
users: defineTable({
  profile: v.object({
    settings: v.object({...})  // Complex nesting
  })
}),

// After (Escape Hatch)
users: defineTable({
  profileJson: v.string()  // Stored as JSON, no type safety
})
```

**⚠️ Warning:** This loses Convex's type safety. Only use if structure is fixed by external requirements.
</fix_option>

**Validation:**

```bash
# Before: Error
npx tsc --noEmit
# → TS2589 at schema.ts:42

# After fix: Clean
npx tsc --noEmit
# → No errors

# Verify runtime
npx convex dev
# → Schema pushed successfully
```

**Principle:** Violates Principle 1 (≤3 levels)
**Severity:** Critical (blocks compilation)
</pattern>

---

<pattern id="2" severity="High" file_type="schema.ts, types.ts">
### Pattern 4: Large Union Types

**Error Message:**

```
TS2589: Type instantiation is excessively deep and possibly infinite.
  at type Status = "..." | "..." | ...
```

**Why TypeScript Fails:**
Each union member creates a type branch. TypeScript must:

1. Instantiate a type for each member
2. Check assignability against EACH member on every access
3. With >5 members: Exponential combinations in nested contexts

Example: `Status | UserStatus` with 7 members each = 7 × 7 = **49 type checks per usage**.

**Visual Recognition:**

```typescript
// Count | characters
type Status =
  | 'pending'
  | 'processing'
  | 'validating'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'archived' // 7 members → TS2589
```

<diagnosis>
```xml
<thinking>
Error in types.ts at union type → check member count

Step 1: Count union members

- Count | characters + 1
- If >5 → likely cause

Step 2: Analyze semantic groups

- Are members conceptually related?
- Can they be categorized (active vs final, error vs success)?

Step 3: Choose fix strategy

- If clear categories exist → Strategy A: Categorize
- If need discrimination → Strategy B: Discriminated union object
- If small overlap → Strategy C: Split by domain
  </thinking>

````
</diagnosis>

**Fix Options:**

<fix_option id="A" label="Categorize into Smaller Unions" difficulty="Easy" performance="Best">
**How:**
Group related members into separate unions, compose with boolean flags.

**Trade-offs:**
- ✅ **Pros:** Maintains type safety, clearer semantics, no TS2589
- ⚠️ **Cons:** Requires additional field (e.g., `archived: boolean`)
- 📊 **Performance:** Same as before

**When to use:** Members have natural semantic groups

```typescript
// Before (TS2589)
type Status = "pending" | "processing" | "validating" |
              "approved" | "rejected" | "cancelled" | "archived";  // 7 members

// After (Fixed)
type ActiveStatus = "pending" | "processing" | "validating";  // 3 members
type FinalStatus = "approved" | "rejected" | "cancelled";     // 3 members

type Status = {
  state: ActiveStatus | FinalStatus;  // Max 6 members total
  archived: boolean;  // Separate flag instead of 7th member
};
````

</fix_option>

<fix_option id="B" label="Discriminated Union Object" difficulty="Medium" performance="Good">
**How:**
Replace string union with object containing discriminator field.

**Trade-offs:**

- ✅ **Pros:** TypeScript narrows types automatically, extensible, no TS2589
- ⚠️ **Cons:** More verbose access (`status.type` vs `status`)
- 📊 **Performance:** Same (one extra field)

**When to use:** Need exhaustive switch or type narrowing

```typescript
// Before (TS2589)
type Status = "pending" | "processing" | "validating" | "approved" | ...;

// After (Fixed)
type Status =
  | { type: "active"; stage: "pending" | "processing" | "validating" }
  | { type: "final"; result: "approved" | "rejected" | "cancelled" }
  | { type: "archived" };

// Usage with automatic narrowing
function handle(status: Status) {
  if (status.type === "active") {
    status.stage;  // TypeScript knows it's active
  }
}
```

</fix_option>

**Validation:**

```bash
npx tsc --noEmit  # Should be clean
```

**Principle:** Violates Principle 2 (≤5 union members)
**Severity:** High (blocks compilation)
</pattern>

---

<pattern id="3" severity="High" file_type="functions.ts">
### Pattern 3: Missing Return Type

**Error Message:**

```
TS2589: Type instantiation is excessively deep and possibly infinite.
  at handler: async (ctx, args) => { return ... }
```

**Why TypeScript Fails:**
Without explicit return type, TypeScript must:

1. Infer type from all return statements
2. If function is complex: Trace through all branches
3. If returned data is nested: Infer nested structure
4. **Result:** Inference chain exceeds depth limit → TS2589

**Visual Recognition:**

```typescript
// No `: Promise<Type>` annotation
export const myFunction = query({
  handler: async (ctx, args) => {
    // ← No return type
    const data = await complexQuery()
    return transformData(data) // TypeScript infers from here
  },
})
```

<diagnosis>
```xml
<thinking>
Error in function at handler → check for explicit return type

Step 1: Look for `: Promise<Type>` after `async (ctx, args)`

- If missing → this is the cause

Step 2: Determine return structure

- What does the function return?
- Is it simple (string, number) or complex (nested object)?

Step 3: Choose fix strategy

- If return is simple → Strategy A: Inline annotation
- If return is complex → Strategy B: Extract to types.ts
- If return varies by condition → Strategy C: Union return type
  </thinking>

````
</diagnosis>

**Fix Options:**

<fix_option id="A" label="Inline Type Annotation" difficulty="Easy" performance="Best">
**How:**
Add `: Promise<Type>` directly to handler.

**Trade-offs:**
- ✅ **Pros:** Simplest fix, immediate, no new files
- ⚠️ **Cons:** Type not reusable, clutters function signature if complex
- 📊 **Performance:** No impact

**When to use:** Return type is simple (primitive, array of primitives, single-level object)

```typescript
// Before (TS2589)
export const getUser = query({
  handler: async (ctx, args) => {  // No return type
    return await ctx.db.get(args.id);
  }
});

// After (Fixed)
export const getUser = query({
  handler: async (ctx, args): Promise<{ id: string; name: string }> => {
    return await ctx.db.get(args.id);
  }
});
````

</fix_option>

<fix_option id="B" label="Extract to types.ts (Recommended)" difficulty="Medium" performance="Best">
**How:**
Define return type in `types.ts`, import and use.

**Trade-offs:**

- ✅ **Pros:** Reusable, maintainable, clear separation of concerns
- ⚠️ **Cons:** Requires separate file, slightly more setup
- 📊 **Performance:** No impact

**When to use:** Return type is complex or used in multiple functions

```typescript
// functions.ts
import { UserData } from './types'

// types.ts
export type UserData = {
  id: Id<'users'>
  name: string
  email: string
}

export const getUser = query({
  handler: async (ctx, args): Promise<UserData> => {
    return await ctx.db.get(args.id)
  },
})
```

</fix_option>

**Principle:** Violates Principle 5 (explicit return types)
**Severity:** High (blocks compilation)
</pattern>

---

<pattern id="5" severity="Medium" file_type="functions.ts">
### Pattern 5: Complex Inference Chain

**Error Message:**

```
TS2589: Type instantiation is excessively deep and possibly infinite.
  at .then(items => items.map(...).filter(...))
```

**Why TypeScript Fails:**
Chained transformations require TypeScript to:

1. Infer type after `.query()` → Type A
2. Infer type after `.map()` → Type B (depends on A)
3. Infer type after `.filter()` → Type C (depends on B)
4. **Each step multiplies inference depth → TS2589**

**Visual Recognition:**

```typescript
// Multiple .then() or .map().filter() chains
const result = await ctx.db.query("table")
  .collect()
  .then(items => items.map(...))
  .then(mapped => mapped.filter(...));  // ← TS2589 here
```

<diagnosis>
```xml
<thinking>
Error at method chain → check for multi-step inference

Step 1: Count transformation steps

- .then(), .map(), .filter(), .reduce() each add inference depth
- If >2 chained → likely cause

Step 2: Identify intermediate types

- What type is returned by each step?

Step 3: Fix strategy

- Strategy A: Break into separate variables with explicit types
  </thinking>

````
</diagnosis>

**Fix:**

<fix_option id="A" label="Break into Explicit Variables" difficulty="Easy" performance="Best">
**How:**
Assign each transformation step to a variable with explicit type.

**Trade-offs:**
- ✅ **Pros:** Clear, debuggable, no inference depth, easier to test
- ⚠️ **Cons:** More verbose (3 lines vs 1 chain)
- 📊 **Performance:** Identical (same operations)

```typescript
// Before (TS2589)
const result = await ctx.db.query("items")
  .collect()
  .then(items => items.map(i => ({ ...i, computed: i.value * 2 })))
  .then(mapped => mapped.filter(i => i.computed > 10));

// After (Fixed)
const items: Item[] = await ctx.db.query("items").collect();
const mapped: ComputedItem[] = items.map(i => ({ ...i, computed: i.value * 2 }));
const filtered: ComputedItem[] = mapped.filter(i => i.computed > 10);
````

</fix_option>

**Principle:** Violates Principle 5 (explicit types over inference)
**Severity:** Medium (blocks compilation, easy fix)
</pattern>

---

<pattern id="6" severity="High" file_type="types.ts">
### Pattern 6: Conditional Types

**Error Message:**

```
TS2589: Type instantiation is excessively deep and possibly infinite.
  at type Unwrap<T> = T extends Promise<infer U> ? U : T;
```

**Why TypeScript Fails:**
Conditional types (`T extends X ? Y : Z`) cause TypeScript to:

1. Evaluate condition for each usage
2. Recursively instantiate both branches
3. In Convex schemas: Each property access re-evaluates condition
4. **Exponential evaluations → TS2589**

**Fix:**

<fix_option id="A" label="Replace with Explicit Types" difficulty="Easy" performance="Best">
**How:**
Define each case separately, don't use conditional.

```typescript
// Before (TS2589)
type Unwrap<T> = T extends Promise<infer U> ? U : T
type Result = Unwrap<Promise<User>>

// After (Fixed)
type UnwrappedUser = User // Just define what you need explicitly
```

**Trade-offs:**

- ✅ **Pros:** No TS2589, clear types
- ⚠️ **Cons:** Less "clever," need explicit types for each case
  </fix_option>

**Principle:** Violates Principle 3 (no conditional types)
**Severity:** High (blocks compilation)
</pattern>

---

<pattern id="7" severity="Critical" file_type="types.ts, schema.ts">
### Pattern 7: Recursive Types

**Error Message:**

```
TS2589: Type instantiation is excessively deep and possibly infinite.
  at type Tree = { value: string; children: Tree[] };
```

**Why TypeScript Fails:**
Self-referencing types cause infinite type instantiation:

```
Tree → children: Tree[] → Tree → children: Tree[] → Tree → ...
```

TypeScript hits depth limit trying to fully resolve the type.

**Fix Options:**

<fix_option id="A" label="ID References (Recommended)" difficulty="Medium" performance="Best">
**How:**
Store IDs instead of nested objects, query relationships separately.

**Trade-offs:**

- ✅ **Pros:** No TS2589, queryable, standard relational pattern
- ⚠️ **Cons:** Requires separate queries for children
- 📊 **Performance:** Excellent with proper indexing

```typescript
// Before (TS2589)
type Tree = {
  value: string
  children: Tree[] // Recursive!
}

// After (Fixed)
type TreeNode = {
  id: Id<'tree_nodes'>
  value: string
  parentId: Id<'tree_nodes'> | null
  childIds: Id<'tree_nodes'>[] // IDs, not objects
}
```

</fix_option>

<fix_option id="B" label="Explicit Depth Limit" difficulty="Easy" performance="Poor">
**How:**
Manually define nesting levels (max 3).

**Trade-offs:**

- ✅ **Pros:** Preserves nested structure
- ❌ **Cons:** Hard depth limit, not scalable, still complex types
- 📊 **Performance:** Okay for shallow trees

```typescript
// After (Depth-Limited)
type TreeNode = {
  value: string
  children?: {
    value: string
    children?: {
      value: string
    }[] // Max 3 levels
  }[]
}
```

</fix_option>

**Principle:** Violates Principle 8 (no recursive types)
**Severity:** Critical (blocks compilation)
</pattern>

---

<pattern id="8" severity="High" file_type="types.ts">
### Pattern 8: Nested Record Types

**Error Message:**

```
TS2589: Type instantiation is excessively deep and possibly infinite.
  at type Config = Record<string, Record<string, Record<string, any>>>;
```

**Why TypeScript Fails:**
Each `Record<>` nesting level creates index signature that TypeScript must:

1. Validate for every property access
2. Recursively resolve inner Record types
3. With 3+ levels: Exceeds instantiation depth → TS2589

**Fix:**

<fix_option id="A" label="Flatten Record Nesting" difficulty="Easy" performance="Best">
**How:**
Use explicit object type with max 2 levels of index signatures.

```typescript
// Before (TS2589)
type Config = Record<string, Record<string, Record<string, any>>> // 3 levels

// After (Fixed)
type Config = {
  [category: string]: {
    [key: string]: unknown // Max 2 levels
  }
}

// Or even better (most explicit)
type ConfigEntry = {
  category: string
  key: string
  value: unknown
}
type Config = ConfigEntry[] // Flat array
```

</fix_option>

**Principle:** Violates Principle 10 (avoid deep Record nesting)
**Severity:** High (blocks compilation)
</pattern>

---

## 🗺️ Diagnosis by Error Location

<location_guide>

### If error is in `convex/schema.ts`:

<thinking>
Schema file → most likely causes:
1. Deep object nesting (Principle 1)
2. Large union types (Principle 2)
3. Too many table fields (Principle 6)

Quick checks:

- Count v.object nesting levels (should be ≤3)
- Count union members (should be ≤5)
- Count fields per table (should be ≤20)
  </thinking>

**First Actions:**

```bash
# Run schema audit
python scripts/audit_schema.py convex/schema.ts

# Look for
grep -n "v.object({" convex/schema.ts  # Count nesting
grep -n "v.union(" convex/schema.ts     # Check union sizes
```

**Most Likely Patterns:** Pattern 1 (deep nesting), Pattern 4 (unions)

---

### If error is in `convex/functions.ts` or similar:

<thinking>
Function file → most likely causes:
1. Missing return types (Principle 5)
2. Inline type definitions (Principle 4)
3. Complex inference chains (Principle 5)
4. Complex generic usage (Principle 9)

Quick checks:

- Search for `handler: async (ctx, args) => {` without `: Promise<Type>`
- Look for inline object type definitions
- Check for .then().then() chains
  </thinking>

**First Actions:**

```bash
# Check for missing return types
grep -n "handler: async" convex/functions.ts | grep -v "Promise<"

# Check complexity
python scripts/check_complexity.py convex/functions.ts
```

**Most Likely Patterns:** Pattern 3 (missing return types), Pattern 5 (inference chains)

---

### If error is in `convex/types.ts`:

<thinking>
Types file → most likely causes:
1. Large union types (Principle 2)
2. Conditional types (Principle 3)
3. Recursive types (Principle 8)
4. Complex generic constraints (Principle 9)

Quick checks:

- Count | characters in type definitions
- Search for `extends ? :`
- Look for self-referencing types
  </thinking>

**First Actions:**

```bash
# Find large unions
grep -o "|" convex/types.ts | wc -l

# Find conditional types
grep -n "extends.*?" convex/types.ts

# Find potential recursion
grep -n "type.*=.*{" convex/types.ts  # Then manually check for self-refs
```

**Most Likely Patterns:** Pattern 4 (large unions), Pattern 6 (conditional types), Pattern 7 (recursive)
</location_guide>

---

## 🔄 Complete Debugging Workflow

<workflow>
When you encounter a TS2589 error, follow this systematic approach:

### Step 1: Capture Error Details

```bash
# Get full error output
npx tsc --noEmit 2>&1 | tee typescript-errors.txt

# Look for:
# - Exact file path
# - Line number
# - Context (function name, type name, etc.)
```

<thinking>
From error message, identify:
1. **File type:** schema.ts, functions.ts, types.ts, or other?
2. **Code construct:** defineTable, handler, type definition, or transformation?
3. **Error context:** What code is around the error line?

This determines which pattern to investigate first.
</thinking>

### Step 2: Quick Validation

```bash
# Run quick check on the specific file
python scripts/quick_validate.py <file-with-error>

# This checks:
# - Object nesting depth
# - Union sizes
# - Missing return types
# - Common violations
```

### Step 3: Match to Pattern

Use the Error Message Decoder table at the top of this document:

- Match error location + context → Pattern number
- Jump to that pattern section
- Read "Why TypeScript Fails" to understand root cause

### Step 4: Choose Fix Strategy

Each pattern provides multiple fix options with trade-offs:

<thinking>
For each fix option, consider:
1. **Difficulty:** How much code needs to change?
2. **Performance:** Does it affect query speed or size?
3. **Maintainability:** Is it clearer or more complex?
4. **Constraints:** Do external APIs require specific structure?

Choose the fix that best balances these factors for your context.
</thinking>

### Step 5: Apply Fix and Verify

```bash
# After making changes
npx tsc --noEmit

# Should see:
# - No TS2589 errors (success!)
# - OR different error at different location (another violation to fix)

# Also verify runtime
npx convex dev
# → Schema should push without errors
```

### Step 6: Prevent Recurrence

Add to pre-commit hooks:

```bash
# .git/hooks/pre-commit
#!/bin/bash
python scripts/quick_validate.py convex/**/*.ts
if [ $? -ne 0 ]; then
  echo "❌ TS2589 violations detected. Fix before committing."
  exit 1
fi
```

</workflow>

---

## 🛡️ Prevention Strategies

<prevention>
### Before Writing Code

**Design Phase Checklist:**

- [ ] Schema design: Plan to keep objects ≤3 levels deep
- [ ] Union types: Group members semantically to stay ≤5
- [ ] Tree structures: Plan to use ID references, not recursive types
- [ ] Type reuse: Create types.ts early for shared types

**Why this matters:**
Refactoring to fix TS2589 after writing code is 10x more effort than designing correctly upfront.

### While Writing Code

**Live Coding Checklist:**

- [ ] Add `: Promise<Type>` immediately when writing functions
- [ ] Extract types to types.ts as soon as you use them twice
- [ ] Run `npx tsc --noEmit` every 10 minutes
- [ ] If IntelliSense slows down → likely approaching TS2589

**Why this matters:**
Immediate feedback prevents compounding violations that are harder to untangle later.

### Before Committing

**Pre-Commit Checklist:**

```bash
# Run full audit
python scripts/audit_schema.py convex/schema.ts
python scripts/check_complexity.py convex/**/*.ts

# TypeScript clean?
npx tsc --noEmit

# All good?
git commit -m "..."
```

**Why this matters:**
Catching violations before they reach main branch prevents blocking other developers.

### In Code Review

**Reviewer Checklist:**

- [ ] All functions have explicit return types?
- [ ] No inline type definitions (should be in types.ts)?
- [ ] Schema changes keep nesting ≤3 levels?
- [ ] New union types have ≤5 members?
- [ ] No conditional or recursive types introduced?

**Why this matters:**
Code review is the last gate before merge. Preventing TS2589 here saves everyone time.

### In CI/CD

**GitHub Actions Workflow:**

```yaml
# .github/workflows/ts2589-check.yml
name: TS2589 Prevention
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: python scripts/audit_schema.py convex/schema.ts
      - run: python scripts/check_complexity.py convex/**/*.ts
      - run: npx tsc --noEmit
```

**Why this matters:**
Automated checks provide safety net if manual reviews miss violations.
</prevention>

---

## 📊 Quick Reference Table

| Error Location | Likely Cause    | First Check                        | Quick Fix                           | Pattern                        | Severity |
| -------------- | --------------- | ---------------------------------- | ----------------------------------- | ------------------------------ | -------- | ---- |
| schema.ts      | Deep nesting    | Count `v.object` levels            | Flatten or separate tables          | 1                              | Critical |
| schema.ts      | Large union     | Count union members                | Break into smaller unions           | 4                              | High     |
| schema.ts      | Many fields     | Count table fields                 | Split table or extract to relations | 1                              | Medium   |
| functions.ts   | No return type  | Look for missing `: Promise<Type>` | Add explicit return type            | 3                              | High     |
| functions.ts   | Inline types    | Find inline object definitions     | Extract to types.ts                 | 3                              | Medium   |
| functions.ts   | Inference chain | Count `.then()` or `.map()` chains | Break into explicit variables       | 5                              | Medium   |
| types.ts       | Conditional     | Search for `extends ? :`           | Replace with explicit types         | 6                              | High     |
| types.ts       | Recursive       | Look for self-references           | Use ID references                   | 7                              | Critical |
| types.ts       | Large union     | Count `                            | ` characters                        | Categorize into smaller unions | 4        | High |
| types.ts       | Nested Record   | Count `Record<...>` nesting        | Flatten to 2 levels max             | 8                              | High     |

---

## 🆘 If Error Persists

<troubleshooting>
### After applying fixes, still seeing TS2589?

**Possibility 1: Multiple Violations**
<thinking>
One fix may reveal another violation that was hidden.

Next steps:

1. Re-run audit tools on the same file
2. Check if error moved to different line
3. Apply fix for the new violation
4. Repeat until `npx tsc --noEmit` is clean
   </thinking>

```bash
# Re-audit after each fix
python scripts/audit_schema.py convex/schema.ts
```

**Possibility 2: Violation in Different File**
<thinking>
Your file may be correct, but it imports types from another file that has violations.

Next steps:

1. Check TypeScript error stack trace for import chain
2. Audit imported files
3. Fix violations in dependencies first
   </thinking>

```bash
# Find what your file imports
grep "^import" convex/your-file.ts

# Audit each imported file
python scripts/audit_schema.py <imported-file>
```

**Possibility 3: Convex-Generated Types**
<thinking>
Some TS2589 errors occur at Convex function boundaries (ctx.runQuery, ctx.runMutation) due to Convex's generated wrapper types.

This is a known Convex limitation, not your code's fault.

Next steps:

1. Verify your actual types follow all 12 principles
2. If error is ONLY at ctx.runQuery/runMutation boundary
3. Use @ts-expect-error as pragmatic workaround
   </thinking>

```typescript
// If error is at Convex boundary after fixing your types
// @ts-expect-error - Convex-generated types exceed TS2589 limit
const result = await ctx.runQuery(api.your.function, {...});
```

**See:** convex/ai/codeGen.ts lines 105, 295 for real-world examples
</troubleshooting>

---

## 🔗 Related Resources

- **Understanding principles:** [12-principles.md](./12-principles.md)
- **Refactoring strategies:** [refactoring-guide.md](./refactoring-guide.md)
- **Code pattern recognition:** [anti-patterns.md](./anti-patterns.md)
- **Main skill guide:** [../SKILL.md](../SKILL.md)

---

## ⚠️ Common Mistakes to Avoid

<mistakes>
### Mistake 1: Treating the Symptom, Not the Cause

**What developers do:**

- Add `any` types everywhere
- Use `@ts-ignore` without understanding why
- Suppress errors without fixing code

**Why it fails:**

- Loses type safety (defeats purpose of TypeScript)
- Error may return in different context
- Doesn't address architectural issue

**Correct approach:**

```xml
<thinking>
Ask: WHY is TypeScript failing here?
1. Identify root cause (nesting, unions, inference, etc.)
2. Apply architectural fix (flatten, separate, extract)
3. Verify with `npx tsc --noEmit`

Only use @ts-expect-error for Convex boundary issues (not your code).
</thinking>
```

### Mistake 2: Partial Fixes

**What developers do:**

- Fix one nested object, leave others
- Fix function return type but leave inline types
- Stop after first `npx tsc` success

**Why it fails:**

- Hidden violations will surface later
- Inconsistent code style
- Next developer hits same issues

**Correct approach:**

```bash
# Fix ALL violations in the file
python scripts/audit_schema.py convex/schema.ts  # Find all issues
# Fix each one
npx tsc --noEmit  # Verify clean
```

### Mistake 3: Not Testing After Fixes

**What developers do:**

- Fix TypeScript errors
- Commit immediately without runtime test

**Why it fails:**

- Type changes may break runtime behavior
- Queries may not work with new schema
- Functions may return wrong shape

**Correct approach:**

```bash
# After fixing TS2589
npx tsc --noEmit       # ✅ Types correct
npx convex dev         # ✅ Schema pushes
# Test in browser      # ✅ Functions work
git commit             # Now safe to commit
```

### Mistake 4: Ignoring Severity

**What developers do:**

- Fix easy violations (missing return types)
- Ignore hard violations (deep schema nesting)
- Ship with critical violations unresolved

**Why it fails:**

- Critical violations BLOCK compilation
- Can't ship until fixed
- Wastes time on low-priority fixes first

**Correct approach:**

```xml
<thinking>
Priority order:
1. Critical (Principles 1, 7, 8): Deep nesting, recursive types → Fix FIRST
2. High (Principles 2, 3, 5): Unions, conditionals, return types → Fix SECOND
3. Medium (Principles 4, 6): Inline types, field counts → Fix if time allows

Work from highest severity down.
</thinking>
```

</mistakes>

---

**Last Updated:** 2025-01-24
**Convex Version:** 1.28+
**TypeScript Version:** 5.0+
