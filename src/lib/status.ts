export type BackendState = 'loading' | 'up' | 'down' | 'unreachable';

export interface SystemStatus {
  backend: BackendState;
  /** ISO time of the newest stored event, if the backend reported one. */
  lastEventAt: string | null;
  /** False when the stats request failed, so "no events" and "unknown" differ. */
  statsAvailable: boolean;
}

export interface StatusView {
  label: 'LOADING' | 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  tone: 'neutral' | 'ok' | 'warn' | 'bad';
}

/** OPERATIONAL only when the backend is up. A reachable frontend with a down backend is DEGRADED. */
export function statusView(backend: BackendState): StatusView {
  switch (backend) {
    case 'up':
      return { label: 'OPERATIONAL', tone: 'ok' };
    case 'down':
      return { label: 'DEGRADED', tone: 'warn' };
    case 'unreachable':
      return { label: 'OFFLINE', tone: 'bad' };
    default:
      return { label: 'LOADING', tone: 'neutral' };
  }
}

/** "3h ago" style text. Returns "unavailable" when stats failed and "none yet" when there is no usable time. */
export function formatLastEvent(
  iso: string | null | undefined,
  now: Date = new Date(),
  statsAvailable = true
): string {
  if (!statsAvailable) return 'unavailable';
  if (!iso) return 'none yet';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'none yet';
  const seconds = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Reads the frontend health route and, when the backend is up, the last event time from the stats. */
export async function fetchSystemStatus(statsBaseUrl: string): Promise<SystemStatus> {
  const health = await getJson('/api/health');
  if (!health) return { backend: 'unreachable', lastEventAt: null, statsAvailable: false };
  if (health.backend !== 'up') return { backend: 'down', lastEventAt: null, statsAvailable: false };

  const stats = await getJson(`${statsBaseUrl.replace(/\/+$/, '')}/api/stats`);
  const last = stats && typeof stats.last_event_at === 'string' ? stats.last_event_at : null;
  return { backend: 'up', lastEventAt: last, statsAvailable: stats !== null };
}
