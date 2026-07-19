"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAndPersistChurnScore } from "@/lib/churn/compute";
import type { Database } from "@/lib/supabase/database.types";

type ChurnType = Database["public"]["Enums"]["churn_type"];
type DepositStatus = Database["public"]["Enums"]["deposit_status"];

export type FlagChurnInput = {
  clientId: string;
  churnType: ChurnType;
  reason: string;
  depositStatus: DepositStatus;
};

export type FlagChurnResult =
  | { success: true; churnRecordId: string }
  | { success: false; error: string };

const CAN_FLAG = new Set(["csr", "tl", "hod", "admin", "sysadmin"]);

export async function flagChurn(input: FlagChurnInput): Promise<FlagChurnResult> {
  const reason = input.reason.trim();
  if (!input.clientId) return { success: false, error: "Pick a client." };
  if (!reason) return { success: false, error: "Reason is required." };
  if (!input.depositStatus) {
    return { success: false, error: "Deposit status is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || !CAN_FLAG.has(caller.role)) {
    return { success: false, error: "You cannot flag churn." };
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, company_id")
    .eq("id", input.clientId)
    .maybeSingle();

  if (!client) return { success: false, error: "Client not found." };

  if (caller.role === "csr") {
    const { data: poc } = await admin
      .from("clients")
      .select("assigned_csr_id")
      .eq("company_id", client.company_id)
      .eq("is_poc", true)
      .maybeSingle();
    if (!poc || poc.assigned_csr_id !== user.id) {
      return { success: false, error: "You are not assigned to this client." };
    }
  }

  await computeAndPersistChurnScore(input.clientId, { force: true });

  const { data: existing } = await admin
    .from("churn_records")
    .select("id")
    .eq("client_id", input.clientId)
    .is("resolved_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("churn_records")
      .update({
        churn_type: input.churnType,
        reason,
        deposit_status: input.depositStatus,
        flagged_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
    return { success: true, churnRecordId: existing.id };
  }

  const { data: row, error } = await admin
    .from("churn_records")
    .insert({
      client_id: input.clientId,
      churn_type: input.churnType,
      reason,
      deposit_status: input.depositStatus,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { success: false, error: error?.message ?? "Failed to flag churn." };
  }
  return { success: true, churnRecordId: row.id };
}

export type UpdateDepositInput = {
  churnRecordId: string;
  depositStatus: DepositStatus;
};

export async function updateChurnDeposit(
  input: UpdateDepositInput
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || !CAN_FLAG.has(caller.role)) {
    return { success: false, error: "You cannot update deposit status." };
  }

  const admin = createAdminClient();

  const { data: record } = await admin
    .from("churn_records")
    .select("id, client_id, clients!inner(company_id)")
    .eq("id", input.churnRecordId)
    .maybeSingle();

  if (!record) return { success: false, error: "Churn record not found." };

  const clientJoin = Array.isArray(record.clients)
    ? record.clients[0]
    : record.clients;

  if (caller.role === "csr") {
    const { data: poc } = await admin
      .from("clients")
      .select("assigned_csr_id")
      .eq("company_id", clientJoin.company_id)
      .eq("is_poc", true)
      .maybeSingle();
    if (!poc || poc.assigned_csr_id !== user.id) {
      return { success: false, error: "You are not assigned to this client." };
    }
  }

  const { error } = await admin
    .from("churn_records")
    .update({ deposit_status: input.depositStatus })
    .eq("id", input.churnRecordId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
