# TS2589 Cheat Sheet

<role>
This is your **one-page quick reference** for TS2589 prevention and emergency fixes. Use this when you need instant answers without reading full documentation.
</role>

<usage_context>
**Use this cheat sheet when:**

- User has TS2589 error and needs immediate fix (30 seconds)
- Writing new code and want to check principles quickly
- In code review and need to validate against rules
- Need to remember which script to run for diagnosis

**Escalate to full docs when:**

- Fix from cheat sheet doesn't work → [error-messages.md](./error-messages.md)
- Need to understand WHY a principle exists → [12-principles.md](./12-principles.md)
- Need detailed refactoring strategy → [refactoring-guide.md](./refactoring-guide.md)
- Need to recognize anti-pattern in existing code → [anti-patterns.md](./anti-patterns.md)

**Token Efficiency:**
This cheat sheet is optimized for speed. Read ONLY the section you need:

- Emergency fix? → Jump to "🚨 Emergency Fix Protocol"
- Writing code? → Jump to "✅ Quality Checklist"
- Error diagnosis? → Jump to "🔍 Instant Pattern Matcher"
  </usage_context>

---

## 🚨 Emergency Fix Protocol

<emergency_protocol>
**When user reports TS2589 error:**

```xml
<thinking>
Step 1: Get error location
- Which file? schema.ts, functions.ts, types.ts, other?
- Which line number?
- What code is at that line?

Step 2: Match to pattern (use Instant Pattern Matcher below)
- Error + location + code construct → Pattern

Step 3: Apply fix from "⚡ Common Fixes" section
- Copy the "✅ After" code pattern
- Adapt to user's specific case

Step 4: Verify
- Run: npx tsc --noEmit
- If still failing: Escalate to error-messages.md
</thinking>
```

**30-Second Diagnosis Flow:**

```
See TS2589? → Check file type:
├─ schema.ts + v.object nested 4+ levels? → Fix 1: Deep Nesting
├─ schema.ts + long union (6+ members)? → Fix 2: Large Union
├─ functions.ts + no `: Promise<Type>`? → Fix 3: Missing Return Type
├─ types.ts + `type A = { ... children: A[] }`? → Fix 4: Recursive Type
└─ Still unclear? → Run: python scripts/quick_validate.py <file>
```

</emergency_protocol>

---

## 🔍 Instant Pattern Matcher

<pattern_matcher>
**Copy your error message, scan this table for match:**

| Error In     | See This Code                                      | Root Cause          | Fix # | Severity    |
| ------------ | -------------------------------------------------- | ------------------- | ----- | ----------- |
| schema.ts    | `v.object({ ... v.object({ ... v.object({`         | 4+ nesting levels   | 1     | 🔴 Critical |
| schema.ts    | `v.union(...)` with `\|` count >5                  | Large union         | 2     | 🔴 Critical |
| schema.ts    | defineTable with 21+ fields                        | Too many fields     | 6     | 🟡 High     |
| functions.ts | `handler: async (ctx, args) => {` (no `: Promise`) | Missing return type | 3     | 🟡 High     |
| functions.ts | `.then(...).then(...).then(...)`                   | Inference chain     | 5     | 🟡 High     |
| types.ts     | `type A = "a" \| "b" \| ... \| "g"` (6+ members)   | Large union         | 2     | 🔴 Critical |
| types.ts     | `T extends X ? Y : Z`                              | Conditional type    | 3     | 🟡 High     |
| types.ts     | `type Tree = { children: Tree[] }`                 | Recursive type      | 4     | 🔴 Critical |
| types.ts     | `Record<string, Record<string, ...>>`              | Nested Record       | 8     | 🟡 High     |

**Visual Quick Scan:**

- Count `{` from defineTable → If >3, it's Fix #1
- Count `|` in type → If >5, it's Fix #2
- See function without `: Promise<...>` → It's Fix #3
- See type name inside its own definition → It's Fix #4
  </pattern_matcher>

