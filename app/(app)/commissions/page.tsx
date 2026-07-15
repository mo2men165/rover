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
import { Button } from "@/components/ui/button";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
            {isCsr ? "Your commission for" : "All CSRs' commission for"}{" "}
            {month}
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" variant="outline">
            View
          </Button>
        </form>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}

      {isCsr ? (
        <div className="grid max-w-lg grid-cols-3 gap-4">
          <div className="border border-border bg-surface-raised p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Data commission
            </p>
            <p className="mt-1 font-heading text-xl tabular text-ink">
              {formatCurrency(commissions[0]?.data_commission ?? 0)}
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
                <TableHead className="text-right">Data</TableHead>
                <TableHead className="text-right">Upsell</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center text-sm text-ink-muted">
                    No commission data for {month}.
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
                        {formatCurrency(r.data_commission)}
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
