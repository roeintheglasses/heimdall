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
import EventActivityCard from '@/components/EventActivityCard'
import ConnectionStatus from '@/components/ConnectionStatus'
import CategoryFilter from '@/components/CategoryFilter'
import CategoryStatsCards from '@/components/CategoryStatsCards'
import { CategoryProvider, useCategories } from '@/contexts/CategoryContext'
import { ArrowLeft, Shield, TrendingUp, Zap, AlertCircle, Search, Filter, X, Loader2 } from 'lucide-react'
import { DashboardEvent } from '@/types/categories'

// Dashboard component wrapped with CategoryProvider
function DashboardContent() {
  const { calculateStats, filterEvents, filter, setFilter } = useCategories()
  
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  // Update category context when search changes
  useEffect(() => {
    setFilter({ searchQuery })
  }, [searchQuery, setFilter])

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
        
        // Skip heartbeat and connection messages
        if (newEvent.type === 'heartbeat' || newEvent.type === 'connected') {
          return
        }
        
        // Add deduplication check to prevent duplicate events
        setEvents(prev => {
          // Check if event already exists
          const existingEvent = prev.find(e => e.id === newEvent.id)
          if (existingEvent) {
            console.log('Duplicate event detected, skipping:', newEvent.id)
            return prev // Return unchanged if duplicate
          }
          
          // Add new event with flash effect
          const updatedEvents = [{ ...newEvent, isNew: true }, ...prev.slice(0, 49)]
          
          // Remove the "new" flag after animation completes
          setTimeout(() => {
            setEvents(current => current.map(e => e.id === newEvent.id ? { ...e, isNew: false } : e))
          }, 1000)
          
          return updatedEvents
        })
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

  // Calculate category statistics
  const categoryStats = useMemo(() => {
    return calculateStats(events)
  }, [events, calculateStats])

  // Filter events using category context
  const filteredEvents = useMemo(() => {
    return filterEvents(events)
  }, [events, filterEvents])

  const getEventStats = () => {
    const pushEvents = events.filter(e => e.event_type === 'github.push').length
    const deployEvents = events.filter(e => e.event_type === 'vercel.deploy').length
    
    return { pushEvents, deployEvents }
  }

  const { pushEvents, deployEvents } = getEventStats()

  // Get available event types for filter buttons
  const availableEventTypes = useMemo(() => {
    const types = [...new Set(events.map(e => e.event_type).filter(Boolean))]
    return types.sort()
  }, [events])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-900/80 shadow-sm">
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
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Heimdall
                </h1>
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800">
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
        <div className="mb-6 sm:mb-8 relative">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-2xl blur-3xl -z-10" />
          
          <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl p-6 border border-blue-200/50 dark:border-blue-800/50 shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Real-time Event Dashboard
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg">
              Monitor your development activities across GitHub, Vercel, and other integrations with intelligent categorization
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Category Stats Cards */}
        <div className="mb-6 animate-in slide-in-from-top-4 fade-in-0 relative" style={{ animationDelay: '200ms' }}>
          {/* Gradient background for stats section */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 rounded-3xl blur-2xl" />
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-12" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-1.5 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <CategoryStatsCards categoryStats={categoryStats} events={events} />
          )}
        </div>

        {/* Event Activity Calendar */}
        <div className="mb-6 animate-in slide-in-from-top-4 fade-in-0" style={{ animationDelay: '200ms' }}>
          <EventActivityCard 
            events={events} 
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50 shadow-lg"
          />
        </div>

        {/* Category Filter & Search */}
        <Card className="mb-6 animate-in slide-in-from-top-4 fade-in-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-purple-200/50 dark:border-purple-800/50 shadow-lg" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-4">
            <div className="space-y-4">
              <CategoryFilter categoryStats={categoryStats} />
              
              {/* Search */}
              <div className="relative w-full sm:max-w-md">
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
            </div>
          </CardHeader>
        </Card>

        {/* Events Section */}
        <div className="space-y-6">
          {/* Events Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">
                Latest webhook events processed by the edge pipeline, organized by category
              </p>
            </div>
            {filteredEvents.length > 0 && (
              <div className="flex items-center gap-2">
                {filter.selectedCategory && (
                  <Badge variant="secondary" className="text-xs">
                    Category: {filter.selectedCategory}
                  </Badge>
                )}
                <Badge variant="outline" className="transition-all duration-200 hover:scale-105">
                  {filteredEvents.length} {filteredEvents.length === events.length ? 'events' : `of ${events.length} events`}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Events List */}
          <div className="animate-in slide-in-from-bottom-8 fade-in-0 relative" style={{ animationDelay: '400ms' }}>
            {/* Background gradient for events */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-xl -z-10" />
            <div>
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
                  Try adjusting your category selection or search query to see more results.
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
              <div className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                {filteredEvents.map((event, index) => (
                  <div 
                    key={event.id} 
                    className="animate-in slide-in-from-bottom-2 fade-in-0"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Main Dashboard component with CategoryProvider
export default function Dashboard() {
  return (
    <CategoryProvider>
      <DashboardContent />
    </CategoryProvider>
  )
}