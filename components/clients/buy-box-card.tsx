"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectPills } from "@/components/clients/multi-select-pills";
import { TagInput } from "@/components/clients/tag-input";
import { updateBuyBox } from "@/lib/actions/update-buy-box";
import { PROPERTY_TYPE_OPTIONS, US_STATE_OPTIONS, type BuyBox } from "@/lib/supabase/buy-box-options";

function ValuePills({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-ink"
        >
          {v}
        </span>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="w-28 shrink-0 text-ink-muted">{label}</dt>
      <dd className="flex-1 text-right text-ink">{children}</dd>
    </div>
  );
}

export function BuyBoxCard({
  clientId,
  buyBox,
  canEdit,
}: {
  clientId: string;
  buyBox: BuyBox;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BuyBox>(buyBox);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateOptions = US_STATE_OPTIONS.map((s) => ({ value: s.code, label: s.code }));
  const propertyTypeOptions = PROPERTY_TYPE_OPTIONS.map((p) => ({ value: p, label: p }));

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateBuyBox({ clientId, buyBox: form });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4 glass-panel glass-panel--blue rounded-[var(--radius-lg)] p-5">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
          Buy Box
        </h2>
        <div className="flex flex-col gap-2">
          <Label>Property types</Label>
          <MultiSelectPills
            options={propertyTypeOptions}
            selected={form.property_types}
            onChange={(v) => setForm((f) => ({ ...f, property_types: v }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>States</Label>
          <div className="max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-2 backdrop-blur-sm">
            <MultiSelectPills
              options={stateOptions}
              selected={form.states}
              onChange={(v) => setForm((f) => ({ ...f, states: v }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Area codes</Label>
            <TagInput
              values={form.area_codes}
              onChange={(v) => setForm((f) => ({ ...f, area_codes: v }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Zip codes</Label>
            <TagInput
              values={form.zip_codes}
              onChange={(v) => setForm((f) => ({ ...f, zip_codes: v }))}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Max ARV</Label>
          <Input
            type="number"
            min={0}
            value={form.max_arv ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_arv: e.target.value ? Number(e.target.value) : null }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Exclusions</Label>
          <Textarea
            value={form.exclusions ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, exclusions: e.target.value || null }))}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditing(false);
              setForm(buyBox);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  const hasData =
    buyBox.property_types.length > 0 ||
    buyBox.states.length > 0 ||
    buyBox.area_codes.length > 0 ||
    buyBox.zip_codes.length > 0 ||
    buyBox.max_arv !== null ||
    !!buyBox.exclusions;

  return (
    <div className="flex flex-col gap-1 glass-panel rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
          Buy Box
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-ledger hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {!hasData ? (
        <p className="py-2 text-sm text-ink-muted">No buy box set yet.</p>
      ) : (
        <dl className="flex flex-col divide-y divide-white/[0.06]">
          {buyBox.property_types.length > 0 && (
            <Row label="Property types">
              <ValuePills values={buyBox.property_types} />
            </Row>
          )}
          {buyBox.states.length > 0 && (
            <Row label="Markets">
              <ValuePills values={buyBox.states} />
            </Row>
          )}
          {buyBox.area_codes.length > 0 && (
            <Row label="Area codes">
              <ValuePills values={buyBox.area_codes} />
            </Row>
          )}
          {buyBox.zip_codes.length > 0 && (
            <Row label="Zip codes">
              <ValuePills values={buyBox.zip_codes} />
            </Row>
          )}
          {buyBox.max_arv !== null && (
            <Row label="Max ARV">
              <span className="tabular font-medium text-accent-emerald">
                ${buyBox.max_arv.toLocaleString()}
              </span>
            </Row>
          )}
          {buyBox.exclusions && (
            <Row label="Exclusions">
              <span className="text-left text-ink-muted">{buyBox.exclusions}</span>
            </Row>
          )}
        </dl>
      )}
    </div>
  );
}
