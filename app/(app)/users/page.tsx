import Link from "next/link";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button-variants";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/components/app-shell/role-context";
import type { Database } from "@/lib/supabase/database.types";

type UserStatus = Database["public"]["Enums"]["user_status"];

const STATUS_LABELS: Record<UserStatus, string> = { invited: "Invited", active: "Active" };

const STATUS_STYLES: Record<UserStatus, string> = {
  active: "bg-[oklch(74%_0.16_152/0.14)] text-accent-emerald",
  invited: "bg-[oklch(78%_0.15_85/0.14)] text-accent-amber",
};

const STATUS_DOT: Record<UserStatus, string> = {
  active: "bg-accent-emerald",
  invited: "bg-accent-amber",
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

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
    <div className="page-shell">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold tracking-[-0.02em] text-ink">User Management</h1>
          <p className="text-sm text-ink-muted">
            {rows.length} user{rows.length === 1 ? "" : "s"} across the org
          </p>
        </div>
        {isSysadmin && (
          <Link href="/users/new" className={buttonVariants({ variant: "default" })}>
            + Invite User
          </Link>
        )}
      </div>

      <div className="glass-panel rounded-[var(--radius-lg)]">
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
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-blue),var(--brand-blue-deep))] text-[10px] font-semibold text-white">
                        {initialsOf(u.name)}
                      </span>
                      <span className="font-medium text-ink">{u.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-ink-muted">{u.email}</TableCell>
                  <TableCell className="text-ink-muted">{u.phone ?? "—"}</TableCell>
                  <TableCell className="text-ink-muted">{ROLE_LABELS[u.role as Role] ?? u.role}</TableCell>
                  <TableCell className="tabular text-ink-muted">{u.start_date ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[u.status]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[u.status]}`} />
                      {STATUS_LABELS[u.status]}
                    </span>
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
