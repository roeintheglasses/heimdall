import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface MonthlyStats {
  year: number;
  month: number;
  month_name: string;
  total_events: number;
  daily_average: number;
  busiest_day: {
    date: string;
    count: number;
  };
}

async function getMonthlyStats(month: string): Promise<MonthlyStats | null> {
  try {
    const goServiceUrl =
      process.env.GO_SERVICE_URL ||
      process.env.NEXT_PUBLIC_GO_SERVICE_URL ||
      'https://heimdall-backend-prod.up.railway.app';
    const response = await fetch(`${goServiceUrl}/api/wrapped/${month}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  const { month } = await params;
  const stats = await getMonthlyStats(month);

  const monthName = stats?.month_name || 'Unknown';
  const year = stats?.year || new Date().getFullYear();
  const totalEvents = stats?.total_events || 0;
  const dailyAvg = stats?.daily_average?.toFixed(1) || '0';
  const busiestDay = stats?.busiest_day?.count || 0;

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
      {/* Scanline overlay */}
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
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: 8,
          }}
        >
          Dev Wrapped
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: '#00ffff',
            textShadow: '0 0 20px #00ffff',
            marginTop: 8,
          }}
        >
          {monthName} {year}
        </div>
      </div>

      {/* Main stat */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 'bold',
            color: '#00ffff',
            textShadow: '0 0 30px #00ffff, 0 0 60px #00ffff',
          }}
        >
          {totalEvents.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: 18,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: 4,
          }}
        >
          Events
        </div>
      </div>

      {/* Secondary stats */}
      <div
        style={{
          display: 'flex',
          gap: 80,
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
              fontSize: 40,
              color: '#00ff00',
              textShadow: '0 0 10px #00ff00',
            }}
          >
            {dailyAvg}
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>AVG / DAY</div>
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
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 28 }}>🔥</span>
            <div
              style={{
                fontSize: 40,
                color: '#ff9500',
                textShadow: '0 0 10px #ff9500',
              }}
            >
              {busiestDay}
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>BEST DAY</div>
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
        Powered by Heimdall
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
