import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { CAMPAIGN_TYPE_LABELS } from "@/lib/supabase/labels";
import { LogUpsellToggle } from "@/components/upsells/log-upsell-toggle";
import {
  ClientOpportunitiesPanel,
  type ClientOpportunityRow,
} from "@/components/upsells/client-opportunities-panel";
import {
  UPSELL_TYPE_LABELS,
  UPSELL_UNIT_AMOUNTS,
} from "@/lib/supabase/labels";
import { PaygRequestsPanel } from "@/components/payg/payg-requests-panel";
import { AddToDataPackageToggle } from "@/components/clients/add-to-data-package-toggle";
import { ClientHeader } from "@/components/clients/client-header";
import { BuyBoxCard } from "@/components/clients/buy-box-card";
import { ScriptCard } from "@/components/clients/script-card";
import { DataPackageCard } from "@/components/clients/data-package-card";
import { ServicesPanel } from "@/components/clients/services-panel";
import { PinnedNotesCard } from "@/components/clients/pinned-notes-card";
import { AssociatesCard } from "@/components/clients/associates-card";
import { InteractionTimeline } from "@/components/interactions/interaction-timeline";
import {
  HealthIndexCard,
  type HealthIndexData,
} from "@/components/churn/health-index-card";
import { IndexPanel } from "@/components/clients/index-panel";
import { computeAndPersistChurnScore } from "@/lib/churn/compute";
import { SIGNAL_META, type SignalKey } from "@/lib/churn/score";
import {
  loadIndexPanelData,
  type IndexPanelData,
} from "@/lib/index-panel/load";
import { toBuyBox } from "@/lib/supabase/buy-box-options";
import type { Database } from "@/lib/supabase/database.types";

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ---------------------------------------------------------------------
// Historical panel remains a visual stub. Churn Risk (ex-Health Index)
// is live via the 5-signal scorer (Part 3).
// ---------------------------------------------------------------------

const HISTORICAL_STUB = [
  { label: "Response Rate", value: "92%", delta: "+8%", positive: true },
  { label: "Records Delivered", value: "4,820", delta: "+12%", positive: true },
  { label: "Escalations", value: "1", delta: "-2", positive: true },
];

