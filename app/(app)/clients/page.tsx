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
      "id, type, name, seat_count, texting_tier, rate_type, company:companies(id, name, data_source_type, data_source_tier, package_price)"
    )
    .order("created_at", { ascending: true });

  const rows = services ?? [];

  return (
    <div>
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
                    {PROVIDER_TYPE_LABELS[cs.company.data_source_type]}
                    {cs.company.data_source_tier
                      ? ` · ${DATA_SOURCE_TIER_LABELS[cs.company.data_source_tier]}`
                      : ""}
                  </TableCell>
                  <TableCell>
                    {cs.rate_type ? RATE_TYPE_LABELS[cs.rate_type] : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {formatPrice(cs.company.package_price)}
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
