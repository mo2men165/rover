import { createClient } from "@/lib/supabase/server";
import {
  mondayOf,
  quarterOf,
  quarterStartDate,
  toDateString,
  weekBounds,
} from "@/lib/stoplight/week";

export type MetricKey =
  | "uncoveredChurns"
  | "coldCallChurns"
  | "smsChurns"
  | "upsells"
  | "referrals"
  | "referralPitches"
  | "clientCalls"
  | "dataSold"
  | "gapToGoal"
  | "highlySatisfied"
  | "mediumSatisfaction"
  | "riskOfChurn";

export type CsrMetrics = {
  csrId: string;
  name: string;
  recordsTarget: number | null;
  recordsSoldQtd: number;
  weekConfirmed: boolean;
  weekConfirmedAt: string | null;
} & Record<MetricKey, number>;

export type QuotaRow = {
  id: string;
  csrId: string;
  csrName: string;
  quarter: string;
  recordsTarget: number;
};

export type ReferralOption = {
  id: string;
  referringClientName: string;
  companyName: string | null;
  pitchedAt: string;
  notes: string | null;
};

export type StoplightPayload = {
  weekStart: string;
  quarter: string;
  view: "mine" | "team";
  canEditQuotas: boolean;
  rows: CsrMetrics[];
  quotas: QuotaRow[];
  openPitches: ReferralOption[];
  clientOptions: { id: string; label: string }[];
};

function emptyMetrics(csrId: string, name: string): CsrMetrics {
  return {
    csrId,
    name,
    recordsTarget: null,
    recordsSoldQtd: 0,
    weekConfirmed: false,
    weekConfirmedAt: null,
    uncoveredChurns: 0,
    coldCallChurns: 0,
    smsChurns: 0,
    upsells: 0,
    referrals: 0,
    referralPitches: 0,
    clientCalls: 0,
    dataSold: 0,
    gapToGoal: 0,
    highlySatisfied: 0,
    mediumSatisfaction: 0,
    riskOfChurn: 0,
  };
}

