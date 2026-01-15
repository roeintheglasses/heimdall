'use client';

import React, { useMemo } from 'react';
import { DashboardEvent } from '@/types/categories';
import { useCategories } from '@/contexts/CategoryContext';
import { useTimelineZoom, TimelineZoomLevel } from '@/hooks/useTimelineZoom';
import { TimelineEventCluster, EnrichedTimelineEvent } from './TimelineEvent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  CalendarDays,
  RotateCcw,
  Terminal,
} from 'lucide-react';

interface EventTimelineProps {
  events: DashboardEvent[];
  onEventClick?: (_event: DashboardEvent) => void;
  className?: string;
}

// Cluster events that are within the same "bucket" based on zoom level
function clusterEvents(
  events: EnrichedTimelineEvent[],
  bucketSize: number
): Array<{
  events: EnrichedTimelineEvent[];
  timestamp: number;
}> {
  const buckets = new Map<number, typeof events>();

  events.forEach((event) => {
    const bucketKey = Math.floor(event.timestamp / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketKey) || [];
    bucket.push(event);
    buckets.set(bucketKey, bucket);
  });

  return Array.from(buckets.entries())
    .map(([timestamp, events]) => ({ timestamp, events }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function EventTimeline({ events, onEventClick, className }: EventTimelineProps) {
  const { getEventCategory } = useCategories();

  const {
    zoomLevel,
    zoomConfig,
    setZoomLevel,
    goToNow,
    stepForward,
    stepBackward,
    getVisibleTimeRange,
    getTimeTicks,
    timeToPosition,
    isTimeVisible,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useTimelineZoom();

  // Process events with timestamps and categories
  const processedEvents = useMemo((): EnrichedTimelineEvent[] => {
    return events.map((event) => ({
      original: event,
      categoryInfo: getEventCategory(event),
      timestamp: new Date(event.created_at).getTime(),
    }));
  }, [events, getEventCategory]);

  // Get visible events
  const visibleEvents = useMemo(() => {
    const { start, end } = getVisibleTimeRange();
    return processedEvents.filter((event) => event.timestamp >= start && event.timestamp <= end);
  }, [processedEvents, getVisibleTimeRange]);

  // Cluster events based on zoom level
  const clusteredEvents = useMemo(() => {
    // Bucket size based on visual density (1/20th of visible range)
    const bucketSize = zoomConfig.duration / 20;
    return clusterEvents(visibleEvents, bucketSize);
  }, [visibleEvents, zoomConfig.duration]);

  // Get time ticks
  const timeTicks = useMemo(() => getTimeTicks(), [getTimeTicks]);

  // Current time marker position
  const nowPosition = useMemo(() => {
    const now = Date.now();
    if (!isTimeVisible(now)) return null;
    return timeToPosition(now);
  }, [isTimeVisible, timeToPosition]);

  return (
    <div className={cn('space-y-3 xs:space-y-4', className)}>
      {/* Header with controls */}
      <div className="flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between xs:gap-4">
        <div className="flex items-center gap-2 font-mono text-[10px] text-neon-magenta xs:text-xs">
          <Terminal className="h-3 w-3" />
          <span>TIMELINE::VIEW</span>
        </div>

        {/* Zoom level buttons */}
        <div className="flex items-center gap-2">
          <div className="flex border-2 border-neon-cyan/50">
            <ZoomButton
              level="hour"
              currentLevel={zoomLevel}
              onClick={() => setZoomLevel('hour')}
              icon={<Clock className="h-3 w-3" />}
              label="HOUR"
              hideLabel
            />
            <ZoomButton
              level="day"
              currentLevel={zoomLevel}
              onClick={() => setZoomLevel('day')}
              icon={<Calendar className="h-3 w-3" />}
              label="DAY"
              hideLabel
            />
            <ZoomButton
              level="week"
              currentLevel={zoomLevel}
              onClick={() => setZoomLevel('week')}
              icon={<CalendarDays className="h-3 w-3" />}
              label="WEEK"
              hideLabel
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={stepBackward}
              className="h-8 w-8 border-2 border-neon-cyan/50 p-0 text-neon-cyan hover:bg-neon-cyan/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={stepForward}
              className="h-8 w-8 border-2 border-neon-cyan/50 p-0 text-neon-cyan hover:bg-neon-cyan/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Now button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToNow}
            className="h-8 gap-1 border-2 border-neon-green px-3 font-mono text-xs text-neon-green hover:bg-neon-green/10"
          >
            <RotateCcw className="h-3 w-3" />
            NOW
          </Button>
        </div>
      </div>

      {/* Timeline container */}
      <div
        ref={containerRef}
        className={cn(
          'relative h-24 border-2 border-neon-cyan/30 bg-terminal-black',
          'cursor-grab select-none overflow-hidden active:cursor-grabbing'
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Time ruler background */}
        <div className="absolute inset-0 flex items-end">
          {/* Grid lines */}
          {timeTicks.map((tick, index) => (
            <div
              key={index}
              className="absolute bottom-8 top-0 w-px bg-neon-cyan/20"
              style={{ left: `${tick.position * 100}%` }}
            />
          ))}
        </div>

        {/* Event dots area */}
        <div className="absolute inset-x-0 bottom-12 top-4 px-2">
          {clusteredEvents.map((cluster, _index) => {
            const { start, end } = getVisibleTimeRange();
            const position = (cluster.timestamp - start) / (end - start);

            return (
              <TimelineEventCluster
                key={`cluster-${cluster.timestamp}`}
                events={cluster.events}
                position={position}
                onEventClick={onEventClick}
              />
            );
          })}
        </div>

        {/* Current time marker */}
        {nowPosition !== null && (
          <div
            className="absolute bottom-8 top-0 z-20 w-0.5 bg-neon-green"
            style={{ left: `${nowPosition * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-neon-green px-1 py-0.5 font-mono text-[8px] font-bold text-terminal-black">
              NOW
            </div>
          </div>
        )}

        {/* Time ruler */}
        <div className="absolute inset-x-0 bottom-0 h-8 border-t border-neon-cyan/30 bg-terminal-black/80">
          {timeTicks.map((tick, index) => (
            <div
              key={index}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `${tick.position * 100}%` }}
            >
              <div className="h-2 w-px bg-neon-cyan/50" />
              <span className="mt-0.5 -translate-x-1/2 font-mono text-[10px] text-muted-foreground">
                {tick.label}
              </span>
            </div>
          ))}
        </div>

        {/* Event count badge */}
        <div className="absolute right-2 top-2 z-30">
          <Badge
            variant="outline"
            className="border-neon-cyan/50 font-mono text-[10px] text-neon-cyan"
          >
            {visibleEvents.length} EVENTS
          </Badge>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
        <span>
          <span className="text-neon-magenta">&gt;</span> Drag to pan
        </span>
        <span>
          <span className="text-neon-magenta">&gt;</span> Scroll to zoom
        </span>
        <span>
          <span className="text-neon-magenta">&gt;</span> Click event for details
        </span>
      </div>
    </div>
  );
}

// Zoom level button component
function ZoomButton({
  level,
  currentLevel,
  onClick,
  icon,
  label,
  hideLabel: _hideLabel = false,
}: {
  level: TimelineZoomLevel;
  currentLevel: TimelineZoomLevel;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hideLabel?: boolean;
}) {
  const isActive = level === currentLevel;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1.5 font-mono text-xs transition-colors xs:px-3',
        isActive ? 'bg-neon-cyan text-terminal-black' : 'text-neon-cyan hover:bg-neon-cyan/10'
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Compact timeline for mobile or constrained spaces
export function EventTimelineCompact({ events, onEventClick, className }: EventTimelineProps) {
  const { getEventCategory } = useCategories();

  // Just show event dots in a simple horizontal line
  const recentEvents = useMemo(() => {
    return events.slice(0, 20).map((event) => ({
      original: event,
      categoryInfo: getEventCategory(event),
    }));
  }, [events, getEventCategory]);

  if (recentEvents.length === 0) return null;

  return (
    <div
      className={cn('relative h-8 border-2 border-neon-cyan/30 bg-terminal-black px-2', className)}
    >
      <div className="absolute inset-0 flex items-center justify-around px-4">
        {recentEvents.slice(0, 10).map((enrichedEvent, _index) => {
          const categoryColors: Record<string, string> = {
            development: 'bg-neon-cyan',
            deployments: 'bg-neon-magenta',
            infrastructure: 'bg-neon-green',
            issues: 'bg-neon-orange',
            security: 'bg-neon-pink',
          };

          return (
            <button
              key={enrichedEvent.original.id}
              onClick={() => onEventClick?.(enrichedEvent.original)}
              className={cn(
                'h-2 w-2 rounded-full transition-transform hover:scale-150',
                categoryColors[enrichedEvent.categoryInfo.id] || 'bg-neon-cyan'
              )}
              title={enrichedEvent.original.title}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="absolute bottom-0.5 left-2 font-mono text-[8px] text-muted-foreground">
        OLDER
      </div>
      <div className="absolute bottom-0.5 right-2 font-mono text-[8px] text-muted-foreground">
        NEWER
      </div>
    </div>
  );
}
