"use client";

import { useEffect, useRef, type ComponentType } from "react";
import {
  Phone,
  Mail,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/components/app-shell/role-context";
import { countUp, staggerIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

type DashboardView = "csr" | "tl";
type Tone = "blue" | "emerald" | "amber" | "coral";
type DeltaDirection = "up" | "down" | "flat";

/* ---------------------------------- stub data ---------------------------------- */

const CSR_GREETING_NAME = "Scott";

const TODAY_LABEL = "Friday, July 17";

type Task = {
  id: string;
  type: "call" | "email" | "followup" | "renewal";
  title: string;
  client: string;
  time: string;
};

const TASKS: Task[] = [
  { id: "t1", type: "call", title: "Discuss churn risk", client: "Meridian Capital Group", time: "10:30 AM" },
  { id: "t2", type: "followup", title: "Upsell follow-up", client: "Golden Gate Acquisitions", time: "11:15 AM" },
  { id: "t3", type: "email", title: "Payment confirmation reminder", client: "Ironclad Holdings", time: "1:00 PM" },
  { id: "t4", type: "renewal", title: "Renewal check-in", client: "Coastal Property Group", time: "3:30 PM" },
];

const TASK_ICON: Record<Task["type"], ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  call: Phone,
  email: Mail,
  followup: MessageSquare,
  renewal: RefreshCw,
};

const TASK_CHIP_CLASS: Record<Task["type"], string> = {
  call: "text-ledger bg-[oklch(74%_0.15_224/0.14)]",
  email: "text-accent-violet bg-[oklch(58%_0.14_270/0.14)]",
  followup: "text-accent-amber bg-[oklch(78%_0.15_85/0.14)]",
  renewal: "text-accent-emerald bg-[oklch(74%_0.16_152/0.14)]",
};

type Interaction = {
  id: string;
  client: string;
  summary: string;
  source: "Manual" | "Gmail" | "Fathom" | "SMS";
  time: string;
};

const INTERACTIONS: Interaction[] = [
  {
    id: "i1",
    client: "Meridian Capital Group",
    summary: "Discussed Q3 renewal terms — client satisfied with current pricing.",
    source: "Fathom",
    time: "2h ago",
  },
  {
    id: "i2",
    client: "Golden Gate Acquisitions",
    summary: "Sent updated buy box criteria and comps for the Phoenix market.",
    source: "Gmail",
    time: "4h ago",
  },
  {
    id: "i3",
    client: "Coastal Property Group",
    summary: "Logged a request for a fresh data pull covering the Dallas metro.",
    source: "Manual",
    time: "Yesterday",
  },
  {
    id: "i4",
    client: "Ironclad Holdings",
    summary: "Quick check-in call — no open issues raised.",
    source: "Manual",
    time: "Yesterday",
  },
  {
    id: "i5",
    client: "Summit Ridge Partners",
    summary: "Client texted concern about lead quality — escalated internally.",
    source: "SMS",
    time: "2 days ago",
  },
];

const SOURCE_TAG_CLASS: Record<Interaction["source"], string> = {
  Manual: "border-white/15 text-ink-muted",
  Gmail: "border-[oklch(64%_0.19_25/0.35)] text-accent-coral",
  Fathom: "border-[oklch(58%_0.14_270/0.35)] text-accent-violet",
  SMS: "border-[oklch(74%_0.15_224/0.35)] text-ledger",
};

type CsrStoplight = { name: string; green: number; amber: number; red: number };

const TEAM_STOPLIGHT: CsrStoplight[] = [
  { name: "Scott Cooper", green: 22, amber: 9, red: 3 },
  { name: "Kevin Williams", green: 28, amber: 11, red: 2 },
  { name: "Priya Nair", green: 19, amber: 7, red: 5 },
  { name: "Marcus Webb", green: 25, amber: 8, red: 4 },
  { name: "Danielle Ortiz", green: 21, amber: 10, red: 3 },
];

type CsrCommission = { name: string; pkg: number; payg: number; total: number };

const CSR_COMMISSIONS: CsrCommission[] = [
  { name: "Scott Cooper", pkg: 6200, payg: 2220, total: 8420 },
  { name: "Kevin Williams", pkg: 7450, payg: 2890, total: 10340 },
  { name: "Priya Nair", pkg: 5100, payg: 1675, total: 6775 },
  { name: "Marcus Webb", pkg: 6800, payg: 2110, total: 8910 },
  { name: "Danielle Ortiz", pkg: 5940, payg: 1830, total: 7770 },
];

const TEAM_COMMISSION_TOTAL = CSR_COMMISSIONS.reduce((sum, r) => sum + r.total, 0);
const TEAM_MONTH_LABEL = "July";

type CsrCalls = { name: string; calls: number };

const CSR_CALLS: CsrCalls[] = [
  { name: "Kevin Williams", calls: 142 },
  { name: "Marcus Webb", calls: 128 },
  { name: "Danielle Ortiz", calls: 119 },
  { name: "Scott Cooper", calls: 104 },
  { name: "Priya Nair", calls: 96 },
];
const MAX_CALLS = Math.max(...CSR_CALLS.map((c) => c.calls));

const CSR_NAMES = ["Scott Cooper", "Kevin Williams", "Priya Nair", "Marcus Webb", "Danielle Ortiz"];
const COMPLAINT_CATEGORIES = ["Billing", "Data Quality", "Onboarding", "Communication"] as const;
const COMPLAINT_HEATMAP: Record<(typeof COMPLAINT_CATEGORIES)[number], number[]> = {
  Billing: [2, 1, 3, 0, 1],
  "Data Quality": [1, 2, 0, 4, 1],
  Onboarding: [0, 1, 2, 1, 3],
  Communication: [3, 0, 1, 2, 0],
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/* ---------------------------------- small building blocks ---------------------------------- */

const TONE_PANEL_CLASS: Record<Tone, string> = {
  blue: "glass-panel--blue",
  emerald: "glass-panel--emerald",
  amber: "glass-panel--amber",
  coral: "border-[oklch(64%_0.19_25/0.32)] shadow-[inset_0_1px_0_0_var(--glass-border-strong),0_0_0_1px_oklch(64%_0.19_25/0.12),0_16px_40px_-16px_oklch(64%_0.19_25/0.25),0_12px_32px_-12px_rgba(0,0,0,0.55)]",
};

const TONE_TEXT_CLASS: Record<Tone, string> = {
  blue: "text-ledger",
  emerald: "text-accent-emerald",
  amber: "text-accent-amber",
  coral: "text-accent-coral",
};

const DELTA_ICON: Record<DeltaDirection, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: AlertTriangle,
};

const DELTA_TEXT_CLASS: Record<DeltaDirection, string> = {
  up: "text-accent-emerald",
  down: "text-accent-coral",
  flat: "text-accent-amber",
};

function StatCard({
  label,
  value,
  prefix,
  suffix,
  decimals,
  tone,
  delta,
  deltaDirection,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  tone: Tone;
  delta: string;
  deltaDirection: DeltaDirection;
}) {
  const valueRef = useRef<HTMLParagraphElement>(null);
  const DeltaIcon = DELTA_ICON[deltaDirection];

  useEffect(() => {
    if (!valueRef.current) return;
    return countUp(valueRef.current, value, { prefix, suffix, decimals });
  }, [value, prefix, suffix, decimals]);

  return (
    <div
      data-stat
      className={cn("glass-panel flex flex-col gap-1.5 rounded-[var(--radius-lg)] p-5", TONE_PANEL_CLASS[tone])}
    >
      <p className="text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">{label}</p>
      <p ref={valueRef} className="font-heading text-2xl font-bold not-italic text-ink tabular-nums">
        {prefix}
        {value.toLocaleString("en-US", {
          minimumFractionDigits: decimals ?? 0,
          maximumFractionDigits: decimals ?? 0,
        })}
        {suffix}
      </p>
      <p className={cn("flex items-center gap-1 text-xs font-medium", DELTA_TEXT_CLASS[deltaDirection])}>
        <DeltaIcon className="size-3.5 shrink-0" aria-hidden />
        <span>{delta}</span>
      </p>
    </div>
  );
}

function StoplightDonut({ satisfied, medium, risk }: { satisfied: number; medium: number; risk: number }) {
  const total = satisfied + medium + risk;
  const satisfiedPct = total === 0 ? 0 : (satisfied / total) * 100;
  const mediumPct = total === 0 ? 0 : (medium / total) * 100;
  const gradient = `conic-gradient(var(--accent-emerald) 0% ${satisfiedPct}%, var(--accent-amber) ${satisfiedPct}% ${satisfiedPct + mediumPct}%, var(--accent-coral) ${satisfiedPct + mediumPct}% 100%)`;

  return (
    <div
      role="img"
      aria-label={`${satisfied} highly satisfied, ${medium} medium satisfaction, ${risk} risk of churn, out of ${total} total clients`}
      className="mx-auto flex size-40 items-center justify-center rounded-full"
      style={{ background: gradient }}
    >
      <div className="flex size-28 flex-col items-center justify-center rounded-full bg-surface text-center">
        <span className="font-heading text-2xl font-bold not-italic text-ink tabular-nums">{total}</span>
        <span className="text-[11px] text-ink-muted">clients</span>
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function DashboardPage() {
  const { role } = useRole();
  // Mockup toggles were illustrative only — CSR sees the personal view;
  // TL/HOD (and elevated roles) see the team overview.
  const view: DashboardView = role === "csr" ? "csr" : "tl";
  const statGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statGridRef.current) return;
    staggerIn(statGridRef.current.querySelectorAll("[data-stat]"));
  }, [view]);

  const satisfied = TEAM_STOPLIGHT[0].green;
  const medium = TEAM_STOPLIGHT[0].amber;
  const risk = TEAM_STOPLIGHT[0].red;

  return (
    <div className="page-shell gap-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-ink-muted">{TODAY_LABEL}</p>
          <h1 className="font-heading text-[28px] font-bold not-italic text-ink">
            {view === "csr" ? `Welcome back, ${CSR_GREETING_NAME}` : "Team Overview"}
          </h1>
        </div>
        <Button type="button" pulse>
          <Plus className="size-4" aria-hidden />
          Quick Log
        </Button>
      </header>

      {view === "csr" ? (
        <>
          <div ref={statGridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Assigned Clients"
              value={34}
              tone="blue"
              delta="+3 this month"
              deltaDirection="up"
            />
            <StatCard
              label="This Month's Commission"
              value={8420}
              prefix="$"
              tone="emerald"
              delta="+12% vs last month"
              deltaDirection="up"
            />
            <StatCard
              label="Pending Payment Confirmations"
              value={5}
              tone="amber"
              delta="3 due this week"
              deltaDirection="flat"
            />
            <StatCard
              label="Tasks Due Today"
              value={7}
              tone="coral"
              delta="2 overdue"
              deltaDirection="down"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-base font-semibold not-italic text-ink">
                  Today&apos;s Tasks &amp; Reminders
                </h2>
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-ink-muted">
                  {TASKS.length} remaining today
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {TASKS.map((task) => {
                  const Icon = TASK_ICON[task.type];
                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-[10px]",
                          TASK_CHIP_CLASS[task.type]
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{task.title}</span>
                        <span className="block truncate text-xs text-ink-muted">{task.client}</span>
                      </span>
                      <span className="tabular shrink-0 text-xs text-ink-muted">{task.time}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-6">
              <h2 className="font-heading text-base font-semibold not-italic text-ink">My Stoplight Summary</h2>
              <StoplightDonut satisfied={satisfied} medium={medium} risk={risk} />
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span aria-hidden className="size-2.5 rounded-full bg-accent-emerald" />
                    Highly Satisfied
                  </span>
                  <span className="tabular font-medium text-ink">{satisfied}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span aria-hidden className="size-2.5 rounded-full bg-accent-amber" />
                    Medium Satisfaction
                  </span>
                  <span className="tabular font-medium text-ink">{medium}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span aria-hidden className="size-2.5 rounded-full bg-accent-coral" />
                    Risk of Churn
                  </span>
                  <span className="tabular font-medium text-ink">{risk}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-6">
            <h2 className="font-heading text-base font-semibold not-italic text-ink">Recent Interactions</h2>
            <ul className="flex flex-col gap-2">
              {INTERACTIONS.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <span
                    aria-hidden
                    className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[oklch(74%_0.15_224/0.14)] text-ledger"
                  >
                    <MessageSquare className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.client}</span>
                    <span className="block truncate text-xs text-ink-muted">{item.summary}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      SOURCE_TAG_CLASS[item.source]
                    )}
                  >
                    {item.source}
                  </span>
                  <span className="tabular shrink-0 text-xs text-ink-muted">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <div ref={statGridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Team Assigned Clients"
              value={177}
              tone="blue"
              delta="+14 this month"
              deltaDirection="up"
            />
            <StatCard
              label="Team Commission Payout"
              value={TEAM_COMMISSION_TOTAL}
              prefix="$"
              tone="emerald"
              delta="+8% vs last month"
              deltaDirection="up"
            />
            <StatCard
              label="Open Complaints"
              value={28}
              tone="coral"
              delta="9 flagged high priority"
              deltaDirection="down"
            />
            <StatCard
              label="Gap to Goal"
              value={8}
              suffix="%"
              tone="amber"
              delta="8% below monthly goal"
              deltaDirection="flat"
            />
          </div>

          <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-6">
            <h2 className="font-heading text-base font-semibold not-italic text-ink">Team Stoplight Report</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] caption-bottom text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-ink-muted uppercase">
                    <th className="py-2 pr-2 font-medium">CSR</th>
                    <th className="py-2 pr-2 text-right font-medium text-accent-emerald">Green</th>
                    <th className="py-2 pr-2 text-right font-medium text-accent-amber">Amber</th>
                    <th className="py-2 pr-2 text-right font-medium text-accent-coral">Red</th>
                  </tr>
                </thead>
                <tbody>
                  {TEAM_STOPLIGHT.map((row) => (
                    <tr key={row.name} className="border-b border-white/[0.06] last:border-0">
                      <td className="py-2 pr-2 font-medium text-ink">{row.name}</td>
                      <td className="tabular py-2 pr-2 text-right text-accent-emerald">{row.green}</td>
                      <td className="tabular py-2 pr-2 text-right text-accent-amber">{row.amber}</td>
                      <td className="tabular py-2 pr-2 text-right text-accent-coral">{row.red}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-6">
              <h2 className="font-heading text-base font-semibold not-italic text-ink">
                All-CSR Commission — {TEAM_MONTH_LABEL}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] caption-bottom text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-ink-muted uppercase">
                      <th className="py-2 pr-2 font-medium">CSR</th>
                      <th className="py-2 pr-2 text-right font-medium">Package</th>
                      <th className="py-2 pr-2 text-right font-medium">PAYG</th>
                      <th className="py-2 pr-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CSR_COMMISSIONS.map((row) => (
                      <tr key={row.name} className="border-b border-white/[0.06] last:border-0">
                        <td className="py-2 pr-2 font-medium text-ink">{row.name}</td>
                        <td className="tabular py-2 pr-2 text-right text-ink-muted">{formatCurrency(row.pkg)}</td>
                        <td className="tabular py-2 pr-2 text-right text-ink-muted">{formatCurrency(row.payg)}</td>
                        <td className="tabular py-2 pr-2 text-right font-semibold text-ledger">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-6">
              <h2 className="font-heading text-base font-semibold not-italic text-ink">
                Team Performance — Client Calls Made
              </h2>
              <ul className="flex flex-col gap-3">
                {CSR_CALLS.map((row) => (
                  <li key={row.name} className="flex flex-col gap-1">
                    <span className="flex items-center justify-between text-sm">
                      <span className="text-ink">{row.name}</span>
                      <span className="tabular font-medium text-ink">{row.calls}</span>
                    </span>
                    <span className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className="block h-full rounded-full bg-[linear-gradient(90deg,var(--brand-blue-deep),var(--brand-blue))]"
                        style={{ width: `${(row.calls / MAX_CALLS) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-6">
            <h2 className="font-heading text-base font-semibold not-italic text-ink">Complaint Heatmap</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="p-1 text-left text-xs font-medium text-ink-muted uppercase">Category</th>
                    {CSR_NAMES.map((name) => (
                      <th key={name} className="p-1 text-center text-xs font-medium text-ink-muted">
                        {name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPLAINT_CATEGORIES.map((category) => (
                    <tr key={category}>
                      <td className="p-1 text-xs font-medium whitespace-nowrap text-ink">{category}</td>
                      {COMPLAINT_HEATMAP[category].map((count, idx) => (
                        <td key={`${category}-${CSR_NAMES[idx]}`} className="p-1 text-center">
                          <span
                            title={`${CSR_NAMES[idx]} — ${category}: ${count}`}
                            className="tabular flex size-9 items-center justify-center rounded-[8px] text-xs font-semibold text-ink"
                            style={{ backgroundColor: `oklch(64% 0.19 25 / ${0.1 + (count / 4) * 0.6})` }}
                          >
                            {count}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
