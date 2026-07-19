/** Monday–Sunday UTC week helpers for Stoplight. */

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO Monday (UTC) for the week containing `date`. */
export function mondayOf(date: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dow = d.getUTCDay(); // 0=Sun … 6=Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

export function weekBounds(weekStart: string): {
  startIso: string;
  endIso: string;
  endExclusiveIso: string;
  endDate: string;
} {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 7);
  const end = new Date(endExclusive);
  end.setUTCDate(end.getUTCDate() - 1);
  return {
    startIso: start.toISOString(),
    endIso: endExclusive.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
    endDate: toDateString(end),
  };
}

export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
  return toDateString(d);
}

/** Calendar quarter string for a date, e.g. '2026-Q3'. */
export function quarterOf(date: Date | string): string {
  const d =
    typeof date === "string"
      ? new Date(`${date}T00:00:00.000Z`)
      : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${q}`;
}

/** First day of the quarter containing `weekStart` (UTC date string). */
export function quarterStartDate(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  const qMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  return toDateString(new Date(Date.UTC(d.getUTCFullYear(), qMonth, 1)));
}

export function formatWeekLabel(weekStart: string): string {
  const { endDate } = weekBounds(weekStart);
  const fmt = (value: string) => {
    const [y, m, day] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  return `${fmt(weekStart)} – ${fmt(endDate)}`;
}

export function isFridayUtc(date: Date = new Date()): boolean {
  return date.getUTCDay() === 5;
}
