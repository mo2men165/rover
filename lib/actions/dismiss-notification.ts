"use server";

import { createClient } from "@/lib/supabase/server";

// Called by EodPromptBanner. Sets dismissed_at on the caller's own row.
export async function dismissNotification(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
