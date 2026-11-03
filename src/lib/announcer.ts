import { eventNoun } from '@/lib/eventDisplay';

export interface Announcement {
  type: string;
  title: string;
  /** A ready-made message, used as is when it is the only item in a batch. */
  text?: string;
}

export const ANNOUNCE_INTERVAL_MS = 5000;
/** Events that land together are batched into one message. */
export const ANNOUNCE_COALESCE_MS = 300;

export function formatAnnouncement(items: Announcement[]): string {
  if (items.length === 1 && items[0].text) return items[0].text;
  if (items.length === 1) return `New ${eventNoun(items[0].type)}: ${items[0].title}`;
  return `${items.length} new events`;
}

interface AnnouncerOptions {
  emit: (_message: string) => void;
  intervalMs?: number;
  coalesceMs?: number;
  now?: () => number;
  setTimer?: (_fn: () => void, _ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (_id: ReturnType<typeof setTimeout>) => void;
}

/**
 * Turns a stream of new events into screen reader messages: at most one
 * message per interval, with bursts collapsed into "N new events".
 */
export function createAnnouncer({
  emit,
  intervalMs = ANNOUNCE_INTERVAL_MS,
  coalesceMs = ANNOUNCE_COALESCE_MS,
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
}: AnnouncerOptions) {
  let lastEmit = -Infinity;
  let pending: Announcement[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    lastEmit = now();
    emit(formatAnnouncement(batch));
  };

  return {
    push(item: Announcement) {
      pending.push(item);
      if (timer !== null) return;
      const wait = Math.max(coalesceMs, lastEmit + intervalMs - now());
      timer = setTimer(flush, wait);
    },
    dispose() {
      if (timer !== null) clearTimer(timer);
      timer = null;
      pending = [];
    },
  };
}
