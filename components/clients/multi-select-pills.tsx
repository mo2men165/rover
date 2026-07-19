"use client";

import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export function MultiSelectPills({
  options,
  selected,
  onChange,
  className,
}: {
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const checked = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={checked}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium backdrop-blur-sm transition-all",
              checked
                ? "border-[oklch(74%_0.15_224/0.5)] bg-[oklch(74%_0.15_224/0.16)] text-ledger shadow-[0_0_0_1px_oklch(74%_0.15_224/0.2),0_0_16px_0_oklch(74%_0.15_224/0.25)]"
                : "border-white/10 bg-white/[0.03] text-ink-muted hover:border-white/20 hover:bg-white/[0.06] hover:text-ink"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
