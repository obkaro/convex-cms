## PlayLI v1 Design Language (PlayATS)

**Status**: v1.1 (Full app migration complete)
**Last updated**: 2026-01-16
**Stack constraints**: TanStack Start + TanStack Router, Convex, Clerk, Tailwind CSS v4
**Hard rule**: Do **not** modify base primitives in `src/components/ui/` for styling—build wrappers in `src/components/playds/` and migrate screens to those wrappers.

This doc is the single source of truth for the "PlayLI" aesthetic: **a parody of LinkedIn**—familiar "professional network" structure, but **fun, soft, and slightly gamified**, not corporate.

**Design System Catalog**: Visit `/design-system` (authenticated) to see all PlayDS components with interactive examples.

---

## Concept & principles

### North star

- **Playful professional**: recognizable "network app" layout patterns (top tabs, pill counts, badges) but with softer shapes, warmer motion, and subtle texture.
- **Borders are rare**: prefer **rings + shadows + translucency**, not hard 1px borders.
- **Cards feel "puffy"**: big radii, gentle blur, soft elevation.
- **Motion is deliberate**: small lifts, springy active indicators, low-duration tab transitions.
- **Scroll should feel crafted**: no page-level scroll when avoidable; internal scroll regions with subtle fades at edges.

### Anti-patterns (avoid)

- Harsh `border` separators everywhere (use `PlayDivider`, subtle rings, or spacing).
- Flat, corporate-outline buttons (use `PlayButton` gradients/shadows; keep focus rings).
- "Everything scrolls" pages (fix scroll architecture: `min-h-0`, `overflow-hidden`, one scroll region per column).
- Random motion spam (use motion for: active indicators, tab transitions, small hover lifts).

---

## Where the system lives (source-of-truth files)

### Tokens / theme

- `src/styles/app.css`
  - `.theme-playli` and dark variant: the PlayLI palette + radii + shadow tokens.

### Theme application

The `theme-playli` class is applied globally on `<html>` in `src/routes/__root.tsx`. This ensures tokens apply to **all components including portals** (Dialog/Sheet).

> **Note**: `PlayThemeScope` is deprecated. Do not use it for new code—the theme is now global.

### Motion presets

- `src/lib/motion.ts`
  - Spring transitions: `playSpring.default`, `playSpring.bouncy`, `playSpring.soft`, etc.
  - Tween transitions: `playTween.fast`, `playTween.default`, `playTween.slow`
  - Tailwind classes: `playMotionClasses.hoverLift`, `playMotionClasses.hoverLiftShadow`, etc.
  - Framer Motion variants: `playFadeSlide`, `playFadeScale`, `playPopIn`, `playStaggerContainer`
  - Utility functions: `staggerDelay()`, `customSpring()`

### PlayDS wrappers (do not edit `/ui` for PlayLI styling)

**Core components:**

- `PlaySurface` — Card/panel wrapper with ring + shadow
- `PlayButton` — Gradient buttons with tone variants
- `PlayTag` — Pill-shaped badges/status indicators
- `PlayScoreTag` — Match score display with color gradients
- `PlayDivider` — Subtle gradient separator
- `PlayScrollArea` — Scrollable area with fade overlays
- `PlayScrollContainer` — Native scroll alternative

**New components (v1.1):**

- `PlayAvatar` — Unified avatar with consistent gradient fallbacks
- `PlayBanner` — Dismissible banners for alerts/notifications
- `PlayEmptyState` — Reusable empty state with optional celebration variant
- `PlaySkeleton` — Loading skeleton compound component
- `PlayInput` — PlayLI-styled text input
- `PlayTextarea` — PlayLI-styled textarea
- `PlaySelect` — PlayLI-styled select dropdown

### Canonical implementations

- Route + background + header: `src/routes/_authed/apply.tsx`
- Scroll architecture + overlays: `src/components/apply/ApplyView.tsx`
- Materials tabs + animations: `src/components/apply/ApplyMaterialsPanel.tsx`
- Design system catalog: `src/routes/_authed/design-system.tsx`

