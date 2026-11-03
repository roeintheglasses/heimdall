import { NextRequest } from 'next/server';
import { getGoServiceUrl } from '@/lib/api';
import {
  diffEvents,
  formatSSE,
  formatStatus,
  SSE_HEARTBEAT,
  SSE_RETRY,
  StreamEvent,
} from '@/lib/sse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_CLIENTS = 50;
const POLL_INTERVAL_MS = 15000;
const POLL_TIMEOUT_MS = 4000;
const HEARTBEAT_MS = 25000;
const MAX_STREAM_MS = 290000;

const encoder = new TextEncoder();
const clients: Set<ReadableStreamDefaultController<Uint8Array>> = new Set();
// Per-client teardown (heartbeat and close timer), so a failed enqueue can release them.
const cleanups = new Map<ReadableStreamDefaultController<Uint8Array>, () => void>();

// Poller state lives at module scope so it survives client reconnects.
let seenIds: Set<string> | null = null;
let backendUp: boolean | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let polling = false;
// Bumped whenever poller state is reset, so an in-flight poll can tell its result is stale.
let generation = 0;

function send(controller: ReadableStreamDefaultController<Uint8Array>, message: string) {
  try {
    controller.enqueue(encoder.encode(message));
  } catch {
    const cleanup = cleanups.get(controller);
    if (cleanup) {
      cleanup();
    } else {
      clients.delete(controller);
      stopPollingIfIdle();
    }
  }
}

function broadcast(message: string) {
  for (const controller of clients) {
    send(controller, message);
  }
}

function setBackendUp(up: boolean) {
  if (backendUp === up) return;
  backendUp = up;
  broadcast(formatStatus(up ? 'up' : 'down'));
}

async function pollOnce() {
  if (polling) return;
  polling = true;
  const startedGeneration = generation;
  try {
    const response = await fetch(`${getGoServiceUrl()}/api/events?limit=50`, {
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) {
      if (startedGeneration === generation) setBackendUp(false);
      return;
    }
    const data = await response.json();
    if (startedGeneration !== generation) return;
    const events: StreamEvent[] = Array.isArray(data) ? data : data.events;
    if (!Array.isArray(events)) {
      setBackendUp(false);
      return;
    }
    setBackendUp(true);
    const { newEvents, nextIds } = diffEvents(seenIds, events);
    for (const event of newEvents) {
      broadcast(formatSSE(event));
    }
    seenIds = nextIds;
  } catch {
    if (startedGeneration === generation) setBackendUp(false);
  } finally {
    polling = false;
  }
}

function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(pollOnce, POLL_INTERVAL_MS);
  void pollOnce();
}

function stopPollingIfIdle() {
  if (clients.size > 0) return;
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  generation++;
  seenIds = null;
  backendUp = null;
}

export async function GET(request: NextRequest) {
  if (clients.size >= MAX_CLIENTS) {
    return new Response('Too many connections', {
      status: 503,
      headers: { 'Retry-After': '30' },
    });
  }

  let cleanup: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      clients.add(controller);

      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let closeTimer: ReturnType<typeof setTimeout> | null = null;

      cleanup = () => {
        if (heartbeat) clearInterval(heartbeat);
        if (closeTimer) clearTimeout(closeTimer);
        heartbeat = null;
        closeTimer = null;
        cleanups.delete(controller);
        clients.delete(controller);
        stopPollingIfIdle();
      };
      cleanups.set(controller, cleanup);

      send(
        controller,
        `data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`
      );
      if (backendUp !== null) {
        send(controller, formatStatus(backendUp ? 'up' : 'down'));
      }

      heartbeat = setInterval(() => send(controller, SSE_HEARTBEAT), HEARTBEAT_MS);

      // Close before the platform limit so the client reconnects cleanly.
      closeTimer = setTimeout(() => {
        send(controller, SSE_RETRY);
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, MAX_STREAM_MS);

      request.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      startPolling();
    },

    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
