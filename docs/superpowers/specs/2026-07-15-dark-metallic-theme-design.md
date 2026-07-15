# ROVER Dark Metallic Theme — Design Spec

**Date:** 2026-07-15
**Status:** Approved, pending implementation

## Context

ROVER's current design system (`docs/design-principles.md`) is a deliberately restrained
light-mode "operational ledger" aesthetic: warm paper canvas, hairline borders, near-zero
motion, no gradients or glassmorphism — optimized for CS staff reading the screen 8 hours
a day. That philosophy is being superseded by this spec, at the user's explicit direction:
a full pivot to a dark, metallic, animated theme built around the RES-VA brand blue.

This is a genuine aesthetic reset, not a re-skin. `docs/design-principles.md` should be
updated to reflect the new direction once implementation lands (see Open Items).

**Brand source:** `public/Logo - Color.png` — sampled colors are the exact brand blue
`#30A9DF` and a neutral grey `#9A9B9A` (wordmark). The "K" checkmark glyph in blue is the
primary brand mark and the visual anchor for the login page.

**Scope:** whole app in one pass — design tokens, app shell (sidebar, topbar), shared UI
primitives (button, card, input, table), the two existing app pages (dashboard `/`,
clients `/clients` + `/clients/[slug]`), and a full redesign of `/login`.

**Not in scope:** no new pages/routes, no data/business-logic changes, no light-mode
support (dark-only; toggle explicitly rejected).

## Color & Material System

Dark, cool-graphite base with brand blue used pervasively (borders, muted text, surface
undertones) rather than reserved as a rare accent — per explicit direction, "use blue more
broadly" rather than keep it decorative-only.

| Token | Value | Role |
|---|---|---|
| `--void` | `#080B12` | app canvas |
| `--surface` | `#0F141E` | sidebar, topbar |
| `--surface-raised` | gradient `#161D2C` → `#1E2740` (135deg) | cards, panels |
| `--border-hairline` | `rgba(48,169,223,.16)` | default separators — blue-tinted |
| `--border-metallic` | gradient `#2B3A52 → #30A9DF → #2B3A52` (135deg) | featured card/button 1px edge |
| `--text-primary` | `#EDF1F5` | body text |
| `--text-muted` | `#7C93A8` | secondary text — cool blue-grey |
| `--brand-blue` | `#30A9DF` | primary accent, glow, CTAs, active states, links |
| `--brand-blue-deep` | `#1B6E96` | gradient partner, pressed states |
| `--chrome` | gradient `#E4E7EC → #9AA1AC → #C7CCD3` (135deg) | metallic text — logo wordmark, key headings only |
| `--success` | `#33C481` | kept distinct from brand blue so status ≠ decoration |
| `--danger` | `#E5484D` | destructive — no metallic treatment, must stay unambiguous |

Radius loosens from the old ledger scale (4/6/2px) to a premium-SaaS scale: `8px` controls,
`10–12px` cards. Tables stay tighter (`4px` cells) since dense data legibility is still a
requirement (see Component Conventions Retained).

Typography keeps the existing family stack — **Fraunces** (display) / **IBM Plex Sans**
(UI/body) / **IBM Plex Mono** (tabular data) — the pairing wasn't the problem, the
color/material was. Weights and sizes get retuned for dark-background contrast (verify
WCAG AA against `--void`/`--surface`, not the old paper values).

## Motion System (GSAP)

New dependency: `gsap` (+ `@gsap/react` for the React binding). Rationale: shine sweeps,
glow pulses, and gradient drift need timeline/easing control beyond CSS keyframes for the
premium feel requested.

- **Shine sweep** — diagonal light band crosses primary buttons/cards on hover; loops
  slowly (~6s) as ambient motion on the login left panel and dashboard hero surfaces.
- **Glow pulse** — soft blue glow breathes on the primary CTA and active sidebar item
  (~3s cycle, low amplitude).
- **Metallic gradient drift** — background gradient angle slowly drifts on large surfaces
  (login panel) for a "brushed steel catching light" effect.
