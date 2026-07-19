import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatTile } from "@/components/ui/stat-tile";
import { Input } from "@/components/ui/input";
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

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

type CampaignType = Database["public"]["Enums"]["campaign_type"];

function TypeBadge({ type }: { type: CampaignType }) {
  const isCold = type === "cold_calling";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        isCold
          ? "border-[oklch(74%_0.15_224/0.28)] bg-[oklch(74%_0.15_224/0.14)] text-ledger"
          : "border-[oklch(78%_0.15_85/0.28)] bg-[oklch(78%_0.15_85/0.14)] text-accent-amber"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isCold ? "bg-ledger" : "bg-accent-amber"}`} />
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
        .select("id, company_id, data_source_type, data_source_tier, package_price")
        .eq("is_poc", true)
        .in("company_id", companyIds)
    : { data: [] };
  const configByCompany = new Map((pocClients ?? []).map((c) => [c.company_id, c]));

  // Operator-flagged churn markers for the clients list (not auto-monitor-only).
  const { data: activeChurn } = (pocClients ?? []).length
    ? await supabase
        .from("churn_records")
        .select("client_id, churn_type, reason, deposit_status")
        .is("resolved_at", null)
        .in(
          "client_id",
          (pocClients ?? []).map((p) => p.id)
        )
    : { data: [] };

  const flaggedClientIds = new Set(
    (activeChurn ?? [])
      .filter(
        (r) =>
          r.reason != null || r.deposit_status != null || r.churn_type === "known"
      )
      .map((r) => r.client_id)
  );
  const churnCompanyIds = new Set(
    (pocClients ?? [])
      .filter((p) => flaggedClientIds.has(p.id))
      .map((p) => p.company_id)
  );

  const coldCount = rows.filter((r) => r.type === "cold_calling").length;
  const textingCount = rows.length - coldCount;
  const totalMonthlyValue = Array.from(configByCompany.values()).reduce(
    (sum, c) => sum + (c.package_price ?? 0),
    0
  );

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
    <div className="page-shell">
      <PaymentConfirmationChecklist clients={unconfirmedPackageClients} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {rows.length} active campaign service{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-3">
          {callerProfile?.role &&
            ["csr", "tl", "hod", "admin"].includes(callerProfile.role) && (
              <Link
                href="/clients/new"
                className={buttonVariants({ variant: "default" })}
              >
                + Add Client
              </Link>
            )}
          {callerProfile?.role === "admin" && (
            <Link
              href="/data-lists/new"
              className={buttonVariants({ variant: "outline" })}
            >
              + New Data List
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Active services" value={rows.length} accent="blue" />
        <StatTile label="Cold calling" value={coldCount} accent="violet" />
        <StatTile label="Texting" value={textingCount} accent="amber" />
        <StatTile
          label="Monthly value"
          value={totalMonthlyValue}
          prefix="$"
          accent="emerald"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search clients…" className="max-w-[340px]" />
        <button
          type="button"
          className="rounded-[9px] border border-[oklch(74%_0.15_224/0.4)] bg-[oklch(74%_0.15_224/0.14)] px-[15px] py-[9px] text-[12.5px] font-semibold text-ink"
        >
          All
        </button>
        <button
          type="button"
          className="rounded-[9px] border border-white/10 bg-white/[0.03] px-[15px] py-[9px] text-[12.5px] font-semibold text-ink-muted transition-colors hover:border-white/20 hover:text-ink"
        >
          Cold Calling
        </button>
        <button
          type="button"
          className="rounded-[9px] border border-white/10 bg-white/[0.03] px-[15px] py-[9px] text-[12.5px] font-semibold text-ink-muted transition-colors hover:border-white/20 hover:text-ink"
        >
          Texting
        </button>
      </div>

      <div className="glass-panel glass-panel--blue overflow-hidden rounded-[var(--radius-lg)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                Client
              </TableHead>
              <TableHead className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                Campaign
              </TableHead>
              <TableHead className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                Type
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-ink-muted uppercase">
                Seats
              </TableHead>
              <TableHead className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                Data Source
              </TableHead>
              <TableHead className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                Rate
              </TableHead>
              <TableHead className="text-right text-xs font-medium tracking-wide text-ink-muted uppercase">
                Price
              </TableHead>
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
              rows.map((cs) => {
                const config = configByCompany.get(cs.company.id);
                const price = config?.package_price ?? null;
                const isChurned = churnCompanyIds.has(cs.company.id);
                return (
                  <TableRow
                    key={cs.id}
                    className={
                      isChurned
                        ? "bg-[oklch(64%_0.19_25/0.06)]"
                        : undefined
                    }
                  >
                    <TableCell>
                      <Link
                        href={`/clients/${cs.company.id}`}
                        className="group flex items-center gap-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-blue),var(--brand-blue-deep))] text-[10px] font-semibold text-white">
                          {initialsOf(cs.company.name)}
                        </span>
                        <span className="flex flex-col">
                          <span className="font-medium text-ink group-hover:text-ledger group-hover:underline">
                            {cs.company.name}
                          </span>
                          {isChurned && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent-coral">
                              Churn flagged
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {cs.name ??
                        (cs.type === "texting" && cs.texting_tier
                          ? `Texting — ${TEXTING_TIER_LABELS[cs.texting_tier]}`
                          : "—")}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={cs.type} />
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {cs.seat_count}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {config?.data_source_type
                        ? PROVIDER_TYPE_LABELS[config.data_source_type]
                        : "—"}
                      {config?.data_source_tier
                        ? ` · ${DATA_SOURCE_TIER_LABELS[config.data_source_tier]}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {cs.rate_type ? RATE_TYPE_LABELS[cs.rate_type] : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular font-medium ${price ? "text-accent-emerald" : "text-ink-muted"}`}
                    >
                      {formatPrice(price)}
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
