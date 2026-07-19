"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ComplaintStatus = "Open" | "Resolved";
type ComplaintCategory = "Billing" | "Data Quality" | "Onboarding" | "Communication";
type ComplaintValidity = "Valid" | "Under Review";

type Complaint = {
  id: string;
  client: string;
  status: ComplaintStatus;
  category: ComplaintCategory;
  validity: ComplaintValidity;
  agingDays: number;
  description: string;
  resolutionNotes: string;
  followUpTask: string | null;
};

/* ---------------------------------- stub data ---------------------------------- */

const COMPLAINTS: Complaint[] = [
  {
    id: "c1",
    client: "Meridian Roofing",
    status: "Open",
    category: "Billing",
    validity: "Valid",
    agingDays: 18,
    description:
      "Client was charged for a package overage twice in the same billing cycle after a data-pull correction. They've asked for written confirmation once the duplicate charge is reversed.",
    resolutionNotes: "",
    followUpTask: "Confirm refund posted by Friday and send written confirmation.",
  },
  {
    id: "c2",
    client: "Coastal Realty Group",
    status: "Open",
    category: "Data Quality",
    validity: "Under Review",
    agingDays: 6,
    description:
      "Client flagged that ~12% of the last lead list pull contained disconnected numbers. Data ops is re-checking the source tier before we confirm this is a validity issue.",
    resolutionNotes: "Sample of 40 records pulled for spot-check; results due back from data ops Wednesday.",
    followUpTask: "Escalate to data ops for a re-pull if spot-check confirms the issue.",
  },
  {
    id: "c3",
    client: "Apex HVAC Solutions",
    status: "Resolved",
    category: "Onboarding",
    validity: "Valid",
    agingDays: 9,
    description:
      "Onboarding call was rescheduled three times due to CSR availability, leaving the client frustrated about the delayed campaign launch.",
    resolutionNotes:
      "Rescheduled with a new CSR and completed onboarding within the week. Client confirmed satisfaction on the follow-up call.",
    followUpTask: null,
  },
  {
    id: "c4",
    client: "Ironclad Restoration",
    status: "Open",
    category: "Communication",
    validity: "Valid",
    agingDays: 21,
    description:
      "Client says their assigned CSR isn't responding to texts within the agreed SLA window, and two follow-up requests went unanswered for over 48 hours.",
    resolutionNotes: "",
    followUpTask: "TL to shadow CSR's next call and review SLA response times.",
  },
  {
    id: "c5",
    client: "Prairie Title Co.",
    status: "Open",
    category: "Communication",
    validity: "Under Review",
    agingDays: 3,
    description:
      "Client feels check-in cadence has been inconsistent over the last month, with gaps of over a week between updates.",
    resolutionNotes: "",
    followUpTask: null,
  },
];

/* ---------------------------------- pills ---------------------------------- */

const STATUS_PILL_CLASS: Record<ComplaintStatus, string> = {
  Open: "border-[oklch(78%_0.15_85/0.35)] bg-[oklch(78%_0.15_85/0.14)] text-accent-amber",
  Resolved: "border-[oklch(74%_0.16_152/0.35)] bg-[oklch(74%_0.16_152/0.14)] text-accent-emerald",
};

function StatusPill({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        STATUS_PILL_CLASS[status]
      )}
    >
      {status}
    </span>
  );
}

function CategoryPill({ category }: { category: ComplaintCategory }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-ink-muted">
      {category}
    </span>
  );
}

const VALIDITY_PILL_CLASS: Record<ComplaintValidity, string> = {
  Valid: "border-[oklch(64%_0.19_25/0.35)] bg-[oklch(64%_0.19_25/0.14)] text-accent-coral",
  "Under Review": "border-white/15 bg-white/[0.04] text-ink-muted",
};

function ValidityPill({ validity }: { validity: ComplaintValidity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        VALIDITY_PILL_CLASS[validity]
      )}
    >
      {validity}
    </span>
  );
}

function agingLabel(complaint: Complaint) {
  if (complaint.status === "Resolved") return "Closed";
  return `Open ${complaint.agingDays} day${complaint.agingDays === 1 ? "" : "s"}`;
}

function isChurnRisk(complaint: Complaint) {
  return complaint.status === "Open" && complaint.agingDays >= 14;
}

/* ---------------------------------- page ---------------------------------- */

export default function ComplaintTrackerPage() {
  const [selectedId, setSelectedId] = useState(COMPLAINTS[0].id);
  const selected = COMPLAINTS.find((c) => c.id === selectedId) ?? COMPLAINTS[0];

  const openCount = COMPLAINTS.filter((c) => c.status === "Open").length;
  const churnRiskCount = COMPLAINTS.filter(isChurnRisk).length;

  return (
    <div className="page-shell">
      <header>
        <h1 className="font-heading text-[26px] font-bold not-italic text-ink">Complaint Tracker</h1>
        <p className="text-sm text-ink-muted">
          {openCount} open · {churnRiskCount} at churn-risk (open 2+ weeks)
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <ul className="flex flex-col gap-3">
          {COMPLAINTS.map((complaint) => {
            const active = complaint.id === selectedId;
            const risk = isChurnRisk(complaint);
            return (
              <li key={complaint.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(complaint.id)}
                  className={cn(
                    "glass-panel w-full cursor-pointer rounded-[var(--radius-lg)] p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    active ? "glass-panel--blue" : "hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{complaint.client}</span>
                    <StatusPill status={complaint.status} />
                  </div>
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
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="glass-panel flex flex-col gap-5 rounded-[var(--radius-lg)] p-[26px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold not-italic text-ink">{selected.client}</h2>
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
              <span>Open 2+ weeks — flagged as a churn risk trigger.</span>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">Description</h3>
            <p className="mt-1.5 text-sm text-ink">{selected.description}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
              Resolution Notes
            </h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              {selected.resolutionNotes || "No resolution notes yet."}
            </p>
          </div>

          {selected.followUpTask && (
            <div>
              <h3 className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
                Linked Follow-up Task
              </h3>
              <div className="mt-1.5 flex items-center gap-2 rounded-[var(--radius-md)] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-ink">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ledger" />
                {selected.followUpTask}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
