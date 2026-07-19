"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { confirmStoplightWeek } from "@/lib/actions/confirm-stoplight-week";
import { WeekPicker } from "@/components/stoplight/week-picker";
import { LogReferralForm } from "@/components/stoplight/log-referral-form";
import { QuotasEditor } from "@/components/stoplight/quotas-editor";
import type {
  CsrMetrics,
  MetricKey,
  StoplightPayload,
} from "@/lib/stoplight/load";
import { formatWeekLabel } from "@/lib/stoplight/week";

type Tone = "blue" | "emerald" | "amber" | "coral";
type Band = "Churn Signals" | "Growth Activity" | "Satisfaction";

function churnTone(value: number): Tone {
  if (value === 0) return "emerald";
  if (value <= 2) return "amber";
  return "coral";
}

function gapTone(value: number): Tone {
  if (value <= 0) return "emerald";
  if (value <= 2000) return "amber";
  return "coral";
}

const METRIC_META: Record<
  MetricKey,
  {
    label: string;
    band: Band;
    tone: (value: number) => Tone;
    format?: (value: number) => string;
  }
> = {
  uncoveredChurns: { label: "Uncovered Churns", band: "Churn Signals", tone: churnTone },
  coldCallChurns: { label: "Cold Call Churns", band: "Churn Signals", tone: churnTone },
  smsChurns: { label: "SMS Churns", band: "Churn Signals", tone: churnTone },
  upsells: { label: "Upsells", band: "Growth Activity", tone: () => "blue" },
  referrals: { label: "Referrals", band: "Growth Activity", tone: () => "blue" },
  referralPitches: { label: "Referral Pitches", band: "Growth Activity", tone: () => "blue" },
  clientCalls: { label: "Client Calls", band: "Growth Activity", tone: () => "blue" },
  dataSold: {
    label: "Data Sold",
    band: "Growth Activity",
    tone: () => "blue",
    format: (v) =>
      v.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
  },
  gapToGoal: {
    label: "Gap to Goal",
    band: "Growth Activity",
    tone: gapTone,
    format: (v) => {
      const sign = v > 0 ? "+" : "";
      return `${sign}${v.toLocaleString()} rec`;
    },
  },
  // Current book snapshot (not week-scoped) — Part 3 risk bands.
  highlySatisfied: { label: "Highly Satisfied", band: "Satisfaction", tone: () => "emerald" },
  mediumSatisfaction: { label: "Med Satisfaction", band: "Satisfaction", tone: () => "amber" },
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

const TONE_TEXT_CLASS: Record<Tone, string> = {
  blue: "text-ledger",
  emerald: "text-accent-emerald",
  amber: "text-accent-amber",
  coral: "text-accent-coral",
};

function formatMetric(key: MetricKey, value: number) {
  const meta = METRIC_META[key];
  return meta.format ? meta.format(value) : String(value);
}

function aggregateMetrics(rows: CsrMetrics[]): Record<MetricKey, number> {
  const sums = METRIC_ORDER.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<MetricKey, number>
  );
  for (const row of rows) {
    for (const key of METRIC_ORDER) sums[key] += row[key];
  }
  return sums;
}

function MetricTile({
  metricKey,
  value,
  placeholder,
}: {
  metricKey: MetricKey;
  value: number;
  placeholder?: string;
}) {
  const meta = METRIC_META[metricKey];
  const tone = meta.tone(value);
  return (
    <div className="glass-panel flex flex-col gap-1 rounded-[var(--radius-lg)] p-4">
      <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
        {meta.label}
      </p>
      <p
        className={cn(
          "font-heading text-2xl font-bold not-italic tabular-nums",
          placeholder ? "text-ink-muted" : TONE_TEXT_CLASS[tone]
        )}
      >
        {placeholder ?? formatMetric(metricKey, value)}
      </p>
    </div>
  );
}

function ConfirmWeekButton({
  weekStart,
  csrId,
  alreadyConfirmed,
  confirmedAt,
}: {
  weekStart: string;
  csrId?: string;
  alreadyConfirmed: boolean;
  confirmedAt: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (alreadyConfirmed) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-accent-emerald">
        <Check className="size-4" aria-hidden />
        Confirmed
        {confirmedAt
          ? ` · ${new Date(confirmedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}`
          : ""}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await confirmStoplightWeek({ weekStart, csrId });
            if (!result.success) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Confirming…" : "Confirm week (Friday review)"}
      </Button>
      {error && <p className="text-xs text-accent-coral">{error}</p>}
    </div>
  );
}

