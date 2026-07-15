import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteUserForm } from "@/components/users/invite-user-form";

export default async function NewUserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  if (callerProfile?.role !== "sysadmin") {
    redirect("/users");
  }

  return <InviteUserForm />;
}
