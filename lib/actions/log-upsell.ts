"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type TextingTier = Database["public"]["Enums"]["texting_tier"];

type LogUpsellInput =
  | {
      upsellType: "add_cc_seat";
      companyId: string;
      campaignServiceId: string;
      quantity: number;
      notes?: string;
    }
  | {
      upsellType: "add_texting_service";
      companyId: string;
      textingTier: TextingTier;
      notes?: string;
    }
  | { upsellType: "dwy_lm" | "dfy_lm"; companyId: string; notes?: string }
  | {
      upsellType: "texting_package_upgrade";
      companyId: string;
      campaignServiceId: string;
      toTier: TextingTier;
      notes?: string;
    };

type LogUpsellResult = { success: true } | { success: false; error: string };

// CSR-facing. Uses the service-role client for the campaign_services
// mutations (seat increment, new texting service, tier upgrade) because
// csr no longer has table-level write access to campaign_services under
// RLS (Sprint 2 tightened that once package_price started driving
// commission math) — this action re-derives and validates the business
// rule server-side before writing, mirroring lib/actions/invite-user.ts.
export async function logUpsell(input: LogUpsellInput): Promise<LogUpsellResult> {
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
    return { success: false, error: "Only CSRs can log upsells." };
  }

  const admin = createAdminClient();

  // Ownership check: the acting CSR must be the one CSR assigned to this
  // company (assigned_csr_id lives on the POC client row as of Sprint 3,
  // not companies) — otherwise a crafted request could log an upsell
  // (and its commission) against another CSR's client.
  const { data: pocClient } = await admin
    .from("clients")
    .select("assigned_csr_id")
    .eq("company_id", input.companyId)
    .eq("is_poc", true)
    .maybeSingle();

  if (!pocClient || pocClient.assigned_csr_id !== user.id) {
    return { success: false, error: "You are not assigned to this client." };
  }

  const { data: ownedServices } = await admin
    .from("campaign_services")
    .select("id, type, texting_tier, seat_count")
    .eq("company_id", input.companyId);

  if (!ownedServices) {
    return { success: false, error: "Could not load campaign services." };
  }

  if (input.upsellType === "add_cc_seat") {
    const service = ownedServices.find(
      (s) => s.id === input.campaignServiceId && s.type === "cold_calling"
    );
    if (!service) {
      return { success: false, error: "Invalid campaign service." };
    }

    const { error: updateError } = await admin
      .from("campaign_services")
      .update({ seat_count: service.seat_count + input.quantity })
      .eq("id", service.id);
    if (updateError) return { success: false, error: updateError.message };

    const { error: insertError } = await admin.from("upsells").insert({
      company_id: input.companyId,
      campaign_service_id: service.id,
      csr_id: user.id,
      upsell_type: "add_cc_seat",
      quantity: input.quantity,
      unit_amount: 0,
      notes: input.notes ?? null,
      created_by: user.id,
    });
    if (insertError) return { success: false, error: insertError.message };
    return { success: true };
  }

  if (input.upsellType === "add_texting_service") {
    const { data: newService, error: createError } = await admin
      .from("campaign_services")
      .insert({
        company_id: input.companyId,
        type: "texting",
        seat_count: 1,
        texting_tier: input.textingTier,
      })
      .select("id")
      .single();
    if (createError || !newService) {
      return {
        success: false,
        error: createError?.message ?? "Failed to create texting service.",
      };
    }

    const { error: insertError } = await admin.from("upsells").insert({
      company_id: input.companyId,
      campaign_service_id: newService.id,
      csr_id: user.id,
      upsell_type: "add_texting_service",
      quantity: 1,
      unit_amount: 0,
      notes: input.notes ?? null,
      created_by: user.id,
    });
    if (insertError) return { success: false, error: insertError.message };
    return { success: true };
  }

  if (input.upsellType === "texting_package_upgrade") {
    const service = ownedServices.find(
      (s) => s.id === input.campaignServiceId && s.type === "texting"
    );
    if (!service) {
      return { success: false, error: "Invalid campaign service." };
    }

    const fromTier = service.texting_tier;
    const { error: updateError } = await admin
      .from("campaign_services")
      .update({ texting_tier: input.toTier })
      .eq("id", service.id);
    if (updateError) return { success: false, error: updateError.message };

    const { error: insertError } = await admin.from("upsells").insert({
      company_id: input.companyId,
      campaign_service_id: service.id,
      csr_id: user.id,
      upsell_type: "texting_package_upgrade",
      quantity: 1,
      unit_amount: 0,
      from_tier: fromTier,
      to_tier: input.toTier,
      notes: input.notes ?? null,
      created_by: user.id,
    });
    if (insertError) return { success: false, error: insertError.message };
    return { success: true };
  }

  // dwy_lm / dfy_lm — no campaign_service changes, just the upsell row.
  const { error: insertError } = await admin.from("upsells").insert({
    company_id: input.companyId,
    campaign_service_id: null,
    csr_id: user.id,
    upsell_type: input.upsellType,
    quantity: 1,
    unit_amount: 0,
    notes: input.notes ?? null,
    created_by: user.id,
  });
  if (insertError) return { success: false, error: insertError.message };
  return { success: true };
}
