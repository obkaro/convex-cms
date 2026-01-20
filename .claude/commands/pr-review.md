---
description: Review a GitHub pull request against convex-cms standards. Use when you need to "review PR", "check pull request", or "code review #123".
argument-hint: "<pr-number> - e.g., '42' or '#42'"
allowed-tools: Read, Glob, Grep, Bash(gh pr:*), Bash(gh api:*), Bash(git diff:*)
---

# PR Review

Review: $ARGUMENTS

## Steps

1. Get PR details: `gh pr view $ARGUMENTS`
2. Get diff: `gh pr diff $ARGUMENTS`
3. Apply checklist from `.claude/agents/code-reviewer.md`

## Review Structure

### 1. Context Gathering
- Read PR description and linked issues
- Understand the intent before reviewing code

### 2. Review Categories

**Critical (must fix):**
- Security vulnerabilities
- Data loss risks
- Breaking changes without migration
- Logic errors

**Warning (should fix):**
- Missing error handling
- Performance concerns
- Convention violations
- Missing tests for new code

**Suggestion (consider):**
- Code clarity improvements
- Alternative approaches
- Documentation gaps

### 3. Convex-CMS Specific Checks

- Component: `returns` validators, user context via args (not ctx.auth), helper functions
- Client wrapper: typed API methods match component functions
- TypeScript: No `any`, proper `Id<>` types
- Tests: convex-test patterns, proper assertions

## Output Format

```
## PR Review: #42

### Summary
[1-2 sentence overview of changes]

### Critical Issues
- [ ] file.ts:42 - Description of critical issue

### Warnings
- [ ] auth.ts:15 - Description of warning

### Suggestions
- Consider extracting helper function for reuse

### Verdict
[ ] Approve | [x] Request Changes | [ ] Comment
```
