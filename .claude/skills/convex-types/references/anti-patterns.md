# Common Anti-Patterns That Cause TS2589 in Convex

<role>
This catalog helps you quickly identify and fix common code patterns that cause TS2589 errors. You are using this guide to:
- Recognize anti-patterns from symptoms or code snippets
- Understand WHY each pattern causes TS2589
- Choose the appropriate fix strategy
- Assess impact and prioritize fixes
- Provide concrete refactoring examples
</role>

<usage_context>
**When to use this guide:**

- User shares code and asks "why TS2589?"
- Recognizing patterns during code review
- Need to match code to a known anti-pattern
- Teaching common mistakes to avoid

**How to use:**

1. Check <pattern_matcher> to identify which anti-pattern
2. Read the pattern's <why_antipattern> section
3. Show the <recognition_red_flags>
4. Choose appropriate fix from <fix_options>
5. Explain <impact_analysis>

**Don't:**

- Read all 8 patterns at once (token inefficient)
- Use without explaining WHY it's bad
- Skip the impact assessment
  </usage_context>

---

## Quick Pattern Matcher

<pattern_matcher>
<symptom_to_pattern>
| Symptom | Anti-Pattern | Fix Strategy |
|---------|-------------|--------------|
| Schema with `v.object` 4+ levels deep | Pattern 1: Deep Schema Nesting | Flatten or separate tables |
| Union with 8+ discriminated variants | Pattern 2: Large Union Types | Categorize or split by domain |
| Function return type is `Promise<{ ... 50 lines ... }>` | Pattern 3: Inline Complex Return Types | Extract to types.ts |
| Long `.then().then().then()` chains | Pattern 4: Chained Transformations | Add intermediate typed variables |
| `<T extends U extends V>` in helpers | Pattern 5: Generic Helper Functions | Make specific, non-generic |
| Validator with 30+ fields | Pattern 6: Large Validator Objects | Split by concern |
| `DeepPartial<Awaited<Extract<...>>>` | Pattern 7: Conditional Type Utilities | Use explicit types |
| `A & B & C & D & E & F` | Pattern 8: Intersection Type Chains | Flatten to single type |
</symptom_to_pattern>

<quick_recognition>
**Immediate Red Flags (Visual Scan):**

- Count `{` characters: >3 consecutive levels = Pattern 1
- Count `|` characters in type: >5 = Pattern 2
- Function signature: No `: Promise<TypeName>` = Pattern 3 or 4
- See `extends ?` = Pattern 7
- See `<T extends` = Pattern 5
- Validator spans >30 lines = Pattern 6
- See 4+ `&` symbols = Pattern 8
  </quick_recognition>
  </pattern_matcher>

---

## The 8 Critical Anti-Patterns

### Pattern 1: Deep Schema Nesting

<antipattern id="1" severity="Critical">
<why_antipattern>
**The TypeScript Problem:**
Each nested `v.object()` multiplies type instantiation depth:
- 1 level: 1 instantiation
- 2 levels: N field instantiations
- 3 levels: N × M field instantiations
- 4 levels: N × M × O instantiations → TS2589!

**The Real-World Impact:**
A 4-level nested object with 5 fields per level = 5^4 = 625 type combinations for TypeScript to evaluate. Exceeds instantiation depth limit of ~50.

**Why This Happens:**
Developers naturally model hierarchical data (organization → contact → phone → number), but TypeScript's type system isn't optimized for deep nesting.
</why_antipattern>

<recognition_red_flags>

```typescript
// 🚩 Red Flag Checklist:
defineTable({
  field: v.object({           // Level 1 ← Count
    nested: v.object({        // Level 2 ← Count
      deeper: v.object({      // Level 3 ← Count
        tooDeep: v.object({   // Level 4 ← RED FLAG!
```

**Quick Visual Check:**
Count opening braces `{` from table definition. If >3 levels, it's Pattern 1.

**IDE Signs:**

- Slow autocomplete when accessing nested properties
- TypeScript takes >5 seconds to show errors
- "Type instantiation is excessively deep" on schema.ts
  </recognition_red_flags>

<antipattern_code>

