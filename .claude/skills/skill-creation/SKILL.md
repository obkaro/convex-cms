---
name: skill-creation
description: This skill should be used when the user asks to "create a skill", "add a new skill", "write a skill", or mentions Claude Code skills, custom instructions, or project-specific guidance.
---

# Claude Code Skill Creation

Guide for creating effective Claude Code skills.

## Core Principles

- **Third-person descriptions** - Use "This skill should be used when..." in frontmatter
- **Concise content** - Optimal length is 1,500-2,000 words
- **Official docs as source** - Don't derive patterns from potentially incorrect codebase
- **Progressive disclosure** - Start with common patterns, add complexity gradually

## Skill Structure

```markdown
---
name: skill-name
description: This skill should be used when the user asks to "trigger phrase 1", "trigger phrase 2", or mentions keywords.
---

# Skill Title

Brief introduction (1-2 sentences).

## Core Principles

Key guidelines (3-5 bullet points)

## Basic Patterns

Most common use cases with code examples

## Quick Reference

Tables for rapid lookup

## Common Mistakes

Pitfalls to avoid (3-5 items)
```

## Writing Descriptions

The description determines when Claude suggests the skill.

```yaml
# Good - specific triggers
description: This skill should be used when the user asks to "build a form", "add validation", or mentions forms, Zod schemas.

# Bad - too vague
description: For form-related tasks
```

## File Location

```
.claude/skills/skill-name/SKILL.md
```

## Common Mistakes

1. **Too verbose** - Keep to 1,500-2,000 words; link to docs
2. **Codebase-derived patterns** - Use official documentation
3. **Missing trigger phrases** - Include phrases users might say
4. **No common mistakes section** - Prevents repeated errors
