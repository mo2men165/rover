"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logInteraction } from "@/lib/actions/log-interaction";
import {
  searchClientsForLog,
  type ClientSearchHit,
} from "@/lib/actions/search-clients-for-log";
import {
  INTERACTION_DIRECTION_LABELS,
  INTERACTION_TYPE_LABELS,
} from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type InteractionType = Database["public"]["Enums"]["interaction_type"];
type InteractionDirection = Database["public"]["Enums"]["interaction_direction"];

const TYPES = Object.keys(INTERACTION_TYPE_LABELS) as InteractionType[];
const DIRECTIONS = Object.keys(
  INTERACTION_DIRECTION_LABELS
) as InteractionDirection[];

export function QuickLogFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [hits, setHits] = useState<ClientSearchHit[]>([]);
  const [selected, setSelected] = useState<ClientSearchHit | null>(null);
  const [type, setType] = useState<InteractionType>("call");
  const [direction, setDirection] = useState<InteractionDirection>("outbound");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searching, startSearch] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || selected) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const q = clientQuery.trim();
      if (q.length < 1) {
        setHits([]);
        return;
      }
      startSearch(async () => {
        const results = await searchClientsForLog(q);
        setHits(results);
      });
    }, 180);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [clientQuery, open, selected]);

  function resetForm() {
    setClientQuery("");
    setHits([]);
    setSelected(null);
    setType("call");
    setDirection("outbound");
    setSummary("");
    setError(null);
    setHint(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Pick a client.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setHint(null);

    const result = await logInteraction({
      clientId: selected.id,
      type,
      direction,
      summary,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (!result.hubspotSynced && result.hubspotSyncNote) {
      setHint(result.hubspotSyncNote);
    }

    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        pulse={!open}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full p-0 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        aria-label={open ? "Close quick log" : "Quick log interaction"}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            resetForm();
            setOpen(true);
          }
        }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquarePlus className="h-5 w-5" />}
      </Button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Quick log interaction"
          className="fixed bottom-24 right-4 z-40 flex max-h-[calc(100dvh-7.5rem)] w-[min(calc(100vw-2rem),22rem)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.12] bg-[oklch(16%_0.02_250/0.92)] p-0 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-md sm:right-6"
        >
          <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
            <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
              Quick log
            </h2>
            <span className="text-[11px] text-ink-faint">Under 15s</span>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ql-client">Client</Label>
              {selected ? (
                <div className="flex items-center justify-between gap-2 rounded-[11px] border border-white/[0.14] bg-black/20 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{selected.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {selected.companyName}
                      {selected.isPoc ? " · POC" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-ledger hover:underline"
                    onClick={() => {
                      setSelected(null);
                      setClientQuery("");
                      setHits([]);
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="ql-client"
                    autoFocus
                    placeholder="Search name or email…"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {(hits.length > 0 || searching) && (
                    <ul className="absolute top-full z-10 mt-1 max-h-36 w-full overflow-auto rounded-[11px] border border-white/[0.14] bg-[oklch(18%_0.02_250)] py-1 shadow-lg">
                      {searching && hits.length === 0 && (
                        <li className="px-3 py-2 text-xs text-ink-muted">Searching…</li>
                      )}
                      {hits.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                            onClick={() => {
                              setSelected(hit);
                              setHits([]);
                              setClientQuery("");
                            }}
                          >
                            <span className="text-ink">{hit.name}</span>
                            <span className="text-xs text-ink-muted">
                              {hit.companyName}
                              {hit.email ? ` · ${hit.email}` : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ql-type">Type</Label>
                <select
                  id="ql-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as InteractionType)}
                  className={cn(
                    "h-9 w-full rounded-[11px] border border-white/[0.14] bg-black/20 px-2.5 text-sm outline-none",
                    "focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)]"
                  )}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {INTERACTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ql-direction">Direction</Label>
                <select
                  id="ql-direction"
                  value={direction}
                  onChange={(e) =>
                    setDirection(e.target.value as InteractionDirection)
                  }
                  className={cn(
                    "h-9 w-full rounded-[11px] border border-white/[0.14] bg-black/20 px-2.5 text-sm outline-none",
                    "focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)]"
                  )}
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>
                      {INTERACTION_DIRECTION_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ql-summary">Summary</Label>
              <Textarea
                id="ql-summary"
                rows={2}
                placeholder="What happened?"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                className="min-h-[4.5rem] resize-none"
              />
            </div>

            {error && <p className="text-xs text-accent-coral">{error}</p>}
            {hint && <p className="text-xs text-accent-amber">{hint}</p>}

            <Button type="submit" disabled={submitting || !selected} className="mt-auto w-full shrink-0">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging…
                </>
              ) : (
                "Log interaction"
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