```typescript
// ❌ ANTI-PATTERN: 4 levels of nesting
const schema = defineSchema({
  organizations: defineTable({
    details: v.object({
      // Level 1
      contact: v.object({
        // Level 2
        primary: v.object({
          // Level 3
          phone: v.object({
            // Level 4 ← VIOLATION!
            number: v.string(),
            extension: v.optional(v.string()),
          }),
          email: v.object({
            address: v.string(),
            verified: v.boolean(),
          }),
        }),
      }),
    }),
  }),
})
```

<impact_analysis>

```xml
<thinking>
Impact of this anti-pattern:
1. TypeScript evaluates: organizations → details → contact → primary → phone
   = 5 nested type lookups per property access
2. With 2 fields in phone object + 2 in email = 4 leaf fields
3. Total type instantiations: 4 (levels) × 4 (fields) = 16 per query
4. If used in 10 functions: 16 × 10 = 160 type instantiations
5. Combined with other complexity: easily exceeds depth limit

Symptoms user will see:
- TS2589 error when importing schema
- Slow IDE performance in schema.ts
- Compilation takes minutes instead of seconds
- Random TS2589 in files that use this schema
</thinking>
```

</impact_analysis>
</antipattern_code>

<fix_options>
<fix_option id="A" label="Flatten with Prefixes" difficulty="Easy" performance="Fast">

```typescript
// ✅ FIX A: Flatten with descriptive prefixes
const schema = defineSchema({
  organizations: defineTable({
    contactPhoneNumber: v.string(),
    contactPhoneExtension: v.optional(v.string()),
    contactEmailAddress: v.string(),
    contactEmailVerified: v.boolean(),
  }),
})

// Access: org.contactPhoneNumber
// Type depth: 1 level (immediate property access)
```

**When to use:**

- Small number of nested fields (5-10)
- Data always accessed together
- Simple key-value data

**Trade-offs:**

- ✅ Pros: Simplest fix, fastest queries, no TS2589
- ❌ Cons: Long field names, less semantic grouping
  </fix_option>

<fix_option id="B" label="Normalize to Separate Tables" difficulty="Medium" performance="Slightly slower">

```typescript
// ✅ FIX B: Normalized database design
const schema = defineSchema({
  organizations: defineTable({
    name: v.string(),
  }),
  contacts: defineTable({
    organizationId: v.id('organizations'),
    phoneId: v.id('phones'),
    emailId: v.id('emails'),
  }),
  phones: defineTable({
    number: v.string(),
    extension: v.optional(v.string()),
  }),
  emails: defineTable({
    address: v.string(),
    verified: v.boolean(),
  }),
})

// Access:
// const org = await ctx.db.get(orgId);
// const contact = await ctx.db.get(org.contactId);
// const phone = await ctx.db.get(contact.phoneId);
// Type depth: 1 level per query
```

**When to use:**

- Complex nested data (>10 fields)
- Data may be queried independently
- Represents distinct entities
- Data reused across multiple parents

**Trade-offs:**

- ✅ Pros: Proper normalization, reusable, scalable, no TS2589
- ❌ Cons: Multiple queries, more complex to fetch
  </fix_option>
  </fix_options>

<migration_guide>
**Step-by-step migration (Fix B):**

1. **Create new tables:**

```typescript
// Add phones and emails tables first
```

2. **Migrate data:**

```typescript
// Migration script: Extract nested data to new tables
const orgs = await ctx.db.query('organizations').collect()
for (const org of orgs) {
  const phoneId = await ctx.db.insert('phones', {
    number: org.details.contact.primary.phone.number,
    extension: org.details.contact.primary.phone.extension,
  })
  // Update org with phoneId reference...
}
```

3. **Update queries:**

```typescript
// Before: org.details.contact.primary.phone.number
// After: (await ctx.db.get(org.phoneId)).number
```

4. **Remove nested fields:**

```typescript
// Delete old nested structure from schema
```

5. **Test thoroughly:**

- All queries return correct data
- No TS2589 errors
- Performance acceptable
  </migration_guide>
  </antipattern>

---

### Pattern 2: Large Union Types

<antipattern id="2" severity="Critical">
<why_antipattern>
**The TypeScript Problem:**
For discriminated unions, TypeScript checks every variant at each usage:
- 5 variants: 5 type checks (safe)
- 8 variants: 8 type checks (warning zone)
- 10+ variants: 10+ checks × properties × usages = TS2589

