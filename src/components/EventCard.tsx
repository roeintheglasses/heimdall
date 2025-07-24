import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GitBranch, Rocket, FileText, Clock, Server, AlertCircle, Shield } from "lucide-react"
import { useCategories } from '@/contexts/CategoryContext'
import { DashboardEvent, getCategoryColorClasses } from '@/types/categories'

interface EventCardProps {
  event: DashboardEvent
}

// Icon mapping for categories
const CATEGORY_ICONS = {
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield,
  FileText
} as const

function CategoryIcon({ iconName, className }: { iconName: string, className?: string }) {
  const IconComponent = CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || FileText
  return <IconComponent className={className} />
}

export default function EventCard({ event }: EventCardProps) {
  const { getEventCategory } = useCategories()
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  // Get category for this event
  const category = getEventCategory(event)
  const colorClasses = getCategoryColorClasses(category.color)
  
  const getEventConfig = (eventType: string) => {
    switch (eventType) {
      case 'github.push':
        return {
          label: 'Code Push',
          variant: 'default' as const
        }
      case 'vercel.deploy':
        return {
          label: 'Deployment',
          variant: 'secondary' as const
        }
      default:
        return {
          label: 'Event',
          variant: 'outline' as const
        }
    }
  }

  const config = getEventConfig(event.event_type || 'unknown')

  return (
    <Card className={`group hover:shadow-md transition-all duration-300 ease-out border-l-4 ${colorClasses.border.replace('border-', 'border-l-')} hover:border-l-primary/60 animate-in slide-in-from-right-8 fade-in-0 duration-500`}>
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-start gap-2 sm:gap-3">
          <Avatar className={`h-8 w-8 sm:h-10 sm:w-10 ${colorClasses.bg} transition-transform duration-200 group-hover:scale-105 shrink-0`}>
            <AvatarFallback className={`${colorClasses.text} ${colorClasses.bg}`}>
              <CategoryIcon iconName={category.icon} className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 group-hover:rotate-12" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight text-card-foreground group-hover:text-primary transition-colors duration-200 text-sm sm:text-base truncate">
                {event.title}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <Badge 
                  variant="outline" 
                  className={`text-xs transition-all duration-200 hover:scale-105 ${colorClasses.badge}`}
                >
                  {category.name}
                </Badge>
                <Badge variant={config.variant} className="text-xs transition-all duration-200 hover:scale-105">
                  {config.label}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
              <Clock className="h-3 w-3 transition-transform duration-200 group-hover:rotate-12 shrink-0" />
              <span className="text-xs">
                {formatTimestamp(event.created_at)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      {event.metadata && Object.keys(event.metadata).length > 0 && (
        <CardContent className="pt-0">
          <div className="rounded-lg bg-muted/30 p-2 sm:p-3 space-y-1 sm:space-y-2">
            {Object.entries(event.metadata).map(([key, value]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2 sm:items-center text-sm">
                <span className="font-medium text-muted-foreground capitalize text-xs sm:text-sm">
                  {key.replace('_', ' ')}
                </span>
                <span className="text-card-foreground font-mono text-xs bg-background px-2 py-1 rounded truncate sm:max-w-40 break-all">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}