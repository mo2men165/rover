"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BuyBox } from "@/lib/supabase/buy-box-options";

type UpdateBuyBoxInput = { clientId: string; buyBox: BuyBox };
type UpdateBuyBoxResult = { success: true } | { success: false; error: string };

const ELEVATED_ROLES = ["tl", "hod", "admin"];

export async function updateBuyBox(input: UpdateBuyBoxInput): Promise<UpdateBuyBoxResult> {
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

  const role = callerProfile?.role;
  if (role !== "csr" && !ELEVATED_ROLES.includes(role ?? "")) {
    return { success: false, error: "You don't have permission to do this." };
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, is_poc, assigned_csr_id")
    .eq("id", input.clientId)
    .single();

  if (!client || !client.is_poc) {
    return { success: false, error: "Client not found." };
  }

  if (role === "csr" && client.assigned_csr_id !== user.id) {
    return { success: false, error: "You are not assigned to this client." };
  }

  const { error } = await admin
    .from("clients")
    .update({ buy_box: input.buyBox })
    .eq("id", input.clientId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