**The Real-World Impact:**
10 union variants with 5 properties each = 50 type checks per property access. When used in loops or chained operations, this multiplies exponentially.

**Why This Happens:**
Developers model all possible event types or states in one big union, not realizing TypeScript must exhaustively check all variants for type narrowing.
</why_antipattern>

<recognition_red_flags>

```typescript
// 🚩 Red Flag: Count the | symbols
type Event =
  | { type: 'a' } // 1
  | { type: 'b' } // 2
  | { type: 'c' } // 3
  | { type: 'd' } // 4
  | { type: 'e' } // 5
  | { type: 'f' } // 6 ← Warning!
  | { type: 'g' } // 7 ← Danger!
  | { type: 'h' } // 8 ← RED FLAG!
```

**Quick Check:**
Count `|` symbols in type definition. If >5, it's Pattern 2.

**IDE Signs:**

- Autocomplete shows all 10+ variants
- Type narrowing is slow (`if (event.type === ...)`)
- TS2589 in switch statements on this type
  </recognition_red_flags>

<antipattern_code>

```typescript
// ❌ ANTI-PATTERN: 9 union variants
type Event =
  | { type: 'user_created'; userId: string; email: string; timestamp: number }
  | { type: 'user_updated'; userId: string; fields: Record<string, unknown> }
  | { type: 'user_deleted'; userId: string; reason: string }
  | { type: 'post_created'; postId: string; authorId: string; content: string }
  | { type: 'post_updated'; postId: string; changes: Record<string, unknown> }
  | { type: 'post_deleted'; postId: string; reason: string }
  | { type: 'comment_created'; commentId: string; postId: string; text: string }
  | { type: 'comment_updated'; commentId: string; text: string }
  | { type: 'comment_deleted'; commentId: string; reason: string }

// When you use this:
function handleEvent(event: Event) {
  if (event.type === 'user_created') {
    // TypeScript must check: Is this variant 1, 2, 3, 4, 5, 6, 7, 8, or 9?
    // Then: Which properties are valid for this specific variant?
    // = 9 type checks + property validation = expensive!
  }
}
```

<impact_analysis>

```xml
<thinking>
Pattern recognition in anti-pattern:
- 9 variants total (exceeds 5-member safe limit)
- Clear grouping: entity (user/post/comment) + action (created/updated/deleted)
- This is really 3 entities × 3 actions = 9, but TypeScript sees flat 9 variants

Why TS2589 occurs:
1. TypeScript creates union: V1 | V2 | V3 | ... | V9
2. For each type check (event.type === X), evaluates all 9 branches
3. For each property access (event.userId), checks which of 9 variants has it
4. In a switch with 9 cases: 9 × branch checks
5. Used in multiple files: repeated evaluation
6. Combined with other complex types: hits depth limit

Better design:
- Separate dimensions: entity (3 options) + action (3 options) = 6 checks total
- Or: Split by domain: UserEvent (3 variants), PostEvent (3 variants) = separate types
</thinking>
```

</impact_analysis>
</antipattern_code>

<fix_options>
<fix_option id="A" label="Categorize with Composition" difficulty="Easy" performance="Fast">

```typescript
// ✅ FIX A: Separate the dimensions
type EntityType = 'user' | 'post' | 'comment' // 3 members
type ActionType = 'created' | 'updated' | 'deleted' // 3 members

type Event = {
  entity: EntityType
  action: ActionType
  entityId: string
  metadata: Record<string, unknown>
  timestamp: number
}

// TypeScript checks: 3 (entity) + 3 (action) = 6 total checks
// vs 9 flat union checks
// 33% reduction in type checking work!

// Usage:
function handleEvent(event: Event) {
  if (event.entity === 'user' && event.action === 'created') {
    // Handle user creation
  }
}
```

**Trade-offs:**

- ✅ Pros: Simple, scalable, no TS2589, easy to add new entities/actions
- ⚠️ Cons: Loses some type safety (all combos allowed, not just valid ones)
  </fix_option>

<fix_option id="B" label="Split by Domain" difficulty="Medium" performance="Better type safety">

