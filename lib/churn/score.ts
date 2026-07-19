import type { Json } from "@/lib/supabase/database.types";

export type SignalKey =
  | "declining_performance"
  | "missed_checkin"
  | "unresolved_complaints"
  | "stale_open_complaint"
  | "negative_sentiment";

export type SignalResult = {
  key: SignalKey;
  label: string;
  score: number | null;
  available: boolean;
  weight: number;
  detail?: Record<string, unknown>;
};

export type ChurnScoreResult = {
  riskScore: number;
  computedAt: string;
  signals: SignalResult[];
  /** Persistable jsonb payload for churn_records.signals */
  signalsJson: Json;
};

export const SIGNAL_META: Record<
  SignalKey,
  { label: string; weight: number }
> = {
  declining_performance: { label: "Declining Performance", weight: 0.2 },
  missed_checkin: { label: "Missed Check-in", weight: 0.2 },
  unresolved_complaints: { label: "Unresolved Complaints", weight: 0.2 },
  stale_open_complaint: { label: "Stale Open Complaint", weight: 0.25 },
  negative_sentiment: { label: "Negative Sentiment", weight: 0.15 },
};

export function riskBand(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function clamp100(n: number) {
  return Math.max(0, Math.min(100, n));
}

/** Signal 1 — last 30d vs prior 30d volume + acceptance on company data lists. */
export function scoreDecliningPerformance(
  lists: { list_date: string; records_count: number; records_accepted: number }[]
): SignalResult {
  const meta = SIGNAL_META.declining_performance;
  const now = Date.now();
  const d30 = 30 * 86_400_000;
  const recent = lists.filter((l) => {
    const t = new Date(l.list_date).getTime();
    return t >= now - d30 && t <= now;
  });
  const prior = lists.filter((l) => {
    const t = new Date(l.list_date).getTime();
    return t >= now - 2 * d30 && t < now - d30;
  });

  if (recent.length + prior.length < 2) {
    return {
      key: "declining_performance",
      label: meta.label,
      score: 0,
      available: true,
      weight: meta.weight,
      detail: {
        status: "insufficient_data",
        recentCount: recent.length,
        priorCount: prior.length,
      },
    };
  }

  const sum = (rows: typeof lists) =>
    rows.reduce(
      (acc, r) => ({
        volume: acc.volume + r.records_count,
        accepted: acc.accepted + r.records_accepted,
      }),
      { volume: 0, accepted: 0 }
    );

  const r = sum(recent);
  const p = sum(prior);
  const recentAccept = r.volume > 0 ? r.accepted / r.volume : 0;
  const priorAccept = p.volume > 0 ? p.accepted / p.volume : 0;

  const volumeDrop =
    p.volume > 0 ? clamp01((p.volume - r.volume) / p.volume) : r.volume === 0 ? 1 : 0;
  const acceptDrop = clamp01(priorAccept - recentAccept);

  const score = clamp100(Math.round((volumeDrop * 0.55 + acceptDrop * 0.45) * 100));

  return {
    key: "declining_performance",
    label: meta.label,
    score,
    available: true,
    weight: meta.weight,
    detail: {
      recentVolume: r.volume,
      priorVolume: p.volume,
      recentAcceptRate: Number(recentAccept.toFixed(3)),
      priorAcceptRate: Number(priorAccept.toFixed(3)),
      volumeDrop: Number(volumeDrop.toFixed(3)),
      acceptDrop: Number(acceptDrop.toFixed(3)),
    },
  };
}

/** Signal 2 — expected ~1 interaction / 7 days over last 28d. */
export function scoreMissedCheckin(
  interactions: { occurred_at: string }[]
): SignalResult {
  const meta = SIGNAL_META.missed_checkin;
  if (interactions.length < 3) {
    return {
      key: "missed_checkin",
      label: meta.label,
      score: null,
      available: false,
      weight: meta.weight,
      detail: {
        status: "insufficient_history",
        interactionCount: interactions.length,
        minimumRequired: 3,
      },
    };
  }

  const now = Date.now();
  const windowMs = 28 * 86_400_000;
  const inWindow = interactions.filter(
    (i) => new Date(i.occurred_at).getTime() >= now - windowMs
  );
  const expected = 4; // ~weekly over 28 days
  const gap = Math.max(0, expected - inWindow.length);
  const score = clamp100(Math.round((gap / expected) * 100));

  const last = interactions
    .map((i) => new Date(i.occurred_at).getTime())
    .sort((a, b) => b - a)[0];
  const daysSince = Math.floor((now - last) / 86_400_000);
  const staleBoost = daysSince > 14 ? Math.min(30, (daysSince - 14) * 3) : 0;

  return {
    key: "missed_checkin",
    label: meta.label,
    score: clamp100(score + staleBoost),
    available: true,
    weight: meta.weight,
    detail: {
      inWindow: inWindow.length,
      expected,
      daysSinceLast: daysSince,
    },
  };
}

/** Signal 3 — open complaint count + age. */
export function scoreUnresolvedComplaints(
  openComplaints: { opened_at: string }[]
): SignalResult {
  const meta = SIGNAL_META.unresolved_complaints;
  if (openComplaints.length === 0) {
    return {
      key: "unresolved_complaints",
      label: meta.label,
      score: 0,
      available: true,
      weight: meta.weight,
      detail: { openCount: 0 },
    };
  }

  const now = Date.now();
  const ages = openComplaints.map((c) =>
    Math.floor((now - new Date(c.opened_at).getTime()) / 86_400_000)
  );
  const maxAge = Math.max(...ages);
  const score = clamp100(openComplaints.length * 25 + maxAge * 2);

  return {
    key: "unresolved_complaints",
    label: meta.label,
    score,
    available: true,
    weight: meta.weight,
    detail: { openCount: openComplaints.length, maxAgeDays: maxAge },
  };
}

/** Signal 4 — any open complaint older than 14 days → 100. */
export function scoreStaleOpenComplaint(
  openComplaints: { opened_at: string }[]
): SignalResult {
  const meta = SIGNAL_META.stale_open_complaint;
  const now = Date.now();
  const stale = openComplaints.some(
    (c) => now - new Date(c.opened_at).getTime() >= 14 * 86_400_000
  );
  return {
    key: "stale_open_complaint",
    label: meta.label,
    score: stale ? 100 : 0,
    available: true,
    weight: meta.weight,
    detail: { triggered: stale },
  };
}

/** Signal 5 — negativity 0–100 from Claude (or unavailable). */
export function scoreNegativeSentiment(input: {
  available: boolean;
  negativity: number | null;
  raw?: string;
  reason?: string;
}): SignalResult {
  const meta = SIGNAL_META.negative_sentiment;
  if (!input.available || input.negativity === null) {
    return {
      key: "negative_sentiment",
      label: meta.label,
      score: null,
      available: false,
      weight: meta.weight,
      detail: {
        status: input.reason ?? "unavailable",
        raw: input.raw ?? null,
      },
    };
  }
  return {
    key: "negative_sentiment",
    label: meta.label,
    score: clamp100(input.negativity),
    available: true,
    weight: meta.weight,
    detail: { raw: input.raw ?? null },
  };
}

export function combineSignals(signals: SignalResult[]): ChurnScoreResult {
  const available = signals.filter((s) => s.available && s.score !== null);
  const weightSum = available.reduce((acc, s) => acc + s.weight, 0);
  const riskScore =
    weightSum === 0
      ? 0
      : Math.round(
          (available.reduce((acc, s) => acc + (s.score as number) * s.weight, 0) /
            weightSum) *
            100
        ) / 100;

  const computedAt = new Date().toISOString();
  const signalsJson = {
    computed_at: computedAt,
    risk_score: riskScore,
    formula:
      "weighted average of available signals; unavailable signals redistribute weight",
    weights: Object.fromEntries(
      Object.entries(SIGNAL_META).map(([k, v]) => [k, v.weight])
    ),
    signals: Object.fromEntries(
      signals.map((s) => [
        s.key,
        {
          label: s.label,
          score: s.score,
          available: s.available,
          weight: s.weight,
          detail: s.detail ?? null,
        },
      ])
    ),
  } as Json;

  return { riskScore, computedAt, signals, signalsJson };
}
