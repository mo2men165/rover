"use server";

import { createClient } from "@/lib/supabase/server";

type CreateDataListInput = {
  campaignServiceId: string;
  listDate: string;
  recordsCount: number;
  recordsAccepted: number;
  duplicates: number;
  recordsSkipTraced?: number;
  skipTraceRate: number;
};

type CreateDataListResult = { success: true } | { success: false; error: string };

// Admin-only, per the Sprint 2 spec's explicit role scoping (distinct
// from tl/hod/sysadmin, which also pass campaign_services/data_lists'
// broader RLS elevated-roles policy — this action enforces the
// narrower business rule on top of that).
export async function createDataList(
  input: CreateDataListInput
): Promise<CreateDataListResult> {
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

  if (callerProfile?.role !== "admin") {
    return { success: false, error: "Only Admins can enter data lists." };
  }

  const { error } = await supabase.from("data_lists").insert({
    campaign_service_id: input.campaignServiceId,
    list_date: input.listDate,
    records_count: input.recordsCount,
    records_accepted: input.recordsAccepted,
    duplicates: input.duplicates,
    records_skip_traced: input.recordsSkipTraced ?? null,
    skip_trace_rate: input.skipTraceRate,
    entered_by: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
