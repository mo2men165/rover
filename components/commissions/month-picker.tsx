"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function toMonthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(monthStr: string, delta: number) {
  const [year, m] = monthStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, m - 1 + delta, 1));
  return toMonthValue(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1);
}

function yearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);
}

const segmentTriggerClass =
  "inline-flex h-7 min-w-20 cursor-pointer items-center justify-center gap-1 rounded-[8px] px-2 text-[13px] font-semibold text-ink transition-colors hover:bg-white/[0.06] hover:text-ledger";

export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  function navigate(next: string) {
    router.push(`/commissions?month=${next}`);
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.05] p-1.5"
      aria-label="Month navigator"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0 rounded-[8px]"
        aria-label="Previous month"
        onClick={() => navigate(shiftMonth(value, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger className={segmentTriggerClass}>
          <span>{MONTHS[month - 1]}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-64 min-w-32 overflow-y-auto">
          {MONTHS.map((label, index) => (
            <DropdownMenuItem
              key={label}
              className={cn(index + 1 === month && "font-medium text-ledger")}
              onClick={() => navigate(toMonthValue(year, index + 1))}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="text-sm text-ink-muted">·</span>

      <DropdownMenu>
        <DropdownMenuTrigger className={cn(segmentTriggerClass, "min-w-12 gap-1")}>
          <span className="tabular">{year}</span>
          <ChevronDown className="size-3 shrink-0 text-ink-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-20">
          {yearOptions().map((y) => (
            <DropdownMenuItem
              key={y}
              className={cn(y === year && "font-medium text-ledger")}
              onClick={() => navigate(toMonthValue(y, month))}
            >
              {y}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0 rounded-[8px]"
        aria-label="Next month"
        onClick={() => navigate(shiftMonth(value, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
