"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { confirmMonthlyPayment } from "@/lib/actions/confirm-monthly-payment";

type ChecklistClient = {
  id: string;
  name: string;
  company: { name: string } | null;
};

export function PaymentConfirmationChecklist({ clients }: { clients: ChecklistClient[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (clients.length === 0) return null;

  async function handleConfirm(id: string) {
    setPendingId(id);
    setError(null);
    const result = await confirmMonthlyPayment(id);
    setPendingId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="glass-panel glass-panel--amber rounded-[18px] p-5">
      <p className="text-sm font-medium text-ink">
        {clients.length} package client{clients.length === 1 ? "" : "s"} need this month&apos;s payment
        confirmed
      </p>
      <p className="mt-0.5 text-xs text-ink-muted">
        Unconfirmed clients don&apos;t generate package commission for this month — no backfill later.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {clients.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-4 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-2"
          >
            <span className="text-sm text-ink">{c.company?.name ?? c.name}</span>
            <Button
              type="button"
              size="sm"
              disabled={pendingId === c.id}
              onClick={() => handleConfirm(c.id)}
            >
              {pendingId === c.id ? "Saving…" : "Mark as paid"}
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
