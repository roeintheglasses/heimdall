'use client';

import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface DailyCount {
  date: string;
  count: number;
}

interface YearlyHeatmapProps {
  className?: string;
  eventsPerYear?: DailyCount[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function YearlyHeatmap({ className = '', eventsPerYear }: YearlyHeatmapProps) {
  const [yearlyData, setYearlyData] = useState<DailyCount[]>(eventsPerYear || []);
  const [loading, setLoading] = useState(!eventsPerYear);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventsPerYear) {
      setYearlyData(eventsPerYear);
      return;
    }

    const fetchYearlyStats = async () => {
      try {
        const goServiceUrl =
          process.env.NEXT_PUBLIC_GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app';
        const response = await fetch(`${goServiceUrl}/api/stats?range=year`);

        if (!response.ok) {
          throw new Error('Failed to fetch yearly stats');
        }

        const data = await response.json();
        setYearlyData(data.events_per_year || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchYearlyStats();
  }, [eventsPerYear]);

  // Generate 365 days of activity data
  const activity = useMemo(() => {
    const days: DayActivity[] = [];
    const now = new Date();
    const eventsByDate: Record<string, number> = {};

    // Index yearly data by date
    yearlyData.forEach((day) => {
      eventsByDate[day.date] = day.count;
    });

    // Find max count for level calculation
    const counts = Object.values(eventsByDate);
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

    // Generate last 365 days
    for (let i = 364; i >= 0; i--) {
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
  }, [yearlyData]);

  // Calculate total events and weeks with activity
  const stats = useMemo(() => {
    const total = activity.reduce((sum, day) => sum + day.count, 0);
    const activeDays = activity.filter((day) => day.count > 0).length;
    return { total, activeDays };
  }, [activity]);

  // Group days into weeks for grid layout (52-53 columns)
  const weeks = useMemo(() => {
    const result: DayActivity[][] = [];
    let currentWeek: DayActivity[] = [];

    // Find the first day's day of week
    const firstDate = new Date(activity[0]?.date);
    const firstDayOfWeek = firstDate.getDay();

    // Pad the first week with empty days
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, level: 0 });
    }

    activity.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    // Push remaining days as last week
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [activity]);

  // Get month labels with positions
  const monthLabels = useMemo(() => {
    const labels: { month: string; col: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstValidDay = week.find((d) => d.date);
      if (firstValidDay) {
        const date = new Date(firstValidDay.date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], col: weekIndex });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  if (loading) {
    return <YearlyHeatmapSkeleton />;
  }

  if (error) {
    return (
      <div className="py-8 text-center font-mono">
        <div className="mb-2 text-neon-orange">
          <span className="text-neon-magenta">&gt;</span> ERROR::CONNECTION_FAILED
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Stats header */}
      <div className="flex flex-col gap-2 font-mono text-[10px] xs:flex-row xs:items-center xs:justify-between xs:text-xs">
        <div className="flex items-center gap-2 text-neon-cyan">
          <Calendar className="h-3 w-3" />
          <span>
            {String(stats.total).padStart(4, '0')} EVENTS // {stats.activeDays} ACTIVE DAYS // 365D
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">LESS</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  'h-2 w-2 border xs:h-2.5 xs:w-2.5',
                  getLevelStyles(level as 0 | 1 | 2 | 3 | 4)
                )}
              />
            ))}
          </div>
          <span className="text-muted-foreground">MORE</span>
        </div>
      </div>

      {/* Scrollable container */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[750px]">
          {/* Month labels */}
          <div className="mb-1 flex pl-8">
            {monthLabels.map((label, i) => (
              <div
                key={i}
                className="font-mono text-[9px] text-muted-foreground xs:text-[10px]"
                style={{
                  marginLeft: i === 0 ? `${label.col * 12}px` : undefined,
                  width:
                    i < monthLabels.length - 1
                      ? `${(monthLabels[i + 1].col - label.col) * 12}px`
                      : 'auto',
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex w-7 flex-col justify-between py-0.5 pr-1 font-mono text-[8px] text-muted-foreground xs:text-[9px]">
              <span></span>
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
            </div>

            {/* Weeks grid */}
            <div className="flex gap-[2px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px]">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      title={day.date ? `${day.count} events on ${formatDate(day.date)}` : ''}
                      className={cn(
                        'h-[10px] w-[10px] cursor-default border transition-all duration-200',
                        day.date ? getLevelStyles(day.level) : 'border-transparent bg-transparent',
                        day.count > 0 && 'hover:scale-125 hover:shadow-[0_0_8px_currentColor]'
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getLevelStyles(level: 0 | 1 | 2 | 3 | 4): string {
  const styles = {
    0: 'bg-terminal-gray/50 border-neon-cyan/10',
    1: 'bg-neon-green/20 border-neon-green/40 text-neon-green',
    2: 'bg-neon-green/40 border-neon-green/60 text-neon-green',
    3: 'bg-neon-green/60 border-neon-green/80 text-neon-green shadow-[0_0_3px_hsl(120_100%_50%)]',
    4: 'bg-neon-green/80 border-neon-green text-neon-green shadow-[0_0_6px_hsl(120_100%_50%)]',
  };
  return styles[level];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function YearlyHeatmapSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3 w-3 animate-pulse text-neon-cyan" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[750px] gap-[2px]">
          {Array.from({ length: 53 }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <Skeleton key={`${weekIndex}-${dayIndex}`} className="h-[10px] w-[10px]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default YearlyHeatmap;
