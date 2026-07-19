"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AddOpportunityWizard,
  type UpsellStage,
} from "@/components/upsells/add-opportunity-wizard";
import { cn } from "@/lib/utils";

type Accent = "neutral" | "blue" | "amber" | "emerald" | "coral";

type UpsellCard = {
  id: string;
  title: string;
  client: string;
  value: number;
  stage: UpsellStage;
  snoozedUntil?: string;
};

const INITIAL_CARDS: UpsellCard[] = [
  { id: "u1", title: "Data Package Expansion", client: "Acme Logistics", value: 2400, stage: "identified" },
  { id: "u2", title: "Cold Calling Add-on", client: "Bright Path Realty", value: 1800, stage: "identified" },
  { id: "u9", title: "DFY List Management", client: "Silverline Properties", value: 2000, stage: "identified" },
  { id: "u10", title: "Skip Trace Bundle", client: "Sunbelt Home Buyers", value: 1100, stage: "identified" },
  { id: "u3", title: "Platinum Tier Upgrade", client: "Sterling Contractors", value: 4200, stage: "pitched" },
  {
    id: "u4",
    title: "Texting Campaign Add-on",
    client: "Meridian Health Group",
    value: 1200,
    stage: "pitched",
    snoozedUntil: "Aug 3",
  },
  { id: "u11", title: "Add CC Seat ×2", client: "Golden Gate Acquisitions", value: 200, stage: "pitched" },
  { id: "u12", title: "DWY List Management", client: "Coastal Property Group", value: 1500, stage: "pitched" },
  { id: "u5", title: "Skip Trace Package", client: "Horizon Freight", value: 950, stage: "pending" },
  {
    id: "u6",
    title: "Second Seat License",
    client: "Blue Ridge Realty",
    value: 3000,
    stage: "pending",
    snoozedUntil: "Jul 28",
  },
  {
    id: "u13",
    title: "Texting Package Upgrade",
    client: "Apex Realty Solutions",
    value: 75,
    stage: "pending",
    snoozedUntil: "Aug 10",
  },
  { id: "u14", title: "PAYG Expansion Pull", client: "Bluebird Investments", value: 1800, stage: "pending" },
  { id: "u7", title: "Enterprise Data Bundle", client: "Vertex Solutions", value: 5600, stage: "won" },
  { id: "u15", title: "Add Texting Service", client: "Redwood Capital Partners", value: 150, stage: "won" },
  { id: "u16", title: "DFY LM Retainer", client: "Harborfront Acquisitions", value: 2400, stage: "won" },
  { id: "u8", title: "PAYG to Package Conversion", client: "Cascade Builders", value: 1500, stage: "lost" },
  { id: "u17", title: "Cold Calling Seat Add", client: "Prairie Wind Capital", value: 100, stage: "lost" },
  { id: "u18", title: "Multi-Market Data Pack", client: "Ironwood Property Partners", value: 3200, stage: "lost" },
];

const STAGE_ORDER: UpsellStage[] = ["identified", "pitched", "pending", "won", "lost"];

const STAGE_META: Record<UpsellStage, { title: string; accent: Accent }> = {
  identified: { title: "Opportunity Identified", accent: "neutral" },
  pitched: { title: "Pitched", accent: "blue" },
  pending: { title: "Pending", accent: "amber" },
  won: { title: "Won", accent: "emerald" },
  lost: { title: "Lost", accent: "coral" },
};

