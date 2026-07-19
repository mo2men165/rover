"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updatePinnedNotes } from "@/lib/actions/update-pinned-notes";

// Pinned notes are stored as one free-form string (see clients.pinned_notes).
// The mockup renders them as a list of chips, so each newline-separated
// line becomes its own chip here -- purely a display transform, the
// underlying value/action still round-trip the single string untouched.
const WATCH_OUT_PATTERN = /\b(watch out|risk|warning|caution)\b/i;

function splitNotes(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function PinnedNotesCard({
  clientId,
  pinnedNotes,
  canEdit,
}: {
  clientId: string;
  pinnedNotes: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(pinnedNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updatePinnedNotes({ clientId, pinnedNotes: value });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const notes = splitNotes(pinnedNotes ?? "");

  return (
    <div className="flex flex-col gap-2 glass-panel rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
          Pinned Notes
        </h2>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-ledger hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder="One note per line…"
          />
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
                setValue(pinnedNotes ?? "");
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
      ) : notes.length === 0 ? (
        <p className="text-sm text-ink-muted">No notes yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note, i) => {
            const isWatchOut = WATCH_OUT_PATTERN.test(note);
            return (
              <p
                key={i}
                className={`rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${
                  isWatchOut
                    ? "border-[oklch(78%_0.15_85/0.3)] bg-[oklch(78%_0.15_85/0.1)] text-ink"
                    : "border-white/10 bg-white/[0.03] text-ink"
                }`}
              >
                {note}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
