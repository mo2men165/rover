"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type LogReferralInput = {
  referringClientId: string;
  notes?: string;
};

export type LogReferralResult =
  | { success: true; referralId: string }
  | { success: false; error: string };

const ELEVATED = new Set(["tl", "hod", "admin", "sysadmin"]);

export async function logReferralPitch(
  input: LogReferralInput
): Promise<LogReferralResult> {
  if (!input.referringClientId) {
    return { success: false, error: "Pick the referring client." };
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

  if (!caller || (caller.role !== "csr" && !ELEVATED.has(caller.role))) {
    return { success: false, error: "You don't have permission to log referrals." };
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, company_id, is_poc, assigned_csr_id")
    .eq("id", input.referringClientId)
    .maybeSingle();

  if (!client) return { success: false, error: "Client not found." };

  const { data: poc } = await admin
    .from("clients")
    .select("assigned_csr_id")
    .eq("company_id", client.company_id)
    .eq("is_poc", true)
    .maybeSingle();

  if (caller.role === "csr" && poc?.assigned_csr_id !== user.id) {
    return { success: false, error: "That client isn't on your book." };
  }

  // Credit the book CSR so elevated loggers don't steal pitch metrics.
  const creditedCsrId =
    caller.role === "csr" ? user.id : (poc?.assigned_csr_id ?? user.id);

  const { data: row, error } = await admin
    .from("referrals")
    .insert({
      referring_client_id: input.referringClientId,
      csr_id: creditedCsrId,
      status: "pitched",
      notes: input.notes?.trim() || null,
      pitched_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !row) {
    if (error?.code === "23505") {
      return {
        success: false,
        error: "You already have an open pitch for this referring client.",
      };
    }
    return { success: false, error: error?.message ?? "Failed to log referral." };
  }

  revalidatePath("/stoplight");
  return { success: true, referralId: row.id };
}
