# TS2589 Refactoring Guide for Convex

<role>
You are guiding a TypeScript developer through systematic refactoring to eliminate TS2589 errors in their Convex backend. Your role is to:
- Diagnose which refactoring strategy applies to their specific situation
- Provide clear, step-by-step refactoring instructions
- Explain WHY each change resolves the TS2589 error
- Show concrete before/after code examples
- Validate the refactoring maintains correctness
</role>

## Quick Strategy Selection

<strategy_selector>
<decision_tree>

```
What causes the TS2589 error?

Deeply nested schema objects (>3 levels)?
├─ YES → Strategy 1: Schema Flattening

Large union types (>5 members)?
├─ YES → Strategy 2: Union Simplification

Inline complex types in function signatures?
├─ YES → Strategy 3: Type Extraction

Complex function with chained transformations?
├─ YES → Strategy 4: Function Decomposition

Massive validator objects?
├─ YES → Strategy 5: Validator Simplification

Multiple issues combined?
└─ YES → Apply strategies in order: 3 → 1 → 2 → 4 → 5
```

</decision_tree>

<usage_instructions>
When user shares code with TS2589 error:

1. Read this guide to identify matching strategy
2. Use the strategy's <analysis> section to diagnose
3. Follow the <refactoring_steps> systematically
4. Provide before/after code from <examples>
5. Explain using <why_this_works> section
6. Verify using <validation> checklist
   </usage_instructions>
   </strategy_selector>

---

## Strategy 1: Schema Flattening

<strategy id="schema_flattening">
<when_to_use>
**Triggers:**
- Schema objects nested >3 levels
- `v.object()` chains that are too deep
- TS2589 errors in schema.ts file
- Performance issues with deeply nested queries

**Examples of this pattern:**

```typescript
users: defineTable({
  profile: v.object({
    settings: v.object({
      privacy: v.object({ ... })  // ← 4 levels!
    })
  })
})
```

</when_to_use>

<analysis_checklist>
Before starting refactoring, analyze in <thinking> tags:

1. **Count Nesting Depth**
   - How many levels of `v.object()` nesting?
   - Which level exceeds the 3-level threshold?

2. **Identify Relationships**
   - Are nested objects truly part of the parent entity?
   - Or are they separate entities that should be normalized?

3. **Assess Impact**
   - How many queries access these nested fields?
   - What's the data access pattern (read-heavy vs write-heavy)?

4. **Choose Approach**
   - Option A: Flatten with prefixes (simple, good for small objects)
   - Option B: Separate tables (better normalization, more flexible)
   - Option C: Hybrid (flatten some, separate others)
     </analysis_checklist>

<refactoring_steps>
<step number="1">
<task>Map Out Current Structure</task>
<instructions>
Create a visual tree of the nesting:

```
companies
  └─ info (level 1)
      └─ contact (level 2)
          └─ primary (level 3)
              └─ address (level 4) ← VIOLATION!
                  ├─ street
                  ├─ city
                  └─ zipCode
```

Identify:

- Which level violates the limit?
- What data is at each level?
- Is this true composition or association?
  </instructions>
  </step>

<step number="2">
<task>Choose Refactoring Approach</task>

<decision_guide>
**Choose Option A (Flatten with Prefixes) if:**

- Nested data is small (3-5 fields)
- Always accessed together
- No need for separate queries
- Simple key-value data

**Choose Option B (Separate Tables) if:**

- Nested data is complex (>5 fields)
- May be queried independently
- Represents a distinct entity
- May have multiple parent relationships

**Choose Option C (Hybrid) if:**

- Mix of both scenarios
- Some data is tightly coupled, some isn't
  </decision_guide>
  </step>

<step number="3">
<task>Apply Refactoring</task>

<option name="A" label="Flatten with Prefixes">
```typescript
// ❌ BEFORE: 4 levels deep
const schema = defineSchema({
  companies: defineTable({
    name: v.string(),
    info: v.object({
      contact: v.object({
        primary: v.object({
          address: v.object({
            street: v.string(),
            city: v.string(),
            zipCode: v.string(),
          }),
        }),
      }),
    }),
  }),
});

// ✅ AFTER: Flattened to 1 level
const schema = defineSchema({
companies: defineTable({
name: v.string(),
// Flatten: parent.child.grandchild.field → parent_child_grandchild_field
infoPrimaryAddressStreet: v.string(),
infoPrimaryAddressCity: v.string(),
infoPrimaryAddressZipCode: v.string(),
}),
});

````

<why_this_works>
**Technical reason:**
- Reduces type nesting from 4 levels to 1 level
- TypeScript doesn't need to recursively instantiate nested object types
- Each field is a direct property with simple type

**Practical reason:**
- Simpler queries: `company.infoPrimaryAddressStreet` vs `company.info.contact.primary.address.street`
- Faster database access (no nested object traversal)
- Easier to index and query

**Trade-offs:**
- ✅ Pros: Simple, fast, no TS2589 errors
- ❌ Cons: Long field names, less semantic structure
</why_this_works>
</option>

<option name="B" label="Separate Tables">
```typescript
// ❌ BEFORE: Nested structure
const schema = defineSchema({
  companies: defineTable({
    name: v.string(),
    info: v.object({
      contact: v.object({
        primary: v.object({
          address: v.object({
            street: v.string(),
            city: v.string(),
            zipCode: v.string(),
          }),
        }),
      }),
    }),
  }),
});

// ✅ AFTER: Normalized to separate tables
const schema = defineSchema({
  companies: defineTable({
    name: v.string(),
    primaryAddressId: v.id("addresses"),  // Foreign key reference
  }),

  addresses: defineTable({
    street: v.string(),
    city: v.string(),
    zipCode: v.string(),
    country: v.optional(v.string()),
  }),
});
````

