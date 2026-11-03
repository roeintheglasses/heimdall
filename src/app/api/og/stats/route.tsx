import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { getGoServiceUrl } from '@/lib/api';

export const runtime = 'edge';

interface OgStats {
  total_events?: number;
  last_24_hours?: number;
  last_week?: number;
  streak?: { current_streak?: number };
}

type StatsResult = { ok: true; stats: OgStats } | { ok: false };

async function getStats(): Promise<StatsResult> {
  try {
    const goServiceUrl = getGoServiceUrl();
    const response = await fetch(`${goServiceUrl}/api/stats`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { ok: false };
    }

    return { ok: true, stats: (await response.json()) as OgStats };
  } catch {
    return { ok: false };
  }
}

export async function GET(_request: NextRequest) {
  const result = await getStats();
  const stats = result.ok ? result.stats : null;

  // On backend failure show placeholders instead of misleading zeros.
  const fmt = (n: number | undefined) => (stats ? (n ?? 0).toLocaleString('en-US') : '--');
  const totalEvents = fmt(stats?.total_events);
  const currentStreak = fmt(stats?.streak?.current_streak);
  const last24h = fmt(stats?.last_24_hours);
  const lastWeek = fmt(stats?.last_week);

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d0d0d',
        fontFamily: 'monospace',
        position: 'relative',
      }}
    >
      {/* Scanline overlay effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
          pointerEvents: 'none',
          display: 'flex',
        }}
      />

      {/* Border */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          bottom: 20,
          border: '2px solid rgba(0, 255, 255, 0.3)',
          display: 'flex',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: '#00ffff',
            textShadow: '0 0 10px #00ffff',
          }}
        >
          {`> HEIMDALL::DEV_ACTIVITY`}
        </div>
      </div>

      {/* Main stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 80,
        }}
      >
        {/* Total events */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 'bold',
              color: '#00ffff',
              textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff',
            }}
          >
            {totalEvents}
          </div>
          <div
            style={{
              fontSize: 16,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: 4,
            }}
          >
            Total Events
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 2,
            height: 100,
            backgroundColor: 'rgba(0, 255, 255, 0.2)',
            display: 'flex',
          }}
        />

        {/* Streak */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 48 }}>🔥</span>
            <div
              style={{
                fontSize: 80,
                fontWeight: 'bold',
                color: '#ff9500',
                textShadow: '0 0 20px #ff9500',
              }}
            >
              {currentStreak}
            </div>
          </div>
          <div
            style={{
              fontSize: 16,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: 4,
            }}
          >
            Day Streak
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div
        style={{
          display: 'flex',
          gap: 60,
          marginTop: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: '#ff00ff',
              textShadow: '0 0 10px #ff00ff',
            }}
          >
            {last24h}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>LAST 24H</div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: '#00ff00',
              textShadow: '0 0 10px #00ff00',
            }}
          >
            {lastWeek}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>LAST 7D</div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 14,
          color: 'rgba(0, 255, 255, 0.5)',
        }}
      >
        Powered by Heimdall Dashboard
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': result.ok ? 'public, max-age=60, s-maxage=60' : 'no-store',
      },
    }
  );
}
