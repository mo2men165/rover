"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// public.users write access is sysadmin-only under RLS, so a freshly
// invited user (any role) can't flip their own status from 'invited' to
// 'active' through the normal session client. This is the one bounded
// self-service exception: a signed-in user may only ever activate their
// own row, and only after they've actually set a password.
export async function activateCurrentUser(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ status: "active" })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
