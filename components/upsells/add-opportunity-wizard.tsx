"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type UpsellStage = "identified" | "pitched" | "pending" | "won" | "lost";

const STAGE_OPTIONS: { value: UpsellStage; label: string }[] = [
  { value: "identified", label: "Opportunity Identified" },
  { value: "pitched", label: "Pitched" },
  { value: "pending", label: "Pending" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

type Draft = {
  title: string;
  client: string;
  value: string;
  stage: UpsellStage;
  snoozedUntil: string;
};

const EMPTY: Draft = {
  title: "",
  client: "",
  value: "",
  stage: "identified",
  snoozedUntil: "",
};

export function AddOpportunityWizard({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    client: string;
    value: number;
    stage: UpsellStage;
    snoozedUntil?: string;
  }) => void;
}) {
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft(EMPTY);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(current: number) {
    if (current === 0) {
      if (!draft.title.trim()) return "Opportunity title is required.";
      if (!draft.client.trim()) return "Client name is required.";
    }
    if (current === 1) {
      const value = Number(draft.value);
      if (!draft.value.trim() || Number.isNaN(value) || value <= 0) {
        return "Enter a positive opportunity value.";
      }
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(2, s + 1));
  }

  function submit() {
    const err = validateStep(1);
    if (err) {
      setError(err);
      setStep(1);
      return;
    }
    onCreate({
      title: draft.title.trim(),
      client: draft.client.trim(),
      value: Number(draft.value),
      stage: draft.stage,
      snoozedUntil: draft.snoozedUntil.trim() || undefined,
    });
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[440px] rounded-[20px] border border-white/[0.14] bg-[rgba(20,22,30,0.92)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-[30px]"
      >
        <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
          Step {step + 1} of 3
        </p>
        <h2 id={titleId} className="mt-1 font-heading text-[17px] font-bold text-ink">
          Add upsell opportunity
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Track a pipeline opportunity — this stays on the board until you move it.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {step === 0 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="opp-title">Opportunity</Label>
                <Input
                  id="opp-title"
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g. Data Package Expansion"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="opp-client">Client</Label>
                <Input
                  id="opp-client"
                  value={draft.client}
                  onChange={(e) => update("client", e.target.value)}
                  placeholder="Company name"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="opp-value">Monthly value (USD)</Label>
                <Input
                  id="opp-value"
                  type="number"
                  min="1"
                  step="1"
                  value={draft.value}
                  onChange={(e) => update("value", e.target.value)}
                  placeholder="1800"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="opp-stage">Starting stage</Label>
                <select
                  id="opp-stage"
                  value={draft.stage}
                  onChange={(e) => update("stage", e.target.value as UpsellStage)}
                  className="h-auto w-full rounded-[11px] border border-white/[0.14] bg-black/30 px-3.5 py-[11px] text-sm text-ink outline-none focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)]"
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="opp-snooze">Snooze until (optional)</Label>
                <Input
                  id="opp-snooze"
                  value={draft.snoozedUntil}
                  onChange={(e) => update("snoozedUntil", e.target.value)}
                  placeholder="e.g. Aug 22"
                  autoFocus
                />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
                <dt className="text-ink-muted">Opportunity</dt>
                <dd className="font-medium text-ink">{draft.title.trim() || "—"}</dd>
                <dt className="text-ink-muted">Client</dt>
                <dd className="font-medium text-ink">{draft.client.trim() || "—"}</dd>
                <dt className="text-ink-muted">Value</dt>
                <dd className="font-medium text-ink tabular">
                  ${Number(draft.value || 0).toLocaleString("en-US")}
                </dd>
                <dt className="text-ink-muted">Stage</dt>
                <dd className="font-medium text-ink">
                  {STAGE_OPTIONS.find((s) => s.value === draft.stage)?.label}
                </dd>
              </dl>
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < 2 ? (
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={submit}>
              Add to pipeline
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
