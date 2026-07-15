"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

type InviteUserInput = {
  email: string;
  name: string;
  role: UserRole;
};

type InviteUserResult =
  | { success: true }
  | { success: false; error: string };

// Sysadmin-only. Not yet wired to any UI form (creating-users UI is next
// sprint) — this is the backend flow the future "invite user" form will
// call.
export async function inviteUser(
  input: InviteUserInput
): Promise<InviteUserResult> {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller) {
    return { success: false, error: "Not signed in." };
  }

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "sysadmin") {
    return { success: false, error: "Only sysadmins can invite users." };
  }

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    `https://${requestHeaders.get("host")}`;

  const admin = createAdminClient();
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${origin}/auth/confirm`,
    });

  if (inviteError || !invited.user) {
    return {
      success: false,
      error: inviteError?.message ?? "Failed to send invite.",
    };
  }

  const { error: profileError } = await admin.from("users").insert({
    id: invited.user.id,
    name: input.name,
    email: input.email,
    role: input.role,
    status: "invited",
  });

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  return { success: true };
}
