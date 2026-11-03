import type { DashboardEvent } from '@/types/categories';

/** Index of the item with this id, or -1. Selection is stored by id so list changes cannot shift it. */
export function indexOfId(items: ReadonlyArray<{ id: string }>, id: string | null): number {
  if (id === null) return -1;
  return items.findIndex((item) => item.id === id);
}

/**
 * Adds rows from a fetched page to `kept`, skipping ids already in the main
 * list or already kept, and stopping at `cap`. Returns how many were added.
 */
export function keepNewRows(
  kept: Map<string, DashboardEvent>,
  page: DashboardEvent[],
  inList: ReadonlySet<string>,
  cap: number
): number {
  let added = 0;
  for (const e of page) {
    if (kept.size >= cap) break;
    if (inList.has(e.id) || kept.has(e.id)) continue;
    kept.set(e.id, e);
    added++;
  }
  return added;
}
