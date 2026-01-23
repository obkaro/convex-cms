---
name: frontend-design
description: This skill should be used when the user asks to "create a component", "build a page", "design UI", "make it look good", or mentions frontend design, styling, visual design, or user interface aesthetics. Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

# Frontend Design

Guide for creating distinctive, production-grade frontend interfaces for the convex-cms admin UI. Implement real working code with exceptional attention to aesthetic details while maintaining a professional, utilitarian aesthetic.

## CMS DS Design System

**convex-cms uses the CMS DS (CMS Design System).** Before creating any new UI:

1. **Read the design language**: `.claude/skills/frontend-design/CMS_DESIGN_SYSTEM.md`
2. **Use CMS DS wrappers**: All styling should use `admin/src/components/cmsds/` components, not base UI primitives
3. **Follow the principles**: Professional, Clean, Content-First

### Available CMS DS Components

| Component | Purpose |
| --------- | ------- |
| `CmsButton` | Button with variants (primary, secondary, danger, ghost) |
| `CmsSurface` | Card/container with elevation levels |
| `CmsStatusBadge` | Entry status indicator (draft, published, scheduled, archived) |
| `CmsField` | Form field wrapper with label/error/description |
| `CmsEmptyState` | Empty state with icon, title, description, action |
| `CmsPageHeader` | Page title with breadcrumb and actions |
| `CmsToolbar` | Filter/action bar for list pages |
| `CmsSidebar` | Navigation sidebar |
| `CmsDropdown` | Action menu wrapper |
| `CmsTable` | Data table with selection |
| `CmsDialog` | Modal dialog wrapper |

### Available Variants

**Button variants:**
- `primary` — Solid indigo for primary CTA
- `secondary` — Zinc background for secondary actions
- `danger` — Red for destructive actions
- `ghost` — No background for tertiary actions

**Status badges:**
- `draft` — Amber for unpublished content
- `published` — Emerald for live content
- `scheduled` — Light Blue for future publish
- `archived` — Gray for archived content

### Motion Presets

Use `admin/src/lib/motion.ts` for consistent animations:

```tsx
import { motion, animationClasses } from '@/lib/motion'

// Timing presets
motion.fast   // 100ms - button press, toggles
motion.base   // 200ms - hover states, panels
motion.smooth // 300ms - modal enter/exit

// Animation classes
animationClasses.fadeIn
animationClasses.slideUp
```

---

## Core Principles

- **Content-first** — UI fades into background, content stands out
- **Information density** — Compact but readable, maximize screen real estate
- **Consistent surfaces** — Subtle borders and shadows, not visual noise
- **Purposeful motion** — Responsive feedback, never decorative
- **Neutral palette** — Gray-based colors that don't compete with content

## Design Direction

For convex-cms: **Professional, Clean, Utilitarian** — a focused admin interface where content management is effortless.

Key CMS DS aesthetics:
- Clean typography with Inter font
- Neutral gray palette with subtle accents
- Subtle shadows and borders
- Compact spacing for information density
- Fast, purposeful transitions

### Execute with Excellence

Implement working code that is:
- Production-grade and functional
- Consistent with CMS DS design language
- Accessible and keyboard-navigable
- Responsive across screen sizes

Focus on:
- **Typography**: Inter for all text, 14px base size
- **Color**: Zinc palette, indigo accents for interactive states
- **Spacing**: Compact but breathable (p-4 to p-6 for cards)
- **Borders**: Subtle zinc-200 borders, shadow-sm for elevation

## Avoid

- Colorful gradients or heavy branding
- Heavy shadows creating artificial depth
- Decorative animations or transitions
- Low information density with excessive whitespace
- Base UI primitives when CMS DS wrapper exists
- Custom styling that duplicates shadcn functionality

## Quick Reference

```tsx
// Correct - use CMS DS
import { CmsButton, CmsSurface, CmsStatusBadge } from '@/components/cmsds'

<CmsSurface elevation="base" padding="md">
  <CmsStatusBadge status="published" />
  <CmsButton variant="primary">Save Changes</CmsButton>
</CmsSurface>

// Wrong - don't style base primitives directly
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

<Card className="custom-card-styles">  // Don't do this
  <Button className="custom-button-styles">  // Use CmsButton instead
```

## Component Creation Checklist

When creating new components:

1. [ ] Check if a CMS DS wrapper exists first
2. [ ] If not, consider if it should become a wrapper
3. [ ] Use Tailwind utilities, not custom CSS
4. [ ] Include dark mode support
5. [ ] Add proper TypeScript types
6. [ ] Test keyboard navigation
7. [ ] Verify responsive behavior

Remember: The CMS design system prioritizes usability over aesthetics. Keep the UI invisible—let content be the focus.
