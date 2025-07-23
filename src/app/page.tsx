import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Activity, Zap, ArrowRight, CheckCircle } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Heimdall</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-16 sm:py-24 md:py-32 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Real-time Monitoring
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-6xl mb-6">
            Heimdall Dashboard
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8">
            Real-time personal dashboard with over-engineered edge pipeline architecture. 
            Monitor your GitHub pushes and Vercel deployments instantly.
          </p>
          
          <div className="flex gap-3 sm:gap-4 justify-center flex-col sm:flex-row">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <Activity className="h-4 w-4" />
                View Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            
            <Link href="/api/health" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                <CheckCircle className="h-4 w-4" />
                API Health Check
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-12 sm:py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            Edge Pipeline Architecture
          </h2>
          
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg">Vercel Edge Functions</CardTitle>
                </div>
                <CardDescription>
                  Sub-100ms webhook ingestion at the edge
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Lightning-fast webhook processing with global edge deployment 
                  for minimal latency worldwide.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-lg">Railway Go Service</CardTitle>
                </div>
                <CardDescription>
                  High-performance event processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Efficient Go microservice that transforms webhooks 
                  and persists events with sub-80ms processing time.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-lg">Real-time Updates</CardTitle>
                </div>
                <CardDescription>
                  Server-sent events for live dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Instant dashboard updates with Server-Sent Events 
                  providing sub-400ms end-to-end latency.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t py-12 sm:py-16">
        <div className="container px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Built with modern technologies</h3>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              <Badge variant="secondary" className="text-xs sm:text-sm">Next.js 15</Badge>
              <Badge variant="secondary" className="text-xs sm:text-sm">Go</Badge>
              <Badge variant="secondary" className="text-xs sm:text-sm">PostgreSQL</Badge>
              <Badge variant="secondary" className="text-xs sm:text-sm">Vercel Edge</Badge>
              <Badge variant="secondary" className="text-xs sm:text-sm">Railway</Badge>
              <Badge variant="secondary" className="text-xs sm:text-sm">Tailwind CSS</Badge>
              <Badge variant="secondary" className="text-xs sm:text-sm">shadcn/ui</Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}