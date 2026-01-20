# The 12 Principles for Preventing TS2589 in Convex

<role>
This reference guide serves as the authoritative source for understanding and applying TS2589 prevention principles. You are using this guide to:
- Educate developers on TypeScript type depth limits
- Diagnose which principle is being violated
- Explain WHY each principle prevents TS2589
- Provide concrete detection methods
- Show real-world examples with analysis
</role>

<usage_context>
**When to read this guide:**

- User asks "why does this cause TS2589?"
- Explaining a violation found during audit
- Teaching prevention best practices
- Need technical justification for refactoring

**How to use:**

1. Identify which principle(s) are violated
2. Read the principle's <why_this_matters> section
3. Show the <violation_example> and <good_example>
4. Explain using <technical_explanation>
5. Provide <detection_method> for prevention

**Don't:**

- Read all 12 principles at once (token inefficient)
- Read this for emergency fixes (use SKILL.md emergency workflow instead)
- Use without providing concrete code examples
  </usage_context>

---

## Quick Principle Finder

<principle_selector>
<decision_matrix>
| Symptom | Violated Principle | Severity |
|---------|-------------------|----------|
| Schema objects nested >3 levels | Principle 1 | Critical |
| Union with 7+ variants | Principle 2 | Critical |
| `extends ? :` in types | Principle 3 | High |
| Inline complex types | Principle 4 | High |
| No `: Promise<Type>` annotation | Principle 5 | High |
| Table with 30+ fields | Principle 6 | High |
| Large enums (20+ values) | Principle 7 | Medium |
| Type references itself | Principle 8 | Critical |
| `<T extends U extends V>` | Principle 9 | Medium |
| Nested `Record<Record<>>` | Principle 10 | Medium |
| `[K in keyof T]` in schema | Principle 11 | Medium |
| 100+ tables in schema.ts | Principle 12 | Low |
</decision_matrix>
</principle_selector>

---

## Severity-Based Workflow

<severity_guide>
**Critical (Must Fix Immediately):**
Principles 1, 2, 8 - These cause TS2589 most frequently

**High (Should Fix Soon):**
Principles 3, 4, 5, 6 - Common contributors to TS2589

**Medium (Consider Fixing):**
Principles 7, 9, 10, 11 - Can accumulate to cause issues

**Low (Refactor When Possible):**
Principle 12 - Organizational best practice

<workflow>
When multiple violations exist:
1. Fix Critical violations first (1, 2, 8)
2. Test: `npx tsc --noEmit`
3. If TS2589 persists, fix High violations (3, 4, 5, 6)
4. Test again
5. Address Medium/Low as time permits
</workflow>
</severity_guide>

---

## The 12 Core Principles

### Principle 1: Limit Object Nesting to ≤3 Levels

<principle id="1" severity="Critical">
<rule>Schema objects must not exceed 3 levels of nesting</rule>

<why_this_matters>
**The Problem:**
TypeScript must instantiate types for each nesting level. With each level, the number of type combinations multiplies exponentially:

- Level 1: 1 type instantiation
- Level 2: 1 × N properties = N instantiations
- Level 3: N × M properties = N×M instantiations
- Level 4: N × M × O properties = N×M×O instantiations (TS2589 territory!)

**Real Impact:**
A 4-level nested object with just 5 fields per level requires TypeScript to evaluate 5^4 = 625 type combinations.

**Why 3 Levels:**
TypeScript's type instantiation depth limit is ~50. With 3 levels, you stay safely under this limit even with complex schemas.
</why_this_matters>

<violation_example>

```typescript
// ❌ VIOLATION: 4 levels deep
const schema = defineSchema({
  companies: defineTable({
    info: v.object({
      // Level 1
      contact: v.object({
        // Level 2
        primary: v.object({
          // Level 3
          address: v.object({
            // Level 4 ← VIOLATION!
            street: v.string(),
            city: v.string(),
            zipCode: v.string(),
          }),
        }),
      }),
    }),
  }),
})

// When you query this:
const company = await ctx.db.get(companyId)
const street = company.info.contact.primary.address.street
// TypeScript must instantiate: Company → info → contact → primary → address → street
// = 6 type instantiations, multiplied by all properties at each level
```

