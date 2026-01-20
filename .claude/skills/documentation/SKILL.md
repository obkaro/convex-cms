---
name: documentation
description: This skill should be used when the user asks to "create documentation", "write docs", "add an ADR", "document a feature", "create user flow", "add use case", "document jobs to be done", "add persona", "write a ticket", "create an issue", or mentions documentation, technical decisions, diagrams, user flows, use cases, JTBD, personas, or implementation tickets.
---

# Documentation

Guide for creating and maintaining documentation across local markdown files and GitHub issues.

## Core Principles

1. **Explore first, document second** - Quality docs come from deep understanding, not surface-level summaries
2. **Local markdown is primary** - Documentation lives in the repo, versioned with code
3. **Encourage exploration** - Agent implementing should always explore and treat current code as source of truth since code state could change between ticket creation and implementation
4. **Visual-first** - Diagrams and tables over prose and raw code. Flowcharts explain processes better and allow the agent explore for themselves
5. **Concepts over code** - Describe "what" and in some cases "why", link to source files instead of pasting code
6. **Cross-reference everything** - Link to source files, GitHub issues, and related docs

## Before Writing Implementation Tickets

**Explore first, document second.** Quality tickets come from deep understanding.

| Step                        | Purpose                                             | Tools                       |
| --------------------------- | --------------------------------------------------- | --------------------------- |
| Read related GitHub issues  | Understand context, prior decisions                 | GitHub CLI, web UI          |
| Explore the codebase        | Understand current architecture                     | Explore agents, Grep, Read  |
| Identify integration points | What existing code will this touch?                 | Grep for imports/usages     |
| Find the gotchas            | What's non-obvious that could trip up implementers? | Read implementation details |

Only after exploration should you write the ticket.

## Implementation Ticket Structure

Every non-trivial implementation ticket should include:

| Section              | Purpose                                  | Required?               |
| -------------------- | ---------------------------------------- | ----------------------- |
| Overview/Goal        | Why this work matters, what it enables   | Yes                     |
| User Stories         | Who benefits and how (when user-facing)  | When applicable         |
| What Needs to Happen | High-level steps, not micro-instructions | Yes                     |
| Gotchas & Pitfalls   | Specific warnings from exploration       | Yes (for complex work)  |
| Files to Reference   | Entry points, patterns to follow         | When neccessary         |
| Acceptance Criteria  | Outcome-focused, not task-focused        | Yes                     |
| Out of Scope         | Clear boundaries                         | When scope is ambiguous |
| Related Issues       | Links to parent, siblings, dependencies  | Yes                     |

### Gotchas & Pitfalls Section

Every non-trivial ticket should warn about non-obvious issues:

**Good gotcha (specific, actionable):**

> Components cannot access `ctx.auth` - user context must be passed as function arguments.

**Bad gotcha (vague, unhelpful):**

> Be careful with the authorization.

Gotchas typically cover:

- Required parameters that aren't obvious
- Data format differences (ISO dates vs Unix timestamps)
- Edge cases that break assumptions
- Integration quirks discovered during exploration

### Options with Recommendations

When multiple approaches exist:

**Option A: [Name]**

- How it works
- Pros/Cons

**Option B: [Name]**

- How it works
- Pros/Cons

**Recommendation:** Option B because [specific reason].

Always make a recommendation. Implementers can disagree, but starting with a recommendation saves time.

### Migration & Rollback Sections

For changes affecting existing data or behavior:

**Existing Data:**

- What happens to data created before this change?
- Options: Leave as-is, backfill, ignore (with rationale)

**Rollback Plan:**

- How to revert if issues arise
- What data/state survives rollback

## Breaking Into Sub-Issues

Break parent issues into sub-issues when:

- Implementation has **distinct phases** with natural boundaries
- One phase could be tested/shipped independently
- Different phases have different risk profiles

**Structure:**

```
Parent Issue:
- Overview, goals, architecture target
- Sub-issue table with links
- Dependency diagram

Sub-Issues:
- Focused scope
- Dependencies stated explicitly
- Own acceptance criteria
- "Out of Scope" references other sub-issues
```

**Dependency notation:**

```
#72 ──▶ #73 ──▶ #74
                  │
       #75 ◀─────┘ (parallel)
```

## Code References

Include file paths for:

- **Files to modify** - Where changes will be made
- **Files to reference** - Patterns to follow, context to understand
- **Specific line ranges** - Only for non-obvious entry points

**Good:**

> Current authorization logic: `src/component/authorization.ts` (lines 45-80 for permission checks)

**Avoid:**

> Listing every file in the codebase touched by this feature

## Location Strategy

| Type                        | Location                 | Rationale                             |
| --------------------------- | ------------------------ | ------------------------------------- |
| Implementation tickets      | GitHub Issues            | Team visibility, workflow integration |
| User Flows, Use Cases, JTBD | Local `docs/`            | Versioned with code                   |
| ADRs                        | Local `docs/decisions/`  | Code-synced                           |
| Claude instructions         | `CLAUDE.md`, `.claude/`  | Auto-loaded by Claude Code            |
| API documentation           | Local `docs/api/`        | Versioned with code                   |

## Visual Hierarchy

**Use diagrams for:**

- **ASCII diagrams** for architecture, data flow
- **Tables** for comparisons, field mappings, options
- **Mermaid** for complex architecture, flows, and sequences
- **Bullets** for requirements, trade-offs

**Avoid UI layout diagrams** - Only draw wireframes, component layouts, or screen mockups in tickets where truly necessary. UI can be covered through:

- Innovative combinations utilizing existing component libraries - shadcn, registeries
- Existing components in the codebase
- Design system patterns
- Implementer judgment based on context

Note that UI mockups in tickets tend to over-constrain implementation and can become outdated quickly.

## ADR Format

Architecture Decision Records in `docs/decisions/`:

```
## ADR-XXX: Decision Title
**Status:** Proposed | Accepted | Deprecated | Superseded
**Context:** What problem prompted this?
**Decision:** What was decided?
**Rationale:** Why this over alternatives?
**Consequences:** What trade-offs follow?
```

## Common Mistakes

1. **Writing without exploring** - Tickets based on assumptions, not understanding
2. **Not encouraging the implementer to explore** - Code state could change between ticket creation and implementation
3. **Missing gotchas** - Implementer discovers issues that could have been documented
4. **Vague warnings** - "Be careful" instead of specific, actionable guidance
5. **Options without recommendations** - Presenting choices without guidance
6. **No migration plan** - Forgetting existing data when changing schemas
7. **Monolithic tickets** - Single huge ticket instead of phased sub-issues
8. **Code dumps** - Pasting implementations instead of linking to source files
9. **Over-prescription** - Step-by-step instructions instead of goals + guidance
10. **Orphaned docs** - No links to/from related docs, issues, source files
