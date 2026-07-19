import {
  Mail,
  Phone,
  MessageSquare,
  MessageCircle,
  Hash,
  Video,
  StickyNote,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Channel = "call" | "email" | "sms" | "whatsapp" | "slack" | "meeting" | "note";
type Source = "Manual" | "Gmail" | "Fathom" | "HubSpot";

type InteractionEntry = {
  id: string;
  channel: Channel;
  client: string;
  summary: string;
  source: Source;
  time: string;
};

type DayGroup = {
  label: string;
  entries: InteractionEntry[];
};

/* ---------------------------------- channel styling ---------------------------------- */

const CHANNEL_META: Record<Channel, { icon: LucideIcon; label: string; className: string }> = {
  call: { icon: Phone, label: "Call", className: "text-ledger bg-[oklch(74%_0.15_224/0.16)]" },
  email: { icon: Mail, label: "Email", className: "text-accent-violet bg-[oklch(58%_0.14_270/0.16)]" },
  sms: { icon: MessageSquare, label: "SMS", className: "text-accent-amber bg-[oklch(78%_0.15_85/0.16)]" },
  whatsapp: {
    icon: MessageCircle,
    label: "WhatsApp",
    className: "text-accent-emerald bg-[oklch(74%_0.16_152/0.16)]",
  },
  slack: { icon: Hash, label: "Slack", className: "text-accent-coral bg-[oklch(64%_0.19_25/0.16)]" },
  meeting: {
    icon: Video,
    label: "Meeting",
    className: "text-[oklch(58%_0.15_260)] bg-[oklch(58%_0.15_260/0.16)]",
  },
  note: { icon: StickyNote, label: "Note", className: "text-ink-muted bg-white/[0.06]" },
};

/* ---------------------------------- stub data ---------------------------------- */

function formatGroupDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const GROUPS: DayGroup[] = [
  {
    label: `Today — ${formatGroupDate(0)}`,
    entries: [
      {
        id: "i1",
        channel: "call",
        client: "Meridian Roofing",
        summary: "Walked through Q3 renewal pricing; client wants a 60-day extension.",
        source: "Manual",
        time: "12m ago",
      },
      {
        id: "i2",
        channel: "email",
        client: "Coastal Realty Group",
        summary: "Sent updated buy box criteria for the Tampa market.",
        source: "Gmail",
        time: "48m ago",
      },
      {
        id: "i3",
        channel: "whatsapp",
        client: "BlueWave Solar",
        summary: "Confirmed install crew arrival window for Thursday.",
        source: "Manual",
        time: "1h ago",
      },
      {
        id: "i4",
        channel: "meeting",
        client: "Vantage Legal Group",
        summary: "Strategy call recap — expanding into two new counties.",
        source: "Fathom",
        time: "2h ago",
      },
      {
        id: "i5",
        channel: "slack",
        client: "Ironclad Restoration",
        summary: "Internal ping: lead volume dropped 15% week over week.",
        source: "HubSpot",
        time: "3h ago",
      },
      {
        id: "i6",
        channel: "sms",
        client: "Prairie Title Co.",
        summary: "Reminder sent about outstanding onboarding paperwork.",
        source: "Manual",
        time: "4h ago",
      },
    ],
  },
  {
    label: `Yesterday — ${formatGroupDate(1)}`,
    entries: [
      {
        id: "i7",
        channel: "call",
        client: "Summit Wealth Advisors",
        summary: "Left voicemail re: contract renewal terms.",
        source: "Manual",
        time: "4:45 PM",
      },
      {
        id: "i8",
        channel: "note",
        client: "Highland Property Management",
        summary: "Logged internal note: client prefers email over calls.",
        source: "Manual",
        time: "2:10 PM",
      },
      {
        id: "i9",
        channel: "email",
        client: "Apex HVAC Solutions",
        summary: "Answered billing question about last month's invoice.",
        source: "Gmail",
        time: "11:30 AM",
      },
      {
        id: "i10",
        channel: "whatsapp",
        client: "Redstone Contracting",
        summary: "Checked in after churn-risk flag from last week.",
        source: "Manual",
        time: "10:05 AM",
      },
      {
        id: "i11",
        channel: "call",
        client: "Cascade Home Services",
        summary: "Coordinated handoff after CSR reassignment.",
        source: "Manual",
        time: "9:20 AM",
      },
    ],
  },
  {
    label: formatGroupDate(3),
    entries: [
      {
        id: "i12",
        channel: "meeting",
        client: "Northgate Auto Group",
        summary: "Onboarding kickoff call for the new location.",
        source: "Fathom",
        time: "9:40 AM",
      },
      {
        id: "i13",
        channel: "slack",
        client: "Silverline Cleaning Co.",
        summary: "Escalated data quality complaint to the CSR lead.",
        source: "HubSpot",
        time: "8:15 AM",
      },
      {
        id: "i14",
        channel: "email",
        client: "Anchor Point Realty",
        summary: "Sent Fathom recap and next steps from the strategy call.",
        source: "Gmail",
        time: "7:50 AM",
      },
      {
        id: "i15",
        channel: "sms",
        client: "Sunbelt Insurance Partners",
        summary: "Clarified do-not-call list exclusions.",
        source: "Manual",
        time: "7:05 AM",
      },
    ],
  },
];

/* ---------------------------------- page ---------------------------------- */

export default function InteractionLogPage() {
  return (
    <div className="page-shell page-shell--interactions">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold not-italic text-ink">Interaction Log</h1>
          <p className="text-sm text-ink-muted">Every touchpoint, across every channel.</p>
        </div>
        <div className="w-full max-w-[240px]">
          <Input type="search" placeholder="Filter by client..." aria-label="Filter by client" />
        </div>
      </header>

      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h2 className="mb-3 text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
              {group.label}
            </h2>
            <ul className="glass-panel flex flex-col divide-y divide-white/[0.06] rounded-[var(--radius-lg)]">
              {group.entries.map((entry) => {
                const meta = CHANNEL_META[entry.channel];
                const Icon = meta.icon;
                return (
                  <li key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span
                      aria-hidden
                      title={meta.label}
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                        meta.className
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mr-1.5 font-medium text-ink">{entry.client}</span>
                      <span className="text-sm text-ink-muted">{entry.summary}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      {entry.source}
                    </span>
                    <span className="tabular shrink-0 text-xs text-ink-muted">{entry.time}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="fixed right-6 bottom-6 z-20">
        <Button type="button" pulse className="rounded-full px-5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.6)]">
          <Plus className="size-4" aria-hidden />
          Quick Log
        </Button>
      </div>
    </div>
  );
}