<analysis>
```xml
<thinking>
Why this causes TS2589:
1. TypeScript starts at Company type
2. Accesses .info property → instantiates v.object() type
3. Accesses .contact property → instantiates nested v.object() type
4. Accesses .primary property → instantiates 3rd nested v.object() type
5. Accesses .address property → instantiates 4th nested v.object() type
6. Finally accesses .street → gets primitive type

Total: 6 type resolution steps
With multiple fields at each level: exponential complexity
Result: Exceeds TypeScript's instantiation depth limit
</thinking>

````
</analysis>
</violation_example>

<good_example>
```typescript
// ✅ SOLUTION: Flatten to 2 levels with separate tables

const schema = defineSchema({
  companies: defineTable({
    name: v.string(),
    primaryAddressId: v.id("addresses"),  // Foreign key reference
  }),

  addresses: defineTable({
    street: v.string(),
    city: v.string(),
    zipCode: v.string(),
    country: v.string(),
  }),
});

// Query becomes:
const company = await ctx.db.get(companyId);
const address = await ctx.db.get(company.primaryAddressId);
const street = address.street;
// TypeScript instantiates: Company → primaryAddressId, then Address → street
// = 2 simple type lookups, no nested objects
````

<benefits>
**Technical benefits:**
- Max 2 levels of type nesting (Company, Address)
- Each type is independently instantiated
- No multiplicative complexity

**Practical benefits:**

- Addresses can be reused across entities (users, warehouses, etc.)
- Can query addresses independently
- Easier to add address-related features
- Better data normalization

**Performance:**

- Query: Slightly slower (2 DB calls vs 1)
- Type checking: 90% faster
- Compilation: No TS2589 errors
  </benefits>
  </good_example>

<detection_method>
**Manual check:**

```typescript
// Count the { } depth
companies: {           // Level 0
  info: {             // Level 1
    contact: {        // Level 2
      primary: {      // Level 3
        address: {    // Level 4 ← Too deep!
```

**Automated check:**

```bash
# Count v.object() occurrences per table
grep -A 50 "defineTable" convex/schema.ts | grep "v\.object" | wc -l
# If result > 3, investigate nesting depth
```

**Script check:**

```bash
python scripts/audit_schema.py convex/schema.ts
# Reports: "Table 'companies': Nesting depth = 4 (exceeds limit of 3)"
```

</detection_method>

<real_world_scenarios>
**Scenario 1: User Profile Settings**

```typescript
// Common pattern (BAD):
users: {
  profile: {
    settings: {
      privacy: {
        notifications: { ... }  // 4 levels!
      }
    }
  }
}

// Better: Separate tables
users → profiles → settings
// Each table is shallow, linked by IDs
```

**Scenario 2: E-commerce Order**

```typescript
// Common pattern (BAD):
orders: {
  customer: {
    shipping: {
      address: { ... }  // 3 levels
    },
    billing: {
      address: { ... }  // 3 levels
    }
  }
}

// Better: Normalize
orders → customers → addresses
// Reuse addresses for shipping and billing
```

</real_world_scenarios>
</principle>

---

### Principle 2: Keep Union Types ≤5 Members

<principle id="2" severity="Critical">
<rule>Discriminated unions should have maximum 5 variants</rule>

<why_this_matters>
**The Problem:**
For discriminated unions, TypeScript must check which variant matches at every usage. With N variants:

- Union member checks: N
- Property access checks: N × P (P = properties per variant)
- Type narrowing checks: N × branches in code

**Real Impact:**
7 union variants with 5 properties each = 35 type checks per access
10 variants = 50 checks (approaching TS2589 threshold)

**Why 5 Members:**
5 variants × 5 properties = 25 checks (safe)
6+ variants start risking depth limit when combined with other complexity
</why_this_matters>

<violation_example>

