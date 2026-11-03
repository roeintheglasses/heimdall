export interface BadgeStats {
  total_events: number;
  last_24_hours: number;
  last_event_at?: string;
  streak?: {
    current_streak: number;
    last_active_date: string;
  };
}

export function getTimeAgo(dateStr: string | undefined, now: Date = new Date()): string {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'N/A';

  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Picks the label and value for a badge type. Falls back to the "last" badge for unknown types. */
export function getBadgeContent(
  type: string,
  stats: BadgeStats,
  now: Date = new Date()
): { label: string; value: string } {
  switch (type) {
    case 'today':
      return { label: 'Last 24h', value: `${stats.last_24_hours} events` };
    case 'streak':
      return { label: 'Streak', value: `${stats.streak?.current_streak || 0} days` };
    case 'total':
      return { label: 'Total', value: `${stats.total_events} events` };
    case 'last':
    default:
      return {
        label: 'Last shipped',
        value: getTimeAgo(stats.last_event_at || stats.streak?.last_active_date, now),
      };
  }
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
