"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChurnRadarChart } from "@/components/churn/churn-radar-chart";
import { FlagChurnDialog } from "@/components/churn/flag-churn-dialog";
import { refreshChurnScore } from "@/lib/actions/refresh-churn-score";
import { riskBand } from "@/lib/churn/score";
import { cn } from "@/lib/utils";

export type HealthIndexSignal = {
  key: string;
  label: string;
  value: number;
  available: boolean;
};

export type HealthIndexData = {
  clientId: string;
  riskScore: number | null;
  computedAt: string | null;
  signals: HealthIndexSignal[];
  flagged: boolean;
  churnType: "known" | "unknown" | null;
};

const RISK_TEXT = {
  low: "text-accent-emerald",
  medium: "text-accent-amber",
  high: "text-accent-coral",
} as const;

export function HealthIndexCard({ data }: { data: HealthIndexData }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = data.riskScore ?? 0;
  const band = riskBand(score);
  const radarSignals = data.signals.map((s) => ({
    key: s.key,
    label: s.label,
    value: s.available ? s.value : 0,
  }));

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    const result = await refreshChurnScore(data.clientId, true);
    setRefreshing(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 glass-panel rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
          Churn Risk
        </h2>
        <div className="flex items-center gap-2">
          {data.flagged && (
            <span className="rounded-full border border-[oklch(64%_0.19_25/0.35)] bg-[oklch(64%_0.19_25/0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-coral">
              {data.churnType === "known" ? "Known churn" : "Suspected"}
            </span>
          )}
          <span className={cn("font-heading text-2xl font-bold tabular", RISK_TEXT[band])}>
            {data.riskScore === null ? "—" : Math.round(score)}
            <span className="text-sm font-normal text-ink-muted">/100</span>
          </span>
        </div>
      </div>

      {data.signals.length > 0 ? (
        <>
          <ChurnRadarChart signals={radarSignals} className="h-44 w-44" />
          <div className="grid grid-cols-1 gap-2">
            {data.signals.map((s) => (
              <div key={s.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">{s.label}</span>
                  <span className="tabular text-ink">
                    {s.available ? Math.round(s.value) : "n/a"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      !s.available
                        ? "bg-white/20"
                        : s.value >= 70
                          ? "bg-accent-coral"
                          : s.value >= 40
                            ? "bg-accent-amber"
                            : "bg-accent-emerald"
                    )}
                    style={{ width: `${s.available ? s.value : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-muted">
          Score not computed yet. Refresh to run the 5-signal model.
        </p>
      )}

      {error && <p className="text-xs text-accent-coral">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Refresh score
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setFlagOpen(true)}>
          Flag churn
        </Button>
      </div>

      {data.computedAt && (
        <p className="text-xs text-ink-faint">
          Computed {new Date(data.computedAt).toLocaleString()}
        </p>
      )}

      {flagOpen && (
        <FlagChurnDialog
          clientId={data.clientId}
          onClose={() => setFlagOpen(false)}
          onFlagged={() => {
            setFlagOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
