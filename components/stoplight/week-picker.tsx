"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWeekLabel, shiftWeek } from "@/lib/stoplight/week";

export function WeekPicker({ value }: { value: string }) {
  const router = useRouter();

  function navigate(next: string) {
    router.push(`/stoplight?week=${next}`);
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.05] p-1.5"
      aria-label="Week navigator"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0 rounded-[8px]"
        aria-label="Previous week"
        onClick={() => navigate(shiftWeek(value, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[200px] px-2 text-center text-[13px] font-semibold text-ink tabular">
        {formatWeekLabel(value)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0 rounded-[8px]"
        aria-label="Next week"
        onClick={() => navigate(shiftWeek(value, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
