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

  const [{ data: csrs }, { data: pocClients }, pitchesQuery] = await Promise.all([
    supabase.from("users").select("id, name").eq("role", "csr").order("name"),
    supabase
      .from("clients")
      .select("id, name, assigned_csr_id, company:companies(name)")
      .eq("is_poc", true)
      .order("name"),
    (() => {
      let q = supabase
        .from("referrals")
        .select(
          "id, csr_id, pitched_at, referring:clients!referrals_referring_client_id_fkey(name, company:companies(name))"
        )
        .eq("status", "pitched")
        .order("pitched_at", { ascending: false })
        .limit(50);
      if (role === "csr") q = q.eq("csr_id", user.id);
      return q;
    })(),
  ]);

  const { data: openPitchRows } = pitchesQuery;

  const referringClients = (pocClients ?? [])
    .filter((c) => role !== "csr" || c.assigned_csr_id === user.id)
    .map((c) => {
      const company = c.company as { name: string } | null;
      return {
        id: c.id,
        label: company?.name ? `${company.name} — ${c.name}` : c.name,
      };
    });

  const openPitches = (openPitchRows ?? []).map((r) => {
    const referring = r.referring as {
      name: string;
      company: { name: string } | null;
    } | null;
    const who = referring
      ? referring.company?.name
        ? `${referring.company.name} — ${referring.name}`
        : referring.name
      : "Unknown";
    return { id: r.id, label: `Pitch · ${who}` };
  });

  return (
    <div className="page-shell page-shell--wizard">
      <AddClientWizard
        csrs={csrs ?? []}
        callerRole={role as Role}
        callerId={user.id}
        openPitches={openPitches}
        referringClients={referringClients}
      />
    </div>
  );
}
