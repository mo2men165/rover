# ROVER Dark Metallic Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot ROVER's design system from the light-mode "operational ledger" aesthetic to a dark, metallic, blue-accented theme with GSAP-driven shine/glow/gradient-drift animation, and redesign `/login` as a split-screen flagship page.

**Architecture:** Nearly all of the visual change is achieved by rewriting the CSS custom properties in `app/globals.css` — the app already routes color through a primitive → semantic token layer (`--paper`, `--ink`, `--ledger`, etc. → shadcn `--background`, `--primary`, etc.), and every existing component/page consumes those tokens via Tailwind utility classes (`bg-paper`, `text-ledger`, `border-border`...). Redefining the token *values* repaints the whole app without touching most component files. A small number of files need structural edits because they either (a) use a hardcoded literal (`bg-white` instead of a token) or (b) need new interactive/animated behavior (shine sweep, glow pulse, gradient drift) that CSS alone can't drive — those use a small shared GSAP helper module.

**Tech Stack:** Next.js 16 / React 19 / Tailwind CSS v4 (`@theme inline` token system) / shadcn (`@base-ui/react` primitives) / GSAP (new dependency) for motion.

**Design spec:** `docs/superpowers/specs/2026-07-15-dark-metallic-theme-design.md` — read it first; this plan implements it directly. Brand blue sampled from `public/Logo - Color.png` is `#30A9DF`.

## Global Constraints

- **CLAUDE.md UI rule:** Before creating or editing any `.tsx` UI component or page file (every task from Task 4 onward), invoke the `frontend-design` and `ui-ux-pro-max` skills first. This applies per-task/per-subagent since each fresh subagent has no memory of skills invoked in earlier tasks.
- Dark-only. No light/dark toggle, no `.dark` class variant work — `:root` values themselves become the dark palette.
- No new routes, no data/business-logic changes. This is a visual-layer pass only.
- `prefers-reduced-motion: reduce` must suppress all ambient/looping animation (shine loops, glow pulses, gradient drift) while leaving state-change transitions (focus rings, hover color shifts) intact.
- Tables stay the primary UI for list data (not cards); numbers stay `font-mono` + `tabular-nums`; role indicators stay dot+label, never pill badges. These structural conventions from the old system are preserved per the spec.
- No unit tests are added — this is a styling/visual pass with no new business logic. Verification is `npm run build`, `npm run lint`, and live visual inspection (chrome-devtools MCP), per the spec's Testing/Verification section.

---

### Task 1: Dependencies and brand mark asset

**Files:**
- Modify: `package.json` (add `gsap`, `@gsap/react`)
- Create: `public/logo-mark.png` (icon-only crop of the brand mark, no wordmark)

**Interfaces:**
- Produces: `gsap` and `@gsap/react` importable from any client component; `public/logo-mark.png` — a transparent-background PNG containing only the blue/grey "K" checkmark glyph (no "RES-VA" text), usable via `next/image` at any size up to roughly 964×1082px source resolution.

- [ ] **Step 1: Install GSAP**

Run: `npm install gsap @gsap/react`

Expected: `package.json` gains `"gsap"` and `"@gsap/react"` under `dependencies`; `package-lock.json` updates; no install errors.

- [ ] **Step 2: Extract the icon-only brand mark from the full logo lockup**

Run:
```bash
magick "public/Logo - Color.png" -gravity North -crop 100%x72%+0+0 +repage -fuzz 2% -trim +repage "public/logo-mark.png"
```

Expected: creates `public/logo-mark.png`. Verify with `identify public/logo-mark.png` — expect dimensions around `964x1082` (±small variance), 8-bit sRGB, and a file size in the 5–15KB range. This crop geometry was tested during planning and confirmed to isolate the blue/grey checkmark glyph cleanly with no wordmark remnants.

- [ ] **Step 3: Visually confirm the crop**

