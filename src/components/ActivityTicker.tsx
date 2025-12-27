'use client';

import React, { useMemo } from 'react';
import {
  DashboardEvent,
  extractService,
  getServiceById,
  EventCategory,
  ServiceType,
} from '@/types/categories';
import { useCategories } from '@/contexts/CategoryContext';
import { cn } from '@/lib/utils';
import { ChevronRight, Activity } from 'lucide-react';

// Enriched event type for ticker display
interface EnrichedEvent {
  original: DashboardEvent;
  categoryInfo: EventCategory;
  service: ServiceType | undefined;
  timeAgo: string;
}

interface ActivityTickerProps {
  events: DashboardEvent[];
  speed?: 'slow' | 'medium' | 'fast';
  pauseOnHover?: boolean;
  onEventClick?: (event: DashboardEvent) => void;
  maxEvents?: number;
  className?: string;
}

// Speed in seconds for one complete scroll
const SPEED_MAP = {
  slow: 60,
  medium: 30,
  fast: 15,
};

// Category to neon color mapping
const CATEGORY_COLORS: Record<string, string> = {
  development: 'text-neon-cyan',
  deployments: 'text-neon-magenta',
  infrastructure: 'text-neon-green',
  issues: 'text-neon-orange',
  security: 'text-neon-pink',
};

export function ActivityTicker({
  events,
  speed = 'medium',
  pauseOnHover = true,
  onEventClick,
  maxEvents = 10,
  className,
}: ActivityTickerProps) {
  const { getEventCategory } = useCategories();

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  // Get recent events limited to maxEvents
  const recentEvents = useMemo((): EnrichedEvent[] => {
    return events.slice(0, maxEvents).map((event) => ({
      original: event,
      categoryInfo: getEventCategory(event),
      service: getServiceById(extractService(event.event_type || 'unknown')),
      timeAgo: formatTimeAgo(event.created_at),
    }));
  }, [events, maxEvents, getEventCategory]);

  if (recentEvents.length === 0) {
    return null;
  }

  const tickerDuration = SPEED_MAP[speed];

  return (
    <div
      className={cn(
        'ticker-container relative overflow-hidden',
        'border-y-2 border-neon-cyan/30 bg-terminal-black/80',
        className
      )}
    >
      {/* Left fade */}
      <div className="absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-terminal-black to-transparent" />

      {/* Right fade */}
      <div className="absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-terminal-black to-transparent" />

      {/* Ticker prefix */}
      <div className="absolute bottom-0 left-0 top-0 z-20 flex items-center bg-terminal-black pl-2 pr-4">
        <div className="flex items-center gap-1 text-neon-cyan">
          <ChevronRight className="h-3 w-3 animate-pulse-slow" />
          <ChevronRight className="h-3 w-3 animate-pulse-slow" style={{ animationDelay: '0.2s' }} />
          <ChevronRight className="h-3 w-3 animate-pulse-slow" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Scrolling content */}
      <div
        className={cn(
          'flex items-center whitespace-nowrap py-2 pl-16',
          pauseOnHover && 'hover:animation-play-state-paused'
        )}
      >
        <div
          className="flex animate-ticker-scroll items-center gap-6"
          style={
            {
              '--ticker-duration': `${tickerDuration}s`,
            } as React.CSSProperties
          }
        >
          {/* First copy */}
          {recentEvents.map((enrichedEvent, index) => (
            <TickerItem
              key={`${enrichedEvent.original.id}-1`}
              enrichedEvent={enrichedEvent}
              onClick={() => onEventClick?.(enrichedEvent.original)}
              isFirst={index === 0}
            />
          ))}

          {/* Duplicate for seamless loop */}
          {recentEvents.map((enrichedEvent, index) => (
            <TickerItem
              key={`${enrichedEvent.original.id}-2`}
              enrichedEvent={enrichedEvent}
              onClick={() => onEventClick?.(enrichedEvent.original)}
              isFirst={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface TickerItemProps {
  enrichedEvent: EnrichedEvent;
  onClick?: () => void;
  isFirst?: boolean;
}

function TickerItem({ enrichedEvent, onClick, isFirst }: TickerItemProps) {
  const { original, categoryInfo, service, timeAgo } = enrichedEvent;
  const colorClass = CATEGORY_COLORS[categoryInfo.id] || 'text-neon-cyan';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 font-mono text-xs transition-opacity',
        'group cursor-pointer hover:opacity-80'
      )}
    >
      {!isFirst && <span className="text-muted-foreground/50">|</span>}

      {/* Event type */}
      <span className={cn('font-bold uppercase', colorClass)}>
        {original.event_type?.split('.').pop() || 'event'}
      </span>

      {/* Service badge */}
      {service && <span className="text-muted-foreground">[{service.name}]</span>}

      {/* Time ago */}
      <span className="text-muted-foreground/70">@{timeAgo}</span>

      {/* Hover indicator */}
      <span className="text-neon-cyan opacity-0 transition-opacity group-hover:opacity-100">
        <Activity className="h-3 w-3" />
      </span>
    </button>
  );
}

// Compact ticker for smaller spaces
export function ActivityTickerCompact({
  events,
  maxEvents = 5,
  className,
}: Pick<ActivityTickerProps, 'events' | 'maxEvents' | 'className'>) {
  const { getEventCategory } = useCategories();

  const recentEvents = useMemo(() => {
    return events.slice(0, maxEvents).map((event) => ({
      original: event,
      categoryInfo: getEventCategory(event),
    }));
  }, [events, maxEvents, getEventCategory]);

  if (recentEvents.length === 0) return null;

  return (
    <div
      className={cn('flex items-center gap-2 font-mono text-xs text-muted-foreground', className)}
    >
      <span className="text-neon-magenta">&gt;</span>
      <span>LATEST:</span>
      <div className="flex items-center gap-1">
        {recentEvents.map((enrichedEvent, index) => {
          const colorClass = CATEGORY_COLORS[enrichedEvent.categoryInfo.id] || 'text-neon-cyan';
          return (
            <span key={enrichedEvent.original.id} className="flex items-center gap-1">
              {index > 0 && <span className="text-muted-foreground/30">|</span>}
              <span className={cn('uppercase', colorClass)}>
                {enrichedEvent.original.event_type?.split('.').pop()}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
