'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/contexts/CategoryContext';
import { DashboardEvent } from '@/types/categories';
import { ServiceIcon } from '@/components/ServiceIcon';
import { getServiceFromEventType } from '@/types/services';
import { cn } from '@/lib/utils';

// Format relative timestamp - defined outside component for reuse
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

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

function getNeonColors(categoryColor: string) {
  return CATEGORY_NEON_COLORS[categoryColor] || CATEGORY_NEON_COLORS.blue;
}

interface EventCardProps {
  event: DashboardEvent;
  isSelected?: boolean;
  onSelect?: () => void;
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
  return 'animate-in slide-in-from-top-4 fade-in-0';
}

export default function EventCard({ event, isSelected = false, onSelect }: EventCardProps) {
  const { getEventCategory } = useCategories();

  // Get animation class based on event type
  const animationClass = getEventAnimation(event.event_type || 'unknown', !!event.isNew);

  // Get category and service info for this event
  const category = getEventCategory(event);
  const serviceInfo = getServiceFromEventType(event.event_type || 'unknown');
  const neonColors = getNeonColors(category.color);

  // Format timestamp on each render to keep relative time fresh
  // (useMemo would cache stale values like "5s ago" that never update)
  const formattedTimestamp = formatTimestamp(event.created_at);

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'github.push':
        return 'PUSH';
      case 'github.pr':
        return 'PR';
      case 'github.issue':
        return 'ISSUE';
      case 'github.release':
        return 'RELEASE';
      case 'vercel.deploy':
        return 'DEPLOY';
      case 'railway.deploy':
        return 'DEPLOY';
      default:
        return (eventType?.split('.')[1] || 'EVENT').toUpperCase();
    }
  };

  return (
    <Card
      className={cn(
        // Base terminal styling
        'group relative overflow-hidden transition-all duration-200',
        'border-2 bg-terminal-black',
        neonColors.border,
        // Left accent border
        'border-l-4',
        // Hover effects
        'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro',
        // New event animation (type-specific)
        event.isNew && animationClass,
        event.isNew && 'ring-2 ring-neon-cyan',
        // Selection styling
        isSelected && 'event-selected',
        onSelect && 'cursor-pointer'
      )}
      onClick={onSelect}
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
          className={cn(
            'shrink-0 px-1 py-0 text-[10px] xs:px-1.5 xs:text-xs',
            neonColors.text,
            neonColors.border
          )}
        >
          {getEventTypeLabel(event.event_type || 'unknown')}
        </Badge>

        {/* Title - truncated */}
        <span
          className={cn(
            'flex-1 truncate font-mono text-xs xs:text-sm',
            'transition-colors duration-200 group-hover:text-neon-cyan'
          )}
        >
          <span className="mr-1 text-neon-magenta">&gt;</span>
          {event.title}
        </span>

        {/* Timestamp */}
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground xs:text-xs">
          {formattedTimestamp}
        </span>
      </CardContent>
    </Card>
  );
}
