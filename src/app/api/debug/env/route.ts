import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Only allow in development or with a secret key
  const debugKey = req.nextUrl.searchParams.get('key');
  const expectedKey = process.env.DEBUG_KEY || 'debug-heimdall-2024';

  if (debugKey !== expectedKey) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const envInfo = {
    // Show presence of environment variables without exposing values
    WEBHOOK_SECRET: !!process.env.WEBHOOK_SECRET,
    GO_SERVICE_URL: process.env.GO_SERVICE_URL || 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(envInfo);
}
