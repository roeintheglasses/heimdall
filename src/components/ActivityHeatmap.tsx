'use client';

import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Terminal, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGoServiceUrl } from '@/lib/api';

interface DayActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityHeatmapProps {
  className?: string;
}

export function ActivityHeatmap({ className = '' }: ActivityHeatmapProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const goServiceUrl = getGoServiceUrl();
        // Fetch more events for better heatmap coverage
        const response = await fetch(`${goServiceUrl}/api/events?limit=500`);

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        // Handle both old format (array) and new format (object with events)
        const eventsList = data.events || data;
        setEvents(eventsList || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Aggregate events by day for the past 12 weeks (84 days)
  const activity = useMemo(() => {
    const days: DayActivity[] = [];
    const now = new Date();
    const eventsByDate: Record<string, number> = {};

    // Count events by date
    events.forEach((event) => {
      if (event.created_at) {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        eventsByDate[date] = (eventsByDate[date] || 0) + 1;
      }
    });

    // Find max count for level calculation
    const counts = Object.values(eventsByDate);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

    // Generate last 84 days (12 weeks)
    for (let i = 83; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = eventsByDate[dateStr] || 0;

      // Calculate level (0-4) based on relative activity
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0 && maxCount > 0) {
        const ratio = count / maxCount;
        if (ratio > 0.75) level = 4;
        else if (ratio > 0.5) level = 3;
        else if (ratio > 0.25) level = 2;
        else level = 1;
      }

      days.push({ date: dateStr, count, level });
    }

    return days;
  }, [events]);

  // Calculate total events
  const totalEvents = useMemo(() => {
    return activity.reduce((sum, day) => sum + day.count, 0);
  }, [activity]);

  if (loading) {
    return <ActivityHeatmapSkeleton />;
  }

  if (error) {
    return (
      <div className="py-8 text-center font-mono">
        <div className="mb-2 text-neon-orange">
          <span className="text-neon-magenta">&gt;</span> ERROR::CONNECTION_FAILED
        </div>
        <p className="text-xs text-muted-foreground">Connect webhooks to start tracking activity</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-8 text-center font-mono">
        <div className="mb-2 text-neon-cyan">
          <span className="text-neon-magenta">&gt;</span> AWAITING_DATA...
        </div>
        <p className="text-xs text-muted-foreground">
          Events will appear here once webhooks start sending data
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 xs:space-y-4', className)}>
      {/* Stats summary - Terminal style */}
      <div className="flex flex-col gap-2 font-mono text-[10px] xs:flex-row xs:items-center xs:justify-between xs:text-xs">
        <div className="flex items-center gap-2 text-neon-cyan">
          <Activity className="h-3 w-3" />
          <span>{String(totalEvents).padStart(4, '0')} EVENTS // 12 WEEKS</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">LESS</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  'h-2.5 w-2.5 border xs:h-3 xs:w-3',
                  getLevelStyles(level as 0 | 1 | 2 | 3 | 4)
                )}
              />
            ))}
          </div>
          <span className="text-muted-foreground">MORE</span>
        </div>
      </div>

      {/* Heatmap grid - 12 columns (weeks) x 7 rows (days) - Pixelated style */}
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="grid min-w-[280px] grid-cols-12 gap-0.5 xs:min-w-[300px] xs:gap-1">
          {activity.map((day, index) => {
            const weekIndex = Math.floor(index / 7);
            const dayIndex = index % 7;

            // Arrange in columns (weeks) with days as rows
            const gridIndex = dayIndex * 12 + weekIndex;

            return (
              <div
                key={day.date}
                title={`${day.count} events on ${formatDate(day.date)}`}
                className={cn(
                  'aspect-square w-full cursor-default border transition-all duration-200',
                  'hover:z-10 hover:scale-110',
                  getLevelStyles(day.level),
                  day.count > 0 && 'hover:shadow-[0_0_10px_currentColor]'
                )}
                style={{ order: gridIndex }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getLevelStyles(level: 0 | 1 | 2 | 3 | 4): string {
  const styles = {
    0: 'bg-terminal-gray border-neon-cyan/20',
    1: 'bg-neon-green/20 border-neon-green/40 text-neon-green',
    2: 'bg-neon-green/40 border-neon-green/60 text-neon-green',
    3: 'bg-neon-green/60 border-neon-green/80 text-neon-green shadow-[0_0_5px_hsl(120_100%_50%)]',
    4: 'bg-neon-green/80 border-neon-green text-neon-green shadow-[0_0_8px_hsl(120_100%_50%)]',
  };
  return styles[level];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function ActivityHeatmapSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-3 w-3 animate-pulse text-neon-cyan" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 84 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}

export default ActivityHeatmap;
