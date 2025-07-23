import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface QStashPayload {
  type: string
  event: any
}

export async function POST(req: NextRequest) {

  try {
    const body = await req.text()
    const githubEvent = req.headers.get('x-github-event')
    const vercelEvent = req.headers.get('x-vercel-deployment-url')
    const signature = req.headers.get('x-hub-signature-256')

    // Verify GitHub webhook signature if present
    if (githubEvent && signature && process.env.GITHUB_WEBHOOK_SECRET) {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(process.env.GITHUB_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
      const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
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
        type: 'github.push',
        event: payload
      }
    } else if (vercelEvent) {
      qstashPayload = {
        type: 'vercel.deploy',
        event: payload
      }
    } else {
      return new NextResponse('Unknown event type', { status: 400 })
    }

    // Forward to deployed Go service on Railway
    const goServiceUrl = process.env.GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app'
    
    console.log('Forwarding webhook to Go service:', {
      eventType: githubEvent || 'vercel',
      url: goServiceUrl
    })

    const response = await fetch(`${goServiceUrl}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(qstashPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to process webhook:', response.status, errorText)
      return new NextResponse(`Failed to process webhook: ${response.status}`, { status: 500 })
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}