<why_this_works>
**Technical reason:**

- Each table has shallow structure (1-2 levels max)
- TypeScript handles simple object types easily
- No deep type instantiation needed

**Practical reason:**

- Addresses can be reused across entities
- Can query addresses independently
- Easier to add address-related features
- Better data normalization

**Trade-offs:**

- ✅ Pros: Flexible, scalable, reusable
- ❌ Cons: Requires joins, slightly more complex queries
</why_this_works>
</option>
</step>

<step number="4">
<task>Update Query Code</task>

<code_migration>

```typescript
// BEFORE (nested access):
export const getCompanyAddress = query({
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId)
    const street = company.info.contact.primary.address.street
    const city = company.info.contact.primary.address.city
    return { street, city }
  },
})

// AFTER (Option A - flattened):
export const getCompanyAddress = query({
  handler: async (ctx, args): Promise<{ street: string; city: string }> => {
    const company = await ctx.db.get(args.companyId)
    return {
      street: company.infoPrimaryAddressStreet,
      city: company.infoPrimaryAddressCity,
    }
  },
})

// AFTER (Option B - separate tables):
export const getCompanyAddress = query({
  handler: async (ctx, args): Promise<{ street: string; city: string }> => {
    const company = await ctx.db.get(args.companyId)
    const address = await ctx.db.get(company.primaryAddressId)
    return {
      street: address.street,
      city: address.city,
    }
  },
})
```

<migration_notes>
**Key changes:**

1. Added explicit return type `Promise<{ street: string; city: string }>`
2. Simplified field access (no deep nesting)
3. For Option B: Added second query to fetch related data

**Testing checklist:**

- [ ] All queries compile without TS2589
- [ ] Query results match previous structure
- [ ] No runtime errors in dev/production
- [ ] Performance is acceptable (Option B may be slightly slower)
      </migration_notes>
      </code_migration>
      </step>
      </refactoring_steps>

<validation>
**After applying this refactoring, verify:**

```bash
# 1. TypeScript compiles without TS2589
npx tsc --noEmit

# 2. Convex functions deploy successfully
npx convex dev

# 3. Run tests
pnpm test

# 4. Manual testing
# - Test queries that access affected fields
# - Verify data integrity
# - Check query performance
```

**Success criteria:**
✅ No TS2589 errors in schema.ts
✅ All queries return correct data
✅ Nesting depth ≤3 levels throughout schema
✅ Tests pass
</validation>
</strategy>

---

## Strategy 2: Union Simplification

<strategy id="union_simplification">
<when_to_use>
**Triggers:**
- Union types with >5 variants
- Discriminated unions with many cases
- Complex event or status types
- TS2589 errors in type definitions with `|` operators

**Examples of this pattern:**

```typescript
type Status =
  | 'pending'
  | 'processing'
  | 'validating'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'archived' // 7 variants!
```

</when_to_use>

<analysis_checklist>
In <thinking> tags, analyze:

1. **Count Union Members**
   - How many variants in the union?
   - Threshold: >5 members = refactor needed

2. **Find Patterns**
   - Do variants group into categories?
   - Are there common fields across variants?
   - Can we use composition instead of discrimination?

3. **Assess Complexity**
   - Do variants have nested payloads?
   - Are payloads similar or completely different?

4. **Choose Simplification Strategy**
   - Hierarchical categorization (group related states)
   - Composition (separate concerns into fields)
   - State + metadata pattern
     </analysis_checklist>

<refactoring_steps>
<step number="1">
<task>Identify Current Union Complexity</task>

<example>
```typescript
// ❌ BEFORE: 8 variants with nested payloads
type NotificationEvent =
  | { type: "email_sent"; recipient: string; subject: string; timestamp: number }
  | { type: "email_failed"; recipient: string; error: string; retryCount: number }
  | { type: "sms_sent"; phoneNumber: string; message: string; cost: number }
  | { type: "sms_failed"; phoneNumber: string; error: string; retryCount: number }
  | { type: "push_sent"; deviceId: string; title: string; body: string }
  | { type: "push_failed"; deviceId: string; error: string; retryCount: number }
  | { type: "webhook_sent"; url: string; payload: unknown; responseCode: number }
  | { type: "webhook_failed"; url: string; error: string; retryCount: number };
```

<analysis>
```xml
<thinking>
Pattern recognition:
- 8 variants total (exceeds 5-member threshold)
- Clear pattern: channel_status (email_sent, email_failed, ...)
- Two dimensions: channel (email, sms, push, webhook) and status (sent, failed)
- Common fields in "failed" variants: error, retryCount
- Each channel has unique metadata

Simplification strategy:

- Separate the two concerns (channel and status)
- Use composition: { channel, status, metadata }
- Reduces from 8 discriminated types to 2 small unions
  </thinking>

````
</analysis>
</example>
</step>

<step number="2">
<task>Redesign Type Structure</task>

<option name="A" label="Hierarchical Categorization">
```typescript
// ✅ AFTER: Simplified with composition
type Channel = "email" | "sms" | "push" | "webhook";  // 4 members
type Status = "sent" | "failed";  // 2 members

type NotificationEvent = {
  channel: Channel;
  status: Status;
  timestamp: number;
  metadata: Record<string, unknown>;
  error?: string;
  retryCount?: number;
};
````

<why_this_works>
**Technical reason:**

- Reduced from 8 discriminated union variants to 2 simple unions (4 + 2 members)
- TypeScript evaluates 4 × 2 = 8 combinations, but doesn't need deep type checking
- `Record<string, unknown>` avoids nested type instantiation

**Practical reason:**

- Easier to add new channels (just add to Channel union)
- Easier to add new statuses (just add to Status union)
- Common fields (error, retryCount) are shared
- Metadata is flexible without type explosion

