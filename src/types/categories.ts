// Category type definitions for event categorization system

export interface EventCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  priority: number
}

export interface DashboardEvent {
  id: string
  event_type: string
  category?: string      // Optional - will be computed from event_type if not present
  subcategory?: string   // Optional subcategory
  title: string
  metadata: Record<string, any>
  created_at: string
  isNew?: boolean
}

export interface CategoryStats {
  [categoryId: string]: number
}

export interface CategoryFilter {
  selectedCategory: string | null
  searchQuery: string
  dateRange?: {
    start: Date
    end: Date
  }
}

// Default category definitions (matches backend schema)
export const DEFAULT_CATEGORIES: EventCategory[] = [
  {
    id: 'development',
    name: 'Development',
    description: 'Code commits, pushes, and repository changes',
    icon: 'GitBranch',
    color: 'blue',
    priority: 1
  },
  {
    id: 'deployments',
    name: 'Deployments', 
    description: 'Application deployments and builds',
    icon: 'Rocket',
    color: 'green',
    priority: 2
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Server and system monitoring',
    icon: 'Server',
    color: 'purple',
    priority: 3
  },
  {
    id: 'issues',
    name: 'Issues & Bugs',
    description: 'Error notifications and system issues',
    icon: 'AlertCircle',
    color: 'red',
    priority: 4
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security alerts and vulnerability reports',
    icon: 'Shield',
    color: 'orange',
    priority: 5
  }
]

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
  'monitoring.performance': 'infrastructure'
}

// Helper function to classify event based on event_type
export function classifyEvent(eventType: string): string {
  // Check direct mapping first
  if (EVENT_TYPE_CATEGORY_MAP[eventType]) {
    return EVENT_TYPE_CATEGORY_MAP[eventType]
  }
  
  // Fallback pattern matching
  if (eventType.startsWith('github.')) return 'development'
  if (eventType.startsWith('vercel.') || eventType.startsWith('railway.')) return 'deployments'
  if (eventType.startsWith('error.')) return 'issues'
  if (eventType.startsWith('security.')) return 'security'
  if (eventType.startsWith('monitoring.')) return 'infrastructure'
  
  // Default fallback
  return 'development'
}

// Helper function to get category by ID
export function getCategoryById(categoryId: string): EventCategory | undefined {
  return DEFAULT_CATEGORIES.find(cat => cat.id === categoryId)
}

// Helper function to get category color classes
export function getCategoryColorClasses(color: string) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-950',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    }
  }
  
  return colorMap[color as keyof typeof colorMap] || colorMap.blue
}