export function StoplightReport({ data }: { data: StoplightPayload }) {
  const headline = data.view === "mine" ? (data.rows[0] ?? null) : null;
  const tileSource =
    data.view === "mine" && headline
      ? headline
      : aggregateMetrics(data.rows);

  return (
    <div className="page-shell">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold not-italic text-ink">
            Stoplight Report
          </h1>
          <p className="text-sm text-ink-muted">
            {data.view === "mine" ? "Your week" : "Team dashboard"} ·{" "}
            {formatWeekLabel(data.weekStart)} · {data.quarter}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WeekPicker value={data.weekStart} />
          {data.view === "mine" && headline && (
            <ConfirmWeekButton
              weekStart={data.weekStart}
              alreadyConfirmed={headline.weekConfirmed}
              confirmedAt={headline.weekConfirmedAt}
            />
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {METRIC_ORDER.map((key) => {
          const noQuota =
            key === "gapToGoal" &&
            data.view === "mine" &&
            headline?.recordsTarget == null;
          return (
            <MetricTile
              key={key}
              metricKey={key}
              value={tileSource[key]}
              placeholder={noQuota ? "—" : undefined}
            />
          );
        })}
      </div>
      <p className="text-xs text-ink-muted">
        Satisfaction columns reflect the current book (risk &lt;40 / 40–69 / ≥70), not the
        selected week. Gap to Goal is records QTD vs quarterly quota (positive = still short).
      </p>

      {data.view === "team" && (
        <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-5">
          <h2 className="font-heading text-base font-semibold not-italic text-ink">
            Per-CSR Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] caption-bottom text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th
                    rowSpan={2}
                    className="py-2 pr-2 text-left align-bottom text-xs font-medium text-ink-muted uppercase"
                  >
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
                  <th
                    rowSpan={2}
                    className="py-2 pl-3 text-left align-bottom text-xs font-medium text-ink-muted uppercase"
                  >
                    Review
                  </th>
                </tr>
                <tr className="border-b border-white/10 text-left text-xs text-ink-muted">
                  {METRIC_ORDER.map((key) => (
                    <th
                      key={key}
                      className="py-2 pr-2 text-right font-medium whitespace-nowrap"
                    >
                      {METRIC_META[key].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.csrId}
                    className="border-b border-white/[0.06] last:border-0"
                  >
                    <td className="py-2 pr-2 font-medium whitespace-nowrap text-ink">
                      {row.name}
                    </td>
                    {METRIC_ORDER.map((key) => {
                      const meta = METRIC_META[key];
                      const tone = meta.tone(row[key]);
                      const display =
                        key === "gapToGoal" && row.recordsTarget == null
                          ? "—"
                          : formatMetric(key, row[key]);
                      return (
                        <td
                          key={key}
                          className={cn(
                            "tabular py-2 pr-2 text-right whitespace-nowrap",
                            display === "—" ? "text-ink-muted" : TONE_TEXT_CLASS[tone]
                          )}
                        >
                          {display}
                        </td>
                      );
                    })}
                    <td className="py-2 pl-3">
                      <ConfirmWeekButton
                        weekStart={data.weekStart}
                        csrId={row.csrId}
                        alreadyConfirmed={row.weekConfirmed}
                        confirmedAt={row.weekConfirmedAt}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-5">
          <div>
            <h2 className="font-heading text-base font-semibold not-italic text-ink">
              Log referral pitch
            </h2>
            <p className="text-sm text-ink-muted">
              Record a pitch now. Convert it when the referred client is
              onboarded via{" "}
              <Link
                href="/clients/new"
                className="text-ledger underline-offset-2 hover:underline"
              >
                Add Client
              </Link>
              .
            </p>
          </div>
          <LogReferralForm clients={data.clientOptions} />
          {data.openPitches.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <p className="mb-2 text-xs font-medium tracking-wider text-ink-muted uppercase">
                Open pitches
              </p>
              <ul className="flex flex-col gap-2">
                {data.openPitches.map((p) => (
                  <li key={p.id} className="text-sm text-ink">
                    <span className="font-medium">
                      {p.companyName
                        ? `${p.companyName} — ${p.referringClientName}`
                        : p.referringClientName}
                    </span>
                    {p.notes ? (
                      <span className="text-ink-muted"> · {p.notes}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-5">
          <h2 className="font-heading text-base font-semibold not-italic text-ink">
            Quarterly quotas
          </h2>
          <QuotasEditor
            quotas={data.quotas}
            quarter={data.quarter}
            editable={data.canEditQuotas}
          />
        </div>
      </div>
    </div>
  );
}
