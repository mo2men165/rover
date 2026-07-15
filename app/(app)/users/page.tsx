import Link from "next/link";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/components/app-shell/role-context";

const STATUS_LABELS = { invited: "Invited", active: "Active" } as const;

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const isSysadmin = callerProfile?.role === "sysadmin";

  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, phone, role, start_date, status")
    .order("created_at", { ascending: true });

  const rows = users ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl text-ink">Users</h1>
          <p className="text-sm text-ink-muted">
            {rows.length} user{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        {isSysadmin && (
          <Link href="/users/new" className={buttonVariants({ variant: "default" })}>
            + Invite User
          </Link>
        )}
      </div>

      <div className="border border-border bg-surface-raised">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-sm text-ink-muted">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u, i) => (
                <TableRow
                  key={u.id}
                  className={i % 2 === 1 ? "bg-surface-sunken/50" : undefined}
                >
                  <TableCell className="font-medium text-ink">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone ?? "—"}</TableCell>
                  <TableCell>{ROLE_LABELS[u.role as Role]}</TableCell>
                  <TableCell className="tabular">{u.start_date ?? "—"}</TableCell>
                  <TableCell>{STATUS_LABELS[u.status]}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
