---
description: Run lint, codegen, and format checks before committing. Use when you need to "check before commit", "run pre-commit", or "validate changes".
allowed-tools: Bash(npm:*), Bash(npx:*)
disable-model-invocation: true
---

# Pre-Commit Check

Run these project-specific checks:

```bash
npm run lint
npx convex codegen --component-dir ./src/component
npm run format
```

## Checklist Output

Report results as:

```
Pre-commit verification:
✓ Lint: No errors
✓ Codegen: Types up to date
✓ Format: All files formatted
✗ Issue: [description if any]
```

If errors found, show specific file:line and suggest fix.

This complements the `/commit` command for creating commits.
