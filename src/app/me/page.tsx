import { Metadata } from 'next';
import { PublicStatsContent } from './PublicStatsContent';

// Fetch stats for metadata
async function getStats() {
  try {
    const goServiceUrl =
      process.env.GO_SERVICE_URL ||
      process.env.NEXT_PUBLIC_GO_SERVICE_URL ||
      'https://heimdall-backend-prod.up.railway.app';
    const response = await fetch(`${goServiceUrl}/api/stats?range=year`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getStats();
  const totalEvents = stats?.total_events || 0;
  const currentStreak = stats?.streak?.current_streak || 0;

  const title = 'Dev Activity | Heimdall';
  const description = `${totalEvents} events tracked | ${currentStreak} day streak | Real-time development activity`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [
        {
          url: '/api/og/stats',
          width: 1200,
          height: 630,
          alt: 'Dev Activity Stats',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/api/og/stats'],
    },
  };
}

export default async function PublicStatsPage() {
  const stats = await getStats();

  return <PublicStatsContent initialStats={stats} />;
}
