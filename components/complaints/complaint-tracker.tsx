"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logComplaint } from "@/lib/actions/log-complaint";
import { resolveComplaint } from "@/lib/actions/resolve-complaint";
import {
  searchClientsForLog,
  type ClientSearchHit,
} from "@/lib/actions/search-clients-for-log";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_VALIDITY_LABELS,
} from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];
type ComplaintValidity = Database["public"]["Enums"]["complaint_validity"];

export type ComplaintListItem = {
  id: string;
  clientId: string;
  clientName: string;
  companyName: string;
  category: string;
  description: string;
  validity: ComplaintValidity;
  status: ComplaintStatus;
  resolutionNotes: string | null;
  openedAt: string;
  resolvedAt: string | null;
  loggedByName: string;
  followUpDescription: string | null;
  followUpDueDate: string | null;
  followUpCompleted: boolean;
};

const STATUS_PILL_CLASS: Record<ComplaintStatus, string> = {
  open: "border-[oklch(78%_0.15_85/0.35)] bg-[oklch(78%_0.15_85/0.14)] text-accent-amber",
  resolved:
    "border-[oklch(74%_0.16_152/0.35)] bg-[oklch(74%_0.16_152/0.14)] text-accent-emerald",
};

const VALIDITY_PILL_CLASS: Record<ComplaintValidity, string> = {
  valid:
    "border-[oklch(64%_0.19_25/0.35)] bg-[oklch(64%_0.19_25/0.14)] text-accent-coral",
  invalid: "border-white/15 bg-white/[0.04] text-ink-muted",
};

const CHURN_RISK_DAYS = 14;

function agingDays(openedAt: string, status: ComplaintStatus, resolvedAt: string | null) {
  const end =
    status === "resolved" && resolvedAt
      ? new Date(resolvedAt).getTime()
      : Date.now();
  return Math.max(0, Math.floor((end - new Date(openedAt).getTime()) / 86_400_000));
}

function isChurnRisk(item: ComplaintListItem) {
  return (
    item.status === "open" &&
    agingDays(item.openedAt, item.status, item.resolvedAt) >= CHURN_RISK_DAYS
  );
}

function agingLabel(item: ComplaintListItem) {
  if (item.status === "resolved") return "Closed";
  const days = agingDays(item.openedAt, item.status, item.resolvedAt);
  return `Open ${days} day${days === 1 ? "" : "s"}`;
}

function StatusPill({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        STATUS_PILL_CLASS[status]
      )}
    >
      {COMPLAINT_STATUS_LABELS[status]}
    </span>
  );
}

function CategoryPill({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-ink-muted">
      {category}
    </span>
  );
}

function ValidityPill({ validity }: { validity: ComplaintValidity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        VALIDITY_PILL_CLASS[validity]
      )}
    >
      {COMPLAINT_VALIDITY_LABELS[validity]}
    </span>
  );
}