---

## ⚡ Common Fixes (Copy-Paste Ready)

<fixes>
### Fix 1: Deep Nesting (🔴 Critical)

**Why TS2589:** 4+ levels = N×M×O type instantiations → exceeds TypeScript's ~50 limit

<fix_options>
**Option A: Separate Tables (Best)**

```typescript
// ❌ Before (4 levels → TS2589)
users: defineTable({
  profile: v.object({
    settings: v.object({
      privacy: v.object({ showEmail: v.boolean() })  // Level 4!
    })
  })
})

// ✅ After (1 level each table)
users: defineTable({
  profileId: v.id("profiles")  // ← ID reference
}),
profiles: defineTable({
  settingsId: v.id("settings")
}),
settings: defineTable({
  showEmail: v.boolean()  // ← Flattened
})
```

**Trade-offs:** ✅ Best performance, queryable ⚠️ Requires joins (ctx.db.get per ID)

**Option B: Flatten with Prefixes (Fastest)**

```typescript
// ✅ After (1 level, no joins)
users: defineTable({
  profile_bio: v.string(),
  settings_theme: v.string(),
  privacy_showEmail: v.boolean(), // ← Prefix instead of nesting
})
```

**Trade-offs:** ✅ Fastest queries (single table) ⚠️ Long field names, less semantic
</fix_options>

---

### Fix 2: Large Union (🔴 Critical)

**Why TS2589:** 6+ members = Exponential type checks on every access

<fix_options>
**Option A: Categorize (Recommended)**

```typescript
// ❌ Before (7 members → TS2589)
type Status =
  | 'pending'
  | 'processing'
  | 'validating'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'archived'

// ✅ After (max 3 per union)
type ActiveStatus = 'pending' | 'processing' | 'validating'
type FinalStatus = 'approved' | 'rejected' | 'cancelled'
type Status = {
  state: ActiveStatus | FinalStatus // Max 6 total
  archived: boolean // Separate flag
}
```

**Trade-offs:** ✅ Clear semantics, type-safe ⚠️ Requires extra field

**Option B: Discriminated Union (Best for switches)**

```typescript
// ✅ After (discriminated)
type Status =
  | { type: 'active'; stage: 'pending' | 'processing' }
  | { type: 'final'; result: 'approved' | 'rejected' }
  | { type: 'archived' }

// Automatic narrowing in switches!
```

**Trade-offs:** ✅ Exhaustiveness checking ⚠️ More verbose (`status.type` vs `status`)
</fix_options>

---

### Fix 3: Missing Return Type (🟡 High)

**Why TS2589:** TypeScript must infer through all branches → depth limit exceeded

```typescript
// ❌ Before (inferred → TS2589)
export const getUser = query({
  handler: async (ctx, args) => {
    // ← No return type
    return await ctx.db.get(args.id)
  },
})

// ✅ After (explicit)
export const getUser = query({
  handler: async (ctx, args): Promise<User> => {
    // ← Explicit!
    return await ctx.db.get(args.id)
  },
})
```

**Trade-offs:** ✅ No TS2589, self-documenting ⚠️ Need to define User type in types.ts

**Quick Rule:** ALWAYS add `: Promise<Type>` to every Convex handler

---

### Fix 4: Recursive Type (🔴 Critical)

**Why TS2589:** Self-reference = Infinite type instantiation (Tree → Tree → Tree → ...)

```typescript
// ❌ Before (recursive → TS2589)
type Tree = {
  value: string
  children: Tree[] // ← References itself!
}

// ✅ After (ID references)
type TreeNode = {
  id: Id<'tree_nodes'>
  value: string
  parentId: Id<'tree_nodes'> | null
  childIds: Id<'tree_nodes'>[] // ← IDs, not objects
}
```