```typescript
// ❌ VIOLATION: 8 variants
type NotificationEvent =
  | { type: "email_sent"; recipient: string; subject: string }
  | { type: "email_failed"; recipient: string; error: string }
  | { type: "sms_sent"; phoneNumber: string; message: string }
  | { type: "sms_failed"; phoneNumber: string; error: string }
  | { type: "push_sent"; deviceId: string; title: string }
  | { type: "push_failed"; deviceId: string; error: string }
  | { type: "webhook_sent"; url: string; payload: unknown }
  | { type: "webhook_failed"; url: string; error: string };

// When you use this:
function handleEvent(event: NotificationEvent) {
  if (event.type === "email_sent") { ... }
  // TypeScript must check all 8 variants to narrow type
  // Then for each property access, check which variant allows that property
  // = 8 × number of property accesses = exponential complexity
}
```

<analysis>
```xml
<thinking>
Why 8 variants causes issues:
1. TypeScript creates a union type: V1 | V2 | V3 | V4 | V5 | V6 | V7 | V8
2. For every `event.type` check, TypeScript evaluates all 8 branches
3. For every property access (event.recipient, event.error, etc.),
   TypeScript checks which of the 8 variants has that property
4. With nested usage or chained operations, checks multiply:
   - 8 variants × 3 property accesses = 24 type checks
   - In a loop: 24 × N iterations = exponential growth
5. Combined with other complex types: hits instantiation limit

Pattern recognition:

- Clear grouping: channel (email/sms/push/webhook) + status (sent/failed)
- This is really 4 × 2 = 8, but TypeScript sees 8 flat variants
- Solution: Separate the dimensions
  </thinking>

````
</analysis>
</violation_example>

<good_example>
```typescript
// ✅ SOLUTION Option 1: Hierarchical grouping
type Channel = "email" | "sms" | "push" | "webhook";  // 4 members
type Status = "sent" | "failed";                       // 2 members

type NotificationEvent = {
  channel: Channel;
  status: Status;
  timestamp: number;
  metadata: Record<string, unknown>;
  error?: string;
};

// TypeScript now checks:
// - channel: 4 options
// - status: 2 options
// = 4 + 2 = 6 total checks (not 4 × 2 = 8 combined checks)
// Much more efficient!

// ✅ SOLUTION Option 2: Discriminate on fewer dimensions
type NotificationEvent =
  | {
      status: "sent";
      channel: Channel;
      metadata: Record<string, unknown>;
    }
  | {
      status: "failed";
      channel: Channel;
      error: string;
      retryCount: number;
    };

// Only 2 variants! TypeScript checks sent vs failed first,
// then channel is just a field (4 string literals, not part of discrimination)
````

<benefits>
**Technical benefits:**
- Option 1: 6 type checks vs 8 (25% reduction)
- Option 2: 2 union variants vs 8 (75% reduction)
- Easier type narrowing
- Faster compilation

**Practical benefits:**

- Easier to add new channels (just add to Channel union)
- Easier to add new statuses (just add to Status union)
- More maintainable code
- Better exhaustiveness checking

**Code quality:**

- Fewer nested if-else branches
- More semantic grouping
- Clearer intent
  </benefits>
  </good_example>

<detection_method>
**Manual check:**

```typescript
// Count the | symbols
type Status = 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
//              ^     ^     ^     ^     ^     ^
// = 6 variants (exceeds 5-member limit)
```

**Automated check:**

```bash
# Find large unions in codebase
grep -r "type.*=" convex/ | grep -o "|" | wc -l
# Then manually review each type definition
```

**In code:**

```typescript
// TypeScript will slow down with large unions
// Watch for:
// - Slow IDE autocomplete
// - Long TypeScript compilation times
// - TS2589 errors when using the union
```

</detection_method>

<real_world_scenarios>
**Scenario 1: Task Status**

```typescript
// Common (BAD): 7 statuses
type Status =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'completed'
  | 'cancelled'

// Better: Group by lifecycle stage
type TaskState = 'active' | 'done' | 'cancelled'
type ActiveStage = 'pending' | 'assigned' | 'in_progress' | 'review'
type Status = {
  state: TaskState
  stage?: ActiveStage
}
```

