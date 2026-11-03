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
import { Activity } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/motion';
import { useNow } from '@/contexts/NowContext';
import {
  buildDailyBuckets,
  totalInBuckets,
  GRAPH_DAYS,
  type DayBucket,
} from '@/lib/activityBuckets';

interface ActivityGraphProps {
  events: DashboardEvent[];
  height?: number;
  className?: string;
}

// Service colors matching the terminal aesthetic
const SERVICE_COLORS = {
  github: 'hsl(180, 100%, 50%)', // neon-cyan
  vercel: 'hsl(300, 100%, 50%)', // neon-magenta
  railway: 'hsl(120, 100%, 50%)', // neon-green
  other: 'hsl(30, 100%, 50%)', // neon-orange
};

export default function ActivityGraph({ events, height = 200, className }: ActivityGraphProps) {
  const now = useNow();
  const animate = !prefersReducedMotion();

  // One bucket per local day for the last 7 days, ending today
  const chartData = useMemo(() => buildDailyBuckets(events, now, GRAPH_DAYS), [events, now]);

  const totalEvents = useMemo(() => totalInBuckets(chartData), [chartData]);

  // Get max value for Y axis
  const maxValue = useMemo(() => {
    return Math.max(1, ...chartData.map((b) => b.total));
  }, [chartData]);

  const summary = useMemo(
    () =>
      `Events per day, last ${GRAPH_DAYS} days: ${chartData.map((b) => `${b.label} ${b.total}`).join(', ')}`,
    [chartData]
  );

  // Nothing happened in the window, so there is nothing to draw
  if (totalEvents === 0) return null;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload as DayBucket;

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
      <div className="flex flex-col gap-2 border-b-2 border-neon-cyan bg-neon-cyan/10 px-3 py-2 xs:flex-row xs:items-center xs:justify-between xs:px-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-neon-cyan" />
          <span className="font-mono text-xs text-neon-cyan xs:text-xs">
            ACTIVITY::OSCILLOSCOPE
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs xs:gap-3 xs:text-xs">
          <span className="text-muted-foreground">WINDOW: {GRAPH_DAYS} DAYS</span>
          <span className="text-neon-green">{totalEvents} EVENTS</span>
        </div>
      </div>

      <CardContent className="p-3 xs:p-4">
        {/* Legend */}
        <div className="mb-3 flex flex-wrap gap-2 font-mono text-xs xs:mb-4 xs:gap-4 xs:text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 bg-neon-cyan xs:h-3 xs:w-3" />
            <span className="text-neon-cyan">GITHUB</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 bg-neon-magenta xs:h-3 xs:w-3" />
            <span className="text-neon-magenta">VERCEL</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 bg-neon-green xs:h-3 xs:w-3" />
            <span className="text-neon-green">RAILWAY</span>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height }} role="img" aria-label={summary}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              accessibilityLayer={false}
              data={chartData}
              margin={{ top: 10, right: 5, left: -15, bottom: 0 }}
            >
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
                dataKey="label"
                tick={{ fill: 'hsl(180, 100%, 50%)', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(180, 100%, 50%, 0.3)' }}
                tickLine={{ stroke: 'hsl(180, 100%, 50%, 0.3)' }}
                interval={0}
                tickMargin={4}
              />

              <YAxis
                tick={{ fill: 'hsl(180, 100%, 50%)', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(180, 100%, 50%, 0.3)' }}
                tickLine={{ stroke: 'hsl(180, 100%, 50%, 0.3)' }}
                allowDecimals={false}
                domain={[0, maxValue]}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                isAnimationActive={animate}
                dataKey="github"
                stackId="1"
                stroke={SERVICE_COLORS.github}
                strokeWidth={2}
                fill="url(#colorGithub)"
              />
              <Area
                type="monotone"
                isAnimationActive={animate}
                dataKey="vercel"
                stackId="1"
                stroke={SERVICE_COLORS.vercel}
                strokeWidth={2}
                fill="url(#colorVercel)"
              />
              <Area
                type="monotone"
                isAnimationActive={animate}
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
