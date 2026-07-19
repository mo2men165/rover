"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logUpsell } from "@/lib/actions/log-upsell";
import type { Database } from "@/lib/supabase/database.types";

type UpsellStage = Database["public"]["Enums"]["upsell_stage"];
type TextingTier = Database["public"]["Enums"]["texting_tier"];

export type WonFulfillment =
  | { upsellType: "add_cc_seat"; campaignServiceId: string }
  | { upsellType: "add_texting_service"; textingTier: TextingTier }
  | { upsellType: "dwy_lm" | "dfy_lm" }
  | {
      upsellType: "texting_package_upgrade";
      campaignServiceId: string;
      toTier: TextingTier;
    };

export type UpdateUpsellStageInput = {
  opportunityId: string;
  stage: UpsellStage;
  snoozeUntil?: string;
  lostReason?: string;
  wonFulfillment?: WonFulfillment;
};

export type UpdateUpsellStageResult =
  | { success: true }
  | { success: false; error: string };

const CAN_UPDATE = new Set(["csr", "tl", "hod", "admin", "sysadmin"]);

export async function updateUpsellStage(
  input: UpdateUpsellStageInput
): Promise<UpdateUpsellStageResult> {
  if (!input.opportunityId) {
    return { success: false, error: "Missing opportunity." };
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

  if (!caller || !CAN_UPDATE.has(caller.role)) {
    return { success: false, error: "You cannot update upsell stages." };
  }

  const admin = createAdminClient();
  const { data: opp } = await admin
    .from("upsell_opportunities")
    .select(
      "id, client_id, csr_id, upsell_type, stage, quantity, notes, snooze_until, lost_reason"
    )
    .eq("id", input.opportunityId)
    .maybeSingle();

  if (!opp) return { success: false, error: "Opportunity not found." };

  if (opp.stage === "won" || opp.stage === "lost") {
    return { success: false, error: "Terminal opportunities cannot change stage." };
  }

  const { data: client } = await admin
    .from("clients")
    .select("id, company_id")
    .eq("id", opp.client_id)
    .maybeSingle();

  if (!client) return { success: false, error: "Client not found." };

  if (caller.role === "csr") {
    const { data: poc } = await admin
      .from("clients")
      .select("assigned_csr_id")
      .eq("company_id", client.company_id)
      .eq("is_poc", true)
      .maybeSingle();
    if (!poc || poc.assigned_csr_id !== user.id) {
      return { success: false, error: "You are not assigned to this client." };
    }
  }

  if (input.stage === "pending") {
    const snooze = input.snoozeUntil?.trim();
    if (!snooze) {
      return { success: false, error: "Set a snooze date for Pending." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(snooze)) {
      return { success: false, error: "Snooze date must be YYYY-MM-DD." };
    }

    const { error } = await admin
      .from("upsell_opportunities")
      .update({
        stage: "pending",
        snooze_until: snooze,
        lost_reason: null,
      })
      .eq("id", opp.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  if (input.stage === "lost") {
    const reason = input.lostReason?.trim();
    if (!reason) {
      return { success: false, error: "Lost reason is required." };
    }

    const { error } = await admin
      .from("upsell_opportunities")
      .update({
        stage: "lost",
        lost_reason: reason,
        snooze_until: null,
      })
      .eq("id", opp.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  if (input.stage === "won") {
    if (!input.wonFulfillment) {
      return { success: false, error: "Confirm fulfillment details to mark Won." };
    }
    if (input.wonFulfillment.upsellType !== opp.upsell_type) {
      return { success: false, error: "Fulfillment type must match the opportunity." };
    }

    const { data: existing } = await admin
      .from("upsells")
      .select("id")
      .eq("upsell_opportunity_id", opp.id)
      .maybeSingle();
    // Recover from a prior partial win (upsell inserted, stage update failed).
    if (existing) {
      const { error } = await admin
        .from("upsell_opportunities")
        .update({
          stage: "won",
          snooze_until: null,
          lost_reason: null,
        })
        .eq("id", opp.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const { data: poc } = await admin
      .from("clients")
      .select("assigned_csr_id")
      .eq("company_id", client.company_id)
      .eq("is_poc", true)
      .maybeSingle();
    const attributedCsrId = poc?.assigned_csr_id ?? opp.csr_id;

    const notes = opp.notes ?? undefined;
    const fulfillment = input.wonFulfillment;
    const elevated = caller.role !== "csr";

    const logResult =
      fulfillment.upsellType === "add_cc_seat"
        ? await logUpsell({
            upsellType: "add_cc_seat",
            companyId: client.company_id,
            campaignServiceId: fulfillment.campaignServiceId,
            quantity: opp.quantity,
            notes,
            upsellOpportunityId: opp.id,
            actingAsElevated: elevated,
            csrId: attributedCsrId,
          })
        : fulfillment.upsellType === "add_texting_service"
          ? await logUpsell({
              upsellType: "add_texting_service",
              companyId: client.company_id,
              textingTier: fulfillment.textingTier,
              notes,
              upsellOpportunityId: opp.id,
              actingAsElevated: elevated,
              csrId: attributedCsrId,
            })
          : fulfillment.upsellType === "texting_package_upgrade"
            ? await logUpsell({
                upsellType: "texting_package_upgrade",
                companyId: client.company_id,
                campaignServiceId: fulfillment.campaignServiceId,
                toTier: fulfillment.toTier,
                notes,
                upsellOpportunityId: opp.id,
                actingAsElevated: elevated,
                csrId: attributedCsrId,
              })
            : await logUpsell({
                upsellType: fulfillment.upsellType,
                companyId: client.company_id,
                notes,
                upsellOpportunityId: opp.id,
                actingAsElevated: elevated,
                csrId: attributedCsrId,
              });

    if (!logResult.success) {
      return { success: false, error: logResult.error };
    }

    const { error } = await admin
      .from("upsell_opportunities")
      .update({
        stage: "won",
        snooze_until: null,
        lost_reason: null,
      })
      .eq("id", opp.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // opportunity | pitched — clear pending/lost fields
  const { error } = await admin
    .from("upsell_opportunities")
    .update({
      stage: input.stage,
      snooze_until: null,
      lost_reason: null,
    })
    .eq("id", opp.id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
