// Buy box property types and states are plain text[] columns (see
// clients.buy_box in the sprint4 migration), not DB enums -- these option
// lists are UI-only constants so the business can add new categories
// without a migration.

export const PROPERTY_TYPE_OPTIONS = [
  "Single Family",
  "Multi-Family",
  "Land",
  "Mobile Home",
  "Condo/Townhouse",
  "Commercial",
] as const;

export const US_STATE_OPTIONS = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
] as const;

export type BuyBox = {
  property_types: string[];
  states: string[];
  area_codes: string[];
  zip_codes: string[];
  max_arv: number | null;
  exclusions: string | null;
};

export const EMPTY_BUY_BOX: BuyBox = {
  property_types: [],
  states: [],
  area_codes: [],
  zip_codes: [],
  max_arv: null,
  exclusions: null,
};

// clients.buy_box comes back as untyped Json from Supabase -- this
// coerces it into the BuyBox shape, defaulting any missing/malformed
// field rather than throwing (a client created before this field existed,
// or a partially-written jsonb value, should still render safely).
export function toBuyBox(value: unknown): BuyBox {
  if (!value || typeof value !== "object") return EMPTY_BUY_BOX;
  const v = value as Partial<Record<keyof BuyBox, unknown>>;
  return {
    property_types: Array.isArray(v.property_types) ? (v.property_types as string[]) : [],
    states: Array.isArray(v.states) ? (v.states as string[]) : [],
    area_codes: Array.isArray(v.area_codes) ? (v.area_codes as string[]) : [],
    zip_codes: Array.isArray(v.zip_codes) ? (v.zip_codes as string[]) : [],
    max_arv: typeof v.max_arv === "number" ? v.max_arv : null,
    exclusions: typeof v.exclusions === "string" ? v.exclusions : null,
  };
}
