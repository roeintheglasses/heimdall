import { Badge } from "@/components/ui/badge"
import { Activity, Wifi, WifiOff, Database } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConnectionStatusProps {
  isConnected: boolean
  eventCount: number
  error?: string | null
}

export default function ConnectionStatus({ isConnected, eventCount, error }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    if (error) {
      return {
        icon: WifiOff,
        label: 'Error',
        variant: 'destructive' as const,
        dotColor: 'bg-destructive',
        description: 'Connection failed'
      }
    }
    
    if (isConnected) {
      return {
        icon: Wifi,
        label: 'Live',
        variant: 'default' as const,
        dotColor: 'bg-green-500',
        description: 'Real-time updates active'
      }
    }
    
    return {
      icon: WifiOff,
      label: 'Offline',
      variant: 'secondary' as const,
      dotColor: 'bg-yellow-500',
      description: 'Attempting to reconnect...'
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Connection Status */}
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="relative">
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            config.dotColor,
            isConnected && "animate-pulse-slow"
          )} />
          {isConnected && (
            <div className={cn(
              "absolute inset-0 w-2 h-2 rounded-full animate-ping",
              config.dotColor,
              "opacity-20"
            )} />
          )}
        </div>
        
        <Badge variant={config.variant} className="gap-1 sm:gap-1.5 transition-all duration-200 hover:scale-105 text-xs">
          <StatusIcon className="h-3 w-3 transition-transform duration-200" />
          <span className="hidden xs:inline">{config.label}</span>
        </Badge>
      </div>

      {/* Event Count */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <Database className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground transition-transform duration-200 hover:scale-110" />
        <span className="text-xs sm:text-sm font-medium text-foreground transition-all duration-300 hover:text-primary">
          {eventCount}
        </span>
        <span className="text-xs text-muted-foreground hidden xs:inline">
          events
        </span>
      </div>

      {/* Activity Indicator */}
      {isConnected && (
        <div className="flex items-center gap-1 hidden sm:flex">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-xs text-muted-foreground hidden md:inline">
            {config.description}
          </span>
        </div>
      )}
    </div>
  )
}