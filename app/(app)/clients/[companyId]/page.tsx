import { notFound } from "next/navigation";
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
  PACKAGE_TIER_LABELS,
  RATE_TYPE_LABELS,
  TEXTING_TIER_LABELS,
} from "@/lib/supabase/labels";
import { LogUpsellToggle } from "@/components/upsells/log-upsell-toggle";
import { PaygRequestsPanel } from "@/components/payg/payg-requests-panel";
import { AddToDataPackageToggle } from "@/components/clients/add-to-data-package-toggle";
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

  // RLS scopes this to companies the signed-in user can see, so a CSR
  // navigating to a company outside their assignment hits notFound().
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single();

  if (!company) notFound();

  const [{ data: services }, { data: pocClient }, { data: dataListLinks }] =
    await Promise.all([
      supabase
        .from("campaign_services")
        .select(
          "id, type, name, seat_count, texting_tier, rate_type"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: true }),
      // Package/data-sourcing config now lives on the POC client row
      // (Sprint 3) -- companies is pure documentation.
      supabase
        .from("clients")
        .select(
          "id, name, assigned_csr_id, data_source_type, data_source_tier, package_tier, package_price, skip_tracing_type, skip_trace_rate"
        )
        .eq("company_id", companyId)
        .eq("is_poc", true)
        .maybeSingle(),
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
  const totalSeats = campaignServices.reduce((sum, s) => sum + s.seat_count, 0);
  const contact = pocClient;

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-muted">
          Client
        </p>
        <h1 className="font-heading text-2xl text-ink">{company.name}</h1>
        {contact && (
          <p className="mt-1 text-sm text-ink-muted">
            Primary contact: {contact.name}
          </p>
        )}
        <p className="mt-3 text-sm text-ink-muted">
          {campaignServices.length} campaign services ·{" "}
          <span className="tabular">{totalSeats}</span> total seats
        </p>
        {pocClient?.data_source_type && (
          <p className="mt-1 text-sm text-ink-muted">
            Data source: {PROVIDER_TYPE_LABELS[pocClient.data_source_type]}
            {pocClient.data_source_tier
              ? ` · ${DATA_SOURCE_TIER_LABELS[pocClient.data_source_tier]}`
              : ""}
            {pocClient.package_tier
              ? ` (${PACKAGE_TIER_LABELS[pocClient.package_tier]})`
              : ""}
            {pocClient.package_price !== null
              ? ` · ${formatPrice(pocClient.package_price)}/mo`
              : ""}
            {pocClient.skip_tracing_type && (
              <>
                {" · "}
                Skip tracing: {PROVIDER_TYPE_LABELS[pocClient.skip_tracing_type]}
                {pocClient.skip_trace_rate !== null
                  ? ` · ${formatPrice(pocClient.skip_trace_rate)}/record`
                  : ""}
              </>
            )}
          </p>
        )}
        <div className="mt-4 flex gap-3">
          {callerProfile?.role === "csr" && (
            <LogUpsellToggle companyId={companyId} campaignServices={campaignServices} />
          )}
          {pocClient &&
            pocClient.data_source_tier !== "package" &&
            (callerProfile?.role === "admin" ||
              callerProfile?.role === "tl" ||
              callerProfile?.role === "hod" ||
              (callerProfile?.role === "csr" && pocClient.assigned_csr_id === user?.id)) && (
              <AddToDataPackageToggle clientId={pocClient.id} />
            )}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
          Campaign services
        </h2>
        <div className="border border-border bg-surface-raised">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Seats</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignServices.map((cs, i) => (
                <TableRow
                  key={cs.id}
                  className={i % 2 === 1 ? "bg-surface-sunken/50" : undefined}
                >
                  <TableCell className="font-medium text-ink">
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
                    {cs.rate_type ? RATE_TYPE_LABELS[cs.rate_type] : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <PaygRequestsPanel
        clientId={pocClient?.id ?? null}
        requests={paygRequests ?? []}
        canCreate={
          callerProfile?.role === "csr" && pocClient?.assigned_csr_id === user?.id
        }
      />

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
          Data list history
        </h2>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface-raised py-16 text-center">
            <p className="text-sm font-medium text-ink">No data lists yet</p>
            <p className="max-w-sm text-sm text-ink-muted">
              Data list uploads for this client&apos;s campaigns will appear
              here once available.
            </p>
          </div>
        ) : (
          <div className="border border-border bg-surface-raised">
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
                    <TableCell className="text-right tabular">
                      {dl.records_count}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {dl.records_accepted}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {dl.duplicates}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