---

## Theming & tokens (`theme-playli`)

### How it works

`src/styles/app.css` defines `.theme-playli` which overrides shadcn/tw-animate tokens with OKLCH values and adds custom PlayLI tokens:

- **Core UI tokens**: `--background`, `--foreground`, `--card`, `--muted`, `--primary`, etc.
- **Shadows**: `--play-shadow`, `--play-shadow-hover`
- **Button shadows**: `--play-button-shadow`, `--play-button-shadow-hover`, `--play-button-shadow-brand`, `--play-button-shadow-brand-hover`
- **Tone gradients** (used by `PlayButton`, `PlayTag`, etc.):
  - `--play-brand-from/to` (blue)
  - `--play-success-from/to` (green)
  - `--play-danger-from/to` (red)
  - `--play-warning-from/to` (amber)
  - `--play-info-from/to` (sky blue)
- **Roundness**: `--radius` bumped (and Tailwind radius aliases derived via `@theme inline`)

### Using tone tokens in custom components

```css
/* Use CSS custom properties for tone-aware styling */
.my-component {
  background: linear-gradient(
    to bottom,
    var(--play-brand-from),
    var(--play-brand-to)
  );
  box-shadow: var(--play-button-shadow-brand);
}
```

---

## Typography

Configured in `src/styles/app.css`:

- **Body**: `--font-sans: 'Figtree Variable'`
- **Display**: `--font-display: 'Bricolage Grotesque Variable'`

Guidelines:

- Use `font-display` for headers/brand/section titles.
- Use normal body weight for long text; reserve bold for emphasis/labels.
- Keep headings tight (`tracking-tight`) and short.

---

## Surfaces: "cards", "wells", and depth (`PlaySurface`)

### Component

`PlaySurface` is the wrapper for any panel/card/well.

- `variant="card"`: translucent card, big rounding, subtle ring, `shadow-[var(--play-shadow)]`, slight backdrop blur.
- `variant="well"`: inset "well" (muted), subtle ring + inset highlight.
- `variant="transparent"`: no styling.
- `interactive`: adds hover shadow transition for cards.

### Usage rules

- Use `PlaySurface` for all "boxed" content (lists, panels, sheets, headers inside flows).
- Prefer **ring + shadow** instead of `border`.
- Pair with `overflow-hidden` when you have internal scroll areas or fades.

Example:

```tsx
<PlaySurface variant="card" className="flex min-h-0 flex-col overflow-hidden">
  <div className="shrink-0 p-4">Header</div>
  <PlayScrollArea className="min-h-0 flex-1" fadeFrom="from-card">
    <div className="p-4">Scrollable content</div>
  </PlayScrollArea>
</PlaySurface>
```

---

## Buttons (`PlayButton`)

### Component

`PlayButton` wraps the base `Button` from `src/components/ui/button` and adds the PlayLI polish.

Tones:

- `tone="brand"`: brand gradient + brand shadow; hover brightens/saturates slightly.
- `tone="success"`: green gradient for affirmative actions.
- `tone="danger"`: red gradient for destructive actions.
- `tone="warning"`: amber gradient for caution actions.
- `tone="info"`: sky blue gradient for informational actions.
- `tone="soft"`: muted pill-like secondary button with subtle inset highlight.

Behavior:

- **Hover**: slight lift (`-translate-y-px`) + shadow/brightness.
- **Active**: press in (`translate-y-px`).
- **Focus**: keeps an accessible `focus-visible` ring (thicker by default).

### Usage rules

- Pick **one** primary CTA (`tone="brand"`) per view.
- Use `tone="success"` only for explicit success actions (e.g. "I Applied").
- Use `tone="danger"` sparingly; don't paint the UI red by default.
- Use `tone="warning"` for caution states (e.g. "Unsaved changes").
- Use `tone="info"` for informational highlights.
- Secondary actions should be `tone="soft"` (or `variant="ghost"` when appropriate).