Read `public/logo-mark.png` (image viewer/Read tool) and confirm: transparent background, only the checkmark glyph visible (blue diagonal stroke + grey "R"-like stroke), no partial "RES-VA" text visible at the bottom edge. If any wordmark remnant is visible, reduce the `72%` height value by 2–3 points and re-run Step 2 until clean.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json "public/logo-mark.png"
git commit -m "Add GSAP dependency and extract standalone brand mark asset"
```

---

### Task 2: Rewrite design tokens in `app/globals.css`

**Files:**
- Modify: `app/globals.css` (full file rewrite)

**Interfaces:**
- Produces: all CSS custom properties consumed by every component in the app (`--void`, `--surface`, `--surface-raised-start/end`, `--brand-blue`, `--brand-blue-deep`, `--metallic-edge`, `--chrome-a/b/c`, plus the existing `--paper`/`--ink`/`--ledger`/`--clay`/`--sage`/`--rust`/`--surface-sunken` names now repointed to dark values), and new utility classes `.bg-surface-raised`, `.border-metallic`, `.text-chrome`, `.glow-blue`, `.shine-mask`, `.shine-layer` that later tasks apply directly as class names.
- Consumes: nothing (this is the foundation task).

This task requires editing a `.css` file, not a UI component — the CLAUDE.md skill-load rule applies starting Task 4 (first `.tsx` edit), not here.

- [ ] **Step 1: Replace the full contents of `app/globals.css`**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-heading: var(--font-display);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);

  /* ROVER named palette */
  --color-paper: var(--paper);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-ledger: var(--ledger);
  --color-clay: var(--clay);
  --color-sage: var(--sage);
  --color-rust: var(--rust);
  --color-surface-sunken: var(--surface-sunken);

  /* dark metallic additions */
  --color-void: var(--void);
  --color-surface: var(--surface);

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
}

:root {
  /* ROVER primitives — dark metallic. Brand blue sampled from
     public/Logo - Color.png (#30A9DF). */
  --void: #080b12;
  --surface: #0f141e;
  --surface-raised-start: #161d2c;
  --surface-raised-end: #1e2740;
  --surface-sunken: #131a27;
  --paper: var(--void);
  --ink: #edf1f5;
  --ink-muted: #7c93a8;
  --ledger: #30a9df;
  --brand-blue: #30a9df;
  --brand-blue-deep: #1b6e96;
  --clay: #c98a3f;
  --sage: #33c481;
  --rust: #e5484d;
  --metallic-edge: #2b3a52;
  --chrome-a: #e4e7ec;
  --chrome-b: #9aa1ac;
  --chrome-c: #c7ccd3;

  /* shadcn semantic mapping */
  --background: var(--void);
  --foreground: var(--ink);
  --card: var(--surface-raised-start);
  --card-foreground: var(--ink);
  --popover: var(--surface-raised-start);
  --popover-foreground: var(--ink);
  --primary: var(--brand-blue);
  --primary-foreground: #05141d;
  --secondary: var(--surface-sunken);
  --secondary-foreground: var(--ink);
  --muted: var(--surface-sunken);
  --muted-foreground: var(--ink-muted);
  --accent: var(--clay);
  --accent-foreground: #1a1206;
  --destructive: var(--rust);
  --border: rgba(48, 169, 223, 0.16);
  --input: rgba(48, 169, 223, 0.22);
  --ring: var(--brand-blue);
  --radius: 0.625rem;
  --sidebar: var(--surface);
  --sidebar-foreground: var(--ink);
  --sidebar-primary: var(--brand-blue);
  --sidebar-primary-foreground: #05141d;
  --sidebar-accent: var(--surface-sunken);
  --sidebar-accent-foreground: var(--ink);
  --sidebar-border: rgba(48, 169, 223, 0.16);
  --sidebar-ring: var(--brand-blue);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}

@layer utilities {
  .font-heading {
    font-family: var(--font-display);
  }
  .tabular {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  .bg-surface-raised {
    background-image: linear-gradient(
      var(--gradient-angle, 135deg),
      var(--surface-raised-start),
      var(--surface-raised-end)
    );
  }

  .border-metallic {
    position: relative;
    border: 1px solid transparent;
    background-image:
      linear-gradient(var(--surface-raised-start), var(--surface-raised-start)),
      linear-gradient(135deg, var(--metallic-edge), var(--brand-blue), var(--metallic-edge));
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  .text-chrome {
    background-image: linear-gradient(
      135deg,
      var(--chrome-a),
      var(--chrome-b),
      var(--chrome-c)
    );
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }

  .glow-blue {
    box-shadow:
      0 0 0 1px rgba(48, 169, 223, 0.3),
      0 0 20px 0 rgba(48, 169, 223, 0.35);
  }

  .shine-mask {
    position: relative;
    overflow: hidden;
  }

  .shine-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      115deg,
      transparent 35%,
      rgba(255, 255, 255, 0.35) 50%,
      transparent 65%
    );
    transform: translateX(-120%);
    will-change: transform;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shine-layer {
    display: none;
  }
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (Tailwind resolves all token references; no "unknown utility class" errors). Existing pages will render with the new dark palette wherever they used token-based classes (`bg-paper`, `text-ink`, `text-ledger`, `border-border`, `bg-surface-sunken`) — visual polish for hardcoded literals (`bg-white`) and new interactive treatment happen in later tasks.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "Rewrite design tokens for dark metallic theme"
```

