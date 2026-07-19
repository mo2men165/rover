"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type UpsellType = Database["public"]["Enums"]["upsell_type"];

export type CreateUpsellOpportunityInput = {
  clientId: string;
  upsellType: UpsellType;
  quantity?: number;
  notes?: string;
};

export type CreateUpsellOpportunityResult =
  | { success: true; id: string }
  | { success: false; error: string };

const CAN_CREATE = new Set(["csr", "tl", "hod", "admin", "sysadmin"]);

export async function createUpsellOpportunity(
  input: CreateUpsellOpportunityInput
): Promise<CreateUpsellOpportunityResult> {
  if (!input.clientId) return { success: false, error: "Pick a client." };
  if (!input.upsellType) return { success: false, error: "Pick an upsell type." };

  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: "Quantity must be at least 1." };
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

  if (!caller || !CAN_CREATE.has(caller.role)) {
    return { success: false, error: "You cannot create upsell opportunities." };
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, company_id")
    .eq("id", input.clientId)
    .maybeSingle();

  if (!client) return { success: false, error: "Client not found." };

  const { data: poc } = await admin
    .from("clients")
    .select("assigned_csr_id")
    .eq("company_id", client.company_id)
    .eq("is_poc", true)
    .maybeSingle();

  if (!poc?.assigned_csr_id) {
    return { success: false, error: "This client has no assigned CSR." };
  }

  if (caller.role === "csr" && poc.assigned_csr_id !== user.id) {
    return { success: false, error: "You are not assigned to this client." };
  }

  const { data: services } = await admin
    .from("campaign_services")
    .select("id, type")
    .eq("company_id", client.company_id);

  const hasCold = (services ?? []).some((s) => s.type === "cold_calling");
  const hasTexting = (services ?? []).some((s) => s.type === "texting");

  if (input.upsellType === "add_cc_seat" && !hasCold) {
    return { success: false, error: "Client has no cold calling service." };
  }
  if (input.upsellType === "texting_package_upgrade" && !hasTexting) {
    return { success: false, error: "Client has no texting service." };
  }

  const { data: row, error } = await admin
    .from("upsell_opportunities")
    .insert({
      client_id: input.clientId,
      csr_id: poc.assigned_csr_id,
      upsell_type: input.upsellType,
      quantity: input.upsellType === "add_cc_seat" ? quantity : 1,
      notes: input.notes?.trim() || null,
      stage: "opportunity",
    })
    .select("id")
    .single();

  if (error || !row) {
    return { success: false, error: error?.message ?? "Failed to create opportunity." };
  }

  return { success: true, id: row.id };
}
