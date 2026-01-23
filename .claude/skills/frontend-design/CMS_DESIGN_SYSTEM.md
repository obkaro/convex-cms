## CMS DS - Design Language v1.0

**Status**: v1.0 (Initial specification)
**Last updated**: 2026-01-23
**Stack**: TanStack Start + TanStack Router, Convex, Tailwind CSS v4, shadcn/ui
**Hard rule**: Do **not** modify base primitives in `admin/src/components/ui/` for styling—build wrappers in `admin/src/components/cmsds/` and migrate screens to those wrappers.

This document is the single source of truth for the CMS DS aesthetic: **Professional, Clean, Content-First**—a utilitarian admin interface where the UI fades into the background and content takes center stage.

---

## Concept & Principles

### North Star

- **Content-first**: The CMS UI should be invisible—users focus on their content, not the interface
- **Information density**: Compact but readable, maximizing screen real estate for data
- **Consistent surfaces**: Subtle, uniform card styling without visual noise
- **Purposeful motion**: Responsive feedback, never decorative animation
- **Neutral palette**: Gray-based colors that don't compete with content

### Design Influences

- Linear (clean typography, dense information)
- Notion (neutral palette, content-forward)
- Vercel Dashboard (professional, minimal)
- Stripe Dashboard (polished forms, clear hierarchy)

### Anti-patterns (Avoid)

- Colorful gradients or branded accents that dominate the UI
- Heavy shadows creating artificial depth
- Decorative animations or transitions
- Low information density with excessive whitespace
- Custom styling when shadcn primitives suffice

---

## Where the System Lives

### Tokens / Theme

- `admin/src/styles/globals.css`
  - Tailwind v4 `@theme` block with CMS color tokens
  - Base layer styles for body, borders

### Utility Functions

- `admin/src/lib/cn.ts`
  - `clsx` + `tailwind-merge` utility
- `admin/src/lib/motion.ts`
  - Animation presets: `motion.fast`, `motion.base`, `motion.smooth`
  - Animation classes: `animationClasses.fadeIn`, etc.

### CMS DS Wrappers (do not edit `/ui/` for styling)

**Core Components:**
- `CmsButton` — Button with CMS variants (primary, secondary, danger, ghost)
- `CmsSurface` — Card/container with elevation levels
- `CmsStatusBadge` — Entry status indicator
- `CmsField` — Form field wrapper with label/error/description
- `CmsEmptyState` — Empty state pattern
- `CmsPageHeader` — Page title with breadcrumb and actions
- `CmsToolbar` — Filter/action bar for list pages
- `CmsSidebar` — Navigation sidebar
- `CmsDropdown` — Action menu wrapper
- `CmsTable` — Data table with selection
- `CmsDialog` — Modal dialog wrapper

---

## Color Palette

### Gray Scale (Primary)

The neutral gray palette is the foundation. Use zinc scale for consistency with shadcn defaults.

```css
@theme {
  --color-cms-gray-50: oklch(98.5% 0.002 286);   /* Backgrounds */
  --color-cms-gray-100: oklch(96.5% 0.003 286);
  --color-cms-gray-200: oklch(92% 0.004 286);    /* Borders */
  --color-cms-gray-300: oklch(87% 0.005 286);
  --color-cms-gray-400: oklch(70% 0.006 286);    /* Placeholder text */
  --color-cms-gray-500: oklch(55% 0.006 286);    /* Secondary text */
  --color-cms-gray-600: oklch(45% 0.006 286);
  --color-cms-gray-700: oklch(35% 0.005 286);    /* Primary text */
  --color-cms-gray-800: oklch(25% 0.004 286);
  --color-cms-gray-900: oklch(15% 0.003 286);    /* Sidebar, dark elements */
  --color-cms-gray-950: oklch(10% 0.002 286);
}
```

### Semantic Colors

Use sparingly—only for status indication and interactive feedback.

| Token | Usage | Light | Dark |
|-------|-------|-------|------|
| `cms-accent` | Focus rings, selected states | `indigo-600` | `indigo-400` |
| `cms-success` | Published, positive actions | `emerald-600` | `emerald-400` |
| `cms-warning` | Draft, caution states | `amber-600` | `amber-400` |
| `cms-error` | Errors, destructive actions | `red-600` | `red-400` |
| `cms-info` | Informational, scheduled | `blue-600` | `blue-400` |

### Surface Hierarchy

| Surface | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| Background | `zinc-50` | `zinc-950` | Page background |
| Surface | `white` | `zinc-900` | Cards, panels |
| Surface Elevated | `white` | `zinc-900` | Modals, dropdowns |
| Sidebar | `zinc-900` | `zinc-950` | Navigation sidebar |

---

## Typography

### Font Stack

```css
--font-sans: "Inter var", ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
```

### Type Scale

