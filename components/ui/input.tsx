import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Matched to Rover-Components.dc.html Inputs.
        "h-auto w-full min-w-0 rounded-[11px] border border-white/[0.14] bg-black/20 px-3.5 py-[11px] text-sm text-foreground shadow-none transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-[oklch(74%_0.15_224/0.35)] focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
