import { dayLabel, groupByDay, formatRelativeTime, formatExactTime, dayKey } from './time';

// Local-time constructors so the tests hold in any timezone.
const local = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const NOW = local(2026, 11, 3, 15, 30); // Tue 3 Nov 2026, 15:30

describe('dayLabel', () => {
  it('names today and yesterday', () => {
    expect(dayLabel(local(2026, 11, 3, 0, 5), NOW)).toBe('Today');
    expect(dayLabel(local(2026, 11, 3, 23, 59), NOW)).toBe('Today');
    expect(dayLabel(local(2026, 11, 2, 23, 59), NOW)).toBe('Yesterday');
    expect(dayLabel(local(2026, 11, 2, 0, 1), NOW)).toBe('Yesterday');
  });

  it('formats older days as weekday, day and month', () => {
    expect(dayLabel(local(2026, 10, 27), NOW)).toBe('Tue 27 Oct');
    expect(dayLabel(local(2026, 11, 1), NOW)).toBe('Sun 1 Nov');
  });

  it('adds the year when it differs from the current one', () => {
    expect(dayLabel(local(2025, 12, 31), NOW)).toBe('Wed 31 Dec 2025');
  });

  it('uses the local day, not the UTC day, around midnight', () => {
    const justAfterMidnight = local(2026, 11, 3, 0, 30);
    expect(dayLabel(justAfterMidnight, local(2026, 11, 3, 23, 0))).toBe('Today');
  });
});

describe('groupByDay', () => {
  const ev = (id: string, d: Date) => ({ id, at: d.toISOString() });

  it('splits an ordered list into day sections with labels', () => {
    const items = [
      ev('a', local(2026, 11, 3, 14)),
      ev('b', local(2026, 11, 3, 9)),
      ev('c', local(2026, 11, 2, 22)),
      ev('d', local(2026, 10, 27, 8)),
    ];
    const groups = groupByDay(items, (i) => i.at, NOW);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Tue 27 Oct']);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([['a', 'b'], ['c'], ['d']]);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByDay([], () => '', NOW)).toEqual([]);
  });

  it('keeps events with an unreadable date together under their own header', () => {
    const groups = groupByDay([{ at: 'nope' }], (i) => i.at, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Unknown date');
  });

  it('keys days by local date', () => {
    expect(dayKey(local(2026, 1, 5))).toBe('2026-01-05');
  });
});

describe('formatRelativeTime', () => {
  const at = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();

  it('refreshes from seconds to minutes to hours', () => {
    expect(formatRelativeTime(at(5_000), NOW)).toBe('just now');
    expect(formatRelativeTime(at(5 * 60_000), NOW)).toBe('5m ago');
    expect(formatRelativeTime(at(3 * 3_600_000), NOW)).toBe('3h ago');
  });

  it('moves on with the clock', () => {
    const iso = at(0);
    expect(formatRelativeTime(iso, NOW)).toBe('just now');
    expect(formatRelativeTime(iso, new Date(NOW.getTime() + 61_000))).toBe('1m ago');
  });

  it('shows the local clock time once an event is a day old', () => {
    expect(formatRelativeTime(local(2026, 11, 2, 9, 5).toISOString(), NOW)).toBe('09:05');
  });

  it('treats a timestamp slightly in the future as now', () => {
    expect(formatRelativeTime(at(-30_000), NOW)).toBe('just now');
  });

  it('survives garbage', () => {
    expect(formatRelativeTime('x', NOW)).toBe('unknown time');
  });
});

describe('formatExactTime', () => {
  it('gives the full local date and time', () => {
    expect(formatExactTime(local(2026, 10, 27, 14, 32).toISOString())).toBe(
      'Tue 27 Oct 2026, 14:32:00'
    );
  });
});
