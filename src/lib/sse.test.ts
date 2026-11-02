import { diffEvents, formatSSE, formatStatus } from './sse';

const ev = (id: string, created_at: string) => ({ id, created_at });

describe('diffEvents', () => {
  it('primes on the first poll without broadcasting', () => {
    const r = diffEvents(null, [ev('a', '2026-01-02T00:00:00Z'), ev('b', '2026-01-01T00:00:00Z')]);
    expect(r.newEvents).toEqual([]);
    expect([...r.nextIds]).toEqual(['a', 'b']);
  });

  it('returns new events oldest first', () => {
    const seen = new Set(['a']);
    const r = diffEvents(seen, [
      ev('c', '2026-01-03T00:00:00Z'),
      ev('b', '2026-01-02T00:00:00Z'),
      ev('a', '2026-01-01T00:00:00Z'),
    ]);
    expect(r.newEvents.map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('still broadcasts unseen events with older created_at', () => {
    const seen = new Set(['a']);
    const r = diffEvents(seen, [
      ev('a', '2026-01-05T00:00:00Z'),
      ev('late', '2026-01-01T00:00:00Z'),
    ]);
    expect(r.newEvents.map((e) => e.id)).toEqual(['late']);
  });

  it('breaks timestamp ties by id and dedupes within a batch', () => {
    const seen = new Set<string>();
    const r = diffEvents(seen, [
      ev('z', '2026-01-01T00:00:00Z'),
      ev('m', '2026-01-01T00:00:00Z'),
      ev('m', '2026-01-01T00:00:00Z'),
    ]);
    expect(r.newEvents.map((e) => e.id)).toEqual(['m', 'z']);
  });

  it('does not rebroadcast ids seen previously', () => {
    const r = diffEvents(new Set(['a', 'b']), [
      ev('a', '2026-01-01T00:00:00Z'),
      ev('b', '2026-01-02T00:00:00Z'),
    ]);
    expect(r.newEvents).toEqual([]);
  });
});

describe('formatSSE', () => {
  it('includes an id field and a JSON data line', () => {
    const out = formatSSE({ id: 'abc', title: 't' } as { id: string });
    expect(out).toBe('id: abc\ndata: {"id":"abc","title":"t"}\n\n');
  });
  it('formats status messages', () => {
    expect(formatStatus('down')).toBe('event: status\ndata: {"backend":"down"}\n\n');
  });
});
