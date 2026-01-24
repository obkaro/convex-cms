# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `convex-cms` - a headless CMS built as a Convex Component. It provides content management with typed fields, versioning, publishing workflows, media management, RBAC, and AI-agent integration. Always use context7 mcp to get up to date docs on convex component authoring, convex patterns, tanstack start, react, and any other library in use. Use the skills available to you always. Consult the design system docs and the frontend-design skill for all frontend changes.

**Key architectural concept**: This is a Convex Component, meaning it runs in an isolated sandbox with its own database tables. The component takes a developer first approach to a CMS.

**Target users**: Solo developers, agencies, startups, enterprise teams, and AI/agent developers. See `.automaker/context/user-types-and-use-cases.md` for detailed personas and use cases. See docs for additional documentation.

IMPORTANT: Avoid excessive and unneccessary comnmenting. Let your code be readable enough on its own.

## Common Commands

```bash
# Development - runs component codegen + TypeScript build + example app
npm run dev

# Run tests (uses vitest with convex-test)
npm test

# Run a single test file
npx vitest src/component/roles.test.ts

# Run tests matching a pattern
npx vitest -t "hasPermission"

# Build for publishing
npm run build

# Type checking
npm run typecheck

# Lint
npm run lint

# Generate Convex types for the component
npx convex codegen --component-dir ./src/component
```

### Admin UI Development

```bash
cd admin
npm run dev          # Runs Convex dev + Vite
npm run build        # Build for production
```

## Architecture

### Package Exports

```
convex-cms
├── ./                    → createCmsClient, validators, all utilities
├── ./convex.config       → Component definition for app.use()
├── ./types               → TypeScript types
├── ./_generated/component → Generated API types
└── ./test                → Test helpers for convex-test
```


## Testing

Uses `convex-test` for testing Convex functions:

```typescript
import { convexTest } from "convex-test";
import schema from "./schema";

const t = convexTest(schema);

test("example", async () => {
  await t.run(async (ctx) => {
    // Test mutations and queries
  });
});
```

Component provides test helpers via `/test` export for registration.

## Convex Component Constraints

- Cannot access `ctx.auth` - user context must be passed as function arguments
- Cannot read parent app's environment variables - pass as arguments
- HTTP actions must be mounted by parent app in `convex/http.ts`
- Use `convex-helpers` paginator instead of built-in `.paginate()` for pagination
- All public functions need explicit validators using `v.*`

## Convex Function Guidelines

**Key rules:**
- ALWAYS include `args` and `returns` validators for all functions
- Use `internalQuery`/`internalMutation`/`internalAction` for private functions
- Do NOT use `.filter()` in queries - use `.withIndex()` instead
- Index fields must be queried in the same order they are defined

See `.claude/skills` and `.automaker/context/convex_rules.mdc` for comprehensive Convex guidelines.

## Type Safety Guidelines

### Before Committing Code

Always run these checks:
```bash
npm run typecheck  # Must pass with 0 errors
npm run lint       # Must pass with 0 errors
npm test          # Tests must pass
```

### Import Best Practices

- **Type-only imports**: Use `import type { X }` for types not used at runtime
- **Avoid Type Duplication** Avoid manually recreating types. Import infer and extend existing ones where needed instead.
- **Unused parameters**: Prefix with underscore (e.g., `_ctx`, `_args`)
- **Remove unused imports**: Delete imports that are no longer used
- **Internal vs public API**: Use `internal` object for internal functions, `api` for public functions

### Switch Statement Best Practices

Always wrap case blocks containing variable declarations in braces:
```typescript
// ✗ Bad - causes "Unexpected lexical declaration in case block"
switch (x) {
  case 'a':
    const value = 1;
    break;
}

// ✓ Good - proper block scope
switch (x) {
  case 'a': {
    const value = 1;
    break;
  }
}
```

### Test File Best Practices

- Test variables used only for type assertions should be prefixed with `_` (e.g., `const _blogPost = defineContentType(...)`)
- Mock objects must include all required properties of the type they mock
- When testing status changes, use typed variables instead of literal types to avoid TypeScript narrowing issues:
  ```typescript
  // ✗ Bad - TypeScript narrows the type
  const entry = { status: "draft" as const };
  entry.status = "published";  // Error!

  // ✓ Good - status can be reassigned
  let entry: { status: string } = { status: "draft" };
  entry = { ...entry, status: "published" };  // OK
  ```

## Key Project Documentation

- `.automaker/app_spec.txt` - Full project specification with all features
- `.automaker/context/user-types-and-use-cases.md` - Target users, use cases, user journeys
- `.automaker/context/convex-authoring-components.md` - Component authoring patterns
- `.automaker/context/convex-using-components.md` - Component usage patterns
- `.automaker/context/convex_rules.mdc` - Convex coding guidelines and examples

## Claude Code Configuration

IMPORTANT - Use claude skills whenever possible. This project includes Claude Code skills and commands in `.claude/`:

### Skills

| Skill | Path | Purpose |
|-------|------|---------|
| convex-patterns | `.claude/skills/convex-patterns/` | Convex component patterns |
| convex-types | `.claude/skills/convex-types/` | TS2589 prevention |
| tanstack-start | `.claude/skills/tanstack-start/` | Admin UI routing patterns |
| documentation | `.claude/skills/documentation/` | Documentation writing |
| skill-creation | `.claude/skills/skill-creation/` | Creating new skills |

### Commands

| Command | Description |
|---------|-------------|
| `/convex-function` | Create a new Convex function |
| `/onboard` | Explore codebase for a task |
| `/new-route` | Create a new admin UI route |
| `/pr-review` | Review a pull request |
| `/pre-commit` | Run checks before committing |

### Hooks

- **Branch protection** - Blocks edits on `main` branch
- **Auto-format** - Prettier on `.ts/.tsx` files
- **Auto-deps** - `npm install` on `package.json` change
- **Convex codegen** - Regenerates types on `src/component/*` changes (non-blocking)
