'use client';

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DayActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface HeatmapBackgroundProps {
  className?: string;
}

export function HeatmapBackground({ className }: HeatmapBackgroundProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const goServiceUrl =
          process.env.NEXT_PUBLIC_GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app';
        const response = await fetch(`${goServiceUrl}/api/events?limit=500`);

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        const eventsList = data.events || data;
        setEvents(eventsList || []);
      } catch (err) {
        console.error('HeatmapBackground: Failed to fetch events', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Aggregate events by day for the past 84 days (12 weeks)
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

  // Generate enough cells to fill the viewport by repeating the pattern
  const cells = useMemo(() => {
    if (activity.length === 0) return [];

    // Generate approximately 500 cells to fill most viewports
    const targetCells = 500;
    const result: DayActivity[] = [];

    for (let i = 0; i < targetCells; i++) {
      const sourceIndex = i % activity.length;
      result.push({
        ...activity[sourceIndex],
        date: `${activity[sourceIndex].date}-${Math.floor(i / activity.length)}`,
      });
    }

    return result;
  }, [activity]);

  if (loading) {
    return <div className="fixed inset-0 z-0 bg-terminal-black" aria-hidden="true" />;
  }

  return (
    <div
      className={cn('fixed inset-0 z-0 overflow-hidden', className)}
      style={{ contain: 'layout style paint' }}
      aria-hidden="true"
    >
      <div
        className="grid h-full w-full gap-[2px]"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(24px, 3vw, 48px), 1fr))',
          gridAutoRows: '1fr',
        }}
      >
        {cells.map((day, index) => (
          <div
            key={`${day.date}-${index}`}
            className={cn('relative aspect-square', getBgLevelStyles(day.level))}
          >
            {/* Subtle date label */}
            <span className="absolute bottom-0.5 right-0.5 font-mono text-[6px] leading-none text-neon-cyan/10">
              {new Date(activity[index % activity.length]?.date || day.date).getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getBgLevelStyles(level: 0 | 1 | 2 | 3 | 4): string {
  // Subtle styles for background use
  const styles = {
    0: 'bg-terminal-gray/30 border border-neon-cyan/5',
    1: 'bg-neon-green/5 border border-neon-green/10',
    2: 'bg-neon-green/10 border border-neon-green/15',
    3: 'bg-neon-green/15 border border-neon-green/20',
    4: 'bg-neon-green/20 border border-neon-green/25',
  };
  return styles[level];
}

export default HeatmapBackground;
