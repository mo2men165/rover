"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResolveComplaintInput = {
  complaintId: string;
  resolutionNotes: string;
};

export type ResolveComplaintResult =
  | { success: true }
  | { success: false; error: string };

const ELEVATED = new Set(["tl", "hod", "admin", "sysadmin"]);

export async function resolveComplaint(
  input: ResolveComplaintInput
): Promise<ResolveComplaintResult> {
  const notes = input.resolutionNotes.trim();
  if (!input.complaintId) {
    return { success: false, error: "Missing complaint." };
  }
  if (!notes) {
    return { success: false, error: "Resolution notes are required." };
  }

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

  const { data: complaint } = await admin
    .from("complaints")
    .select("id, status, client_id, clients!inner(company_id)")
    .eq("id", input.complaintId)
    .maybeSingle();

  if (!complaint) return { success: false, error: "Complaint not found." };
  if (complaint.status === "resolved") {
    return { success: false, error: "Already resolved." };
  }

  const clientJoin = Array.isArray(complaint.clients)
    ? complaint.clients[0]
    : complaint.clients;
  const companyId = clientJoin?.company_id;

  if (callerProfile.role === "csr") {
    if (!companyId) {
      return { success: false, error: "Client company missing." };
    }
    const { data: poc } = await admin
      .from("clients")
      .select("assigned_csr_id")
      .eq("company_id", companyId)
      .eq("is_poc", true)
      .maybeSingle();

    if (!poc || poc.assigned_csr_id !== user.id) {
      return { success: false, error: "You are not assigned to this client." };
    }
  } else if (!ELEVATED.has(callerProfile.role)) {
    return { success: false, error: "You cannot resolve complaints." };
  }

  const { error } = await admin
    .from("complaints")
    .update({
      status: "resolved",
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.complaintId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
