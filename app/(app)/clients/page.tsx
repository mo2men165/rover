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

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("campaign_services")
    .select(
      "id, type, name, seat_count, source_type, service_type, rate_type, company:companies(id, name)"
    )
    .order("created_at", { ascending: true });

  const rows = services ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl text-ink">Clients</h1>
        <p className="text-sm text-ink-muted">
          {rows.length} active campaign service{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="border border-border bg-surface-raised">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Seats</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Service Tier</TableHead>
              <TableHead>Rate</TableHead>
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
              rows.map((cs, i) => (
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
                  <TableCell>{cs.name ?? "—"}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
