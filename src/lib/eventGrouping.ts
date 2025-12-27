import { DashboardEvent } from '@/types/categories';

export interface EventGroup {
  id: string;
  type: 'push_batch' | 'deploy_lifecycle' | 'pr_updates' | 'single';
  title: string;
  events: DashboardEvent[];
  startTime: Date;
  endTime: Date;
  metadata: {
    repo?: string;
    branch?: string;
    project?: string;
    prNumber?: number;
    status?: string;
  };
}

// Time thresholds for grouping (in milliseconds)
const GROUPING_THRESHOLDS = {
  push_batch: 5 * 60 * 1000, // 5 minutes
  deploy_lifecycle: 30 * 60 * 1000, // 30 minutes
  pr_updates: 10 * 60 * 1000, // 10 minutes
};

/**
 * Check if two events are related and can be grouped together
 */
export function isRelatedEvent(event1: DashboardEvent, event2: DashboardEvent): boolean {
  const time1 = new Date(event1.created_at).getTime();
  const time2 = new Date(event2.created_at).getTime();
  const timeDiff = Math.abs(time1 - time2);

  // GitHub push events - same repo + branch within threshold
  if (event1.event_type === 'github.push' && event2.event_type === 'github.push') {
    const repo1 = event1.metadata?.repo;
    const repo2 = event2.metadata?.repo;
    const branch1 = event1.metadata?.branch;
    const branch2 = event2.metadata?.branch;

    return (
      repo1 &&
      repo2 &&
      repo1 === repo2 &&
      branch1 === branch2 &&
      timeDiff <= GROUPING_THRESHOLDS.push_batch
    );
  }

  // Deploy lifecycle - same project within threshold
  if (
    (event1.event_type?.includes('deploy') && event2.event_type?.includes('deploy')) ||
    (event1.event_type?.startsWith('vercel.') && event2.event_type?.startsWith('vercel.')) ||
    (event1.event_type?.startsWith('railway.') && event2.event_type?.startsWith('railway.'))
  ) {
    const project1 = event1.metadata?.project || event1.metadata?.project_name;
    const project2 = event2.metadata?.project || event2.metadata?.project_name;

    return (
      project1 &&
      project2 &&
      project1 === project2 &&
      timeDiff <= GROUPING_THRESHOLDS.deploy_lifecycle
    );
  }

  // PR updates - same PR number within threshold
  if (event1.event_type === 'github.pr' && event2.event_type === 'github.pr') {
    const prNumber1 = event1.metadata?.pr_number || event1.metadata?.number;
    const prNumber2 = event2.metadata?.pr_number || event2.metadata?.number;
    const repo1 = event1.metadata?.repo;
    const repo2 = event2.metadata?.repo;

    return (
      prNumber1 &&
      prNumber2 &&
      prNumber1 === prNumber2 &&
      repo1 === repo2 &&
      timeDiff <= GROUPING_THRESHOLDS.pr_updates
    );
  }

  return false;
}

/**
 * Determine the group type based on events
 */
function determineGroupType(events: DashboardEvent[]): EventGroup['type'] {
  if (events.length === 1) return 'single';

  const firstEvent = events[0];

  if (firstEvent.event_type === 'github.push') return 'push_batch';
  if (firstEvent.event_type === 'github.pr') return 'pr_updates';
  if (firstEvent.event_type?.includes('deploy')) return 'deploy_lifecycle';

  return 'single';
}

/**
 * Generate a title for an event group
 */
function generateGroupTitle(type: EventGroup['type'], events: DashboardEvent[]): string {
  const count = events.length;

  switch (type) {
    case 'push_batch': {
      const repo = events[0].metadata?.repo || 'repository';
      const branch = events[0].metadata?.branch?.replace('refs/heads/', '') || 'branch';
      return `${count} pushes to ${repo}/${branch}`;
    }
    case 'deploy_lifecycle': {
      const project = events[0].metadata?.project || events[0].metadata?.project_name || 'project';
      const latestStatus = events[events.length - 1].metadata?.status || 'deploying';
      return `${project} deployment: ${latestStatus}`;
    }
    case 'pr_updates': {
      const prNumber = events[0].metadata?.pr_number || events[0].metadata?.number;
      const repo = events[0].metadata?.repo || 'repository';
      return `PR #${prNumber} - ${count} updates in ${repo}`;
    }
    default:
      return events[0].title;
  }
}

/**
 * Extract metadata summary for a group
 */
function extractGroupMetadata(
  type: EventGroup['type'],
  events: DashboardEvent[]
): EventGroup['metadata'] {
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  switch (type) {
    case 'push_batch':
      return {
        repo: firstEvent.metadata?.repo,
        branch: firstEvent.metadata?.branch?.replace('refs/heads/', ''),
      };
    case 'deploy_lifecycle':
      return {
        project: firstEvent.metadata?.project || firstEvent.metadata?.project_name,
        status: lastEvent.metadata?.status,
      };
    case 'pr_updates':
      return {
        repo: firstEvent.metadata?.repo,
        prNumber: firstEvent.metadata?.pr_number || firstEvent.metadata?.number,
      };
    default:
      return {};
  }
}

/**
 * Group related events together
 */
export function groupEvents(events: DashboardEvent[]): EventGroup[] {
  if (events.length === 0) return [];

  // Sort events by time (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const groups: EventGroup[] = [];
  const processedIds = new Set<string>();

  for (const event of sortedEvents) {
    if (processedIds.has(event.id)) continue;

    // Find all related events
    const relatedEvents: DashboardEvent[] = [event];
    processedIds.add(event.id);

    for (const otherEvent of sortedEvents) {
      if (processedIds.has(otherEvent.id)) continue;
      if (event.id === otherEvent.id) continue;

      // Check if this event is related to any event in the current group
      const isRelated = relatedEvents.some((groupEvent) => isRelatedEvent(groupEvent, otherEvent));

      if (isRelated) {
        relatedEvents.push(otherEvent);
        processedIds.add(otherEvent.id);
      }
    }

    // Sort related events by time (oldest first within group)
    relatedEvents.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const groupType = determineGroupType(relatedEvents);

    groups.push({
      id: `group-${event.id}`,
      type: groupType,
      title: generateGroupTitle(groupType, relatedEvents),
      events: relatedEvents,
      startTime: new Date(relatedEvents[0].created_at),
      endTime: new Date(relatedEvents[relatedEvents.length - 1].created_at),
      metadata: extractGroupMetadata(groupType, relatedEvents),
    });
  }

  // Sort groups by most recent event
  return groups.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
}

/**
 * Check if grouping would reduce the number of items displayed
 */
export function shouldEnableGrouping(events: DashboardEvent[]): boolean {
  const groups = groupEvents(events);
  return groups.length < events.length * 0.8; // Only enable if it reduces by 20%+
}
