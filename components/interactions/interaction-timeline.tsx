import Link from "next/link";
import {
  INTERACTION_DIRECTION_LABELS,
  INTERACTION_SOURCE_LABELS,
  INTERACTION_TYPE_LABELS,
} from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type InteractionType = Database["public"]["Enums"]["interaction_type"];
type InteractionDirection = Database["public"]["Enums"]["interaction_direction"];
type InteractionSource = Database["public"]["Enums"]["interaction_source"];

export type TimelineInteraction = {
  id: string;
  type: InteractionType;
  direction: InteractionDirection;
  source: InteractionSource;
  summary: string;
  occurred_at: string;
  hubspot_synced: boolean;
  hubspot_sync_note: string | null;
  logged_by_name: string;
};

const TYPE_ICON_STYLES: Record<InteractionType, string> = {
  email: "bg-[oklch(74%_0.15_224/0.16)] text-ledger",
  call: "bg-[oklch(74%_0.16_152/0.16)] text-accent-emerald",
  sms: "bg-[oklch(78%_0.15_85/0.16)] text-accent-amber",
  whatsapp: "bg-[oklch(74%_0.16_152/0.16)] text-accent-emerald",
  slack: "bg-[oklch(58%_0.14_270/0.16)] text-accent-violet",
  meeting: "bg-[oklch(70%_0.12_40/0.16)] text-accent-coral",
  note: "bg-[oklch(58%_0.14_270/0.16)] text-accent-violet",
};

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupByDay(rows: TimelineInteraction[]) {
  const groups: { key: string; label: string; items: TimelineInteraction[] }[] = [];
  for (const row of rows) {
    const key = dayKey(row.occurred_at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(row);
    } else {
      groups.push({ key, label: dayLabel(row.occurred_at), items: [row] });
    }
  }
  return groups;
}

export function InteractionTimeline({
  interactions,
  companyId,
}: {
  interactions: TimelineInteraction[];
  companyId: string;
}) {
  const groups = groupByDay(interactions);

  return (
    <div className="flex flex-col gap-3 glass-panel rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
          Interaction Timeline
        </h2>
        <Link
          href="/interactions"
          className="text-xs text-ledger hover:underline"
          title="Open interactions"
        >
          View all
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No interactions yet. Use the quick-log button to add one.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                {group.label}
              </p>
              {group.items.map((row) => (
                <div key={row.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${TYPE_ICON_STYLES[row.type]}`}
                    title={INTERACTION_TYPE_LABELS[row.type]}
                    aria-label={INTERACTION_TYPE_LABELS[row.type]}
                  >
                    {INTERACTION_TYPE_LABELS[row.type].slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink">{row.summary}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                      <span>{INTERACTION_DIRECTION_LABELS[row.direction]}</span>
                      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
                        {INTERACTION_SOURCE_LABELS[row.source]}
                      </span>
                      <span>{row.logged_by_name}</span>
                      {!row.hubspot_synced && row.hubspot_sync_note && (
                        <span className="text-accent-amber" title={row.hubspot_sync_note}>
                          HubSpot skipped
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-xs text-ink-muted">
                    {timeLabel(row.occurred_at)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <span className="sr-only">{companyId}</span>
    </div>
  );
}
