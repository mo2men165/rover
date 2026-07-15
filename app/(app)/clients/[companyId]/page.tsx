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
  SOURCE_TYPE_LABELS,
  SERVICE_TIER_LABELS,
  RATE_TYPE_LABELS,
} from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

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

  // RLS scopes this to companies the signed-in user can see, so a CSR
  // navigating to a company outside their assignment hits notFound().
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single();

  if (!company) notFound();

  const [{ data: services }, { data: contact }, { data: dataLists }] =
    await Promise.all([
      supabase
        .from("campaign_services")
        .select(
          "id, type, name, seat_count, source_type, service_type, rate_type"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: true }),
      supabase
        .from("clients")
        .select("name")
        .eq("company_id", companyId)
        .eq("is_poc", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("data_lists")
        .select(
          "id, list_date, records_count, records_accepted, duplicates, campaign_service:campaign_services!inner(company_id, name, type)"
        )
        .eq("campaign_service.company_id", companyId)
        .order("list_date", { ascending: false }),
    ]);

  const campaignServices = services ?? [];
  const totalSeats = campaignServices.reduce((sum, s) => sum + s.seat_count, 0);
  const history = dataLists ?? [];

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
                <TableHead>Source</TableHead>
                <TableHead>Service Tier</TableHead>
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
                    {cs.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <TypeIndicator type={cs.type} />
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {cs.seat_count}
                  </TableCell>
                  <TableCell>{SOURCE_TYPE_LABELS[cs.source_type]}</TableCell>
                  <TableCell>
                    {cs.service_type ? SERVICE_TIER_LABELS[cs.service_type] : "—"}
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
                    <TableCell>{dl.campaign_service.name ?? "—"}</TableCell>
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
