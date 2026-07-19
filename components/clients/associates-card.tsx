"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAssociate } from "@/lib/actions/add-associate";
import { CONTACT_METHOD_LABELS } from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type ContactMethod = Database["public"]["Enums"]["contact_method"];

type Associate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  preferred_contact_method: ContactMethod | null;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Small inline SVGs instead of emoji glyphs, per icon-consistency guidance
// -- stroke-based, sized to match the surrounding 14px text.
function ContactMethodIcon({ method }: { method: ContactMethod }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (method === "email") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    );
  }
  if (method === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  role: "",
  preferredContactMethod: "" as ContactMethod | "",
};

export function AssociatesCard({
  companyId,
  associates,
  canEdit,
}: {
  companyId: string;
  associates: Associate[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    const result = await addAssociate({
      companyId,
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      role: form.role || undefined,
      preferredContactMethod: form.preferredContactMethod || undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setForm(EMPTY_FORM);
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 glass-panel rounded-[var(--radius-lg)] p-5">
      <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
        Associates
      </h2>
      {associates.length === 0 ? (
        <p className="text-sm text-ink-muted">No other contacts yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {associates.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-blue),var(--brand-blue-deep))] text-[10px] font-semibold text-white">
                  {initialsOf(a.name)}
                </span>
                <div className="flex flex-col">
                  <span className="text-ink">{a.name}</span>
                  {a.role && <span className="text-xs text-ink-muted">{a.role}</span>}
                </div>
              </div>
              {a.preferred_contact_method && (
                <span
                  title={CONTACT_METHOD_LABELS[a.preferred_contact_method]}
                  className="text-ink-muted"
                >
                  <ContactMethodIcon method={a.preferred_contact_method} />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit &&
        (adding ? (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Input
                  placeholder="Finance, Co-Investor…"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                />
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
            <div className="flex flex-col gap-1.5">
              <Label>Preferred contact method</Label>
              <select
                value={form.preferredContactMethod}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    preferredContactMethod: e.target.value as ContactMethod | "",
                  }))
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">—</option>
                {(["email", "phone", "text"] as ContactMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {CONTACT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setAdding(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAdd} disabled={saving}>
                {saving ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => setAdding(true)}>
            + Add associate
          </Button>
        ))}
    </div>
  );
}
