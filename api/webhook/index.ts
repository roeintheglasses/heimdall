import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

export const runtime = 'edge'

interface QStashPayload {
  event_type: string
  event: any
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new NextResponse('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.text()
    const githubEvent = req.headers.get('x-github-event')
    const vercelEvent = req.headers.get('x-vercel-deployment-url')
    const signature = req.headers.get('x-hub-signature-256')

    // Verify GitHub webhook signature if present
    if (githubEvent && signature && process.env.GITHUB_WEBHOOK_SECRET) {
      const expectedSignature = 'sha256=' + createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')
      
      if (expectedSignature !== signature) {
        return new NextResponse('Invalid signature', { status: 401 })
      }
    }

    // Parse the webhook payload
    const payload = JSON.parse(body)
    
    // Determine event type and create QStash payload
    let qstashPayload: QStashPayload

    if (githubEvent === 'push') {
      qstashPayload = {
        event_type: 'github.push',
        event: payload
      }
    } else if (vercelEvent) {
      qstashPayload = {
        event_type: 'vercel.deploy',
        event: payload
      }
    } else {
      return new NextResponse('Unknown event type', { status: 400 })
    }

    // Send to QStash (or directly to Go service for now)
    const goServiceUrl = process.env.GO_SERVICE_URL || 'http://localhost:8080'
    
    const response = await fetch(`${goServiceUrl}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(qstashPayload)
    })

    if (!response.ok) {
      console.error('Failed to process webhook:', response.status, await response.text())
      return new NextResponse('Failed to process webhook', { status: 500 })
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}