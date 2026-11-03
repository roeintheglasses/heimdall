import { lastNUtcDates, parseUtcDate, parseWrappedMonth, shiftMonth } from './months';

const now = new Date(Date.UTC(2026, 10, 3));

describe('parseWrappedMonth', () => {
  it('accepts the current and earlier months', () => {
    expect(parseWrappedMonth('2026-11', now)).toEqual({ year: 2026, month: 11 });
    expect(parseWrappedMonth('2020-01', now)).toEqual({ year: 2020, month: 1 });
  });

  it.each([
    '0050-01',
    '2019-12',
    '2026-12',
    '2027-01',
    '2026-1',
    '2026-00',
    '2026-13',
    'foo',
    '2026-+1',
  ])('rejects %s', (s) => {
    expect(parseWrappedMonth(s, now)).toBeNull();
  });

  it('uses UTC for the current month boundary', () => {
    const edge = new Date(Date.UTC(2026, 10, 30, 23, 59));
    expect(parseWrappedMonth('2026-11', edge)).not.toBeNull();
    expect(parseWrappedMonth('2026-12', edge)).toBeNull();
  });
});

describe('shiftMonth', () => {
  it('wraps across years', () => {
    expect(shiftMonth(2026, 1, -1)).toBe('2025-12');
    expect(shiftMonth(2025, 12, 1)).toBe('2026-01');
  });
});

describe('lastNUtcDates', () => {
  it('ends at the UTC date regardless of time of day', () => {
    const dates = lastNUtcDates(new Date('2026-11-03T23:30:00Z'), 3);
    expect(dates).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('spans a year without duplicates', () => {
    const dates = lastNUtcDates(new Date('2026-03-01T00:00:00Z'), 365);
    expect(dates).toHaveLength(365);
    expect(new Set(dates).size).toBe(365);
    expect(dates[364]).toBe('2026-03-01');
  });

  it('parseUtcDate gives UTC weekday', () => {
    expect(parseUtcDate('2026-11-03').getUTCDay()).toBe(2);
  });
});
