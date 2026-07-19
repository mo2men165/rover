"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type UpdateClientHeaderInput = {
  clientId: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  assignedCsrId?: string; // tl/hod/admin only -- reassigns the CSR
};

type UpdateClientHeaderResult = { success: true } | { success: false; error: string };

const ELEVATED_ROLES = ["tl", "hod", "admin"];

// csr may edit their own assigned client's POC contact info; only
// tl/hod/admin may reassign the CSR (mirrors "CSR can create a client but
// only assign to themselves" from the Add Client spec -- no reassignment
// permission for csr either).
export async function updateClientHeader(
  input: UpdateClientHeaderInput
): Promise<UpdateClientHeaderResult> {
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

  if (input.assignedCsrId !== undefined && role === "csr") {
    return { success: false, error: "Only TL/HOD/Admin can reassign the CSR." };
  }

  const { error } = await admin
    .from("clients")
    .update({
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      title_at_company: input.title || null,
      ...(input.assignedCsrId !== undefined ? { assigned_csr_id: input.assignedCsrId } : {}),
    })
    .eq("id", input.clientId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
