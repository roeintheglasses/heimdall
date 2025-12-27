'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import EventCard from '@/components/EventCard'
import EventCardSkeleton from '@/components/EventCardSkeleton'
import ConnectionStatus from '@/components/ConnectionStatus'
import CategoryFilter from '@/components/CategoryFilter'
import ServiceFilter from '@/components/ServiceFilter'
import CategoryStatsCards from '@/components/CategoryStatsCards'
import { SoundToggleCompact } from '@/components/SoundToggle'
import { ActivityTicker } from '@/components/ActivityTicker'
import { EventTimeline } from '@/components/EventTimeline'
import { ShortcutsModal, KeyboardHint } from '@/components/ShortcutsModal'
import { CategoryProvider, useCategories, useCategoryOperations } from '@/contexts/CategoryContext'
import { useSoundEffects } from '@/contexts/SoundContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ArrowLeft, Shield, TrendingUp, AlertCircle, Search, Filter, X, Loader2, Terminal, Database, Timer, Keyboard } from 'lucide-react'
import { DashboardEvent } from '@/types/categories'
import { cn } from '@/lib/utils'

// Dashboard component wrapped with CategoryProvider
function DashboardContent() {
  const { categories, calculateStats, calculateServiceStats, filterEvents, filter, setFilter, serviceStats: contextServiceStats } = useCategories()
  const { selectCategory, clearFilters } = useCategoryOperations()
  const { playSuccess, playError, playNotification, playClick, toggleSound } = useSoundEffects()

  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  // New state for Phase 2 features
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const eventListRef = useRef<HTMLDivElement>(null)

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
          // Play success sound on successful load
          playSuccess()
        } else {
          const errorText = await response.text()
          console.error('Fetch failed:', response.status, errorText)
          setError(`Failed to fetch initial events: ${response.status}`)
          playError()
        }
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to connect to service: ' + (err as Error).message)
        playError()
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

          // Play notification sound for new events
          playNotification()

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
  }, [playSuccess, playError, playNotification])

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

  // Calculate service statistics
  const serviceStats = useMemo(() => {
    return calculateServiceStats(events)
  }, [events, calculateServiceStats])

  // Filter events using category context
  const filteredEvents = useMemo(() => {
    return filterEvents(events)
  }, [events, filterEvents])

  // Keyboard shortcuts handlers
  const handleNextEvent = useCallback(() => {
    playClick()
    setSelectedEventIndex(prev => {
      if (prev === null) return 0
      return Math.min(prev + 1, filteredEvents.length - 1)
    })
  }, [filteredEvents.length, playClick])

  const handlePrevEvent = useCallback(() => {
    playClick()
    setSelectedEventIndex(prev => {
      if (prev === null) return filteredEvents.length - 1
      return Math.max(prev - 1, 0)
    })
  }, [filteredEvents.length, playClick])

  const handleExpandEvent = useCallback(() => {
    // Could be used to expand selected event
    playClick()
  }, [playClick])

  const handleClearSelection = useCallback(() => {
    setSelectedEventIndex(null)
    playClick()
  }, [playClick])

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus()
    playClick()
  }, [playClick])

  const handleFilterCategory = useCallback((index: number) => {
    if (index < categories.length) {
      selectCategory(categories[index].id)
      playClick()
    }
  }, [categories, selectCategory, playClick])

  const handleClearFilters = useCallback(() => {
    clearFilters()
    setSearchQuery('')
    playClick()
  }, [clearFilters, playClick])

  const handleToggleSound = useCallback(() => {
    toggleSound()
  }, [toggleSound])

  const handleToggleTimeline = useCallback(() => {
    setShowTimeline(prev => !prev)
    playClick()
  }, [playClick])

  const handleShowHelp = useCallback(() => {
    setShowShortcuts(true)
    playClick()
  }, [playClick])

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !showShortcuts,
    handlers: {
      onNextEvent: handleNextEvent,
      onPrevEvent: handlePrevEvent,
      onExpandEvent: handleExpandEvent,
      onClearSelection: handleClearSelection,
      onFocusSearch: handleFocusSearch,
      onFilterCategory: handleFilterCategory,
      onClearFilters: handleClearFilters,
      onToggleSound: handleToggleSound,
      onToggleTimeline: handleToggleTimeline,
      onShowHelp: handleShowHelp,
    },
    categoryCount: categories.length
  })

  // Handle event click from ticker/timeline
  const handleEventClick = useCallback((event: DashboardEvent) => {
    const index = filteredEvents.findIndex(e => e.id === event.id)
    if (index !== -1) {
      setSelectedEventIndex(index)
      // Scroll event into view
      eventListRef.current?.children[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [filteredEvents])

  const getEventStats = () => {
    const pushEvents = events.filter(e => e.event_type === 'github.push').length
    const deployEvents = events.filter(e => e.event_type === 'vercel.deploy').length

    return { pushEvents, deployEvents }
  }

  const { pushEvents, deployEvents } = getEventStats()

  return (
    <div className="min-h-screen bg-terminal-black">
      {/* Header - Terminal style */}
      <header className="sticky top-0 z-50 w-full border-b-2 border-neon-cyan bg-terminal-black/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 border-2 border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 font-mono">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">BACK</span>
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              <div className="p-2 border-2 border-neon-cyan bg-neon-cyan/10">
                <Shield className="h-5 w-5 text-neon-cyan" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-mono text-neon-cyan text-glow-cyan">
                  HEIMDALL
                </h1>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex border-2 border-neon-magenta text-neon-magenta font-mono text-xs">
                DASHBOARD
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timeline toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
              className={cn(
                "hidden sm:flex gap-1 border-2 font-mono text-xs",
                showTimeline
                  ? "border-neon-green text-neon-green bg-neon-green/10"
                  : "border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
              )}
            >
              <Timer className="h-3 w-3" />
              {showTimeline ? "LIST" : "TIMELINE"}
            </Button>

            {/* Keyboard shortcuts button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcuts(true)}
              className="hidden sm:flex gap-1 border-2 border-neon-magenta/50 text-neon-magenta hover:bg-neon-magenta/10 font-mono text-xs"
            >
              <Keyboard className="h-3 w-3" />
              <span className="hidden lg:inline">KEYS</span>
            </Button>

            <ConnectionStatus
              isConnected={isConnected}
              eventCount={events.length}
              error={error}
            />
            <SoundToggleCompact />
          </div>
        </div>
      </header>

      {/* Activity Ticker */}
      {!isLoading && events.length > 0 && (
        <ActivityTicker
          events={events}
          speed="medium"
          onEventClick={handleEventClick}
          className="sticky top-16 z-40"
        />
      )}

      {/* Main Content */}
      <main className="container py-4 sm:py-6 px-4 sm:px-6">
        {/* Hero Section - Terminal style */}
        <div className="mb-6 sm:mb-8">
          <Card className="border-2 border-neon-cyan bg-terminal-black">
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neon-cyan bg-neon-cyan/10">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-neon-cyan" />
                <span className="text-xs font-mono text-neon-cyan">SYSTEM::STATUS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-neon-green animate-pulse-slow" />
                <span className="text-xs font-mono text-neon-green">ACTIVE</span>
              </div>
            </div>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-neon-cyan text-glow-cyan mb-2">
                REAL-TIME EVENT DASHBOARD
              </h2>
              <p className="text-muted-foreground font-mono text-sm">
                <span className="text-neon-magenta">&gt;</span> Monitoring GitHub, Vercel, Railway integrations
              </p>
              <p className="text-muted-foreground font-mono text-sm">
                <span className="text-neon-magenta">&gt;</span> Intelligent categorization enabled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-2 border-neon-orange bg-neon-orange/10">
            <AlertCircle className="h-4 w-4 text-neon-orange" />
            <AlertDescription className="text-neon-orange font-mono text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Category Stats Cards */}
        <div className="mb-6 animate-in slide-in-from-top-4 fade-in-0" style={{ animationDelay: '200ms' }}>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="border-2 border-neon-cyan/30 bg-terminal-black animate-pulse">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Skeleton className="h-12 w-12" />
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


        {/* Filters & Search - Terminal style */}
        <Card className="mb-6 animate-in slide-in-from-top-4 fade-in-0 border-2 border-neon-magenta bg-terminal-black" style={{ animationDelay: '300ms' }}>
          {/* Terminal header */}
          <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neon-magenta bg-neon-magenta/10">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neon-magenta" />
              <span className="text-xs font-mono text-neon-magenta">FILTERS::PANEL</span>
            </div>
          </div>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-6">
              {/* Service Filter */}
              <ServiceFilter serviceStats={serviceStats} />

              {/* Category Filter */}
              <CategoryFilter categoryStats={categoryStats} />

              {/* Search - Terminal style */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-neon-cyan">
                  <Search className="h-3 w-3" />
                  <span>SEARCH::QUERY</span>
                </div>
                <div className="relative w-full sm:max-w-md">
                  {isSearching ? (
                    <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neon-cyan animate-spin" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neon-cyan" />
                  )}
                  <Input
                    ref={searchInputRef}
                    placeholder={isLoading ? "LOADING..." : "SEARCH_EVENTS... (press / to focus)"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 font-mono"
                    disabled={isLoading}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-neon-orange hover:bg-neon-orange/10"
                      disabled={isSearching || isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Section */}
        <div className="space-y-6">
          {/* Events Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-neon-green font-mono text-sm mb-1">
                <Database className="h-4 w-4" />
                <span>EVENTS::STREAM</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                <span className="text-neon-magenta">&gt;</span> Latest webhook events // Edge pipeline
              </p>
            </div>
            {filteredEvents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {filter.selectedService && (
                  <Badge variant="outline" className="text-xs font-mono border-neon-cyan text-neon-cyan">
                    SVC: {filter.selectedService.toUpperCase()}
                  </Badge>
                )}
                {filter.selectedCategory && (
                  <Badge variant="outline" className="text-xs font-mono border-neon-magenta text-neon-magenta">
                    CAT: {filter.selectedCategory.toUpperCase()}
                  </Badge>
                )}
                <Badge variant="outline" className="font-mono border-2 border-neon-green text-neon-green">
                  {String(filteredEvents.length).padStart(3, '0')}
                  {filteredEvents.length !== events.length && ` / ${String(events.length).padStart(3, '0')}`}
                </Badge>
              </div>
            )}
          </div>

          {/* Events List */}
          <div className="animate-in slide-in-from-bottom-8 fade-in-0" style={{ animationDelay: '400ms' }}>
            <Card className="border-2 border-neon-green bg-terminal-black">
              {/* Terminal header */}
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neon-green bg-neon-green/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-neon-orange border border-neon-orange/50" />
                  <div className="w-3 h-3 bg-neon-yellow border border-neon-yellow/50" />
                  <div className="w-3 h-3 bg-neon-green border border-neon-green/50" />
                </div>
                <span className="text-xs font-mono text-neon-green">EVENTS.LOG</span>
              </div>
              <CardContent className="p-0">
                {isLoading ? (
                  // Loading skeleton for events
                  <div className="divide-y divide-neon-cyan/20">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="p-4" style={{ animationDelay: `${index * 100}ms` }}>
                        <EventCardSkeleton />
                      </div>
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-neon-cyan bg-neon-cyan/10 mb-4">
                      <TrendingUp className="h-6 w-6 text-neon-cyan" />
                    </div>
                    <h3 className="font-mono font-bold text-neon-cyan mb-2">AWAITING_DATA...</h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      <span className="text-neon-magenta">&gt;</span> Waiting for webhook data from GitHub and Vercel...
                    </p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-neon-orange bg-neon-orange/10 mb-4">
                      <Search className="h-6 w-6 text-neon-orange" />
                    </div>
                    <h3 className="font-mono font-bold text-neon-orange mb-2">NO_MATCHES_FOUND</h3>
                    <p className="text-sm text-muted-foreground font-mono mb-3">
                      <span className="text-neon-magenta">&gt;</span> Try adjusting filters or search query
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setFilter({ selectedCategory: null, selectedService: null, searchQuery: '' })
                      }}
                      className="border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 font-mono"
                    >
                      CLEAR_FILTERS
                    </Button>
                  </div>
                ) : showTimeline ? (
                  <div className="p-4 sm:p-6">
                    <EventTimeline
                      events={filteredEvents}
                      onEventClick={handleEventClick}
                    />
                  </div>
                ) : (
                  <div ref={eventListRef} className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                    {filteredEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className="animate-in slide-in-from-bottom-2 fade-in-0"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <EventCard
                          event={event}
                          isSelected={selectedEventIndex === index}
                          onSelect={() => {
                            setSelectedEventIndex(index)
                            playClick()
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-neon-cyan/30 py-4 mt-8">
        <div className="container px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs font-mono text-muted-foreground">
              <span className="text-neon-magenta">&gt;</span> HEIMDALL_DASHBOARD // STREAM: <span className={isConnected ? "text-neon-green" : "text-neon-orange"}>{isConnected ? "CONNECTED" : "DISCONNECTED"}</span>
            </p>
            <KeyboardHint className="hidden sm:flex" />
          </div>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
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