**Trade-offs:**

- ✅ Pros: Scalable, simple, no TS2589
- ⚠️ Cons: Loses some type safety for channel-specific metadata
</why_this_works>
</option>

<option name="B" label="Focused Discrimination">
```typescript
// ✅ AFTER: Discriminate on fewer dimensions
type Channel = "email" | "sms" | "push" | "webhook";

type NotificationEvent =
| {
status: "sent";
channel: Channel;
metadata: Record<string, unknown>;
timestamp: number;
}
| {
status: "failed";
channel: Channel;
error: string;
retryCount: number;
timestamp: number;
};

````

<why_this_works>
**Technical reason:**
- Only 2 union variants (sent vs failed)
- Channel is a field, not part of discrimination
- TypeScript checks 2 branches instead of 8

**Practical reason:**
- Strong type safety for sent vs failed states
- Different fields for different statuses (metadata vs error)
- Channel information preserved but not part of type discrimination

**Trade-offs:**
- ✅ Pros: Better type safety than Option A
- ✅ Pros: Still avoids TS2589
- ⚠️ Cons: Slightly less flexible than Option A
</why_this_works>
</option>
</step>

<step number="3">
<task>Update Usage Sites</task>

<code_migration>
```typescript
// BEFORE: 8-way switch
function handleEvent(event: NotificationEvent) {
  if (event.type === "email_sent") {
    console.log(`Email sent to ${event.recipient}`);
  } else if (event.type === "email_failed") {
    console.log(`Email failed: ${event.error}`);
  } else if (event.type === "sms_sent") {
    console.log(`SMS sent to ${event.phoneNumber}`);
  }
  // ... 5 more cases
}

// AFTER (Option A): 2-way switch + channel access
function handleEvent(event: NotificationEvent) {
  if (event.status === "sent") {
    console.log(`${event.channel} notification sent`);
  } else {
    console.log(`${event.channel} failed: ${event.error} (retry ${event.retryCount})`);
  }
}

// AFTER (Option B): Type-safe discrimination
function handleEvent(event: NotificationEvent) {
  if (event.status === "sent") {
    // TypeScript knows: event.metadata exists, event.error doesn't
    console.log(`${event.channel} sent:`, event.metadata);
  } else {
    // TypeScript knows: event.error exists, event.metadata doesn't
    console.log(`${event.channel} failed: ${event.error}`);
  }
}
````

<migration_benefits>
**Code improvements:**

- Reduced cyclomatic complexity (8 branches → 2 branches)
- Easier to understand and maintain
- Fewer opportunities for bugs (missing cases)
- Better test coverage (fewer combinations)
  </migration_benefits>
  </code_migration>
  </step>
  </refactoring_steps>

<validation>
**Validation checklist:**

```bash
# 1. Check for TS2589 errors
npx tsc --noEmit

# 2. Verify exhaustiveness checking
# TypeScript should warn about unhandled cases
```

```typescript
// Test exhaustiveness:
function testExhaustive(event: NotificationEvent) {
  switch (event.status) {
    case 'sent':
      return 'handled'
    case 'failed':
      return 'handled'
    // If you add a new status, TypeScript will error here ✓
  }
}
```

**Success criteria:**
✅ Union types have ≤5 members each
✅ No TS2589 errors
✅ Code is simpler and more maintainable
✅ Type safety is preserved or improved
</validation>
</strategy>

---

## Strategy 3: Type Extraction

<strategy id="type_extraction">
<when_to_use>
**Triggers:**
- Inline type definitions in function signatures
- Repeated complex type patterns
- TS2589 errors on function return types
- Functions without explicit return type annotations

**Examples of this pattern:**

```typescript
handler: async (ctx, args): Promise<{  // ← Inline complex type
  id: Id<"projects">;
  team: { lead: { ... }; members: Array<{ ... }> };
  stats: { ... };
}> => { ... }
```

</when_to_use>

<analysis_checklist>
In <thinking> tags, analyze:

1. **Identify Inline Types**
   - Where are types defined inline?
   - How complex are these types (count nesting levels)?

2. **Check for Repetition**
   - Is this type used in multiple places?
   - Would extraction enable reuse?

3. **Assess Reusability**
   - Can type be broken into smaller, reusable pieces?
   - Are there sub-types that could be extracted?

4. **Plan Extraction**
   - What should go in types.ts?
   - What's the logical grouping?
   - What should types be named?
     </analysis_checklist>

<refactoring_steps>
<step number="1">
<task>Identify Inline Complex Types</task>

```typescript
// ❌ BEFORE: Inline complex type (3 levels deep)
export const getProjectSummary = query({
  handler: async (
    ctx,
    args,
  ): Promise<{
    id: Id<'projects'>
    name: string
    status: 'active' | 'paused' | 'completed'
    team: {
      lead: { id: Id<'users'>; name: string; email: string }
      members: Array<{ id: Id<'users'>; name: string; role: string }>
    }
    stats: {
      totalTasks: number
      completedTasks: number
      openIssues: number
    }
  }> => {
    // Implementation...
  },
})
```

<analysis>
```xml
<thinking>
Complexity assessment:
- Level 1: Promise<{ id, name, status, team, stats }>
- Level 2: team { lead, members }, stats { totalTasks, ... }
- Level 3: lead { id, name, email }, members Array<{ id, name, role }>
- Total depth: 3 levels (at threshold)

Extraction strategy:

1. Extract leaf types first: TeamLead, TeamMember, ProjectStats
2. Compose into intermediate types: ProjectTeam
3. Create top-level type: ProjectSummary
4. Result: All types ≤2 levels deep

Reusability check:

- TeamLead: Could be used in other queries ✓
- TeamMember: Definitely reusable ✓
- ProjectStats: Specific to this query, but still worth extracting for clarity
  </thinking>

````
</analysis>
</step>

<step number="2">
<task>Create types.ts with Extracted Types</task>

```typescript
// ✅ Create: convex/types.ts
import { Id } from "./_generated/dataModel";

