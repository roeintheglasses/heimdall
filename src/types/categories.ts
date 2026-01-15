// Category type definitions for event categorization system
import type { GenericMetadata } from './metadata';

export interface EventCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  priority: number;
}

export interface DashboardEvent {
  id: string;
  event_type: string;
  category?: string; // Optional - will be computed from event_type if not present
  subcategory?: string; // Optional subcategory
  title: string;
  metadata: GenericMetadata;
  created_at: string;
  isNew?: boolean;
}

export interface CategoryStats {
  [categoryId: string]: number;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  pattern: string; // regex pattern to match event_type
}

// Time range filter presets
export type TimeRangePreset = 'all' | '1h' | '24h' | 'week' | 'custom';

// Date range for custom time filtering
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

// Event status for filtering by outcome
export type EventStatus = 'success' | 'failure' | 'pending';

export interface CategoryFilter {
  selectedCategory: string | null;
  selectedService: string | null;
  searchQuery: string;
  // New filter fields
  timeRange: TimeRangePreset;
  customDateRange: DateRange | null;
  selectedStatuses: EventStatus[];
  repositoryFilter: string;
}

export interface ServiceStats {
  [serviceId: string]: number;
}

// Default category definitions (matches backend schema)
export const DEFAULT_CATEGORIES: EventCategory[] = [
  {
    id: 'development',
    name: 'Development',
    description: 'Code commits, pushes, and repository changes',
    icon: 'GitBranch',
    color: 'blue',
    priority: 1,
  },
  {
    id: 'deployments',
    name: 'Deployments',
    description: 'Application deployments and builds',
    icon: 'Rocket',
    color: 'green',
    priority: 2,
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Server and system monitoring',
    icon: 'Server',
    color: 'purple',
    priority: 3,
  },
  {
    id: 'issues',
    name: 'Issues & Bugs',
    description: 'Error notifications and system issues',
    icon: 'AlertCircle',
    color: 'red',
    priority: 4,
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security alerts and vulnerability reports',
    icon: 'Shield',
    color: 'orange',
    priority: 5,
  },
];

// Event type to category mapping (frontend classification)
export const EVENT_TYPE_CATEGORY_MAP: Record<string, string> = {
  'github.push': 'development',
  'github.pr': 'development',
  'github.issue': 'issues',
  'github.release': 'development',
  'vercel.deploy': 'deployments',
  'railway.deploy': 'deployments',
  'error.system': 'issues',
  'error.build': 'issues',
  'security.vulnerability': 'security',
  'security.audit': 'security',
  'monitoring.alert': 'infrastructure',
  'monitoring.performance': 'infrastructure',
};

// Helper function to classify event based on event_type
export function classifyEvent(eventType: string): string {
  // Check direct mapping first
  if (EVENT_TYPE_CATEGORY_MAP[eventType]) {
    return EVENT_TYPE_CATEGORY_MAP[eventType];
  }

  // Fallback pattern matching
  if (eventType.startsWith('github.')) return 'development';
  if (eventType.startsWith('vercel.') || eventType.startsWith('railway.')) return 'deployments';
  if (eventType.startsWith('error.')) return 'issues';
  if (eventType.startsWith('security.')) return 'security';
  if (eventType.startsWith('monitoring.')) return 'infrastructure';

  // Default fallback
  return 'development';
}

// Helper function to get category by ID
export function getCategoryById(categoryId: string): EventCategory | undefined {
  return DEFAULT_CATEGORIES.find((cat) => cat.id === categoryId);
}

// Default service definitions
export const DEFAULT_SERVICES: ServiceType[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Git repository events and pull requests',
    icon: 'GitBranch',
    color: 'slate',
    pattern: '^github\\.',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Frontend deployment and hosting',
    icon: 'Zap',
    color: 'emerald',
    pattern: '^vercel\\.',
  },
  {
    id: 'railway',
    name: 'Railway',
    description: 'Backend deployment and infrastructure',
    icon: 'Train',
    color: 'violet',
    pattern: '^railway\\.',
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    description: 'System monitoring and alerts',
    icon: 'Activity',
    color: 'amber',
    pattern: '^monitoring\\.',
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security scans and vulnerability alerts',
    icon: 'Shield',
    color: 'red',
    pattern: '^security\\.',
  },
];

// Cache for extractService results to avoid repeated regex matching
const serviceCache = new Map<string, string>();
// Maximum cache size to prevent unbounded memory growth
const SERVICE_CACHE_MAX_SIZE = 1000;