---

### Task 3: GSAP motion helper module

**Files:**
- Create: `lib/motion.ts`

**Interfaces:**
- Consumes: `gsap` (from Task 1).
- Produces (used by Tasks 4, 6, 9):
  - `prefersReducedMotion(): boolean`
  - `shineSweep(el: HTMLElement, options?: { loop?: boolean; duration?: number; delay?: number }): () => void` — animates `xPercent` from -130 to 230; returns a cleanup function that kills the tween.
  - `glowPulse(el: HTMLElement): () => void` — loops a blue box-shadow glow; returns a cleanup function.
  - `gradientDrift(el: HTMLElement): () => void` — loops the `--gradient-angle` custom property on `el.style` between 105deg and 225deg; returns a cleanup function.
  - `staggerIn(els: HTMLElement[] | NodeListOf<Element>, options?: { delay?: number }): void` — fade+rise entrance, staggered.
  - All functions no-op (or jump to the resting state) when `prefersReducedMotion()` is true.

- [ ] **Step 1: Create `lib/motion.ts`**

```ts
import gsap from "gsap";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shineSweep(
  el: HTMLElement,
  options: { loop?: boolean; duration?: number; delay?: number } = {}
): () => void {
  if (prefersReducedMotion()) return () => {};
  const tween = gsap.fromTo(
    el,
    { xPercent: -130 },
    {
      xPercent: 230,
      duration: options.duration ?? 1.1,
      delay: options.delay ?? 0,
      ease: "power2.inOut",
      repeat: options.loop ? -1 : 0,
      repeatDelay: options.loop ? 4 : 0,
    }
  );
  return () => tween.kill();
}

export function glowPulse(el: HTMLElement): () => void {
  if (prefersReducedMotion()) return () => {};
  const tween = gsap.to(el, {
    boxShadow:
      "0 0 0 1px rgba(48,169,223,.45), 0 0 32px 4px rgba(48,169,223,.55)",
    duration: 1.6,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
  return () => tween.kill();
}

export function gradientDrift(el: HTMLElement): () => void {
  if (prefersReducedMotion()) {
    el.style.setProperty("--gradient-angle", "135deg");
    return () => {};
  }
  const state = { angle: 105 };
  const tween = gsap.to(state, {
    angle: 225,
    duration: 9,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
    onUpdate: () => {
      el.style.setProperty("--gradient-angle", `${state.angle}deg`);
    },
  });
  return () => tween.kill();
}

export function staggerIn(
  els: HTMLElement[] | NodeListOf<Element>,
  options: { delay?: number } = {}
): void {
  if (prefersReducedMotion()) {
    gsap.set(els, { opacity: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    els,
    { opacity: 0, y: 8 },
    {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: "power2.out",
      stagger: 0.04,
      delay: options.delay ?? 0,
    }
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `lib/motion.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/motion.ts
git commit -m "Add GSAP motion helper module (shine, glow, gradient drift, stagger)"
```

---

### Task 4: Button component — gradient fill, shine sweep, optional glow pulse

**Files:**
- Modify: `components/ui/button.tsx` (full file rewrite)

**Interfaces:**
- Consumes: `shineSweep`, `glowPulse` from `lib/motion.ts` (Task 3).
- Produces: `Button` gains a new optional prop `pulse?: boolean` (default `false`) that starts a continuous glow-pulse loop on mount — used explicitly by the login submit button (Task 9), not by default on every button.

**Before starting:** invoke the `frontend-design` and `ui-ux-pro-max` skills (CLAUDE.md rule — this task edits a UI component).

- [ ] **Step 1: Replace the full contents of `components/ui/button.tsx`**

```tsx
"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { shineSweep, glowPulse } from "@/lib/motion"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,var(--brand-blue),var(--brand-blue-deep))] text-primary-foreground hover:brightness-110",
        outline:
          "border-metallic bg-transparent text-ledger hover:bg-surface-sunken",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  pulse = false,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { pulse?: boolean }) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!pulse || !ref.current) return
    return glowPulse(ref.current)
  }, [pulse])

  const handleMouseEnter = () => {
    const shine = ref.current?.querySelector<HTMLElement>("[data-shine]")
    if (shine) shineSweep(shine)
  }

  const showShine = variant !== "link" && variant !== "ghost"

  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      onMouseEnter={handleMouseEnter}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {showShine && <span data-shine aria-hidden className="shine-layer" />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
```

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors. If `ButtonPrimitive` (from `@base-ui/react/button`) rejects the `ref` prop with a type error, check the installed `@base-ui/react` version's `Button.Props` type for its ref-forwarding pattern (it may expect `render`-prop-based ref access instead) and adjust — but do not remove the shine/pulse behavior, adapt how the DOM node is obtained instead (e.g. a callback ref).

- [ ] **Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "Add gradient fill, hover shine sweep, and optional glow pulse to Button"
```

---

### Task 5: Input component — focus glow

**Files:**
- Modify: `components/ui/input.tsx:11-14`

**Interfaces:**
- Consumes: nothing new.
- Produces: no API change — purely a `className` addition.

**Before starting:** invoke the `frontend-design` and `ui-ux-pro-max` skills (CLAUDE.md rule).

- [ ] **Step 1: Add a focus glow shadow to the input's className string**

In `components/ui/input.tsx`, replace:

```tsx
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
```

with:

```tsx
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:shadow-[0_0_20px_0_rgba(48,169,223,0.35)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
```

(Only two changes: `transition-colors` → `transition-all` so the new shadow animates too, and the added `focus-visible:shadow-[...]` utility.)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ui/input.tsx
git commit -m "Add blue focus glow to Input"
```

---

### Task 6: Sidebar — brand mark, blue active tick, hover shine, entrance stagger

**Files:**
- Modify: `components/app-shell/sidebar.tsx` (full file rewrite)

**Interfaces:**
- Consumes: `staggerIn`, `shineSweep` from `lib/motion.ts`; `public/logo-mark.png` from Task 1.
- Produces: no external API change (still exports `Sidebar` with no props).

**Before starting:** invoke the `frontend-design` and `ui-ux-pro-max` skills (CLAUDE.md rule).

- [ ] **Step 1: Replace the full contents of `components/app-shell/sidebar.tsx`**

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useRole } from "@/components/app-shell/role-context";
import { NAV_BY_ROLE } from "@/lib/nav-config";
import { staggerIn, shineSweep } from "@/lib/motion";

export function Sidebar() {
  const { role } = useRole();
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!navRef.current) return;
    staggerIn(navRef.current.querySelectorAll("[data-nav-item]"));
  }, [role]);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Image
          src="/logo-mark.png"
          alt=""
          width={22}
          height={22}
          className="drop-shadow-[0_0_8px_rgba(48,169,223,0.55)]"
        />
        <span className="font-heading text-lg italic text-ink">ROVER</span>
      </div>
      <nav ref={navRef} className="flex flex-col gap-0.5 p-3">
        {items.map((item) => {
          const Icon = item.icon;

          if (!item.href) {
            return (
              <div
                key={item.label}
                data-nav-item
                className="flex cursor-default items-center gap-3 rounded-[var(--radius-sm)] border-l-[3px] border-transparent px-3 py-2 text-sm text-ink-muted/50"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
            );
          }

          const active = pathname?.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              data-nav-item
              onMouseEnter={(e) => {
                const shine = e.currentTarget.querySelector<HTMLElement>(
                  "[data-shine]"
                );
                if (shine) shineSweep(shine);
              }}
              className={`shine-mask flex items-center gap-3 rounded-[var(--radius-sm)] border-l-[3px] px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-ledger bg-surface-sunken font-medium text-ledger shadow-[inset_0_0_16px_rgba(48,169,223,0.12)]"
                  : "border-transparent text-ink hover:bg-surface-sunken hover:text-ledger"
              }`}
            >
              <span data-shine aria-hidden className="shine-layer" />
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/app-shell/sidebar.tsx
git commit -m "Restyle sidebar with brand mark, blue active tick, hover shine, entrance stagger"
```

