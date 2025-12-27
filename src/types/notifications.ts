export type NotificationType = 'error' | 'warning' | 'info' | 'success';
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  eventId?: string;
  eventType?: string;
  createdAt: string;
  read: boolean;
  priority: NotificationPriority;
  metadata?: Record<string, any>;
}

export interface NotificationFilter {
  type?: NotificationType | 'all';
  read?: boolean | 'all';
  priority?: NotificationPriority | 'all';
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  filter: NotificationFilter;
}

// Notification type configuration
export const NOTIFICATION_CONFIG = {
  error: {
    icon: 'AlertCircle',
    color: 'neon-orange',
    label: 'ERROR',
    description: 'Failed deployments and system errors',
  },
  warning: {
    icon: 'AlertTriangle',
    color: 'neon-yellow',
    label: 'WARNING',
    description: 'Security alerts and potential issues',
  },
  info: {
    icon: 'Info',
    color: 'neon-cyan',
    label: 'INFO',
    description: 'General notifications',
  },
  success: {
    icon: 'CheckCircle',
    color: 'neon-green',
    label: 'SUCCESS',
    description: 'Successful operations',
  },
} as const;

// Maximum notifications to keep in storage
export const MAX_NOTIFICATIONS = 100;

// Events that auto-generate notifications
export const NOTABLE_EVENT_PATTERNS = {
  // Failed deployments
  failedDeploy: {
    match: (event: any) =>
      (event.event_type?.includes('deploy') ||
        event.event_type?.startsWith('vercel.') ||
        event.event_type?.startsWith('railway.')) &&
      (event.metadata?.status === 'FAILED' ||
        event.metadata?.status === 'error' ||
        event.metadata?.status === 'ERROR'),
    type: 'error' as NotificationType,
    priority: 'high' as NotificationPriority,
    generateTitle: (event: any) =>
      `Deployment Failed: ${event.metadata?.project || event.metadata?.project_name || 'Unknown'}`,
    generateMessage: (event: any) =>
      `Deployment to ${event.metadata?.environment || 'production'} failed.`,
  },
  // Security events
  security: {
    match: (event: any) => event.event_type?.startsWith('security.'),
    type: 'warning' as NotificationType,
    priority: 'high' as NotificationPriority,
    generateTitle: (event: any) => `Security Alert`,
    generateMessage: (event: any) => event.title || 'A security event was detected.',
  },
  // Error events
  error: {
    match: (event: any) => event.event_type?.startsWith('error.'),
    type: 'error' as NotificationType,
    priority: 'high' as NotificationPriority,
    generateTitle: (event: any) => `System Error`,
    generateMessage: (event: any) => event.title || 'An error occurred.',
  },
  // Successful production deploys
  productionDeploy: {
    match: (event: any) =>
      (event.event_type?.includes('deploy') ||
        event.event_type?.startsWith('vercel.') ||
        event.event_type?.startsWith('railway.')) &&
      (event.metadata?.status === 'SUCCESS' || event.metadata?.status === 'READY') &&
      event.metadata?.environment === 'production',
    type: 'success' as NotificationType,
    priority: 'medium' as NotificationPriority,
    generateTitle: (event: any) =>
      `Production Deploy: ${event.metadata?.project || event.metadata?.project_name || 'Unknown'}`,
    generateMessage: (event: any) => `Successfully deployed to production.`,
  },
};