**Scenario 2: Event Types**

```typescript
// Common (BAD): 12 event types
type UserEvent =
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'login'
  | 'logout'
  | 'password_reset'
  | 'profile_updated'
  | 'email_verified'
  | 'phone_verified'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'subscription_renewed'

// Better: Categorize
type EntityType = 'user' | 'session' | 'profile' | 'subscription'
type Action = 'created' | 'updated' | 'deleted' | 'verified'
type UserEvent = {
  entity: EntityType
  action: Action
  details: Record<string, unknown>
}
```

</real_world_scenarios>
</principle>

---

### Principle 3: Avoid Conditional Types in Schemas

<principle id="3" severity="High">
<rule>Don't use conditional types (`T extends U ? X : Y`) in schema definitions</rule>

<why_this_matters>
**The Problem:**
Conditional types force TypeScript to:

1. Evaluate the condition (T extends U?)
2. Instantiate the true branch type (X)
3. Instantiate the false branch type (Y)
4. Cache result for this specific T
5. Repeat for every different T encountered

**Real Impact:**
One conditional type = 3× type instantiations
Nested conditionals = exponential growth
In schemas used everywhere = repeated evaluation

**Why Avoid:**
Schemas are evaluated at compile-time for every query/mutation
Conditional types in schemas multiply compilation cost
Alternative (explicit unions) is evaluated once
</why_this_matters>

<violation_example>

```typescript
// ❌ VIOLATION: Conditional type in schema
type UserRole = 'admin' | 'user' | 'guest'

type UserByRole<T extends UserRole> = T extends 'admin'
  ? { role: 'admin'; permissions: string[]; canDelete: boolean }
  : T extends 'user'
    ? { role: 'user'; quota: number; canUpload: boolean }
    : { role: 'guest'; expires: number }

const schema = defineSchema({
  users: defineTable({
    id: v.string(),
    role: v.string(),
    // How do we use UserByRole<T> here? We can't dynamically switch!
  }),
})

// The problem: TypeScript must evaluate conditionals at EVERY usage
```

<analysis>
```xml
<thinking>
Why conditionals cause TS2589:
1. TypeScript sees: T extends "admin" ? AdminType : ...
2. Must check: Is T assignable to "admin"?
3. If yes: Instantiate AdminType
4. If no: Check next condition: T extends "user"?
5. Repeat for each condition
6. For union types (T = "admin" | "user"), must evaluate all branches
7. In a schema used by 50 functions, this happens 50 times
8. Combined with other complexity: hits instantiation limit

Why explicit unions are better:

1. TypeScript sees: AdminUser | RegularUser | GuestUser
2. Three distinct types, evaluated once each
3. No conditional logic at type level
4. Simpler instantiation: just pick the matching type
   </thinking>

````
</analysis>
</violation_example>

<good_example>
```typescript
// ✅ SOLUTION: Explicit union types
type AdminUser = {
  role: "admin";
  permissions: string[];
  canDelete: boolean;
};

type RegularUser = {
  role: "user";
  quota: number;
  canUpload: boolean;
};

type GuestUser = {
  role: "guest";
  expires: number;
};

type User = AdminUser | RegularUser | GuestUser;

const schema = defineSchema({
  users: defineTable({
    id: v.string(),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("guest")),
    // Store role-specific data in separate optional fields
    // Or better: use separate tables for each role
  }),
});

// Type narrowing is simple:
function processUser(user: User) {
  if (user.role === "admin") {
    // TypeScript knows: user is AdminUser
    console.log(user.permissions);
  }
}
````

<benefits>
**Technical benefits:**
- No conditional evaluation at type level
- Each type instantiated once
- Faster TypeScript compilation
- Better type narrowing

**Practical benefits:**

- Easier to understand (explicit types)
- Better IDE autocomplete
- Clearer error messages
- Easier to extend (just add new type to union)
  </benefits>
  </good_example>

