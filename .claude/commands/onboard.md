---
description: Explore the codebase to understand a task before implementation. Use when you need to "understand this feature", "explore the code", or "prepare for a ticket".
argument-hint: "<task> - e.g., 'implement media variants'"
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git show:*)
context: fork
---

# Onboard

Context: $ARGUMENTS

## Instructions

1. **Understand the request** - What exactly needs to be done?
2. **Explore the codebase** - Find related files and patterns
3. **Check schema** - `src/component/schema.ts` for relevant tables
4. **Check existing patterns** - How do similar features work?
5. **Ask questions** - If anything is unclear, ask before proceeding

## Investigation Checklist

- [ ] Identified entry points (where does this feature start?)
- [ ] Found related tests (what behavior is expected?)
- [ ] Checked schema for relevant tables
- [ ] Found similar patterns to follow
- [ ] Listed files that need modification
- [ ] Identified potential breaking changes

## Output

Summarize:

1. **Task Understanding**: What needs to be built
2. **Files to Change**: List of files that will be modified
3. **Patterns to Follow**: Existing code to use as reference
4. **Questions**: Anything that needs clarification
