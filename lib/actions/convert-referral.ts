"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ConvertReferralResult =
  | { success: true }
  | { success: false; error: string };

/** Mark an open pitch converted and link the onboarded POC client. */
export async function convertReferral(input: {
  referralId: string;
  referredClientId: string;
}): Promise<ConvertReferralResult> {
  if (!input.referralId || !input.referredClientId) {
    return { success: false, error: "Referral and new client are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data: referral } = await admin
    .from("referrals")
    .select("id, csr_id, status")
    .eq("id", input.referralId)
    .maybeSingle();

  if (!referral) return { success: false, error: "Referral not found." };
  if (referral.status !== "pitched") {
    return { success: false, error: "That referral is already converted." };
  }

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const elevated =
    caller && ["tl", "hod", "admin", "sysadmin"].includes(caller.role);
  if (caller?.role === "csr" && referral.csr_id !== user.id) {
    return { success: false, error: "You can only convert your own pitches." };
  }
  if (caller?.role !== "csr" && !elevated) {
    return { success: false, error: "No permission." };
  }

  const { error } = await admin
    .from("referrals")
    .update({
      status: "converted",
      referred_client_id: input.referredClientId,
      converted_at: new Date().toISOString(),
    })
    .eq("id", input.referralId)
    .eq("status", "pitched");

  if (error) return { success: false, error: error.message };

  revalidatePath("/stoplight");
  return { success: true };
}
