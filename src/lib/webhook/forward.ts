import { Client } from '@upstash/qstash';
import { getGoServiceUrl } from '@/lib/api';

export interface ForwardEnvelope {
  type: string;
  event: Record<string, unknown>;
  /** Edge receipt time, unix seconds. */
  timestamp: number;
  delivery_id: string;
}

export type ForwardResult =
  | { ok: true; via: 'qstash' | 'direct' }
  | { ok: false; status: 400 | 500 | 502; reason: string };

const DIRECT_TIMEOUT_MS = 8000;

export function buildEnvelope(
  type: string,
  event: Record<string, unknown>,
  deliveryId: string,
  nowMs: number = Date.now()
): ForwardEnvelope {
  return {
    type,
    event,
    timestamp: Math.floor(nowMs / 1000),
    delivery_id: deliveryId,
  };
}

async function forwardDirect(
  url: string,
  secret: string,
  envelope: ForwardEnvelope
): Promise<ForwardResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Heimdall-Secret': secret,
      },
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(DIRECT_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: 502, reason: 'backend unreachable' };
  }
  if (response.ok) return { ok: true, via: 'direct' };
  // Drain the body so the connection can be reused; never log it.
  await response.text().catch(() => '');
  // Auth and rate-limit rejections are our configuration or load, not a bad payload: let the provider retry.
  if (response.status === 401 || response.status === 403 || response.status === 429) {
    return { ok: false, status: 502, reason: `backend refused request (${response.status})` };
  }
  if (response.status >= 400 && response.status < 500) {
    return { ok: false, status: 400, reason: `backend rejected payload (${response.status})` };
  }
  return { ok: false, status: 502, reason: `backend error (${response.status})` };
}

/**
 * Send an envelope to the Go backend. Uses QStash when QSTASH_TOKEN is set and
 * falls back to a direct call if publishing fails. Both paths carry
 * X-Heimdall-Secret.
 */
export async function forwardToBackend(envelope: ForwardEnvelope): Promise<ForwardResult> {
  const secret = process.env.BACKEND_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: false, status: 500, reason: 'BACKEND_WEBHOOK_SECRET is not configured' };
  }

  let url: string;
  try {
    url = `${getGoServiceUrl()}/api/webhook`;
  } catch {
    return { ok: false, status: 500, reason: 'backend URL is not configured' };
  }

  const qstashToken = process.env.QSTASH_TOKEN;
  if (qstashToken) {
    try {
      const qstash = new Client({ token: qstashToken });
      // QStash delivers custom headers (sent as Upstash-Forward-*) to the backend.
      // No `delay`: it is measured in seconds and would postpone every event.
      await qstash.publishJSON({
        url,
        body: envelope,
        headers: { 'X-Heimdall-Secret': secret },
        retries: 3,
      });
      return { ok: true, via: 'qstash' };
    } catch (error) {
      console.error('qstash publish failed, falling back to direct', {
        error: error instanceof Error ? error.name : 'unknown',
      });
    }
  }

  return forwardDirect(url, secret, envelope);
}
