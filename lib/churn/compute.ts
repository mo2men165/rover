import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeInteractionSentiment } from "@/lib/churn/sentiment";
import {
  combineSignals,
  scoreDecliningPerformance,
  scoreMissedCheckin,
  scoreNegativeSentiment,
  scoreStaleOpenComplaint,
  scoreUnresolvedComplaints,
  type ChurnScoreResult,
} from "@/lib/churn/score";

const STALE_MS = 24 * 60 * 60 * 1000;

function signalsComputedAt(signals: unknown): number | null {
  if (!signals || typeof signals !== "object" || Array.isArray(signals)) {
    return null;
  }
  const at = (signals as { computed_at?: unknown }).computed_at;
  if (typeof at !== "string") return null;
  const t = Date.parse(at);
  return Number.isFinite(t) ? t : null;
}

/**
 * Compute the 5-signal churn risk for a client and upsert onto the
 * active churn_records row (creates an unflagged unknown monitor row
 * if none exists). Skips Claude + rewrite when score is fresher than 24h
 * unless force=true.
 */
export async function computeAndPersistChurnScore(
  clientId: string,
  options?: { force?: boolean }
): Promise<ChurnScoreResult | null> {
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, company_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return null;

  const { data: existing } = await admin
    .from("churn_records")
    .select("id, risk_score, signals, flagged_at")
    .eq("client_id", clientId)
    .is("resolved_at", null)
    .maybeSingle();

  if (!options?.force && existing) {
    const computedAt = signalsComputedAt(existing.signals);
    if (computedAt && Date.now() - computedAt < STALE_MS) {
      const cached = existing.signals as {
        risk_score?: number;
        computed_at?: string;
        signals?: Record<
          string,
          {
            label?: string;
            score?: number | null;
            available?: boolean;
            weight?: number;
            detail?: Record<string, unknown>;
          }
        >;
      };
      const signalEntries = cached.signals
        ? Object.entries(cached.signals).map(([key, v]) => ({
            key: key as ChurnScoreResult["signals"][number]["key"],
            label: v.label ?? key,
            score: v.score ?? null,
            available: v.available ?? false,
            weight: v.weight ?? 0,
            detail: v.detail,
          }))
        : [];
      return {
        riskScore: existing.risk_score ?? cached.risk_score ?? 0,
        computedAt: cached.computed_at ?? new Date(computedAt).toISOString(),
        signals: signalEntries,
        signalsJson: existing.signals,
      };
    }
  }

  const { data: companyClients } = await admin
    .from("clients")
    .select("id")
    .eq("company_id", client.company_id);

  const companyClientIds = (companyClients ?? []).map((c) => c.id);

  const { data: services } = await admin
    .from("campaign_services")
    .select("id")
    .eq("company_id", client.company_id);

  const serviceIds = (services ?? []).map((s) => s.id);

  let lists: {
    list_date: string;
    records_count: number;
    records_accepted: number;
  }[] = [];

  if (serviceIds.length > 0) {
    const { data: links } = await admin
      .from("data_list_services")
      .select(
        "data_list:data_lists!inner(list_date, records_count, records_accepted)"
      )
      .in("campaign_service_id", serviceIds);

    const seen = new Set<string>();
    for (const link of links ?? []) {
      const dl = Array.isArray(link.data_list) ? link.data_list[0] : link.data_list;
      if (!dl) continue;
      const key = `${dl.list_date}:${dl.records_count}:${dl.records_accepted}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lists.push(dl);
    }
  }

  const { data: interactions } = companyClientIds.length
    ? await admin
        .from("interactions")
        .select("occurred_at, summary")
        .in("client_id", companyClientIds)
        .order("occurred_at", { ascending: false })
        .limit(40)
    : { data: [] };

  const { data: openComplaints } = await admin
    .from("complaints")
    .select("opened_at")
    .eq("client_id", clientId)
    .eq("status", "open");

  const summaries = (interactions ?? [])
    .map((i) => i.summary?.trim())
    .filter((s): s is string => Boolean(s))
    .slice(0, 10);

  const sentiment = await analyzeInteractionSentiment(summaries);

  const signals = [
    scoreDecliningPerformance(lists),
    scoreMissedCheckin(interactions ?? []),
    scoreUnresolvedComplaints(openComplaints ?? []),
    scoreStaleOpenComplaint(openComplaints ?? []),
    scoreNegativeSentiment(
      sentiment.available
        ? {
            available: true,
            negativity: sentiment.negativity,
            raw: sentiment.raw,
          }
        : {
            available: false,
            negativity: null,
            raw: sentiment.raw,
            reason: sentiment.reason,
          }
    ),
  ];

  const result = combineSignals(signals);

  if (existing) {
    await admin
      .from("churn_records")
      .update({
        risk_score: result.riskScore,
        signals: result.signalsJson,
      })
      .eq("id", existing.id);
  } else {
    await admin.from("churn_records").insert({
      client_id: clientId,
      churn_type: "unknown",
      reason: null,
      deposit_status: null,
      risk_score: result.riskScore,
      signals: result.signalsJson,
      flagged_at: result.computedAt,
    });
  }

  return result;
}
