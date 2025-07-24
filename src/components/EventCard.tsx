import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useCategories } from '@/contexts/CategoryContext'
import { DashboardEvent, getCategoryColorClasses } from '@/types/categories'
import { ServiceIcon, ServiceBadge } from '@/components/ServiceIcon'
import { getServiceFromEventType } from '@/types/services'

import { 
  GitBranch, 
  Rocket, 
  Server, 
  AlertCircle, 
  Shield, 
  FileText 
} from 'lucide-react'

// Icon mapping for categories
const ICON_MAP = {
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield,
  FileText
} as const

function CategoryIcon({ iconName, className }: { iconName: string, className?: string }) {
  const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP] || FileText
  return <IconComponent className={className} />
}

interface EventCardProps {
  event: DashboardEvent
}

export default function EventCard({ event }: EventCardProps) {
  const { getEventCategory } = useCategories()
  
  // Get category and service info for this event
  const category = getEventCategory(event)
  const serviceInfo = getServiceFromEventType(event.event_type || 'unknown')
  const colorClasses = getCategoryColorClasses(category.color)
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'github.push': return 'Push'
      case 'vercel.deploy': return 'Deploy'
      case 'railway.deploy': return 'Deploy'
      default: return eventType?.split('.')[1] || 'Event'
    }
  }

  return (
    <Card className={`
      group relative overflow-hidden transition-all duration-300 ease-out
      hover:shadow-xl hover:-translate-y-1
      border-l-4 ${colorClasses.border.replace('border-', 'border-l-')}
      bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800
      ${event.isNew ? 'animate-in slide-in-from-top-4 fade-in-0 ring-2 ring-primary/50' : ''}
    `}>
      <CardContent className="p-0 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-500/5 pointer-events-none" />
        
        {/* Main Content Area */}
        <div className="p-4 sm:p-5 relative z-10">
          {/* Header Row */}
          <div className="flex items-start gap-4 mb-3">
            {/* Service Icon */}
            <div className="relative shrink-0 mt-0.5">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${colorClasses.bg} border ${colorClasses.border}
                transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg
                ring-2 ring-white dark:ring-slate-800 shadow-md
              `}>
                <ServiceIcon 
                  service={serviceInfo} 
                  className={`h-5 w-5`}
                />
              </div>
              
              {/* Category indicator dot */}
              <div className={`
                absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full 
                ${colorClasses.bg} border-2 border-background
                flex items-center justify-center shadow-sm
              `}>
                <CategoryIcon 
                  iconName={category.icon} 
                  className={`h-2.5 w-2.5 ${colorClasses.text}`}
                />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title and Badges Row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-base text-foreground leading-tight group-hover:text-primary transition-colors duration-200 truncate">
                  {event.title}
                </h3>
                
                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <ServiceBadge 
                    service={serviceInfo}
                    variant="outline"
                    size="sm"
                    showIcon={false}
                    showName={true}
                    className="text-xs font-medium"
                  />
                  <Badge 
                    variant="secondary"
                    className="text-xs font-medium"
                  >
                    {getEventTypeLabel(event.event_type || 'unknown')}
                  </Badge>
                </div>
              </div>
              
              {/* Metadata Row */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {/* Timestamp */}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">
                    {formatTimestamp(event.created_at)}
                  </span>
                </div>
                
                {/* Category Badge */}
                <Badge 
                  variant="outline" 
                  className={`text-xs font-medium ${colorClasses.badge}`}
                >
                  {category.name}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Metadata Details (if present) */}
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(event.metadata).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground capitalize truncate">
                      {key.replace('_', ' ')}:
                    </span>
                    <span className="text-foreground font-mono text-xs bg-muted px-2 py-1 rounded truncate max-w-32">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Hover Accent Bar */}
        <div className={`
          h-2 w-full transition-all duration-300
          ${colorClasses.bg}
          opacity-0 group-hover:opacity-100 scale-x-0 group-hover:scale-x-100
          origin-left shadow-lg
        `} />
      </CardContent>
    </Card>
  )
}