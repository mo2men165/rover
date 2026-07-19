"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { flagChurn } from "@/lib/actions/flag-churn";
import {
  CHURN_TYPE_LABELS,
  DEPOSIT_STATUS_LABELS,
} from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type ChurnType = Database["public"]["Enums"]["churn_type"];
type DepositStatus = Database["public"]["Enums"]["deposit_status"];

export function FlagChurnDialog({
  clientId,
  onClose,
  onFlagged,
}: {
  clientId: string;
  onClose: () => void;
  onFlagged: () => void;
}) {
  const [churnType, setChurnType] = useState<ChurnType>("known");
  const [depositStatus, setDepositStatus] = useState<DepositStatus>("keep");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await flagChurn({
      clientId,
      churnType,
      reason,
      depositStatus,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onFlagged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flag-churn-title"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-md rounded-[var(--radius-lg)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="flag-churn-title"
            className="font-heading text-lg font-semibold not-italic text-ink"
          >
            Flag churn
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-muted hover:bg-white/[0.06]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="churn-type">Type</Label>
            <select
              id="churn-type"
              value={churnType}
              onChange={(e) => setChurnType(e.target.value as ChurnType)}
              className="h-9 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.04] px-2.5 text-sm text-ink"
            >
              {(Object.keys(CHURN_TYPE_LABELS) as ChurnType[]).map((t) => (
                <option key={t} value={t}>
                  {CHURN_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-status">Deposit status</Label>
            <select
              id="deposit-status"
              value={depositStatus}
              onChange={(e) => setDepositStatus(e.target.value as DepositStatus)}
              className="h-9 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.04] px-2.5 text-sm text-ink"
            >
              {(Object.keys(DEPOSIT_STATUS_LABELS) as DepositStatus[]).map((d) => (
                <option key={d} value={d}>
                  {DEPOSIT_STATUS_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="churn-reason">Reason</Label>
            <Textarea
              id="churn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder={
                churnType === "known"
                  ? "Why did this client churn?"
                  : "Why is unknown churn suspected?"
              }
            />
          </div>

          {error && <p className="text-xs text-accent-coral">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Flag client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
