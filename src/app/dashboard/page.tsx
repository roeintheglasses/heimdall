'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import EventCard from '@/components/EventCard';
import EventCardSkeleton from '@/components/EventCardSkeleton';
import EventDetailDrawer from '@/components/EventDetailDrawer';
import ConnectionStatus, { type StreamState } from '@/components/ConnectionStatus';
import { getGoServiceUrl } from '@/lib/api';
import { MAX_EVENTS, mergeNewest, mergeOlder } from '@/lib/eventList';

// Lazy load ActivityGraph (Recharts ~91KB) - only load when needed
const ActivityGraph = dynamic(() => import('@/components/ActivityGraph'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full">
      <Skeleton className="h-full w-full rounded-lg bg-terminal-dark" />
    </div>
  ),
});
import FilterPanel from '@/components/FilterPanel';
import CategoryStatsCards from '@/components/CategoryStatsCards';
import { SoundToggleCompact } from '@/components/SoundToggle';
import { ActivityTicker } from '@/components/ActivityTicker';
import { EventTimeline } from '@/components/EventTimeline';
import { ShortcutsModal, KeyboardHint } from '@/components/ShortcutsModal';
import NotificationCenter from '@/components/NotificationCenter';
import EmptyState from '@/components/EmptyState';
import FloatingActionButton from '@/components/FloatingActionButton';
import MobileFilterSheet from '@/components/MobileFilterSheet';
import { CategoryProvider, useCategories, useCategoryOperations } from '@/contexts/CategoryContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { useSoundEffects } from '@/contexts/SoundContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
  ArrowLeft,
  Shield,
  AlertCircle,
  Loader2,
  Terminal,
  Database,
  Timer,
  Keyboard,
} from 'lucide-react';
import { DashboardEvent } from '@/types/categories';
import { cn } from '@/lib/utils';

interface NextCursor {
  before: string;
  before_id: string;
}

