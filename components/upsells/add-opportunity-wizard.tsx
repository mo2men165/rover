"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUpsellOpportunity } from "@/lib/actions/create-upsell-opportunity";
import {
  UPSELL_TYPE_LABELS,
  UPSELL_UNIT_AMOUNTS,
} from "@/lib/supabase/labels";
import type { ClientOption } from "@/components/upsells/upsell-pipeline";
import type { Database } from "@/lib/supabase/database.types";

type UpsellType = Database["public"]["Enums"]["upsell_type"];

function availableTypesFor(client: ClientOption | undefined): UpsellType[] {
  if (!client) return [];
  const types: UpsellType[] = ["add_texting_service", "dwy_lm", "dfy_lm"];
  if (client.hasColdCalling) types.unshift("add_cc_seat");
  if (client.hasTexting) types.push("texting_package_upgrade");
  return types;
}

export function AddOpportunityWizard({
  open,
  clients,
  onClose,
  onCreated,
}: {
  open: boolean;
  clients: ClientOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const titleId = useId();
  const [clientId, setClientId] = useState("");
  const [upsellType, setUpsellType] = useState<UpsellType | "">("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );
  const availableTypes = useMemo(
    () => availableTypesFor(selected),
    [selected]
  );

  useEffect(() => {
    if (!open) return;
    setClientId(clients[0]?.id ?? "");
    setQuantity("1");
    setNotes("");
    setError(null);
    setSubmitting(false);
  }, [open, clients]);

  useEffect(() => {
    if (!availableTypes.length) {
      setUpsellType("");
      return;
    }
    setUpsellType((prev) =>
      prev && availableTypes.includes(prev) ? prev : availableTypes[0]
    );
  }, [availableTypes]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    if (!clientId || !upsellType) {
      setError("Pick a client and upsell type.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createUpsellOpportunity({
      clientId,
      upsellType,
      quantity: Number(quantity) || 1,
      notes: notes || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[440px] rounded-[20px] border border-white/[0.14] bg-[rgba(20,22,30,0.92)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-[30px]"
      >
        <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
          New opportunity
        </p>
        <h2 id={titleId} className="mt-1 font-heading text-[17px] font-bold text-ink">
          Add upsell opportunity
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Starts in Opportunity — drag it through the pipeline as you progress.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-client">Client</Label>
            <select
              id="opp-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-auto w-full rounded-[11px] border border-white/[0.14] bg-black/30 px-3.5 py-[11px] text-sm text-ink outline-none focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)]"
              autoFocus
            >
              {clients.length === 0 && (
                <option value="">No assigned clients</option>
              )}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-type">Upsell type</Label>
            <select
              id="opp-type"
              value={upsellType}
              onChange={(e) => setUpsellType(e.target.value as UpsellType)}
              disabled={!availableTypes.length}
              className="h-auto w-full rounded-[11px] border border-white/[0.14] bg-black/30 px-3.5 py-[11px] text-sm text-ink outline-none focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)] disabled:opacity-50"
            >
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {UPSELL_TYPE_LABELS[type]} — ${UPSELL_UNIT_AMOUNTS[type]}
                  {type === "add_cc_seat" ? "/seat" : ""}
                </option>
              ))}
            </select>
          </div>

          {upsellType === "add_cc_seat" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opp-qty">Seats</Label>
              <Input
                id="opp-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-notes">Notes (optional)</Label>
            <Input
              id="opp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context for the pitch"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !clientId || !upsellType}
          >
            {submitting ? "Adding…" : "Add to pipeline"}
          </Button>
        </div>
      </div>
    </div>
  );
}
