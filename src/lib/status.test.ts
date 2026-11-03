import { formatLastEvent, statusView, fetchSystemStatus } from './status';

describe('statusView', () => {
  it('shows OPERATIONAL only when the backend is up', () => {
    expect(statusView('up')).toEqual({ label: 'OPERATIONAL', tone: 'ok' });
    expect(statusView('down').label).toBe('DEGRADED');
    expect(statusView('unreachable').label).toBe('OFFLINE');
    expect(statusView('loading')).toEqual({ label: 'LOADING', tone: 'neutral' });
  });
});

describe('formatLastEvent', () => {
  const now = new Date('2026-11-03T12:00:00Z');
  it.each([
    ['2026-11-03T11:59:30Z', 'just now'],
    ['2026-11-03T11:15:00Z', '45m ago'],
    ['2026-11-03T09:00:00Z', '3h ago'],
    ['2026-11-01T12:00:00Z', '2d ago'],
    [null, 'none yet'],
    ['garbage', 'none yet'],
  ])('%s -> %s', (iso, want) => {
    expect(formatLastEvent(iso, now)).toBe(want);
  });
});

describe('fetchSystemStatus', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });
  const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

  it('reports up with the last event time', async () => {
    global.fetch = jest.fn(async (url: RequestInfo | URL) =>
      String(url).endsWith('/api/health')
        ? json({ backend: 'up' })
        : json({ last_event_at: '2026-11-03T09:00:00Z' })
    ) as typeof fetch;
    await expect(fetchSystemStatus('http://b/')).resolves.toEqual({
      backend: 'up',
      lastEventAt: '2026-11-03T09:00:00Z',
    });
  });

  it('reports down when the frontend says the backend is down', async () => {
    global.fetch = jest.fn(async () => json({ backend: 'down' })) as typeof fetch;
    await expect(fetchSystemStatus('http://b')).resolves.toEqual({
      backend: 'down',
      lastEventAt: null,
    });
  });

  it('reports unreachable when the health route fails', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network');
    }) as typeof fetch;
    await expect(fetchSystemStatus('http://b')).resolves.toMatchObject({ backend: 'unreachable' });
  });
});
