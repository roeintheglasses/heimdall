import { fireEvent, render, screen } from '@testing-library/react';
import EventCard from './EventCard';
import EventGroup from './EventGroup';
import { CategoryProvider } from '@/contexts/CategoryContext';
import { groupEventRuns } from '@/lib/eventGrouping';
import type { DashboardEvent } from '@/types/categories';

const ev = (id: string, minutesAgo: number): DashboardEvent => ({
  id,
  event_type: 'github.push',
  title: 'Private repository: 3 commits pushed',
  metadata: {},
  created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  private: true,
});

const wrap = (ui: React.ReactElement) => render(<CategoryProvider>{ui}</CategoryProvider>);

describe('EventCard', () => {
  it('is a named button that opens on Enter and Space', () => {
    const onSelect = jest.fn();
    wrap(<EventCard event={ev('a', 5)} onSelect={onSelect} />);
    const card = screen.getByRole('button', { name: /PUSH, private, 3 commits pushed, 5m ago/ });
    expect(card).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('drops the private prefix from the visible title and keeps the badge', () => {
    wrap(<EventCard event={ev('a', 5)} onSelect={() => {}} />);
    expect(screen.queryByText(/Private repository:/)).toBeNull();
    expect(screen.getByText('PRIVATE')).toBeInTheDocument();
    expect(screen.getByText('3 commits pushed')).toBeInTheDocument();
  });

  it('renders the time as a <time> element with the exact time as a tooltip', () => {
    const event = ev('a', 5);
    wrap(<EventCard event={event} onSelect={() => {}} />);
    const time = screen.getByText('5m ago');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', event.created_at);
    expect(time.getAttribute('title')).toMatch(/\d{4}, \d{2}:\d{2}:\d{2}$/);
  });
});

describe('EventGroup', () => {
  it('expands and collapses from the keyboard-reachable header button', () => {
    const items = groupEventRuns([ev('a', 1), ev('b', 4), ev('c', 8)]);
    const item = items[0];
    if (item.kind !== 'group') throw new Error('expected a group');
    wrap(<EventGroup group={item.group} onViewDetails={() => {}} />);

    const header = screen.getByRole('button', { name: /x3/ });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('button', { name: /PUSH/ })).toHaveLength(0);

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('button', { name: /PUSH/ })).toHaveLength(3);

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
  });
});
