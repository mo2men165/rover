"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ConfirmMonthlyPaymentResult = { success: true } | { success: false; error: string };

// CSR-facing "Mark as paid" for the start-of-month package-payment
// checklist. Uses the service-role client the same way log-upsell.ts /
// create-data-list.ts do: ownership (this must be one of the CSR's own
// package clients) is a business rule that doesn't map cleanly onto a
// direct insert RLS policy, so it's centralized here instead.
export async function confirmMonthlyPayment(clientId: string): Promise<ConfirmMonthlyPaymentResult> {
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
    return { success: false, error: "Only CSRs can confirm client payments." };
  }

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, is_poc, assigned_csr_id, data_source_type, data_source_tier")
    .eq("id", clientId)
    .single();

  if (
    !client ||
    !client.is_poc ||
    client.assigned_csr_id !== user.id ||
    client.data_source_type !== "res" ||
    client.data_source_tier !== "package"
  ) {
    return { success: false, error: "You are not assigned to this package client." };
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  const { error } = await admin.from("monthly_payment_confirmations").insert({
    client_id: clientId,
    month: monthStart,
    confirmed_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
