import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, BarChart3, Info } from 'lucide-react'
import { DashboardEvent } from '@/types/categories'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { useCategories } from '@/contexts/CategoryContext'
import dynamic from 'next/dynamic'

// Dynamically import ActivityCalendar to avoid SSR issues
const ActivityCalendar = dynamic(
  () => import('react-activity-calendar').then(mod => mod.ActivityCalendar).catch(() => {
    // Fallback component if the library fails to load
    const FallbackComponent = () => (
      <div className="min-w-[720px] h-32 bg-muted rounded flex items-center justify-center">
        <p className="text-muted-foreground">Activity calendar temporarily unavailable</p>
      </div>
    )
    FallbackComponent.displayName = 'ActivityCalendarFallback'
    return FallbackComponent
  }),
  { 
    ssr: false,
    loading: () => <div className="min-w-[720px] h-32 bg-muted animate-pulse rounded" />
  }
)

interface EventActivityCardProps {
  events: DashboardEvent[]
  className?: string
}

interface ActivityData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export default function EventActivityCard({ events, className }: EventActivityCardProps) {
  const { getEventCategory } = useCategories()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Calculate activity level based on count distribution
  const getActivityLevel = useCallback((count: number, allCounts: Record<string, number>): 0 | 1 | 2 | 3 | 4 => {
    if (count === 0) return 0
    
    const counts = Object.values(allCounts).filter(c => c > 0).sort((a, b) => a - b)
    if (counts.length === 0) return 0
    
    const max = Math.max(...counts)
    const quartiles = [
      0,
      Math.ceil(max * 0.25),
      Math.ceil(max * 0.5),
      Math.ceil(max * 0.75),
      max
    ]
    
    if (count <= quartiles[1]) return 1
    if (count <= quartiles[2]) return 2
    if (count <= quartiles[3]) return 3
    return 4
  }, [])

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    return events.filter(event => {
      const eventDate = new Date(event.created_at).toISOString().split('T')[0]
      return eventDate === selectedDate
    })
  }, [events, selectedDate])

  // Process events into activity data
  const activityData = useMemo(() => {
    // Validate events data
    if (!Array.isArray(events) || events.length === 0) {
      return []
    }

    // Group events by date with error handling
    const eventsByDate = events.reduce((acc, event) => {
      try {
        if (event?.created_at) {
          const date = new Date(event.created_at).toISOString().split('T')[0]
          acc[date] = (acc[date] || 0) + 1
        }
      } catch (error) {
        console.warn('Error processing event date:', event, error)
      }
      return acc
    }, {} as Record<string, number>)

    // Get date range for the last 365 days
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(today.getFullYear() - 1)
    
    // Create array of all dates in the past year
    const dates: ActivityData[] = []
    const currentDate = new Date(oneYearAgo)
    
    while (currentDate <= today) {
      const dateString = currentDate.toISOString().split('T')[0]
      const count = eventsByDate[dateString] || 0
      
      dates.push({
        date: dateString,
        count,
        level: getActivityLevel(count, eventsByDate)
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return dates
  }, [events, getActivityLevel])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalEvents = events.length
    const daysWithEvents = activityData.filter(d => d.count > 0).length
    const maxDailyEvents = Math.max(...activityData.map(d => d.count))
    const avgDailyEvents = totalEvents / 365
    
    // Calculate current streak
    let currentStreak = 0
    for (let i = activityData.length - 1; i >= 0; i--) {
      if (activityData[i].count > 0) {
        currentStreak++
      } else {
        break
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0
    let tempStreak = 0
    for (const day of activityData) {
      if (day.count > 0) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }
    
    return {
      totalEvents,
      daysWithEvents,
      maxDailyEvents,
      avgDailyEvents: Math.round(avgDailyEvents * 10) / 10,
      currentStreak,
      longestStreak
    }
  }, [activityData, events.length])

  // Custom theme for the activity calendar
  const theme = {
    light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Event Activity</CardTitle>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span>{stats.totalEvents} events</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>{stats.currentStreak} day streak</span>
            </div>
          </div>
        </div>
        <CardDescription>
          Event activity over the past year • {stats.daysWithEvents} active days
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-6">
        {/* Activity Calendar */}
        <div className="mb-6 overflow-x-auto">
          <div className="min-w-[720px]">
            {activityData.length > 0 ? (
              <ActivityCalendar
                data={activityData}
                theme={theme}
                hideTotalCount={true}
                hideColorLegend={false}
                showWeekdayLabels={true}
                weekStart={1}
                fontSize={12}
                blockMargin={2}
                blockRadius={2}
                blockSize={11}
              />
            ) : (
              <div className="h-32 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground">No event data available for activity visualization</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Date Events */}
        {selectedDate && selectedDateEvents.length > 0 && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {selectedDateEvents.length} events
                </Badge>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedDateEvents.map((event, index) => {
                const category = getEventCategory(event)
                return (
                  <div
                    key={`${event.id}-${index}`}
                    className="flex items-center justify-between text-sm p-2 bg-background rounded border"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          category.color === 'blue' ? 'bg-blue-500' :
                          category.color === 'green' ? 'bg-green-500' :
                          category.color === 'purple' ? 'bg-purple-500' :
                          category.color === 'red' ? 'bg-red-500' :
                          category.color === 'orange' ? 'bg-orange-500' :
                          'bg-gray-500'
                        }`}
                      />
                      <span className="font-medium truncate">{event.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {event.event_type?.split('.')[0] || 'event'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {new Date(event.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{stats.totalEvents}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{stats.daysWithEvents}</div>
            <div className="text-xs text-muted-foreground">Active Days</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{stats.maxDailyEvents}</div>
            <div className="text-xs text-muted-foreground">Max Per Day</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{stats.avgDailyEvents}</div>
            <div className="text-xs text-muted-foreground">Daily Average</div>
          </div>
        </div>

        {/* Streaks Section */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">Current streak:</span>
              <span className="font-medium">{stats.currentStreak} days</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-muted-foreground">Longest streak:</span>
              <span className="font-medium">{stats.longestStreak} days</span>
            </div>
          </div>
        </div>

        {/* Activity Legend */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {theme.light.map((color, index) => (
              <div
                key={index}
                className="w-2.5 h-2.5 rounded-sm border border-border/20"
                style={{ backgroundColor: color }}
                title={`Level ${index}`}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}