"use server";

import { createClient } from "@/lib/supabase/server";

type CreateDataListInput = {
  campaignServiceIds: string[];
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

  if (input.campaignServiceIds.length === 0) {
    return { success: false, error: "Select at least one campaign service." };
  }

  const { data: dataList, error: insertError } = await supabase
    .from("data_lists")
    .insert({
      list_date: input.listDate,
      records_count: input.recordsCount,
      records_accepted: input.recordsAccepted,
      duplicates: input.duplicates,
      records_skip_traced: input.recordsSkipTraced ?? null,
      skip_trace_rate: input.skipTraceRate,
      entered_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !dataList) {
    return { success: false, error: insertError?.message ?? "Failed to create data list." };
  }

  const { error: servicesError } = await supabase.from("data_list_services").insert(
    input.campaignServiceIds.map((campaignServiceId) => ({
      data_list_id: dataList.id,
      campaign_service_id: campaignServiceId,
    }))
  );

  if (servicesError) {
    // Data list row was created but its service links failed -- clean up
    // rather than leave an orphaned, service-less data_lists row.
    await supabase.from("data_lists").delete().eq("id", dataList.id);
    return { success: false, error: servicesError.message };
  }

  return { success: true };
}