---

### Task 7: Topbar — surface background, metallic ring accents

**Files:**
- Modify: `components/app-shell/topbar.tsx` (full file rewrite)

**Interfaces:**
- Consumes: nothing new.
- Produces: no API change.

**Before starting:** invoke the `frontend-design` and `ui-ux-pro-max` skills (CLAUDE.md rule).

- [ ] **Step 1: Replace the full contents of `components/app-shell/topbar.tsx`**

```tsx
"use client";

import { useRole, ROLE_LABELS, ALL_ROLES } from "@/components/app-shell/role-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { role, setRole } = useRole();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-surface px-6">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer rounded-[var(--radius-sm)] border-metallic px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ledger">
            Preview role:{" "}
            <span className="font-medium text-ink">{ROLE_LABELS[role]}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Preview as role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_ROLES.map((r) => (
                <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                  {ROLE_LABELS[r]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer rounded-full border-metallic">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[linear-gradient(135deg,var(--brand-blue),var(--brand-blue-deep))] text-xs text-white">
                JD
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Jane Doe</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Log out</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/app-shell/topbar.tsx
git commit -m "Restyle topbar with surface background and metallic ring accents"
```

---

### Task 8: Clients pages — replace hardcoded white surfaces with tokens

**Files:**
- Modify: `app/(app)/clients/page.tsx:36`
- Modify: `app/(app)/clients/[slug]/page.tsx:60`, `app/(app)/clients/[slug]/page.tsx:99`

