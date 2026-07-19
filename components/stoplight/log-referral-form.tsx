"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logReferralPitch } from "@/lib/actions/log-referral";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function LogReferralForm({
  clients,
}: {
  clients: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [referringClientId, setReferringClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await logReferralPitch({
        referringClientId,
        notes: notes.trim() || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReferringClientId("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="referring-client">Referring client</Label>
        <select
          id="referring-client"
          required
          value={referringClientId}
          onChange={(e) => setReferringClientId(e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            Select client…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="referral-notes">Notes</Label>
        <Textarea
          id="referral-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Who they introduced, context…"
        />
      </div>
      {error && <p className="text-sm text-accent-coral">{error}</p>}
      <Button type="submit" disabled={pending || !referringClientId} className="self-start">
        {pending ? "Logging…" : "Log referral pitch"}
      </Button>
    </form>
  );
}
