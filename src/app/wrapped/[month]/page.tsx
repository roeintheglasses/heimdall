import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WrappedContent } from './WrappedContent';
import { getGoServiceUrl } from '@/lib/api';
import { monthNameUTC, parseWrappedMonth } from '@/lib/months';

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

type StatsResult = { ok: true; stats: MonthlyStats | null } | { ok: false };

async function getMonthlyStats(month: string): Promise<StatsResult> {
  try {
    const goServiceUrl = getGoServiceUrl();
    const response = await fetch(`${goServiceUrl}/api/wrapped/${month}`, {
      next: { revalidate: 300 },
    });

    if (response.status === 404) {
      return { ok: true, stats: null };
    }
    if (!response.ok) {
      return { ok: false };
    }

    return { ok: true, stats: (await response.json()) as MonthlyStats };
  } catch {
    return { ok: false };
  }
}

interface PageProps {
  params: Promise<{ month: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { month } = await params;
  const parsed = parseWrappedMonth(month);
  if (!parsed) {
    return { title: 'Invalid Month' };
  }

  const result = await getMonthlyStats(month);
  const stats = result.ok ? result.stats : null;
  const monthName = stats?.month_name || monthNameUTC(parsed.year, parsed.month);

  const title = `${monthName} ${parsed.year} Wrapped`;
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
  const parsed = parseWrappedMonth(month);
  if (!parsed) {
    notFound();
  }

  const result = await getMonthlyStats(month);

  return (
    <WrappedContent month={month} stats={result.ok ? result.stats : null} error={!result.ok} />
  );
}
