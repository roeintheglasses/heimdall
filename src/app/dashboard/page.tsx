'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import EventCard from '@/components/EventCard'
import EventCardSkeleton from '@/components/EventCardSkeleton'
import ConnectionStatus from '@/components/ConnectionStatus'
import { ArrowLeft, Shield, TrendingUp, Zap, AlertCircle, Search, Filter, X, Loader2 } from 'lucide-react'

interface DashboardEvent {
  id: string
  event_type: string
  title: string
  metadata: Record<string, any>
  created_at: string
  isNew?: boolean
}

export default function Dashboard() {
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    // Fetch initial events
    const fetchEvents = async () => {
      setIsLoading(true)
      try {
        const goServiceUrl = process.env.NEXT_PUBLIC_GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app'
        console.log('Fetching events from:', `${goServiceUrl}/api/events`)
        const response = await fetch(`${goServiceUrl}/api/events`)
        console.log('Response status:', response.status)
        if (response.ok) {
          const initialEvents = await response.json()
          console.log('Fetched events:', initialEvents.length)
          setEvents(initialEvents)
          setError(null)
        } else {
          const errorText = await response.text()
          console.error('Fetch failed:', response.status, errorText)
          setError(`Failed to fetch initial events: ${response.status}`)
        }
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to connect to service: ' + (err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()

    // Set up Server-Sent Events for real-time updates
    const eventSource = new EventSource('/api/events/stream')
    
    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const newEvent = JSON.parse(event.data)
        // Add a brief flash effect for new events
        setEvents(prev => [{ ...newEvent, isNew: true }, ...prev.slice(0, 49)]) // Keep latest 50 events
        
        // Remove the "new" flag after animation completes
        setTimeout(() => {
          setEvents(prev => prev.map(e => e.id === newEvent.id ? { ...e, isNew: false } : e))
        }, 1000)
      } catch (err) {
        console.error('Error parsing SSE data:', err)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      setError('Connection lost. Attempting to reconnect...')
    }

    return () => {
      eventSource.close()
    }
  }, [])


  // Add search debounce effect
  useEffect(() => {
    if (searchQuery) {
      setIsSearching(true)
      const timer = setTimeout(() => {
        setIsSearching(false)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setIsSearching(false)
    }
  }, [searchQuery])

  // Filter and search events
  const filteredEvents = useMemo(() => {
    let filtered = events

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(event => event.event_type === selectedFilter)
    }

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(event.metadata).toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [events, selectedFilter, searchQuery])

  const getEventStats = () => {
    const pushEvents = events.filter(e => e.event_type === 'github.push').length
    const deployEvents = events.filter(e => e.event_type === 'vercel.deploy').length
    
    return { pushEvents, deployEvents }
  }

  const { pushEvents, deployEvents } = getEventStats()

  // Get available event types for filter buttons
  const availableEventTypes = useMemo(() => {
    const types = [...new Set(events.map(e => e.event_type))]
    return types.sort()
  }, [events])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Heimdall</h1>
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Dashboard
              </Badge>
            </div>
          </div>
          
          <ConnectionStatus 
            isConnected={isConnected} 
            eventCount={events.length} 
            error={error}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 sm:py-6 px-4 sm:px-6">
        {/* Hero Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Real-time Event Dashboard
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Monitor your GitHub pushes and Vercel deployments in real-time through the edge pipeline architecture
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and Filter Controls */}
        <Card className="mb-6 animate-in slide-in-from-top-4 fade-in-0" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 items-start justify-between">
              {/* Search */}
              <div className="relative w-full sm:flex-1 sm:max-w-md">
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder={isLoading ? "Loading events..." : "Search events..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  disabled={isLoading}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    disabled={isSearching || isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filter Badges */}
              <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                  <Filter className="h-4 w-4" />
                  <span className="hidden xs:inline">Filter:</span>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={selectedFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFilter('all')}
                    className="transition-all duration-200 text-xs sm:text-sm"
                    disabled={isLoading}
                  >
                    <span className="hidden xs:inline">All Events</span>
                    <span className="xs:hidden">All</span>
                    <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                      {isLoading ? '...' : events.length}
                    </Badge>
                  </Button>
                  
                  {availableEventTypes.map((type) => {
                    const count = events.filter(e => e.event_type === type).length
                    const isActive = selectedFilter === type
                    
                    return (
                      <Button
                        key={type}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedFilter(type)}
                        className="transition-all duration-200 text-xs sm:text-sm"
                        disabled={isLoading}
                      >
                        {type === 'github.push' ? (
                          <>
                            <Zap className="h-3 w-3 mr-1" />
                            <span className="hidden xs:inline">Pushes</span>
                            <span className="xs:hidden">Push</span>
                          </>
                        ) : type === 'vercel.deploy' ? (
                          <>
                            <Shield className="h-3 w-3 mr-1" />
                            <span className="hidden xs:inline">Deploys</span>
                            <span className="xs:hidden">Deploy</span>
                          </>
                        ) : (
                          <span className="hidden xs:inline">{type.split('.')[1] || type}</span>
                        )}
                        <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                          {isLoading ? '...' : count}
                        </Badge>
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchQuery || selectedFilter !== 'all') && (
              <div className="flex items-center gap-2 pt-3 border-t mt-3">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                
                {searchQuery && (
                  <Badge variant="outline" className="gap-1">
                    Search: "{searchQuery}"
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                
                {selectedFilter !== 'all' && (
                  <Badge variant="outline" className="gap-1">
                    Type: {selectedFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFilter('all')}
                      className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedFilter('all')
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 mb-6 sm:mb-8">
          {isLoading ? (
            // Loading skeleton for stats cards
            <>
              <Card className="animate-in slide-in-from-left-4 fade-in-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
              
              <Card className="animate-in slide-in-from-bottom-4 fade-in-0" style={{ animationDelay: '100ms' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-3 w-36" />
                </CardContent>
              </Card>
              
              <Card className="animate-in slide-in-from-right-4 fade-in-0" style={{ animationDelay: '200ms' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            </>
          ) : (
            // Actual stats cards
            <>
              <Card className="hover:shadow-md transition-all duration-300 animate-in slide-in-from-left-4 fade-in-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground transition-transform duration-200 hover:scale-110" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold transition-all duration-300 hover:scale-105">{events.length}</div>
                  <p className="text-xs text-muted-foreground">
                    All webhook events received
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in-0" style={{ animationDelay: '100ms' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Code Pushes</CardTitle>
                  <Zap className="h-4 w-4 text-blue-600 transition-transform duration-200 hover:scale-110" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 transition-all duration-300 hover:scale-105">{pushEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    GitHub repository updates
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-all duration-300 animate-in slide-in-from-right-4 fade-in-0" style={{ animationDelay: '200ms' }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deployments</CardTitle>
                  <Shield className="h-4 w-4 text-green-600 transition-transform duration-200 hover:scale-110" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 transition-all duration-300 hover:scale-105">{deployEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    Vercel production deploys
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Events Section */}
        <Card className="animate-in slide-in-from-bottom-8 fade-in-0" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest webhook events processed by the edge pipeline
                </CardDescription>
              </div>
              {filteredEvents.length > 0 && (
                <Badge variant="outline" className="transition-all duration-200 hover:scale-105">
                  {filteredEvents.length} {filteredEvents.length === events.length ? 'events' : `of ${events.length} events`}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              // Loading skeleton for events
              <div className="divide-y">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="p-4" style={{ animationDelay: `${index * 100}ms` }}>
                    <EventCardSkeleton />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No events yet</h3>
                <p className="text-sm text-muted-foreground">
                  Waiting for webhook data from GitHub and Vercel...
                </p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No matching events</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search query or filters to see more results.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedFilter('all')
                  }}
                  className="mt-3"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEvents.map((event, index) => (
                  <div 
                    key={event.id} 
                    className={`p-3 sm:p-4 transition-all duration-500 ${
                      event.isNew 
                        ? 'animate-in slide-in-from-top-4 fade-in-0 bg-primary/5 border-l-2 border-l-primary' 
                        : 'animate-in slide-in-from-top-2 fade-in-0'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}