CMS uses a compact scale optimized for information density:

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| `text-xs` | 12px | 1.5 | Timestamps, metadata |
| `text-sm` | 13px | 1.5 | Secondary labels, table cells |
| `text-base` | 14px | 1.5 | **Default** body text |
| `text-lg` | 16px | 1.5 | Section headers |
| `text-xl` | 18px | 1.4 | Card titles |
| `text-2xl` | 24px | 1.3 | Page titles |
| `text-3xl` | 30px | 1.2 | Dashboard stats |

### Guidelines

- Use `font-medium` (500) for labels and headers
- Use `font-semibold` (600) sparingly for emphasis
- Body text stays at regular weight (400)
- Code blocks use `font-mono`
- Keep headings tight with default tracking

---

## Spacing System

Use Tailwind's default spacing scale. Common patterns:

| Pattern | Spacing | Usage |
|---------|---------|-------|
| Card padding | `p-4` to `p-6` | Internal card content |
| Section gap | `gap-6` | Between major sections |
| Form gap | `gap-4` | Between form fields |
| Inline gap | `gap-2` | Between inline elements |
| Compact gap | `gap-1` | Between tight elements |

### Layout Patterns

```tsx
// Page layout
<div className="p-6 space-y-6">
  <CmsPageHeader />
  <CmsSurface>Content</CmsSurface>
</div>

// Card content
<CmsSurface padding="md">  {/* p-6 */}
  <div className="space-y-4">
    {/* Form fields */}
  </div>
</CmsSurface>
```

---

## Surfaces: `CmsSurface`

### Variants

| Variant | Shadow | Border | Usage |
|---------|--------|--------|-------|
| `base` | `shadow-sm` | `border-zinc-200` | Standard cards |
| `elevated` | `shadow-md` | `border-zinc-200` | Emphasized panels |
| `floating` | `shadow-lg` | `border-zinc-200` | Modals, popovers |
| `inset` | none | `bg-zinc-50` | Nested sections |

### Usage

```tsx
<CmsSurface variant="base" padding="md">
  <h3 className="text-lg font-medium">Section Title</h3>
  <div className="mt-4 space-y-4">
    {/* Content */}
  </div>
</CmsSurface>
```

### Guidelines

- Always use `CmsSurface` for boxed content
- Prefer `shadow-sm` for subtle depth, avoid heavy shadows
- Use `rounded-xl` (12px) for cards
- Border color: `zinc-200` (light) / `zinc-800` (dark)

---

## Buttons: `CmsButton`

### Variants

| Variant | Style | Usage |
|---------|-------|-------|
| `primary` | Solid indigo background | Primary CTA (one per view) |
| `secondary` | Zinc background, subtle | Secondary actions |
| `danger` | Red background | Destructive actions |
| `ghost` | No background | Tertiary actions, icon buttons |
| `outline` | Border only | Alternative secondary |

### Sizes

| Size | Padding | Usage |
|------|---------|-------|
| `sm` | `h-8 px-3` | Compact toolbars, inline actions |
| `default` | `h-9 px-4` | Standard buttons |
| `lg` | `h-10 px-6` | Emphasized CTAs |

### Guidelines

- One primary button per view/modal
- Use `ghost` for icon-only buttons
- Danger buttons require confirmation dialogs
- Keep button text concise (1-3 words)

---

## Status Badges: `CmsStatusBadge`

### Status Colors

| Status | Background | Text | Ring |
|--------|------------|------|------|
| `draft` | `amber-100` | `amber-800` | `amber-200` |
| `published` | `emerald-100` | `emerald-800` | `emerald-200` |
| `scheduled` | `blue-100` | `blue-800` | `blue-200` |
| `archived` | `zinc-100` | `zinc-600` | `zinc-200` |

### Usage

```tsx
<CmsStatusBadge status="published" />
<CmsStatusBadge status="draft" />
```

---

## Form Fields: `CmsField`

### Structure

```tsx
<CmsField
  label="Title"
  description="The main headline for this entry"
  error={errors.title}
  required
>
  <Input {...field} />
</CmsField>
```

### Guidelines

- Labels above inputs (not inline)
- Required indicator: red asterisk after label
- Description below label in muted text
- Error messages below input in red
- Focus ring: `ring-2 ring-cms-accent ring-offset-2`

---

## Empty States: `CmsEmptyState`

### Structure

```tsx
<CmsEmptyState
  icon={<FileText className="h-12 w-12" />}
  title="No entries yet"
  description="Create your first content entry to get started."
  action={<CmsButton>Create Entry</CmsButton>}
/>
```

### Guidelines

- Icon: 48px, muted color
- Title: `text-lg font-medium`
- Description: `text-sm text-muted-foreground`
- Single primary action
- Center-aligned in container

---

## Motion Presets

### Timing

