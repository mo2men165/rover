import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export const CAMPAIGN_TYPE_LABELS: Record<Enums["campaign_type"], string> = {
  cold_calling: "Cold Calling",
  texting: "Texting",
};

export const SOURCE_TYPE_LABELS: Record<Enums["source_type"], string> = {
  res: "RES",
  self_provided: "Self-Provided",
};

export const SERVICE_TIER_LABELS: Record<Enums["service_tier"], string> = {
  starter: "Starter",
  pro: "Pro",
  growth: "Growth",
  legacy: "Legacy",
  payg: "PAYG",
};

export const RATE_TYPE_LABELS: Record<Enums["rate_type"], string> = {
  standard: "Standard",
  promo: "Promo",
};