### Dense mobile actions

For tight mobile bars, prefer **icon-only** action variants at the component level (e.g. `ApplyActions iconOnly`) while preserving accessibility via `sr-only` labels.

---

## Tags & badges (`PlayTag`, `PlayScoreTag`)

### PlayTag

`PlayTag` is the canonical pill/badge:

- big rounding (`rounded-full`)
- subtle ring + inset highlight
- gentle hover lift/brightness

Tones: `neutral | brand | success | warning | danger | info`

Use cases:

- status pills (Generating / Ready)
- counts and "meta" chips
- small callouts in headers/lists

### PlayScoreTag

`PlayScoreTag` maps the score → grade (`scoreToGrade`) and renders a `PlayTag`, with optional tooltip explanation.

Guidelines:

- Use tooltips for the "why" (keep the pill short).
- Keep score presentation consistent across pages (don't create bespoke score pills).

---

## Avatars (`PlayAvatar`)

`PlayAvatar` provides consistent avatar styling across the app:

- Size variants: `sm` (8), `md` (10), `lg` (14), `xl` (20)
- Deterministic gradient colors based on name
- Consistent `shadow-inner` and PlayLI roundness

```tsx
<PlayAvatar name="Acme Corp" src={logoUrl} size="lg" />
```

Guidelines:

- Use for company logos and user avatars
- Let the component handle fallback initials automatically
- Don't create custom avatar implementations

---

## Banners (`PlayBanner`)

`PlayBanner` is for dismissible alerts and notifications:

- Tone variants: `info | success | warning | danger`
- Optional icon display with `showIcon`
- Smooth AnimatePresence enter/exit animations

```tsx
;<PlayBanner tone="success" showIcon onDismiss={handleDismiss}>
  <PlayBanner.Content>Changes saved successfully</PlayBanner.Content>
</PlayBanner>

{
  /* Pre-configured undo pattern */
}
;<PlayBanner tone="info">
  <PlayBanner.Content>Content regenerated</PlayBanner.Content>
  <PlayBanner.Undo onUndo={handleUndo} onDismiss={handleDismiss} />
</PlayBanner>
```

---

## Empty states (`PlayEmptyState`)

`PlayEmptyState` provides consistent empty state patterns:

- Standard icon container with gradient background
- Consistent typography hierarchy
- Primary/secondary action slots
- Optional `celebration` variant with confetti/particles

```tsx
<PlayEmptyState
  icon={<Sparkles className="size-8" />}
  title="All caught up!"
  description="No new jobs to review right now."
  action={<PlayButton tone="brand">Find More Jobs</PlayButton>}
  variant="celebration" // optional
/>
```

---

## Loading skeletons (`PlaySkeleton`)

`PlaySkeleton` is a compound component for consistent loading states:

```tsx
{/* Individual elements */}
<PlaySkeleton.Avatar size="lg" />
<PlaySkeleton.Text width={200} height="h-5" />

{/* Common patterns */}
<PlaySkeleton.Row showAvatar lines={2} showTrailing />
<PlaySkeleton.List count={3} showHeader />
```

Guidelines:

- Use PlaySkeleton inside PlaySurface for card-shaped loading states
- Maintain consistent roundness (`rounded-xl`, `rounded-2xl`)
- Use staggered delays for natural loading feel

---

## Form inputs (`PlayInput`, `PlayTextarea`, `PlaySelect`)

PlayLI-styled form controls with:

- Larger border radius (`rounded-xl`)
- Soft background with subtle blur
- Brand-tinted focus ring
- Hover states with subtle shadow

```tsx
<PlayInput placeholder="Job title..." />
<PlayTextarea rows={4} />
<PlaySelect
  items={[{ label: 'Option 1', value: '1' }]}
  placeholder="Select..."
  onValueChange={setValue}
/>
```

---

## Dividers (`PlayDivider`)

`PlayDivider` replaces harsh horizontal borders with a subtle gradient line:

- transparent → low-opacity mid → transparent

Use it for section separation inside cards/top bars, especially when content density is high.

---

## Scroll architecture + fades (critical)

The Apply flow is the blueprint for "no page scroll" + "scroll within panels".

### Golden rules

- Any layout intending to fill the viewport must be:
  - `flex` + `min-h-0` on parents
  - `flex-1 min-h-0` on the region that should fill remaining height
  - `overflow-hidden` on the viewport owner
- Within a column, only **one** element should scroll.
- For overlayed bottom action bars, you must:
  - render actions above scroll fades (`z-20` vs fades `z-10`)
  - add bottom padding to the scroll content so content isn't hidden behind actions

### PlayScrollArea

Use `PlayScrollArea` (wrapper around `/ui` `ScrollArea`) when you need:

- a consistent scrollbar feel (auto-hide unless scrolling/hover/focus)
- subtle top/bottom fades when scrollable

Notes:

- Fade overlays are `z-10` and `pointer-events-none`.
- The wrapper currently uses `rounded-none` and expects the parent `PlaySurface` to own rounding + clipping (common pattern in Apply).

### PlayScrollContainer

Use `PlayScrollContainer` for native scrolling `overflow-y-auto` cases where `/ui` ScrollArea isn't desired.

---

## Motion presets (`src/lib/motion.ts`)

Centralized motion patterns for consistency across the app.

### Spring transitions

```tsx
import { playSpring } from '@/lib/motion'

<motion.div transition={playSpring.default} />  // snappy, controlled
<motion.div transition={playSpring.bouncy} />   // playful, more overshoot
<motion.div transition={playSpring.soft} />     // gentle, for larger elements
<motion.div transition={playSpring.gentle} />   // very soft, for celebrations
```

### Tailwind motion classes

```tsx
import { playMotionClasses } from '@/lib/motion'

<button className={playMotionClasses.hoverLift}>Lift on hover</button>
<div className={playMotionClasses.hoverLiftShadow}>Lift + shadow</div>
```

### Framer Motion variants

```tsx
import { playFadeSlide, playStaggerContainer, playStaggerItem } from '@/lib/motion'

<motion.div variants={playFadeSlide} initial="initial" animate="animate" exit="exit">
  Fade and slide
</motion.div>

<motion.ul variants={playStaggerContainer} initial="initial" animate="animate">
  {items.map(item => (
    <motion.li key={item.id} variants={playStaggerItem}>{item.name}</motion.li>
  ))}
</motion.ul>
```

---

## Overlay action bars (ApplyView pattern)

Apply uses overlayed bottom actions (desktop right column + mobile) to keep CTAs always reachable without adding more vertical chrome.

Pattern:

- Make the column `relative`.
- Put the action bar in `absolute bottom-0 inset-x-0`.
- Wrap it with `pointer-events-none` and set the actual actions to `pointer-events-auto`.
- Ensure action container is **above** scroll fades: `z-20`.
- Add content padding:
  - `ApplyMaterialsPanel` gets `pb-*` via its `className`
  - Inner scroll content also uses `pb-20`/`pb-24` to clear the overlay
- Account for safe areas and the mobile tab bar with:
  - `pb-[env(safe-area-inset-bottom)]`
  - additional `pb-*` where needed

If you adopt this pattern elsewhere, copy it exactly—most "mystery overflow bugs" come from missing `min-h-0` or missing bottom padding under overlays.

---

## Tabs: animated "segmented control" + content transitions

Canonical: `ApplyMaterialsPanel`.

### Active indicator

- Use a shared `layoutId` indicator (`motion.span`) behind the active tab.
- Use a spring from `playSpring.default`:
  - `stiffness: 500`
  - `damping: 35`

### Content transitions

- Keep tab semantics (`Tabs`, `TabsList`, `TabsTrigger`).
- Animate the panel content with `AnimatePresence` keyed by the active tab:
  - small `y` offset (±6px)
  - quick fade (`duration ~ 0.18s`, `easeOut`)

---

## Backgrounds & texture

Canonical: `src/components/layout/AppShell.tsx`.

Patterns to reuse:

- Soft vertical gradient: `from-primary/10 via-background to-background`
- Ultra-subtle dot pattern overlay (low opacity)

Guidelines:

- Patterns should be decorative, not readable at a glance.
- Always ensure text contrast is governed by tokens (don't "paint" text with backgrounds).
- AppShell applies the background globally to non-immersive routes.

---

## Navigation & "immersive flows"

### AppShell behavior

`src/components/layout/AppShell.tsx` treats `/apply` as "immersive":

- hides global desktop and mobile top headers
- sets a viewport-owned layout (`h-svh overflow-hidden`)
- keeps the mobile bottom tab bar available (mobile feels consistent)

### ApplyTopBar behavior

`src/routes/_authed/apply.tsx` implements a flow-specific top bar:

- brand mark + title
- "LinkedIn-ish" pill tabs on desktop (`md+`)
- user menu
- separation via `PlayDivider` (not a hard border)

Guideline: immersive flows own their own top chrome and scroll rules, but should still feel like the same product (use the same tokens/pills/shadows).

---

## Editing + regeneration micro-UX patterns

Canonical components:

- `EditableMaterialContent`: click-to-edit; supports keyboard (Enter/Space to edit, Escape to cancel); uses inset ring instead of borders.
- `UndoBanner`: soft brand-tinted banner with ghost/soft buttons.
- `MaterialRegenerationPanel`: quick suggestion chips + custom prompt input; chips are rounded-full.
- `CopyButton` pattern: soft button that temporarily becomes "success" colored.

Guidelines:

- Always preserve keyboard access when making non-button containers clickable (`role="button"`, `tabIndex`, key handlers).
- Prefer inset highlights for editable areas (feels "padded" not "outlined").

---

## Migration playbook (apply this system to other pages)

### Component mapping (most common)

- **Cards/panels** → `PlaySurface`
- **Primary/secondary buttons** → `PlayButton` (`tone="brand"` / `tone="soft"`)
- **Badges/status pills** → `PlayTag`
- **Score/match UI** → `PlayScoreTag`
- **Separators** → `PlayDivider`
- **Scrollable areas** → `PlayScrollArea` / `PlayScrollContainer`
- **Company/user avatars** → `PlayAvatar`
- **Alerts/notifications** → `PlayBanner`
- **Empty states** → `PlayEmptyState`
- **Loading states** → `PlaySkeleton`
- **Form inputs** → `PlayInput`, `PlayTextarea`, `PlaySelect`

### Layout checklist (prevents 90% of bugs)

- Page wrapper: `flex min-h-0 flex-1 overflow-hidden`
- Any flex child that must shrink: add `min-h-0`
- Scroll regions: only one per column; use Play scroll wrappers
- If overlaying action bars: add bottom padding to content and manage z-index vs fades
- On mobile: account for `pb-safe` / tab bar height

### UX checklist

- Loading: use `PlaySkeleton` inside `PlaySurface` for card-shaped loading states.
- Empty state: use `PlayEmptyState` with a friendly icon + one brand CTA + secondary soft action.
- Errors: show a `PlayBanner` with `tone="danger"` + retry button.
- Focus states: keep thick `focus-visible` rings.

---

## Known "v1.1 decisions" to keep consistent (until changed)

- **Cards**: big rounding (`rounded-3xl`) + subtle ring, not borders.
- **Buttons**: gradient tones + tiny lift on hover; no white outline aesthetic.
- **Scroll**: internal scroll areas + fades; minimal page scroll.
- **Tabs**: segmented control with animated indicator; content fade/slide.
- **Mobile**: dense, icon-forward CTAs are acceptable (but must stay accessible).
- **Theme**: global via `theme-playli` class on `<html>`.
- **Tones**: brand, success, danger, warning, info, soft/neutral.

If any of these shift, update this doc first, then migrate code.
