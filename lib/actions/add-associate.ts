"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type ContactMethod = Database["public"]["Enums"]["contact_method"];

type AddAssociateInput = {
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  preferredContactMethod?: ContactMethod;
};

type AddAssociateResult = { success: true } | { success: false; error: string };

const ELEVATED_ROLES = ["tl", "hod", "admin"];

export async function addAssociate(input: AddAssociateInput): Promise<AddAssociateResult> {
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
  const { data: pocClient } = await admin
    .from("clients")
    .select("assigned_csr_id")
    .eq("company_id", input.companyId)
    .eq("is_poc", true)
    .maybeSingle();

  if (!pocClient) {
    return { success: false, error: "Client not found." };
  }

  if (role === "csr" && pocClient.assigned_csr_id !== user.id) {
    return { success: false, error: "You are not assigned to this client." };
  }

  const { error } = await admin.from("clients").insert({
    company_id: input.companyId,
    name: input.name,
    email: input.email || null,
    phone: input.phone || null,
    is_poc: false,
    role: input.role || null,
    preferred_contact_method: input.preferredContactMethod ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