const ACCENT_CLASS: Record<Accent, { text: string; pill: string; bar: string; edge: string }> = {
  neutral: {
    text: "text-ink-muted",
    pill: "bg-white/[0.08] text-ink-muted",
    bar: "bg-white/25",
    edge: "border-l-white/30",
  },
  blue: {
    text: "text-ledger",
    pill: "bg-[oklch(74%_0.15_224/0.16)] text-ledger",
    bar: "bg-brand-blue",
    edge: "border-l-brand-blue",
  },
  amber: {
    text: "text-accent-amber",
    pill: "bg-[oklch(78%_0.15_85/0.16)] text-accent-amber",
    bar: "bg-accent-amber",
    edge: "border-l-accent-amber",
  },
  emerald: {
    text: "text-accent-emerald",
    pill: "bg-[oklch(74%_0.16_152/0.16)] text-accent-emerald",
    bar: "bg-accent-emerald",
    edge: "border-l-accent-emerald",
  },
  coral: {
    text: "text-accent-coral",
    pill: "bg-[oklch(64%_0.19_25/0.16)] text-accent-coral",
    bar: "bg-accent-coral",
    edge: "border-l-accent-coral",
  },
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function UpsellsPage() {
  const [cards, setCards] = useState<UpsellCard[]>(INITIAL_CARDS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<UpsellStage | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const totalValue = useMemo(
    () => cards.reduce((sum, card) => sum + card.value, 0),
    [cards]
  );

  function moveCard(cardId: string, stage: UpsellStage) {
    setCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, stage } : card))
    );
  }

  return (
    <div className="page-shell">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold not-italic text-ink">
            Upsell Pipeline
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {formatCurrency(totalValue)} in tracked opportunity value across {cards.length}{" "}
            opportunities
          </p>
        </div>
        <Button type="button" onClick={() => setWizardOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Add opportunity
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAGE_ORDER.map((stage) => {
          const meta = STAGE_META[stage];
          const accent = ACCENT_CLASS[meta.accent];
          const columnCards = cards.filter((c) => c.stage === stage);
          const isOver = dropTarget === stage;

          return (
            <section
              key={stage}
              aria-labelledby={`stage-${stage}`}
              className="flex flex-col gap-3"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropTarget(stage);
              }}
              onDragLeave={() => {
                setDropTarget((prev) => (prev === stage ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/upsell-id") || draggingId;
                if (id) moveCard(id, stage);
                setDraggingId(null);
                setDropTarget(null);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id={`stage-${stage}`}
                  className={cn("font-heading text-sm font-semibold not-italic", accent.text)}
                >
                  {meta.title}
                </h2>
                <span
                  className={cn(
                    "tabular rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    accent.pill
                  )}
                >
                  {columnCards.length}
                </span>
              </div>
              <span aria-hidden className={cn("block h-[3px] w-full rounded-full", accent.bar)} />

              <div
                className={cn(
                  "glass-panel flex min-h-40 flex-col gap-2.5 rounded-[14px] p-2.5 transition-colors",
                  isOver && "border-[oklch(74%_0.15_224/0.45)] bg-[oklch(74%_0.15_224/0.08)]"
                )}
              >
                {columnCards.length === 0 ? (
                  <p className="p-3 text-center text-xs text-ink-muted">
                    {draggingId ? "Drop here" : "No opportunities"}
                  </p>
                ) : (
                  columnCards.map((card) => {
                    const dragging = draggingId === card.id;
                    return (
                      <article
                        key={card.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(card.id);
                          e.dataTransfer.setData("text/upsell-id", card.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropTarget(null);
                        }}
                        className={cn(
                          "flex cursor-grab flex-col gap-2 rounded-[12px] border border-white/[0.1] border-l-[3px] bg-white/[0.05] p-[14px] text-left transition-[transform,box-shadow,opacity] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.35)] active:cursor-grabbing",
                          accent.edge,
                          dragging && "opacity-40"
                        )}
                      >
                        <p className="text-sm font-semibold text-ink">{card.title}</p>
                        <p className="text-xs text-ink-muted">{card.client}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="tabular text-sm font-semibold text-ledger">
                            {formatCurrency(card.value)}
                          </span>
                          {card.snoozedUntil && (
                            <span className="rounded-full bg-[oklch(78%_0.15_85/0.16)] px-2 py-0.5 text-[10.5px] font-medium text-accent-amber">
                              Snoozed → {card.snoozedUntil}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      <AddOpportunityWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={(input) => {
          setCards((prev) => [
            {
              id: `u-${Date.now()}`,
              title: input.title,
              client: input.client,
              value: input.value,
              stage: input.stage,
              snoozedUntil: input.snoozedUntil,
            },
            ...prev,
          ]);
        }}
      />
    </div>
  );
}
