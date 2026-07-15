# ROVER Design Principles

ROVER is Res-VA's internal Customer Success Hub. This document describes the
dark metallic design system adopted 2026-07-15 (see
`docs/superpowers/specs/2026-07-15-dark-metallic-theme-design.md` for the
full rationale and decision history). It supersedes an earlier light-mode
"operational ledger" system.

Some structural conventions survive from that earlier system because they
serve the actual job (reading dense operational data fast), independent of
color or motion philosophy: tables remain the primary UI for list data, not
cards; numbers render in mono with tabular figures; role indicators stay a
dot + label, never a pill badge.

## Typography

Unchanged from the prior system: **Fraunces** (display, used sparingly) +
**IBM Plex Sans** (UI/body) + **IBM Plex Mono** (data/tabular). The pairing
itself wasn't the problem the redesign solved — color and material were.
Weights/sizes are tuned for dark-background contrast rather than the old
warm-paper canvas.

## Color

Dark, cool-graphite base with the RES-VA brand blue (`#30A9DF`, sampled
directly from `public/Logo - Color.png`) used pervasively — borders, muted
text, and surface undertones all carry a blue tint, not just accents.

| Name | Value | Role |
|---|---|---|
| **Void** | `#080B12` | app canvas |
| **Surface** | `#0F141E` | sidebar, topbar |
| **Surface Raised** | gradient `#161D2C → #1E2740` | cards, panels |
| **Brand Blue** | `#30A9DF` | primary accent, glow, CTAs, active states, links |
| **Brand Blue Deep** | `#1B6E96` | gradient partner, pressed states |
| **Clay** (repointed) | `#C98A3F` | secondary category accent (e.g. "Texting" vs "Cold Calling") |
| **Sage** | `#33C481` | positive/success |
| **Rust** | `#E5484D` | destructive/danger |
| **Chrome** | gradient `#E4E7EC → #9AA1AC → #C7CCD3` | metallic text — logo wordmark, key headings only |

Danger (`Rust`) intentionally gets no metallic/shine treatment, so it never
reads as ambiguous with decorative elements.

## Spacing & layout

4px base grid unchanged. Sidebar 240px fixed, top bar 56px fixed. Radius
loosened from the old ledger scale to a premium-SaaS scale: `6/8/10/12px`
(was `4/6/8/10px`) — cards and controls read less like a spreadsheet, more
like a modern operational console. Borders stay hairline but are now
blue-tinted (`rgba(48,169,223,.16)`) rather than neutral grey.

## Motion

GSAP-driven, used deliberately rather than everywhere: shine sweeps on
hover (buttons, sidebar nav rows) and as a slow ambient loop on the login
branding panel; a soft glow pulse reserved for the primary CTA; gradient
angle drift on the login hero surface. `prefers-reduced-motion: reduce`
disables all ambient/looping animation while keeping state-change
transitions (focus rings, hover color shifts).

## Signature element

**Brand blue glow** replaces the old clay-colored ledger tick as the
system's recurring marker: the active sidebar item, focused inputs, and the
primary CTA all express state through blue glow/border rather than a
static color block — motion and light do the work color alone used to do.

## Component conventions

- Tables are the primary UI, not cards. Zebra-striping via
  `--color-surface-sunken`, not borders between every row.
- Numbers (rates, seat counts, phone numbers) always render in `font-mono`
  with `font-variant-numeric: tabular-nums`.
- Role is shown as a small colored dot + text label, never a rounded pill
  badge.
- Buttons: gradient blue fill for primary, metallic hairline border for
  secondary, text-only for tertiary/table-row actions. Destructive actions
  stay solid red with no metallic/shine treatment.
