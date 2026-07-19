"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { shineSweep, glowPulse } from "@/lib/motion"
import { buttonVariants } from "@/components/ui/button-variants"

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
