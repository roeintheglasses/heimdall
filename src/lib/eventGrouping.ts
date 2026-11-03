import { DashboardEvent, extractRepository } from '@/types/categories';
import { eventNoun } from '@/lib/eventDisplay';

/** Public events join a run when they are at most this far apart. */
export const PUBLIC_GROUP_GAP_MS = 15 * 60 * 1000;
/** Private events have no repo, so the type and a longer gap are all there is to go on. */
export const PRIVATE_GROUP_GAP_MS = 30 * 60 * 1000;

export interface EventGroup {
  /** Stable while newer events join: derived from the oldest event in the run. */
  id: string;
  eventType: string;
  isPrivate: boolean;
  repo: string | null;
  /** Newest first. */
  events: DashboardEvent[];
  newest: Date;
  oldest: Date;
}

export type ListItem =
  | { kind: 'event'; id: string; event: DashboardEvent }
  | { kind: 'group'; id: string; group: EventGroup };

function timeOf(e: DashboardEvent): number {
  const t = Date.parse(e.created_at);
  return Number.isNaN(t) ? 0 : t;
}

function repoKey(e: DashboardEvent): string | null {
  if (e.private) return null;
  const repo = extractRepository(e);
  return repo ? repo.toLowerCase() : null;
}

/** Whether `next` (older) continues a run whose last member is `last`. */
function continuesRun(last: DashboardEvent, next: DashboardEvent): boolean {
  if (last.event_type !== next.event_type) return false;
  const lastPrivate = Boolean(last.private);
  if (lastPrivate !== Boolean(next.private)) return false;
  const gap = Math.abs(timeOf(last) - timeOf(next));
  if (lastPrivate) return gap <= PRIVATE_GROUP_GAP_MS;
  const repo = repoKey(last);
  return repo !== null && repo === repoKey(next) && gap <= PUBLIC_GROUP_GAP_MS;
}

/**
 * Collapses runs of adjacent events into groups. `events` must be sorted newest
 * first. Public events group by type and repo, private events by type alone.
 * The gap is measured between neighbours, so a steady trickle stays one group.
 */
export function groupEventRuns(events: DashboardEvent[]): ListItem[] {
  const items: ListItem[] = [];
  let run: DashboardEvent[] = [];

  const flush = () => {
    if (run.length === 0) return;
    if (run.length === 1) {
      items.push({ kind: 'event', id: run[0].id, event: run[0] });
    } else {
      const oldestEvent = run[run.length - 1];
      items.push({
        kind: 'group',
        id: `group-${oldestEvent.id}`,
        group: {
          id: `group-${oldestEvent.id}`,
          eventType: run[0].event_type,
          isPrivate: Boolean(run[0].private),
          repo: run[0].private ? null : extractRepository(run[0]),
          events: run,
          newest: new Date(run[0].created_at),
          oldest: new Date(oldestEvent.created_at),
        },
      });
    }
    run = [];
  };

  for (const event of events) {
    if (run.length > 0 && !continuesRun(run[run.length - 1], event)) flush();
    run.push(event);
  }
  flush();
  return items;
}

/** One entry per event, no grouping. */
export function flatItems(events: DashboardEvent[]): ListItem[] {
  return events.map((event) => ({ kind: 'event', id: event.id, event }));
}

export function groupTitle(group: EventGroup): string {
  const count = group.events.length;
  const base = `${count} ${eventNoun(group.eventType, count)}`;
  return group.repo ? `${base} in ${group.repo}` : base;
}