**Trade-offs:** ✅ No TS2589, queryable, scalable ⚠️ Requires separate queries for children

---

### Fix 5: Inference Chain (🟡 High)

**Why TS2589:** Each .then() adds inference depth → exceeds limit

```typescript
// ❌ Before (3 chained inferences → TS2589)
const result = await ctx.db.query("items")
  .collect()
  .then(items => items.map(...))
  .then(mapped => mapped.filter(...));

// ✅ After (explicit types)
const items: Item[] = await ctx.db.query("items").collect();
const mapped: MappedItem[] = items.map(...);
const filtered: MappedItem[] = mapped.filter(...);
```

**Trade-offs:** ✅ Clear, debuggable, no inference depth ⚠️ More verbose (3 lines vs 1)

---

### Fix 6: Too Many Fields (🟡 High)

**Why TS2589:** 20+ fields × complex types = Type instantiation overflow

```typescript
// ❌ Before (25 fields in one table)
users: defineTable({
  field1: v.string(),
  field2: v.string(),
  // ... 23 more fields
})

// ✅ After (split into domains)
users: defineTable({
  name: v.string(),
  email: v.string(),
  profileId: v.id('profiles'), // ← Move profile fields to separate table
  settingsId: v.id('settings'), // ← Move settings fields to separate table
})
```

**Trade-offs:** ✅ Clearer domain separation ⚠️ Requires joins

---

### Fix 7: Conditional Types (🟡 High)

**Why TS2589:** `T extends X ? Y : Z` evaluated on every usage → exponential

```typescript
// ❌ Before (conditional → TS2589)
type Unwrap<T> = T extends Promise<infer U> ? U : T

// ✅ After (explicit)
type UnwrappedUser = User // Just define what you need
```

**Trade-offs:** ✅ No TS2589, clear ⚠️ Less "generic" (need explicit types per case)

---

### Fix 8: Nested Record (🟡 High)

**Why TS2589:** 3+ nested Record levels = Recursive index signature resolution

```typescript
// ❌ Before (3 nested Records → TS2589)
type Config = Record<string, Record<string, Record<string, any>>>

// ✅ After (max 2 levels)
type Config = {
  [category: string]: {
    [key: string]: unknown
  }
}
```

**Trade-offs:** ✅ No TS2589, still flexible ⚠️ One less nesting level
</fixes>

---

## 📋 The 12 Principles (Priority Order)

<principles>
### 🔴 CRITICAL - Fix Immediately (Blocks Compilation)

| #   | Rule                  | Why It Matters                          | Quick Check                              |
| --- | --------------------- | --------------------------------------- | ---------------------------------------- |
| 1   | **Nesting ≤3 levels** | 4 levels = N×M×O×P type instantiations  | Count `{` from defineTable               |
| 2   | **Unions ≤5 members** | 6+ members = Exponential type checks    | Count `\|` in type definition            |
| 8   | **No recursion**      | Self-reference = Infinite instantiation | Look for type name in its own definition |

### 🟡 HIGH - Fix Before Commit

| #   | Rule                  | Why It Matters                              | Quick Check                           |
| --- | --------------------- | ------------------------------------------- | ------------------------------------- |
| 3   | **No conditionals**   | `extends ? :` evaluated on every access     | Search for `extends.*?`               |
| 4   | **Extract types**     | Inline types create inference chains        | All types should be in types.ts       |
| 5   | **Explicit returns**  | Inference through branches = depth overflow | Every handler needs `: Promise<Type>` |
| 6   | **Tables ≤20 fields** | 20+ fields × complex types = overflow       | Count fields in defineTable           |

### 🔵 MEDIUM - Consider Fixing

