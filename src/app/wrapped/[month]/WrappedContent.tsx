'use client';

import { useState, useMemo } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Calendar,
  TrendingUp,
  Trophy,
  Flame,
  Github,
  Cloud,
  Server,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DailyCount {
  date: string;
  count: number;
}

interface ServiceCount {
  service: string;
  count: number;
}

interface MonthlyStats {
  year: number;
  month: number;
  month_name: string;
  total_events: number;
  daily_average: number;
  busiest_day: DailyCount;
  top_services: ServiceCount[];
  events_per_day: DailyCount[];
  category_breakdown: Record<string, number>;
}

interface WrappedContentProps {
  month: string;
  stats: MonthlyStats | null;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  github: <Github className="h-4 w-4" />,
  vercel: <Cloud className="h-4 w-4" />,
  railway: <Server className="h-4 w-4" />,
};

const SERVICE_COLORS: Record<string, string> = {
  github: 'text-neon-cyan bg-neon-cyan/20 border-neon-cyan/40',
  vercel: 'text-neon-magenta bg-neon-magenta/20 border-neon-magenta/40',
  railway: 'text-neon-pink bg-neon-pink/20 border-neon-pink/40',
};

const CATEGORY_COLORS: Record<string, string> = {
  development: 'bg-neon-cyan',
  deployments: 'bg-neon-magenta',
  issues: 'bg-neon-orange',
  security: 'bg-neon-pink',
  infrastructure: 'bg-neon-green',
};

