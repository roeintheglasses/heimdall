import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    
    // Log everything Railway sends
    const allHeaders = Object.fromEntries(req.headers.entries())
    let payload = null
    
    try {
      payload = body ? JSON.parse(body) : null
    } catch (e) {
      console.log('Non-JSON body received:', body)
    }
    
    console.log('Railway Debug Webhook:', {
      headers: allHeaders,
      bodyLength: body.length,
      body: body,
      payload: payload,
      timestamp: new Date().toISOString()
    })
    
    return new NextResponse('OK', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    })
    
  } catch (error) {
    console.error('Railway debug webhook error:', error)
    return new NextResponse('OK', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}

export async function GET(req: NextRequest) {
  return new NextResponse('Railway debug webhook endpoint is active', { 
    status: 200,
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}