| #   | Rule                   | Why It Matters                                | Quick Check                    |
| --- | ---------------------- | --------------------------------------------- | ------------------------------ |
| 7   | **Literals not enums** | Enums create extra type layer                 | Use `"a" \| "b"` not `enum`    |
| 9   | **Simple generics**    | `<T extends X extends Y>` = nested resolution | Keep generics simple           |
| 10  | **Sparse Records**     | Deep Record = Recursive index signatures      | Max 2 nested Record levels     |
| 11  | **No mapped types**    | `[K in keyof T]` = Per-key type computation   | Avoid `keyof`, `in` in schemas |

### ⚪ LOW - Optional Improvement

| #   | Rule              | Why It Matters                               | Quick Check                 |
| --- | ----------------- | -------------------------------------------- | --------------------------- |
| 12  | **Split modules** | Large files = More cumulative instantiations | Separate domains into files |

**Remember:** Fix 🔴 Critical first (blocks compilation), then 🟡 High (tech debt), then 🔵 Medium (nice-to-have)
</principles>

---

## 🔄 Workflow Decision Trees

<workflows>
### User Says → You Do

```xml
<thinking>
Match user request to workflow:

"TS2589 error" or "compilation failing"
→ Emergency protocol:
  1. Get error location (file + line)
  2. Match to pattern (Instant Pattern Matcher)
  3. Apply fix (Common Fixes section)
  4. Verify: npx tsc --noEmit

"audit schema" or "check for violations"
→ Diagnostic workflow:
  1. Run: python scripts/audit_schema.py convex/schema.ts
  2. Report violations by severity (🔴 → 🟡 → 🔵)
  3. Apply fixes starting with Critical

"review this function" or "does this look right?"
→ Quick validation:
  1. Check: Has `: Promise<Type>` return?
  2. Check: No inline types?
  3. Check: No .then().then() chains?
  4. If any fail: Apply Fix #3 or #5

"set up prevention" or "add CI checks"
→ Prevention setup:
  1. Copy pre-commit hook from error-messages.md
  2. Copy GitHub Actions workflow
  3. Explain: Runs audit on every commit
</thinking>
```

### Diagnosis Decision Tree

```
Start: Have TS2589 error?
│
├─ YES → What file?
│   ├─ schema.ts → What code?
│   │   ├─ See nested v.object? → Count levels
│   │   │   └─ ≥4 levels? → Fix 1 (Deep Nesting)
│   │   ├─ See v.union? → Count members
│   │   │   └─ >5 members? → Fix 2 (Large Union)
│   │   └─ See 20+ fields? → Fix 6 (Too Many Fields)
│   │
│   ├─ functions.ts → What code?
│   │   ├─ handler without `: Promise`? → Fix 3 (Missing Return)
│   │   └─ .then().then() chain? → Fix 5 (Inference Chain)
│   │
│   └─ types.ts → What code?
│       ├─ See `extends ? :`? → Fix 7 (Conditional)
│       ├─ Type references itself? → Fix 4 (Recursive)
│       ├─ >5 union members? → Fix 2 (Large Union)
│       └─ Nested Record<...>? → Fix 8 (Nested Record)
│
└─ NO → Preventive check
    └─ Run: python scripts/quick_validate.py <file>
        ├─ Exit 0 (pass) → Code is good ✅
        └─ Exit 1 (violations) → See report, apply fixes
```

</workflows>

---

## 🛠️ Scripts Quick Reference

<scripts>
| Command | When to Use | What It Checks | Output |
|---------|-------------|----------------|--------|
| `quick_validate.py <file>` | **Fast check before commit** | Principles 1,2,3,5,8 | Pass/Fail + line numbers |
| `audit_schema.py <file>` | **Full schema audit** | Principles 1,2,3,6,8,11 | Detailed violations + severity |
| `check_complexity.py <file>` | **Deep analysis** | All 12 principles | Complexity scores + recommendations |
| `npx tsc --noEmit` | **Verify fix worked** | TypeScript compilation | Errors or success |

**Exit Codes:**

- 0 = Pass (no violations)
- 1 = Issues found (see output)
- 2 = Script error

