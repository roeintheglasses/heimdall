'use client';

import { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Github, Cloud, Server } from 'lucide-react';
import { YearlyHeatmap } from '@/components/YearlyHeatmap';
import { StreakCounter } from '@/components/StreakCounter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DailyCount {
  date: string;
  count: number;
}

interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
}

interface Stats {
  total_events: number;
  last_24_hours: number;
  last_week: number;
  category_counts: Record<string, number>;
  service_counts: Record<string, number>;
  events_per_year?: DailyCount[];
  streak?: StreakInfo;
}

interface PublicStatsContentProps {
  initialStats: Stats | null;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  github: <Github className="h-4 w-4" />,
  vercel: <Cloud className="h-4 w-4" />,
  railway: <Server className="h-4 w-4" />,
};

const SERVICE_COLORS: Record<string, string> = {
  github: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  vercel: 'text-neon-magenta border-neon-magenta/30 bg-neon-magenta/10',
  railway: 'text-neon-pink border-neon-pink/30 bg-neon-pink/10',
};

export function PublicStatsContent({ initialStats }: PublicStatsContentProps) {
  const [copied, setCopied] = useState(false);
  const stats = initialStats;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center font-mono">
          <div className="mb-4 text-6xl text-neon-orange">!</div>
          <h1 className="mb-2 text-xl text-neon-cyan">DATA_UNAVAILABLE</h1>
          <p className="text-sm text-muted-foreground">
            Unable to load stats. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Sort services by count
  const sortedServices = Object.entries(stats.service_counts || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxServiceCount = sortedServices[0]?.[1] || 1;

  return (
    <div className="min-h-screen bg-terminal-black p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-6 w-6 text-neon-cyan" />
            <h1 className="font-mono text-lg text-neon-cyan sm:text-xl">DEV::ACTIVITY_MONITOR</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="w-fit gap-2 border-neon-cyan/30 font-mono text-xs hover:bg-neon-cyan/10"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-neon-green" />
                COPIED!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                SHARE_LINK
              </>
            )}
          </Button>
        </div>

        {/* Hero stats */}
        <Card className="border-2 border-neon-cyan/30 bg-terminal-dark/50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
              {/* Total events */}
              <div className="text-center">
                <div className="text-glow-cyan font-mono text-5xl font-bold tabular-nums text-neon-cyan sm:text-6xl">
                  {stats.total_events.toLocaleString()}
                </div>
                <div className="mt-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Total Events
                </div>
              </div>

              <div className="hidden h-16 w-px bg-neon-cyan/20 sm:block" />

              {/* Streak */}
              <StreakCounter streak={stats.streak} size="md" showLongest />
            </div>
          </CardContent>
        </Card>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickStatCard label="Last 24h" value={stats.last_24_hours} />
          <QuickStatCard label="Last 7d" value={stats.last_week} />
          <QuickStatCard
            label="Active Days"
            value={stats.events_per_year?.filter((d) => d.count > 0).length || 0}
          />
          <QuickStatCard label="Services" value={Object.keys(stats.service_counts || {}).length} />
        </div>

        {/* Yearly Heatmap */}
        <Card className="border-2 border-neon-cyan/30 bg-terminal-dark/50">
          <CardHeader className="border-b border-neon-cyan/20 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neon-cyan">
              <Terminal className="h-3 w-3" />
              CONTRIBUTION_MATRIX // 365D
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <YearlyHeatmap eventsPerYear={stats.events_per_year} />
          </CardContent>
        </Card>

        {/* Service breakdown */}
        <Card className="border-2 border-neon-cyan/30 bg-terminal-dark/50">
          <CardHeader className="border-b border-neon-cyan/20 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neon-cyan">
              <Terminal className="h-3 w-3" />
              SERVICE_DISTRIBUTION
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {sortedServices.map(([service, count]) => {
                const percentage = (count / maxServiceCount) * 100;
                const colorClass =
                  SERVICE_COLORS[service] || 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10';

                return (
                  <div key={service} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn('gap-1 font-mono text-xs', colorClass)}
                        >
                          {SERVICE_ICONS[service] || <Server className="h-3 w-3" />}
                          {service.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {count.toLocaleString()} events
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-none border border-neon-cyan/20 bg-terminal-gray">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          service === 'github'
                            ? 'bg-neon-cyan'
                            : service === 'vercel'
                              ? 'bg-neon-magenta'
                              : service === 'railway'
                                ? 'bg-neon-pink'
                                : 'bg-neon-green'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 pt-4 text-center font-mono text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Terminal className="h-3 w-3 text-neon-cyan/50" />
            <span>Powered by Heimdall</span>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-1 text-neon-cyan/60 transition-colors hover:text-neon-cyan"
          >
            <ExternalLink className="h-3 w-3" />
            View Full Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

function QuickStatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border border-neon-cyan/20 bg-terminal-dark/30">
      <CardContent className="p-3 text-center">
        <div className="font-mono text-2xl font-bold tabular-nums text-neon-cyan">
          {value.toLocaleString()}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}
