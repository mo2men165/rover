"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type PackageTier = Database["public"]["Enums"]["package_tier"];

type AddToDataPackageInput = {
  clientId: string;
  packageTier: PackageTier;
  packageStartDate: string;
  packageEndDate?: string;
  packagePriceOverride?: number;
};

type AddToDataPackageResult = { success: true } | { success: false; error: string };

const ELEVATED_ROLES = ["tl", "hod", "admin"];

// Available to csr (own assigned clients only), admin, tl, hod, per the
// Sprint 3 spec. Only meaningful for clients not currently on a package
// (legacy/self_provided/payg/none) -- rejects if already on 'package'.
export async function addToDataPackage(
  input: AddToDataPackageInput
): Promise<AddToDataPackageResult> {
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

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, is_poc, assigned_csr_id, data_source_tier")
    .eq("id", input.clientId)
    .single();

  if (!client || !client.is_poc) {
    return { success: false, error: "Client not found." };
  }

  if (role === "csr" && client.assigned_csr_id !== user.id) {
    return { success: false, error: "You are not assigned to this client." };
  }

  if (client.data_source_tier === "package") {
    return { success: false, error: "This client is already on a data package." };
  }

  const { error: updateError } = await admin
    .from("clients")
    .update({
      data_source_type: "res",
      data_source_tier: "package",
      package_tier: input.packageTier,
      package_start_date: input.packageStartDate,
      package_end_date: input.packageEndDate ?? null,
    })
    .eq("id", input.clientId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // The clients_set_package_price trigger just auto-filled package_price
  // from the fixed tier rate -- apply a promo/discounted override on top
  // if one was given (a separate UPDATE that doesn't touch package_tier,
  // so the trigger doesn't re-fire and stomp it).
  if (input.packagePriceOverride !== undefined) {
    const { error: priceError } = await admin
      .from("clients")
      .update({ package_price: input.packagePriceOverride })
      .eq("id", input.clientId);
    if (priceError) {
      return { success: false, error: priceError.message };
    }
  }

  return { success: true };
}
