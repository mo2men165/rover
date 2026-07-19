import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddClientWizard } from "@/components/clients/add-client-wizard";
import type { Role } from "@/components/app-shell/role-context";

export default async function NewClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const role = callerProfile?.role;
  if (!user || !role || !["csr", "tl", "hod", "admin"].includes(role)) {
    redirect("/clients");
  }

  const { data: csrs } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "csr")
    .order("name");

  return (
    <div className="page-shell page-shell--wizard">
      <AddClientWizard csrs={csrs ?? []} callerRole={role as Role} callerId={user.id} />
    </div>
  );
}
