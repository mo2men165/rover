import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export const CAMPAIGN_TYPE_LABELS: Record<Enums["campaign_type"], string> = {
  cold_calling: "Cold Calling",
  texting: "Texting",
};

export const PROVIDER_TYPE_LABELS: Record<Enums["provider_type"], string> = {
  res: "RES",
  self_provided: "Self-Provided",
};

export const DATA_SOURCE_TIER_LABELS: Record<Enums["data_source_tier"], string> = {
  package: "Package",
  payg: "PAYG",
  legacy: "Legacy",
};

export const SKIP_TRACE_RATE_TIER_LABELS: Record<Enums["skip_trace_rate_tier"], string> = {
  "0.09": "$0.09 / record",
  "0.07": "$0.07 / record",
  "0.0525": "$0.0525 / record",
  custom: "Custom",
};

export const RATE_TYPE_LABELS: Record<Enums["rate_type"], string> = {
  standard: "Standard",
  promo: "Promo",
};

export const TEXTING_TIER_LABELS: Record<Enums["texting_tier"], string> = {
  "50k": "50k",
  "75k": "75k",
  "100k": "100k",
};

export const UPSELL_TYPE_LABELS: Record<Enums["upsell_type"], string> = {
  add_cc_seat: "Add CC Seat",
  add_texting_service: "Add Texting Service",
  dwy_lm: "DWY LM",
  dfy_lm: "DFY LM",
  texting_package_upgrade: "Texting Package Upgrade",
};

// Fixed, non-editable unit price per upsell_type — mirrors the DB trigger
// (set_upsell_unit_amount) so the UI can preview totals before submit.
export const UPSELL_UNIT_AMOUNTS: Record<Enums["upsell_type"], number> = {
  add_cc_seat: 100,
  add_texting_service: 150,
  dwy_lm: 150,
  dfy_lm: 200,
  texting_package_upgrade: 75,
};
