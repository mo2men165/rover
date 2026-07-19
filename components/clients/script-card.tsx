"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClientScript } from "@/lib/actions/update-client-script";
import { CLIENT_SCRIPT_LABELS } from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type ClientScript = Database["public"]["Enums"]["client_script"];

export function ScriptCard({
  clientId,
  script,
  canEdit,
}: {
  clientId: string;
  script: ClientScript | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(next: ClientScript) {
    setSaving(true);
    setError(null);
    const result = await updateClientScript({ clientId, script: next });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setChanging(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 glass-panel rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
          Script
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={() => setChanging((c) => !c)}
            className="text-sm text-ledger hover:underline"
          >
            {changing ? "Cancel" : "Change"}
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed text-ink italic">
        {script ? CLIENT_SCRIPT_LABELS[script] : "Not set"}
      </p>
      {changing && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="grid grid-cols-2 gap-3">
            {(["four_pillars", "motivation_only"] as ClientScript[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handlePick(s)}
                disabled={saving}
                aria-pressed={script === s}
                className={`rounded-lg border p-3 text-left text-sm backdrop-blur-sm transition-all ${
                  script === s
                    ? "border-[oklch(74%_0.15_224/0.5)] bg-[oklch(74%_0.15_224/0.14)] text-ledger"
                    : "border-white/10 bg-white/[0.03] text-ink-muted hover:border-white/20 hover:bg-white/[0.06] hover:text-ink"
                }`}
              >
                {CLIENT_SCRIPT_LABELS[s]}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
