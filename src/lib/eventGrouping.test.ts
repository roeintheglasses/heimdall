import {
  groupEventRuns,
  groupTitle,
  flatItems,
  PRIVATE_GROUP_GAP_MS,
  PUBLIC_GROUP_GAP_MS,
} from './eventGrouping';
import type { DashboardEvent } from '@/types/categories';

const BASE = Date.UTC(2026, 10, 3, 12, 0, 0);
const min = (m: number) => m * 60 * 1000;

let n = 0;
function ev(
  type: string,
  minutesAgo: number,
  opts: { repo?: string; private?: boolean } = {}
): DashboardEvent {
  n += 1;
  return {
    id: `e${n}`,
    event_type: type,
    title: `${type} ${n}`,
    metadata: opts.repo ? { repo: opts.repo } : {},
    created_at: new Date(BASE - min(minutesAgo)).toISOString(),
    private: opts.private,
  };
}

describe('groupEventRuns: public events', () => {
  it('groups a run of the same type from the same repo', () => {
    const items = groupEventRuns([
      ev('github.push', 0, { repo: 'heimdall' }),
      ev('github.push', 3, { repo: 'heimdall' }),
      ev('github.push', 6, { repo: 'heimdall' }),
    ]);
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.kind).toBe('group');
    if (item.kind === 'group') {
      expect(item.group.events).toHaveLength(3);
      expect(item.group.repo).toBe('heimdall');
      expect(item.group.isPrivate).toBe(false);
      expect(groupTitle(item.group)).toBe('3 pushes in heimdall');
    }
  });

  it('does not group different repos or different types', () => {
    const items = groupEventRuns([
      ev('github.push', 0, { repo: 'a' }),
      ev('github.push', 1, { repo: 'b' }),
      ev('github.pr', 2, { repo: 'b' }),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['event', 'event', 'event']);
  });

  it('matches repos regardless of case', () => {
    const items = groupEventRuns([
      ev('github.push', 0, { repo: 'Heimdall' }),
      ev('github.push', 1, { repo: 'heimdall' }),
    ]);
    expect(items).toHaveLength(1);
  });

  it('splits a run when the gap is too long', () => {
    const gap = PUBLIC_GROUP_GAP_MS / 60000 + 1;
    const items = groupEventRuns([
      ev('github.push', 0, { repo: 'a' }),
      ev('github.push', gap, { repo: 'a' }),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['event', 'event']);
  });

  it('measures the gap between neighbours, so a steady trickle stays together', () => {
    const step = PUBLIC_GROUP_GAP_MS / 60000 - 1;
    const items = groupEventRuns([
      ev('github.push', 0, { repo: 'a' }),
      ev('github.push', step, { repo: 'a' }),
      ev('github.push', step * 2, { repo: 'a' }),
    ]);
    expect(items).toHaveLength(1);
  });

  it('never groups public events that have no repo', () => {
    const items = groupEventRuns([ev('github.push', 0), ev('github.push', 1)]);
    expect(items.map((i) => i.kind)).toEqual(['event', 'event']);
  });

  it('ends a run when another type sits between two events', () => {
    const items = groupEventRuns([
      ev('github.push', 0, { repo: 'a' }),
      ev('vercel.deploy', 1, { repo: 'a' }),
      ev('github.push', 2, { repo: 'a' }),
    ]);
    expect(items).toHaveLength(3);
  });
});

describe('groupEventRuns: private events', () => {
  it('groups by type alone, since redaction removes the repo', () => {
    const items = groupEventRuns([
      ev('github.push', 0, { private: true }),
      ev('github.push', 10, { private: true }),
      ev('github.push', 25, { private: true }),
    ]);
    expect(items).toHaveLength(1);
    if (items[0].kind === 'group') {
      expect(items[0].group.isPrivate).toBe(true);
      expect(items[0].group.repo).toBeNull();
      expect(groupTitle(items[0].group)).toBe('3 pushes');
    }
  });

  it('uses the longer private gap and splits beyond it', () => {
    const within = PRIVATE_GROUP_GAP_MS / 60000;
    expect(
      groupEventRuns([
        ev('github.push', 0, { private: true }),
        ev('github.push', within, { private: true }),
      ])
    ).toHaveLength(1);
    expect(
      groupEventRuns([
        ev('github.push', 0, { private: true }),
        ev('github.push', within + 1, { private: true }),
      ])
    ).toHaveLength(2);
  });

  it('does not group different private types', () => {
    const items = groupEventRuns([
      ev('github.push', 0, { private: true }),
      ev('github.pr', 1, { private: true }),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['event', 'event']);
  });

  it('keeps private and public events of the same type apart', () => {
    const items = groupEventRuns([
      ev('github.push', 0, { private: true }),
      ev('github.push', 1, { repo: 'a' }),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['event', 'event']);
  });

  it('ignores a repo in the metadata of a private event', () => {
    const a = ev('github.push', 0, { private: true, repo: 'x' });
    const b = ev('github.push', 1, { private: true, repo: 'y' });
    expect(groupEventRuns([a, b])).toHaveLength(1);
  });
});

describe('groupEventRuns: ids and order', () => {
  it('keeps the group id stable when newer events join', () => {
    const oldest = ev('github.push', 10, { private: true });
    const middle = ev('github.push', 5, { private: true });
    const before = groupEventRuns([middle, oldest])[0];
    const after = groupEventRuns([ev('github.push', 0, { private: true }), middle, oldest])[0];
    expect(before.id).toBe(after.id);
  });

  it('keeps events newest first inside a group', () => {
    const items = groupEventRuns([
      ev('github.push', 0, { private: true }),
      ev('github.push', 5, { private: true }),
    ]);
    if (items[0].kind === 'group') {
      const times = items[0].group.events.map((e) => Date.parse(e.created_at));
      expect(times[0]).toBeGreaterThan(times[1]);
      expect(items[0].group.newest.getTime()).toBe(times[0]);
    }
  });

  it('returns nothing for an empty list and one item per event when flat', () => {
    expect(groupEventRuns([])).toEqual([]);
    expect(flatItems([ev('github.push', 0), ev('github.push', 1)])).toHaveLength(2);
  });
});
