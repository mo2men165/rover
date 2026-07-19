"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChurnRadarChart } from "@/components/churn/churn-radar-chart";
import { updateChurnDeposit } from "@/lib/actions/flag-churn";
import { DEPOSIT_STATUS_LABELS } from "@/lib/supabase/labels";
import { riskBand } from "@/lib/churn/score";
import type { Database } from "@/lib/supabase/database.types";

type ChurnCategory = Database["public"]["Enums"]["churn_type"];
type DepositStatus = Database["public"]["Enums"]["deposit_status"];

export type ChurnCaseView = {
  id: string;
  clientId: string;
  clientName: string;
  contactName: string;
  category: ChurnCategory;
  typeLabel: string;
  risk: number;
  deposit: DepositStatus | null;
  signals: { key: string; label: string; value: number }[];
  notes: string;
  flagged: boolean;
};

const CORAL_GLASS =
  "border-[oklch(64%_0.19_25/0.32)] shadow-[inset_0_1px_0_0_var(--glass-border-strong),0_0_0_1px_oklch(64%_0.19_25/0.12),0_16px_40px_-16px_oklch(64%_0.19_25/0.25),0_12px_32px_-12px_rgba(0,0,0,0.55)]";

const RISK_TEXT_CLASS = {
  low: "text-accent-emerald",
  medium: "text-accent-amber",
  high: "text-accent-coral",
} as const;

const RISK_DOT_CLASS = {
  low: "bg-accent-emerald",
  medium: "bg-accent-amber",
  high: "bg-accent-coral",
} as const;

const DEPOSIT_META: Record<
  DepositStatus,
  { label: string; text: string; bg: string }
> = {
  keep: {
    label: DEPOSIT_STATUS_LABELS.keep,
    text: "text-accent-emerald",
    bg: "bg-[oklch(74%_0.16_152/0.14)]",
  },
  use: {
    label: DEPOSIT_STATUS_LABELS.use,
    text: "text-accent-amber",
    bg: "bg-[oklch(78%_0.15_85/0.14)]",
  },
  refund: {
    label: DEPOSIT_STATUS_LABELS.refund,
    text: "text-accent-coral",
    bg: "bg-[oklch(64%_0.19_25/0.14)]",
  },
};

const DEPOSIT_ORDER: DepositStatus[] = ["keep", "use", "refund"];

export function ChurnPipeline({
  initialCases,
}: {
  initialCases: ChurnCaseView[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState<ChurnCategory>("known");
  const casesInCategory = initialCases.filter((c) => c.category === category);
  const [selectedId, setSelectedId] = useState<string>(
    casesInCategory[0]?.id ?? initialCases[0]?.id ?? ""
  );
  const [depositBusy, setDepositBusy] = useState(false);

  const selectedCase =
    initialCases.find((c) => c.id === selectedId) ?? casesInCategory[0] ?? null;

  function handleCategoryChange(next: ChurnCategory) {
    setCategory(next);
    const first = initialCases.find((c) => c.category === next);
    if (first) setSelectedId(first.id);
  }

  async function handleDeposit(status: DepositStatus) {
    if (!selectedCase) return;
    setDepositBusy(true);
    await updateChurnDeposit({
      churnRecordId: selectedCase.id,
      depositStatus: status,
    });
    setDepositBusy(false);
    router.refresh();
  }

  return (
    <div className="page-shell">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
            Client Success
          </p>
          <h1 className="font-heading text-[26px] font-bold not-italic text-ink">
            Churn Pipeline
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {casesInCategory.length} {category} case
            {casesInCategory.length === 1 ? "" : "s"} flagged for review
          </p>
        </div>

        <div
          className="glass-panel inline-flex items-center gap-1 rounded-full p-1"
          role="group"
          aria-label="Churn category"
        >
          {(["known", "unknown"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              onClick={() => handleCategoryChange(cat)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                category === cat
                  ? "bg-[oklch(64%_0.19_25/0.20)] text-accent-coral shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              {cat === "known" ? "Known Churn" : "Unknown Churn"}
            </button>
          ))}
        </div>
      </header>

      {casesInCategory.length === 0 ? (
        <div className="glass-panel rounded-[var(--radius-lg)] p-8 text-center text-sm text-ink-muted">
          No {category} churn cases yet. Flag a client from their profile, or wait
          for elevated auto-scores (≥40) to appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-3">
            {casesInCategory.map((c) => {
              const band = riskBand(c.risk);
              const deposit = c.deposit;
              const depositMeta = deposit ? DEPOSIT_META[deposit] : null;
              const selected = selectedCase?.id === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-pressed={selected}
                  className={cn(
                    "glass-panel flex flex-col gap-3 rounded-[var(--radius-lg)] p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    selected ? CORAL_GLASS : "hover:bg-white/[0.04]"
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{c.clientName}</span>
                    <span
                      className={cn(
                        "tabular flex items-center gap-1.5 text-base font-semibold",
                        RISK_TEXT_CLASS[band]
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn("size-1.5 rounded-full", RISK_DOT_CLASS[band])}
                      />
                      {c.risk}%
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-ink-muted">
                      {c.typeLabel}
                    </span>
                    {depositMeta && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          depositMeta.bg,
                          depositMeta.text
                        )}
                      >
                        {depositMeta.label}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              "glass-panel flex flex-col gap-6 rounded-[var(--radius-lg)] p-[26px]",
              CORAL_GLASS
            )}
          >
            {selectedCase ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold not-italic text-ink">
                      {selectedCase.clientName}
                    </h2>
                    <p className="text-sm text-ink-muted">{selectedCase.typeLabel}</p>
                  </div>
                  <span
                    className={cn(
                      "tabular font-heading text-3xl font-bold not-italic",
                      RISK_TEXT_CLASS[riskBand(selectedCase.risk)]
                    )}
                  >
                    {selectedCase.risk}%
                  </span>
                </div>

                <ChurnRadarChart signals={selectedCase.signals} />

                <div className="grid grid-cols-5 gap-2 text-center">
                  {selectedCase.signals.map((s) => (
                    <div key={s.key} className="flex flex-col gap-1">
                      <span className="tabular text-lg font-semibold text-accent-coral">
                        {s.value}
                      </span>
                      <span className="text-[10.5px] leading-tight text-ink-muted">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
                    Deposit Status
                  </p>
                  <div
                    className="glass-panel inline-flex items-center gap-1 self-start rounded-full p-1"
                    role="group"
                    aria-label="Deposit status"
                  >
                    {DEPOSIT_ORDER.map((status) => {
                      const meta = DEPOSIT_META[status];
                      const active = selectedCase.deposit === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={depositBusy}
                          aria-pressed={active}
                          onClick={() => handleDeposit(status)}
                          className={cn(
                            "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
                            active
                              ? cn(meta.bg, meta.text)
                              : "text-ink-muted hover:text-ink"
                          )}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
                    Notes
                  </p>
                  <p className="text-sm leading-relaxed text-ink-muted">
                    {selectedCase.notes}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">No cases in this category.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
