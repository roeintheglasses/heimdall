import { NextRequest, NextResponse } from 'next/server';
import { detectEvent, isObject, type Provider } from '@/lib/webhook/detect';
import { buildEnvelope, forwardToBackend } from '@/lib/webhook/forward';
import { verifyGitHub, verifyRailwayToken, verifyVercel } from '@/lib/webhook/verify';

export const runtime = 'edge';

const MAX_BODY_BYTES = 1024 * 1024;

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256, X-Vercel-Signature, X-Railway-Event, X-Railway-Project, X-Railway-Service',
    },
  });
}

interface LogFields {
  provider: Provider | null;
  eventType: string | null;
  deliveryId: string | null;
  bodyBytes: number;
}

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const fields: LogFields = { provider: null, eventType: null, deliveryId: null, bodyBytes: 0 };

  // Log only an allowlist of fields: never headers, payloads, signatures, or the token URL.
  const respond = (status: number, body: Record<string, unknown> | 'pong') => {
    // eslint-disable-next-line no-console -- single structured access log
    console.log('webhook', { ...fields, status, ms: Date.now() - startTime });
    if (body === 'pong') {
      return new NextResponse('pong', { status, headers: { 'Content-Type': 'text/plain' } });
    }
    return json(status, body);
  };

  try {
    const declaredLength = Number(req.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return respond(413, { error: 'payload too large' });
    }

    const body = await req.text();
    fields.bodyBytes = new TextEncoder().encode(body).length;
    if (fields.bodyBytes > MAX_BODY_BYTES) {
      return respond(413, { error: 'payload too large' });
    }

    // Authenticate. The provider follows from which credential is present, never from the payload.
    const githubEvent = req.headers.get('x-github-event');
    const vercelSignature = req.headers.get('x-vercel-signature');
    const token = new URL(req.url).searchParams.get('token');

    let provider: Provider;
    if (githubEvent !== null) {
      provider = 'github';
      fields.provider = provider;
      const secret = process.env.WEBHOOK_SECRET;
      if (!secret) return respond(500, { error: 'webhook not configured' });
      const ok = await verifyGitHub(body, req.headers.get('x-hub-signature-256'), secret);
      if (!ok) return respond(401, { error: 'invalid signature' });
    } else if (vercelSignature !== null) {
      provider = 'vercel';
      fields.provider = provider;
      const secret = process.env.VERCEL_WEBHOOK_SECRET;
      if (!secret) return respond(500, { error: 'webhook not configured' });
      const ok = await verifyVercel(body, vercelSignature, secret);
      if (!ok) return respond(401, { error: 'invalid signature' });
    } else if (token !== null) {
      provider = 'railway';
      fields.provider = provider;
      const expected = process.env.RAILWAY_WEBHOOK_TOKEN;
      if (!expected) return respond(500, { error: 'webhook not configured' });
      const ok = await verifyRailwayToken(token, expected);
      if (!ok) return respond(401, { error: 'invalid token' });
    } else {
      return respond(401, { error: 'missing credentials' });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return respond(400, { error: 'invalid JSON' });
    }
    if (!isObject(payload)) {
      return respond(400, { error: 'payload must be a JSON object' });
    }

    const detected = await detectEvent({
      provider,
      payload,
      rawBody: body,
      githubEvent,
      githubDelivery: req.headers.get('x-github-delivery'),
    });

    if (detected.kind === 'pong') return respond(200, 'pong');
    if (detected.kind === 'ignore') return respond(202, { status: 'ignored' });

    fields.eventType = detected.type;
    fields.deliveryId = detected.deliveryId;

    const result = await forwardToBackend(
      buildEnvelope(detected.type, payload, detected.deliveryId)
    );
    if (!result.ok) {
      return respond(result.status, { error: result.reason });
    }
    return respond(200, { status: 'ok' });
  } catch (error) {
    console.error('webhook error', { error: error instanceof Error ? error.name : 'unknown' });
    return respond(500, { error: 'internal server error' });
  }
}
