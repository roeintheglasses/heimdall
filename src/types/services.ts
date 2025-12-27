// Service type definitions and icon mappings

export interface ServiceInfo {
  id: string
  name: string
  icon: string          // Lucide icon name
  color: string         // Tailwind color class
  description: string
}

// Service definitions with appropriate Lucide icons
// Only includes services that have backend support
export const SERVICES: ServiceInfo[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: 'GitBranch',
    color: 'gray',
    description: 'Git repository and collaboration platform'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: 'Zap',
    color: 'black',
    description: 'Frontend deployment and hosting platform'
  },
  {
    id: 'railway',
    name: 'Railway',
    icon: 'Train',
    color: 'purple',
    description: 'Infrastructure deployment platform'
  },
  {
    id: 'system',
    name: 'System',
    icon: 'Monitor',
    color: 'gray',
    description: 'System and infrastructure events'
  },
  {
    id: 'unknown',
    name: 'Unknown',
    icon: 'HelpCircle',
    color: 'gray',
    description: 'Unknown service or event source'
  }
]

// Event type to service mapping
// Only includes event types that have backend support
export const EVENT_TYPE_SERVICE_MAP: Record<string, string> = {
  // GitHub events
  'github.push': 'github',
  'github.pr': 'github',
  'github.issue': 'github',
  'github.release': 'github',

  // Vercel events
  'vercel.deploy': 'vercel',
  'vercel.build': 'vercel',
  'vercel.error': 'vercel',

  // Railway events
  'railway.deploy': 'railway',
  'railway.build': 'railway',
  'railway.error': 'railway',

  // System events
  'system.error': 'system',
  'system.alert': 'system',
  'system.monitor': 'system',
  'error.system': 'system',
  'monitoring.alert': 'system'
}

// Helper function to get service info from event type
export function getServiceFromEventType(eventType: string): ServiceInfo {
  // Direct mapping lookup
  const serviceId = EVENT_TYPE_SERVICE_MAP[eventType]
  if (serviceId) {
    const service = SERVICES.find(s => s.id === serviceId)
    if (service) return service
  }
  
  // Pattern-based fallback matching
  const eventPrefix = eventType.split('.')[0]
  const service = SERVICES.find(s => s.id === eventPrefix)
  if (service) return service
  
  // Default to unknown service
  return SERVICES.find(s => s.id === 'unknown') || SERVICES[SERVICES.length - 1]
}

// Helper function to get service by ID
export function getServiceById(serviceId: string): ServiceInfo | undefined {
  return SERVICES.find(s => s.id === serviceId)
}

// Helper function to get service color classes
export function getServiceColorClasses(color: string) {
  const colorMap = {
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-950',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-800',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    },
    black: {
      bg: 'bg-gray-50 dark:bg-gray-950',
      text: 'text-gray-900 dark:text-gray-100',
      border: 'border-gray-900 dark:border-gray-100',
      badge: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
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
    },
    teal: {
      bg: 'bg-teal-50 dark:bg-teal-950',
      text: 'text-teal-600 dark:text-teal-400',
      border: 'border-teal-200 dark:border-teal-800',
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
    }
  }
  
  return colorMap[color as keyof typeof colorMap] || colorMap.gray
}