import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import {
  CAMPAIGN_TYPE_LABELS,
  PROVIDER_TYPE_LABELS,
  DATA_SOURCE_TIER_LABELS,
  RATE_TYPE_LABELS,
  TEXTING_TIER_LABELS,
} from "@/lib/supabase/labels";
import { PaymentConfirmationChecklist } from "@/components/dashboard/payment-confirmation-checklist";
import type { Database } from "@/lib/supabase/database.types";

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type CampaignType = Database["public"]["Enums"]["campaign_type"];

function TypeIndicator({ type }: { type: CampaignType }) {
  const isCold = type === "cold_calling";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${isCold ? "text-ledger" : "text-clay"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isCold ? "bg-ledger" : "bg-clay"}`}
      />
      {CAMPAIGN_TYPE_LABELS[type]}
    </span>
  );
}

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const { data: services } = await supabase
    .from("campaign_services")
    .select(
      "id, type, name, seat_count, texting_tier, rate_type, company:companies(id, name)"
    )
    .order("created_at", { ascending: true });

  const rows = services ?? [];

  // Data-sourcing config now lives on each company's POC client row
  // (Sprint 3) -- companies is pure documentation.
  const companyIds = Array.from(new Set(rows.map((r) => r.company.id)));
  const { data: pocClients } = companyIds.length
    ? await supabase
        .from("clients")
        .select("company_id, data_source_type, data_source_tier, package_price")
        .eq("is_poc", true)
        .in("company_id", companyIds)
    : { data: [] };
  const configByCompany = new Map((pocClients ?? []).map((c) => [c.company_id, c]));

  // Start-of-month package-payment checklist (csr only): this CSR's
  // package clients whose package covers the current month and who
  // don't yet have a monthly_payment_confirmations row for it.
  let unconfirmedPackageClients: { id: string; name: string; company: { name: string } | null }[] = [];
  if (callerProfile?.role === "csr" && user) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
      .toISOString()
      .slice(0, 10);

    const { data: packageClients } = await supabase
      .from("clients")
      .select("id, name, company:companies(name), package_start_date, package_end_date")
      .eq("is_poc", true)
      .eq("assigned_csr_id", user.id)
      .eq("data_source_type", "res")
      .eq("data_source_tier", "package")
      .lt("package_start_date", monthEnd)
      .or(`package_end_date.is.null,package_end_date.gte.${monthStart}`);

    if (packageClients && packageClients.length > 0) {
      const { data: confirmations } = await supabase
        .from("monthly_payment_confirmations")
        .select("client_id")
        .eq("month", monthStart)
        .in(
          "client_id",
          packageClients.map((c) => c.id)
        );
      const confirmedIds = new Set((confirmations ?? []).map((c) => c.client_id));
      unconfirmedPackageClients = packageClients.filter((c) => !confirmedIds.has(c.id));
    }
  }

  return (
    <div>
      <PaymentConfirmationChecklist clients={unconfirmedPackageClients} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl text-ink">Clients</h1>
          <p className="text-sm text-ink-muted">
            {rows.length} active campaign service{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        {callerProfile?.role === "admin" && (
          <Link
            href="/data-lists/new"
            className={buttonVariants({ variant: "default" })}
          >
            + New Data List
          </Link>
        )}
      </div>

      <div className="border border-border bg-surface-raised">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Seats</TableHead>
              <TableHead>Data Source</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-sm text-ink-muted">
                  No campaign services assigned to you yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((cs, i) => {
                const config = configByCompany.get(cs.company.id);
                return (
                  <TableRow
                    key={cs.id}
                    className={i % 2 === 1 ? "bg-surface-sunken/50" : undefined}
                  >
                    <TableCell>
                      <Link
                        href={`/clients/${cs.company.id}`}
                        className="font-medium text-ledger hover:underline"
                      >
                        {cs.company.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {cs.name ??
                        (cs.type === "texting" && cs.texting_tier
                          ? `Texting — ${TEXTING_TIER_LABELS[cs.texting_tier]}`
                          : "—")}
                    </TableCell>
                    <TableCell>
                      <TypeIndicator type={cs.type} />
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {cs.seat_count}
                    </TableCell>
                    <TableCell>
                      {config?.data_source_type
                        ? PROVIDER_TYPE_LABELS[config.data_source_type]
                        : "—"}
                      {config?.data_source_tier
                        ? ` · ${DATA_SOURCE_TIER_LABELS[config.data_source_tier]}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      {cs.rate_type ? RATE_TYPE_LABELS[cs.rate_type] : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {formatPrice(config?.package_price ?? null)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
