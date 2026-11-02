import type { DashboardEvent } from '@/types/categories';

export const MAX_EVENTS = 500;

function timeOf(e: DashboardEvent): number {
  const t = Date.parse(e.created_at);
  return Number.isNaN(t) ? 0 : t;
}

/** Prepends newer events, dropping ids already present, sorted newest first (stable), capped at max. */
export function mergeNewest(
  prev: DashboardEvent[],
  incoming: DashboardEvent[],
  max: number = MAX_EVENTS
): DashboardEvent[] {
  const seen = new Set<string>();
  const out: DashboardEvent[] = [];
  for (const e of [...incoming, ...prev]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  out.sort((a, b) => timeOf(b) - timeOf(a));
  return out.slice(0, max);
}

/** Appends older events, dropping ids already present, capped at max. */
export function mergeOlder(
  prev: DashboardEvent[],
  incoming: DashboardEvent[],
  max: number = MAX_EVENTS
): DashboardEvent[] {
  const seen = new Set<string>();
  const out: DashboardEvent[] = [];
  for (const e of [...prev, ...incoming]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out.slice(0, max);
}
