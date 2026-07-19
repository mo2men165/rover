"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPaygRequest } from "@/lib/actions/create-payg-request";
import { markPaygPaid } from "@/lib/actions/mark-payg-paid";

type PaygRequestRow = {
  id: string;
  records_to_pull: number;
  records_to_skip_trace: number;
  pull_rate: number;
  skip_trace_rate: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
};

function formatPrice(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function NewPaygRequestForm({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const router = useRouter();
  const [recordsToPull, setRecordsToPull] = useState("");
  const [recordsToSkipTrace, setRecordsToSkipTrace] = useState("0");
  const [pullRate, setPullRate] = useState("0.04");
  const [skipTraceRate, setSkipTraceRate] = useState("0.07");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createPaygRequest({
      clientId,
      recordsToPull: Number(recordsToPull),
      recordsToSkipTrace: Number(recordsToSkipTrace),
      pullRate: Number(pullRate),
      skipTraceRate: Number(skipTraceRate),
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 glass-panel glass-panel--amber rounded-[var(--radius-lg)] p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="records-to-pull">Records to pull</Label>
          <Input
            id="records-to-pull"
            type="number"
            min={0}
            required
            value={recordsToPull}
            onChange={(e) => setRecordsToPull(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="records-to-skip-trace">Records to skip trace</Label>
          <Input
            id="records-to-skip-trace"
            type="number"
            min={0}
            required
            value={recordsToSkipTrace}
            onChange={(e) => setRecordsToSkipTrace(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pull-rate">Pull rate ($/record)</Label>
          <Input
            id="pull-rate"
            type="number"
            step="0.0001"
            min={0}
            required
            value={pullRate}
            onChange={(e) => setPullRate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payg-skip-trace-rate">Skip trace rate ($/record)</Label>
          <Input
            id="payg-skip-trace-rate"
            type="number"
            step="0.0001"
            min={0}
            required
            value={skipTraceRate}
            onChange={(e) => setSkipTraceRate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Create request"}
        </Button>
      </div>
    </form>
  );
}

export function PaygRequestsPanel({
  clientId,
  requests,
  canCreate,
}: {
  clientId: string | null;
  requests: PaygRequestRow[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid(id: string) {
    setPendingId(id);
    setError(null);
    const result = await markPaygPaid(id);
    setPendingId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          PAYG requests
        </h2>
        {canCreate && clientId && !formOpen && (
          <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
            + New PAYG Request
          </Button>
        )}
      </div>

      {formOpen && clientId && (
        <div className="mb-4">
          <NewPaygRequestForm clientId={clientId} onDone={() => setFormOpen(false)} />
        </div>
      )}

      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {requests.length === 0 ? (
        <p className="glass-panel glass-panel--amber border-dashed border-white/15 rounded-[var(--radius-lg)] p-4 text-sm text-ink-muted">
          No PAYG requests yet.
        </p>
      ) : (
        <div className="glass-panel glass-panel--amber rounded-[var(--radius-lg)]">
          <ul>
            {requests.map((r, i) => (
              <li
                key={r.id}
                className={`flex items-center justify-between gap-4 px-3 py-2 text-sm ${i % 2 === 1 ? "bg-surface-sunken/50" : ""}`}
              >
                <span className="text-ink">
                  {r.records_to_pull} pulled @ {formatPrice(r.pull_rate)}
                  {r.records_to_skip_trace > 0
                    ? ` · ${r.records_to_skip_trace} skip traced @ ${formatPrice(r.skip_trace_rate)}`
                    : ""}
                </span>
                {r.paid ? (
                  <span className="text-xs text-ink-muted">Paid</span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendingId === r.id}
                    onClick={() => handleMarkPaid(r.id)}
                  >
                    {pendingId === r.id ? "Saving…" : "Mark as paid"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
