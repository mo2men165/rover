"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { mondayOf, toDateString } from "@/lib/stoplight/week";

export type ConfirmStoplightWeekResult =
  | { success: true }
  | { success: false; error: string };

const ELEVATED = new Set(["tl", "hod", "admin", "sysadmin"]);

export async function confirmStoplightWeek(input: {
  weekStart?: string;
  csrId?: string;
  notes?: string;
}): Promise<ConfirmStoplightWeekResult> {
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

  if (!caller) return { success: false, error: "Profile not found." };

  const weekStart = input.weekStart ?? toDateString(mondayOf());
  const targetCsrId =
    caller.role === "csr" ? user.id : (input.csrId ?? user.id);

  if (caller.role === "csr" && targetCsrId !== user.id) {
    return { success: false, error: "You can only confirm your own week." };
  }

  if (caller.role !== "csr" && !ELEVATED.has(caller.role)) {
    return { success: false, error: "You don't have permission to confirm." };
  }

  const dow = new Date(`${weekStart}T00:00:00.000Z`).getUTCDay();
  if (dow !== 1) {
    return { success: false, error: "Week start must be a Monday (UTC)." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("stoplight_week_reviews").upsert(
    {
      csr_id: targetCsrId,
      week_start: weekStart,
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
      notes: input.notes?.trim() || null,
    },
    { onConflict: "csr_id,week_start" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/stoplight");
  return { success: true };
}
