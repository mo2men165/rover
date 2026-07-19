import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DataListEntryWizard } from "@/components/data-lists/data-list-entry-wizard";

export default async function NewDataListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  if (callerProfile?.role !== "admin") {
    redirect("/clients");
  }

  const [{ data: clients }, { data: campaignServices }] = await Promise.all([
    supabase.from("clients").select("id, name, company_id").order("name"),
    supabase
      .from("campaign_services")
      .select("id, company_id, type, name, texting_tier"),
  ]);

  return (
    <div className="page-shell">
      <DataListEntryWizard
        clients={clients ?? []}
        campaignServices={campaignServices ?? []}
      />
    </div>
  );
}
