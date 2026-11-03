import type { DashboardEvent } from '@/types/categories';

export function eventTypeLabel(eventType: string): string {
  switch (eventType) {
    case 'github.push':
      return 'PUSH';
    case 'github.pr':
      return 'PR';
    case 'github.issue':
      return 'ISSUE';
    case 'github.release':
      return 'RELEASE';
    case 'error.ci':
      return 'CI FAILED';
    case 'vercel.deploy':
    case 'railway.deploy':
      return 'DEPLOY';
    default:
      return (eventType?.split('.')[1] || 'EVENT').toUpperCase();
  }
}

const NOUNS: Record<string, [string, string]> = {
  'github.push': ['push', 'pushes'],
  'github.pr': ['pull request', 'pull requests'],
  'github.issue': ['issue', 'issues'],
  'github.release': ['release', 'releases'],
  'error.ci': ['CI failure', 'CI failures'],
  'vercel.deploy': ['deploy', 'deploys'],
  'railway.deploy': ['deploy', 'deploys'],
};

/** Plain-language name of an event type, for announcements and group titles. */
export function eventNoun(eventType: string, count = 1): string {
  const known = NOUNS[eventType];
  if (known) return count === 1 ? known[0] : known[1];
  const base = eventType?.split('.')[1] || 'event';
  return count === 1 ? base : `${base}s`;
}

const PRIVATE_PREFIX = /^Private (?:repository|project):\s*/i;

/**
 * Title to show in the UI. Private events carry a "Private repository:" or
 * "Private project:" prefix from the backend. The PRIVATE badge already says
 * so, so the prefix is dropped. The stored title is not changed.
 */
export function displayTitle(event: Pick<DashboardEvent, 'title' | 'private'>): string {
  if (!event.private) return event.title;
  const stripped = event.title.replace(PRIVATE_PREFIX, '').trim();
  if (!stripped) return event.title;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}
