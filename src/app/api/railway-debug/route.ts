import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    
    // Log everything Railway sends
    const allHeaders = Object.fromEntries(req.headers.entries())
    const payload = body ? JSON.parse(body) : null
    
    console.log('Railway Debug Webhook:', {
      headers: allHeaders,
      bodyLength: body.length,
      body: body,
      payload: payload,
      timestamp: new Date().toISOString()
    })
    
    return new NextResponse('Railway debug webhook received successfully', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
    
  } catch (error) {
    console.error('Railway debug webhook error:', error)
    return new NextResponse('Error processing Railway debug webhook', { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return new NextResponse('Railway debug webhook endpoint is active', { 
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}