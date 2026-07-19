"use server";

import { createClient } from "@/lib/supabase/server";
import { computeAndPersistChurnScore } from "@/lib/churn/compute";
import type { ChurnScoreResult } from "@/lib/churn/score";

export type RefreshChurnScoreResult =
  | { success: true; score: ChurnScoreResult }
  | { success: false; error: string };

export async function refreshChurnScore(
  clientId: string,
  force = false
): Promise<RefreshChurnScoreResult> {
  if (!clientId) return { success: false, error: "Missing client." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  try {
    const score = await computeAndPersistChurnScore(clientId, { force });
    if (!score) return { success: false, error: "Client not found." };
    return { success: true, score };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Score failed.",
    };
  }
}
