"use client";

import { useEffect, useRef } from "react";
import { countUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ACCENTS = {
  blue: "glass-panel--blue text-ledger",
  violet: "glass-panel--violet text-accent-violet",
  emerald: "glass-panel--emerald text-accent-emerald",
  amber: "glass-panel--amber text-accent-amber",
} as const;

export function StatTile({
  label,
  value,
  prefix,
  suffix,
  decimals,
  accent = "blue",
  className,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accent?: keyof typeof ACCENTS;
  className?: string;
}) {
  const valueRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!valueRef.current) return;
    return countUp(valueRef.current, value, { prefix, suffix, decimals });
  }, [value, prefix, suffix, decimals]);

  return (
    <div
      className={cn(
        "glass-panel flex flex-col gap-2 rounded-2xl p-5",
        ACCENTS[accent],
        className
      )}
    >
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p ref={valueRef} className="font-mono text-[32px] font-semibold leading-none not-italic text-ink tabular-nums">
        {prefix}
        {value.toLocaleString("en-US", {
          minimumFractionDigits: decimals ?? 0,
          maximumFractionDigits: decimals ?? 0,
        })}
        {suffix}
      </p>
    </div>
  );
}
