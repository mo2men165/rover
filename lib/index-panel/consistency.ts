export type ConsistencyLabel =
  | "on_track"
  | "at_risk"
  | "missed"
  | "no_checkin"
  | "unknown";

export type ConsistencyResult = {
  label: ConsistencyLabel;
  /** Calendar days since last check-in; null when none exists or unknown. */
  daysSince: number | null;
};

const MS_PER_DAY = 86_400_000;

/** Calendar-day distance (UTC date truncation), matching the approved formula. */
export function calendarDaysSince(fromIso: string, now = new Date()): number {
  const from = new Date(fromIso);
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((nowUtc - fromUtc) / MS_PER_DAY));
}

/**
 * Consistency of Communication (approved Part 5 formula).
 *
 * Tuesday-anchored weekly cadence → 7-day expected cycle.
 * Labels from days since last check-in (call/email/sms/whatsapp/slack):
 *   ≤7 on_track · 8–13 at_risk · ≥14 missed
 * No check-in: grace if client age < 7 days → no_checkin, else missed.
 */
export function computeConsistency(params: {
  lastCheckInAt: string | null;
  clientCreatedAt: string;
  now?: Date;
}): ConsistencyResult {
  const now = params.now ?? new Date();

  if (!params.lastCheckInAt) {
    const ageDays = calendarDaysSince(params.clientCreatedAt, now);
    if (ageDays < 7) {
      return { label: "no_checkin", daysSince: null };
    }
    return { label: "missed", daysSince: null };
  }

  const daysSince = calendarDaysSince(params.lastCheckInAt, now);
  if (daysSince <= 7) return { label: "on_track", daysSince };
  if (daysSince <= 13) return { label: "at_risk", daysSince };
  return { label: "missed", daysSince };
}