<detection_method>
**Manual check:**

```typescript
// Search for these patterns:
T extends U ? X : Y
condition ? TrueType : FalseType
Extract<T, U>
Exclude<T, U>
// In schema definitions or types used by schemas
```

**Automated check:**

```bash
# Search for conditional type patterns
grep -r "extends.*?" convex/schema.ts convex/types.ts
# Review each match - conditionals in schemas are red flags
```

**Red flags:**

- Generic type parameters in schema definitions
- `<T extends ...>` in types used by multiple mutations
- `Extract`, `Exclude`, `Pick`, `Omit` in schema types
  </detection_method>

<real_world_scenarios>
**Scenario 1: Polymorphic Documents**

```typescript
// Bad: Conditional types
type Document<T extends 'pdf' | 'image' | 'video'> = T extends 'pdf'
  ? { type: 'pdf'; pages: number }
  : T extends 'image'
    ? { type: 'image'; width: number; height: number }
    : { type: 'video'; duration: number }

// Good: Explicit union
type PdfDocument = { type: 'pdf'; pages: number }
type ImageDocument = { type: 'image'; width: number; height: number }
type VideoDocument = { type: 'video'; duration: number }
type Document = PdfDocument | ImageDocument | VideoDocument
```

**Scenario 2: Permission-based Fields**

```typescript
// Bad: Conditional types
type WithPermissions<T, HasPerm extends boolean> = T &
  (HasPerm extends true ? { sensitiveData: string } : {})

// Good: Explicit types
type PublicUser = { id: string; name: string }
type AuthorizedUser = PublicUser & { sensitiveData: string }
```

</real_world_scenarios>
</principle>

---

### Principle 4: Extract and Reuse Type Definitions

<principle id="4" severity="High">
<rule>Define types separately in `types.ts`, don't inline them in function signatures</rule>

<why_this_matters>
**The Problem:**
Inline types are re-evaluated every time TypeScript encounters them:

- Defined in function A → TypeScript instantiates type
- Defined in function B → TypeScript instantiates again (even if identical)
- Used 10 times → 10 separate instantiations

**Real Impact:**
10 functions with identical inline type = 10× type instantiation cost
Extract once to types.ts = 1× instantiation, reused 10 times

**Why Extract:**
TypeScript caches named type references
Reusing a named type is O(1) lookup
Inline types require full re-evaluation
</why_this_matters>

<violation_example>

```typescript
// ❌ VIOLATION: Inline complex type (repeated across files)
// File: queries.ts
export const getUser = query({
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
        notifications: boolean
      }
    }
  }> => {
    /* ... */
  },
})

// File: mutations.ts
export const updateUser = mutation({
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
        notifications: boolean
      }
    }
  }> => {
    /* ... */
  },
})

// Problem: TypeScript evaluates this complex inline type TWICE
// If used in 10 functions → 10 separate evaluations
// Each evaluation: 3 levels deep, multiple properties → multiplicative complexity
```

<analysis>
```xml
<thinking>
Cost analysis:
1. getUser function: TypeScript encounters inline type
   - Instantiates: Promise wrapper
   - Instantiates: { id, name, email, profile }
   - Instantiates: profile { bio, avatar, settings }
   - Instantiates: settings { theme, notifications }
   - Total: 4 nested type instantiations

2. updateUser function: TypeScript encounters "same" inline type
   - TypeScript doesn't recognize it's identical (no name to compare)
   - Repeats all 4 instantiations
   - Total: 4 more instantiations

3. If 10 functions use this pattern:
   - 10 × 4 = 40 type instantiations
   - All for the "same" logical type!

With extracted type:

1. types.ts: TypeScript evaluates UserWithProfile once (4 instantiations)
2. All functions: TypeScript looks up "UserWithProfile" by name (1 instantiation each)
3. Total for 10 functions: 4 + 10 = 14 instantiations (72% reduction!)
   </thinking>

````
</analysis>
</violation_example>

<good_example>
```typescript
// ✅ SOLUTION: Extract to types.ts

