import { createClient } from "@/lib/supabase/server";
import { ChurnPipeline } from "@/components/churn/churn-pipeline";
import type { ChurnCaseView } from "@/components/churn/churn-pipeline";
import { SIGNAL_META, type SignalKey } from "@/lib/churn/score";

function parseSignals(signals: unknown): ChurnCaseView["signals"] {
  if (!signals || typeof signals !== "object" || Array.isArray(signals)) {
    return [];
  }
  const bag = signals as {
    signals?: Record<
      string,
      { label?: string; score?: number | null; available?: boolean }
    >;
  };
  const order = Object.keys(SIGNAL_META) as SignalKey[];
  if (!bag.signals) {
    return order.map((key) => ({
      key,
      label: SIGNAL_META[key].label,
      value: 0,
    }));
  }
  return order.map((key) => {
    const s = bag.signals?.[key];
    return {
      key,
      label: s?.label ?? SIGNAL_META[key].label,
      value: s?.available === false ? 0 : Math.round(s?.score ?? 0),
    };
  });
}

export default async function ChurnPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("churn_records")
    .select(
      `
      id,
      churn_type,
      reason,
      deposit_status,
      risk_score,
      signals,
      flagged_at,
      client:clients!churn_records_client_id_fkey(
        id,
        name,
        company:companies!clients_company_id_fkey(name)
      )
    `
    )
    .is("resolved_at", null)
    .order("flagged_at", { ascending: false })
    .limit(100);

  const cases: ChurnCaseView[] = (rows ?? [])
    .filter((row) => {
      const flagged =
        row.reason != null ||
        row.deposit_status != null ||
        row.churn_type === "known";
      const elevated = (row.risk_score ?? 0) >= 40;
      return flagged || elevated;
    })
    .map((row) => {
      const client = Array.isArray(row.client) ? row.client[0] : row.client;
      const company = client
        ? Array.isArray(client.company)
          ? client.company[0]
          : client.company
        : null;
      const companyName = company?.name ?? client?.name ?? "Unknown";
      const flagged =
        row.reason != null ||
        row.deposit_status != null ||
        row.churn_type === "known";

      return {
        id: row.id,
        clientId: client?.id ?? "",
        clientName: companyName,
        contactName: client?.name ?? "",
        category: row.churn_type,
        typeLabel:
          row.churn_type === "known"
            ? "Known churn"
            : flagged
              ? "Unknown — suspected"
              : "Elevated risk",
        risk: Math.round(row.risk_score ?? 0),
        deposit: row.deposit_status,
        signals: parseSignals(row.signals),
        notes: row.reason ?? "Auto-monitored — no operator reason yet.",
        flagged,
      };
    });

  return <ChurnPipeline initialCases={cases} />;
}
