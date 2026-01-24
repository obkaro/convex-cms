---
description: Create atomic git commits with conventional formatting. Use when you need to "commit changes", "save my work", or "create a commit".
argument-hint: "[message] - optional commit message hint"
allowed-tools: Bash(git:*), Bash(npm:*)
---

# Create Commit

Context: $ARGUMENTS

## Pre-Commit Analysis

1. **Check status**: Run `git status` to see staged/unstaged changes
2. **Review history**: Run `git log -5 --oneline` to match project's commit style
3. **Show diff**: Run `git diff --cached` (staged) or `git diff` (unstaged)
4. **Review changes thorougly**: Review all the changes and updates fully.

## Red Flag Detection

Before committing, check for:
- [ ] No secrets/credentials (`.env`, API keys, tokens)
- [ ] No TODO/FIXME comments marking unfinished work
- [ ] No commented-out code blocks
- [ ] No `console.log` or debug statements
- [ ] No test-only flags left enabled

If any found, warn the user before proceeding.

## Logical Commit Grouping

**Atomic Commit Principles:**
- Each commit should serve a single purpose
- Each commit should leave the codebase in a working state
- Separate concerns: formatting vs logic vs tests

**When changes span multiple concerns:**
1. Use `git add -p` for interactive staging
2. Create separate commits for each logical unit
3. Order: infrastructure → logic → tests → docs

**Grouping heuristics:**
- Same file type + same purpose → one commit
- Refactoring + new feature → separate commits
- Bug fix + test for that fix → one commit

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>
```

**Types:**
| Type | Use When |
|------|----------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (not CSS) |
| `build` | Dependencies, build config |
| `chore` | Maintenance, tooling |

**Subject line rules:**
- 50 characters max
- Imperative mood ("Add feature" not "Added feature")
- Capitalize first letter, no period at end
- Explain WHAT, not HOW

**Scope:** Infer from changed files (e.g., `auth`, `media`, `schema`)

## Workflow

1. Run pre-commit checks (lint, typecheck, format)
2. Stage relevant files with `git add`
3. Generate commit message based on diff analysis
4. Show proposed message and ask for confirmation
5. Create commit with `git commit`
6. Display commit hash and summary

## Output

```
Pre-commit checks:
✓ Lint passed
✓ Types OK
✓ Formatted

Proposed commit:
  feat(media): add variant generation for thumbnails

  - Add generateVariant helper in lib/mediaProcessing.ts
  - Update media mutations to trigger variant creation
  - Add tests for variant generation flow

Proceed? [Y/n]
```
