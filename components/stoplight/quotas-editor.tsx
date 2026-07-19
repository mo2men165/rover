"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateCsrQuota } from "@/lib/actions/update-csr-quota";
import type { QuotaRow } from "@/lib/stoplight/load";

export function QuotasEditor({
  quotas,
  quarter,
  editable,
}: {
  quotas: QuotaRow[];
  quarter: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(quotas.map((q) => [q.id, String(q.recordsTarget)]))
  );
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function save(quotaId: string) {
    const raw = drafts[quotaId];
    const recordsTarget = Number(raw);
    setError(null);
    setPendingId(quotaId);
    startTransition(async () => {
      const result = await updateCsrQuota({ quotaId, recordsTarget });
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (quotas.length === 0) {
    return (
      <p className="text-sm text-ink-muted">No quotas set for {quarter} yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-muted">
        Records targets for {quarter}. Gap to Goal compares QTD accepted/sold
        records against these — not dollars.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-ink-muted">
              <th className="py-2 pr-3 font-medium">CSR</th>
              <th className="py-2 pr-3 font-medium">Records target</th>
              {editable && <th className="py-2 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {quotas.map((q) => (
              <tr key={q.id} className="border-b border-white/[0.06] last:border-0">
                <td className="py-2 pr-3 font-medium text-ink">{q.csrName}</td>
                <td className="py-2 pr-3">
                  {editable ? (
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-32 tabular"
                      value={drafts[q.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                    />
                  ) : (
                    <span className="tabular text-ink">
                      {q.recordsTarget.toLocaleString()}
                    </span>
                  )}
                </td>
                {editable && (
                  <td className="py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={
                        pendingId === q.id ||
                        drafts[q.id] === String(q.recordsTarget)
                      }
                      onClick={() => save(q.id)}
                    >
                      {pendingId === q.id ? "Saving…" : "Save"}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-sm text-accent-coral">{error}</p>}
    </div>
  );
}
