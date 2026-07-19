import type { ReactNode } from "react";
import {
  COMPLAINT_STATUS_LABELS,
  INTERACTION_TYPE_LABELS,
  UPSELL_STAGE_LABELS,
  UPSELL_TYPE_LABELS,
} from "@/lib/supabase/labels";
import { riskBand } from "@/lib/churn/score";
import type { ConsistencyLabel } from "@/lib/index-panel/consistency";
import type { IndexPanelData } from "@/lib/index-panel/load";
import { cn } from "@/lib/utils";

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CONSISTENCY_META: Record<
  ConsistencyLabel,
  { label: string; className: string; attention: boolean }
> = {
  on_track: {
    label: "On track",
    className:
      "border-[oklch(74%_0.16_152/0.35)] bg-[oklch(74%_0.16_152/0.12)] text-accent-emerald",
    attention: false,
  },
  at_risk: {
    label: "At risk",
    className:
      "border-[oklch(78%_0.15_85/0.35)] bg-[oklch(78%_0.15_85/0.12)] text-accent-amber",
    attention: false,
  },
  missed: {
    label: "Missed",
    className:
      "border-[oklch(64%_0.19_25/0.35)] bg-[oklch(64%_0.19_25/0.14)] text-accent-coral",
    attention: true,
  },
  no_checkin: {
    label: "No check-in",
    className: "border-white/10 bg-white/[0.04] text-ink-muted",
    attention: false,
  },
  unknown: {
    label: "Unavailable",
    className: "border-white/10 bg-white/[0.04] text-ink-muted",
    attention: false,
  },
};

const RISK_TEXT = {
  low: "text-accent-emerald",
  medium: "text-accent-amber",
  high: "text-accent-coral",
} as const;

function FieldRow({
  label,
  children,
  attention = false,
}: {
  label: string;
  children: ReactNode;
  attention?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-[var(--radius-md)] border px-3 py-2.5",
        attention
          ? "border-[oklch(64%_0.19_25/0.28)] bg-[oklch(64%_0.19_25/0.06)]"
          : "border-white/[0.06] bg-white/[0.02]"
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}

export function IndexPanel({ data }: { data: IndexPanelData }) {
  const consistency = CONSISTENCY_META[data.consistency.label];
  const complaintOpen = data.lastComplaint?.status === "open";
  const churnScore = data.potentialChurnRiskScore;
  const churnBand = churnScore === null ? null : riskBand(churnScore);
  const churnAttention = churnBand === "high";

  return (
    <div className="flex flex-col gap-3 glass-panel rounded-[var(--radius-lg)] p-5">
      <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
        Index
      </h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* 1. Last Meeting */}
        <FieldRow label="Last Meeting">
          {data.lastMeetingAt ? (
            <span className="tabular">{formatShortDate(data.lastMeetingAt)}</span>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </FieldRow>

        {/* 2. Last Check-In (Type) */}
        <FieldRow label="Last Check-In">
          {data.lastCheckIn ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular">{formatShortDate(data.lastCheckIn.occurredAt)}</span>
              <Badge className="border-white/10 bg-white/[0.05] text-ink-muted">
                {INTERACTION_TYPE_LABELS[data.lastCheckIn.type]}
              </Badge>
            </div>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </FieldRow>

        {/* 3. Last Issue or Complaint */}
        <FieldRow label="Last Issue or Complaint" attention={complaintOpen}>
          {data.lastComplaint ? (
            <div className="flex flex-col gap-0.5">
              <span>{data.lastComplaint.category}</span>
              <span className="text-xs tabular text-ink-muted">
                {formatShortDate(data.lastComplaint.openedAt)}
              </span>
            </div>
          ) : (
            <span className="text-ink-muted">None logged</span>
          )}
        </FieldRow>

        {/* 4. Fixed or Not */}
        <FieldRow label="Fixed or Not" attention={complaintOpen}>
          {data.lastComplaint ? (
            <Badge
              className={
                complaintOpen
                  ? "border-[oklch(64%_0.19_25/0.35)] bg-[oklch(64%_0.19_25/0.14)] text-accent-coral"
                  : "border-[oklch(74%_0.16_152/0.35)] bg-[oklch(74%_0.16_152/0.12)] text-accent-emerald"
              }
            >
              {COMPLAINT_STATUS_LABELS[data.lastComplaint.status]}
            </Badge>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </FieldRow>

        {/* 5. Consistency of Communication */}
        <FieldRow
          label="Consistency of Communication"
          attention={consistency.attention}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={consistency.className}>{consistency.label}</Badge>
            {data.consistency.daysSince != null && (
              <span className="text-xs tabular text-ink-muted">
                {data.consistency.daysSince}d since check-in
              </span>
            )}
          </div>
        </FieldRow>

        {/* 6. Potential Upsell */}
        <FieldRow label="Potential Upsell">
          {data.potentialUpsell ? (
            <div className="flex flex-col gap-1">
              <span>{UPSELL_TYPE_LABELS[data.potentialUpsell.upsellType]}</span>
              <Badge className="border-[oklch(74%_0.15_224/0.35)] bg-[oklch(74%_0.15_224/0.12)] text-ledger">
                {UPSELL_STAGE_LABELS[data.potentialUpsell.stage]}
              </Badge>
            </div>
          ) : (
            <span className="text-ink-muted">None active</span>
          )}
        </FieldRow>

        {/* 7. Potential Churn — references Part 3 score */}
        <FieldRow label="Potential Churn" attention={churnAttention}>
          {churnScore === null ? (
            <span className="text-ink-muted">Not scored</span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "font-heading text-lg font-semibold tabular",
                  RISK_TEXT[churnBand!]
                )}
              >
                {Math.round(churnScore)}
                <span className="text-xs font-normal text-ink-muted">/100</span>
              </span>
              {churnBand === "high" && (
                <Badge className="border-[oklch(64%_0.19_25/0.35)] bg-[oklch(64%_0.19_25/0.14)] text-accent-coral">
                  High risk
                </Badge>
              )}
              {churnBand === "medium" && (
                <Badge className="border-[oklch(78%_0.15_85/0.35)] bg-[oklch(78%_0.15_85/0.12)] text-accent-amber">
                  Elevated
                </Badge>
              )}
            </div>
          )}
        </FieldRow>

        {/* 8. Date of Last Upsell */}
        <FieldRow label="Date of Last Upsell">
          {data.lastUpsellAt ? (
            <span className="tabular">{formatShortDate(data.lastUpsellAt)}</span>
          ) : (
            <span className="text-ink-muted">None yet</span>
          )}
        </FieldRow>
      </div>
    </div>
  );
}
