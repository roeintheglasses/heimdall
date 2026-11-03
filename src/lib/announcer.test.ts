import { act, renderHook } from '@testing-library/react';
import { createAnnouncer, formatAnnouncement, ANNOUNCE_INTERVAL_MS } from './announcer';
import { useLiveAnnouncer } from '@/hooks/useLiveAnnouncer';

describe('formatAnnouncement', () => {
  it('names a single event', () => {
    expect(formatAnnouncement([{ type: 'github.push', title: 'Fix the thing' }])).toBe(
      'New push: Fix the thing'
    );
  });

  it('batches several events into a count', () => {
    const item = { type: 'github.push', title: 't' };
    expect(formatAnnouncement([item, item, item])).toBe('3 new events');
  });
});

describe('createAnnouncer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const push = { type: 'github.push', title: 'one' };

  it('announces one event shortly after it arrives', () => {
    const emit = jest.fn();
    const a = createAnnouncer({ emit });
    a.push(push);
    expect(emit).not.toHaveBeenCalled();
    jest.advanceTimersByTime(400);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('New push: one');
    a.dispose();
  });

  it('batches a burst into one message', () => {
    const emit = jest.fn();
    const a = createAnnouncer({ emit });
    a.push(push);
    a.push(push);
    a.push(push);
    jest.advanceTimersByTime(400);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('3 new events');
    a.dispose();
  });

  it('sends at most one message per interval', () => {
    const emit = jest.fn();
    const a = createAnnouncer({ emit });
    a.push(push);
    jest.advanceTimersByTime(400);
    expect(emit).toHaveBeenCalledTimes(1);

    // Two more arrive 1 s and 2 s later: held back until the interval is over.
    jest.advanceTimersByTime(1000);
    a.push(push);
    jest.advanceTimersByTime(1000);
    a.push(push);
    jest.advanceTimersByTime(2000);
    expect(emit).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(ANNOUNCE_INTERVAL_MS);
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith('2 new events');
    a.dispose();
  });

  it('announces immediately again after a quiet interval', () => {
    const emit = jest.fn();
    const a = createAnnouncer({ emit });
    a.push(push);
    jest.advanceTimersByTime(400);
    jest.advanceTimersByTime(ANNOUNCE_INTERVAL_MS * 2);
    a.push({ type: 'vercel.deploy', title: 'two' });
    jest.advanceTimersByTime(400);
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith('New deploy: two');
    a.dispose();
  });

  it('drops pending messages on dispose', () => {
    const emit = jest.fn();
    const a = createAnnouncer({ emit });
    a.push(push);
    a.dispose();
    jest.advanceTimersByTime(10_000);
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('useLiveAnnouncer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('exposes the throttled message for the live region', () => {
    const { result } = renderHook(() => useLiveAnnouncer());
    expect(result.current.message.text).toBe('');

    act(() => {
      result.current.announce({ type: 'github.push', title: 'a' });
      result.current.announce({ type: 'github.push', title: 'b' });
      jest.advanceTimersByTime(400);
    });
    expect(result.current.message.text).toBe('2 new events');

    act(() => {
      result.current.announce({ type: 'github.pr', title: 'c' });
      jest.advanceTimersByTime(1000);
    });
    // Still inside the interval: the message has not changed.
    expect(result.current.message.text).toBe('2 new events');

    act(() => {
      jest.advanceTimersByTime(ANNOUNCE_INTERVAL_MS);
    });
    expect(result.current.message.text).toBe('New pull request: c');
  });
});

describe('ready-made messages', () => {
  it('uses the text of a lone item as is', () => {
    expect(formatAnnouncement([{ type: 'search', title: '', text: 'Searched all 5 events' }])).toBe(
      'Searched all 5 events'
    );
  });
});
