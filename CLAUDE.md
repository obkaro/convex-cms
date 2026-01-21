# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@convex-cms/core` - a headless CMS built as a Convex Component. It provides content management with typed fields, versioning, publishing workflows, media management, RBAC, and AI-agent integration. Always use context7 mcp to get up to date docs on convex component authoring, convex patterns, tanstack start, react, and any other library in use.

**Key architectural concept**: This is a Convex Component, meaning it runs in an isolated sandbox with its own database tables. The component cannot access `ctx.auth` or the parent app's tables directly - all user context must be passed explicitly to component functions.

**Target users**: Solo developers, agencies, startups, enterprise teams, and AI/agent developers. See `.automaker/context/user-types-and-use-cases.md` for detailed personas and use cases.

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

### Directory Structure

```
src/
├── component/           # Convex Component (runs in isolated sandbox)
│   ├── convex.config.ts # Component definition (defineComponent)
│   ├── schema.ts        # Database tables (11 tables, isolated from parent app)
│   ├── validators.ts    # Convex validators for all operations
│   ├── index.ts         # Internal exports for component
│   ├── *Mutations.ts    # Mutation functions (contentEntryMutations, etc.)
│   ├── *.ts             # Query functions and utilities
│   └── lib/             # Internal utilities (slugGenerator, referenceResolver, etc.)
├── client/              # NPM package exports (what developers import)
│   ├── index.ts         # Main entry: createCmsClient, validators, utilities
│   ├── wrapper.ts       # Typed API wrapper classes (ContentTypesApi, etc.)
│   ├── types.ts         # TypeScript types for external use
│   ├── queryBuilder.ts  # Fluent query builder for content queries
│   └── agentTools.ts    # @convex-dev/agent tool definitions
└── test.ts              # Test helpers for convex-test registration

admin/                   # React Admin UI (TanStack Router + Vite)
├── convex/              # Admin's Convex config (uses the CMS component)
├── src/
│   ├── routes/          # TanStack Router file-based routes
│   ├── components/      # React components including field renderers
│   └── contexts/        # Auth context for pluggable authentication
```

### Find Component Tables (in `schema.ts`)

### Client Wrapper Pattern

The component exposes raw Convex functions, but developers use a typed wrapper:

```typescript
// Developer creates a CMS client with configuration
const cms = createCmsClient(components.convexCms, {
  defaultLocale: "en-US",
  features: { versioning: true },
  getUserRole: async ({ userId }) => "editor",  // Maps app users to CMS roles
});

// Typed methods wrap component function calls
await cms.contentTypes.create(ctx, { name: "blog_post", ... });
await cms.contentEntries.publish(ctx, { id: entryId });
```

### Authorization Flow

Since components can't access `ctx.auth`, authorization works via hooks:

1. **getUserRole hook**: Developer provides function mapping userId → CMS role
2. **Authorization hooks**: Optional beforeRbac/afterRbac/authorize hooks for custom logic
3. **RBAC check**: Built-in roles (admin/editor/author/viewer) with permissions
4. **Rate limiting hooks**: Optional rate limiting via parent app

**Important**: Authorization is enforced by default - operations fail without `getUserRole` configured. Use `permissiveMode: true` for development without authorization.

### Package Exports

```
@convex-cms/core
├── ./                    → createCmsClient, validators, all utilities
├── ./convex.config       → Component definition for app.use()
├── ./types               → TypeScript types
├── ./_generated/component → Generated API types
└── ./test                → Test helpers for convex-test
```

## Key Patterns

### Field Types

Supported field types: `text`, `richText`, `number`, `boolean`, `date`, `datetime`, `reference`, `media`, `json`, `select`, `multiSelect`

Each has validators in `validators.ts` and runtime validation in `validation.ts`.

### Content Status Flow

`draft` → `published` (via publish mutation)
`published` → `draft` (via unpublish mutation)
`draft` → `scheduled` (via schedule mutation) → auto-publishes at scheduled time

### Soft Delete Pattern

All deletions are soft by default (sets `deletedAt` timestamp). Hard delete available with `hardDelete: true`. Trash system with configurable retention and restore capability.

### Version Snapshots

Created automatically on publish. Rollback creates a new version with old content state (preserves history).

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
