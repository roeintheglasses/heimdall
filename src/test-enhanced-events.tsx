// Test component to preview enhanced event cards
import EventCard from '@/components/EventCard'
import { DashboardEvent } from '@/types/categories'

const sampleEvents: DashboardEvent[] = [
  // GitHub Push Event
  {
    id: '1',
    event_type: 'github.push',
    title: 'Push to heimdall',
    created_at: new Date().toISOString(),
    metadata: {
      repo: 'roeintheglasses/heimdall',
      message: 'Redesign event details UI with enhanced GitHub support\n\nThis commit introduces service-specific event detail components that provide\nmuch richer information display for GitHub events, including:\n\n- Full commit messages with proper formatting\n- Branch and repository information\n- Commit SHA with copy functionality\n- Author details and timestamps\n- Support for multiple commits in a single push',
      author: 'Roe Choi',
      branch: 'refs/heads/main',
      commit_sha: '7f343de0a1b2c3d4e5f6789012345678901234ab',
      commit_url: 'https://github.com/roeintheglasses/heimdall/commit/7f343de0a1b2c3d4e5f6789012345678901234ab',
      repository_url: 'https://github.com/roeintheglasses/heimdall',
      pusher: {
        name: 'Roe Choi',
        email: 'roe@example.com'
      }
    }
  },
  
  // Vercel Deployment Event
  {
    id: '2',
    event_type: 'vercel.deploy',
    title: 'Deployment to production',
    created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    metadata: {
      deployment_url: 'https://heimdall-roeintheglasses.vercel.app',
      project_name: 'heimdall',
      status: 'READY',
      environment: 'production',
      branch: 'main',
      commit_sha: '7f343de0a1b2c3d4e5f6789012345678901234ab',
      author: 'Roe Choi',
      build_time: 95,
      domain: 'heimdall.roe.dev',
      framework: 'Next.js'
    }
  },
  
  // Railway Deployment Event
  {
    id: '3',
    event_type: 'railway.deploy',
    title: 'Backend service deployed',
    created_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    metadata: {
      service_name: 'heimdall-backend',
      deployment_url: 'https://heimdall-backend-production.up.railway.app',
      status: 'SUCCESS',
      environment: 'production',
      project_name: 'heimdall',
      branch: 'main',
      commit_sha: '6e252df9b8a7c5d4e3f2108765432109876543de',
      author: 'Roe Choi',
      build_time: 120,
      service_id: 'svc_123456789',
      deployment_id: 'dep_987654321',
      logs_url: 'https://railway.app/project/heimdall/service/backend/logs',
      memory_limit: 512,
      cpu_limit: 1
    }
  },
  
  // Generic Event
  {
    id: '4',
    event_type: 'monitoring.alert',
    title: 'High CPU usage detected',
    created_at: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    metadata: {
      service: 'heimdall-backend',
      cpu_usage: 85.5,
      threshold: 80,
      duration: '5m',
      severity: 'warning',
      alert_url: 'https://monitoring.example.com/alerts/12345',
      auto_resolved: false,
      affected_endpoints: ['/api/events', '/api/webhook']
    }
  }
]

export default function TestEnhancedEvents() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Enhanced Event Cards Preview</h1>
          <p className="text-muted-foreground">
            Testing the new service-specific event detail components
          </p>
        </div>
        
        <div className="grid gap-6">
          {sampleEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  )
}