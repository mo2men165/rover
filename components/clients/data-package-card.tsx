import type { ReactNode } from "react";
import {
  DATA_SOURCE_TIER_LABELS,
  PACKAGE_COMMITMENT_LABELS,
  PACKAGE_TIER_LABELS,
  PACKAGE_TIER_RECORDS,
  PROVIDER_TYPE_LABELS,
  SKIP_TRACE_RATE_TIER_LABELS,
  SKIP_TRACING_SOURCE_LABELS,
} from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type DataSourceType = Database["public"]["Enums"]["provider_type"];
type DataSourceTier = Database["public"]["Enums"]["data_source_tier"];
type PackageTier = Database["public"]["Enums"]["package_tier"];
type PackageCommitment = Database["public"]["Enums"]["package_commitment"];
type SkipTraceRateTier = Database["public"]["Enums"]["skip_trace_rate_tier"];

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-2.5 text-sm last:border-b-0">
      <dt className="w-36 shrink-0 text-ink-muted">{label}</dt>
      <dd className="flex-1 text-right text-ink">{children}</dd>
    </div>
  );
}

export function DataPackageCard({
  dataSourceType,
  dataSourceTier,
  dataSourceProviderName,
  packageTier,
  packageCommitment,
  packageStartDate,
  packagePrice,
  skipTracingType,
  skipTraceProviderName,
  skipTraceRateTier,
  skipTraceRate,
  monthlySkipTraceExpected,
}: {
  dataSourceType: DataSourceType | null;
  dataSourceTier: DataSourceTier | null;
  dataSourceProviderName?: string | null;
  packageTier: PackageTier | null;
  packageCommitment: PackageCommitment | null;
  packageStartDate: string | null;
  packagePrice: number | null;
  skipTracingType: DataSourceType | null;
  skipTraceProviderName?: string | null;
  skipTraceRateTier: SkipTraceRateTier | null;
  skipTraceRate: number | null;
  monthlySkipTraceExpected: number | null;
}) {
  const hasData =
    dataSourceType ||
    dataSourceTier ||
    packageTier ||
    skipTracingType ||
    skipTraceRateTier ||
    skipTraceRate !== null ||
    monthlySkipTraceExpected !== null;

  if (!hasData) {
    return (
      <div className="flex flex-col gap-2 glass-panel rounded-[var(--radius-lg)] p-5">
        <h2 className="font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
          Data & Skip Trace
        </h2>
        <p className="text-sm text-ink-muted">
          No data package or skip-trace configuration on file.
        </p>
      </div>
    );
  }

  const modeLabel =
    dataSourceTier === "package"
      ? "Package"
      : dataSourceTier
        ? DATA_SOURCE_TIER_LABELS[dataSourceTier]
        : dataSourceType === "self_provided"
          ? "Self-Provided"
          : dataSourceType
            ? PROVIDER_TYPE_LABELS[dataSourceType]
            : "—";

  return (
    <div className="flex flex-col gap-1 glass-panel rounded-[var(--radius-lg)] p-5">
      <h2 className="mb-1 font-heading text-sm font-medium uppercase tracking-wide text-ink-muted">
        Data & Skip Trace
      </h2>
      <dl>
        <Row label="Mode">{modeLabel}</Row>
        {dataSourceType && (
          <Row label="Data source">
            {dataSourceType === "self_provided"
              ? dataSourceProviderName?.trim() || "Unknown"
              : PROVIDER_TYPE_LABELS[dataSourceType]}
          </Row>
        )}
        {packageTier && (
          <>
            <Row label="Package">
              {PACKAGE_TIER_LABELS[packageTier]}
              {` · ${PACKAGE_TIER_RECORDS[packageTier].toLocaleString()} records/mo`}
            </Row>
            <Row label="Commitment">
              {packageCommitment
                ? PACKAGE_COMMITMENT_LABELS[packageCommitment]
                : "—"}
            </Row>
            <Row label="Package start">{formatDate(packageStartDate)}</Row>
            <Row label="Price">{formatPrice(packagePrice)}/mo</Row>
          </>
        )}
        <Row label="Skip tracing">
          {skipTracingType === "self_provided"
            ? skipTraceProviderName?.trim() || "Unknown"
            : skipTracingType
              ? SKIP_TRACING_SOURCE_LABELS[skipTracingType]
              : "—"}
        </Row>
        <Row label="Skip-trace rate">
          {skipTraceRateTier
            ? SKIP_TRACE_RATE_TIER_LABELS[skipTraceRateTier]
            : skipTraceRate !== null
              ? `${formatPrice(skipTraceRate)}/record`
              : "—"}
          {skipTraceRateTier === "custom" && skipTraceRate !== null
            ? ` (${formatPrice(skipTraceRate)}/record)`
            : ""}
        </Row>
        <Row label="Expected volume">
          {monthlySkipTraceExpected !== null
            ? `${monthlySkipTraceExpected.toLocaleString()}/mo`
            : "—"}
        </Row>
      </dl>
    </div>
  );
}
