'use client'

import { Badge } from "@/components/ui/badge"
import { Activity, Wifi, WifiOff, Database, Terminal } from "lucide-react"
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
        label: 'ERROR',
        borderColor: 'border-destructive',
        textColor: 'text-destructive',
        bgColor: 'bg-destructive/10',
        dotColor: 'bg-destructive',
        glowColor: 'shadow-[0_0_10px_hsl(0_100%_50%)]',
        description: 'CONNECTION_FAILED'
      }
    }

    if (isConnected) {
      return {
        icon: Wifi,
        label: 'LIVE',
        borderColor: 'border-neon-green',
        textColor: 'text-neon-green',
        bgColor: 'bg-neon-green/10',
        dotColor: 'bg-neon-green',
        glowColor: 'shadow-[0_0_10px_hsl(120_100%_50%)]',
        description: 'STREAM_ACTIVE'
      }
    }

    return {
      icon: WifiOff,
      label: 'OFFLINE',
      borderColor: 'border-neon-orange',
      textColor: 'text-neon-orange',
      bgColor: 'bg-neon-orange/10',
      dotColor: 'bg-neon-orange',
      glowColor: 'shadow-[0_0_10px_hsl(30_100%_50%)]',
      description: 'RECONNECTING...'
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  return (
    <div className="flex items-center gap-2 sm:gap-3 font-mono">
      {/* Connection Status */}
      <div className={cn(
        "flex items-center gap-2 px-2 py-1 border-2",
        config.borderColor,
        config.bgColor,
        isConnected && config.glowColor
      )}>
        {/* LED Indicator */}
        <div className="relative">
          <div className={cn(
            "w-2 h-2 transition-all duration-300",
            config.dotColor,
            isConnected && "animate-pulse-slow"
          )} />
          {isConnected && (
            <div className={cn(
              "absolute inset-0 w-2 h-2 animate-ping",
              config.dotColor,
              "opacity-30"
            )} />
          )}
        </div>

        <StatusIcon className={cn("h-3 w-3", config.textColor)} />
        <span className={cn("text-xs uppercase tracking-wider", config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Event Count - Database style */}
      <div className={cn(
        "flex items-center gap-2 px-2 py-1 border-2",
        "border-neon-cyan/50 bg-neon-cyan/5"
      )}>
        <Database className="h-3 w-3 text-neon-cyan" />
        <span className="text-xs text-neon-cyan font-bold tabular-nums">
          {String(eventCount).padStart(4, '0')}
        </span>
        <span className="text-xs text-muted-foreground hidden xs:inline">
          REC
        </span>
      </div>

      {/* Activity Indicator */}
      {isConnected && (
        <div className={cn(
          "hidden sm:flex items-center gap-2 px-2 py-1 border-2",
          "border-neon-magenta/50 bg-neon-magenta/5"
        )}>
          <Activity className="h-3 w-3 text-neon-magenta animate-pulse-slow" />
          <span className="text-xs text-neon-magenta hidden md:inline uppercase tracking-wider">
            {config.description}
          </span>
        </div>
      )}
    </div>
  )
}

// Compact terminal-style status for headers
export function ConnectionStatusCompact({ isConnected }: { isConnected: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-0.5 border text-xs font-mono",
      isConnected
        ? "border-neon-green/50 text-neon-green"
        : "border-neon-orange/50 text-neon-orange"
    )}>
      <div className={cn(
        "w-1.5 h-1.5",
        isConnected ? "bg-neon-green animate-pulse-slow" : "bg-neon-orange"
      )} />
      <span className="uppercase tracking-wider">
        {isConnected ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  )
}