// File: types.ts
export type UserSettings = {
  theme: "light" | "dark";
  notifications: boolean;
};

export type UserProfile = {
  bio: string;
  avatar: string;
  settings: UserSettings;
};

export type User = {
  id: Id<"users">;
  name: string;
  email: string;
  profile: UserProfile;
};

// File: queries.ts
import { User } from "./types";

export const getUser = query({
  handler: async (ctx, args): Promise<User> => { /* ... */ },
});

// File: mutations.ts
import { User } from "./types";

export const updateUser = mutation({
  handler: async (ctx, args): Promise<User> => { /* ... */ },
});

// TypeScript evaluates User type once in types.ts
// Both functions just reference it by name (fast lookup)
````

<benefits>
**Technical benefits:**
- Type instantiated once, reused many times
- ~70% reduction in type checking work for 10 uses
- TypeScript caches by name
- Faster compilation

**Practical benefits:**

- Single source of truth
- Change type once, updates everywhere
- Better IDE navigation ("Go to Definition")
- Easier to document
- Type versioning possible

**Maintainability:**

- No duplicate type definitions
- Clear type organization
- Easier code reviews
- Self-documenting architecture
  </benefits>
  </good_example>

<detection_method>
**Manual check:**

```typescript
// Look for inline types in return positions:
handler: async (...): Promise<{  // ← Inline object type
  id: Id<...>;
  // ... many fields
}> => { ... }

// Should be:
handler: async (...): Promise<UserType> => { ... }
```

**Automated check:**

```bash
# Find functions without named return types
grep -r "handler.*async.*Promise<{" convex/
# Each match is a candidate for type extraction
```

**ESLint rule:**

```json
{
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error"
  }
}
```

</detection_method>

<real_world_scenarios>
**Scenario 1: API Response Types**

```typescript
// Bad: Inline everywhere
export const endpoint1 = query({
  handler: async (): Promise<{
    success: boolean
    data: {
      /*...*/
    }
    error?: string
  }> => {},
})
export const endpoint2 = query({
  handler: async (): Promise<{
    success: boolean
    data: {
      /*...*/
    }
    error?: string
  }> => {},
})

// Good: Extract API response pattern
type ApiResponse<T> = {
  success: boolean
  data: T
  error?: string
}

export const endpoint1 = query({
  handler: async (): Promise<ApiResponse<UserData>> => {},
})
```

**Scenario 2: Paginated Results**

```typescript
// Bad: Repeat pagination structure
handler: async (): Promise<{
  items: User[]
  cursor: string | null
  hasMore: boolean
}> => {}

// Good: Extract pagination type
type Paginated<T> = {
  items: T[]
  cursor: string | null
  hasMore: boolean
}

handler: async (): Promise<Paginated<User>> => {}
```

</real_world_scenarios>
</principle>

---

### Principle 5: Use Explicit Types Over Inference

<principle id="5" severity="High">
<rule>Always annotate function return types explicitly</rule>

<why_this_matters>
**The Problem:**
Type inference creates chains of dependencies:

- Function A returns inferred type → TypeScript infers from body
- Function B uses A's result → TypeScript chains A's inference
- Function C uses B's result → TypeScript chains B's inference
- Each link adds instantiation depth

**Real Impact:**
3-function chain with inference = 3× depth
Complex transformations = exponential inference complexity
TS2589 when inference chain hits depth limit

**Why Explicit:**
Explicit type = 1 depth (just lookup by name)
Breaks inference chains
Compiler can verify instead of infer
</why_this_matters>

<violation_example>

