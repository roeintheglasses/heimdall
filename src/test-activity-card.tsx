// Test page to demonstrate the EventActivityCard component
import EventActivityCard from '@/components/EventActivityCard'
import { DashboardEvent } from '@/types/categories'
import { CategoryProvider } from '@/contexts/CategoryContext'

// Generate sample events for the past year with varying density
const generateSampleEvents = (): DashboardEvent[] => {
  const events: DashboardEvent[] = []
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(today.getFullYear() - 1)

  const eventTypes = [
    'github.push',
    'vercel.deploy', 
    'railway.deploy',
    'github.pr',
    'github.issue',
    'monitoring.alert'
  ]

  const titles = [
    'Fix authentication bug in user service',
    'Deploy frontend updates to production',
    'Update database schema for new features',
    'Resolve merge conflicts in feature branch',
    'Optimize query performance for dashboard',
    'Add user authentication middleware',
    'Deploy backend service updates',
    'Fix critical security vulnerability',
    'Update documentation for API changes',
    'Implement feature flag system'
  ]

  // Generate events with realistic patterns
  for (let d = 0; d < 365; d++) {
    const currentDate = new Date(oneYearAgo)
    currentDate.setDate(oneYearAgo.getDate() + d)
    
    // Weekday activity simulation (more activity on weekdays)
    const dayOfWeek = currentDate.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseActivityLevel = isWeekend ? 0.2 : 0.8
    
    // Some days have no activity
    if (Math.random() < 0.3) continue
    
    // Variable number of events per day (1-12)
    const eventsPerDay = Math.floor(Math.random() * baseActivityLevel * 15) + 1
    
    for (let i = 0; i < eventsPerDay; i++) {
      const eventTime = new Date(currentDate)
      eventTime.setHours(
        Math.floor(Math.random() * 16) + 6, // Between 6 AM and 10 PM
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      )
      
      events.push({
        id: `event_${d}_${i}`,
        event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        title: titles[Math.floor(Math.random() * titles.length)],
        created_at: eventTime.toISOString(),
        metadata: {
          repo: 'heimdall',
          author: 'Developer',
          branch: Math.random() > 0.8 ? 'feature/new-feature' : 'main',
          status: Math.random() > 0.9 ? 'FAILED' : 'SUCCESS'
        }
      })
    }
  }

  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export default function TestActivityCard() {
  const sampleEvents = generateSampleEvents()

  return (
    <CategoryProvider>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">GitHub-Style Activity Calendar</h1>
            <p className="text-muted-foreground">
              Interactive event density visualization with {sampleEvents.length} events over the past year
            </p>
          </div>
          
          <EventActivityCard 
            events={sampleEvents}
            className="border-2 border-dashed border-primary/20"
          />
          
          <div className="mt-8 p-6 bg-muted rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Features Demonstrated:</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>GitHub-style heatmap</strong> showing 365 days of activity</li>
              <li>• <strong>Color intensity</strong> based on daily event count (5 levels)</li>
              <li>• <strong>Interactive tooltips</strong> with detailed date information</li>
              <li>• <strong>Clickable cells</strong> to view events for specific dates</li>
              <li>• <strong>Activity statistics</strong> including streaks and averages</li>
              <li>• <strong>Responsive design</strong> with horizontal scrolling on mobile</li>
              <li>• <strong>Real-time event categorization</strong> with color coding</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{sampleEvents.length}</div>
              <div className="text-sm text-muted-foreground">Total Events Generated</div>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {new Set(sampleEvents.map(e => e.created_at.split('T')[0])).size}
              </div>
              <div className="text-sm text-muted-foreground">Active Days</div>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(sampleEvents.length / 365 * 10) / 10}
              </div>
              <div className="text-sm text-muted-foreground">Avg Daily Events</div>
            </div>
          </div>
        </div>
      </div>
    </CategoryProvider>
  )
}