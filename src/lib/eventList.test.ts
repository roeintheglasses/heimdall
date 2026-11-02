import { mergeNewest, mergeOlder } from './eventList';
import type { DashboardEvent } from '@/types/categories';

const ev = (id: string) =>
  ({ id, event_type: 'github.push', title: id, metadata: {}, created_at: '' }) as DashboardEvent;
const ids = (l: DashboardEvent[]) => l.map((e) => e.id);

describe('mergeNewest', () => {
  it('prepends and dedupes by id', () => {
    expect(ids(mergeNewest([ev('a'), ev('b')], [ev('c'), ev('a')]))).toEqual(['c', 'a', 'b']);
  });
  it('caps the list', () => {
    expect(ids(mergeNewest([ev('a'), ev('b')], [ev('c')], 2))).toEqual(['c', 'a']);
  });
});

describe('mergeOlder', () => {
  it('appends and dedupes by id', () => {
    expect(ids(mergeOlder([ev('a'), ev('b')], [ev('b'), ev('c')]))).toEqual(['a', 'b', 'c']);
  });
  it('caps the list', () => {
    expect(ids(mergeOlder([ev('a'), ev('b')], [ev('c')], 2))).toEqual(['a', 'b']);
  });
});

describe('mergeNewest ordering', () => {
  it('sorts by created_at descending when a refetch interleaves', () => {
    const at = (id: string, t: string) => ({ ...ev(id), created_at: t });
    const merged = mergeNewest(
      [at('new', '2026-01-03T00:00:00Z'), at('old', '2026-01-01T00:00:00Z')],
      [at('mid', '2026-01-02T00:00:00Z')]
    );
    expect(ids(merged)).toEqual(['new', 'mid', 'old']);
  });
});
