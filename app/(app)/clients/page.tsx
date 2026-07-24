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
  LIFECYCLE_STAGE_LABELS,
  SKIP_TRACE_RATE_TIER_LABELS,
} from "@/lib/supabase/labels";
import { PaymentConfirmationChecklist } from "@/components/dashboard/payment-confirmation-checklist";
import type { Database } from "@/lib/supabase/database.types";

type LifecycleStage = Database["public"]["Enums"]["lifecycle_stage"];
type CampaignType = Database["public"]["Enums"]["campaign_type"];

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in_operation", label: "In Operation" },
  { key: "onboarding", label: "Onboarding" },
  { key: "churn", label: "Churn" },
];

const LIFECYCLE_PILL: Record<
  LifecycleStage,
  { bg: string; fg: string }
> = {
  in_operation: {
    bg: "bg-[oklch(70%_0.16_155/0.14)]",
    fg: "text-[oklch(78%_0.15_155)]",
  },
  onboarding: {
    bg: "bg-[oklch(78%_0.15_85/0.14)]",
    fg: "text-[oklch(82%_0.15_85)]",
  },
  churn: {
    bg: "bg-[oklch(65%_0.19_25/0.14)]",
    fg: "text-[oklch(75%_0.15_25)]",
  },
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function ServiceChips({ types }: { types: CampaignType[] }) {
  const unique = Array.from(new Set(types));
  if (unique.length === 0) {
    return <span className="text-ink-faint">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((type) => {
        const isCold = type === "cold_calling";
        return (
          <span
            key={type}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              isCold
                ? "border-[oklch(74%_0.15_224/0.28)] bg-[oklch(74%_0.15_224/0.14)] text-ledger"
                : "border-[oklch(78%_0.15_85/0.28)] bg-[oklch(78%_0.15_85/0.14)] text-accent-amber"
            }`}
          >
            {CAMPAIGN_TYPE_LABELS[type]}
          </span>
        );
      })}
    </div>
  );
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lifecycle?: string }>;
}) {
  const params = await searchParams;
  const filterKey = FILTERS.some((f) => f.key === params.lifecycle)
    ? (params.lifecycle as string)
    : "all";
  const query = (params.q ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const { data: pocClients } = await supabase
    .from("clients")
    .select(
      "id, name, company_id, lifecycle_stage, data_source_type, data_source_tier, data_source_provider_name, skip_tracing_type, skip_trace_provider_name, skip_trace_rate_tier, skip_trace_rate, monthly_skip_trace_expected, company:companies(id, name)"
    )
    .eq("is_poc", true)
    .order("created_at", { ascending: true });

  const companyIds = Array.from(
    new Set((pocClients ?? []).map((c) => c.company_id))
  );

  const { data: services } = companyIds.length
    ? await supabase
        .from("campaign_services")
        .select("id, type, seat_count, company_id, name")
        .in("company_id", companyIds)
    : { data: [] };

  const servicesByCompany = new Map<
    string,
    { types: CampaignType[]; seats: number; campaignName: string | null }
  >();
  for (const s of services ?? []) {
    const cur = servicesByCompany.get(s.company_id) ?? {
      types: [],
      seats: 0,
      campaignName: null,
    };
    cur.types.push(s.type);
    if (s.type === "cold_calling") cur.seats += s.seat_count;
    // Prefer cold-calling campaign name; else first named service.
    if (s.name?.trim()) {
      if (s.type === "cold_calling" || !cur.campaignName) {
        cur.campaignName = s.name.trim();
      }
    }
    servicesByCompany.set(s.company_id, cur);
  }

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

  type Row = {
    companyId: string;
    pocName: string;
    companyName: string;
    campaignName: string | null;
    lifecycle: LifecycleStage | null;
    types: CampaignType[];
    seats: number;
    dataSource: string;
    skipTrace: string;
    churnFlagged: boolean;
  };

  const rows: Row[] = (pocClients ?? []).map((poc) => {
    const company = poc.company as { id: string; name: string } | null;
    const svc = servicesByCompany.get(poc.company_id);

    let dataSource = "—";
    if (poc.data_source_type === "self_provided") {
      dataSource = poc.data_source_provider_name?.trim() || "Unknown";
    } else if (poc.data_source_type) {
      dataSource = `${PROVIDER_TYPE_LABELS[poc.data_source_type]}${
        poc.data_source_tier
          ? ` · ${DATA_SOURCE_TIER_LABELS[poc.data_source_tier]}`
          : ""
      }`;
    }

    let skipTrace = "—";
    if (poc.skip_tracing_type === "self_provided") {
      skipTrace = poc.skip_trace_provider_name?.trim() || "Unknown";
    } else if (poc.skip_tracing_type) {
      const rate =
        poc.skip_trace_rate_tier === "custom" && poc.skip_trace_rate != null
          ? `$${poc.skip_trace_rate}/rec`
          : poc.skip_trace_rate_tier
            ? SKIP_TRACE_RATE_TIER_LABELS[poc.skip_trace_rate_tier]
            : null;
      skipTrace = rate
        ? `${PROVIDER_TYPE_LABELS[poc.skip_tracing_type]} · ${rate}`
        : PROVIDER_TYPE_LABELS[poc.skip_tracing_type];
    } else if (poc.monthly_skip_trace_expected != null) {
      skipTrace = `${poc.monthly_skip_trace_expected.toLocaleString()} / mo`;
    }

    return {
      companyId: company?.id ?? poc.company_id,
      pocName: poc.name,
      companyName: company?.name ?? "Unknown",
      campaignName: svc?.campaignName ?? null,
      lifecycle: poc.lifecycle_stage,
      types: svc?.types ?? [],
      seats: svc?.seats ?? 0,
      dataSource,
      skipTrace,
      churnFlagged: flaggedClientIds.has(poc.id),
    };
  });

  const filtered = rows.filter((r) => {
    if (filterKey !== "all") {
      if (r.lifecycle !== filterKey) return false;
    }
    if (query) {
      const hay = `${r.pocName} ${r.companyName} ${r.campaignName ?? ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const totalClients = rows.length;
  const onboardingCount = rows.filter((r) => r.lifecycle === "onboarding").length;
  const coldCallingEnabled = rows.filter((r) =>
    r.types.includes("cold_calling")
  ).length;
  const textingEnabled = rows.filter((r) => r.types.includes("texting")).length;

  let unconfirmedPackageClients: {
    id: string;
    name: string;
    company: { name: string } | null;
  }[] = [];
  if (callerProfile?.role === "csr" && user) {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    )
      .toISOString()
      .slice(0, 10);
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    )
      .toISOString()
      .slice(0, 10);

    const { data: packageClients } = await supabase
      .from("clients")
      .select(
        "id, name, company:companies(name), package_start_date, package_end_date"
      )
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
      unconfirmedPackageClients = packageClients.filter(
        (c) => !confirmedIds.has(c.id)
      );
    }
  }

  function filterHref(key: string) {
    const sp = new URLSearchParams();
    if (key !== "all") sp.set("lifecycle", key);
    if (query) sp.set("q", query);
    const s = sp.toString();
    return s ? `/clients?${s}` : "/clients";
  }

  return (
    <div className="page-shell">
      <PaymentConfirmationChecklist clients={unconfirmedPackageClients} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {totalClients} client{totalClients === 1 ? "" : "s"} ·{" "}
            {(services ?? []).length} campaign service
            {(services ?? []).length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-3">
          {callerProfile?.role &&
            ["csr", "tl", "hod", "admin"].includes(callerProfile.role) && (
              <Link
                href="/clients/new"
                className={buttonVariants({ variant: "brand" })}
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

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile label="Total Clients" value={totalClients} accent="blue" />
        <StatTile label="Onboarding" value={onboardingCount} accent="amber" />
        <StatTile
          label="Cold Calling Enabled"
          value={coldCallingEnabled}
          accent="blue"
        />
        <StatTile
          label="Texting Enabled"
          value={textingEnabled}
          accent="blue"
        />
      </div>

      <form className="flex flex-wrap items-center gap-3" method="get">
        {filterKey !== "all" && (
          <input type="hidden" name="lifecycle" value={filterKey} />
        )}
        <Input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search clients or campaigns…"
          className="max-w-[340px]"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filterKey === f.key;
            return (
              <Link
                key={f.key}
                href={filterHref(f.key)}
                className={
                  active
                    ? "rounded-[9px] bg-[oklch(74%_0.15_224/0.16)] px-[15px] py-[9px] text-[12.5px] font-bold text-[oklch(80%_0.14_210)]"
                    : "rounded-[9px] border border-white/10 bg-white/[0.03] px-[15px] py-[9px] text-[12.5px] font-semibold text-ink-muted transition-colors hover:border-white/20 hover:text-ink"
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </form>

      <div className="glass-panel glass-panel--blue overflow-hidden rounded-[16px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] font-medium tracking-[0.05em] text-ink-muted uppercase">
                Client
              </TableHead>
              <TableHead className="text-[11px] font-medium tracking-[0.05em] text-ink-muted uppercase">
                Lifecycle
              </TableHead>
              <TableHead className="text-[11px] font-medium tracking-[0.05em] text-ink-muted uppercase">
                Services
              </TableHead>
              <TableHead className="text-right text-[11px] font-medium tracking-[0.05em] text-ink-muted uppercase">
                Seats
              </TableHead>
              <TableHead className="text-[11px] font-medium tracking-[0.05em] text-ink-muted uppercase">
                Data Source
              </TableHead>
              <TableHead className="text-[11px] font-medium tracking-[0.05em] text-ink-muted uppercase">
                Skip Trace
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-16 text-center text-sm text-ink-muted"
                >
                  No clients match this filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const pill = row.lifecycle
                  ? LIFECYCLE_PILL[row.lifecycle]
                  : null;
                return (
                  <TableRow
                    key={row.companyId}
                    className={
                      row.churnFlagged || row.lifecycle === "churn"
                        ? "bg-[oklch(64%_0.19_25/0.06)]"
                        : undefined
                    }
                  >
                    <TableCell>
                      <Link
                        href={`/clients/${row.companyId}`}
                        className="group flex items-center gap-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[oklch(74%_0.15_224)] text-[10px] font-semibold text-[oklch(10%_0.01_264)]">
                          {initialsOf(row.pocName)}
                        </span>
                        <span className="flex min-w-0 flex-col leading-tight">
                          <span className="font-medium text-ink group-hover:text-ledger group-hover:underline">
                            {row.pocName}
                          </span>
                          <span className="truncate text-[11px] text-ink-muted">
                            {row.campaignName ?? row.companyName}
                          </span>
                          {row.churnFlagged && (
                            <span className="text-[10px] font-semibold tracking-wide text-accent-coral uppercase">
                              Churn flagged
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.lifecycle && pill ? (
                        <span
                          className={`inline-flex rounded-full px-[9px] py-[3px] text-[11.5px] font-bold whitespace-nowrap ${pill.bg} ${pill.fg}`}
                        >
                          {LIFECYCLE_STAGE_LABELS[row.lifecycle]}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ServiceChips types={row.types} />
                    </TableCell>
                    <TableCell className="text-right tabular">{row.seats}</TableCell>
                    <TableCell className="text-ink-muted">{row.dataSource}</TableCell>
                    <TableCell className="text-ink-muted">{row.skipTrace}</TableCell>
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
