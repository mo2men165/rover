"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type MarkPaygPaidResult = { success: true } | { success: false; error: string };

// Callable by the CSR who created the request, or any elevated role
// (tl/hod/admin/sysadmin) -- both already have some form of access to
// payg_requests under RLS; this centralizes the paid/paid_at write since
// csr only has read access to the table directly.
export async function markPaygPaid(paygRequestId: string): Promise<MarkPaygPaidResult> {
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

  const elevated = ["tl", "hod", "admin", "sysadmin"].includes(callerProfile?.role ?? "");

  const admin = createAdminClient();

  const { data: request } = await admin
    .from("payg_requests")
    .select("id, created_by, paid")
    .eq("id", paygRequestId)
    .single();

  if (!request || (!elevated && request.created_by !== user.id)) {
    return { success: false, error: "You can't update this PAYG request." };
  }

  if (request.paid) {
    return { success: false, error: "Already marked paid." };
  }

  const { error } = await admin
    .from("payg_requests")
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq("id", paygRequestId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
