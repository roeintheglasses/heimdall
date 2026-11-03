import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/webhook/verify';

export async function GET(req: NextRequest) {
  // Require an explicitly configured key sent in a header. If DEBUG_KEY is not set,
  // the endpoint is disabled. Keys in query strings end up in logs, so they are not accepted.
  const expectedKey = process.env.DEBUG_KEY;
  const providedKey = req.headers.get('x-debug-key');

  if (!expectedKey || !providedKey || !(await safeEqual(providedKey, expectedKey))) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Show presence of environment variables without exposing values
  const envInfo = {
    WEBHOOK_SECRET: !!process.env.WEBHOOK_SECRET,
    BACKEND_WEBHOOK_SECRET: !!process.env.BACKEND_WEBHOOK_SECRET,
    VERCEL_WEBHOOK_SECRET: !!process.env.VERCEL_WEBHOOK_SECRET,
    RAILWAY_WEBHOOK_TOKEN: !!process.env.RAILWAY_WEBHOOK_TOKEN,
    QSTASH_TOKEN: !!process.env.QSTASH_TOKEN,
    GO_SERVICE_URL: process.env.GO_SERVICE_URL || 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(envInfo);
}