```typescript
// ❌ VIOLATION: No explicit return types (inference chain)
export const getUsers = query({
  handler: async (ctx) => {
    // ← No return type
    const users = await ctx.db.query('users').collect()
    return users.map((user) => ({
      ...user,
      displayName: `${user.firstName} ${user.lastName}`,
      metadata: transformMetadata(user.meta),
    }))
    // TypeScript must infer:
    // 1. Query result type
    // 2. Map transformation type
    // 3. transformMetadata return type
    // 4. Final array type
    // = 4-level inference chain
  },
})

export const formatUsers = query({
  handler: async (ctx) => {
    // ← No return type
    const users = await getUsers(ctx, {})
    // TypeScript must:
    // 1. Infer getUsers return type (which itself is inferred!)
    // 2. Infer map transformation
    // = Chained inference (depth compounds)
    return users.map((u) => formatForDisplay(u))
  },
})

// Problem: Inference chains compound
// getUsers inference + formatUsers inference = deep instantiation
```

<analysis>
```xml
<thinking>
Inference chain analysis:
1. getUsers has no explicit return type
   → TypeScript must infer from function body
   → Body has: db.query().collect() → infer Doc<"users">[]
   → Plus: map transformation → infer mapped type
   → Plus: transformMetadata call → infer that function's return
   → Total: 3-4 levels of inference

2. formatUsers uses getUsers
   → Must first complete getUsers inference (expensive)
   → Then infer formatUsers transformation
   → Chains on top of getUsers inference
   → Total: 5-6 levels of inference

3. If another function uses formatUsers:
   → Must complete formatUsers inference first
   → Chains even deeper
   → Total: 7-8+ levels → TS2589!

With explicit types:

1. getUsers: Promise<User[]> → TypeScript checks (doesn't infer)
2. formatUsers: Promise<FormattedUser[]> → TypeScript checks
3. No chaining, no compounding depth
   </thinking>

````
</analysis>
</violation_example>

<good_example>
```typescript
// ✅ SOLUTION: Explicit return types break inference chains

// types.ts
export type User = {
  id: Id<"users">;
  firstName: string;
  lastName: string;
  displayName: string;
  metadata: Record<string, string>;
};

export type FormattedUser = {
  name: string;
  label: string;
};

// queries.ts
export const getUsers = query({
  handler: async (ctx): Promise<User[]> => {  // ← Explicit!
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: `${user.firstName} ${user.lastName}`,
      metadata: transformMetadata(user.meta),
    }));
    // TypeScript verifies return matches Promise<User[]>
    // No inference needed!
  },
});

export const formatUsers = query({
  handler: async (ctx): Promise<FormattedUser[]> => {  // ← Explicit!
    const users = await getUsers(ctx, {});
    // TypeScript knows: users is User[] (from explicit type)
    // No need to infer getUsers return
    return users.map(u => ({
      name: u.displayName,
      label: `${u.displayName} (${u.id})`,
    }));
    // TypeScript verifies return matches Promise<FormattedUser[]>
  },
});
````

<benefits>
**Technical benefits:**
- No inference chains
- Each function is type-checked independently
- Faster compilation (verification vs inference)
- Predictable type behavior

**Practical benefits:**

- Better error messages (mismatch vs explicit type)
- Clearer intent (see expected return immediately)
- Refactoring safety (change detected at function boundary)
- API documentation (return type is self-documenting)

**Performance:**

- TypeScript compilation 2-5× faster
- IDE autocomplete instant (no inference wait)
- No TS2589 from chained inference
  </benefits>
  </good_example>

<detection_method>
**Manual check:**

```typescript
// Look for functions without explicit return types:
handler: async (ctx, args) => {
  // ← Missing : Promise<Type>
  return something
}

// Should be:
handler: async (ctx, args): Promise<Type> => {
  return something
}
```

**Automated check:**

```bash
# Find functions missing explicit return types
grep -r "handler.*async" convex/ | grep -v ": Promise<"
# Each match needs explicit return type annotation
```

**ESLint enforcement:**

```json
{
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/explicit-module-boundary-types": "error"
  }
}
```

</detection_method>

<real_world_scenarios>
**Scenario 1: Data Transformation Pipeline**