```typescript
// ✅ FIX B: Domain-specific event types
type UserEvent =
  | { type: 'created'; userId: string; email: string }
  | { type: 'updated'; userId: string; fields: Record<string, unknown> }
  | { type: 'deleted'; userId: string; reason: string }

type PostEvent =
  | { type: 'created'; postId: string; authorId: string }
  | { type: 'updated'; postId: string; changes: Record<string, unknown> }
  | { type: 'deleted'; postId: string; reason: string }

type CommentEvent =
  | { type: 'created'; commentId: string; postId: string; text: string }
  | { type: 'updated'; commentId: string; text: string }
  | { type: 'deleted'; commentId: string; reason: string }

// Use separately in different contexts:
function handleUserEvent(event: UserEvent) {
  // Only 3 variants to check here
}

function handlePostEvent(event: PostEvent) {
  // Only 3 variants to check here
}

// Or use combined when needed:
type AnyEvent =
  | ({ eventType: 'user' } & UserEvent)
  | ({ eventType: 'post' } & PostEvent)
  | ({ eventType: 'comment' } & CommentEvent)
```

**Trade-offs:**

- ✅ Pros: Better type safety, smaller unions (3 variants each), domain-focused
- ⚠️ Cons: More type definitions, need to know context when handling
  </fix_option>
  </fix_options>
  </antipattern>

---

### Pattern 3: Inline Complex Return Types

<antipattern id="3" severity="High">
<why_antipattern>
**The TypeScript Problem:**
Inline types are re-evaluated every time TypeScript encounters them:
- 1 function with inline type = 1 evaluation
- 10 functions with same inline type = 10 separate evaluations (even if identical!)
- Each evaluation: full type instantiation from scratch

**The Real-World Impact:**
Complex inline type (3 levels, 10 properties) × 10 functions = 10× unnecessary work.
Extract once to types.ts = 1 evaluation + 10 lookups (90% faster).

**Why This Happens:**
Copy-paste coding: developers duplicate return types across similar functions without extracting to shared definition.
</why_antipattern>

<recognition_red_flags>

```typescript
// 🚩 Red Flag: Inline object type in return position
handler: async (ctx, args): Promise<{  // ← Opening brace
  id: string;
  user: {           // ← Nested object
    name: string;
    profile: {      // ← Another nesting level
      settings: {   // ← 3+ levels = RED FLAG!
```

**Quick Check:**
See `Promise<{` in function signature? That's inline type. Count nesting levels. If >2, it's Pattern 3.

**IDE Signs:**

- Same type structure repeated across multiple files
- Autocomplete shows big inline object when hovering
- Changing one property requires updating many files
  </recognition_red_flags>

<antipattern_code>

```typescript
// ❌ ANTI-PATTERN: 50-line inline return type
export const getFullUser = query({
  handler: async (
    ctx,
    args,
  ): Promise<{
    id: Id<'users'>
    name: string
    email: string
    profile: {
      bio: string
      avatar: string
      settings: {
        theme: 'light' | 'dark'
        notifications: {
          email: boolean
          push: boolean
          sms: boolean
        }
      }
    }
    posts: Array<{
      id: Id<'posts'>
      title: string
      content: string
      comments: Array<{
        id: Id<'comments'>
        text: string
        author: {
          id: Id<'users'>
          name: string
        }
      }>
    }>
  }> => {
    // Implementation...
  },
})

// If 5 other functions have similar return types:
// TypeScript evaluates this complex type 6 separate times!
```

<impact_analysis>

```xml
<thinking>
Type complexity analysis:
- Nesting depth: 4 levels (user → profile → settings → notifications)
- Array types: 2 (posts[], comments[])
- Discriminated union: 1 (theme: "light" | "dark")
- Object types: 5 nested objects

TypeScript work per usage:
1. Parse Promise wrapper
2. Parse top-level object (4 properties)
3. Parse profile object (3 properties)
4. Parse settings object (2 properties)
5. Parse notifications object (3 properties)
6. Parse posts array with nested objects
7. Parse comments array with nested objects
Total: ~20 type instantiations per function

If used in 10 functions:
- Inline: 20 × 10 = 200 type instantiations
- Extracted: 20 (once) + 10 (lookups) = 30 instantiations
- Savings: 85% reduction in type checking work!
</thinking>
```

</impact_analysis>
</antipattern_code>

<fix_options>
<fix_option id="A" label="Extract All Types to types.ts" difficulty="Easy" performance="Best">