| Preset | Duration | Easing | Usage |
|--------|----------|--------|-------|
| `fast` | 100ms | `ease-out` | Button press, toggle |
| `base` | 200ms | `ease-out` | Hover states, panels |
| `smooth` | 300ms | `ease-in-out` | Modal enter/exit |

### Classes

```tsx
import { animationClasses } from "@/lib/motion"

// Fade in
<div className={animationClasses.fadeIn}>Content</div>

// Slide up
<div className={animationClasses.slideUp}>Content</div>
```

### Guidelines

- **Do** animate: focus states, hover feedback, modal transitions
- **Don't** animate: page loads, list renders, decorative elements
- Keep durations short (100-300ms)
- Prefer CSS transitions over JavaScript animation

---

## Tables: `CmsTable`

### Features

- Checkbox selection column
- Sortable headers
- Row hover state
- Bulk action bar when items selected

### Guidelines

- Zebra striping: optional, subtle (`even:bg-zinc-50`)
- Row hover: `hover:bg-zinc-50`
- Header: `font-medium text-sm text-zinc-500`
- Cell padding: `px-4 py-3`

---

## Sidebar Navigation

### Structure

- Fixed width: 256px
- Background: `zinc-900` (always dark)
- Logo/brand at top
- Navigation sections with headers
- Active state: `bg-zinc-800` with left accent border

### Guidelines

- Keep navigation flat (max 2 levels)
- Icons: 20px, left of label
- Active indicator: 2px left border in accent color
- Hover: `bg-zinc-800`

---

## Dialogs: `CmsDialog`

### Structure

```tsx
<CmsDialog open={open} onOpenChange={setOpen}>
  <CmsDialog.Header>
    <CmsDialog.Title>Confirm Delete</CmsDialog.Title>
    <CmsDialog.Description>
      This action cannot be undone.
    </CmsDialog.Description>
  </CmsDialog.Header>
  <CmsDialog.Content>
    {/* Dialog body */}
  </CmsDialog.Content>
  <CmsDialog.Footer>
    <CmsButton variant="ghost" onClick={() => setOpen(false)}>
      Cancel
    </CmsButton>
    <CmsButton variant="danger">Delete</CmsButton>
  </CmsDialog.Footer>
</CmsDialog>
```

### Guidelines

- Max width: `max-w-lg` for forms, `max-w-md` for confirmations
- Header: Title + optional description
- Footer: Cancel (left/ghost) + Primary action (right)
- Backdrop: Semi-transparent dark overlay

---

## Dark Mode

### Implementation

Dark mode uses `prefers-color-scheme` media query and can be toggled with a class.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-cms-background: oklch(10% 0.01 286);
    --color-cms-surface: oklch(15% 0.01 286);
    /* ... */
  }
}
```

### Guidelines

- Test all components in both modes
- Borders lighten in dark mode (`zinc-800`)
- Shadows become more subtle
- Status colors shift to softer variants

---

## Accessibility

### Requirements

- Focus visible rings on all interactive elements
- Color contrast: WCAG AA minimum
- Keyboard navigation for all functionality
- Screen reader labels for icon-only buttons
- ARIA attributes on complex components

### Focus Styling

```css
.focus-ring {
  @apply focus-visible:outline-none focus-visible:ring-2
         focus-visible:ring-cms-accent focus-visible:ring-offset-2;
}
```

---

## Component Mapping

When migrating from custom CSS to CMS DS:

| Old Pattern | New Component |
|-------------|---------------|
| `.admin-card`, `.card` | `CmsSurface` |
| `.btn`, `.btn-primary` | `CmsButton` |
| `.status-badge` | `CmsStatusBadge` |
| `.field-wrapper` | `CmsField` |
| `.empty-state` | `CmsEmptyState` |
| `.page-header` | `CmsPageHeader` |
| `.toolbar` | `CmsToolbar` |
| `.sidebar` | `CmsSidebar` |
| `.modal` | `CmsDialog` |
| `.data-table` | `CmsTable` |

---

## Migration Checklist

When migrating a component:

1. [ ] Import from `@/components/cmsds` not `@/components/ui`
2. [ ] Remove inline styles and custom CSS classes
3. [ ] Use Tailwind utilities for layout/spacing
4. [ ] Verify dark mode appearance
5. [ ] Test keyboard navigation
6. [ ] Check responsive behavior
7. [ ] Remove corresponding CSS from `app.css`

---

## Known Decisions (Until Changed)

- **Cards**: `rounded-xl` with subtle `shadow-sm`, not heavy shadows
- **Borders**: `zinc-200/800` border, not rings or heavy outlines
- **Buttons**: Solid fills with subtle hover, no gradients
- **Typography**: Inter for all text, compact scale (14px base)
- **Motion**: Fast and purposeful, never decorative
- **Sidebar**: Always dark, regardless of theme
- **Accent**: Indigo for interactive states only

If any of these shift, update this doc first, then migrate code.
