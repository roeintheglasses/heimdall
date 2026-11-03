const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Today", "Yesterday", then "Mon 27 Oct" (with the year when it is not the current one). */
export function dayLabel(date: Date, now: Date): string {
  const diffDays = Math.round(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / DAY_MS
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  const base = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

/** Short axis label for a day: "Mon 27". */
export function shortDayLabel(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/** Splits an already ordered list into runs that share a local calendar day. */
export function groupByDay<T>(items: T[], getIso: (_item: T) => string, now: Date): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = new Date(getIso(item));
    const valid = !Number.isNaN(date.getTime());
    const key = valid ? dayKey(date) : 'unknown';
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label: valid ? dayLabel(date, now) : 'Unknown date', items: [item] });
    }
  }
  return groups;
}

/** 24-hour local clock time, e.g. "14:32". */
export function formatClockTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Relative label for events from the last 24 hours. Older events show the local
 * clock time, since the day header above them already names the date.
 */
export function formatRelativeTime(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown time';
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return formatClockTime(date);
}

/** Full local date and time for tooltips. */
export function formatExactTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${formatClockTime(date)}:${pad(date.getSeconds())}`;
}
