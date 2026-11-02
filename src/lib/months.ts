export const MIN_WRAPPED_YEAR = 2020;

export interface WrappedMonth {
  year: number;
  month: number;
}

/**
 * Parses a "YYYY-MM" wrapped month. Returns null unless the year is within
 * 2020..current UTC year, the month is 1..12, and it is not after the current UTC month.
 */
export function parseWrappedMonth(s: string, now: Date = new Date()): WrappedMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(s);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  if (year < MIN_WRAPPED_YEAR) return null;

  const curYear = now.getUTCFullYear();
  const curMonth = now.getUTCMonth() + 1;
  if (year > curYear || (year === curYear && month > curMonth)) return null;

  return { year, month };
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Returns the neighbouring month key (offset -1 or +1) using UTC arithmetic. */
export function shiftMonth(year: number, month: number, offset: number): string {
  const d = new Date(Date.UTC(year, month - 1 + offset, 1));
  return formatMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function monthNameUTC(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });
}

/** Returns `days` consecutive UTC dates (YYYY-MM-DD) ending at the UTC date of `now`. */
export function lastNUtcDates(now: Date, days: number): string[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(end - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

/** Parses a YYYY-MM-DD string as a UTC midnight date. */
export function parseUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}
