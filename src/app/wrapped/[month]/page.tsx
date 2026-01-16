import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WrappedContent } from './WrappedContent';

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
  top_services: Array<{
    service: string;
    count: number;
  }>;
  events_per_day: Array<{
    date: string;
    count: number;
  }>;
  category_breakdown: Record<string, number>;
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

function parseMonth(month: string): { year: number; month: number } | null {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const monthNum = parseInt(match[2], 10);

  if (monthNum < 1 || monthNum > 12) return null;

  return { year, month: monthNum };
}

interface PageProps {
  params: Promise<{ month: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { month } = await params;
  const parsed = parseMonth(month);
  if (!parsed) {
    return { title: 'Invalid Month | Heimdall Wrapped' };
  }

  const stats = await getMonthlyStats(month);
  const monthName =
    stats?.month_name ||
    new Date(parsed.year, parsed.month - 1).toLocaleDateString('en-US', { month: 'long' });

  const title = `${monthName} ${parsed.year} Wrapped | Heimdall`;
  const description = stats
    ? `${stats.total_events} events | ${stats.daily_average.toFixed(1)} avg/day | ${monthName} ${parsed.year}`
    : `View your ${monthName} ${parsed.year} development activity`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [
        {
          url: `/api/og/wrapped/${month}`,
          width: 1200,
          height: 630,
          alt: `${monthName} ${parsed.year} Wrapped`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og/wrapped/${month}`],
    },
  };
}

export default async function WrappedPage({ params }: PageProps) {
  const { month } = await params;
  const parsed = parseMonth(month);
  if (!parsed) {
    notFound();
  }

  const stats = await getMonthlyStats(month);

  return <WrappedContent month={month} stats={stats} />;
}
