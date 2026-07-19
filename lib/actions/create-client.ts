"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { BuyBox } from "@/lib/supabase/buy-box-options";

type TextingTier = Database["public"]["Enums"]["texting_tier"];
type PackageTier = Database["public"]["Enums"]["package_tier"];
type ClientScript = Database["public"]["Enums"]["client_script"];
type ContactMethod = Database["public"]["Enums"]["contact_method"];

type AssociateInput = {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  preferredContactMethod?: ContactMethod;
};

type ServiceInput =
  | { type: "cold_calling"; seatCount: number }
  | { type: "texting"; textingTier: TextingTier };

type DataPackageInput =
  | { mode: "package"; tier: PackageTier; startDate: string; priceOverride?: number }
  | { mode: "legacy" }
  | { mode: "self_provided" };

type CreateClientInput = {
  companyName: string;
  poc: { name: string; email?: string; phone?: string; title?: string };
  assignedCsrId: string;
  associates: AssociateInput[];
  buyBox: BuyBox;
  script: ClientScript;
  services: ServiceInput[];
  dataPackage: DataPackageInput;
  /** Open referral pitch to convert when this client is onboarded. */
  referralId?: string;
  /** Referring existing client — creates+converts a referral if no pitch id. */
  referredByClientId?: string;
};

type CreateClientResult =
  | { success: true; companyId: string }
  | { success: false; error: string };

const ELEVATED_ROLES = ["tl", "hod", "admin"];