function HistoricalComparisonCard() {
  return (
    <div className="flex flex-col gap-3 glass-panel rounded-[var(--radius-lg)] p-5">
      <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
        Historical Comparison
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {HISTORICAL_STUB.map((s) => (
          <div key={s.label} className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">{s.label}</span>
            <span className="font-heading tabular text-xl text-ink">{s.value}</span>
            <span
              className={`text-xs ${s.positive ? "text-accent-emerald" : "text-accent-coral"}`}
            >
              {s.positive ? "↑" : "↓"} {s.delta} vs June
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-faint">
        Illustrative -- month-over-month snapshots aren&apos;t wired up for this client yet.
      </p>
    </div>
  );
}

const ELEVATED_ROLES = ["tl", "hod", "admin"];

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const isElevated = !!callerProfile?.role && ELEVATED_ROLES.includes(callerProfile.role);

  // RLS scopes this to companies the signed-in user can see, so a CSR
  // navigating to a company outside their assignment hits notFound().
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single();

  if (!company) notFound();

  const [{ data: services }, { data: pocClient }, { data: associates }, { data: dataListLinks }] =
    await Promise.all([
      supabase
        .from("campaign_services")
        .select(
          "id, type, name, seat_count, texting_tier, rate_type, service_start_date, texting_funnel, texting_account_name, texting_account_email"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: true }),
      // Package/data-sourcing config now lives on the POC client row
      // (Sprint 3) -- companies is pure documentation. created_at is
      // included alongside the existing fields to power the header's
      // "Client since" meta line (no new query, just one more column).
      supabase
        .from("clients")
        .select(
          "id, name, email, phone, title_at_company, preferred_contact_method, hs_object_id, lifecycle_stage, lead_source, assigned_csr_id, data_source_type, data_source_tier, data_source_provider_name, package_tier, package_price, package_commitment, package_start_date, monthly_skip_trace_expected, skip_tracing_type, skip_trace_provider_name, skip_trace_rate_tier, skip_trace_rate, buy_box, script, custom_script_url, pinned_notes, created_at"
        )
        .eq("company_id", companyId)
        .eq("is_poc", true)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("id, name, email, phone, role, preferred_contact_method, hs_object_id")
        .eq("company_id", companyId)
        .eq("is_poc", false)
        .order("created_at", { ascending: true }),
      // data_lists no longer FKs directly to a single campaign_service
      // (Sprint 3: multi-service lists) -- go through the join table and
      // group by data_list below.
      supabase
        .from("data_list_services")
        .select(
          "campaign_service:campaign_services!inner(company_id, name, type), data_list:data_lists(id, list_date, records_count, records_accepted, duplicates)"
        )
        .eq("campaign_service.company_id", companyId),
    ]);

  const campaignServices = services ?? [];
  const totalSeats = campaignServices
    .filter((s) => s.type === "cold_calling")
    .reduce((sum, s) => sum + s.seat_count, 0);
  const campaignTypeSet = new Set(campaignServices.map((s) => s.type));
  const campaignSummary =
    campaignServices.length === 0
      ? undefined
      : campaignTypeSet.size === 1
        ? CAMPAIGN_TYPE_LABELS[[...campaignTypeSet][0]]
        : `${campaignServices.length} campaigns`;

  let assignedCsrName: string | null = null;
  let referredByLabel: string | null = null;
  if (pocClient?.assigned_csr_id) {
    const { data: csrUser } = await supabase
      .from("users")
      .select("name")
      .eq("id", pocClient.assigned_csr_id)
      .single();
    assignedCsrName = csrUser?.name ?? null;
  }

  if (pocClient) {
    const { data: referral } = await supabase
      .from("referrals")
      .select(
        "id, referring:clients!referrals_referring_client_id_fkey(name, company:companies(id, name))"
      )
      .eq("referred_client_id", pocClient.id)
      .eq("status", "converted")
      .order("converted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const referring = referral?.referring as
      | { name: string; company: { id: string; name: string } | null }
      | null
      | undefined;
    if (referring) {
      referredByLabel = referring.company?.name
        ? `${referring.company.name} — ${referring.name}`
        : referring.name;
    }
  }

  let csrOptions: { id: string; name: string }[] = [];
  if (isElevated) {
    const { data } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "csr")
      .order("name");
    csrOptions = data ?? [];
  }

  const canEditProfile =
    !!pocClient &&
    (isElevated || (callerProfile?.role === "csr" && pocClient.assigned_csr_id === user?.id));

  const { data: paygRequests } = pocClient
    ? await supabase
        .from("payg_requests")
        .select(
          "id, records_to_pull, records_to_skip_trace, pull_rate, skip_trace_rate, paid, paid_at, created_at"
        )
        .eq("client_id", pocClient.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const historyMap = new Map<
    string,
    {
      id: string;
      list_date: string;
      records_count: number;
      records_accepted: number;
      duplicates: number;
      serviceNames: string[];
    }
  >();
  for (const link of dataListLinks ?? []) {
    if (!link.data_list) continue;
    const serviceName =
      link.campaign_service.name ??
      (link.campaign_service.type === "texting" ? "Texting" : "—");
    const existing = historyMap.get(link.data_list.id);
    if (existing) {
      existing.serviceNames.push(serviceName);
    } else {
      historyMap.set(link.data_list.id, { ...link.data_list, serviceNames: [serviceName] });
    }
  }
  const history = Array.from(historyMap.values()).sort((a, b) =>
    b.list_date.localeCompare(a.list_date)
  );

  const clientIds = [
    ...(pocClient ? [pocClient.id] : []),
    ...(associates ?? []).map((a) => a.id),
  ];

  let timelineRows: {
    id: string;
    type: Database["public"]["Enums"]["interaction_type"];
    direction: Database["public"]["Enums"]["interaction_direction"];
    source: Database["public"]["Enums"]["interaction_source"];
    summary: string;
    occurred_at: string;
    hubspot_synced: boolean;
    hubspot_sync_note: string | null;
    logged_by_name: string;
  }[] = [];

  if (clientIds.length > 0) {
    const { data: interactionRows } = await supabase
      .from("interactions")
      .select(
        "id, type, direction, source, summary, occurred_at, hubspot_synced, hubspot_sync_note, logger:users!interactions_logged_by_fkey(name)"
      )
      .in("client_id", clientIds)
      .order("occurred_at", { ascending: false })
      .limit(40);

    timelineRows = (interactionRows ?? []).map((row) => {
      const logger = Array.isArray(row.logger) ? row.logger[0] : row.logger;
      return {
        id: row.id,
        type: row.type,
        direction: row.direction,
        source: row.source,
        summary: row.summary,
        occurred_at: row.occurred_at,
        hubspot_synced: row.hubspot_synced,
        hubspot_sync_note: row.hubspot_sync_note,
        logged_by_name: logger?.name ?? "Unknown",
      };
    });
  }

  let healthIndex: HealthIndexData | null = null;
  if (pocClient) {
    let scoreResult = null;
    try {
      scoreResult = await computeAndPersistChurnScore(pocClient.id);
    } catch {
      scoreResult = null;
    }

    const { data: churnRow } = await supabase
      .from("churn_records")
      .select("churn_type, reason, deposit_status, risk_score, signals")
      .eq("client_id", pocClient.id)
      .is("resolved_at", null)
      .maybeSingle();

    const flagged = Boolean(
      churnRow &&
        (churnRow.reason != null ||
          churnRow.deposit_status != null ||
          churnRow.churn_type === "known")
    );

    const signalOrder = Object.keys(SIGNAL_META) as SignalKey[];
    const fromScore = scoreResult?.signals ?? [];
    const signals =
      fromScore.length > 0
        ? fromScore.map((s) => ({
            key: s.key,
            label: s.label,
            value: s.score ?? 0,
            available: s.available,
          }))
        : signalOrder.map((key) => ({
            key,
            label: SIGNAL_META[key].label,
            value: 0,
            available: false,
          }));

    healthIndex = {
      clientId: pocClient.id,
      riskScore: scoreResult?.riskScore ?? churnRow?.risk_score ?? null,
      computedAt: scoreResult?.computedAt ?? null,
      signals,
      flagged,
      churnType: flagged ? (churnRow?.churn_type ?? null) : null,
    };
  }

  let indexPanel: IndexPanelData | null = null;
  if (pocClient && clientIds.length > 0) {
    indexPanel = await loadIndexPanelData(supabase, {
      clientIds,
      pocClientId: pocClient.id,
      companyId,
      clientCreatedAt: pocClient.created_at,
      // Part 3 score — reference only, do not recompute.
      churnRiskScore: healthIndex?.riskScore ?? null,
    });
  }

  let activeOpportunities: ClientOpportunityRow[] = [];
  let loggedUpsells: {
    id: string;
    upsell_type: Database["public"]["Enums"]["upsell_type"];
    quantity: number;
    total_amount: number | null;
    created_at: string;
  }[] = [];

  if (pocClient) {
    const [{ data: oppRows }, { data: upsellRows }] = await Promise.all([
      supabase
        .from("upsell_opportunities")
        .select(
          "id, upsell_type, stage, quantity, snooze_until, csr:users!upsell_opportunities_csr_id_fkey(name)"
        )
        .eq("client_id", pocClient.id)
        .in("stage", ["opportunity", "pitched", "pending"])
        .order("created_at", { ascending: false }),
      supabase
        .from("upsells")
        .select("id, upsell_type, quantity, total_amount, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    activeOpportunities = (oppRows ?? []).map((row) => {
      const csr = Array.isArray(row.csr) ? row.csr[0] : row.csr;
      return {
        id: row.id,
        upsellType: row.upsell_type,
        stage: row.stage,
        quantity: row.quantity,
        snoozeUntil: row.snooze_until,
        csrName: csr?.name ?? "Unassigned",
      };
    });
    loggedUpsells = upsellRows ?? [];
  }

  return (
    <div className="page-shell page-shell--profile">
      {pocClient ? (
        <ClientHeader
          clientId={pocClient.id}
          companyName={company.name}
          name={pocClient.name}
          email={pocClient.email}
          phone={pocClient.phone}
          title={pocClient.title_at_company}
          preferredContactMethod={pocClient.preferred_contact_method}
          hsObjectId={pocClient.hs_object_id}
          lifecycleStage={pocClient.lifecycle_stage}
          leadSource={pocClient.lead_source}
          assignedCsrId={pocClient.assigned_csr_id}
          assignedCsrName={assignedCsrName}
          csrs={csrOptions}
          canEdit={canEditProfile}
          canReassignCsr={isElevated}
          campaignSummary={campaignSummary}
          totalSeats={totalSeats}
          packageTier={pocClient.package_tier}
          createdAt={pocClient.created_at}
          referredBy={referredByLabel}
        />
      ) : (
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Client</p>
          <h1 className="font-heading text-2xl text-ink">{company.name}</h1>
        </div>
      )}

      {pocClient && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-4">
            <BuyBoxCard
              clientId={pocClient.id}
              buyBox={toBuyBox(pocClient.buy_box)}
              canEdit={canEditProfile}
            />
            <ScriptCard
              clientId={pocClient.id}
              script={pocClient.script}
              customScriptUrl={pocClient.custom_script_url}
              canEdit={canEditProfile}
            />
                        <DataPackageCard
              dataSourceType={pocClient.data_source_type}
              dataSourceTier={pocClient.data_source_tier}
              dataSourceProviderName={pocClient.data_source_provider_name}
              packageTier={pocClient.package_tier}
              packageCommitment={pocClient.package_commitment}
              packageStartDate={pocClient.package_start_date}
              packagePrice={pocClient.package_price}
              skipTracingType={pocClient.skip_tracing_type}
              skipTraceProviderName={pocClient.skip_trace_provider_name}
              skipTraceRateTier={pocClient.skip_trace_rate_tier}
              skipTraceRate={pocClient.skip_trace_rate}
              monthlySkipTraceExpected={pocClient.monthly_skip_trace_expected}
            />
            <PinnedNotesCard
              clientId={pocClient.id}
              pinnedNotes={pocClient.pinned_notes}
              canEdit={canEditProfile}
            />
            <AssociatesCard
              companyId={companyId}
              associates={associates ?? []}
              canEdit={canEditProfile}
            />
          </div>
          <div className="flex flex-col gap-4">
            {indexPanel && <IndexPanel data={indexPanel} />}
            {healthIndex && <HealthIndexCard data={healthIndex} />}
            {pocClient && (
              <ClientOpportunitiesPanel opportunities={activeOpportunities} />
            )}
            <InteractionTimeline interactions={timelineRows} companyId={companyId} />
            <HistoricalComparisonCard />
          </div>
        </div>
      )}

      {/* Services + related tabs — primary profile flow (mock: below 1fr/1.3fr grid) */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-bold text-ink">Services</h2>
            <p className="text-sm text-ink-muted">
              {campaignServices.length} campaign service
              {campaignServices.length === 1 ? "" : "s"} ·{" "}
              <span className="tabular">{totalSeats}</span> total seats
            </p>
          </div>
          <div className="flex gap-3">
            {callerProfile?.role === "csr" && (
              <LogUpsellToggle companyId={companyId} campaignServices={campaignServices} />
            )}
            {pocClient &&
              pocClient.data_source_tier !== "package" &&
              (isElevated ||
                (callerProfile?.role === "csr" && pocClient.assigned_csr_id === user?.id)) && (
                <AddToDataPackageToggle clientId={pocClient.id} />
              )}
          </div>
        </div>

        {/* Pill-tab panel -- pure CSS radio-group tabs (no client JS) so
            this stays a Server Component. Each `group-has-[#tab-x:checked]`
            utility reaches into the subtree from the shared `group/tabs`
            wrapper to toggle the matching label's active state and the
            matching content panel's visibility. */}
        <div className="group/tabs glass-panel rounded-[16px] p-4 md:p-6">
          <input type="radio" name="profile-tab" id="tab-services" className="sr-only" defaultChecked />
          <input type="radio" name="profile-tab" id="tab-datalists" className="sr-only" />
          <input type="radio" name="profile-tab" id="tab-payg" className="sr-only" />
          <input type="radio" name="profile-tab" id="tab-upsells" className="sr-only" />
          <input type="radio" name="profile-tab" id="tab-commission" className="sr-only" />

          <div
            role="radiogroup"
            aria-label="Profile sections"
            className="mb-5 flex flex-wrap gap-1.5 rounded-[10px] border border-white/[0.07] bg-white/[0.03] p-1"
          >
            {/* Tailwind's scanner needs literal class strings, so each tab's
                `group-has-[#id:checked]` variant is spelled out below rather
                than built with template-literal interpolation (which the
                scanner can't statically extract). */}
            <label
              htmlFor="tab-services"
              className="cursor-pointer rounded-[9px] border-none bg-transparent px-3.5 py-2 text-[12.5px] font-bold text-ink-muted transition-all hover:text-ink group-has-[#tab-services:checked]/tabs:bg-[oklch(74%_0.15_224/0.16)] group-has-[#tab-services:checked]/tabs:text-ink"
            >
              Services
            </label>
            <label
              htmlFor="tab-datalists"
              className="cursor-pointer rounded-[9px] border-none bg-transparent px-3.5 py-2 text-[12.5px] font-bold text-ink-muted transition-all hover:text-ink group-has-[#tab-datalists:checked]/tabs:bg-[oklch(74%_0.15_224/0.16)] group-has-[#tab-datalists:checked]/tabs:text-ink"
            >
              Data Lists
            </label>
            <label
              htmlFor="tab-payg"
              className="cursor-pointer rounded-[9px] border-none bg-transparent px-3.5 py-2 text-[12.5px] font-bold text-ink-muted transition-all hover:text-ink group-has-[#tab-payg:checked]/tabs:bg-[oklch(74%_0.15_224/0.16)] group-has-[#tab-payg:checked]/tabs:text-ink"
            >
              PAYG Requests
            </label>
            <label
              htmlFor="tab-upsells"
              className="cursor-pointer rounded-[9px] border-none bg-transparent px-3.5 py-2 text-[12.5px] font-bold text-ink-muted transition-all hover:text-ink group-has-[#tab-upsells:checked]/tabs:bg-[oklch(74%_0.15_224/0.16)] group-has-[#tab-upsells:checked]/tabs:text-ink"
            >
              Upsells
            </label>
            <label
              htmlFor="tab-commission"
              className="cursor-pointer rounded-[9px] border-none bg-transparent px-3.5 py-2 text-[12.5px] font-bold text-ink-muted transition-all hover:text-ink group-has-[#tab-commission:checked]/tabs:bg-[oklch(74%_0.15_224/0.16)] group-has-[#tab-commission:checked]/tabs:text-ink"
            >
              Commission
            </label>
          </div>

          <div className="hidden group-has-[#tab-services:checked]/tabs:block">
            <ServicesPanel
              services={campaignServices}
              script={pocClient?.script ?? null}
              customScriptUrl={pocClient?.custom_script_url ?? null}
            />
          </div>

          <div className="hidden group-has-[#tab-datalists:checked]/tabs:block">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 glass-panel border-dashed border-white/15 rounded-[var(--radius-lg)] py-16 text-center">
                <p className="text-sm font-medium text-ink">No data lists yet</p>
                <p className="max-w-sm text-sm text-ink-muted">
                  Data list uploads for this client&apos;s campaigns will appear here once
                  available.
                </p>
              </div>
            ) : (
              <div className="glass-panel rounded-[var(--radius-lg)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                      <TableHead className="text-right">Accepted</TableHead>
                      <TableHead className="text-right">Duplicates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((dl, i) => (
                      <TableRow
                        key={dl.id}
                        className={i % 2 === 1 ? "bg-surface-sunken/50" : undefined}
                      >
                        <TableCell className="tabular">{dl.list_date}</TableCell>
                        <TableCell>{dl.serviceNames.join(", ")}</TableCell>
                        <TableCell className="text-right tabular">{dl.records_count}</TableCell>
                        <TableCell className="text-right tabular">{dl.records_accepted}</TableCell>
                        <TableCell className="text-right tabular">{dl.duplicates}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="hidden group-has-[#tab-payg:checked]/tabs:block">
            <PaygRequestsPanel
              clientId={pocClient?.id ?? null}
              requests={paygRequests ?? []}
              canCreate={callerProfile?.role === "csr" && pocClient?.assigned_csr_id === user?.id}
            />
          </div>

          <div className="hidden group-has-[#tab-upsells:checked]/tabs:block">
            {loggedUpsells.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 glass-panel border-dashed border-white/15 rounded-[var(--radius-lg)] py-16 text-center">
                <p className="text-sm font-medium text-ink">No confirmed upsells yet</p>
                <p className="max-w-sm text-sm text-ink-muted">
                  Pipeline wins and direct log-upsell actions appear here once
                  payment is confirmed.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {loggedUpsells.map((u) => (
                  <div
                    key={u.id}
                    className="flex w-48 flex-col gap-2 glass-panel rounded-[var(--radius-md)] p-3"
                  >
                    <span className="text-[10px] font-medium tracking-wide text-ink-faint uppercase">
                      Confirmed
                    </span>
                    <p className="text-sm font-medium text-ink">
                      {UPSELL_TYPE_LABELS[u.upsell_type]}
                      {u.upsell_type === "add_cc_seat" && u.quantity > 1
                        ? ` ×${u.quantity}`
                        : ""}
                    </p>
                    <p className="text-xs text-ink-muted">{company.name}</p>
                    <p className="tabular text-sm font-semibold text-accent-emerald">
                      $
                      {(
                        u.total_amount ??
                        UPSELL_UNIT_AMOUNTS[u.upsell_type] * u.quantity
                      ).toLocaleString("en-US")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden group-has-[#tab-commission:checked]/tabs:block">
            <p className="mb-3 text-xs text-ink-faint">
              Preview layout -- commission totals for this client aren&apos;t wired up here yet.
              See the{" "}
              <Link href="/commissions" className="text-ledger hover:underline">
                Commissions
              </Link>{" "}
              page.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Package commission", value: 0 },
                { label: "PAYG commission", value: 0 },
                { label: "Upsell commission", value: 0 },
                { label: "Total commission", value: 0 },
              ].map((c) => (
                <div key={c.label} className="glass-panel flex flex-col gap-1 rounded-[var(--radius-md)] p-3">
                  <span className="text-xs text-ink-muted">{c.label}</span>
                  <span className="font-heading tabular text-xl text-ink">
                    {formatPrice(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
