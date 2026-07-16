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

const menuTriggerClass =
  "inline-flex h-9 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border-metallic px-3 text-sm text-ink transition-colors hover:text-ledger";

export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  function navigate(next: string) {
    router.push(`/commissions?month=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        aria-label="Previous month"
        onClick={() => navigate(shiftMonth(value, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger className={`${menuTriggerClass} min-w-[8.75rem]`}>
          <span>{MONTHS[month - 1]}</span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
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

      <DropdownMenu>
        <DropdownMenuTrigger className={`${menuTriggerClass} min-w-[5.5rem]`}>
          <span className="tabular">{year}</span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        aria-label="Next month"
        onClick={() => navigate(shiftMonth(value, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