**Interfaces:**
- Consumes: `.bg-surface-raised` utility from Task 2.
- Produces: no API change.

**Before starting:** invoke the `frontend-design` and `ui-ux-pro-max` skills (CLAUDE.md rule).

- [ ] **Step 1: Fix the table container in `app/(app)/clients/page.tsx`**

Replace:
```tsx
      <div className="border border-border bg-white">
```
with:
```tsx
      <div className="border border-border bg-surface-raised">
```

- [ ] **Step 2: Fix both hardcoded surfaces in `app/(app)/clients/[slug]/page.tsx`**

Replace:
```tsx
        <div className="border border-border bg-white">
```
with:
```tsx
        <div className="border border-border bg-surface-raised">
```

And replace:
```tsx
        <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-white py-16 text-center">
```
with:
```tsx
        <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface-raised py-16 text-center">
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds. `text-clay`/`bg-clay` (used by the `TypeIndicator` "Texting" category) need no changes — they already inherit the new metallic-amber `--clay` value from Task 2.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/clients/page.tsx" "app/(app)/clients/[slug]/page.tsx"
git commit -m "Replace hardcoded white surfaces with dark surface-raised token on clients pages"
```

---

### Task 9: Login page — split-screen redesign with animated brand panel

**Files:**
- Modify: `app/login/page.tsx` (full file rewrite)

**Interfaces:**
- Consumes: `gradientDrift`, `shineSweep` from `lib/motion.ts`; `Button` with the new `pulse` prop (Task 4); `public/logo-mark.png` (Task 1); `.text-chrome` utility (Task 2).
- Produces: no external API change — still the default export for the `/login` route.

**Before starting:** invoke the `frontend-design` and `ui-ux-pro-max` skills (CLAUDE.md rule).

- [ ] **Step 1: Replace the full contents of `app/login/page.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gradientDrift, shineSweep } from "@/lib/motion";

export default function LoginPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const heroShineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!heroRef.current) return;
    const stopDrift = gradientDrift(heroRef.current);
    let stopShine: (() => void) | undefined;
    if (heroShineRef.current) {
      stopShine = shineSweep(heroShineRef.current, {
        loop: true,
        duration: 2.2,
      });
    }
    return () => {
      stopDrift();
      stopShine?.();
    };
  }, []);

  return (
    <div className="flex min-h-screen">
      <div
        ref={heroRef}
        className="relative hidden w-[55%] items-center justify-center overflow-hidden md:flex"
        style={{
          backgroundImage:
            "linear-gradient(var(--gradient-angle, 135deg), var(--void), var(--surface-raised-start) 45%, var(--metallic-edge) 100%)",
        }}
      >
        <span
          ref={heroShineRef}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 30%, rgba(48,169,223,0.25) 50%, transparent 70%)",
            transform: "translateX(-130%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative flex flex-col items-center gap-4 px-10 text-center">
          <Image
            src="/logo-mark.png"
            alt=""
            width={96}
            height={96}
            className="drop-shadow-[0_0_36px_rgba(48,169,223,0.55)]"
            priority
          />
          <p className="text-chrome font-heading text-2xl italic">ROVER</p>
          <p className="text-sm tracking-[0.2em] text-ink-muted uppercase">
            Customer Success Hub
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center md:hidden">
            <Image
              src="/logo-mark.png"
              alt=""
              width={48}
              height={48}
              className="mx-auto mb-3 drop-shadow-[0_0_20px_rgba(48,169,223,0.5)]"
            />
            <h1 className="font-heading text-2xl italic text-ink">ROVER</h1>
            <p className="mt-1 text-sm text-ink-muted">Customer Success Hub</p>
          </div>

          <p className="mb-6 hidden text-xs font-medium uppercase tracking-[0.2em] text-ink-muted md:block">
            Sign in
          </p>

          <form className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm text-ink">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="name@res-va.com"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm text-ink">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" pulse className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-muted">
            Access is by invitation only. Contact your System Administrator if
            you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "Redesign login page as animated split-screen with brand panel"
```

