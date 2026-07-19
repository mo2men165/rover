"use client";

import { useState } from "react";
import { useRole } from "@/components/app-shell/role-context";
import { cn } from "@/lib/utils";

type StoplightView = "mine" | "team";
type Tone = "blue" | "emerald" | "amber" | "coral";
type Band = "Churn Signals" | "Growth Activity" | "Satisfaction";

type MetricKey =
  | "uncoveredChurns"
  | "coldCallChurns"
  | "smsChurns"
  | "upsells"
  | "referrals"
  | "referralPitches"
  | "clientCalls"
  | "dataSold"
  | "gapToGoal"
  | "highlySatisfied"
  | "mediumSatisfaction"
  | "riskOfChurn";

type CsrMetrics = { name: string } & Record<MetricKey, number>;

/* ---------------------------------- stub data ---------------------------------- */

const CSR_METRICS: CsrMetrics[] = [
  {
    name: "Scott Cooper",
    uncoveredChurns: 2,
    coldCallChurns: 1,
    smsChurns: 1,
    upsells: 6,
    referrals: 4,
    referralPitches: 9,
    clientCalls: 104,
    dataSold: 12,
    gapToGoal: 8,
    highlySatisfied: 22,
    mediumSatisfaction: 9,
    riskOfChurn: 3,
  },
  {
    name: "Kevin Williams",
    uncoveredChurns: 1,
    coldCallChurns: 2,
    smsChurns: 0,
    upsells: 8,
    referrals: 6,
    referralPitches: 11,
    clientCalls: 142,
    dataSold: 15,
    gapToGoal: 0,
    highlySatisfied: 28,
    mediumSatisfaction: 11,
    riskOfChurn: 2,
  },
  {
    name: "Priya Nair",
    uncoveredChurns: 3,
    coldCallChurns: 2,
    smsChurns: 2,
    upsells: 4,
    referrals: 2,
    referralPitches: 6,
    clientCalls: 96,
    dataSold: 8,
    gapToGoal: 18,
    highlySatisfied: 19,
    mediumSatisfaction: 7,
    riskOfChurn: 5,
  },
  {
    name: "Marcus Webb",
    uncoveredChurns: 2,
    coldCallChurns: 1,
    smsChurns: 1,
    upsells: 7,
    referrals: 5,
    referralPitches: 10,
    clientCalls: 128,
    dataSold: 14,
    gapToGoal: 5,
    highlySatisfied: 25,
    mediumSatisfaction: 8,
    riskOfChurn: 4,
  },
  {
    name: "Danielle Ortiz",
    uncoveredChurns: 1,
    coldCallChurns: 1,
    smsChurns: 2,
    upsells: 5,
    referrals: 3,
    referralPitches: 8,
    clientCalls: 119,
    dataSold: 11,
    gapToGoal: 11,
    highlySatisfied: 21,
    mediumSatisfaction: 10,
    riskOfChurn: 3,
  },
];

const MY_METRICS = CSR_METRICS[0];

function churnTone(value: number): Tone {
  if (value === 0) return "emerald";
  if (value <= 2) return "amber";
  return "coral";
}

function gapTone(value: number): Tone {
  if (value <= 5) return "emerald";
  if (value <= 15) return "amber";
  return "coral";
}

const METRIC_META: Record<
  MetricKey,
  { label: string; band: Band; suffix?: string; tone: (value: number) => Tone }
> = {
  uncoveredChurns: { label: "Uncovered Churns", band: "Churn Signals", tone: churnTone },
  coldCallChurns: { label: "Cold Call Churns", band: "Churn Signals", tone: churnTone },
  smsChurns: { label: "SMS Churns", band: "Churn Signals", tone: churnTone },
  upsells: { label: "Upsells", band: "Growth Activity", tone: () => "blue" },
  referrals: { label: "Referrals", band: "Growth Activity", tone: () => "blue" },
  referralPitches: { label: "Referral Pitches", band: "Growth Activity", tone: () => "blue" },
  clientCalls: { label: "Client Calls", band: "Growth Activity", tone: () => "blue" },
  dataSold: { label: "Data Sold", band: "Growth Activity", tone: () => "blue" },
  gapToGoal: { label: "Gap to Goal", band: "Growth Activity", suffix: "%", tone: gapTone },
  highlySatisfied: { label: "Highly Satisfied", band: "Satisfaction", tone: () => "emerald" },
  mediumSatisfaction: { label: "Medium Satisfaction", band: "Satisfaction", tone: () => "amber" },
  riskOfChurn: { label: "Risk of Churn", band: "Satisfaction", tone: () => "coral" },
};

