import { getBadgeContent, getTimeAgo, escapeXml } from './badge';

const now = new Date('2026-11-03T12:00:00Z');

describe('getTimeAgo', () => {
  it('formats relative times', () => {
    expect(getTimeAgo('2026-11-03T11:45:00Z', now)).toBe('just now');
    expect(getTimeAgo('2026-11-03T07:00:00Z', now)).toBe('5h ago');
    expect(getTimeAgo('2026-11-02T08:00:00Z', now)).toBe('yesterday');
    expect(getTimeAgo('2026-10-31T12:00:00Z', now)).toBe('3d ago');
    expect(getTimeAgo('2026-10-01T12:00:00Z', now)).toBe('Oct 1');
  });

  it('handles missing and invalid input', () => {
    expect(getTimeAgo(undefined, now)).toBe('N/A');
    expect(getTimeAgo('garbage', now)).toBe('N/A');
  });
});

describe('getBadgeContent', () => {
  const stats = {
    total_events: 42,
    last_24_hours: 3,
    last_event_at: '2026-11-03T09:00:00Z',
    streak: { current_streak: 4, last_active_date: '2026-11-03T00:00:00Z' },
  };

  it('uses last_event_at for the last badge', () => {
    expect(getBadgeContent('last', stats, now)).toEqual({
      label: 'Last shipped',
      value: '3h ago',
    });
  });

  it('falls back to streak.last_active_date', () => {
    const { last_event_at: _omit, ...rest } = stats;
    expect(getBadgeContent('last', rest, now).value).toBe('12h ago');
  });

  it('relabels the today badge', () => {
    expect(getBadgeContent('today', stats, now)).toEqual({ label: 'Last 24h', value: '3 events' });
  });

  it('handles streak, total and unknown types', () => {
    expect(getBadgeContent('streak', stats, now).value).toBe('4 days');
    expect(getBadgeContent('total', stats, now).value).toBe('42 events');
    expect(getBadgeContent('nope', stats, now).label).toBe('Last shipped');
  });
});

describe('escapeXml', () => {
  it('escapes markup', () => {
    expect(escapeXml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});
