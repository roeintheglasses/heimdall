import { NextRequest, NextResponse } from 'next/server';
import { getGoServiceUrl } from '@/lib/api';
import { escapeXml, getBadgeContent, type BadgeStats } from '@/lib/badge';

export const runtime = 'edge';

async function getStats(): Promise<BadgeStats | null> {
  try {
    const goServiceUrl = getGoServiceUrl();
    const response = await fetch(`${goServiceUrl}/api/stats`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as BadgeStats;
  } catch {
    return null;
  }
}

function generateSVG(
  rawLabel: string,
  rawValue: string,
  color: string,
  style: 'flat' | 'flat-square'
): string {
  const label = escapeXml(rawLabel);
  const value = escapeXml(rawValue);
  const labelWidth = rawLabel.length * 7 + 10;
  const valueWidth = rawValue.length * 7 + 10;
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

  const { label, value } = stats
    ? getBadgeContent(type, stats)
    : { label: 'Heimdall', value: 'N/A' };

  const svg = generateSVG(label, value, color, style);

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': stats ? 'public, max-age=300, s-maxage=300' : 'no-store',
    },
  });
}