```typescript
// Bad: Inference chains
const fetch = async () => await db.query('items').collect()
const transform = async () => (await fetch()).map(transformItem)
const format = async () => (await transform()).map(formatForDisplay)
// 3-level inference chain!

// Good: Explicit at each step
const fetch = async (): Promise<Item[]> => await db.query('items').collect()
const transform = async (): Promise<TransformedItem[]> =>
  (await fetch()).map(transformItem)
const format = async (): Promise<DisplayItem[]> =>
  (await transform()).map(formatForDisplay)
// No chaining, each verified independently
```

**Scenario 2: Aggregation Functions**

```typescript
// Bad: Complex inference
const aggregate = async (ctx) => {
  const data = await ctx.db.query('metrics').collect()
  return data.reduce(
    (acc, m) => ({
      ...acc,
      [m.key]: (acc[m.key] || 0) + m.value,
    }),
    {},
  )
  // TypeScript must infer: reduce accumulator type, result object shape
}

// Good: Explicit result type
type Aggregated = Record<string, number>

const aggregate = async (ctx): Promise<Aggregated> => {
  // Same implementation, but TypeScript verifies result
}
```

</real_world_scenarios>
</principle>

---

## Quick Reference: Remaining Principles

<remaining_principles>
**Principle 6: Limit Table Fields to ≤20**

- **Why:** 30+ fields → large object types → multiplicative complexity
- **Fix:** Split into related tables (users → profiles, users → settings)

**Principle 7: Prefer Literal Types Over Enums**

- **Why:** Enums expand into large union types internally
- **Fix:** Use string literals: `type Color = "red" | "blue" | "green"`

**Principle 8: Avoid Recursive Type Definitions** (Critical!)

- **Why:** `type Tree = { children: Tree[] }` → infinite instantiation
- **Fix:** Reference by ID: `type Node = { childIds: Id<"nodes">[] }`

**Principle 9: Simplify Generic Constraints**

- **Why:** `<T extends U, U extends V>` → nested constraint checking
- **Fix:** Use simple types: `type Query = { table: string; value: unknown }`

**Principle 10: Use Index Signatures Sparingly**

- **Why:** `Record<string, Record<string, T>>` → nested mapping complexity
- **Fix:** Flatten: `Record<string, unknown>` at max 1 level

**Principle 11: Avoid Mapped Types in Schemas**

- **Why:** `[K in keyof T]` → TypeScript iterates all keys
- **Fix:** Define explicit types: `type Update = { name?: string; email?: string }`

**Principle 12: Split Large Domains into Modules**

- **Why:** 100+ tables in one file → compilation slow, organization poor
- **Fix:** Separate files: `schema/users.ts`, `schema/posts.ts`, etc.
  </remaining_principles>

---

## Comprehensive Quick Reference

<checklist>
**Critical (Fix Immediately):**
- [ ] No objects nested >3 levels (Principle 1)
- [ ] Unions have ≤5 variants (Principle 2)
- [ ] No recursive type definitions (Principle 8)

**High (Fix Soon):**

- [ ] No conditional types in schemas (Principle 3)
- [ ] Types defined in types.ts, not inline (Principle 4)
- [ ] All functions have explicit return types (Principle 5)
- [ ] Tables have ≤20 fields (Principle 6)

**Medium (Consider):**

- [ ] Using literals instead of large enums (Principle 7)
- [ ] Simple generic constraints (Principle 9)
- [ ] Minimal use of Record<> (max 1 level) (Principle 10)
- [ ] No mapped types in schemas (Principle 11)

**Low (Refactor When Possible):**

- [ ] Domains split into modules (Principle 12)
      </checklist>

---

## Severity-Based Fix Order

<fix_workflow>

```
Encounter TS2589 error
    ↓
Run: python scripts/audit_schema.py convex/schema.ts
    ↓
Review violations by severity
    ↓
Fix Critical (1, 2, 8)
    ↓
Test: npx tsc --noEmit
    ↓
Still errors? → Fix High (3, 4, 5, 6)
    ↓
Test: npx tsc --noEmit
    ↓
Still errors? → Fix Medium (7, 9, 10, 11)
    ↓
Final test: npx tsc --noEmit && pnpm test
    ↓
Success! → Consider Low priority fixes (12)
```

</fix_workflow>
