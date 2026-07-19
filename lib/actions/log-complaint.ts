"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type ComplaintValidity = Database["public"]["Enums"]["complaint_validity"];

export type LogComplaintInput = {
  clientId: string;
  category: string;
  description: string;
  validity: ComplaintValidity;
};

export type LogComplaintResult =
  | { success: true; complaintId: string }
  | { success: false; error: string };

const ELEVATED = new Set(["tl", "hod", "admin", "sysadmin"]);

// Service-role insert (CSR has read-only RLS on complaints). Follow-up
// task is created by the complaints_auto_follow_up trigger.
export async function logComplaint(
  input: LogComplaintInput
): Promise<LogComplaintResult> {
  const category = input.category.trim();
  const description = input.description.trim();
  if (!category) return { success: false, error: "Category is required." };
  if (!description) return { success: false, error: "Description is required." };
  if (!input.clientId) return { success: false, error: "Pick a client." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile) return { success: false, error: "Profile not found." };

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, company_id")
    .eq("id", input.clientId)
    .maybeSingle();

  if (!client) return { success: false, error: "Client not found." };

  if (callerProfile.role === "csr") {
    const { data: poc } = await admin
      .from("clients")
      .select("assigned_csr_id")
      .eq("company_id", client.company_id)
      .eq("is_poc", true)
      .maybeSingle();

    if (!poc || poc.assigned_csr_id !== user.id) {
      return { success: false, error: "You are not assigned to this client." };
    }
  } else if (!ELEVATED.has(callerProfile.role)) {
    return { success: false, error: "You cannot log complaints." };
  }

  const { data: row, error } = await admin
    .from("complaints")
    .insert({
      client_id: input.clientId,
      logged_by: user.id,
      category,
      description,
      validity: input.validity,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !row) {
    return { success: false, error: error?.message ?? "Failed to log complaint." };
  }

  return { success: true, complaintId: row.id };
}
