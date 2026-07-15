"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogUpsellForm } from "@/components/upsells/log-upsell-form";
import type { Database } from "@/lib/supabase/database.types";

type CampaignServiceRow = {
  id: string;
  type: Database["public"]["Enums"]["campaign_type"];
  texting_tier: Database["public"]["Enums"]["texting_tier"] | null;
};

export function LogUpsellToggle({
  companyId,
  campaignServices,
}: {
  companyId: string;
  campaignServices: CampaignServiceRow[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        + Log Upsell
      </Button>
    );
  }

  return (
    <LogUpsellForm
      companyId={companyId}
      campaignServices={campaignServices}
      onDone={() => setOpen(false)}
    />
  );
}
