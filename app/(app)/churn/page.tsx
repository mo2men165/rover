"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------- stub data ---------------------------------- */

type ChurnCategory = "known" | "unknown";
type DepositStatus = "keep" | "use" | "refund";
type RiskBand = "low" | "medium" | "high";

type ChurnSignal = { key: string; label: string; value: number };

type ChurnCase = {
  id: string;
  client: string;
  category: ChurnCategory;
  typeLabel: string;
  risk: number;
  deposit: DepositStatus;
  signals: ChurnSignal[];
  notes: string;
};

const CHURN_CASES: ChurnCase[] = [
  {
    id: "c1",
    client: "Acme Logistics",
    category: "known",
    typeLabel: "Known — Cold Calling",
    risk: 82,
    deposit: "refund",
    signals: [
      { key: "payment", label: "Payment Delay", value: 78 },
      { key: "complaints", label: "Complaint Freq.", value: 64 },
      { key: "engagement", label: "Engagement Drop", value: 88 },
      { key: "contract", label: "Contract Proximity", value: 92 },
      { key: "competitor", label: "Competitor Signal", value: 55 },
    ],
    notes:
      "Client mentioned pricing pressure from a competitor during the last renewal call; payments have slipped two cycles in a row.",
  },
  {
    id: "c2",
    client: "Bright Path Realty",
    category: "known",
    typeLabel: "Known — Texting Campaign",
    risk: 46,
    deposit: "use",
    signals: [
      { key: "payment", label: "Payment Delay", value: 20 },
      { key: "complaints", label: "Complaint Freq.", value: 48 },
      { key: "engagement", label: "Engagement Drop", value: 55 },
      { key: "contract", label: "Contract Proximity", value: 40 },
      { key: "competitor", label: "Competitor Signal", value: 30 },
    ],
    notes:
      "Two open complaints about lead quality this month; CSR has scheduled a call to review targeting criteria.",
  },
  {
    id: "c3",
    client: "Sterling Contractors",
    category: "unknown",
    typeLabel: "Unknown — Silent Drop-off",
    risk: 91,
    deposit: "refund",
    signals: [
      { key: "payment", label: "Payment Delay", value: 12 },
      { key: "complaints", label: "Complaint Freq.", value: 8 },
      { key: "engagement", label: "Engagement Drop", value: 96 },
      { key: "contract", label: "Contract Proximity", value: 85 },
      { key: "competitor", label: "Competitor Signal", value: 70 },
    ],
    notes:
      "No complaints on file, but engagement fell off a cliff three weeks ago with zero response to outreach. Renewal is 18 days out.",
  },
  {
    id: "c4",
    client: "Meridian Health Group",
    category: "unknown",
    typeLabel: "Unknown — Usage Decline",
    risk: 58,
    deposit: "keep",
    signals: [
      { key: "payment", label: "Payment Delay", value: 5 },
      { key: "complaints", label: "Complaint Freq.", value: 22 },
      { key: "engagement", label: "Engagement Drop", value: 60 },
      { key: "contract", label: "Contract Proximity", value: 35 },
      { key: "competitor", label: "Competitor Signal", value: 42 },
    ],
    notes:
      "Login and pull activity down roughly 40% month over month; no direct complaints raised yet. Flagged for a check-in call.",
  },
];

/* ---------------------------------- small building blocks ---------------------------------- */

// Matches dashboard's TONE_PANEL_CLASS.coral — this page's accent is
// coral/risk rather than the usual electric blue, and globals.css only
// ships glass-panel--{blue,violet,emerald,amber} modifiers, so the coral
// treatment is reproduced locally with the same arbitrary-value recipe.
const CORAL_GLASS =
  "border-[oklch(64%_0.19_25/0.32)] shadow-[inset_0_1px_0_0_var(--glass-border-strong),0_0_0_1px_oklch(64%_0.19_25/0.12),0_16px_40px_-16px_oklch(64%_0.19_25/0.25),0_12px_32px_-12px_rgba(0,0,0,0.55)]";

function riskBand(risk: number): RiskBand {
  if (risk >= 70) return "high";
  if (risk >= 40) return "medium";
  return "low";
}

const RISK_TEXT_CLASS: Record<RiskBand, string> = {
  low: "text-accent-emerald",
  medium: "text-accent-amber",
  high: "text-accent-coral",
};

const RISK_DOT_CLASS: Record<RiskBand, string> = {
  low: "bg-accent-emerald",
  medium: "bg-accent-amber",
  high: "bg-accent-coral",
};

const DEPOSIT_META: Record<DepositStatus, { label: string; text: string; bg: string }> = {
  keep: { label: "Keep", text: "text-accent-emerald", bg: "bg-[oklch(74%_0.16_152/0.14)]" },
  use: { label: "Use", text: "text-accent-amber", bg: "bg-[oklch(78%_0.15_85/0.14)]" },
  refund: { label: "Refund", text: "text-accent-coral", bg: "bg-[oklch(64%_0.19_25/0.14)]" },
};

