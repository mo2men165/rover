// Extracted from button.tsx (which has "use client") so Server Components
// can call buttonVariants() directly -- Next.js RSC treats every export of
// a "use client" module as a client reference, so calling a plain function
// like buttonVariants from a Server Component throws at runtime even
// though it does no client-only work. This file has no directive, so it's
// safe to import from either server or client code.

import { cva, type VariantProps } from "class-variance-authority"

export const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap backdrop-blur-md transition-all duration-200 outline-none select-none hover:-translate-y-px active:not-aria-[haspopup]:translate-y-0 active:not-aria-[haspopup]:scale-[0.98] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      // Matched to Rover-Components.dc.html Buttons section.
      variant: {
        default:
          "border-[oklch(74%_0.15_224/0.4)] bg-[linear-gradient(180deg,var(--brand-button-start),var(--brand-button-end))] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_6px_16px_oklch(46%_0.15_260/0.35)] hover:brightness-110 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_10px_22px_oklch(46%_0.15_260/0.45)]",
        outline:
          "border-white/[0.14] bg-white/[0.06] text-ink hover:bg-white/[0.1] hover:border-white/[0.22]",
        secondary:
          "border-white/[0.14] bg-white/[0.06] text-ink hover:bg-white/[0.1] hover:border-white/[0.22] aria-expanded:bg-white/[0.1]",
        ghost:
          "border-transparent bg-transparent text-ink-muted hover:bg-white/[0.05] hover:text-ink aria-expanded:bg-white/[0.05] aria-expanded:text-ink",
        destructive:
          "border-[oklch(64%_0.19_25/0.5)] bg-[oklch(64%_0.19_25/0.14)] text-[oklch(78%_0.15_25)] hover:bg-[oklch(64%_0.19_25/0.24)] focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-auto gap-1.5 px-5 py-[11px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-auto gap-1 rounded-lg px-3.5 py-2 text-[13px] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-auto gap-1 rounded-lg px-3.5 py-2 text-[13px] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-auto gap-1.5 px-5 py-3 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-11 rounded-xl",
        "icon-xs":
          "size-6 rounded-lg in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[10px] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
