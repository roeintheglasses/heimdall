'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardEvent } from '@/types/categories';
import { cn } from '@/lib/utils';
import { Activity, Terminal } from 'lucide-react';

interface ActivityGraphProps {
  events: DashboardEvent[];
  timeWindow?: '30m' | '1h' | '2h' | '6h';
  height?: number;
  className?: string;
}

// Time window configurations in minutes
const TIME_WINDOWS = {
  '30m': { minutes: 30, bucketSize: 2 },
  '1h': { minutes: 60, bucketSize: 5 },
  '2h': { minutes: 120, bucketSize: 10 },
  '6h': { minutes: 360, bucketSize: 30 },
};

// Service colors matching the terminal aesthetic
const SERVICE_COLORS = {
  github: 'hsl(180, 100%, 50%)', // neon-cyan
  vercel: 'hsl(300, 100%, 50%)', // neon-magenta
  railway: 'hsl(120, 100%, 50%)', // neon-green
  other: 'hsl(30, 100%, 50%)', // neon-orange
};

interface BucketData {
  time: string;
  timestamp: number;
  github: number;
  vercel: number;
  railway: number;
  other: number;
  total: number;
}

export default function ActivityGraph({
  events,
  timeWindow = '1h',
  height = 200,
  className,
}: ActivityGraphProps) {
  const config = TIME_WINDOWS[timeWindow];

  // Process events into time buckets
  const chartData = useMemo(() => {
    const now = new Date();
    const startTime = new Date(now.getTime() - config.minutes * 60 * 1000);
    const buckets: BucketData[] = [];

    // Create empty buckets
    const bucketCount = Math.ceil(config.minutes / config.bucketSize);
    for (let i = 0; i < bucketCount; i++) {
      const bucketTime = new Date(startTime.getTime() + i * config.bucketSize * 60 * 1000);
      buckets.push({
        time: bucketTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: bucketTime.getTime(),
        github: 0,
        vercel: 0,
        railway: 0,
        other: 0,
        total: 0,
      });
    }

    // Fill buckets with event counts
    events.forEach((event) => {
      const eventTime = new Date(event.created_at).getTime();
      if (eventTime < startTime.getTime()) return;

      const bucketIndex = Math.floor(
        (eventTime - startTime.getTime()) / (config.bucketSize * 60 * 1000)
      );

      if (bucketIndex >= 0 && bucketIndex < buckets.length) {
        const eventType = event.event_type || '';
        if (eventType.startsWith('github.')) {
          buckets[bucketIndex].github++;
        } else if (eventType.startsWith('vercel.')) {
          buckets[bucketIndex].vercel++;
        } else if (eventType.startsWith('railway.')) {
          buckets[bucketIndex].railway++;
        } else {
          buckets[bucketIndex].other++;
        }
        buckets[bucketIndex].total++;
      }
    });

    return buckets;
  }, [events, config]);

  // Calculate total events in time window
  const totalEvents = useMemo(() => {
    return chartData.reduce((sum, bucket) => sum + bucket.total, 0);
  }, [chartData]);

  // Get max value for Y axis
  const maxValue = useMemo(() => {
    return Math.max(1, ...chartData.map((b) => b.total));
  }, [chartData]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload as BucketData;

    return (
      <div className="border-2 border-neon-cyan bg-terminal-black p-3 font-mono text-xs">
        <div className="mb-2 text-neon-cyan">[{label}]</div>
        <div className="space-y-1">
          {data.github > 0 && <div className="text-neon-cyan">GitHub: {data.github}</div>}
          {data.vercel > 0 && <div className="text-neon-magenta">Vercel: {data.vercel}</div>}
          {data.railway > 0 && <div className="text-neon-green">Railway: {data.railway}</div>}
          {data.other > 0 && <div className="text-neon-orange">Other: {data.other}</div>}
          <div className="mt-1 border-t border-neon-cyan/30 pt-1 text-foreground">
            Total: {data.total}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn('border-2 border-neon-cyan bg-terminal-black', className)}>
      {/* Terminal header */}
      <div className="flex items-center justify-between border-b-2 border-neon-cyan bg-neon-cyan/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-neon-cyan" />
          <span className="font-mono text-xs text-neon-cyan">ACTIVITY::OSCILLOSCOPE</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-muted-foreground">WINDOW: {timeWindow.toUpperCase()}</span>
          <span className="text-neon-green">{totalEvents} EVENTS</span>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-4 font-mono text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-neon-cyan" />
            <span className="text-neon-cyan">GITHUB</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-neon-magenta" />
            <span className="text-neon-magenta">VERCEL</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-neon-green" />
            <span className="text-neon-green">RAILWAY</span>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGithub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERVICE_COLORS.github} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={SERVICE_COLORS.github} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVercel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERVICE_COLORS.vercel} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={SERVICE_COLORS.vercel} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRailway" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SERVICE_COLORS.railway} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={SERVICE_COLORS.railway} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(180, 100%, 50%, 0.1)"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                tick={{ fill: 'hsl(180, 100%, 50%)', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(180, 100%, 50%, 0.3)' }}
                tickLine={{ stroke: 'hsl(180, 100%, 50%, 0.3)' }}
                interval="preserveStartEnd"
              />

              <YAxis
                tick={{ fill: 'hsl(180, 100%, 50%)', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(180, 100%, 50%, 0.3)' }}
                tickLine={{ stroke: 'hsl(180, 100%, 50%, 0.3)' }}
                allowDecimals={false}
                domain={[0, maxValue]}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="github"
                stackId="1"
                stroke={SERVICE_COLORS.github}
                strokeWidth={2}
                fill="url(#colorGithub)"
              />
              <Area
                type="monotone"
                dataKey="vercel"
                stackId="1"
                stroke={SERVICE_COLORS.vercel}
                strokeWidth={2}
                fill="url(#colorVercel)"
              />
              <Area
                type="monotone"
                dataKey="railway"
                stackId="1"
                stroke={SERVICE_COLORS.railway}
                strokeWidth={2}
                fill="url(#colorRailway)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scanline effect overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,255,0.1) 1px, rgba(0,255,255,0.1) 2px)',
          }}
        />
      </CardContent>
    </Card>
  );
}