```typescript
// File: queries.ts
import { FullUser } from './types'

// ✅ FIX A: Extract to separate types file

// File: types.ts
export type NotificationSettings = {
  email: boolean
  push: boolean
  sms: boolean
}

export type UserSettings = {
  theme: 'light' | 'dark'
  notifications: NotificationSettings
}

export type UserProfile = {
  bio: string
  avatar: string
  settings: UserSettings
}

export type CommentAuthor = {
  id: Id<'users'>
  name: string
}

export type Comment = {
  id: Id<'comments'>
  text: string
  author: CommentAuthor
}

export type Post = {
  id: Id<'posts'>
  title: string
  content: string
  comments: Comment[]
}

export type FullUser = {
  id: Id<'users'>
  name: string
  email: string
  profile: UserProfile
  posts: Post[]
}

export const getFullUser = query({
  handler: async (ctx, args): Promise<FullUser> => {
    // Implementation...
  },
})

// Now 10 functions can use FullUser with just a name lookup!
```

**Benefits:**

- TypeScript evaluates types once, reuses 10 times
- Change type once, updates everywhere
- Better IDE "Go to Definition"
- Self-documenting architecture
- Can version types if needed

**When to use:**

- Always! This should be the default approach.
  </fix_option>
  </fix_options>

<quick_fix_guide>
**30-second extraction:**

1. Copy inline type from function signature
2. Paste into types.ts
3. Give it a meaningful name
4. Replace inline type with name
5. Add import statement

```bash
# Automated check for inline types:
grep -r "Promise<{" convex/*.ts
# Each match should be extracted!
```

</quick_fix_guide>
</antipattern>

---

### Pattern 4: Chained Transformations Without Types

<antipattern id="4" severity="High">
<why_antipattern>
**The TypeScript Problem:**
Chained transformations without intermediate types create inference chains:
- Step 1: TypeScript infers result of `collect()`
- Step 2: Infers result of `filter()` based on Step 1
- Step 3: Infers result of `map()` based on Step 2
- Step 4: Infers result of `reduce()` based on Step 3
Each link compounds the depth!

**The Real-World Impact:**
4-step chain = 4× inference depth. If each step has complex types, this exponentially increases. Easily hits TS2589 depth limit.

**Why This Happens:**
Functional programming style (`.then().then()`) without considering TypeScript's type inference costs.
</why_antipattern>

<recognition_red_flags>

```typescript
// 🚩 Red Flag: Chain of transformations
return ctx.db
  .query()
  .collect() // Inferred
  .then((x) => x.filter()) // Inferred from previous
  .then((y) => y.map()) // Inferred from previous
  .then((z) => z.reduce()) // Inferred from previous
//  ↑ Each .then() adds inference depth!
```

**Quick Check:**
Count `.then()` or transformation method chains. If >3 without type annotations, it's Pattern 4.

**IDE Signs:**

- TypeScript takes >5 seconds to show type on hover
- Autocomplete is slow in transformation chains
- TS2589 appears in middle of chain
  </recognition_red_flags>

<antipattern_code>

```typescript
// ❌ ANTI-PATTERN: 4-step chain without intermediate types
export const processOrders = mutation({
  handler: async (ctx, args) => {
    return ctx.db
      .query('orders')
      .collect()
      .then((orders) => orders.filter((o) => o.status === 'pending'))
      .then((pending) =>
        pending.map((o) => ({
          ...o,
          items: o.items.map((i) => ({
            ...i,
            price: calculatePrice(i),
            tax: calculateTax(i),
          })),
        })),
      )
      .then((processed) =>
        processed.reduce(
          (acc, order) => ({
            ...acc,
            [order.category]: [...(acc[order.category] || []), order],
          }),
          {} as Record<string, any>,
        ),
      )
    // TypeScript must infer through 4 chained transformations!
  },
})
```

<impact_analysis>

