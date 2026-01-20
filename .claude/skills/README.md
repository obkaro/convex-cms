# Claude Code Skills

Project-specific skills for the convex-cms codebase.

## Skills

### Backend (Component)

| Skill                                         | Description                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| [convex-patterns](./convex-patterns/SKILL.md) | Convex queries, mutations, validators, access control, database best practices |
| [convex-types](./convex-types/SKILL.md)       | TS2589 prevention, type complexity, schema audits                              |

**Note:** `convex-patterns` includes detailed references in `convex-patterns/references/` for database, access control, and validator patterns. Component-specific: uses user context via args (not `ctx.auth`).

### Frontend (Admin UI)

| Skill                                         | Description                                                |
| --------------------------------------------- | ---------------------------------------------------------- |
| [tanstack-start](./tanstack-start/SKILL.md)   | File-based routing, navigation, params, Convex integration |
| [frontend-design](./frontend-design/SKILL.md) | Visual design, typography, color, components               |

**Note:** Frontend skills apply to the **admin UI** in `admin/`, not the main component library.

### Meta

| Skill                                       | Description                                 |
| ------------------------------------------- | ------------------------------------------- |
| [skill-creation](./skill-creation/SKILL.md) | Guide for creating new skills               |
| [documentation](./documentation/SKILL.md)   | Doc locations, diagrams, ADRs               |

## Common Tasks

| Task                        | Skills                                                  | Context           |
| --------------------------- | ------------------------------------------------------- | ----------------- |
| New component function      | convex-patterns                                         | `src/component/`  |
| Add authorization hook      | convex-patterns (references/access-control.md)          | `src/component/`  |
| Optimize queries            | convex-patterns (references/database-best-practices.md) | `src/component/`  |
| TS2589 error                | convex-types                                            | Any               |
| Schema audit                | convex-types                                            | `src/component/`  |
| New admin UI page           | tanstack-start → frontend-design                        | `admin/src/`      |
| UI design/styling           | frontend-design                                         | `admin/src/`      |
| Create/update documentation | documentation                                           | `docs/`, `CLAUDE.md` |
| Add ADR                     | documentation                                           | `docs/decisions/` |

## Adding Skills

1. Create `.claude/skills/skill-name/SKILL.md`
2. Add YAML frontmatter with `name` and `description`
3. Keep content concise (1,500-2,000 words max)
4. Add to this README
