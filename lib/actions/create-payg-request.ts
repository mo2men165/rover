"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CreatePaygRequestInput = {
  clientId: string;
  recordsToPull: number;
  recordsToSkipTrace: number;
  pullRate: number;
  skipTraceRate: number;
};

type CreatePaygRequestResult = { success: true } | { success: false; error: string };

// CSR-facing, mirrors log-upsell.ts / confirm-monthly-payment.ts: client
// ownership is a business rule enforced here via the service-role
// client, since csr only has read access to payg_requests under RLS.
export async function createPaygRequest(
  input: CreatePaygRequestInput
): Promise<CreatePaygRequestResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "csr") {
    return { success: false, error: "Only CSRs can create PAYG requests." };
  }

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, is_poc, assigned_csr_id")
    .eq("id", input.clientId)
    .single();

  if (!client || !client.is_poc || client.assigned_csr_id !== user.id) {
    return { success: false, error: "You are not assigned to this client." };
  }

  const { error } = await admin.from("payg_requests").insert({
    client_id: input.clientId,
    records_to_pull: input.recordsToPull,
    records_to_skip_trace: input.recordsToSkipTrace,
    pull_rate: input.pullRate,
    skip_trace_rate: input.skipTraceRate,
    created_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