```xml
<thinking>
Inference chain analysis:
1. .collect() → TypeScript infers: Promise<Doc<"orders">[]>
2. .then(orders => orders.filter(...)) → TypeScript infers filtered array type
3. .then(pending => pending.map(...)) → TypeScript must infer:
   - Map transformation return type
   - Nested items.map() transformation
   - calculatePrice() return type
   - calculateTax() return type
   = 4 nested inferences within this step alone!
4. .then(processed => processed.reduce(...)) → TypeScript must infer:
   - Reduce accumulator type (Record<string, any>)
   - Array spread types
   = 2 more nested inferences

Total inference chain depth: 4 (steps) × 2-4 (inferences per step) = 8-16 levels
This is why TS2589 occurs!

With explicit intermediate types:
- Step 1: Promise<Order[]> → TypeScript checks (doesn't infer)
- Step 2: Order[] → TypeScript checks
- Step 3: ProcessedOrder[] → TypeScript checks
- Step 4: OrdersByCategory → TypeScript checks
No chaining, each verified independently = 4 simple checks instead of 16 inferences
</thinking>
```

</impact_analysis>
</antipattern_code>

<fix_options>
<fix_option id="A" label="Add Intermediate Typed Variables" difficulty="Easy" performance="Best">

```typescript
// ✅ FIX A: Break chain with typed intermediate variables

type Order = {
  id: Id<'orders'>
  status: string
  category: string
  items: OrderItem[]
}

type OrderItem = {
  id: string
  name: string
  basePrice: number
}

type ProcessedOrderItem = {
  id: string
  name: string
  price: number
  tax: number
}

type ProcessedOrder = {
  id: Id<'orders'>
  status: string
  category: string
  items: ProcessedOrderItem[]
}

type OrdersByCategory = Record<string, ProcessedOrder[]>

export const processOrders = mutation({
  handler: async (ctx, args): Promise<OrdersByCategory> => {
    // Step 1: Fetch (explicit type)
    const allOrders: Order[] = await ctx.db.query('orders').collect()

    // Step 2: Filter (explicit type)
    const pendingOrders: Order[] = allOrders.filter(
      (o) => o.status === 'pending',
    )

    // Step 3: Transform (explicit type)
    const processedOrders: ProcessedOrder[] = pendingOrders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        price: calculatePrice(item),
        tax: calculateTax(item),
      })),
    }))

    // Step 4: Group (explicit type)
    const grouped: OrdersByCategory = processedOrders.reduce(
      (acc, order) => ({
        ...acc,
        [order.category]: [...(acc[order.category] || []), order],
      }),
      {} as OrdersByCategory,
    )

    return grouped
  },
})
```

**Benefits:**

- No inference chains
- Each step independently type-checked
- Clear intermediate states
- Easier to debug
- Better error messages

**Performance:**

- Compilation 3-5× faster
- No TS2589 from inference depth
  </fix_option>
  </fix_options>
  </antipattern>

---

## Quick Reference: Remaining Patterns

<remaining_patterns>

### Pattern 5: Generic Helper Functions (Medium Severity)

**Anti-pattern:** `<T extends U, U extends V>` with nested constraints
**Why bad:** TypeScript must resolve constraint chains
**Fix:** Make helpers specific, non-generic

### Pattern 6: Large Validator Objects (High Severity)

**Anti-pattern:** 30+ fields in single `v.object()`
**Why bad:** Large object type instantiation
**Fix:** Split by concern (basic info, preferences, settings)

### Pattern 7: Conditional Type Utilities (Medium Severity)

**Anti-pattern:** `DeepPartial<Awaited<Extract<T, U>>>`
**Why bad:** Nested conditional evaluation
**Fix:** Use explicit types instead of utility type chains

### Pattern 8: Intersection Type Chains (Medium Severity)

**Anti-pattern:** `A & B & C & D & E & F`
**Why bad:** TypeScript must merge 6 types
**Fix:** Flatten to single type definition
</remaining_patterns>

---

## Recognition Quick Reference

<recognition_guide>
**10-Second Visual Scan Checklist:**

1. **Schema file (schema.ts):**
   - [ ] Count `{` depth: >3 = Pattern 1
   - [ ] Count fields: >20 = needs splitting

2. **Type definitions (types.ts or inline):**
   - [ ] Count `|` symbols: >5 = Pattern 2
   - [ ] See `extends ?` = Pattern 7
   - [ ] See `& & & &` (4+) = Pattern 8

3. **Function signatures:**
   - [ ] See `Promise<{` = Pattern 3 (inline types)
   - [ ] No `: Promise<Name>` = missing explicit type

4. **Function bodies:**
   - [ ] Count `.then()` chains: >3 = Pattern 4
   - [ ] See `<T extends` = Pattern 5

