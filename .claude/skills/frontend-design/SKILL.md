---
name: frontend-design
description: This skill should be used when the user asks to "create a component", "build a page", "design UI", "make it look good", or mentions frontend design, styling, visual design, or user interface aesthetics. Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

# Frontend Design

Guide for creating distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## PlayLI Design System

**PlayATS uses the PlayLI design system.** Before creating any new UI:

1. **Read the design language**: `.claude/skills/frontend-design/PLAYLI_V1_DESIGN_LANGUAGE.md`
2. **Check the catalog**: Visit `/design-system` (authenticated) to see all PlayDS components
3. **Use PlayDS wrappers**: All styling should use `src/components/playds/` components, not base UI primitives

### Available PlayDS Components

| Component        | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `PlaySurface`    | Card/panel wrapper with ring + shadow    |
| `PlayButton`     | Gradient buttons with tone variants      |
| `PlayTag`        | Pill-shaped badges/status indicators     |
| `PlayScoreTag`   | Match score display with color gradients |
| `PlayDivider`    | Subtle gradient separator                |
| `PlayScrollArea` | Scrollable area with fade overlays       |
| `PlayAvatar`     | Unified avatar with gradient fallbacks   |
| `PlayBanner`     | Dismissible alerts/notifications         |
| `PlayEmptyState` | Empty state with optional celebration    |
| `PlaySkeleton`   | Loading skeleton compound component      |
| `PlayInput`      | PlayLI-styled text input                 |
| `PlayTextarea`   | PlayLI-styled textarea                   |
| `PlaySelect`     | PlayLI-styled select dropdown            |

### Available Tones

- `brand` — Primary blue gradient
- `success` — Green gradient for affirmative actions
- `danger` — Red gradient for destructive actions
- `warning` — Amber gradient for caution states
- `info` — Sky blue for informational highlights
- `soft` / `neutral` — Muted secondary styling

### Motion Presets

Use `src/lib/motion.ts` for consistent animations:

```tsx
import { playSpring, playMotionClasses, playFadeSlide } from '@/lib/motion'
```

---

## Core Principles

- **Bold aesthetic choices** - Commit to a clear visual direction
- **Distinctive over generic** - Avoid cookie-cutter AI aesthetics
- **Context-aware** - Design for the specific use case and audience
- **Production-ready** - Functional code with meticulous detail
- **Use existing components** - Check PlayDS wrappers before creating new styling

## Design Thinking

### Understand Context

Before coding, clarify:

- What is this interface's purpose?
- Who is the target user?
- What's the brand/product personality?
- Technical constraints (Tailwind CSS v4, responsive, etc.)
- **Which PlayDS components apply?**

### Commit to Aesthetic Direction

For PlayATS: **Playful, casual, relaxed, gamified** — a parody of LinkedIn that's fun rather than corporate.

Key PlayLI aesthetics:

- Soft, "puffy" cards with big radii
- Gradient buttons with subtle lift on hover
- Rings + shadows instead of borders
- Deliberate motion (spring animations, tab indicators)
- Internal scroll regions with fade overlays

### Execute with Excellence

Implement working code that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with PlayLI design language
- Meticulously refined in every detail

Focus on:

- **Typography**: `font-display` (Bricolage Grotesque) for headers, `font-sans` (Figtree) for body
- **Color & Theme**: Use PlayLI tokens (`--play-brand-from`, `--play-success-to`, etc.)
- **Motion**: Use `playSpring`, `playMotionClasses`, and Framer Motion variants from `src/lib/motion.ts`
- **Spatial Composition**: Follow scroll architecture rules (min-h-0, flex-1, overflow-hidden)
- **Backgrounds & Details**: Soft gradients, subtle dot patterns, translucent surfaces

## Avoid

- Generic fonts (Arial, basic system-ui)
- Clichéd color schemes (generic blue/gray)
- Predictable layouts
- Inconsistent spacing
- Missing hover/focus states
- Harsh borders (use PlayDivider, rings, or spacing)
- Base UI primitives when PlayDS wrapper exists
- Creating custom styling that duplicates PlayDS functionality

## Quick Reference

```tsx
// ✅ Correct - use PlayDS
import { PlayButton, PlaySurface, PlayTag } from '@/components/playds'

<PlaySurface variant="card">
  <PlayButton tone="brand">Primary Action</PlayButton>
  <PlayTag tone="success">Status</PlayTag>
</PlaySurface>

// ❌ Wrong - don't style base primitives directly
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

<Card className="custom-card-styles">  // Don't do this
  <Button className="custom-button-styles">  // Use PlayButton instead
```

Remember: Claude is capable of extraordinary creative work within the PlayLI system. The design system provides constraints that enable consistency while still allowing creative expression in layout, composition, and micro-interactions.
