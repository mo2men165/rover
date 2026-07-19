"use client";

import Link from "next/link";
import {
  UPSELL_STAGE_LABELS,
  UPSELL_TYPE_LABELS,
  UPSELL_UNIT_AMOUNTS,
} from "@/lib/supabase/labels";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

type UpsellStage = Database["public"]["Enums"]["upsell_stage"];
type UpsellType = Database["public"]["Enums"]["upsell_type"];

export type ClientOpportunityRow = {
  id: string;
  upsellType: UpsellType;
  stage: UpsellStage;
  quantity: number;
  snoozeUntil: string | null;
  csrName: string;
};

const STAGE_EDGE: Record<UpsellStage, string> = {
  opportunity: "border-l-white/30",
  pitched: "border-l-brand-blue",
  pending: "border-l-accent-amber",
  won: "border-l-accent-emerald",
  lost: "border-l-accent-coral",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ClientOpportunitiesPanel({
  opportunities,
}: {
  opportunities: ClientOpportunityRow[];
}) {
  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col gap-3 glass-panel rounded-[var(--radius-lg)] p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
            Upsell Opportunities
          </h2>
          <Link
            href="/upsells"
            className="text-xs text-ledger hover:underline"
          >
            Open pipeline
          </Link>
        </div>
        <p className="text-sm text-ink-muted">
          No active opportunities for this client.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 glass-panel rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
          Upsell Opportunities
        </h2>
        <Link href="/upsells" className="text-xs text-ledger hover:underline">
          Open pipeline
        </Link>
      </div>
      <ul className="flex flex-col gap-2.5">
        {opportunities.map((opp) => {
          const due =
            opp.stage === "pending" &&
            opp.snoozeUntil != null &&
            opp.snoozeUntil <= todayIso();
          const value = UPSELL_UNIT_AMOUNTS[opp.upsellType] * opp.quantity;
          return (
            <li
              key={opp.id}
              className={cn(
                "rounded-[12px] border border-white/[0.1] border-l-[3px] bg-white/[0.04] p-3",
                STAGE_EDGE[opp.stage],
                due && "bg-[oklch(64%_0.19_25/0.08)]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {UPSELL_TYPE_LABELS[opp.upsellType]}
                    {opp.upsellType === "add_cc_seat" && opp.quantity > 1
                      ? ` ×${opp.quantity}`
                      : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {UPSELL_STAGE_LABELS[opp.stage]} · {opp.csrName}
                  </p>
                </div>
                <span className="tabular text-sm font-semibold text-ledger">
                  ${value.toLocaleString("en-US")}
                </span>
              </div>
              {opp.stage === "pending" && opp.snoozeUntil && (
                <p
                  className={cn(
                    "mt-2 text-[11px] font-medium",
                    due ? "text-accent-coral" : "text-accent-amber"
                  )}
                >
                  {due ? "Snooze due" : "Snoozed until"} {opp.snoozeUntil}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
