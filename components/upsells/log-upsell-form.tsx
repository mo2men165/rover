"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logUpsell } from "@/lib/actions/log-upsell";
import { TEXTING_TIER_LABELS, UPSELL_TYPE_LABELS, UPSELL_UNIT_AMOUNTS } from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type UpsellType = Database["public"]["Enums"]["upsell_type"];
type TextingTier = Database["public"]["Enums"]["texting_tier"];
type CampaignServiceRow = {
  id: string;
  type: Database["public"]["Enums"]["campaign_type"];
  texting_tier: TextingTier | null;
};

const TEXTING_TIERS: TextingTier[] = ["50k", "75k", "100k"];

export function LogUpsellForm({
  companyId,
  campaignServices,
  onDone,
}: {
  companyId: string;
  campaignServices: CampaignServiceRow[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const coldCallingServices = campaignServices.filter((cs) => cs.type === "cold_calling");
  const textingServices = campaignServices.filter((cs) => cs.type === "texting");

  const availableTypes = useMemo(() => {
    const types: UpsellType[] = ["add_texting_service", "dwy_lm", "dfy_lm"];
    if (coldCallingServices.length > 0) types.unshift("add_cc_seat");
    if (textingServices.length > 0) types.push("texting_package_upgrade");
    return types;
  }, [coldCallingServices.length, textingServices.length]);

  const [upsellType, setUpsellType] = useState<UpsellType>(availableTypes[0]);
  const [campaignServiceId, setCampaignServiceId] = useState(
    coldCallingServices[0]?.id ?? textingServices[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState("1");
  const [textingTier, setTextingTier] = useState<TextingTier>("50k");
  const [toTier, setToTier] = useState<TextingTier>("50k");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await logUpsell(
      upsellType === "add_cc_seat"
        ? {
            upsellType,
            companyId,
            campaignServiceId,
            quantity: Number(quantity),
            notes: notes || undefined,
          }
        : upsellType === "add_texting_service"
          ? { upsellType, companyId, textingTier, notes: notes || undefined }
          : upsellType === "texting_package_upgrade"
            ? {
                upsellType,
                companyId,
                campaignServiceId,
                toTier,
                notes: notes || undefined,
              }
            : { upsellType, companyId, notes: notes || undefined }
    );

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border border-border bg-surface-raised p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upsell-type">Upsell</Label>
        <select
          id="upsell-type"
          value={upsellType}
          onChange={(e) => setUpsellType(e.target.value as UpsellType)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {UPSELL_TYPE_LABELS[type]} — ${UPSELL_UNIT_AMOUNTS[type]}
              {type === "add_cc_seat" ? "/seat" : ""}
            </option>
          ))}
        </select>
      </div>

      {upsellType === "add_cc_seat" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-service">Cold calling campaign</Label>
            <select
              id="cc-service"
              value={campaignServiceId}
              onChange={(e) => setCampaignServiceId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {coldCallingServices.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {cs.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Seats to add</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </>
      )}

      {upsellType === "add_texting_service" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="starting-tier">Starting texting tier</Label>
          <select
            id="starting-tier"
            value={textingTier}
            onChange={(e) => setTextingTier(e.target.value as TextingTier)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {TEXTING_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {TEXTING_TIER_LABELS[tier]}
              </option>
            ))}
          </select>
        </div>
      )}

      {upsellType === "texting_package_upgrade" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="texting-service">Texting campaign</Label>
            <select
              id="texting-service"
              value={campaignServiceId}
              onChange={(e) => setCampaignServiceId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {textingServices.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  Current: {cs.texting_tier ? TEXTING_TIER_LABELS[cs.texting_tier] : "—"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to-tier">New tier</Label>
            <select
              id="to-tier"
              value={toTier}
              onChange={(e) => setToTier(e.target.value as TextingTier)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Logging…" : "Log upsell"}
      </Button>
    </form>
  );
}
