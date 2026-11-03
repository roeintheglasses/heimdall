export interface StreamEvent {
  id: string;
  created_at: string;
  [key: string]: unknown;
}

export interface DiffResult<T extends StreamEvent> {
  newEvents: T[];
  nextIds: Set<string>;
}

function compareEvents(a: StreamEvent, b: StreamEvent): number {
  const ta = Date.parse(a.created_at);
  const tb = Date.parse(b.created_at);
  const na = Number.isNaN(ta) ? 0 : ta;
  const nb = Number.isNaN(tb) ? 0 : tb;
  if (na !== nb) return na - nb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Compares the latest page of events against the ids seen so far.
 * seenIds === null means the poller is not primed: nothing is broadcast.
 * New events come back oldest first.
 */
export function diffEvents<T extends StreamEvent>(
  seenIds: Set<string> | null,
  events: T[]
): DiffResult<T> {
  const nextIds = new Set(events.map((e) => e.id));
  if (seenIds === null) {
    return { newEvents: [], nextIds };
  }
  const seenInBatch = new Set<string>();
  const newEvents: T[] = [];
  for (const e of events) {
    if (seenIds.has(e.id) || seenInBatch.has(e.id)) continue;
    seenInBatch.add(e.id);
    newEvents.push(e);
  }
  newEvents.sort(compareEvents);
  return { newEvents, nextIds };
}

/** Formats a new event as an SSE message carrying an id field. */
export function formatSSE(event: { id: string }): string {
  return `id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function formatStatus(backend: 'up' | 'down'): string {
  return `event: status\ndata: ${JSON.stringify({ backend })}\n\n`;
}

export const SSE_HEARTBEAT = ': hb\n\n';
export const SSE_RETRY = 'retry: 3000\n\n';