// Dashboard component wrapped with CategoryProvider
function DashboardContent() {
  const {
    categories,
    calculateStats,
    calculateServiceStats,
    filterEvents,
    filter,
    clearAllFilters,
    hasActiveFilters,
  } = useCategories();
  const { selectCategory, clearFilters } = useCategoryOperations();
  const { playSuccess, playError, playNotification, playClick, toggleSound } = useSoundEffects();
  const { processEvent } = useNotifications();

  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [streamState, setStreamState] = useState<StreamState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const nextCursorRef = useRef<NextCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);

  // API stats state - fetched from /api/stats for aggregate counts
  const [apiStats, setApiStats] = useState<{
    total_events: number;
    category_counts: Record<string, number>;
    service_counts: Record<string, number>;
    last_24_hours: number;
    last_week: number;
  } | null>(null);

  // New state for Phase 2 features
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const eventListRef = useRef<HTMLDivElement>(null);

  // State for event detail drawer
  const [drawerEvent, setDrawerEvent] = useState<DashboardEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // State for mobile filter sheet
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Handler to open drawer with a specific event
  const handleViewDetails = useCallback(
    (event: DashboardEvent) => {
      setDrawerEvent(event);
      setIsDrawerOpen(true);
      playClick();
    },
    [playClick]
  );

  const goServiceUrl = getGoServiceUrl();

  // Sound and notification callbacks change identity when sound initializes.
  // Keep them in a ref so the fetch/SSE effect depends only on goServiceUrl.
  const callbacksRef = useRef({ playSuccess, playError, playNotification, processEvent });
  useEffect(() => {
    callbacksRef.current = { playSuccess, playError, playNotification, processEvent };
  });

  // Ids of every event already in the list, used to skip duplicates from SSE
  const knownIdsRef = useRef<Set<string>>(new Set());
  // Pending "isNew" flag-removal timers, cleared on unmount
  const newFlagTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const rememberIds = useCallback((list: DashboardEvent[]) => {
    for (const e of list) knownIdsRef.current.add(e.id);
  }, []);

  // Load the next page of older events using the cursor from the previous page
  const loadMoreEvents = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (isLoadingMoreRef.current || !cursor) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        before: cursor.before,
        before_id: cursor.before_id,
      });
      const response = await fetch(`${goServiceUrl}/api/events?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const newEvents: DashboardEvent[] = data.events || data;
        if (newEvents.length > 0) {
          rememberIds(newEvents);
          setEvents((prev) => mergeOlder(prev, newEvents));
        }
        const pagination = data.pagination;
        nextCursorRef.current = pagination?.next_cursor ?? null;
        setHasMore(Boolean(pagination?.hasMore && pagination?.next_cursor));
        if (pagination) setTotalEvents(pagination.total);
      }
    } catch (err) {
      console.error('Error loading more events:', err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [goServiceUrl, rememberIds]);

  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cursorInitialized = false;
    let lastLoadOk = false;
    let inFlight: Promise<void> | null = null;
    const newFlagTimers = newFlagTimersRef.current;

    // Fetch aggregate stats from dedicated endpoint (all events)
    // Falls back gracefully to local calculation if endpoint unavailable
    const fetchStats = async () => {
      try {
        const response = await fetch(`${goServiceUrl}/api/stats`);
        if (response.ok) {
          const stats = await response.json();
          if (!cancelled) setApiStats(stats);
        }
      } catch {
        // Stats endpoint may be unavailable - fall back to local calculation
      }
    };

    // Fetch the first page and merge it into the list. Runs on mount and on
    // every SSE open so events missed while disconnected are recovered.
    const fetchFirstPage = (): Promise<void> => {
      if (inFlight) return inFlight;
      inFlight = (async () => {
        try {
          const response = await fetch(`${goServiceUrl}/api/events?limit=200`);
          if (cancelled) return;
          if (response.ok) {
            const data = await response.json();
            const page: DashboardEvent[] = data.events || data;
            rememberIds(page);
            setEvents((prev) => mergeNewest(prev, page));
            const pagination = data.pagination;
            if (pagination) {
              setTotalEvents(pagination.total);
              // Keep the load-more cursor if the user already paged further back
              if (!cursorInitialized) {
                cursorInitialized = true;
                nextCursorRef.current = pagination.next_cursor ?? null;
                setHasMore(Boolean(pagination.hasMore && pagination.next_cursor));
              }
            }
            setError(null);
            // Chime on the first load or when recovering, not on every reconnect.
            if (!lastLoadOk) callbacksRef.current.playSuccess();
            lastLoadOk = true;
          } else {
            const errorText = await response.text();
            console.error('Fetch failed:', response.status, errorText);
            lastLoadOk = false;
            setError(`Failed to fetch initial events: ${response.status}`);
            callbacksRef.current.playError();
          }
        } catch (err) {
          if (cancelled) return;
          console.error('Error fetching events:', err);
          lastLoadOk = false;
          setError('Failed to connect to service: ' + (err as Error).message);
          callbacksRef.current.playError();
        } finally {
          inFlight = null;
          if (!cancelled) setIsLoading(false);
        }
      })();
      return inFlight;
    };

    let backendDown = false;

    const connect = () => {
      const source = new EventSource('/api/events/stream');
      eventSource = source;

      source.onopen = () => {
        setStreamState(backendDown ? 'backend-down' : 'live');
        void fetchFirstPage();
      };

      source.addEventListener('status', (event) => {
        try {
          const { backend } = JSON.parse((event as MessageEvent).data);
          backendDown = backend === 'down';
          setStreamState(backendDown ? 'backend-down' : 'live');
        } catch (err) {
          console.error('Error parsing status event:', err);
        }
      });

      source.onmessage = (event) => {
        try {
          const newEvent = JSON.parse(event.data);

          // Skip heartbeat and connection messages
          if (newEvent.type === 'heartbeat' || newEvent.type === 'connected') {
            return;
          }
          if (!newEvent.id || knownIdsRef.current.has(newEvent.id)) {
            return;
          }
          knownIdsRef.current.add(newEvent.id);

          // Side effects run outside the state updater
          callbacksRef.current.playNotification();
          callbacksRef.current.processEvent(newEvent);

          setEvents((prev) => mergeNewest(prev, [{ ...newEvent, isNew: true }]));

          // Remove the "new" flag after animation completes
          const timer = setTimeout(() => {
            newFlagTimers.delete(timer);
            setEvents((current) =>
              current.map((e) => (e.id === newEvent.id ? { ...e, isNew: false } : e))
            );
          }, 1000);
          newFlagTimers.add(timer);
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      source.onerror = () => {
        backendDown = false;
        if (source.readyState === EventSource.CLOSED) {
          // The browser gave up (for example a 503 at the client cap). Retry later.
          setStreamState('disconnected');
          source.close();
          if (!cancelled) reconnectTimer = setTimeout(connect, 30000);
        } else {
          setStreamState('connecting');
        }
      };
    };

    void fetchStats();
    void fetchFirstPage();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
      for (const timer of newFlagTimers) clearTimeout(timer);
      newFlagTimers.clear();
    };
  }, [goServiceUrl, rememberIds]);

  const isConnected = streamState === 'live';
  // Once the in-memory cap is reached there is nothing more to load
  const canLoadMore = hasMore && events.length < MAX_EVENTS;

  // Use API stats for category counts (all events) with fallback to local calculation
  const categoryStats = useMemo(() => {
    if (apiStats?.category_counts) {
      return apiStats.category_counts;
    }
    return calculateStats(events);
  }, [apiStats, events, calculateStats]);

  // Use API stats for service counts (all events) with fallback to local calculation
  const serviceStats = useMemo(() => {
    if (apiStats?.service_counts) {
      return apiStats.service_counts;
    }
    return calculateServiceStats(events);
  }, [apiStats, events, calculateServiceStats]);

  // Filter events using category context
  const filteredEvents = useMemo(() => {
    return filterEvents(events);
  }, [events, filterEvents]);

  // Keyboard shortcuts handlers
  const handleNextEvent = useCallback(() => {
    playClick();
    setSelectedEventIndex((prev) => {
      if (prev === null) return 0;
      return Math.min(prev + 1, filteredEvents.length - 1);
    });
  }, [filteredEvents.length, playClick]);

  const handlePrevEvent = useCallback(() => {
    playClick();
    setSelectedEventIndex((prev) => {
      if (prev === null) return filteredEvents.length - 1;
      return Math.max(prev - 1, 0);
    });
  }, [filteredEvents.length, playClick]);

  const handleExpandEvent = useCallback(() => {
    // Could be used to expand selected event
    playClick();
  }, [playClick]);

  const handleClearSelection = useCallback(() => {
    setSelectedEventIndex(null);
    playClick();
  }, [playClick]);

  const handleFocusSearch = useCallback(() => {
    // Focus is now handled by FilterPanel internally
    playClick();
  }, [playClick]);

  const handleFilterCategory = useCallback(
    (index: number) => {
      if (index < categories.length) {
        selectCategory(categories[index].id);
        playClick();
      }
    },
    [categories, selectCategory, playClick]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    playClick();
  }, [clearFilters, playClick]);

  const handleToggleSound = useCallback(() => {
    toggleSound();
  }, [toggleSound]);

  const handleToggleTimeline = useCallback(() => {
    setShowTimeline((prev) => !prev);
    playClick();
  }, [playClick]);

  const handleShowHelp = useCallback(() => {
    setShowShortcuts(true);
    playClick();
  }, [playClick]);

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
    categoryCount: categories.length,
  });

  // Handle event click from ticker/timeline
  const handleEventClick = useCallback(
    (event: DashboardEvent) => {
      const index = filteredEvents.findIndex((e) => e.id === event.id);
      if (index !== -1) {
        setSelectedEventIndex(index);
        // Scroll event into view
        eventListRef.current?.children[index]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    },
    [filteredEvents]
  );

  return (
    <div className="min-h-screen bg-terminal-black">
      {/* Header - Terminal style */}
      <header className="sticky top-0 z-50 w-full border-b-2 border-neon-cyan bg-terminal-black/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 border-2 border-neon-cyan/50 font-mono text-neon-cyan hover:bg-neon-cyan/10"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">BACK</span>
              </Button>
            </Link>

            <div className="flex items-center gap-2 xs:gap-3">
              <div className="border-2 border-neon-cyan bg-neon-cyan/10 p-1.5 xs:p-2">
                <Shield className="h-4 w-4 text-neon-cyan xs:h-5 xs:w-5" />
              </div>
              <div>
                <h1 className="text-glow-cyan font-mono text-base font-bold text-neon-cyan xs:text-lg">
                  HEIMDALL
                </h1>
              </div>
              <Badge
                variant="outline"
                className="hidden border-2 border-neon-magenta font-mono text-xs text-neon-magenta md:inline-flex"
              >
                DASHBOARD
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xs:gap-3">
            {/* Timeline toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
              className={cn(
                'hidden gap-1 border-2 font-mono text-xs sm:flex',
                showTimeline
                  ? 'border-neon-green bg-neon-green/10 text-neon-green'
                  : 'border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10'
              )}
            >
              <Timer className="h-3 w-3" />
              {showTimeline ? 'LIST' : 'TIMELINE'}
            </Button>

            {/* Keyboard shortcuts button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcuts(true)}
              className="hidden gap-1 border-2 border-neon-magenta/50 font-mono text-xs text-neon-magenta hover:bg-neon-magenta/10 sm:flex"
            >
              <Keyboard className="h-3 w-3" />
              <span className="hidden lg:inline">KEYS</span>
            </Button>

            {/* Notification Center */}
            <NotificationCenter />

            <ConnectionStatus streamState={streamState} eventCount={events.length} error={error} />
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
      <main className="container px-4 py-4 sm:px-6 sm:py-6">
        {/* Hero Section - Terminal style */}
        <div className="mb-6 sm:mb-8">
          <Card className="border-2 border-neon-cyan bg-terminal-black">
            {/* Terminal header */}
            <div className="flex items-center justify-between border-b-2 border-neon-cyan bg-neon-cyan/10 px-4 py-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-neon-cyan" />
                <span className="font-mono text-xs text-neon-cyan">SYSTEM::STATUS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse-slow bg-neon-green" />
                <span className="font-mono text-xs text-neon-green">ACTIVE</span>
              </div>
            </div>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-glow-cyan mb-2 font-mono text-xl font-bold text-neon-cyan sm:text-2xl">
                REAL-TIME EVENT DASHBOARD
              </h2>
              <p className="font-mono text-sm text-muted-foreground">
                <span className="text-neon-magenta">&gt;</span> Monitoring GitHub, Vercel, Railway
                integrations
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                <span className="text-neon-magenta">&gt;</span> Intelligent categorization enabled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-2 border-neon-orange bg-neon-orange/10">
            <AlertCircle className="h-4 w-4 text-neon-orange" />
            <AlertDescription className="font-mono text-sm text-neon-orange">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Category Stats Cards */}
        <div
          className="mb-6 animate-in fade-in-0 slide-in-from-top-4"
          style={{ animationDelay: '200ms' }}
        >
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card
                  key={index}
                  className="animate-pulse border-2 border-neon-cyan/30 bg-terminal-black"
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="mb-4 flex items-start justify-between">
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

        {/* Activity Graph */}
        {!isLoading && events.length > 0 && (
          <div
            className="mb-6 animate-in fade-in-0 slide-in-from-top-4"
            style={{ animationDelay: '250ms' }}
          >
            <ActivityGraph events={events} timeWindow="1h" height={180} />
          </div>
        )}

        {/* Filters Panel - Collapsible */}
        <div
          className="mb-6 animate-in fade-in-0 slide-in-from-top-4"
          style={{ animationDelay: '300ms' }}
        >
          <FilterPanel
            categoryStats={categoryStats}
            serviceStats={serviceStats}
            defaultOpen={false}
          />
        </div>

        {/* Events Section */}
        <div className="space-y-6">
          {/* Events Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 font-mono text-sm text-neon-green">
                <Database className="h-4 w-4" />
                <span>EVENTS::STREAM</span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                <span className="text-neon-magenta">&gt;</span> Latest webhook events // Edge
                pipeline
              </p>
            </div>
            {filteredEvents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {filter.selectedService && (
                  <Badge
                    variant="outline"
                    className="border-neon-cyan font-mono text-xs text-neon-cyan"
                  >
                    SVC: {filter.selectedService.toUpperCase()}
                  </Badge>
                )}
                {filter.selectedCategory && (
                  <Badge
                    variant="outline"
                    className="border-neon-magenta font-mono text-xs text-neon-magenta"
                  >
                    CAT: {filter.selectedCategory.toUpperCase()}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="border-2 border-neon-green font-mono text-neon-green"
                >
                  {String(filteredEvents.length).padStart(3, '0')}
                  {filteredEvents.length !== events.length &&
                    ` / ${String(events.length).padStart(3, '0')}`}
                </Badge>
              </div>
            )}
          </div>

          {/* Events List */}
          <div
            className="animate-in fade-in-0 slide-in-from-bottom-8"
            style={{ animationDelay: '400ms' }}
          >
            <Card className="border-2 border-neon-green bg-terminal-black">
              {/* Terminal header */}
              <div className="flex items-center justify-between border-b-2 border-neon-green bg-neon-green/10 px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 border border-neon-orange/50 bg-neon-orange" />
                  <div className="h-3 w-3 border border-neon-yellow/50 bg-neon-yellow" />
                  <div className="h-3 w-3 border border-neon-green/50 bg-neon-green" />
                </div>
                <span className="font-mono text-xs text-neon-green">EVENTS.LOG</span>
              </div>
              <CardContent className="p-0">
                {isLoading ? (
                  // Loading skeleton for events
                  <div className="divide-y divide-neon-cyan/20">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="p-4"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <EventCardSkeleton />
                      </div>
                    ))}
                  </div>
                ) : error && events.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      type="error"
                      message={error}
                      onAction={() => window.location.reload()}
                      className="border-0"
                    />
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      type="no-events"
                      onAction={() => window.open('https://github.com/settings/webhooks', '_blank')}
                      className="border-0"
                    />
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-4">
                    <EmptyState type="no-matches" onAction={clearAllFilters} className="border-0" />
                  </div>
                ) : showTimeline ? (
                  <div className="p-4 sm:p-6">
                    <EventTimeline events={filteredEvents} onEventClick={handleEventClick} />
                  </div>
                ) : (
                  <div ref={eventListRef} className="space-y-3 p-4 sm:space-y-4 sm:p-6">
                    {filteredEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className="animate-in fade-in-0 slide-in-from-bottom-2"
                        style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
                      >
                        <EventCard
                          event={event}
                          isSelected={selectedEventIndex === index}
                          onSelect={() => {
                            setSelectedEventIndex(index);
                            playClick();
                            handleViewDetails(event);
                          }}
                        />
                      </div>
                    ))}
                    {/* Load More button */}
                    {canLoadMore && (
                      <div className="flex justify-center pt-4">
                        <Button
                          onClick={loadMoreEvents}
                          disabled={isLoadingMore}
                          className="gap-2 border-2 border-neon-cyan font-mono text-neon-cyan hover:bg-neon-cyan/10"
                          variant="outline"
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              LOADING...
                            </>
                          ) : (
                            <>
                              <Database className="h-4 w-4" />
                              LOAD MORE ({events.length} / {totalEvents})
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t-2 border-neon-cyan/30 py-4">
        <div className="container px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="font-mono text-xs text-muted-foreground">
              <span className="text-neon-magenta">&gt;</span> HEIMDALL_DASHBOARD // STREAM:{' '}
              <span className={isConnected ? 'text-neon-green' : 'text-neon-orange'}>
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </p>
            <KeyboardHint className="hidden sm:flex" />
          </div>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Event Detail Drawer */}
      <EventDetailDrawer event={drawerEvent} open={isDrawerOpen} onOpenChange={setIsDrawerOpen} />

      {/* Mobile Filter FAB and Sheet */}
      <FloatingActionButton
        isOpen={isMobileFilterOpen}
        onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
        hasActiveFilters={hasActiveFilters()}
      />
      <MobileFilterSheet
        open={isMobileFilterOpen}
        onOpenChange={setIsMobileFilterOpen}
        categoryStats={categoryStats}
        serviceStats={serviceStats}
      />
    </div>
  );
}

// Main Dashboard component with CategoryProvider and NotificationProvider
export default function Dashboard() {
  return (
    <CategoryProvider>
      <NotificationProvider>
        <DashboardContent />
      </NotificationProvider>
    </CategoryProvider>
  );
}