const METRIC_ORDER: MetricKey[] = [
  "uncoveredChurns",
  "coldCallChurns",
  "smsChurns",
  "upsells",
  "referrals",
  "referralPitches",
  "clientCalls",
  "dataSold",
  "gapToGoal",
  "highlySatisfied",
  "mediumSatisfaction",
  "riskOfChurn",
];

const BAND_COUNT: Record<Band, number> = {
  "Churn Signals": 3,
  "Growth Activity": 6,
  Satisfaction: 3,
};

const BAND_TEXT_CLASS: Record<Band, string> = {
  "Churn Signals": "text-accent-coral",
  "Growth Activity": "text-ledger",
  Satisfaction: "text-accent-emerald",
};

function aggregateMetrics(rows: CsrMetrics[]): Record<MetricKey, number> {
  const sums = METRIC_ORDER.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<MetricKey, number>);

  rows.forEach((row) => {
    METRIC_ORDER.forEach((key) => {
      sums[key] += row[key];
    });
  });

  sums.gapToGoal = Math.round(sums.gapToGoal / rows.length);
  return sums;
}

const TEAM_METRICS = aggregateMetrics(CSR_METRICS);

const TONE_TEXT_CLASS: Record<Tone, string> = {
  blue: "text-ledger",
  emerald: "text-accent-emerald",
  amber: "text-accent-amber",
  coral: "text-accent-coral",
};

/* ---------------------------------- small building blocks ---------------------------------- */

function MetricTile({
  metricKey,
  value,
}: {
  metricKey: MetricKey;
  value: number;
}) {
  const meta = METRIC_META[metricKey];
  const tone = meta.tone(value);

  return (
    <div className="glass-panel flex flex-col gap-1 rounded-[var(--radius-lg)] p-4">
      <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">{meta.label}</p>
      <p className={cn("font-heading text-2xl font-bold not-italic tabular-nums", TONE_TEXT_CLASS[tone])}>
        {value}
        {meta.suffix}
      </p>
    </div>
  );
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* ---------------------------------- page ---------------------------------- */

export default function StoplightPage() {
  const { role } = useRole();
  const view: StoplightView = role === "csr" ? "mine" : "team";
  const [rangeStart, setRangeStart] = useState("2026-07-01");
  const [rangeEnd, setRangeEnd] = useState("2026-07-17");

  const metrics = view === "mine" ? MY_METRICS : TEAM_METRICS;

  return (
    <div className="page-shell">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold not-italic text-ink">Stoplight Report</h1>
          <p className="text-sm text-ink-muted">
            Metrics for {formatDateLabel(rangeStart)} – {formatDateLabel(rangeEnd)}
          </p>
        </div>
        <DateRangePicker
          start={rangeStart}
          end={rangeEnd}
          onStartChange={setRangeStart}
          onEndChange={setRangeEnd}
        />
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {METRIC_ORDER.map((key) => (
          <MetricTile key={key} metricKey={key} value={metrics[key]} />
        ))}
      </div>

      {view === "team" && (
        <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-5">
          <h2 className="font-heading text-base font-semibold not-italic text-ink">Per-CSR Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] caption-bottom text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th rowSpan={2} className="py-2 pr-2 text-left align-bottom text-xs font-medium text-ink-muted uppercase">
                    CSR
                  </th>
                  {(Object.keys(BAND_COUNT) as Band[]).map((band) => (
                    <th
                      key={band}
                      colSpan={BAND_COUNT[band]}
                      className={cn(
                        "border-b border-white/10 py-1.5 text-center text-[10px] font-semibold tracking-wider uppercase",
                        BAND_TEXT_CLASS[band]
                      )}
                    >
                      {band}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-white/10 text-left text-xs text-ink-muted">
                  {METRIC_ORDER.map((key) => (
                    <th key={key} className="py-2 pr-2 text-right font-medium whitespace-nowrap">
                      {METRIC_META[key].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CSR_METRICS.map((row) => (
                  <tr key={row.name} className="border-b border-white/[0.06] last:border-0">
                    <td className="py-2 pr-2 font-medium whitespace-nowrap text-ink">{row.name}</td>
                    {METRIC_ORDER.map((key) => {
                      const meta = METRIC_META[key];
                      const tone = meta.tone(row[key]);
                      return (
                        <td
                          key={key}
                          className={cn("tabular py-2 pr-2 text-right", TONE_TEXT_CLASS[tone])}
                        >
                          {row[key]}
                          {meta.suffix}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