function monthFirst(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export async function loadStoplight(opts: {
  weekStart?: string;
  viewerId: string;
  viewerRole: string;
}): Promise<StoplightPayload> {
  const supabase = await createClient();
  const weekStart = opts.weekStart ?? toDateString(mondayOf());
  const { startIso, endExclusiveIso, endDate } = weekBounds(weekStart);
  const quarter = quarterOf(weekStart);
  const qStart = quarterStartDate(weekStart);
  const qStartIso = `${qStart}T00:00:00.000Z`;
  const qtdEndExclusiveIso = endExclusiveIso;

  const isCsr = opts.viewerRole === "csr";
  const canEditQuotas = ["hod", "admin", "sysadmin", "tl"].includes(opts.viewerRole);

  const { data: csrUsers } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "csr")
    .eq("status", "active")
    .order("name");

  const csrs = (csrUsers ?? []).filter((u) => !isCsr || u.id === opts.viewerId);
  const csrIds = csrs.map((c) => c.id);
  const byId = new Map(csrs.map((c) => [c.id, emptyMetrics(c.id, c.name)]));

  if (csrIds.length === 0) {
    return {
      weekStart,
      quarter,
      view: isCsr ? "mine" : "team",
      canEditQuotas,
      rows: [],
      quotas: [],
      openPitches: [],
      clientOptions: [],
    };
  }

  const [
    quotasRes,
    reviewsRes,
    pocRes,
    churnRes,
    servicesRes,
    upsellsRes,
    referralsPitchRes,
    referralsConvRes,
    callsRes,
    pkgWeekRes,
    paygWeekRes,
    paygQtdRes,
    listsRes,
    confirmationsQtdRes,
  ] = await Promise.all([
    supabase.from("csr_quotas").select("id, csr_id, quarter, records_target").eq("quarter", quarter),
    supabase
      .from("stoplight_week_reviews")
      .select("csr_id, confirmed_at")
      .eq("week_start", weekStart)
      .in("csr_id", csrIds),
    supabase
      .from("clients")
      .select("id, name, company_id, assigned_csr_id, company:companies(name)")
      .eq("is_poc", true)
      .in("assigned_csr_id", csrIds),
    supabase
      .from("churn_records")
      .select(
        "id, client_id, churn_type, resolved_at, flagged_at, risk_score, client:clients!inner(id, company_id, assigned_csr_id, is_poc)"
      )
      .gte("flagged_at", startIso)
      .lt("flagged_at", endExclusiveIso),
    supabase.from("campaign_services").select("company_id, type"),
    supabase
      .from("upsells")
      .select("id, csr_id, created_at")
      .in("csr_id", csrIds)
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso),
    supabase
      .from("referrals")
      .select("id, csr_id, pitched_at")
      .in("csr_id", csrIds)
      .gte("pitched_at", startIso)
      .lt("pitched_at", endExclusiveIso),
    supabase
      .from("referrals")
      .select("id, csr_id, converted_at")
      .eq("status", "converted")
      .in("csr_id", csrIds)
      .gte("converted_at", startIso)
      .lt("converted_at", endExclusiveIso),
    supabase
      .from("interactions")
      .select("id, logged_by, occurred_at")
      .eq("type", "call")
      .eq("direction", "outbound")
      .in("logged_by", csrIds)
      .gte("occurred_at", startIso)
      .lt("occurred_at", endExclusiveIso),
    supabase
      .from("monthly_payment_confirmations")
      .select("id, confirmed_at, client:clients!inner(id, package_price, assigned_csr_id)")
      .gte("confirmed_at", startIso)
      .lt("confirmed_at", endExclusiveIso),
    supabase
      .from("payg_requests")
      .select(
        "id, paid_at, records_to_pull, pull_rate, records_to_skip_trace, skip_trace_rate, created_by, client:clients!inner(assigned_csr_id)"
      )
      .eq("paid", true)
      .gte("paid_at", startIso)
      .lt("paid_at", endExclusiveIso),
    supabase
      .from("payg_requests")
      .select("id, paid_at, records_to_pull, created_by, client:clients!inner(assigned_csr_id)")
      .eq("paid", true)
      .gte("paid_at", qStartIso)
      .lt("paid_at", qtdEndExclusiveIso),
    supabase
      .from("data_lists")
      .select(
        "id, list_date, records_accepted, data_list_services(campaign_service:campaign_services(company_id))"
      )
      .gte("list_date", qStart)
      .lte("list_date", endDate),
    supabase
      .from("monthly_payment_confirmations")
      .select("client_id, month, client:clients!inner(assigned_csr_id, company_id)")
      .gte("month", qStart)
      .lte("month", monthFirst(endDate)),
  ]);

  for (const q of quotasRes.data ?? []) {
    const row = byId.get(q.csr_id);
    if (row) row.recordsTarget = q.records_target;
  }

  for (const r of reviewsRes.data ?? []) {
    const row = byId.get(r.csr_id);
    if (row) {
      row.weekConfirmed = true;
      row.weekConfirmedAt = r.confirmed_at;
    }
  }

  const companyServices = new Map<string, Set<"cold_calling" | "texting">>();
  for (const s of servicesRes.data ?? []) {
    const set = companyServices.get(s.company_id) ?? new Set();
    if (s.type === "cold_calling" || s.type === "texting") set.add(s.type);
    companyServices.set(s.company_id, set);
  }

  type Poc = {
    id: string;
    name: string;
    company_id: string;
    assigned_csr_id: string | null;
    company: { name: string } | null;
  };
  const pocs = (pocRes.data ?? []) as unknown as Poc[];
  const pocsByCsr = new Map<string, Poc[]>();
  for (const p of pocs) {
    if (!p.assigned_csr_id) continue;
    const list = pocsByCsr.get(p.assigned_csr_id) ?? [];
    list.push(p);
    pocsByCsr.set(p.assigned_csr_id, list);
  }

  const { data: activeRisk } = await supabase
    .from("churn_records")
    .select("client_id, risk_score, client:clients!inner(assigned_csr_id, is_poc, company_id)")
    .is("resolved_at", null);

  const riskByClient = new Map<string, number | null>();
  for (const row of activeRisk ?? []) {
    riskByClient.set(row.client_id, row.risk_score == null ? null : Number(row.risk_score));
  }

  for (const csr of csrs) {
    const metrics = byId.get(csr.id)!;
    const assigned = pocsByCsr.get(csr.id) ?? [];
    for (const poc of assigned) {
      const score = riskByClient.get(poc.id);
      if (score == null || score < 40) metrics.highlySatisfied += 1;
      else if (score < 70) metrics.mediumSatisfaction += 1;
      else metrics.riskOfChurn += 1;
    }
  }

  for (const row of churnRes.data ?? []) {
    const client = row.client as unknown as {
      id: string;
      company_id: string;
      assigned_csr_id: string | null;
      is_poc: boolean;
    };
    const poc = pocs.find((p) => p.company_id === client.company_id);
    const csrId = poc?.assigned_csr_id;
    if (!csrId || !byId.has(csrId)) continue;
    const metrics = byId.get(csrId)!;

    if (row.churn_type === "unknown" && row.resolved_at == null) {
      metrics.uncoveredChurns += 1;
    }
    const types = companyServices.get(client.company_id);
    if (types?.has("cold_calling")) metrics.coldCallChurns += 1;
    if (types?.has("texting")) metrics.smsChurns += 1;
  }

  for (const u of upsellsRes.data ?? []) {
    const metrics = byId.get(u.csr_id);
    if (metrics) metrics.upsells += 1;
  }

  for (const r of referralsPitchRes.data ?? []) {
    const metrics = byId.get(r.csr_id);
    if (metrics) metrics.referralPitches += 1;
  }

  for (const r of referralsConvRes.data ?? []) {
    const metrics = byId.get(r.csr_id);
    if (metrics) metrics.referrals += 1;
  }

  for (const c of callsRes.data ?? []) {
    const metrics = byId.get(c.logged_by);
    if (metrics) metrics.clientCalls += 1;
  }

  for (const row of pkgWeekRes.data ?? []) {
    const client = row.client as unknown as {
      package_price: number | null;
      assigned_csr_id: string | null;
    };
    const csrId = client.assigned_csr_id;
    if (!csrId || !byId.has(csrId)) continue;
    byId.get(csrId)!.dataSold += Number(client.package_price ?? 0);
  }

  for (const row of paygWeekRes.data ?? []) {
    const client = row.client as unknown as { assigned_csr_id: string | null };
    const csrId = client.assigned_csr_id ?? row.created_by;
    if (!byId.has(csrId)) continue;
    const dollars =
      Number(row.records_to_pull) * Number(row.pull_rate) +
      Number(row.records_to_skip_trace) * Number(row.skip_trace_rate);
    byId.get(csrId)!.dataSold += dollars;
  }

  const soldByCsr = new Map<string, number>();
  for (const id of csrIds) soldByCsr.set(id, 0);

  for (const row of paygQtdRes.data ?? []) {
    const client = row.client as unknown as { assigned_csr_id: string | null };
    const csrId = client.assigned_csr_id ?? row.created_by;
    if (!soldByCsr.has(csrId)) continue;
    soldByCsr.set(csrId, (soldByCsr.get(csrId) ?? 0) + Number(row.records_to_pull));
  }

  type ConfRow = {
    client_id: string;
    month: string;
    client: { assigned_csr_id: string | null; company_id: string };
  };
  const confs = (confirmationsQtdRes.data ?? []) as unknown as ConfRow[];
  const confirmedMonthsByCompany = new Map<string, Set<string>>();
  const companyToCsr = new Map<string, string>();
  for (const c of confs) {
    const csrId = c.client.assigned_csr_id;
    if (!csrId) continue;
    companyToCsr.set(c.client.company_id, csrId);
    const months = confirmedMonthsByCompany.get(c.client.company_id) ?? new Set();
    months.add(c.month.slice(0, 10));
    confirmedMonthsByCompany.set(c.client.company_id, months);
  }

  for (const list of listsRes.data ?? []) {
    const links = list.data_list_services as unknown as {
      campaign_service: { company_id: string } | null;
    }[];
    const companyIds = new Set(
      (links ?? [])
        .map((l) => l.campaign_service?.company_id)
        .filter((id): id is string => Boolean(id))
    );
    for (const companyId of companyIds) {
      const csrId =
        companyToCsr.get(companyId) ??
        pocs.find((p) => p.company_id === companyId)?.assigned_csr_id ??
        null;
      if (!csrId || !soldByCsr.has(csrId)) continue;
      const months = confirmedMonthsByCompany.get(companyId);
      const listMonth = monthFirst(list.list_date);
      if (!months?.has(listMonth)) continue;
      soldByCsr.set(csrId, (soldByCsr.get(csrId) ?? 0) + Number(list.records_accepted));
      break;
    }
  }

  for (const csr of csrs) {
    const metrics = byId.get(csr.id)!;
    const sold = soldByCsr.get(csr.id) ?? 0;
    metrics.recordsSoldQtd = sold;
    // Missing quota → treat gap as 0 in aggregate tiles but UI formats as em dash
    // via recordsTarget === null check on the row.
    metrics.gapToGoal =
      metrics.recordsTarget == null ? 0 : metrics.recordsTarget - sold;
  }

  let openPitchesQuery = supabase
    .from("referrals")
    .select(
      `
      id, pitched_at, notes, csr_id,
      referring:clients!referrals_referring_client_id_fkey(name, company:companies(name))
    `
    )
    .eq("status", "pitched")
    .order("pitched_at", { ascending: false })
    .limit(50);

  if (isCsr) {
    openPitchesQuery = openPitchesQuery.eq("csr_id", opts.viewerId);
  }

  const { data: openPitchRows } = await openPitchesQuery;

  const openPitches: ReferralOption[] = (openPitchRows ?? []).map((r) => {
    const referring = r.referring as unknown as {
      name: string;
      company: { name: string } | null;
    } | null;
    return {
      id: r.id,
      referringClientName: referring?.name ?? "Unknown client",
      companyName: referring?.company?.name ?? null,
      pitchedAt: r.pitched_at,
      notes: r.notes,
    };
  });

  const clientOptions = pocs
    .filter((p) => !isCsr || p.assigned_csr_id === opts.viewerId)
    .map((p) => ({
      id: p.id,
      label: p.company?.name ? `${p.company.name} — ${p.name}` : p.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const quotas: QuotaRow[] = (quotasRes.data ?? [])
    .map((q) => ({
      id: q.id,
      csrId: q.csr_id,
      csrName: byId.get(q.csr_id)?.name ?? "CSR",
      quarter: q.quarter,
      recordsTarget: q.records_target,
    }))
    .sort((a, b) => a.csrName.localeCompare(b.csrName));

  return {
    weekStart,
    quarter,
    view: isCsr ? "mine" : "team",
    canEditQuotas,
    rows: Array.from(byId.values()),
    quotas,
    openPitches,
    clientOptions,
  };
}
