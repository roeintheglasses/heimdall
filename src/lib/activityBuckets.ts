import type { DashboardEvent } from '@/types/categories';
import { dayKey, shortDayLabel, startOfLocalDay } from '@/lib/time';

export const GRAPH_DAYS = 7;

export interface DayBucket {
  key: string;
  label: string;
  github: number;
  vercel: number;
  railway: number;
  other: number;
  total: number;
}

/** One bucket per local calendar day, oldest first, ending with today. */
export function buildDailyBuckets(
  events: DashboardEvent[],
  now: Date = new Date(),
  days: number = GRAPH_DAYS
): DayBucket[] {
  const today = startOfLocalDay(now);
  const buckets: DayBucket[] = [];
  const byKey = new Map<string, DayBucket>();

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const bucket: DayBucket = {
      key: dayKey(day),
      label: i === 0 ? 'Today' : shortDayLabel(day),
      github: 0,
      vercel: 0,
      railway: 0,
      other: 0,
      total: 0,
    };
    buckets.push(bucket);
    byKey.set(bucket.key, bucket);
  }

  for (const event of events) {
    const date = new Date(event.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const bucket = byKey.get(dayKey(date));
    if (!bucket) continue;
    const type = event.event_type || '';
    if (type.startsWith('github.')) bucket.github++;
    else if (type.startsWith('vercel.')) bucket.vercel++;
    else if (type.startsWith('railway.')) bucket.railway++;
    else bucket.other++;
    bucket.total++;
  }
  return buckets;
}

export function totalInBuckets(buckets: DayBucket[]): number {
  return buckets.reduce((sum, b) => sum + b.total, 0);
}
