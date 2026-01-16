import { NextRequest, NextResponse } from 'next/server';
import { getGoServiceUrl } from '@/lib/api';

export const runtime = 'edge';

interface Stats {
  total_events: number;
  last_24_hours: number;
  streak?: {
    current_streak: number;
    last_active_date: string;
  };
}

async function getStats(): Promise<Stats | null> {
  try {
    const goServiceUrl = getGoServiceUrl();
    const response = await fetch(`${goServiceUrl}/api/stats`, {
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

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function generateSVG(
  label: string,
  value: string,
  color: string,
  style: 'flat' | 'flat-square'
): string {
  const labelWidth = label.length * 7 + 10;
  const valueWidth = value.length * 7 + 10;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;
  const radius = style === 'flat' ? 3 : 0;

  const colorMap: Record<string, string> = {
    cyan: '#00ffff',
    green: '#00ff00',
    magenta: '#ff00ff',
    orange: '#ff9500',
    pink: '#ff69b4',
  };

  const bgColor = colorMap[color] || colorMap.cyan;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${radius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#1a1a2e"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${bgColor}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14" fill="#fff">${label}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#000">${value}</text>
  </g>
</svg>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'last';
  const style = (searchParams.get('style') || 'flat') as 'flat' | 'flat-square';
  const color = searchParams.get('color') || 'cyan';

  const stats = await getStats();

  let label = 'Heimdall';
  let value = 'N/A';

  if (stats) {
    switch (type) {
      case 'last':
        label = 'Last shipped';
        value = stats.streak?.last_active_date ? getTimeAgo(stats.streak.last_active_date) : 'N/A';
        break;
      case 'today':
        label = 'Today';
        value = `${stats.last_24_hours} deploys`;
        break;
      case 'streak':
        label = 'Streak';
        value = `${stats.streak?.current_streak || 0} days`;
        break;
      case 'total':
        label = 'Total';
        value = `${stats.total_events} events`;
        break;
      default:
        label = 'Last shipped';
        value = stats.streak?.last_active_date ? getTimeAgo(stats.streak.last_active_date) : 'N/A';
    }
  }

  const svg = generateSVG(label, value, color, style);

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