// Leaf types (most specific)
export type TeamMember = {
  id: Id<"users">;
  name: string;
  role: string;
};

export type TeamLead = {
  id: Id<"users">;
  name: string;
  email: string;
};

export type ProjectStats = {
  totalTasks: number;
  completedTasks: number;
  openIssues: number;
};

// Composite types
export type ProjectTeam = {
  lead: TeamLead;
  members: TeamMember[];
};

export type ProjectStatus = "active" | "paused" | "completed";

// Top-level types
export type ProjectSummary = {
  id: Id<"projects">;
  name: string;
  status: ProjectStatus;
  team: ProjectTeam;
  stats: ProjectStats;
};
````

<why_this_works>
**Technical reason:**

- Each type is shallow (max 2 levels deep)
- TypeScript can instantiate each type independently
- No deep recursive type checking needed
- Types are reusable, reducing redundant type instantiation

**Practical reason:**

- Types have clear, semantic names
- Easy to find and update type definitions
- Promotes consistency across codebase
- Enables type reuse (TeamMember used elsewhere)

**Organization benefits:**

- Single source of truth for types
- Easy to document type definitions
- Enables type versioning if needed
- Better IDE autocomplete and navigation
  </why_this_works>
  </step>

<step number="3">
<task>Update Function Signatures</task>

```typescript
// ✅ AFTER: Clean signature with extracted type
import { ProjectSummary } from './types'

export const getProjectSummary = query({
  handler: async (ctx, args): Promise<ProjectSummary> => {
    // Implementation unchanged
    const project = await ctx.db.get(args.projectId)
    const lead = await ctx.db.get(project.teamLeadId)
    const members = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('projectId'), project._id))
      .collect()

    return {
      id: project._id,
      name: project.name,
      status: project.status,
      team: {
        lead: {
          id: lead._id,
          name: lead.name,
          email: lead.email,
        },
        members: members.map((m) => ({
          id: m._id,
          name: m.name,
          role: m.role,
        })),
      },
      stats: {
        totalTasks: project.totalTasks,
        completedTasks: project.completedTasks,
        openIssues: project.openIssues,
      },
    }
  },
})
```

<improvements>
**Before vs After:**

| Aspect                 | Before           | After                  |
| ---------------------- | ---------------- | ---------------------- |
| Return type complexity | 40+ lines inline | 1 line reference       |
| Type depth             | 3 levels         | 2 levels (max)         |
| Reusability            | 0 (inline only)  | High (types.ts)        |
| Maintainability        | Hard to update   | Easy (single location) |
| TS2589 risk            | High             | Low                    |

**Additional benefits:**

- Other functions can use `ProjectSummary` type
- Frontend can import types from Convex
- Documentation tools can generate type docs
- Tests can use the same types
  </improvements>
  </step>

<step number="4">
<task>Enable Type Reuse Across Functions</task>

```typescript
// Now other functions can reuse the extracted types:

export const listProjects = query({
  handler: async (ctx): Promise<ProjectSummary[]> => {
    // Reuses ProjectSummary type ✓
    const projects = await ctx.db.query('projects').collect()
    return projects.map(transformToSummary)
  },
})

export const updateProjectTeam = mutation({
  args: {
    projectId: v.id('projects'),
    team: v.object({
      // Can reference TeamMember type in validation
      leadId: v.id('users'),
      memberIds: v.array(v.id('users')),
    }),
  },
  handler: async (ctx, args): Promise<ProjectTeam> => {
    // Returns ProjectTeam type ✓
    // Implementation...
  },
})
```

</step>
</refactoring_steps>

<validation>
**Validation steps:**

1. **Check TypeScript compilation:**

```bash
npx tsc --noEmit
# Should show no TS2589 errors
```

2. **Verify type exports:**

```typescript
// Test that types are properly exported
import { ProjectSummary, TeamMember } from "./types";
const test: ProjectSummary = { ... };  // Should autocomplete ✓
```

3. **Check type reuse:**

```bash
# Search for type usage across codebase
grep -r "ProjectSummary" convex/
# Should show multiple files using the type
```

**Success criteria:**
✅ All inline types extracted to types.ts
✅ All functions have explicit return types
✅ No TS2589 errors
✅ Types are reused in multiple places
✅ Max nesting depth ≤2 levels
</validation>
</strategy>

---

## Strategy 4: Function Decomposition

<strategy id="function_decomposition">
<when_to_use>
**Triggers:**
- Functions with complex transformation chains
- Multiple `await` operations chained together
- TS2589 errors in function bodies (not just signatures)
- Functions >50 lines with mixed concerns
- Difficult-to-type transformation pipelines

**Examples of this pattern:**

```typescript
// Complex chain without intermediate types
const result = await ctx.db.query("users")
  .collect()
  .then(users => users.map(async u => ({ ...u, posts: await ... })))
  .then(withPosts => withPosts.map(analyze))
  .then(analyzed => analyzed.sort(...));
```

</when_to_use>

<analysis_checklist>
In <thinking> tags, analyze:

1. **Identify Transformation Steps**
   - How many distinct operations?
   - What's the input and output of each step?

2. **Check Type Complexity**
   - Are intermediate types being inferred?
   - Are transformations causing deep type instantiation?

3. **Assess Reusability**
   - Could steps be reused in other functions?
   - Are steps independent or coupled?

