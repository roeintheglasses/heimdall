'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/contexts/CategoryContext';
import { DashboardEvent } from '@/types/categories';
import { ServiceIcon } from '@/components/ServiceIcon';
import { getServiceFromEventType } from '@/types/services';
import EventTime from '@/components/EventTime';
import { useNow } from '@/contexts/NowContext';
import { displayTitle, eventTypeLabel } from '@/lib/eventDisplay';
import { formatRelativeTime } from '@/lib/time';
import { cn } from '@/lib/utils';

// Category to neon color mapping
const CATEGORY_NEON_COLORS: Record<
  string,
  { border: string; bg: string; text: string; shadow: string }
> = {
  blue: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    shadow: 'shadow-[4px_4px_0_hsl(180_100%_50%)]',
  },
  green: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
    shadow: 'shadow-[4px_4px_0_hsl(300_100%_50%)]',
  },
  purple: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    shadow: 'shadow-[4px_4px_0_hsl(120_100%_50%)]',
  },
  red: {
    border: 'border-neon-orange',
    bg: 'bg-neon-orange/10',
    text: 'text-neon-orange',
    shadow: 'shadow-[4px_4px_0_hsl(30_100%_50%)]',
  },
  orange: {
    border: 'border-neon-pink',
    bg: 'bg-neon-pink/10',
    text: 'text-neon-pink',
    shadow: 'shadow-[4px_4px_0_hsl(330_100%_60%)]',
  },
};

export function getNeonColors(categoryColor: string) {
  return CATEGORY_NEON_COLORS[categoryColor] || CATEGORY_NEON_COLORS.blue;
}

interface EventCardProps {
  event: DashboardEvent;
  isSelected?: boolean;
  onSelect?: () => void;
  /** Position among the list's selectable rows, used by keyboard navigation. */
  navIndex?: number;
  onFocus?: () => void;
}

// Get event-specific animation class
function getEventAnimation(eventType: string, isNew: boolean): string {
  if (!isNew) return '';

  // GitHub events - slide in from left
  if (eventType.startsWith('github.')) {
    return 'animate-slide-in-left-arrow glow-cyan';
  }

  // Deploy events - fade with glow pulse
  if (eventType.includes('deploy')) {
    if (eventType.startsWith('vercel.')) {
      return 'animate-fade-glow-pulse glow-magenta';
    }
    if (eventType.startsWith('railway.')) {
      return 'animate-fade-glow-pulse glow-green';
    }
    return 'animate-fade-glow-pulse glow-cyan';
  }

  // Error events - shake glitch
  if (eventType.includes('error') || eventType.includes('fail')) {
    return 'animate-shake-glitch glow-orange';
  }

  // Security events - shield pulse
  if (eventType.startsWith('security.')) {
    return 'animate-shield-pulse glow-pink';
  }

  // Default animation
  return 'animate-in slide-in-from-top-4 fade-in-0 motion-reduce:animate-none';
}

export default function EventCard({
  event,
  isSelected = false,
  onSelect,
  navIndex,
  onFocus,
}: EventCardProps) {
  const { getEventCategory } = useCategories();
  const now = useNow();

  // Get animation class based on event type
  const animationClass = getEventAnimation(event.event_type || 'unknown', !!event.isNew);

  // Get category and service info for this event
  const category = getEventCategory(event);
  const serviceInfo = getServiceFromEventType(event.event_type || 'unknown');
  const neonColors = getNeonColors(category.color);

  const typeLabel = eventTypeLabel(event.event_type || 'unknown');
  const title = displayTitle(event);
  const ariaLabel = [
    typeLabel,
    event.private ? 'private' : null,
    title,
    formatRelativeTime(event.created_at, now),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      role={onSelect ? 'button' : undefined}
      aria-label={onSelect ? ariaLabel : undefined}
      aria-haspopup={onSelect ? 'dialog' : undefined}
      data-nav-index={navIndex}
      className={cn(
        // Base terminal styling
        'group relative overflow-hidden transition-all duration-200',
        'border-2 bg-terminal-black',
        neonColors.border,
        // Left accent border
        'border-l-4',
        // Hover effects (no movement when reduced motion is requested)
        'hover:shadow-retro motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5',
        // Visible keyboard focus
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-black',
        // New event animation (type-specific)
        event.isNew && animationClass,
        event.isNew && 'ring-2 ring-neon-cyan',
        // Selection styling
        isSelected && 'event-selected',
        onSelect && 'cursor-pointer'
      )}
      onClick={onSelect}
      onFocus={onFocus}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardContent className="flex min-h-[48px] items-center gap-2 px-3 py-3 xs:gap-3 xs:px-4">
        {/* Service Icon - compact inline */}
        <ServiceIcon
          service={serviceInfo}
          className={cn('h-3.5 w-3.5 shrink-0 xs:h-4 xs:w-4', neonColors.text)}
        />

        {/* Event Type Badge */}
        <Badge
          variant="outline"
          className={cn('shrink-0 px-1 py-0 text-xs xs:px-1.5', neonColors.text, neonColors.border)}
        >
          {typeLabel}
        </Badge>

        {event.private && (
          <Badge
            variant="outline"
            className="shrink-0 border-neon-orange px-1 py-0 text-xs text-neon-orange xs:px-1.5"
          >
            PRIVATE
          </Badge>
        )}

        {/* Title - truncated */}
        <span
          className={cn(
            'flex-1 truncate font-mono text-xs xs:text-sm',
            'transition-colors duration-200 group-hover:text-neon-cyan'
          )}
        >
          <span className="mr-1 text-neon-magenta">&gt;</span>
          {title}
        </span>

        {/* Timestamp */}
        <EventTime
          iso={event.created_at}
          className="shrink-0 font-mono text-xs text-muted-foreground"
        />
      </CardContent>
    </Card>
  );
}