export function WrappedContent({ month, stats }: WrappedContentProps) {
  const [copied, setCopied] = useState(false);

  // Calculate previous and next month
  const navMonths = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number);
    const currentDate = new Date(year, monthNum - 1, 1);

    const prevDate = new Date(currentDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const next = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    // Don't show next if it's in the future
    const now = new Date();
    const isNextFuture = nextDate > now;

    return { prev, next: isNextFuture ? null : next };
  }, [month]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Generate mini heatmap data
  const heatmapData = useMemo(() => {
    if (!stats) return [];
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const eventsByDate: Record<string, number> = {};

    stats.events_per_day.forEach((d) => {
      eventsByDate[d.date] = d.count;
    });

    const maxCount = Math.max(...Object.values(eventsByDate), 1);

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const count = eventsByDate[dateStr] || 0;
      const level = count === 0 ? 0 : Math.ceil((count / maxCount) * 4);
      return { day, count, level };
    });
  }, [month, stats]);

  if (!stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center font-mono">
          <div className="mb-4 text-6xl text-neon-orange">?</div>
          <h1 className="mb-2 text-xl text-neon-cyan">NO_DATA_FOUND</h1>
          <p className="mb-4 text-sm text-muted-foreground">No activity recorded for this month.</p>
          <Link href="/me" className="text-neon-cyan hover:underline">
            &lt; Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const totalCategories = Object.values(stats.category_breakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-terminal-black p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href={`/wrapped/${navMonths.prev}`}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 font-mono text-xs text-muted-foreground hover:text-neon-cyan"
            >
              <ChevronLeft className="h-4 w-4" />
              PREV
            </Button>
          </Link>
          {navMonths.next && (
            <Link href={`/wrapped/${navMonths.next}`}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 font-mono text-xs text-muted-foreground hover:text-neon-cyan"
              >
                NEXT
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Your Dev Wrapped
          </div>
          <h1 className="text-glow-cyan font-mono text-3xl font-bold text-neon-cyan sm:text-4xl">
            {stats.month_name} {stats.year}
          </h1>
        </div>

        {/* Hero stat */}
        <Card className="border-2 border-neon-cyan/30 bg-terminal-dark/50">
          <CardContent className="p-8 text-center">
            <div className="text-glow-cyan mb-2 font-mono text-7xl font-bold tabular-nums text-neon-cyan sm:text-8xl">
              {stats.total_events}
            </div>
            <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
              Events This Month
            </div>
          </CardContent>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border border-neon-cyan/20 bg-terminal-dark/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto mb-2 h-5 w-5 text-neon-green" />
              <div className="font-mono text-2xl font-bold tabular-nums text-neon-green">
                {stats.daily_average.toFixed(1)}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Avg / Day
              </div>
            </CardContent>
          </Card>
          <Card className="border border-neon-cyan/20 bg-terminal-dark/30">
            <CardContent className="p-4 text-center">
              <Trophy className="mx-auto mb-2 h-5 w-5 text-neon-yellow" />
              <div className="font-mono text-2xl font-bold tabular-nums text-neon-yellow">
                {stats.busiest_day.count}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Best Day
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busiest day highlight */}
        {stats.busiest_day.date && (
          <Card className="border border-neon-yellow/30 bg-neon-yellow/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Flame className="h-8 w-8 text-neon-yellow" />
                <div>
                  <div className="font-mono text-sm text-muted-foreground">
                    Your busiest day was
                  </div>
                  <div className="font-mono text-lg text-neon-yellow">
                    {new Date(stats.busiest_day.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    with {stats.busiest_day.count} events
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mini heatmap */}
        <Card className="border-2 border-neon-cyan/30 bg-terminal-dark/50">
          <CardHeader className="border-b border-neon-cyan/20 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neon-cyan">
              <Calendar className="h-3 w-3" />
              DAILY_ACTIVITY
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-1">
              {heatmapData.map((day) => (
                <div
                  key={day.day}
                  title={`Day ${day.day}: ${day.count} events`}
                  className={cn(
                    'h-4 w-4 border transition-all hover:scale-125',
                    day.level === 0 && 'border-neon-cyan/10 bg-terminal-gray/50',
                    day.level === 1 && 'border-neon-green/40 bg-neon-green/20',
                    day.level === 2 && 'border-neon-green/60 bg-neon-green/40',
                    day.level === 3 && 'border-neon-green/80 bg-neon-green/60',
                    day.level === 4 &&
                      'border-neon-green bg-neon-green/80 shadow-[0_0_4px_hsl(120_100%_50%)]'
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top services */}
        {stats.top_services.length > 0 && (
          <Card className="border-2 border-neon-cyan/30 bg-terminal-dark/50">
            <CardHeader className="border-b border-neon-cyan/20 pb-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neon-cyan">
                <Terminal className="h-3 w-3" />
                TOP_SERVICES
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {stats.top_services.slice(0, 3).map((service, i) => {
                  const percentage = (service.count / stats.total_events) * 100;
                  const colorClass =
                    SERVICE_COLORS[service.service] ||
                    'text-neon-cyan bg-neon-cyan/20 border-neon-cyan/40';

                  return (
                    <div key={service.service} className="flex items-center gap-3">
                      <div className="font-mono text-lg text-muted-foreground">#{i + 1}</div>
                      <Badge variant="outline" className={cn('gap-1 font-mono', colorClass)}>
                        {SERVICE_ICONS[service.service] || <Server className="h-3 w-3" />}
                        {service.service.toUpperCase()}
                      </Badge>
                      <div className="flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-none border border-neon-cyan/20 bg-terminal-gray">
                          <div
                            className={cn(
                              'h-full',
                              service.service === 'github'
                                ? 'bg-neon-cyan'
                                : service.service === 'vercel'
                                  ? 'bg-neon-magenta'
                                  : 'bg-neon-pink'
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="font-mono text-xs tabular-nums text-muted-foreground">
                        {service.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category breakdown */}
        {totalCategories > 0 && (
          <Card className="border-2 border-neon-cyan/30 bg-terminal-dark/50">
            <CardHeader className="border-b border-neon-cyan/20 pb-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neon-cyan">
                <Terminal className="h-3 w-3" />
                CATEGORIES
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex h-4 w-full overflow-hidden rounded-none border border-neon-cyan/20">
                {Object.entries(stats.category_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => {
                    const percentage = (count / totalCategories) * 100;
                    return (
                      <div
                        key={category}
                        className={cn(CATEGORY_COLORS[category] || 'bg-neon-cyan')}
                        style={{ width: `${percentage}%` }}
                        title={`${category}: ${count} (${percentage.toFixed(1)}%)`}
                      />
                    );
                  })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(stats.category_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center gap-1 font-mono text-xs">
                      <div className={cn('h-2 w-2', CATEGORY_COLORS[category] || 'bg-neon-cyan')} />
                      <span className="text-muted-foreground">{category}:</span>
                      <span className="tabular-nums text-foreground">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share button */}
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="gap-2 border-neon-cyan/30 font-mono hover:bg-neon-cyan/10"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-neon-green" />
                LINK COPIED!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                SHARE THIS WRAPPED
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 pt-4 text-center font-mono text-xs text-muted-foreground">
          <Link href="/me" className="text-neon-cyan/60 transition-colors hover:text-neon-cyan">
            &lt; Back to profile
          </Link>
        </div>
      </div>
    </div>
  );
}