export function ComplaintTracker({
  initialComplaints,
}: {
  initialComplaints: ComplaintListItem[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialComplaints[0]?.id ?? "");
  const [logOpen, setLogOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const selected =
    initialComplaints.find((c) => c.id === selectedId) ?? initialComplaints[0] ?? null;

  const openCount = initialComplaints.filter((c) => c.status === "open").length;
  const churnRiskCount = initialComplaints.filter(isChurnRisk).length;

  useEffect(() => {
    if (
      initialComplaints.length > 0 &&
      !initialComplaints.some((c) => c.id === selectedId)
    ) {
      setSelectedId(initialComplaints[0].id);
    }
  }, [initialComplaints, selectedId]);

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setResolving(true);
    setResolveError(null);
    const result = await resolveComplaint({
      complaintId: selected.id,
      resolutionNotes: resolveNotes,
    });
    setResolving(false);
    if (!result.success) {
      setResolveError(result.error);
      return;
    }
    setResolveNotes("");
    router.refresh();
  }

  return (
    <div className="page-shell">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold not-italic text-ink">
            Complaint Tracker
          </h1>
          <p className="text-sm text-ink-muted">
            {openCount} open · {churnRiskCount} at churn-risk (open 2+ weeks)
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setLogOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Log complaint
        </Button>
      </header>

      {initialComplaints.length === 0 ? (
        <div className="glass-panel rounded-[var(--radius-lg)] p-8 text-center">
          <p className="text-sm text-ink-muted">
            No complaints yet. Log the first one to start the tracker.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
          <ul className="flex flex-col gap-3">
            {initialComplaints.map((complaint) => {
              const active = complaint.id === selected?.id;
              const risk = isChurnRisk(complaint);
              return (
                <li key={complaint.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(complaint.id)}
                    className={cn(
                      "glass-panel w-full cursor-pointer rounded-[var(--radius-lg)] p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      active
                        ? risk
                          ? "border-[oklch(64%_0.19_25/0.32)] shadow-[inset_0_1px_0_0_var(--glass-border-strong),0_0_0_1px_oklch(64%_0.19_25/0.12)]"
                          : "glass-panel--blue"
                        : "hover:bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">
                        {complaint.companyName}
                      </span>
                      <StatusPill status={complaint.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">{complaint.clientName}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <CategoryPill category={complaint.category} />
                      <ValidityPill validity={complaint.validity} />
                    </div>
                    <p
                      className={cn(
                        "mt-3 text-xs font-medium",
                        risk ? "text-accent-coral" : "text-ink-muted"
                      )}
                    >
                      {agingLabel(complaint)}
                      {risk ? " · churn risk" : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <div className="glass-panel flex flex-col gap-5 rounded-[var(--radius-lg)] p-[26px]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold not-italic text-ink">
                    {selected.companyName}
                  </h2>
                  <p className="text-sm text-ink-muted">
                    {selected.clientName} · logged by {selected.loggedByName}
                  </p>
                </div>
                <StatusPill status={selected.status} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <CategoryPill category={selected.category} />
                <ValidityPill validity={selected.validity} />
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                    isChurnRisk(selected)
                      ? "border-[oklch(64%_0.19_25/0.35)] bg-[oklch(64%_0.19_25/0.14)] text-accent-coral"
                      : "border-white/15 bg-white/[0.04] text-ink-muted"
                  )}
                >
                  {agingLabel(selected)}
                </span>
              </div>

              {isChurnRisk(selected) && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[oklch(64%_0.19_25/0.35)] bg-[oklch(64%_0.19_25/0.12)] px-3 py-2 text-sm text-accent-coral"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    Open 2+ weeks — automatically counts as churn signal #4 (stale
                    open complaint).
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
                  Description
                </h3>
                <p className="mt-1.5 text-sm text-ink">{selected.description}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
                  Resolution Notes
                </h3>
                {selected.status === "resolved" ? (
                  <p className="mt-1.5 text-sm text-ink-muted">
                    {selected.resolutionNotes || "No resolution notes."}
                  </p>
                ) : (
                  <form onSubmit={handleResolve} className="mt-2 flex flex-col gap-2">
                    <Textarea
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                      placeholder="How was this resolved?"
                      rows={3}
                      required
                    />
                    {resolveError && (
                      <p className="text-xs text-accent-coral">{resolveError}</p>
                    )}
                    <Button type="submit" size="sm" disabled={resolving} className="self-start">
                      {resolving ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      Mark resolved
                    </Button>
                  </form>
                )}
              </div>

              {selected.followUpDescription && (
                <div>
                  <h3 className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
                    Linked Follow-up Task
                  </h3>
                  <div className="mt-1.5 flex flex-col gap-1 rounded-[var(--radius-md)] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-ink">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          selected.followUpCompleted
                            ? "bg-accent-emerald"
                            : "bg-ledger"
                        )}
                      />
                      {selected.followUpDescription}
                    </div>
                    {selected.followUpDueDate && (
                      <p className="pl-3.5 text-xs text-ink-muted">
                        Due {selected.followUpDueDate}
                        {selected.followUpCompleted ? " · completed" : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {logOpen && (
        <LogComplaintDialog
          onClose={() => setLogOpen(false)}
          onLogged={() => {
            setLogOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function LogComplaintDialog({
  onClose,
  onLogged,
}: {
  onClose: () => void;
  onLogged: () => void;
}) {
  const [clientQuery, setClientQuery] = useState("");
  const [hits, setHits] = useState<ClientSearchHit[]>([]);
  const [selected, setSelected] = useState<ClientSearchHit | null>(null);
  const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
  const [validity, setValidity] = useState<ComplaintValidity>("valid");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searching, startSearch] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (selected) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const q = clientQuery.trim();
      if (q.length < 1) {
        setHits([]);
        return;
      }
      startSearch(async () => {
        setHits(await searchClientsForLog(q));
      });
    }, 180);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [clientQuery, selected]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Pick a client.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await logComplaint({
      clientId: selected.id,
      category,
      description,
      validity,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onLogged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-complaint-title"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-lg rounded-[var(--radius-lg)] p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="log-complaint-title"
            className="font-heading text-lg font-semibold not-italic text-ink"
          >
            Log complaint
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-muted hover:bg-white/[0.06] hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="complaint-client">Client</Label>
            {selected ? (
              <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm">
                <span>
                  {selected.name}{" "}
                  <span className="text-ink-muted">· {selected.companyName}</span>
                </span>
                <button
                  type="button"
                  className="text-xs text-ledger hover:underline"
                  onClick={() => {
                    setSelected(null);
                    setClientQuery("");
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <Input
                  id="complaint-client"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  autoComplete="off"
                />
                {searching && (
                  <p className="text-xs text-ink-faint">Searching…</p>
                )}
                {hits.length > 0 && (
                  <ul className="max-h-40 overflow-auto rounded-[var(--radius-md)] border border-white/10 bg-[oklch(15%_0.014_262)]">
                    {hits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-white/[0.05]"
                          onClick={() => {
                            setSelected(hit);
                            setHits([]);
                          }}
                        >
                          <span className="text-ink">{hit.name}</span>
                          <span className="text-xs text-ink-muted">
                            {hit.companyName}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="complaint-category">Category</Label>
              <select
                id="complaint-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.04] px-2.5 text-sm text-ink"
              >
                {COMPLAINT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="complaint-validity">Validity</Label>
              <select
                id="complaint-validity"
                value={validity}
                onChange={(e) => setValidity(e.target.value as ComplaintValidity)}
                className="h-9 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.04] px-2.5 text-sm text-ink"
              >
                {(Object.keys(COMPLAINT_VALIDITY_LABELS) as ComplaintValidity[]).map(
                  (v) => (
                    <option key={v} value={v}>
                      {COMPLAINT_VALIDITY_LABELS[v]}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="complaint-description">Description</Label>
            <Textarea
              id="complaint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              placeholder="What happened?"
            />
          </div>

          {error && <p className="text-xs text-accent-coral">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Log complaint
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
