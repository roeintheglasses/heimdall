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
        }
      }, 30000) // Send heartbeat every 30 seconds
      
      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clients.delete(controller)
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
let pollingInterval: NodeJS.Timeout | null = null

// Start polling when first client connects
function startPolling() {
  if (pollingInterval) return
  
  pollingInterval = setInterval(async () => {
    if (clients.size === 0) {
      // Stop polling if no clients
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
      return
    }
    
    try {
      const goServiceUrl = process.env.GO_SERVICE_URL || 'http://localhost:8080'
      const response = await fetch(`${goServiceUrl}/api/events`)
      
      if (response.ok) {
        const events: DashboardEvent[] = await response.json()
        
        // Find new events since last check
        if (events.length > 0) {
          const latestEvent = events[0]
          
          if (!lastEventId || latestEvent.id !== lastEventId) {
            // New event found, broadcast it
            broadcastEvent(latestEvent)
            lastEventId = latestEvent.id
          }
        }
      }
    } catch (error) {
      console.error('Error polling for events:', error)
    }
  }, 5000) // Poll every 5 seconds
}

// Start polling when this module loads
if (typeof window === 'undefined') {
  // Only start polling on server side
  setTimeout(startPolling, 1000)
}