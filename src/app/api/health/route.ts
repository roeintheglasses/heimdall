import { NextResponse } from 'next/server';
import { getGoServiceUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  let backend: 'up' | 'down' = 'down';
  try {
    const response = await fetch(`${getGoServiceUrl()}/api/health`, {
      signal: AbortSignal.timeout(2000),
      cache: 'no-store',
    });
    backend = response.ok ? 'up' : 'down';
  } catch {
    backend = 'down';
  }

  return NextResponse.json({
    status: backend === 'up' ? 'healthy' : 'degraded',
    backend,
    timestamp: new Date().toISOString(),
    service: 'heimdall-frontend',
  });
}