4. **Plan Decomposition**
   - Which steps should become helper functions?
   - What should intermediate types be named?
   - What's the logical flow?
     </analysis_checklist>

<refactoring_steps>
<step number="1">
<task>Identify Complex Function Chain</task>

```typescript
// ❌ BEFORE: Complex monolithic function
export const analyzeUserActivity = query({
  handler: async (ctx, args) => {
    // Step 1: Get users
    const users = await ctx.db.query('users').collect()

    // Step 2: Add posts to each user
    const withPosts = await Promise.all(
      users.map(async (user) => ({
        ...user,
        posts: await ctx.db
          .query('posts')
          .filter((q) => q.eq(q.field('authorId'), user._id))
          .collect(),
      })),
    )

    // Step 3: Analyze each user
    const analyzed = withPosts.map((user) => ({
      userId: user._id,
      name: user.name,
      postCount: user.posts.length,
      avgPostLength:
        user.posts.reduce((sum, p) => sum + p.content.length, 0) /
        user.posts.length,
      topTags: getTopTags(user.posts),
    }))

    // Step 4: Sort by post count
    return analyzed.sort((a, b) => b.postCount - a.postCount)
  },
})
```

<analysis>
```xml
<thinking>
Complexity breakdown:
- 4 distinct transformation steps
- Step 2 creates deeply nested type: Array<User & { posts: Post[] }>
- Step 3 transforms to new shape without explicit type
- All intermediate types are inferred (TS2589 risk)

Decomposition strategy:

1. Create explicit types for each step's output
2. Extract each transformation into typed helper function
3. Compose helpers in main function with explicit types
4. Result: Each step has shallow types, clear boundaries

Expected benefits:

- Each helper function is testable independently
- Explicit types prevent deep inference
- Easier to debug (clear step boundaries)
- Steps can be reused in other queries
  </thinking>

````
</analysis>
</step>

<step number="2">
<task>Define Intermediate Types</task>

```typescript
// types.ts - Add domain types
import { Id } from "./_generated/dataModel";

export type User = {
  _id: Id<"users">;
  name: string;
  email: string;
};

export type Post = {
  _id: Id<"posts">;
  authorId: Id<"users">;
  content: string;
  tags: string[];
  createdAt: number;
};

// Intermediate transformation types
export type UserWithPosts = User & {
  posts: Post[];
};

export type UserAnalysis = {
  userId: Id<"users">;
  name: string;
  postCount: number;
  avgPostLength: number;
  topTags: string[];
};
````

<why_explicit_types>
**Benefits of explicit intermediate types:**

1. **Prevents deep inference:**
   - TypeScript doesn't need to infer complex transformations
   - Each type is explicitly defined and shallow

2. **Self-documenting:**
   - `UserWithPosts` clearly describes the shape
   - Future developers understand the transformation flow

3. **Type safety:**
   - Ensures each transformation produces expected output
   - Catches errors at transform boundaries

4. **Reusability:**
   - Other functions can use `UserWithPosts`
   - `UserAnalysis` becomes standard response format
     </why_explicit_types>
     </step>

<step number="3">
<task>Extract Typed Helper Functions</task>

```typescript
// helpers.ts - Extract transformation functions
import { QueryCtx } from './_generated/server'
import { Post, User, UserAnalysis, UserWithPosts } from './types'

/**
 * Step 1: Fetch all users with their posts
 */
async function getUsersWithPosts(ctx: QueryCtx): Promise<UserWithPosts[]> {
  const users = await ctx.db.query('users').collect()

  return Promise.all(
    users.map(
      async (user): Promise<UserWithPosts> => ({
        ...user,
        posts: await ctx.db
          .query('posts')
          .filter((q) => q.eq(q.field('authorId'), user._id))
          .collect(),
      }),
    ),
  )
}

/**
 * Step 2: Analyze a single user's activity
 */
function analyzeUser(userWithPosts: UserWithPosts): UserAnalysis {
  const { _id, name, posts } = userWithPosts

  const postCount = posts.length
  const avgPostLength =
    postCount > 0
      ? posts.reduce((sum, p) => sum + p.content.length, 0) / postCount
      : 0
  const topTags = getTopTags(posts)

  return {
    userId: _id,
    name,
    postCount,
    avgPostLength,
    topTags,
  }
}

/**
 * Step 3: Sort analyses by post count (descending)
 */
function sortByPostCount(analyses: UserAnalysis[]): UserAnalysis[] {
  return [...analyses].sort((a, b) => b.postCount - a.postCount)
}

// Export helpers
export { getUsersWithPosts, analyzeUser, sortByPostCount }
```

<why_this_works>
**Technical benefits:**

1. **Shallow function signatures:**
   - Each function has simple input/output types
   - No deep generic or inferred types
   - TypeScript can type-check each function independently

2. **Isolated complexity:**
   - `getUsersWithPosts`: Handles async/await complexity
   - `analyzeUser`: Pure transformation (no async)
   - `sortByPostCount`: Pure sort (no mutation)

3. **Composability:**
   - Functions can be tested in isolation
   - Can be reused in different combinations
   - Easy to mock for testing

**Practical benefits:**

- Easier to understand (each function does one thing)
- Easier to test (small, focused tests)
- Easier to optimize (profile individual functions)
- Easier to debug (clear boundaries)
  </why_this_works>
  </step>

<step number="4">
<task>Compose Clean Main Function</task>

```typescript
// ✅ AFTER: Clean, composed, typed function
import { analyzeUser, getUsersWithPosts, sortByPostCount } from './helpers'
import { UserAnalysis } from './types'

export const analyzeUserActivity = query({
  handler: async (ctx, args): Promise<UserAnalysis[]> => {
    // Step 1: Get users with their posts
    const usersWithPosts = await getUsersWithPosts(ctx)

    // Step 2: Analyze each user
    const analyses = usersWithPosts.map(analyzeUser)

    // Step 3: Sort by post count
    return sortByPostCount(analyses)
  },
})
```