**Typical Workflow:**

```bash
# 1. Fast check
python scripts/quick_validate.py convex/schema.ts

# 2. If fails, get details
python scripts/audit_schema.py convex/schema.ts

# 3. Apply fixes from cheat sheet

# 4. Verify
npx tsc --noEmit
```

</scripts>

---

## ✅ Quality Checklist

<checklist>
### Before Committing Code

```xml
<thinking>
Run through this checklist mentally or with quick grep commands:

Critical (🔴) - Must fix:
□ Object nesting ≤3 levels? (grep -c "v.object" - count depth manually)
□ Union members ≤5? (grep -o "|" | wc -l per type)
□ No recursive types? (search for type name inside its definition)

High (🟡) - Should fix:
□ All handlers have `: Promise<Type>`? (grep "handler: async" | grep -v "Promise")
□ Types in types.ts, not inline? (no inline object type definitions)
□ Tables ≤20 fields? (count fields in each defineTable)

Quick validation:
□ Run: python scripts/quick_validate.py on modified files
□ Run: npx tsc --noEmit (must pass!)

If any fail → Apply fixes from ⚡ Common Fixes above
</thinking>
```

**Visual Quick Scan:**

- ✅ Green: See `: Promise<User>` on all handlers
- ✅ Green: See `v.id("table")` instead of nested v.object
- ✅ Green: Types have ≤5 union members
- ❌ Red: See nested `v.object({ v.object({ v.object({` → Fix #1
- ❌ Red: See 6+ `|` in union → Fix #2
- ❌ Red: See handler without `: Promise` → Fix #3
  </checklist>

---

## 🎯 Key Insights

<insights>
### The Core Problem

```
TS2589 = TypeScript can't compute your types in reasonable time
```

**Why?** TypeScript has ~50 type instantiation depth limit.

**What triggers it:**

- Deep nesting: 4+ levels = N×M×O×P instantiations
- Large unions: 6+ members = Exponential type checks
- Recursion: Self-reference = Infinite instantiation
- Inference chains: .then().then() = Cumulative depth

### The Solution Pattern

```
Complex types → Simple types
Nested objects → Flat tables with IDs
Large unions → Categorized smaller unions
Inferred types → Explicit annotations
Recursive types → ID references
```

**Goal:** Type safety WITHOUT type complexity

### When to Use Which Fix

<decision_guide>

```xml
<thinking>
Problem: Deep nesting (4+ levels)
→ Ask: Is nested data independent?
  ├─ YES → Fix 1 Option A (Separate tables)
  └─ NO → Fix 1 Option B (Flatten with prefixes)

Problem: Large union (6+ members)
→ Ask: Are members semantically grouped?
  ├─ YES → Fix 2 Option A (Categorize)
  └─ NO → Fix 2 Option B (Discriminated union)

Problem: Missing return type
→ Always: Fix 3 (Add `: Promise<Type>`)

Problem: Recursive type
→ Always: Fix 4 (Use ID references)

Problem: Inference chain
→ Always: Fix 5 (Break into explicit variables)
</thinking>
```

</decision_guide>
</insights>

---

## 🚫 Common Mistakes (Don't Do This!)

<mistakes>
| ❌ Mistake | Why It Fails | ✅ Instead Do |
|-----------|--------------|--------------|
| Add `any` types | Loses type safety, doesn't fix root cause | Apply proper fix (flatten, separate, etc.) |
| Use `@ts-ignore` | Hides problem, will resurface | Fix architecture, only use for Convex boundaries |
| Fix one violation, ignore others | Multiple violations = multiple errors | Run audit, fix ALL violations |
| Not test after fix | Type change may break runtime | Always: `npx tsc --noEmit` + test in browser |
| Fix easy stuff first | Critical blocks compilation | Fix 🔴 Critical first, then 🟡 High |

