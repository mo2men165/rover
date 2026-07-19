import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAndPersistChurnScore } from "@/lib/churn/compute";

/**
 * Nightly churn score refresh for all POC clients.
 * Protect with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data: pocs } = await admin
    .from("clients")
    .select("id")
    .eq("is_poc", true);

  let ok = 0;
  let failed = 0;

  for (const poc of pocs ?? []) {
    try {
      await computeAndPersistChurnScore(poc.id, { force: true });
      ok += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({
    ok,
    failed,
    total: (pocs ?? []).length,
    at: new Date().toISOString(),
  });
}