<comparison>
**Before vs After:**

| Metric                | Before     | After      |
| --------------------- | ---------- | ---------- |
| Lines of code         | 25 lines   | 8 lines    |
| Nesting depth         | 3-4 levels | 1-2 levels |
| Explicit types        | 0          | 4 types    |
| Testable functions    | 1          | 4          |
| TS2589 risk           | High       | Low        |
| Cyclomatic complexity | 8          | 3          |

**Readability improvement:**

- Before: "What does this do?" (need to read all code)
- After: "Get users, analyze them, sort them" (self-documenting)
  </comparison>
  </step>
  </refactoring_steps>

<validation>
**Comprehensive validation:**

1. **Unit test helpers:**

```typescript
// Test each helper independently
test("analyzeUser computes correct stats", () => {
  const userWithPosts: UserWithPosts = {
    _id: "user123",
    name: "Alice",
    posts: [
      { content: "Hello world", tags: ["intro"], ... },
      { content: "TypeScript is great", tags: ["tech"], ... },
    ],
  };

  const analysis = analyzeUser(userWithPosts);

  expect(analysis.postCount).toBe(2);
  expect(analysis.avgPostLength).toBe(16.5);
});
```

2. **Integration test:**

```typescript
// Test main function
test('analyzeUserActivity returns sorted analyses', async () => {
  const result = await analyzeUserActivity(mockCtx, {})

  expect(result).toHaveLength(3)
  expect(result[0].postCount).toBeGreaterThanOrEqual(result[1].postCount)
})
```

3. **TypeScript check:**

```bash
npx tsc --noEmit
# Should show no errors
```

**Success criteria:**
✅ Function broken into 3-4 helpers
✅ All helpers have explicit types
✅ Main function is <10 lines
✅ No TS2589 errors
✅ All helpers are tested
✅ Code is more readable
</validation>
</strategy>

---

## Strategy 5: Validator Simplification

<strategy id="validator_simplification">
<when_to_use>
**Triggers:**
- Large validator objects (>10 fields)
- Deeply nested validators
- TS2589 errors in mutation `args` definitions
- Validators that are repeated across mutations

**Examples of this pattern:**

```typescript
args: {
  project: v.object({  // ← 15+ fields nested
    name: v.string(),
    description: v.string(),
    settings: v.object({ ... }),
    team: v.object({ ... }),
    // ... many more fields
  })
}
```

</when_to_use>

<analysis_checklist>
In <thinking> tags, analyze:

1. **Count Validator Fields**
   - How many fields in the validator?
   - How many levels of nesting?

2. **Identify Groupings**
   - Do fields naturally group by concern?
   - (e.g., project basics, settings, team, schedule, etc.)

3. **Check for Reusability**
   - Are validator patterns repeated?
   - Could sub-validators be shared?

4. **Plan Splitting Strategy**
   - Option A: Split into domain-specific validators
   - Option B: Create separate mutations for each concern
   - Option C: Hybrid (some shared validators, some separate mutations)
     </analysis_checklist>

<refactoring_steps>
<step number="1">
<task>Identify Large Validator</task>

```typescript
// ❌ BEFORE: Massive monolithic validator
export const createProject = mutation({
  args: {
    project: v.object({
      // Basic info
      name: v.string(),
      description: v.string(),
      visibility: v.union(v.literal('public'), v.literal('private')),

      // Settings (nested)
      settings: v.object({
        wikiEnabled: v.boolean(),
        issuesEnabled: v.boolean(),
        discussionsEnabled: v.boolean(),
        cicdEnabled: v.boolean(),
        securityScanning: v.boolean(),
      }),

      // Team (nested)
      team: v.object({
        ownerId: v.id('users'),
        adminIds: v.array(v.id('users')),
        memberIds: v.array(v.id('users')),
        guestIds: v.array(v.id('users')),
      }),

      // Schedule
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      milestones: v.array(
        v.object({
          name: v.string(),
          dueDate: v.number(),
          description: v.string(),
        }),
      ),

      // ... potentially 10+ more fields
    }),
  },
  handler: async (ctx, args) => {
    // Massive implementation
  },
})
```

<analysis>
```xml
<thinking>
Complexity assessment:
- Total fields: ~20+
- Nesting depth: 3 levels (project.settings.wikiEnabled)
- Logical groups: 4-5 (basics, settings, team, schedule, milestones)

Problems:

1. Creating a project requires providing ALL fields upfront
2. Can't update settings independently later
3. Validator is repeated if we want separate update mutations
4. TS2589 risk from deep nesting and many fields

Refactoring strategy:

- Create separate mutations for each concern
- Extract reusable validators to validators.ts
- Use focused mutations: createProject (basics only), updateSettings, updateTeam, etc.
- Each mutation handles one concern with shallow validator
  </thinking>

````
</analysis>
</step>

<step number="2">
<task>Extract Domain Validators</task>

```typescript
// ✅ Create: validators.ts
import { v } from "convex/values";

// Basic project info validator
export const projectBasics = v.object({
  name: v.string(),
  description: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
});

// Project settings validator
export const projectSettings = v.object({
  wikiEnabled: v.boolean(),
  issuesEnabled: v.boolean(),
  discussionsEnabled: v.boolean(),
  cicdEnabled: v.boolean(),
  securityScanning: v.boolean(),
});

// Team structure validator
export const projectTeam = v.object({
  ownerId: v.id("users"),
  adminIds: v.array(v.id("users")),
  memberIds: v.array(v.id("users")),
  guestIds: v.array(v.id("users")),
});