// Named createClientRecord (not createClient) to avoid shadowing the
// @/lib/supabase/server import used for caller identification below.
// Available to csr (assigns to self only, enforced server-side regardless
// of what the client sent) and tl/hod/admin (assign to any csr), per the
// Big Sprint Part 1 spec. No cross-table DB transaction -- sequential
// admin-client inserts, matching the existing style in log-upsell.ts.
export async function createClientRecord(
  input: CreateClientInput
): Promise<CreateClientResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = callerProfile?.role;
  if (role !== "csr" && !ELEVATED_ROLES.includes(role ?? "")) {
    return { success: false, error: "You don't have permission to do this." };
  }

  if (input.services.length === 0) {
    return { success: false, error: "At least one campaign service is required." };
  }

  const assignedCsrId = role === "csr" ? user.id : input.assignedCsrId;

  const admin = createAdminClient();

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: input.companyName })
    .select("id")
    .single();

  if (companyError || !company) {
    return { success: false, error: companyError?.message ?? "Failed to create company." };
  }

  const dataSourceFields =
    input.dataPackage.mode === "package"
      ? {
          data_source_type: "res" as const,
          data_source_tier: "package" as const,
          package_tier: input.dataPackage.tier,
          package_start_date: input.dataPackage.startDate,
        }
      : input.dataPackage.mode === "legacy"
        ? { data_source_type: "res" as const, data_source_tier: "legacy" as const }
        : { data_source_type: "self_provided" as const };

  const { data: pocClient, error: pocError } = await admin
    .from("clients")
    .insert({
      company_id: company.id,
      name: input.poc.name,
      email: input.poc.email || null,
      phone: input.poc.phone || null,
      title_at_company: input.poc.title || null,
      is_poc: true,
      assigned_csr_id: assignedCsrId,
      buy_box: input.buyBox,
      script: input.script,
      ...dataSourceFields,
    })
    .select("id")
    .single();

  if (pocError || !pocClient) {
    return { success: false, error: pocError?.message ?? "Failed to create client." };
  }

  // package_price is auto-set by the clients_set_package_price trigger from
  // package_tier -- apply a promo/discounted override on top if one was
  // given, same pattern as add-to-data-package.ts.
  if (input.dataPackage.mode === "package" && input.dataPackage.priceOverride !== undefined) {
    const { error: priceError } = await admin
      .from("clients")
      .update({ package_price: input.dataPackage.priceOverride })
      .eq("id", pocClient.id);
    if (priceError) return { success: false, error: priceError.message };
  }

  if (input.associates.length > 0) {
    const { error: associatesError } = await admin.from("clients").insert(
      input.associates.map((a) => ({
        company_id: company.id,
        name: a.name,
        email: a.email || null,
        phone: a.phone || null,
        is_poc: false,
        role: a.role || null,
        preferred_contact_method: a.preferredContactMethod ?? null,
      }))
    );
    if (associatesError) return { success: false, error: associatesError.message };
  }

  const { error: servicesError } = await admin.from("campaign_services").insert(
    input.services.map((s) =>
      s.type === "cold_calling"
        ? { company_id: company.id, type: "cold_calling" as const, seat_count: s.seatCount }
        : {
            company_id: company.id,
            type: "texting" as const,
            seat_count: 1,
            texting_tier: s.textingTier,
          }
    )
  );
  if (servicesError) return { success: false, error: servicesError.message };

  // Referral conversion: link an open pitch, or create a converted row from
  // the referring client selected in the Add Client wizard.
  if (input.referralId || input.referredByClientId) {
    const now = new Date().toISOString();

    if (input.referralId) {
      const { data: pitch } = await admin
        .from("referrals")
        .select("id, csr_id, status")
        .eq("id", input.referralId)
        .maybeSingle();

      if (!pitch || pitch.status !== "pitched") {
        return { success: false, error: "Open referral pitch not found." };
      }
      if (pitch.csr_id !== assignedCsrId && role === "csr") {
        return { success: false, error: "That pitch belongs to another CSR." };
      }
      if (role === "csr" && pitch.csr_id !== user.id) {
        return { success: false, error: "You can only convert your own pitches." };
      }

      const { data: updated, error: refError } = await admin
        .from("referrals")
        .update({
          status: "converted",
          referred_client_id: pocClient.id,
          converted_at: now,
        })
        .eq("id", input.referralId)
        .eq("status", "pitched")
        .select("id")
        .maybeSingle();

      if (refError) return { success: false, error: refError.message };
      if (!updated) return { success: false, error: "Failed to convert referral pitch." };
    } else if (input.referredByClientId) {
      const { data: referring } = await admin
        .from("clients")
        .select("id, company_id")
        .eq("id", input.referredByClientId)
        .maybeSingle();
      if (!referring) {
        return { success: false, error: "Referring client not found." };
      }

      const { data: referringPoc } = await admin
        .from("clients")
        .select("assigned_csr_id")
        .eq("company_id", referring.company_id)
        .eq("is_poc", true)
        .maybeSingle();

      if (role === "csr" && referringPoc?.assigned_csr_id !== user.id) {
        return { success: false, error: "Referring client isn't on your book." };
      }

      // Prefer converting an existing open pitch for this referrer + CSR.
      const { data: existingPitch } = await admin
        .from("referrals")
        .select("id")
        .eq("csr_id", assignedCsrId)
        .eq("referring_client_id", input.referredByClientId)
        .eq("status", "pitched")
        .maybeSingle();

      if (existingPitch) {
        const { data: updated, error: refError } = await admin
          .from("referrals")
          .update({
            status: "converted",
            referred_client_id: pocClient.id,
            converted_at: now,
          })
          .eq("id", existingPitch.id)
          .eq("status", "pitched")
          .select("id")
          .maybeSingle();
        if (refError) return { success: false, error: refError.message };
        if (!updated) return { success: false, error: "Failed to convert existing pitch." };
      } else {
        const { error: refError } = await admin.from("referrals").insert({
          referring_client_id: input.referredByClientId,
          referred_client_id: pocClient.id,
          csr_id: assignedCsrId,
          status: "converted",
          pitched_at: now,
          converted_at: now,
        });
        if (refError) return { success: false, error: refError.message };
      }
    }
  }

  return { success: true, companyId: company.id };
}
