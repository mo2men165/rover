"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddOpportunityWizard } from "@/components/upsells/add-opportunity-wizard";
import { StageTransitionDialog } from "@/components/upsells/stage-transition-dialog";
import { updateUpsellStage } from "@/lib/actions/update-upsell-stage";
import {
  UPSELL_STAGE_LABELS,
  UPSELL_TYPE_LABELS,
  UPSELL_UNIT_AMOUNTS,
} from "@/lib/supabase/labels";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

export type UpsellStage = Database["public"]["Enums"]["upsell_stage"];
export type UpsellType = Database["public"]["Enums"]["upsell_type"];

export type UpsellCardView = {
  id: string;
  clientId: string;
  clientName: string;
  companyId: string;
  companyName: string;
  csrName: string;
  upsellType: UpsellType;
  stage: UpsellStage;
  quantity: number;
  snoozeUntil: string | null;
  notes: string | null;
  lostReason: string | null;
};

export type ClientOption = {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  hasColdCalling: boolean;
  hasTexting: boolean;
  coldCallingServices: { id: string; label: string }[];
  textingServices: { id: string; label: string; tier: string | null }[];
};

type Accent = "neutral" | "blue" | "amber" | "emerald" | "coral";

const STAGE_ORDER: UpsellStage[] = [
  "opportunity",
  "pitched",
  "pending",
  "won",
  "lost",
];

const STAGE_META: Record<UpsellStage, { accent: Accent }> = {
  opportunity: { accent: "neutral" },
  pitched: { accent: "blue" },
  pending: { accent: "amber" },
  won: { accent: "emerald" },
  lost: { accent: "coral" },
};

const ACCENT_CLASS: Record<
  Accent,
  { text: string; pill: string; bar: string; edge: string }
