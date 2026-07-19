"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type UpdateCsrQuotaResult =
  | { success: true }
  | { success: false; error: string };

const EDITORS = new Set(["tl", "hod", "admin", "sysadmin"]);

export async function updateCsrQuota(input: {
  quotaId: string;
  recordsTarget: number;
}): Promise<UpdateCsrQuotaResult> {
  if (!Number.isFinite(input.recordsTarget) || input.recordsTarget < 0) {
    return { success: false, error: "Target must be a non-negative number." };
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

  if (!caller || !EDITORS.has(caller.role)) {
    return { success: false, error: "Only TL/HOD/Admin can edit quotas." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("csr_quotas")
    .update({ records_target: Math.round(input.recordsTarget) })
    .eq("id", input.quotaId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/stoplight");
  return { success: true };
}