---

### Task 10: Update `docs/design-principles.md`

**Files:**
- Modify: `docs/design-principles.md` (full file rewrite)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Replace the full contents of `docs/design-principles.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/design-principles.md
git commit -m "Document the dark metallic design system, superseding the ledger-era doc"
```

---

### Task 11: Full visual QA pass

**Files:** none modified — verification only.

**Interfaces:** none.

- [ ] **Step 1: Run the full check suite**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all three succeed with zero errors.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev` (background)
Expected: server starts on `http://localhost:3000` (or reports the actual port if 3000 is taken).

- [ ] **Step 3: Visually inspect every page at desktop width**

Using the chrome-devtools MCP tools: navigate to and screenshot each of:
- `http://localhost:3000/login`
- `http://localhost:3000/clients`
- `http://localhost:3000/clients/brad-young`

at a 1440×900 viewport. Confirm: dark background throughout (no leftover
white/light panels), brand blue visible on active nav item / focused inputs
/ primary button, login left panel shows the animated gradient + glowing
brand mark, sidebar shows the brand mark icon next to "ROVER".

- [ ] **Step 4: Visually inspect at mobile width**

Resize the viewport to 390×844 and re-screenshot `/login` and `/clients`.
Confirm: login's left branding panel is hidden (per the `md:flex` /
`md:hidden` split) and the form is centered full-width with its own
mobile-only logo header; the app shell (sidebar/topbar) remains usable or
degrades gracefully — this plan did not add a mobile nav collapse, so note
any overflow issues as a follow-up rather than fixing ad hoc here.

- [ ] **Step 5: Verify `prefers-reduced-motion` is respected**

Using the chrome-devtools MCP `emulate` tool, set `prefers-reduced-motion:
reduce`, reload `/login`, and confirm the ambient shine sweep and gradient
drift on the left panel are static (no visible looping motion). Confirm
hover states (e.g. button background change) still work.

- [ ] **Step 6: Spot-check contrast**

Using the chrome-devtools MCP `evaluate_script` tool, read the computed
`color` and `background-color` of a `text-ink-muted` element (e.g. the
login footer note) against its `--void`/`--surface` background, and confirm
the ratio is at least 4.5:1 (WCAG AA for body text). If it fails, lighten
`--ink-muted` in `app/globals.css` (Task 2's file) by a small amount and
re-check — do not ship a contrast failure.

- [ ] **Step 7: Report results**

Summarize what was checked and any follow-ups identified (e.g. mobile nav
collapse) — do not silently fix out-of-scope issues; flag them instead.

---

## Self-Review Notes

- **Spec coverage:** color/material system → Task 2; motion system → Task 3
  (helpers) + Tasks 4/6/9 (application); app shell (sidebar/topbar/buttons)
  → Tasks 4, 6, 7; cards/tables → intentionally not given dedicated tasks
  because `Card` is unused anywhere in the app (verified via grep) and
  `Table`/`Avatar`/`DropdownMenu` are fully token-driven, so they inherit
  the new theme automatically from Task 2 with zero code changes — adding
  speculative shine/glow code to an unused component would violate YAGNI;
  login page → Task 9; docs update → Task 10; visual QA → Task 11.
- **Placeholder scan:** no TBD/TODO markers; every step has complete code
  or an exact command.
- **Type consistency:** `shineSweep`/`glowPulse`/`gradientDrift`/`staggerIn`
  signatures defined once in Task 3 and used identically in Tasks 4, 6, 9.
  `Button`'s new `pulse` prop is defined in Task 4 and consumed with the
  same name in Task 9.
