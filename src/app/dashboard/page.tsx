'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import EventCard from '@/components/EventCard'
import ConnectionStatus from '@/components/ConnectionStatus'

interface DashboardEvent {
  id: string
  event_type: string
  title: string
  metadata: Record<string, any>
  created_at: string
}

export default function Dashboard() {
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch initial events
    const fetchEvents = async () => {
      try {
        const goServiceUrl = process.env.NEXT_PUBLIC_GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app'
        console.log('Fetching events from:', `${goServiceUrl}/api/events`)
        const response = await fetch(`${goServiceUrl}/api/events`)
        console.log('Response status:', response.status)
        if (response.ok) {
          const initialEvents = await response.json()
          console.log('Fetched events:', initialEvents.length)
          setEvents(initialEvents)
        } else {
          const errorText = await response.text()
          console.error('Fetch failed:', response.status, errorText)
          setError(`Failed to fetch initial events: ${response.status}`)
        }
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to connect to service: ' + (err as Error).message)
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
        setEvents(prev => [newEvent, ...prev.slice(0, 49)]) // Keep latest 50 events
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


  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Heimdall Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Real-time personal dashboard with edge pipeline architecture
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <ConnectionStatus isConnected={isConnected} eventCount={events.length} />
            
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              ← Home
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Events ({events.length})
            </h2>
          </div>
          
          <div>
            {events.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>No events yet. Waiting for webhook data...</p>
              </div>
            ) : (
              events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}