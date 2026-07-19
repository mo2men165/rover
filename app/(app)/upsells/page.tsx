import { createClient } from "@/lib/supabase/server";
import {
  UpsellPipeline,
  type ClientOption,
  type UpsellCardView,
} from "@/components/upsells/upsell-pipeline";
import { TEXTING_TIER_LABELS } from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type TextingTier = Database["public"]["Enums"]["texting_tier"];

export default async function UpsellsPage() {
  const supabase = await createClient();

  const [{ data: rows }, { data: pocClients }, { data: services }] =
    await Promise.all([
      supabase
        .from("upsell_opportunities")
        .select(
          `
          id,
          client_id,
          upsell_type,
          stage,
          quantity,
          snooze_until,
          notes,
          lost_reason,
          csr:users!upsell_opportunities_csr_id_fkey(name),
          client:clients!upsell_opportunities_client_id_fkey(
            id,
            name,
            company_id,
            company:companies!clients_company_id_fkey(id, name)
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("clients")
        .select(
          `
          id,
          name,
          company_id,
          company:companies!clients_company_id_fkey(id, name)
        `
        )
        .eq("is_poc", true)
        .order("name"),
      supabase
        .from("campaign_services")
        .select("id, company_id, type, name, texting_tier"),
    ]);

  const servicesByCompany = new Map<
    string,
    {
      cold: { id: string; label: string }[];
      texting: { id: string; label: string; tier: string | null }[];
    }
  >();

  for (const s of services ?? []) {
    const bag = servicesByCompany.get(s.company_id) ?? {
      cold: [],
      texting: [],
    };
    if (s.type === "cold_calling") {
      bag.cold.push({
        id: s.id,
        label: s.name ?? "Cold calling",
      });
    } else if (s.type === "texting") {
      const tier = s.texting_tier as TextingTier | null;
      bag.texting.push({
        id: s.id,
        label: s.name
          ? s.name
          : tier
            ? `Texting — ${TEXTING_TIER_LABELS[tier]}`
            : "Texting",
        tier: s.texting_tier,
      });
    }
    servicesByCompany.set(s.company_id, bag);
  }

  const clients: ClientOption[] = (pocClients ?? []).map((row) => {
    const company = Array.isArray(row.company) ? row.company[0] : row.company;
    const bag = servicesByCompany.get(row.company_id) ?? {
      cold: [],
      texting: [],
    };
    return {
      id: row.id,
      name: row.name,
      companyId: row.company_id,
      companyName: company?.name ?? row.name,
      hasColdCalling: bag.cold.length > 0,
      hasTexting: bag.texting.length > 0,
      coldCallingServices: bag.cold,
      textingServices: bag.texting,
    };
  });

  const cards: UpsellCardView[] = (rows ?? []).map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    const company = client
      ? Array.isArray(client.company)
        ? client.company[0]
        : client.company
      : null;
    const csr = Array.isArray(row.csr) ? row.csr[0] : row.csr;

    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client?.name ?? "Unknown",
      companyId: client?.company_id ?? company?.id ?? "",
      companyName: company?.name ?? client?.name ?? "Unknown",
      csrName: csr?.name ?? "Unassigned",
      upsellType: row.upsell_type,
      stage: row.stage,
      quantity: row.quantity,
      snoozeUntil: row.snooze_until,
      notes: row.notes,
      lostReason: row.lost_reason,
    };
  });

  return <UpsellPipeline initialCards={cards} clients={clients} />;
}