// Milestone validator
export const milestone = v.object({
  name: v.string(),
  dueDate: v.number(),
  description: v.string(),
});

// Project schedule validator
export const projectSchedule = v.object({
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  milestones: v.array(milestone),
});
````

<why_this_works>
**Technical benefits:**

1. **Shallow nesting:**
   - Each validator is max 2 levels deep
   - No nested object validators
   - TypeScript handles each independently

2. **Reusability:**
   - `projectSettings` used in create AND update mutations
   - `milestone` validator reused in arrays
   - Consistent validation across mutations

3. **Modularity:**
   - Each validator represents a clear domain concept
   - Easy to modify without affecting others
   - Can be tested independently

**Practical benefits:**

- Easier to understand (each validator is focused)
- Easier to maintain (single source of truth)
- Easier to extend (add new validators without modifying existing)
- Better error messages (clear which validator failed)
  </why_this_works>
  </step>

<step number="3">
<task>Create Focused Mutations</task>

```typescript
// ✅ AFTER: Separate focused mutations
import {
  projectBasics,
  projectSchedule,
  projectSettings,
  projectTeam,
} from './validators'

// Mutation 1: Create project (basics only)
export const createProject = mutation({
  args: projectBasics,
  handler: async (ctx, args): Promise<Id<'projects'>> => {
    const projectId = await ctx.db.insert('projects', {
      ...args,
      // Set defaults for other fields
      settings: {
        wikiEnabled: true,
        issuesEnabled: true,
        discussionsEnabled: false,
        cicdEnabled: false,
        securityScanning: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return projectId
  },
})

// Mutation 2: Update settings (independent)
export const updateProjectSettings = mutation({
  args: {
    projectId: v.id('projects'),
    settings: projectSettings,
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.projectId, {
      settings: args.settings,
      updatedAt: Date.now(),
    })
  },
})

// Mutation 3: Update team (independent)
export const updateProjectTeam = mutation({
  args: {
    projectId: v.id('projects'),
    team: projectTeam,
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.projectId, {
      ...args.team,
      updatedAt: Date.now(),
    })
  },
})

// Mutation 4: Update schedule (independent)
export const updateProjectSchedule = mutation({
  args: {
    projectId: v.id('projects'),
    schedule: projectSchedule,
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.projectId, {
      ...args.schedule,
      updatedAt: Date.now(),
    })
  },
})
```

<benefits_comparison>
**Before vs After:**

| Aspect              | Before (Monolithic)  | After (Focused)             |
| ------------------- | -------------------- | --------------------------- |
| Mutations           | 1 complex            | 4 simple                    |
| Validator depth     | 3 levels             | 2 levels                    |
| Fields per mutation | 20+                  | 3-5                         |
| Reusability         | None                 | High                        |
| TS2589 risk         | High                 | Low                         |
| Flexibility         | Low (all-or-nothing) | High (update independently) |

**User experience improvement:**

- Before: Must provide all 20+ fields to create project
- After: Provide basics (3 fields), configure details later
- Better: Matches user's mental model (create → configure)
  </benefits_comparison>
  </step>

<step number="4">
<task>Update Client Code</task>

```typescript
// Client usage (before)
await createProject({
  project: {
    name: 'My Project',
    description: 'A great project',
    visibility: 'public',
    settings: {
      /* all 5 settings */
    },
    team: {
      /* all team members */
    },
    startDate: Date.now(),
    endDate: Date.now() + 1000000,
    milestones: [
      /* many milestones */
    ],
  },
})

// Client usage (after) - Progressive configuration
const projectId = await createProject({
  name: 'My Project',
  description: 'A great project',
  visibility: 'public',
})

await updateProjectSettings({
  projectId,
  settings: {
    wikiEnabled: true,
    issuesEnabled: true,
    discussionsEnabled: false,
    cicdEnabled: false,
    securityScanning: true,
  },
})

await updateProjectTeam({
  projectId,
  team: {
    ownerId: currentUser._id,
    adminIds: [admin1._id, admin2._id],
    memberIds: [],
    guestIds: [],
  },
})

// Better UX: Configure only what's needed, when it's needed
```

</step>
</refactoring_steps>

<validation>
**Validation checklist:**

1. **TypeScript compilation:**

```bash
npx tsc --noEmit
# Should show no TS2589 errors
```

2. **Validator reuse check:**

```bash
# Ensure validators are imported, not redefined
grep -r "projectSettings" convex/
# Should show import statements, not duplicate definitions
```

3. **Functional testing:**

```typescript
// Test focused mutations work correctly
test('can create and configure project progressively', async () => {
  const projectId = await createProject({
    /* basics */
  })
  await updateProjectSettings({
    projectId,
    settings: {
      /* ... */
    },
  })
  const project = await getProject({ projectId })
  expect(project.settings.wikiEnabled).toBe(true)
})
```

**Success criteria:**
✅ No single validator >10 fields
✅ No nesting >2 levels in validators
✅ Validators are reused across mutations
✅ No TS2589 errors
✅ Mutations are focused (single concern)
✅ Tests pass
</validation>
</strategy>

---

## Multi-Strategy Refactoring

<complex_cases>
<scenario name="Multiple Issues Combined">

**When TS2589 has multiple root causes:**

<diagnostic_process>

```xml
<thinking>
Complex scenario analysis:
1. Check for inline types → Need Strategy 3 (Type Extraction)
2. After extraction, check nesting depth → Need Strategy 1 (Schema Flattening)
3. After flattening, check unions → Need Strategy 2 (Union Simplification)
4. After simplification, check function complexity → Need Strategy 4 (Decomposition)
5. After decomposition, check validators → Need Strategy 5 (Validator Simplification)

Order matters:
- Start with Strategy 3 (Type Extraction) - reveals other issues
- Then Strategy 1 (Schema Flattening) - foundational types
- Then Strategy 2 (Union Simplification) - type system cleanup
- Then Strategy 4 (Decomposition) - implementation cleanup
- Finally Strategy 5 (Validator Simplification) - API cleanup

Expected iterations:
- 2-3 refactoring passes
- Test after each strategy application
- Re-run TypeScript check between passes
</thinking>
```

