import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { StatTile } from "@/components/ui/stat-tile";
import { MonthPicker } from "@/components/commissions/month-picker";
import { UPSELL_TYPE_LABELS } from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type UpsellType = Database["public"]["Enums"]["upsell_type"];

type LineItem = {
  id: string;
  client: string;
  type: "Package" | "PAYG" | "Upsell";
  typeDetail?: string;
  amount: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthStr: string) {
  const [year, m] = monthStr.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function priorMonth(monthStr: string) {
  const [year, m] = monthStr.split("-").map(Number);
  const prior = new Date(Date.UTC(year, m - 2, 1));
  return `${prior.getUTCFullYear()}-${String(prior.getUTCMonth() + 1).padStart(2, "0")}`;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function companyLabel(
  client:
    | { name: string; company?: { name: string } | null }
    | null
    | undefined
) {
  return client?.company?.name ?? client?.name ?? "Unknown client";
}

async function fetchCsrLineItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  csrId: string,
  activityStart: string,
  activityEnd: string
): Promise<LineItem[]> {
  const [pkgRes, paygRes, upsellRes] = await Promise.all([
    supabase
      .from("monthly_payment_confirmations")
      .select(
        "id, confirmed_at, client:clients!inner(id, name, package_price, assigned_csr_id, company:companies(name))"
      )
      .eq("clients.assigned_csr_id", csrId)
      .gte("confirmed_at", activityStart)
      .lt("confirmed_at", activityEnd),
    supabase
      .from("payg_requests")
      .select(
        "id, paid_at, records_to_pull, pull_rate, records_to_skip_trace, skip_trace_rate, client:clients(name, company:companies(name))"
      )
      .eq("created_by", csrId)
      .eq("paid", true)
      .gte("paid_at", activityStart)
      .lt("paid_at", activityEnd),
    supabase
      .from("upsells")
      .select("id, upsell_type, total_amount, created_at, company:companies(name)")
      .eq("csr_id", csrId)
      .gte("created_at", activityStart)
      .lt("created_at", activityEnd),
  ]);

  const items: LineItem[] = [];

  for (const row of pkgRes.data ?? []) {
    const client = row.client as {
      name: string;
      package_price: number | null;
      company?: { name: string } | null;
    } | null;
    items.push({
      id: `pkg-${row.id}`,
      client: companyLabel(client),
      type: "Package",
      amount: 0.02 * Number(client?.package_price ?? 0),
    });
  }

  for (const row of paygRes.data ?? []) {
    const client = row.client as {
      name: string;
      company?: { name: string } | null;
    } | null;
    const amount =
      0.02 * Number(row.records_to_pull) * Number(row.pull_rate) +
      0.03 * Number(row.records_to_skip_trace) * Number(row.skip_trace_rate);
    items.push({
      id: `payg-${row.id}`,
      client: companyLabel(client),
      type: "PAYG",
      amount,
    });
  }

  for (const row of upsellRes.data ?? []) {
    const company = row.company as { name: string } | null;
    const upsellType = row.upsell_type as UpsellType;
    items.push({
      id: `upsell-${row.id}`,
      client: company?.name ?? "Unknown client",
      type: "Upsell",
      typeDetail: UPSELL_TYPE_LABELS[upsellType] ?? upsellType,
      amount: Number(row.total_amount),
    });
  }

  items.sort((a, b) => b.amount - a.amount);
  return items;
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();
  const activityMonth = priorMonth(month);
  const activityStart = `${activityMonth}-01T00:00:00.000Z`;
  const activityEnd = `${month}-01T00:00:00.000Z`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  if (!callerProfile || !["csr", "tl", "hod"].includes(callerProfile.role)) {
    redirect("/clients");
  }

  const { data: rows, error } = await supabase.rpc("get_commissions", {
    p_month: `${month}-01`,
  });

  const isCsr = callerProfile.role === "csr";
  const commissions = rows ?? [];
  const myCommission =
    commissions.find((r) => r.csr_id === user?.id) ?? commissions[0] ?? null;
  const totalAll = commissions.reduce((sum, r) => sum + Number(r.total_commission), 0);

  const lineItems =
    isCsr && user
      ? await fetchCsrLineItems(supabase, user.id, activityStart, activityEnd)
      : [];

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold tracking-[-0.02em] text-ink">
            Commissions
          </h1>
          <p className="text-sm text-ink-muted">
            {isCsr ? "Your" : "All CSRs'"} {formatMonthLabel(month)} payout
          </p>
          <p className="text-xs text-ink-muted">
            Commission earned in {formatMonthLabel(activityMonth)} is paid in{" "}
            {formatMonthLabel(month)} — pick the payout month, not the earning month.
          </p>
        </div>

        <MonthPicker value={month} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}

      {isCsr ? (
        <>
          <div className="grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
              label="Package Commission"
              value={Number(myCommission?.package_commission ?? 0)}
              prefix="$"
              decimals={2}
              accent="emerald"
            />
            <StatTile
              label="PAYG Commission"
              value={Number(myCommission?.payg_commission ?? 0)}
              prefix="$"
              decimals={2}
              accent="emerald"
            />
            <StatTile
              label="Upsell Commission"
              value={Number(myCommission?.upsell_commission ?? 0)}
              prefix="$"
              decimals={2}
              accent="emerald"
            />
            <StatTile
              label="Total Payout"
              value={Number(myCommission?.total_commission ?? 0)}
              prefix="$"
              decimals={2}
              accent="blue"
            />
          </div>

          <div className="glass-panel overflow-hidden rounded-[var(--radius-lg)]">
            <div className="border-b border-white/[0.07] px-5 py-3">
              <h2 className="font-heading text-sm font-semibold text-ink">
                Earned in {formatMonthLabel(activityMonth)}
              </h2>
              <p className="text-xs text-ink-muted">Line-item breakdown for this payout</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-16 text-center text-sm text-ink-muted">
                      No commission line items earned in {formatMonthLabel(activityMonth)}.
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, i) => (
                    <TableRow
                      key={item.id}
                      className={i % 2 === 1 ? "bg-surface-sunken/50" : undefined}
                    >
                      <TableCell className="font-medium text-ink">{item.client}</TableCell>
                      <TableCell className="text-ink-muted">
                        {item.type}
                        {item.typeDetail ? (
                          <span className="text-ink-faint"> · {item.typeDetail}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular font-medium text-ledger">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          <div className="glass-panel glass-panel--blue max-w-md rounded-[var(--radius-lg)] bg-[linear-gradient(135deg,oklch(74%_0.15_224/0.16),oklch(46%_0.15_260/0.1))] p-6">
            <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
              Department Grand Total
            </p>
            <p className="mt-2 font-heading text-4xl font-bold tabular text-ledger">
              {formatCurrency(totalAll)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {formatMonthLabel(month)} payout across all CSRs
            </p>
          </div>

          <div className="glass-panel rounded-[var(--radius-lg)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSR</TableHead>
                  <TableHead className="text-right">Package</TableHead>
                  <TableHead className="text-right">PAYG</TableHead>
                  <TableHead className="text-right">Upsell</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-sm text-ink-muted">
                      No commission data for {formatMonthLabel(month)}.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {commissions.map((r, i) => (
                      <TableRow
                        key={r.csr_id}
                        className={i % 2 === 1 ? "bg-surface-sunken/50" : undefined}
                      >
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-blue),var(--brand-blue-deep))] text-[10px] font-semibold text-white">
                              {initialsOf(r.csr_name)}
                            </span>
                            <span className="font-medium text-ink">{r.csr_name}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatCurrency(Number(r.package_commission))}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatCurrency(Number(r.payg_commission))}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatCurrency(Number(r.upsell_commission))}
                        </TableCell>
                        <TableCell className="text-right tabular font-medium text-ledger">
                          {formatCurrency(Number(r.total_commission))}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t border-border">
                      <TableCell className="font-medium text-ink">Total</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right tabular font-medium text-ledger">
                        {formatCurrency(totalAll)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