// Pre-compile regex patterns for better performance
const compiledServicePatterns = DEFAULT_SERVICES.map((service) => ({
  id: service.id,
  regex: new RegExp(service.pattern),
}));

// Helper function to extract service from event_type (with caching)
export function extractService(eventType: string): string {
  // Check cache first
  const cached = serviceCache.get(eventType);
  if (cached !== undefined) return cached;

  // Match against pre-compiled patterns
  for (const { id, regex } of compiledServicePatterns) {
    if (regex.test(eventType)) {
      // Clear cache if it exceeds max size to prevent memory growth
      if (serviceCache.size >= SERVICE_CACHE_MAX_SIZE) {
        serviceCache.clear();
      }
      serviceCache.set(eventType, id);
      return id;
    }
  }

  // Fallback for unmatched types
  const prefix = eventType.split('.')[0] || 'other';
  // Clear cache if it exceeds max size to prevent memory growth
  if (serviceCache.size >= SERVICE_CACHE_MAX_SIZE) {
    serviceCache.clear();
  }
  serviceCache.set(eventType, prefix);
  return prefix;
}

// Helper function to get service by ID
export function getServiceById(serviceId: string): ServiceType | undefined {
  return DEFAULT_SERVICES.find((service) => service.id === serviceId);
}

// Helper function to get category color classes
export function getCategoryColorClasses(color: string) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-950',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    },
    slate: {
      bg: 'bg-slate-50 dark:bg-slate-950',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-800',
      badge: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    },
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-950',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-200 dark:border-violet-800',
      badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    },
  };

  return colorMap[color as keyof typeof colorMap] || colorMap.blue;
}

// Helper function to get service color classes (same pattern as categories)
export function getServiceColorClasses(color: string) {
  return getCategoryColorClasses(color);
}

// Helper function to extract event status from metadata
export function extractEventStatus(event: DashboardEvent): EventStatus | null {
  const metadata = event.metadata;

  // Check common status fields
  if (metadata.status) {
    const status = String(metadata.status).toLowerCase();
    if (
      status === 'success' ||
      status === 'succeeded' ||
      status === 'completed' ||
      status === 'ready'
    ) {
      return 'success';
    }
    if (
      status === 'failure' ||
      status === 'failed' ||
      status === 'error' ||
      status === 'cancelled'
    ) {
      return 'failure';
    }
    if (
      status === 'pending' ||
      status === 'queued' ||
      status === 'building' ||
      status === 'in_progress'
    ) {
      return 'pending';
    }
  }

  // Check state field (used by some providers)
  if (metadata.state) {
    const state = String(metadata.state).toLowerCase();
    if (state === 'success' || state === 'ready') return 'success';
    if (state === 'failure' || state === 'error') return 'failure';
    if (state === 'pending' || state === 'building') return 'pending';
  }

  // Infer from event type
  if (event.event_type.includes('error') || event.event_type.includes('fail')) {
    return 'failure';
  }

  return null; // Unknown status
}

// Helper function to extract repository name from event
export function extractRepository(event: DashboardEvent): string | null {
  const metadata = event.metadata;

  // Common repository field names
  if (metadata.repository) {
    return typeof metadata.repository === 'string'
      ? metadata.repository
      : metadata.repository.name || metadata.repository.full_name || null;
  }
  if (metadata.repo) {
    return typeof metadata.repo === 'string' ? metadata.repo : metadata.repo.name || null;
  }
  if (metadata.project) {
    return typeof metadata.project === 'string' ? metadata.project : metadata.project.name || null;
  }
  if (metadata.projectName) return metadata.projectName;
  if (metadata.repoName) return metadata.repoName;

  return null;
}

// Helper function to check if event falls within time range
export function isEventInTimeRange(
  event: DashboardEvent,
  timeRange: TimeRangePreset,
  customRange: DateRange | null
): boolean {
  if (timeRange === 'all') return true;

  const eventDate = new Date(event.created_at);
  const now = new Date();

  switch (timeRange) {
    case '1h':
      return now.getTime() - eventDate.getTime() <= 60 * 60 * 1000;
    case '24h':
      return now.getTime() - eventDate.getTime() <= 24 * 60 * 60 * 1000;
    case 'week':
      return now.getTime() - eventDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
    case 'custom':
      if (!customRange) return true;
      const afterStart = !customRange.start || eventDate >= customRange.start;
      const beforeEnd = !customRange.end || eventDate <= customRange.end;
      return afterStart && beforeEnd;
    default:
      return true;
  }
}
