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
import { MonthPicker } from "@/components/commissions/month-picker";

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

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();

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
  const totalAll = commissions.reduce((sum, r) => sum + r.total_commission, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl text-ink">Commissions</h1>
          <p className="text-sm text-ink-muted">
            {isCsr ? "Your" : "All CSRs'"} {formatMonthLabel(month)} payout
          </p>
          <p className="text-xs text-ink-muted">
            Package, PAYG, and upsell commission are earned in {formatMonthLabel(priorMonth(month))}{" "}
            and paid out this month.
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
        <div className="grid max-w-2xl grid-cols-4 gap-4">
          <div className="border border-border bg-surface-raised p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Package commission
            </p>
            <p className="mt-1 font-heading text-xl tabular text-ink">
              {formatCurrency(commissions[0]?.package_commission ?? 0)}
            </p>
          </div>
          <div className="border border-border bg-surface-raised p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              PAYG commission
            </p>
            <p className="mt-1 font-heading text-xl tabular text-ink">
              {formatCurrency(commissions[0]?.payg_commission ?? 0)}
            </p>
          </div>
          <div className="border border-border bg-surface-raised p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Upsell commission
            </p>
            <p className="mt-1 font-heading text-xl tabular text-ink">
              {formatCurrency(commissions[0]?.upsell_commission ?? 0)}
            </p>
          </div>
          <div className="border border-ledger bg-surface-raised p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Total
            </p>
            <p className="mt-1 font-heading text-xl tabular text-ledger">
              {formatCurrency(commissions[0]?.total_commission ?? 0)}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-border bg-surface-raised">
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
                      <TableCell className="font-medium text-ink">{r.csr_name}</TableCell>
                      <TableCell className="text-right tabular">
                        {formatCurrency(r.package_commission)}
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {formatCurrency(r.payg_commission)}
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {formatCurrency(r.upsell_commission)}
                      </TableCell>
                      <TableCell className="text-right tabular font-medium text-ledger">
                        {formatCurrency(r.total_commission)}
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
      )}
    </div>
  );
}
