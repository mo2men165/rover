"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClientHeader } from "@/lib/actions/update-client-header";
import { PACKAGE_TIER_LABELS } from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type Csr = { id: string; name: string };
type PackageTier = Database["public"]["Enums"]["package_tier"];

const TIER_STYLES: Record<PackageTier, string> = {
  growth:
    "border-[oklch(74%_0.16_152/0.35)] bg-[oklch(74%_0.16_152/0.14)] text-accent-emerald",
  pro: "border-[oklch(74%_0.15_224/0.35)] bg-[oklch(74%_0.15_224/0.14)] text-ledger",
  starter:
    "border-[oklch(78%_0.15_85/0.35)] bg-[oklch(78%_0.15_85/0.14)] text-accent-amber",
};

function TierBadge({ tier }: { tier: PackageTier }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${TIER_STYLES[tier]}`}
    >
      {PACKAGE_TIER_LABELS[tier]}
    </span>
  );
}

// Placeholder satisfaction signal -- there's no health-scoring data model
// yet (see the Health Index panel on the profile page, which is stubbed
// for the same reason). This mirrors that panel's stub band so the two
// don't visually contradict each other until real scoring lands.
const SATISFACTION_STUB = {
  label: "Highly Satisfied",
  dot: "bg-accent-emerald",
  text: "text-accent-emerald",
  border: "border-[oklch(74%_0.16_152/0.35)]",
  bg: "bg-[oklch(74%_0.16_152/0.14)]",
  glow: "shadow-[0_0_6px_0_oklch(74%_0.16_152/0.7)]",
} as const;

function SatisfactionBadge() {
  const s = SATISFACTION_STUB;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.border} ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.glow}`} />
      {s.label}
    </span>
  );
}

function formatSince(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function ClientHeader({
  clientId,
  companyName,
  name,
  email,
  phone,
  title,
  assignedCsrId,
  assignedCsrName,
  csrs,
  canEdit,
  canReassignCsr,
  campaignSummary,
  totalSeats,
  packageTier,
  createdAt,
}: {
  clientId: string;
  companyName: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  assignedCsrId: string | null;
  assignedCsrName: string | null;
  csrs: Csr[];
  canEdit: boolean;
  canReassignCsr: boolean;
  campaignSummary?: string;
  totalSeats?: number;
  packageTier?: PackageTier | null;
  createdAt?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name,
    email: email ?? "",
    phone: phone ?? "",
    title: title ?? "",
    assignedCsrId: assignedCsrId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateClientHeader({
      clientId,
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      title: form.title || undefined,
      assignedCsrId: canReassignCsr ? form.assignedCsrId : undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const since = createdAt ? formatSince(createdAt) : null;
  const metaParts = [
    campaignSummary,
    totalSeats !== undefined ? `${totalSeats} seat${totalSeats === 1 ? "" : "s"}` : undefined,
    `CSR: ${assignedCsrName ?? "—"}`,
    since ? `Client since ${since}` : undefined,
  ].filter(Boolean);

  if (editing) {
    return (
      <div className="flex flex-col gap-3 glass-panel glass-panel--blue rounded-[var(--radius-lg)] p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          Edit profile
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>
        {canReassignCsr && (
          <div className="flex flex-col gap-1.5">
            <Label>Assigned CSR</Label>
            <select
              value={form.assignedCsrId}
              onChange={(e) => setForm((f) => ({ ...f, assignedCsrId: e.target.value }))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {csrs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/clients"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ledger"
      >
        ← All Clients
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[26px] font-bold tracking-[-0.02em] leading-tight text-ink">{name}</h1>
            {packageTier && <TierBadge tier={packageTier} />}
            <SatisfactionBadge />
          </div>
          <p className="text-sm text-ink-muted">
            {companyName}
            {title ? ` · ${title}` : ""}
            {metaParts.length > 0 ? ` · ${metaParts.join(" · ")}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          {canEdit && (
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          )}
          {/* Quick Log has no backing action yet -- visual stub only,
              matching the mockup's button pair; wiring comes later. */}
          <Button type="button">+ Quick Log</Button>
        </div>
      </div>
    </div>
  );
}