const DEPOSIT_ORDER: DepositStatus[] = ["keep", "use", "refund"];

function polygonPoint(cx: number, cy: number, r: number, index: number, count = 5) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** Inline SVG radar/pentagon chart — 5 axes, 3 gridlines, 1 data polygon. */
function ChurnRadarChart({ signals }: { signals: ChurnSignal[] }) {
  const size = 232;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 14;
  const rings = [0.34, 0.67, 1];

  const ringPoints = rings.map((fraction) =>
    Array.from({ length: 5 }, (_, i) => {
      const p = polygonPoint(cx, cy, maxR * fraction, i);
      return `${p.x},${p.y}`;
    }).join(" ")
  );

  const axisEnds = Array.from({ length: 5 }, (_, i) => polygonPoint(cx, cy, maxR, i));

  const clampedValues = signals.map((s) => Math.max(0, Math.min(100, s.value)));
  const dataPoints = clampedValues.map((value, i) => polygonPoint(cx, cy, (value / 100) * maxR, i));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block h-56 w-56 max-w-full"
      role="img"
      aria-label="Churn risk signal radar chart. Exact values are listed in the readouts below."
    >
      {ringPoints.map((points, i) => (
        <polygon key={i} points={points} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      ))}
      {axisEnds.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
      ))}
      <polygon
        points={dataPolygon}
        fill="oklch(64% 0.19 25 / 0.28)"
        stroke="oklch(64% 0.19 25)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="oklch(64% 0.19 25)" />
      ))}
    </svg>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function ChurnPage() {
  const [category, setCategory] = useState<ChurnCategory>("known");
  const [selectedId, setSelectedId] = useState<string>(
    CHURN_CASES.find((c) => c.category === "known")?.id ?? CHURN_CASES[0].id
  );
  const [depositByCase, setDepositByCase] = useState<Record<string, DepositStatus>>(() =>
    Object.fromEntries(CHURN_CASES.map((c) => [c.id, c.deposit]))
  );

  const casesInCategory = CHURN_CASES.filter((c) => c.category === category);
  const selectedCase = CHURN_CASES.find((c) => c.id === selectedId) ?? casesInCategory[0];

  function handleCategoryChange(next: ChurnCategory) {
    setCategory(next);
    const firstInNext = CHURN_CASES.find((c) => c.category === next);
    if (firstInNext) setSelectedId(firstInNext.id);
  }

  return (
    <div className="page-shell">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">Client Success</p>
          <h1 className="font-heading text-[26px] font-bold not-italic text-ink">Churn Pipeline</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {casesInCategory.length} {category} churn case{casesInCategory.length === 1 ? "" : "s"} flagged for
            review
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-3">
          {casesInCategory.map((c) => {
            const band = riskBand(c.risk);
            const deposit = depositByCase[c.id] ?? c.deposit;
            const depositMeta = DEPOSIT_META[deposit];
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
                  <span className="font-medium text-ink">{c.client}</span>
                  <span
                    className={cn(
                      "tabular flex items-center gap-1.5 text-base font-semibold",
                      RISK_TEXT_CLASS[band]
                    )}
                  >
                    <span aria-hidden className={cn("size-1.5 rounded-full", RISK_DOT_CLASS[band])} />
                    {c.risk}%
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-ink-muted">
                    {c.typeLabel}
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", depositMeta.bg, depositMeta.text)}>
                    {depositMeta.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className={cn("glass-panel flex flex-col gap-6 rounded-[var(--radius-lg)] p-[26px]", CORAL_GLASS)}>
          {selectedCase ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold not-italic text-ink">{selectedCase.client}</h2>
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
                    <span className="tabular text-lg font-semibold text-accent-coral">{s.value}</span>
                    <span className="text-[10.5px] leading-tight text-ink-muted">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">Deposit Status</p>
                <div
                  className="glass-panel inline-flex items-center gap-1 self-start rounded-full p-1"
                  role="group"
                  aria-label="Deposit status"
                >
                  {DEPOSIT_ORDER.map((status) => {
                    const meta = DEPOSIT_META[status];
                    const active = (depositByCase[selectedCase.id] ?? selectedCase.deposit) === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setDepositByCase((prev) => ({ ...prev, [selectedCase.id]: status }))
                        }
                        className={cn(
                          "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          active ? cn(meta.bg, meta.text) : "text-ink-muted hover:text-ink"
                        )}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">Notes</p>
                <p className="text-sm leading-relaxed text-ink-muted">{selectedCase.notes}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">No cases in this category.</p>
          )}
        </div>
      </div>
    </div>
  );
}
