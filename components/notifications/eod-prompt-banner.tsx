"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { dismissNotification } from "@/lib/actions/dismiss-notification";

export type EodNotification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

// Mounted from app/(app)/layout.tsx. Reads unread eod_no_interaction rows.
export function EodPromptBanner({ initial }: { initial: EodNotification[] }) {
  const [items, setItems] = useState(initial);

  if (items.length === 0) return null;

  async function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await dismissNotification(id);
  }

  return (
    <div className="sticky top-0 z-30 flex flex-col gap-2 border-b border-white/[0.08] bg-black/40 px-4 py-3 backdrop-blur-md">
      {items.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-3 rounded-[var(--radius-md)] border border-accent-amber/30 bg-accent-amber/10 px-3 py-2.5"
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm text-ink">{n.title}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-muted">{n.body}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-white/[0.06] hover:text-ink"
            aria-label="Dismiss"
            onClick={() => dismiss(n.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
