'use client';

import { useId, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import EventCard, { getNeonColors } from '@/components/EventCard';
import EventTime from '@/components/EventTime';
import { ServiceIcon } from '@/components/ServiceIcon';
import { useCategories } from '@/contexts/CategoryContext';
import { groupTitle, type EventGroup as EventGroupData } from '@/lib/eventGrouping';
import { DashboardEvent } from '@/types/categories';
import { getServiceFromEventType } from '@/types/services';
import { cn } from '@/lib/utils';

interface EventGroupProps {
  group: EventGroupData;
  isSelected?: boolean;
  navIndex?: number;
  onFocus?: () => void;
  onViewDetails: (_event: DashboardEvent) => void;
}

/** A run of related events collapsed into one expandable row. */
export default function EventGroup({
  group,
  isSelected = false,
  navIndex,
  onFocus,
  onViewDetails,
}: EventGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const { getEventCategory } = useCategories();

  const newest = group.events[0];
  const colors = getNeonColors(getEventCategory(newest).color);
  const serviceInfo = getServiceFromEventType(group.eventType || 'unknown');
  const title = groupTitle(group);

  return (
    <div
      className={cn(
        'border-2 border-l-4 bg-terminal-black',
        colors.border,
        isSelected && 'event-selected'
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        data-nav-index={navIndex}
        onClick={() => setExpanded((open) => !open)}
        onFocus={onFocus}
        className={cn(
          'flex min-h-[48px] w-full items-center gap-2 px-3 py-3 text-left font-mono xs:gap-3 xs:px-4',
          'hover:bg-neon-cyan/5 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-inset focus-visible:ring-neon-cyan'
        )}
      >
        {expanded ? (
          <ChevronDown className={cn('h-4 w-4 shrink-0', colors.text)} aria-hidden="true" />
        ) : (
          <ChevronRight className={cn('h-4 w-4 shrink-0', colors.text)} aria-hidden="true" />
        )}
        <ServiceIcon service={serviceInfo} className={cn('h-4 w-4 shrink-0', colors.text)} />
        <span
          className={cn(
            'shrink-0 border px-1.5 text-xs font-bold tabular-nums',
            colors.border,
            colors.bg,
            colors.text
          )}
        >
          x{group.events.length}
        </span>
        {group.isPrivate && (
          <span className="shrink-0 border border-neon-orange px-1.5 text-xs uppercase text-neon-orange">
            PRIVATE
          </span>
        )}
        <span className="flex-1 truncate text-xs xs:text-sm">
          <span className="mr-1 text-neon-magenta" aria-hidden="true">
            &gt;
          </span>
          {title}
        </span>
        <EventTime iso={newest.created_at} className="shrink-0 text-xs text-muted-foreground" />
      </button>

      {expanded && (
        <ul id={panelId} className="space-y-2 border-t border-neon-cyan/20 p-3 sm:p-4">
          {group.events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} onSelect={() => onViewDetails(event)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
