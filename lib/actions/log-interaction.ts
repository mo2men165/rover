"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { postHubSpotContactNote } from "@/lib/hubspot/create-note";
import type { Database } from "@/lib/supabase/database.types";

type InteractionType = Database["public"]["Enums"]["interaction_type"];
type InteractionDirection = Database["public"]["Enums"]["interaction_direction"];

export type LogInteractionInput = {
  clientId: string;
  type: InteractionType;
  direction: InteractionDirection;
  summary: string;
  occurredAt?: string;
};

export type LogInteractionResult =
  | {
      success: true;
      interactionId: string;
      hubspotSynced: boolean;
      hubspotSyncNote: string | null;
    }
  | { success: false; error: string };

const ELEVATED = new Set(["tl", "hod", "admin", "sysadmin"]);

// Manual quick-log. Service-role insert (CSR has read-only RLS on
// interactions). HubSpot note is best-effort and never fails the ROVER log.
export async function logInteraction(
  input: LogInteractionInput
): Promise<LogInteractionResult> {
  const summary = input.summary.trim();
  if (!summary) {
    return { success: false, error: "Summary is required." };
  }
  if (!input.clientId) {
    return { success: false, error: "Pick a client." };
  }

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

  if (!callerProfile) {
    return { success: false, error: "Profile not found." };
  }

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, company_id, hs_object_id, is_poc, assigned_csr_id")
    .eq("id", input.clientId)
    .maybeSingle();

  if (!client) {
    return { success: false, error: "Client not found." };
  }

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
    return { success: false, error: "You cannot log interactions." };
  }

  const occurredAt = input.occurredAt?.trim() || new Date().toISOString();

  let hubspotSynced = false;
  let hubspotSyncNote: string | null = null;

  if (!client.hs_object_id) {
    hubspotSyncNote = "Skipped: client has no HubSpot ID.";
  } else {
    const hs = await postHubSpotContactNote({
      contactId: client.hs_object_id,
      body: `[ROVER ${input.type}/${input.direction}] ${summary}`,
    });
    if (hs.ok) {
      hubspotSynced = true;
    } else {
      hubspotSyncNote = hs.error;
    }
  }

  const { data: row, error } = await admin
    .from("interactions")
    .insert({
      client_id: input.clientId,
      logged_by: user.id,
      type: input.type,
      direction: input.direction,
      source: "manual",
      summary,
      occurred_at: occurredAt,
      hubspot_synced: hubspotSynced,
      hubspot_sync_note: hubspotSyncNote,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { success: false, error: error?.message ?? "Failed to log interaction." };
  }

  return {
    success: true,
    interactionId: row.id,
    hubspotSynced,
    hubspotSyncNote,
  };
}
