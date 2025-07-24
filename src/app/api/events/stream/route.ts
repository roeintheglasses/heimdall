import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

interface DashboardEvent {
  id: string
  event_type: string
  title: string
  metadata: Record<string, any>
  created_at: string
}

let clients: Set<ReadableStreamDefaultController> = new Set()

export async function GET(request: NextRequest) {
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the set
      clients.add(controller)
      console.log(`Client connected. Total clients: ${clients.size}`)
      
      // Start polling when first client connects
      startPolling()
      
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`
      controller.enqueue(new TextEncoder().encode(data))
      
      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`
          controller.enqueue(new TextEncoder().encode(heartbeatData))
        } catch (error) {
          clearInterval(heartbeat)
          clients.delete(controller)
          console.log(`Client disconnected (heartbeat). Total clients: ${clients.size}`)
        }
      }, 30000) // Send heartbeat every 30 seconds
      
      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clients.delete(controller)
        console.log(`Client disconnected (abort). Total clients: ${clients.size}`)
        try {
          controller.close()
        } catch (error) {
          // Connection already closed
        }
      })
    },
    
    cancel() {
      // Clean up when stream is cancelled
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
    },
  })
}

// Function to broadcast events to all connected clients
function broadcastEvent(event: DashboardEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`
  const encodedData = new TextEncoder().encode(data)
  
  // Send to all connected clients
  for (const controller of clients) {
    try {
      controller.enqueue(encodedData)
    } catch (error) {
      // Remove disconnected clients
      clients.delete(controller)
    }
  }
}

// Polling mechanism to fetch new events from Go service
let lastEventId: string | null = null
let lastEventTimestamp: string | null = null
let pollingInterval: NodeJS.Timeout | null = null
let sentEventIds: Set<string> = new Set()

// Start polling when first client connects
function startPolling() {
  if (pollingInterval) return
  
  console.log('Starting event polling...')
  
  pollingInterval = setInterval(async () => {
    if (clients.size === 0) {
      // Stop polling if no clients
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
        sentEventIds.clear()
        console.log('Stopped polling - no clients connected')
      }
      return
    }
    
    try {
      const goServiceUrl = process.env.GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app'
      const response = await fetch(`${goServiceUrl}/api/events`)
      
      if (response.ok) {
        const events: DashboardEvent[] = await response.json()
        
        // Process new events (check all events, not just the latest)
        let newEventsFound = 0
        
        for (const event of events) {
          // Skip if we've already sent this event
          if (sentEventIds.has(event.id)) {
            continue
          }
          
          // Skip if this event is older than our last known event
          if (lastEventTimestamp && event.created_at <= lastEventTimestamp) {
            continue
          }
          
          // This is a new event, broadcast it
          console.log('Broadcasting new event:', event.id, event.title)
          broadcastEvent(event)
          sentEventIds.add(event.id)
          lastEventId = event.id
          lastEventTimestamp = event.created_at
          newEventsFound++
        }
        
        if (newEventsFound > 0) {
          console.log(`Broadcasted ${newEventsFound} new events`)
        }
        
        // Clean up old event IDs to prevent memory leak (keep last 100)
        if (sentEventIds.size > 100) {
          const idsArray = Array.from(sentEventIds)
          sentEventIds = new Set(idsArray.slice(-50))
        }
      }
    } catch (error) {
      console.error('Error polling for events:', error)
    }
  }, 5000) // Poll every 5 seconds
}

// Polling will be started when clients connect