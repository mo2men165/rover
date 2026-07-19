"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TEXTING_TIER_LABELS,
  UPSELL_STAGE_LABELS,
  UPSELL_TYPE_LABELS,
} from "@/lib/supabase/labels";
import type {
  ClientOption,
  UpsellCardView,
  UpsellStage,
} from "@/components/upsells/upsell-pipeline";
import type { WonFulfillment } from "@/lib/actions/update-upsell-stage";
import type { Database } from "@/lib/supabase/database.types";

type TextingTier = Database["public"]["Enums"]["texting_tier"];
const TEXTING_TIERS: TextingTier[] = ["50k", "75k", "100k"];

export function StageTransitionDialog({
  card,
  targetStage,
  client,
  busy,
  onClose,
  onConfirm,
}: {
  card: UpsellCardView;
  targetStage: UpsellStage;
  client?: ClientOption;
  busy: boolean;
  onClose: () => void;
  onConfirm: (extras: {
    snoozeUntil?: string;
    lostReason?: string;
    wonFulfillment?: WonFulfillment;
  }) => Promise<void>;
}) {
  const titleId = useId();
  const [snoozeUntil, setSnoozeUntil] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [campaignServiceId, setCampaignServiceId] = useState(() => {
    if (card.upsellType === "add_cc_seat") {
      return client?.coldCallingServices[0]?.id ?? "";
    }
    if (card.upsellType === "texting_package_upgrade") {
      return client?.textingServices[0]?.id ?? "";
    }
    return "";
  });
  const [textingTier, setTextingTier] = useState<TextingTier>("50k");
  const [toTier, setToTier] = useState<TextingTier>("75k");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (targetStage === "pending") {
      if (!snoozeUntil) {
        setError("Pick a snooze date.");
        return;
      }
      await onConfirm({ snoozeUntil });
      return;
    }
    if (targetStage === "lost") {
      if (!lostReason.trim()) {
        setError("Lost reason is required.");
        return;
      }
      await onConfirm({ lostReason: lostReason.trim() });
      return;
    }
    if (targetStage === "won") {
      const type = card.upsellType;
      let wonFulfillment: WonFulfillment;
      if (type === "add_cc_seat") {
        if (!campaignServiceId) {
          setError("Pick a cold calling campaign.");
          return;
        }
        wonFulfillment = { upsellType: "add_cc_seat", campaignServiceId };
      } else if (type === "add_texting_service") {
        wonFulfillment = { upsellType: "add_texting_service", textingTier };
      } else if (type === "texting_package_upgrade") {
        if (!campaignServiceId) {
          setError("Pick a texting campaign.");
          return;
        }
        wonFulfillment = {
          upsellType: "texting_package_upgrade",
          campaignServiceId,
          toTier,
        };
      } else {
        wonFulfillment = { upsellType: type };
      }
      await onConfirm({ wonFulfillment });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[440px] rounded-[20px] border border-white/[0.14] bg-[rgba(20,22,30,0.92)] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-[30px]"
      >
        <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
          Stage change
        </p>
        <h2 id={titleId} className="mt-1 font-heading text-[17px] font-bold text-ink">
          Move to {UPSELL_STAGE_LABELS[targetStage]}
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          {UPSELL_TYPE_LABELS[card.upsellType]} · {card.companyName}
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {targetStage === "pending" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="snooze-until">Snooze until</Label>
              <Input
                id="snooze-until"
                type="date"
                value={snoozeUntil}
                onChange={(e) => setSnoozeUntil(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {targetStage === "lost" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lost-reason">Lost reason</Label>
              <Input
                id="lost-reason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Why did this fall through?"
                autoFocus
              />
            </div>
          )}

          {targetStage === "won" && card.upsellType === "add_cc_seat" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="won-cc">Cold calling campaign</Label>
              <select
                id="won-cc"
                value={campaignServiceId}
                onChange={(e) => setCampaignServiceId(e.target.value)}
                className="h-auto w-full rounded-[11px] border border-white/[0.14] bg-black/30 px-3.5 py-[11px] text-sm text-ink outline-none focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)]"
              >
                {(client?.coldCallingServices ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-muted">
                Adds {card.quantity} seat{card.quantity === 1 ? "" : "s"} and
                logs the confirmed upsell.
              </p>
            </div>
          )}

          {targetStage === "won" && card.upsellType === "add_texting_service" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="won-tier">Starting texting tier</Label>
              <select
                id="won-tier"
                value={textingTier}
                onChange={(e) => setTextingTier(e.target.value as TextingTier)}
                className="h-auto w-full rounded-[11px] border border-white/[0.14] bg-black/30 px-3.5 py-[11px] text-sm text-ink outline-none focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)]"
              >
                {TEXTING_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {TEXTING_TIER_LABELS[tier]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetStage === "won" &&
            card.upsellType === "texting_package_upgrade" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="won-texting">Texting campaign</Label>
                  <select
                    id="won-texting"
                    value={campaignServiceId}
                    onChange={(e) => setCampaignServiceId(e.target.value)}
                    className="h-auto w-full rounded-[11px] border border-white/[0.14] bg-black/30 px-3.5 py-[11px] text-sm text-ink outline-none focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)]"
                  >
                    {(client?.textingServices ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="won-to-tier">New tier</Label>
                  <select
                    id="won-to-tier"
                    value={toTier}
                    onChange={(e) => setToTier(e.target.value as TextingTier)}
                    className="h-auto w-full rounded-[11px] border border-white/[0.14] bg-black/30 px-3.5 py-[11px] text-sm text-ink outline-none focus-visible:border-[oklch(74%_0.15_224/0.6)] focus-visible:ring-[3px] focus-visible:ring-[oklch(74%_0.15_224/0.18)]"
                  >
                    {TEXTING_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {TEXTING_TIER_LABELS[tier]}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

          {targetStage === "won" &&
            (card.upsellType === "dwy_lm" || card.upsellType === "dfy_lm") && (
              <p className="text-sm text-ink-muted">
                This will log a confirmed {UPSELL_TYPE_LABELS[card.upsellType]}{" "}
                upsell for this client.
              </p>
            )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : `Move to ${UPSELL_STAGE_LABELS[targetStage]}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
