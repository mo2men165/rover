import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeConsistency,
  type ConsistencyResult,
} from "@/lib/index-panel/consistency";
import type { Database } from "@/lib/supabase/database.types";

type InteractionType = Database["public"]["Enums"]["interaction_type"];
type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];
type UpsellType = Database["public"]["Enums"]["upsell_type"];
type UpsellStage = Database["public"]["Enums"]["upsell_stage"];

const CHECK_IN_TYPES: InteractionType[] = [
  "call",
  "email",
  "sms",
  "whatsapp",
  "slack",
];

const ACTIVE_UPSELL_STAGES: UpsellStage[] = ["opportunity", "pitched", "pending"];

export type IndexPanelData = {
  lastMeetingAt: string | null;
  lastCheckIn: { occurredAt: string; type: InteractionType } | null;
  lastComplaint: {
    category: string;
    openedAt: string;
    status: ComplaintStatus;
  } | null;
  consistency: ConsistencyResult;
  potentialUpsell: {
    upsellType: UpsellType;
    stage: UpsellStage;
    createdAt: string;
  } | null;
  /** Referenced from Part 3 churn_records.risk_score — not recomputed here. */
  potentialChurnRiskScore: number | null;
  lastUpsellAt: string | null;
};

/**
 * Efficient indexed lookups for the Index Panel (one row per field).
 * Parallel LIMIT 1 queries — no full-history pull.
 */
export async function loadIndexPanelData(
  supabase: SupabaseClient<Database>,
  params: {
    clientIds: string[];
    pocClientId: string;
    companyId: string;
    clientCreatedAt: string;
    /** Already-computed Part 3 score; passed through, never recalculated. */
    churnRiskScore: number | null;
  }
): Promise<IndexPanelData> {
  const { clientIds, pocClientId, companyId, clientCreatedAt, churnRiskScore } =
    params;

  const emptyClients = clientIds.length === 0;

  const emptyResult = { data: null, error: null as { message: string } | null };

  const [
    meetingRes,
    checkInRes,
    complaintRes,
    upsellOppRes,
    lastUpsellRes,
  ] = await Promise.all([
    emptyClients
      ? Promise.resolve(emptyResult)
      : supabase
          .from("interactions")
          .select("occurred_at")
          .in("client_id", clientIds)
          .eq("type", "meeting")
          .order("occurred_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
    emptyClients
      ? Promise.resolve(emptyResult)
      : supabase
          .from("interactions")
          .select("occurred_at, type")
          .in("client_id", clientIds)
          .in("type", CHECK_IN_TYPES)
          .order("occurred_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
    emptyClients
      ? Promise.resolve(emptyResult)
      : supabase
          .from("complaints")
          .select("category, opened_at, status")
          .in("client_id", clientIds)
          .order("opened_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
    supabase
      .from("upsell_opportunities")
      .select("upsell_type, stage, created_at")
      .eq("client_id", pocClientId)
      .in("stage", ACTIVE_UPSELL_STAGES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("upsells")
      .select("created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Fail closed on check-in lookup errors — never surface a false "Missed".
  const checkInFailed = Boolean(
    checkInRes && "error" in checkInRes && checkInRes.error
  );

  const lastCheckIn =
    !checkInFailed && checkInRes.data
      ? {
          occurredAt: checkInRes.data.occurred_at,
          type: checkInRes.data.type,
        }
      : null;

  const consistency: ConsistencyResult = checkInFailed
    ? { label: "unknown", daysSince: null }
    : computeConsistency({
        lastCheckInAt: lastCheckIn?.occurredAt ?? null,
        clientCreatedAt,
      });

  return {
    lastMeetingAt:
      meetingRes && "error" in meetingRes && meetingRes.error
        ? null
        : (meetingRes.data?.occurred_at ?? null),
    lastCheckIn,
    lastComplaint:
      complaintRes && "error" in complaintRes && complaintRes.error
        ? null
        : complaintRes.data
          ? {
              category: complaintRes.data.category,
              openedAt: complaintRes.data.opened_at,
              status: complaintRes.data.status,
            }
          : null,
    consistency,
    potentialUpsell:
      upsellOppRes.error || !upsellOppRes.data
        ? null
        : {
            upsellType: upsellOppRes.data.upsell_type,
            stage: upsellOppRes.data.stage,
            createdAt: upsellOppRes.data.created_at,
          },
    potentialChurnRiskScore: churnRiskScore,
    lastUpsellAt:
      lastUpsellRes.error || !lastUpsellRes.data
        ? null
        : lastUpsellRes.data.created_at,
  };
}
