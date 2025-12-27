'use client'

import { useEffect, useState, useMemo } from 'react'
import { Skeleton } from "@/components/ui/skeleton"

interface DayActivity {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

interface ActivityHeatmapProps {
  className?: string
}

export function ActivityHeatmap({ className = '' }: ActivityHeatmapProps) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const goServiceUrl = process.env.NEXT_PUBLIC_GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app'
        const response = await fetch(`${goServiceUrl}/api/events`)

        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }

        const data = await response.json()
        setEvents(data || [])
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Aggregate events by day for the past 12 weeks (84 days)
  const activity = useMemo(() => {
    const days: DayActivity[] = []
    const now = new Date()
    const eventsByDate: Record<string, number> = {}

    // Count events by date
    events.forEach(event => {
      if (event.created_at) {
        const date = new Date(event.created_at).toISOString().split('T')[0]
        eventsByDate[date] = (eventsByDate[date] || 0) + 1
      }
    })

    // Find max count for level calculation
    const counts = Object.values(eventsByDate)
    const maxCount = counts.length > 0 ? Math.max(...counts) : 0

    // Generate last 84 days (12 weeks)
    for (let i = 83; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const count = eventsByDate[dateStr] || 0

      // Calculate level (0-4) based on relative activity
      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (count > 0 && maxCount > 0) {
        const ratio = count / maxCount
        if (ratio > 0.75) level = 4
        else if (ratio > 0.5) level = 3
        else if (ratio > 0.25) level = 2
        else level = 1
      }

      days.push({ date: dateStr, count, level })
    }

    return days
  }, [events])

  // Calculate total events
  const totalEvents = useMemo(() => {
    return activity.reduce((sum, day) => sum + day.count, 0)
  }, [activity])

  if (loading) {
    return <ActivityHeatmapSkeleton />
  }

  if (error) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>Unable to load activity data</p>
        <p className="text-sm mt-2">Connect webhooks to start tracking activity</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No activity yet</p>
        <p className="text-sm mt-2">Events will appear here once webhooks start sending data</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stats summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{totalEvents} events in the last 12 weeks</span>
        <div className="flex items-center gap-1">
          <span className="text-xs">Less</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getLevelColor(level as 0 | 1 | 2 | 3 | 4)}`}
              />
            ))}
          </div>
          <span className="text-xs">More</span>
        </div>
      </div>

      {/* Heatmap grid - 12 columns (weeks) x 7 rows (days) */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-12 gap-1 min-w-[300px]">
          {activity.map((day, index) => {
            const weekIndex = Math.floor(index / 7)
            const dayIndex = index % 7

            // Arrange in columns (weeks) with days as rows
            const gridIndex = dayIndex * 12 + weekIndex

            return (
              <div
                key={day.date}
                title={`${day.count} events on ${formatDate(day.date)}`}
                className={`w-full aspect-square rounded-sm cursor-default transition-transform hover:scale-110 ${getLevelColor(day.level)}`}
                style={{ order: gridIndex }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getLevelColor(level: 0 | 1 | 2 | 3 | 4): string {
  const colors = {
    0: 'bg-slate-100 dark:bg-slate-800',
    1: 'bg-green-200 dark:bg-green-900',
    2: 'bg-green-400 dark:bg-green-700',
    3: 'bg-green-500 dark:bg-green-600',
    4: 'bg-green-600 dark:bg-green-500',
  }
  return colors[level]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function ActivityHeatmapSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 84 }).map((_, i) => (
          <Skeleton key={i} className="w-full aspect-square rounded-sm" />
        ))}
      </div>
    </div>
  )
}

export default ActivityHeatmap
