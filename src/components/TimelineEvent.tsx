'use client'

import React, { useState } from 'react'
import { DashboardEvent, EventCategory } from '@/types/categories'
import { cn } from '@/lib/utils'

// Enriched event type for timeline display - exported for use in other timeline components
export interface EnrichedTimelineEvent {
  original: DashboardEvent
  categoryInfo: EventCategory
  timestamp: number
}

interface TimelineEventProps {
  event: DashboardEvent
  category: EventCategory
  position: number // 0-1 position on timeline
  isSelected?: boolean
  isStacked?: boolean
  stackCount?: number
  onClick?: () => void
  onHover?: (isHovered: boolean) => void
}

// Category to neon color mapping for dots
const CATEGORY_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  development: {
    bg: 'bg-neon-cyan',
    border: 'border-neon-cyan',
    glow: 'shadow-[0_0_8px_hsl(180_100%_50%)]'
  },
  deployments: {
    bg: 'bg-neon-magenta',
    border: 'border-neon-magenta',
    glow: 'shadow-[0_0_8px_hsl(300_100%_50%)]'
  },
  infrastructure: {
    bg: 'bg-neon-green',
    border: 'border-neon-green',
    glow: 'shadow-[0_0_8px_hsl(120_100%_50%)]'
  },
  issues: {
    bg: 'bg-neon-orange',
    border: 'border-neon-orange',
    glow: 'shadow-[0_0_8px_hsl(30_100%_50%)]'
  },
  security: {
    bg: 'bg-neon-pink',
    border: 'border-neon-pink',
    glow: 'shadow-[0_0_8px_hsl(330_100%_60%)]'
  },
}

export function TimelineEvent({
  event,
  category,
  position,
  isSelected = false,
  isStacked = false,
  stackCount = 1,
  onClick,
  onHover
}: TimelineEventProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const colors = CATEGORY_COLORS[category.id] || CATEGORY_COLORS.development

  const handleMouseEnter = () => {
    setShowTooltip(true)
    onHover?.(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
    onHover?.(false)
  }

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 z-10"
      style={{ left: `${position * 100}%` }}
    >
      {/* Event dot */}
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative -translate-x-1/2 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-terminal-black"
        )}
      >
        {/* Main dot */}
        <div
          className={cn(
            "w-3 h-3 rounded-full border-2 transition-all duration-200",
            colors.bg,
            colors.border,
            isSelected && [colors.glow, "scale-150"],
            !isSelected && "hover:scale-125",
            isStacked && "ring-2 ring-terminal-black"
          )}
        />

        {/* Stack count badge */}
        {isStacked && stackCount > 1 && (
          <div className={cn(
            "absolute -top-1 -right-1 w-4 h-4 rounded-full",
            "flex items-center justify-center",
            "text-[8px] font-bold font-mono",
            "bg-terminal-black border",
            colors.border,
            colors.bg.replace('bg-', 'text-')
          )}>
            {stackCount > 9 ? '9+' : stackCount}
          </div>
        )}

        {/* Pulse animation for new events */}
        {event.isNew && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-ping",
              colors.bg,
              "opacity-75"
            )}
          />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
            "px-3 py-2 min-w-40 max-w-60",
            "bg-terminal-black border-2",
            colors.border,
            "font-mono text-xs",
            "z-50 pointer-events-none",
            "animate-fade-glow-pulse"
          )}
          style={{ '--glow-color': colors.bg.includes('cyan') ? 'hsl(180 100% 50%)' :
                                    colors.bg.includes('magenta') ? 'hsl(300 100% 50%)' :
                                    colors.bg.includes('green') ? 'hsl(120 100% 50%)' :
                                    colors.bg.includes('orange') ? 'hsl(30 100% 50%)' :
                                    'hsl(330 100% 60%)' } as React.CSSProperties}
        >
          {/* Tooltip arrow */}
          <div
            className={cn(
              "absolute top-full left-1/2 -translate-x-1/2",
              "w-0 h-0 border-l-4 border-r-4 border-t-4",
              "border-l-transparent border-r-transparent",
              colors.border.replace('border-', 'border-t-')
            )}
          />

          {/* Content */}
          <div className="space-y-1">
            <div className={cn("font-bold uppercase truncate", colors.bg.replace('bg-', 'text-'))}>
              {event.event_type?.split('.').pop() || 'event'}
            </div>
            <div className="text-muted-foreground truncate">
              {event.title}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground/70">
              <span>{formatTime(event.created_at)}</span>
              <span className={cn("px-1 border", colors.border)}>
                {category.name.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Cluster of events at the same position
interface TimelineEventClusterProps {
  events: EnrichedTimelineEvent[]
  position: number
  isExpanded?: boolean
  onExpand?: () => void
  onEventClick?: (event: DashboardEvent) => void
}

export function TimelineEventCluster({
  events,
  position,
  isExpanded = false,
  onExpand,
  onEventClick
}: TimelineEventClusterProps) {
  if (events.length === 0) return null

  if (events.length === 1) {
    return (
      <TimelineEvent
        event={events[0].original}
        category={events[0].categoryInfo}
        position={position}
        onClick={() => onEventClick?.(events[0].original)}
      />
    )
  }

  // Find dominant category for cluster color
  const categoryCounts = events.reduce((acc, e) => {
    acc[e.categoryInfo.id] = (acc[e.categoryInfo.id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const dominantCategoryId = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)[0][0]

  const dominantEvent = events.find(e => e.categoryInfo.id === dominantCategoryId) || events[0]

  return (
    <TimelineEvent
      event={dominantEvent.original}
      category={dominantEvent.categoryInfo}
      position={position}
      isStacked={true}
      stackCount={events.length}
      onClick={onExpand}
    />
  )
}