**Remember:** `@ts-expect-error` is ONLY for Convex-generated types at function boundaries (ctx.runQuery, ctx.runMutation), NOT for your own types.

**Example of acceptable @ts-expect-error:**

```typescript
// ✅ Acceptable (Convex internal types issue)
// @ts-expect-error - Convex-generated types exceed TS2589 limit
const result = await ctx.runQuery(api.projects.get, {...});

// ❌ NOT acceptable (your types issue)
// @ts-expect-error - TODO: fix this
const user = getUser();  // ← FIX YOUR TYPES INSTEAD
```

</mistakes>

---

## 📚 Resource Navigator

<resources>
**When to read each guide:**

```xml
<thinking>
Current situation → Read this:

"Need instant fix (30 sec)" → THIS CHEAT SHEET
"Fix didn't work, need details" → error-messages.md
"Want to understand WHY principle exists" → 12-principles.md
"Need step-by-step refactoring" → refactoring-guide.md
"Recognize pattern in existing code" → anti-patterns.md
"Set up automation/CI" → error-messages.md (Prevention section)
</thinking>
```

| Guide                         | Purpose                              | Read When                  |
| ----------------------------- | ------------------------------------ | -------------------------- |
| **CHEATSHEET.md** (this file) | Instant reference, emergency fixes   | Always start here          |
| **error-messages.md**         | Decode specific TS2589 errors        | After quick fix fails      |
| **12-principles.md**          | Deep understanding of WHY            | Want to learn reasoning    |
| **refactoring-guide.md**      | Step-by-step complex refactoring     | Large-scale changes needed |
| **anti-patterns.md**          | Pattern recognition in existing code | Code review, audit         |
| **SKILL.md**                  | Main workflow orchestrator           | First time using skill     |

**Progressive Reading Strategy:**

1. Start: Cheat sheet (2 min)
2. If blocked: error-messages.md (5 min)
3. If curious: 12-principles.md (15 min)
4. If refactoring: refactoring-guide.md (20 min)
   </resources>

---

## 📐 File Organization Pattern

<organization>
```
convex/
├── schema.ts           # Tables (≤3 levels, ≤20 fields, ≤5 union members)
├── types.ts            # ALL type definitions (extract from inline)
├── functions.ts        # Queries/mutations (`: Promise<Type>` on all)
└── [domain]/
    ├── queries.ts      # Domain-specific queries
    ├── mutations.ts    # Domain-specific mutations
    └── types.ts        # Domain-specific types
```

**Rules:**

- ✅ Types defined ONCE in types.ts
- ✅ Functions import from types.ts
- ✅ Schema uses v.id() to reference other tables
- ❌ NEVER define types inline in functions
- ❌ NEVER nest objects >3 levels in schema
  </organization>

---

## 🎬 Response Template

<response_template>
**When helping user with TS2589, follow this structure:**

```markdown
## Analysis

<thinking>
Error location: [file]:[line]
Code construct: [defineTable / handler / type definition]
Pattern match: [Fix #X from Instant Pattern Matcher]
Root cause: [Why TypeScript fails]
</thinking>

## Diagnosis

This violates **Principle X: [Name]** (🔴 Critical / 🟡 High / 🔵 Medium)

**Why TS2589:**
[Brief explanation of why TypeScript can't compute this]

## Fix

[Show before/after code from ⚡ Common Fixes]

**Trade-offs:**

- ✅ Pros: [benefits]
- ⚠️ Cons: [drawbacks]

## Verification

Run: `npx tsc --noEmit`
Should see: No errors ✅

## Prevention

To prevent future occurrences:

- [Relevant item from ✅ Quality Checklist]
- Consider setting up pre-commit hook (see error-messages.md)
```

</response_template>

---

**Last Updated:** 2025-01-24
**Target Score:** 90+ (Clarity, Structure, Examples, Reasoning, Context, Actionability)
**Purpose:** One-page quick reference optimized for Claude's fast decision-making