> = {
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatSnooze(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isSnoozeDue(snoozeUntil: string | null) {
  if (!snoozeUntil) return false;
  return snoozeUntil <= todayIso();
}

function cardValue(card: UpsellCardView) {
  return UPSELL_UNIT_AMOUNTS[card.upsellType] * card.quantity;
}

export function UpsellPipeline({
  initialCards,
  clients,
}: {
  initialCards: UpsellCardView[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<UpsellStage | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    card: UpsellCardView;
    stage: UpsellStage;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  const totalValue = useMemo(
    () => cards.reduce((sum, card) => sum + cardValue(card), 0),
    [cards]
  );

  const dueCount = useMemo(
    () =>
      cards.filter(
        (c) => c.stage === "pending" && isSnoozeDue(c.snoozeUntil)
      ).length,
    [cards]
  );

  async function applyStage(
    card: UpsellCardView,
    stage: UpsellStage,
    extras?: {
      snoozeUntil?: string;
      lostReason?: string;
      wonFulfillment?: Parameters<typeof updateUpsellStage>[0]["wonFulfillment"];
    }
  ) {
    setBusy(true);
    setError(null);
    const result = await updateUpsellStage({
      opportunityId: card.id,
      stage,
      snoozeUntil: extras?.snoozeUntil,
      lostReason: extras?.lostReason,
      wonFulfillment: extras?.wonFulfillment,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return false;
    }
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? {
              ...c,
              stage,
              snoozeUntil:
                stage === "pending" ? (extras?.snoozeUntil ?? null) : null,
              lostReason: stage === "lost" ? (extras?.lostReason ?? null) : null,
            }
          : c
      )
    );
    router.refresh();
    return true;
  }

  function requestMove(cardId: string, stage: UpsellStage) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.stage === stage) return;
    if (card.stage === "won" || card.stage === "lost") return;

    if (stage === "pending" || stage === "won" || stage === "lost") {
      setPendingMove({ card, stage });
      return;
    }

    void applyStage(card, stage);
  }

  function columnCards(stage: UpsellStage) {
    const list = cards.filter((c) => c.stage === stage);
    if (stage !== "pending") return list;
    return [...list].sort((a, b) => {
      const aDue = isSnoozeDue(a.snoozeUntil) ? 0 : 1;
      const bDue = isSnoozeDue(b.snoozeUntil) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      return (a.snoozeUntil ?? "").localeCompare(b.snoozeUntil ?? "");
    });
  }

  return (
    <div className="page-shell">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[26px] font-bold not-italic text-ink">
            Upsell Pipeline
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            ${totalValue.toLocaleString("en-US")} in tracked opportunity value
            across {cards.length} opportunities
            {dueCount > 0 && (
              <span className="ml-2 text-accent-coral">
                · {dueCount} snooze{dueCount === 1 ? "" : "s"} due
              </span>
            )}
          </p>
        </div>
        <Button type="button" onClick={() => setWizardOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Add opportunity
        </Button>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAGE_ORDER.map((stage) => {
          const meta = STAGE_META[stage];
          const accent = ACCENT_CLASS[meta.accent];
          const list = columnCards(stage);
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
                if (id) requestMove(id, stage);
                setDraggingId(null);
                setDropTarget(null);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id={`stage-${stage}`}
                  className={cn(
                    "font-heading text-sm font-semibold not-italic",
                    accent.text
                  )}
                >
                  {UPSELL_STAGE_LABELS[stage]}
                </h2>
                <span
                  className={cn(
                    "tabular rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    accent.pill
                  )}
                >
                  {list.length}
                </span>
              </div>
              <span
                aria-hidden
                className={cn("block h-[3px] w-full rounded-full", accent.bar)}
              />

              <div
                className={cn(
                  "glass-panel flex min-h-40 flex-col gap-2.5 rounded-[14px] p-2.5 transition-colors",
                  isOver &&
                    "border-[oklch(74%_0.15_224/0.45)] bg-[oklch(74%_0.15_224/0.08)]"
                )}
              >
                {list.length === 0 ? (
                  <p className="p-3 text-center text-xs text-ink-muted">
                    {draggingId ? "Drop here" : "No opportunities"}
                  </p>
                ) : (
                  list.map((card) => {
                    const dragging = draggingId === card.id;
                    const due =
                      card.stage === "pending" && isSnoozeDue(card.snoozeUntil);
                    const terminal =
                      card.stage === "won" || card.stage === "lost";
                    return (
                      <article
                        key={card.id}
                        draggable={!terminal && !busy}
                        onDragStart={(e) => {
                          if (terminal) return;
                          setDraggingId(card.id);
                          e.dataTransfer.setData("text/upsell-id", card.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDropTarget(null);
                        }}
                        className={cn(
                          "flex flex-col gap-2 rounded-[12px] border border-white/[0.1] border-l-[3px] bg-white/[0.05] p-[14px] text-left transition-[transform,box-shadow,opacity]",
                          !terminal &&
                            "cursor-grab hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.35)] active:cursor-grabbing",
                          accent.edge,
                          dragging && "opacity-40",
                          due &&
                            "border-[oklch(64%_0.19_25/0.45)] bg-[oklch(64%_0.19_25/0.08)] shadow-[0_0_0_1px_oklch(64%_0.19_25/0.2)]"
                        )}
                      >
                        <p className="text-sm font-semibold text-ink">
                          {UPSELL_TYPE_LABELS[card.upsellType]}
                          {card.upsellType === "add_cc_seat" && card.quantity > 1
                            ? ` ×${card.quantity}`
                            : ""}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {card.companyName}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-ink-faint">
                            {card.csrName}
                          </span>
                          <span className="tabular text-sm font-semibold text-ledger">
                            ${cardValue(card).toLocaleString("en-US")}
                          </span>
                        </div>
                        {card.stage === "pending" && card.snoozeUntil && (
                          <span
                            className={cn(
                              "w-fit rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                              due
                                ? "bg-[oklch(64%_0.19_25/0.2)] text-accent-coral"
                                : "bg-[oklch(78%_0.15_85/0.16)] text-accent-amber"
                            )}
                          >
                            {due
                              ? `Due — snoozed ${formatSnooze(card.snoozeUntil)}`
                              : `Snoozed → ${formatSnooze(card.snoozeUntil)}`}
                          </span>
                        )}
                        {card.stage === "lost" && card.lostReason && (
                          <p className="text-[11px] text-ink-muted line-clamp-2">
                            {card.lostReason}
                          </p>
                        )}
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
        clients={clients}
        onClose={() => setWizardOpen(false)}
        onCreated={() => router.refresh()}
      />

      {pendingMove && (
        <StageTransitionDialog
          card={pendingMove.card}
          targetStage={pendingMove.stage}
          client={clients.find((c) => c.id === pendingMove.card.clientId)}
          busy={busy}
          onClose={() => setPendingMove(null)}
          onConfirm={async (extras) => {
            const ok = await applyStage(
              pendingMove.card,
              pendingMove.stage,
              extras
            );
            if (ok) setPendingMove(null);
          }}
        />
      )}
    </div>
  );
}
