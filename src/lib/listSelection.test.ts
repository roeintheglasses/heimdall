import { indexOfId, keepNewRows } from './listSelection';
import { groupEventRuns } from './eventGrouping';
import type { DashboardEvent } from '@/types/categories';

const ev = (id: string, minsAgo = 0): DashboardEvent => ({
  id,
  event_type: 'vercel.deploy',
  title: id,
  metadata: {},
  created_at: new Date(Date.UTC(2026, 10, 3, 12) - minsAgo * 60000).toISOString(),
});

describe('indexOfId', () => {
  it('follows the same item when newer events are inserted above it', () => {
    const before = [{ id: 'b' }, { id: 'c' }];
    const after = [{ id: 'a' }, ...before];
    expect(indexOfId(before, 'c')).toBe(1);
    expect(indexOfId(after, 'c')).toBe(2);
  });

  it('follows a row across a grouped and flat view', () => {
    const events = [ev('x', 0), ev('y', 400), ev('z', 800)];
    const flat = events.map((e) => ({ id: e.id }));
    const grouped = groupEventRuns(events);
    expect(indexOfId(flat, 'y')).toBe(1);
    expect(indexOfId(grouped, 'y')).toBe(1);
  });

  it('reports -1 when the item left the list or nothing is selected', () => {
    expect(indexOfId([{ id: 'a' }], 'gone')).toBe(-1);
    expect(indexOfId([{ id: 'a' }], null)).toBe(-1);
  });
});

describe('keepNewRows', () => {
  it('skips rows already in the list and duplicates within and across pages', () => {
    const kept = new Map<string, DashboardEvent>();
    const inList = new Set(['a']);
    expect(keepNewRows(kept, [ev('a'), ev('b'), ev('b'), ev('c')], inList, 10)).toBe(2);
    expect(keepNewRows(kept, [ev('c'), ev('d')], inList, 10)).toBe(1);
    expect([...kept.keys()]).toEqual(['b', 'c', 'd']);
  });

  it('stops at the cap and counts only rows kept', () => {
    const kept = new Map<string, DashboardEvent>();
    expect(keepNewRows(kept, [ev('a'), ev('b'), ev('c')], new Set(), 2)).toBe(2);
    expect(kept.size).toBe(2);
    expect(keepNewRows(kept, [ev('d')], new Set(), 2)).toBe(0);
  });
});