- **Entrance choreography** — page content fades + rises on load; sidebar nav items
  stagger in (~40ms apart) on first mount only, not on every navigation.
- **Micro-interactions** — button press scale (0.97), input focus-ring glow, nav item
  slide-highlight on hover.
- `prefers-reduced-motion: reduce` disables all ambient/looping animation (shine loops,
  glow pulses, gradient drift) but keeps essential state-change transitions (focus rings,
  hover color shifts) so the UI remains legible without motion.

## App Shell

- **Sidebar** (`components/app-shell/sidebar.tsx`) — `--surface` background; brand mark
  (blue "K" checkmark, extracted/recreated from the logo) glowing softly at top in place of
  the current `ROVER` wordmark-only header. Active nav item: blue metallic-border tick
  (replaces the old `border-clay`) + soft blue glow wash behind the label. Hover: shine
  sweep across the row.
- **Topbar** (`components/app-shell/topbar.tsx`) — same surface, blue-tinted hairline
  bottom border. Role-switcher trigger and avatar get a thin metallic border ring.
- **Buttons** (`components/ui/button.tsx`) — primary: blue → blue-deep gradient fill,
  shine-sweep on hover, glow-pulse on focus. Secondary: metallic hairline border,
  transparent fill, blue text. Destructive: solid `--danger`, explicitly no metallic/shine
  treatment.
- **Cards/panels** (`components/ui/card.tsx`) — `--surface-raised` gradient background,
  1px `--border-metallic` edge, soft blue ambient glow on hover, 10–12px radius.
- **Tables** (`components/ui/table.tsx`, clients pages) — stay dense/data-first: zebra
  striping via blue-tinted sunken row, tabular-nums mono numbers preserved, hairlines
  blue-tinted, active/selected row gets the sidebar's blue tick + glow treatment.

### Component conventions retained from the old system

These structural rules survive the aesthetic pivot because they serve the actual job
(reading dense data fast), not the old color/motion philosophy:

- Tables remain the primary UI for list data, not cards.
- Numbers render in `font-mono` with `font-variant-numeric: tabular-nums`.
- Role indicator stays a small colored dot + text label, not a pill badge.

## Login Page (`app/login/page.tsx`)

Split-screen layout, ~55/45:

- **Left panel** — full-bleed animated dark metallic gradient. RES-VA "K" mark large and
  glowing, centered. Slow gradient-angle drift + ambient shine-sweep loop. Faint animated
  grid/particle texture beneath for depth. "ROVER — Customer Success Hub" set below the
  mark in the `--chrome` gradient treatment.
- **Right panel** — centered form directly on `--surface` (no card — the split itself
  provides framing so it doesn't compete visually with the animated left panel). Email/
  password inputs with blue focus-glow rings. Primary submit button with shine-sweep +
  glow-pulse. "Access is by invitation only..." footer note preserved verbatim.
- **Responsive:** left panel hides below `md`; form becomes centered full-width on mobile,
  matching the current single-column fallback behavior but restyled to the new tokens.

## Testing / Verification

No business logic changes, so no new unit tests. Verification is visual:

- Run dev server, drive `/login` and `/`, `/clients`, `/clients/[slug]` in a real browser
  (chrome-devtools MCP) at desktop and mobile viewport widths.
- Check `prefers-reduced-motion` actually suppresses ambient loops (emulate in devtools).
- Contrast-check `--text-primary`/`--text-muted` against `--void`/`--surface` for WCAG AA.
- Confirm the existing role-switcher, table sorting/nav, and all interactive states still
  function — this is a visual pass, not a behavior change.

## Open Items (post-implementation)

- Rewrite `docs/design-principles.md` to document the dark/metallic system in place of the
  ledger philosophy, once implementation is verified — so the doc stays the source of
  truth rather than a stale description of the old system.
- The blue "K" checkmark brand mark used standalone (sidebar, login) should be extracted
  from `public/Logo - Color.png` as its own asset/SVG rather than cropping the full
  lockup, if a clean icon-only crop doesn't already exist.