5. **Mutation args:**
   - [ ] Validator spans >30 lines = Pattern 6
   - [ ] Nested `v.object(v.object())` = Pattern 1 or 6
         </recognition_guide>

---

## Impact Assessment Matrix

<impact_matrix>
| Pattern | Severity | Detection Difficulty | Fix Difficulty | Recurrence Risk |
|---------|----------|---------------------|----------------|-----------------|
| 1: Deep Nesting | Critical | Easy | Medium | High |
| 2: Large Unions | Critical | Easy | Easy | Medium |
| 3: Inline Types | High | Easy | Easy | High |
| 4: Chained Transforms | High | Medium | Easy | Medium |
| 5: Generic Helpers | Medium | Medium | Medium | Low |
| 6: Large Validators | High | Easy | Medium | High |
| 7: Conditional Utils | Medium | Hard | Medium | Low |
| 8: Intersection Chains | Medium | Easy | Easy | Low |

**Prioritization Guide:**

1. Fix **Critical** (Patterns 1, 2) immediately
2. Fix **High** (Patterns 3, 4, 6) within sprint
3. Fix **Medium** (Patterns 5, 7, 8) when convenient
   </impact_matrix>

---

## Prevention Checklist

<prevention_checklist>
**During Code Review:**

- [ ] Run: `grep -r "v\.object.*v\.object.*v\.object" convex/schema.ts`
- [ ] Count union members in new type definitions
- [ ] Check all functions have explicit return types
- [ ] Look for .then() chains without intermediate types
- [ ] Verify validators are split by concern

**During Development:**

- [ ] Extract inline types to types.ts immediately
- [ ] Add explicit type after every transformation
- [ ] Keep schemas flat (use IDs to reference)
- [ ] Split large unions as you add new variants
- [ ] Write specific helpers instead of generic ones

**Automated Checks:**

```bash
# Add to CI pipeline:
python scripts/audit_schema.py convex/schema.ts
npx tsc --noEmit
grep -r "Promise<{" convex/ | wc -l  # Should be 0
```

</prevention_checklist>

---

## Quick Fix Decision Tree

<fix_decision_tree>

```
Identified anti-pattern
    ↓
Is it Critical (1 or 2)?
    ├─ YES → Fix immediately (blocking)
    └─ NO → Continue
    ↓
Is it High (3, 4, or 6)?
    ├─ YES → Fix this sprint
    └─ NO → Schedule for later
    ↓
Is it Medium (5, 7, or 8)?
    └─ Fix when refactoring nearby code
    ↓
Apply fix strategy from pattern's <fix_options>
    ↓
Test: npx tsc --noEmit
    ↓
Success! Document in commit message
```

</fix_decision_tree>

---

## Real-World Examples Summary

<real_world_summary>
**Pattern 1:** E-commerce product with nested variants → Separate products/variants tables
**Pattern 2:** Notification system with 12 event types → Categorize by channel + status
**Pattern 3:** API responses with inline types → Extract ApiResponse<T> generic
**Pattern 4:** Data pipeline with 5 transformation steps → Add typed intermediate variables
**Pattern 5:** mapWithRelations<T, K, R> generic → attachProfiles(users, profileMap) specific
**Pattern 6:** createProject with 30 validator fields → Split: basicInfo, settings, team
**Pattern 7:** DeepPartial<ReturnType<...>> → Define explicit UpdatePayload type
**Pattern 8:** BaseEntity & Timestamped & Owned & ... → Single Entity type with all fields
</real_world_summary>

---

## Final Validation

<validation_workflow>
After fixing an anti-pattern:

1. **Compile check:**

```bash
npx tsc --noEmit
# Should show no TS2589 errors
```

2. **Schema audit:**

```bash
python scripts/audit_schema.py convex/schema.ts
# Should pass all checks
```

3. **Performance check:**

```bash
time npx tsc --noEmit
# Should be <5 seconds for typical project
```

4. **Code review:**

- [ ] No inline types remain
- [ ] All functions have explicit return types
- [ ] Schema nesting ≤3 levels
- [ ] Unions ≤5 members
- [ ] Validators split by concern

5. **Documentation:**

- Document why pattern was bad
- Document fix applied
- Add to team's style guide
  </validation_workflow>