</diagnostic_process>

<execution_approach>
**Step 1: Apply Strategy 3 (Type Extraction)**

- Extract all inline types to types.ts
- Add explicit return types to all functions
- **Test:** `npx tsc --noEmit`

**Step 2: Re-analyze for remaining issues**

- Check types.ts for deep nesting
- Check for large unions
- Document findings

**Step 3: Apply Strategy 1 (Schema Flattening) if needed**

- Flatten nested types in types.ts
- Update references
- **Test:** `npx tsc --noEmit`

**Step 4: Apply Strategy 2 (Union Simplification) if needed**

- Simplify large unions
- Use composition
- **Test:** `npx tsc --noEmit`

**Step 5: Apply Strategies 4 & 5 for implementation**

- Decompose complex functions
- Simplify validators
- **Test:** Full test suite

**Step 6: Final validation**

- All strategies applied
- All tests pass
- No TS2589 errors
- Code is cleaner and more maintainable
  </execution_approach>
  </scenario>
  </complex_cases>

---

## Common Patterns Summary

<quick_reference>
| Issue Pattern | Strategy | Key Technique | Expected Outcome |
|--------------|----------|---------------|------------------|
| `v.object({ field: v.object({ ... })})` >3 deep | Schema Flattening | Separate tables or prefixes | ≤2 level depth |
| `type = "a" \| "b" \| "c" ...` >5 members | Union Simplification | Categorize or compose | ≤5 members per union |
| Inline `Promise<{ ... }>` in functions | Type Extraction | Create types.ts | Reusable, shallow types |
| Complex `users.map().filter().sort()` chains | Function Decomposition | Extract typed helpers | Testable, composable |
| Large `v.object({` with 20+ fields | Validator Simplification | Split by domain | Focused validators |
</quick_reference>

---

## Final Validation Checklist

<comprehensive_validation>
After completing any refactoring strategy:

**TypeScript Compilation:**

```bash
# Must pass with no TS2589 errors
npx tsc --noEmit
```

**Convex Deployment:**

```bash
# Must deploy successfully
npx convex dev
# Or for production:
npx convex deploy --prod
```

**Test Suite:**

```bash
# All tests must pass
pnpm test

# For specific test coverage:
pnpm test:coverage
# Aim for >80% coverage on refactored code
```

**Runtime Validation:**

- [ ] Manual testing in development
- [ ] Check logs for errors
- [ ] Verify data integrity
- [ ] Test edge cases

**Code Quality:**

- [ ] No type depth >3 levels
- [ ] No unions >5 members
- [ ] All functions have explicit return types
- [ ] Helper functions are reusable
- [ ] Code is more readable than before

**Documentation:**

- [ ] Update comments if behavior changed
- [ ] Document new types in types.ts
- [ ] Update API docs if mutations changed
- [ ] Add migration notes if needed
      </comprehensive_validation>

---

## Troubleshooting Guide

<troubleshooting>
**If TS2589 persists after refactoring:**

<problem name="Still seeing TS2589 after applying strategy">
<diagnosis>
Multiple root causes may exist. Run systematic check:

```bash
# 1. Check for remaining deep nesting
grep -r "v\.object" convex/schema.ts | grep -c "v\.object"
# If >3 per table, more flattening needed

# 2. Check for large unions
grep -r "type.*=" convex/ | grep "|" | wc -l
# Review each for >5 members

# 3. Check for missing return types
grep -r "handler.*async" convex/ | grep -v "Promise<"
# Add explicit types to all matches
```

</diagnosis>

<solution>
Apply strategies in order:
1. Type Extraction (Strategy 3) first
2. Then Schema Flattening (Strategy 1)
3. Then Union Simplification (Strategy 2)
4. Test after each step
</solution>
</problem>

<problem name="Refactored but tests are failing">
<diagnosis>
Type structure changed but implementation didn't update correctly.
</diagnosis>

<solution>
1. Check that data transformations match new types
2. Update test fixtures to match new structure
3. Verify database queries return expected shape
4. Add intermediate console.logs to debug
</solution>
</problem>

<problem name="Performance degraded after refactoring">
<diagnosis>
Separate table strategy (Strategy 1, Option B) may have added extra queries.
</diagnosis>

<solution>
1. Profile with `console.time()`
2. Consider batch loading related data
3. Add indexes for foreign keys
4. Use Convex's query caching
5. If critical, revert to flattened fields approach
</solution>
</problem>
</troubleshooting>

---

## Next Steps After Successful Refactoring

<post_refactoring>
**1. Set up Prevention Measures:**

```json
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

**2. Document Patterns:**
Create a CONTRIBUTING.md with:

- Type structure guidelines (max 3 levels)
- When to extract types to types.ts
- Union type size limits (max 5 members)
- Validator organization strategy

**3. Set Up CI Checks:**

```yaml
# .github/workflows/typecheck.yml
- name: TypeScript Check
  run: npx tsc --noEmit
- name: Schema Audit
  run: python scripts/audit_schema.py convex/schema.ts
```

**4. Train Team:**

- Share this refactoring guide
- Code review checklist for TS2589 prevention
- Pair programming sessions on new patterns

**5. Monitor:**

- Track TypeScript compilation time
- Watch for TS2589 in new PRs
- Review schema changes carefully
  </post_refactoring>
