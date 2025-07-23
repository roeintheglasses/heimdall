import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GitBranch, Rocket, FileText, Clock } from "lucide-react"

interface EventCardProps {
  event: {
    id: string
    event_type?: string
    title: string
    metadata: Record<string, any>
    created_at: string
  }
}

export default function EventCard({ event }: EventCardProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  const getEventConfig = (eventType: string) => {
    switch (eventType) {
      case 'github.push':
        return {
          icon: GitBranch,
          variant: 'default' as const,
          label: 'Code Push',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950'
        }
      case 'vercel.deploy':
        return {
          icon: Rocket,
          variant: 'secondary' as const,
          label: 'Deployment',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950'
        }
      default:
        return {
          icon: FileText,
          variant: 'outline' as const,
          label: 'Event',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/20'
        }
    }
  }

  const config = getEventConfig(event.event_type || 'unknown')
  const IconComponent = config.icon

  return (
    <Card className="group hover:shadow-md transition-all duration-300 ease-out border-l-4 border-l-primary/20 hover:border-l-primary/60 animate-in slide-in-from-right-8 fade-in-0 duration-500">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-start gap-2 sm:gap-3">
          <Avatar className={`h-8 w-8 sm:h-10 sm:w-10 ${config.bgColor} transition-transform duration-200 group-hover:scale-105 shrink-0`}>
            <AvatarFallback className={`${config.color} ${config.bgColor}`}>
              <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 group-hover:rotate-12" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1 sm:space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight text-card-foreground group-hover:text-primary transition-colors duration-200 text-sm sm:text-base truncate">
                {event.title}
              </h3>
              <Badge variant={config.variant} className="shrink-0 transition-all duration-200 hover:scale-105 text-xs">
                {config.label}
              </Badge>
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