'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, ChevronDown, ChevronUp, Terminal } from "lucide-react"
import { useCategories } from '@/contexts/CategoryContext'
import { DashboardEvent, getCategoryColorClasses } from '@/types/categories'
import { ServiceIcon, ServiceBadge } from '@/components/ServiceIcon'
import { getServiceFromEventType } from '@/types/services'
import { useState } from 'react'
import { cn } from "@/lib/utils"

// Service-specific event detail components
import GitHubEventDetail from '@/components/event-details/GitHubEventDetail'
import VercelEventDetail from '@/components/event-details/VercelEventDetail'
import RailwayEventDetail from '@/components/event-details/RailwayEventDetail'
import GenericEventDetail from '@/components/event-details/GenericEventDetail'

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

// Category to neon color mapping
const CATEGORY_NEON_COLORS: Record<string, { border: string; bg: string; text: string; shadow: string }> = {
  blue: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    shadow: 'shadow-[4px_4px_0_hsl(180_100%_50%)]'
  },
  green: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
    shadow: 'shadow-[4px_4px_0_hsl(300_100%_50%)]'
  },
  purple: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    shadow: 'shadow-[4px_4px_0_hsl(120_100%_50%)]'
  },
  red: {
    border: 'border-neon-orange',
    bg: 'bg-neon-orange/10',
    text: 'text-neon-orange',
    shadow: 'shadow-[4px_4px_0_hsl(30_100%_50%)]'
  },
  orange: {
    border: 'border-neon-pink',
    bg: 'bg-neon-pink/10',
    text: 'text-neon-pink',
    shadow: 'shadow-[4px_4px_0_hsl(330_100%_60%)]'
  },
}

function CategoryIcon({ iconName, className }: { iconName: string, className?: string }) {
  const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP] || FileText
  return <IconComponent className={className} />
}

function getNeonColors(categoryColor: string) {
  return CATEGORY_NEON_COLORS[categoryColor] || CATEGORY_NEON_COLORS.blue
}

interface EventCardProps {
  event: DashboardEvent
  isSelected?: boolean
  onSelect?: () => void
}

// Get event-specific animation class
function getEventAnimation(eventType: string, isNew: boolean): string {
  if (!isNew) return ''

  // GitHub events - slide in from left
  if (eventType.startsWith('github.')) {
    return 'animate-slide-in-left-arrow glow-cyan'
  }

  // Deploy events - fade with glow pulse
  if (eventType.includes('deploy')) {
    if (eventType.startsWith('vercel.')) {
      return 'animate-fade-glow-pulse glow-magenta'
    }
    if (eventType.startsWith('railway.')) {
      return 'animate-fade-glow-pulse glow-green'
    }
    return 'animate-fade-glow-pulse glow-cyan'
  }

  // Error events - shake glitch
  if (eventType.includes('error') || eventType.includes('fail')) {
    return 'animate-shake-glitch glow-orange'
  }

  // Security events - shield pulse
  if (eventType.startsWith('security.')) {
    return 'animate-shield-pulse glow-pink'
  }

  // Default animation
  return 'animate-in slide-in-from-top-4 fade-in-0'
}

export default function EventCard({ event, isSelected = false, onSelect }: EventCardProps) {
  const { getEventCategory } = useCategories()
  const [isExpanded, setIsExpanded] = useState(false)

  // Get animation class based on event type
  const animationClass = getEventAnimation(event.event_type || 'unknown', !!event.isNew)

  // Get category and service info for this event
  const category = getEventCategory(event)
  const serviceInfo = getServiceFromEventType(event.event_type || 'unknown')
  const colorClasses = getCategoryColorClasses(category.color)
  const neonColors = getNeonColors(category.color)

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
      case 'github.push': return 'PUSH'
      case 'github.pr': return 'PR'
      case 'github.issue': return 'ISSUE'
      case 'github.release': return 'RELEASE'
      case 'vercel.deploy': return 'DEPLOY'
      case 'railway.deploy': return 'DEPLOY'
      default: return (eventType?.split('.')[1] || 'EVENT').toUpperCase()
    }
  }

  const renderEventDetail = () => {
    const eventType = event.event_type || 'unknown'

    if (eventType.startsWith('github.')) {
      return <GitHubEventDetail event={event} />
    }

    if (eventType.startsWith('vercel.')) {
      return <VercelEventDetail event={event} />
    }

    if (eventType.startsWith('railway.')) {
      return <RailwayEventDetail event={event} />
    }

    return <GenericEventDetail event={event} />
  }

  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0

  return (
    <Card
      className={cn(
        // Base terminal styling
        "group relative overflow-hidden transition-all duration-200",
        "border-2 bg-terminal-black",
        neonColors.border,
        // Left accent border
        "border-l-4",
        // Hover effects
        "hover:shadow-retro hover:-translate-x-0.5 hover:-translate-y-0.5",
        // New event animation (type-specific)
        event.isNew && animationClass,
        event.isNew && "ring-2 ring-neon-cyan",
        // Selection styling
        isSelected && "event-selected",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <CardContent className="p-0 relative">
        {/* Terminal header bar */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 border-b",
          neonColors.border,
          neonColors.bg
        )}>
          <Terminal className={cn("h-3 w-3", neonColors.text)} />
          <span className={cn("text-xs font-mono uppercase tracking-wider", neonColors.text)}>
            {serviceInfo.name}://{getEventTypeLabel(event.event_type || 'unknown')}
          </span>
          <div className="flex-1" />
          <span className="text-xs font-mono text-muted-foreground">
            [{formatTimestamp(event.created_at)}]
          </span>
        </div>

        {/* Main Content Area */}
        <div className="p-4 relative z-10">
          {/* Header Row */}
          <div className="flex items-start gap-4 mb-3">
            {/* Service Icon */}
            <div className="relative shrink-0 mt-0.5">
              <div className={cn(
                "w-10 h-10 flex items-center justify-center",
                "border-2",
                neonColors.border,
                neonColors.bg,
                "transition-all duration-200",
                "group-hover:shadow-[0_0_10px_currentColor]"
              )}>
                <ServiceIcon
                  service={serviceInfo}
                  className={cn("h-5 w-5", neonColors.text)}
                />
              </div>

              {/* Category indicator dot */}
              <div className={cn(
                "absolute -bottom-1 -right-1 w-5 h-5",
                "border-2 border-terminal-black",
                neonColors.bg,
                neonColors.border,
                "flex items-center justify-center"
              )}>
                <CategoryIcon
                  iconName={category.icon}
                  className={cn("h-3 w-3", neonColors.text)}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className={cn(
                "font-mono text-sm text-foreground leading-tight mb-2 truncate",
                "group-hover:text-neon-cyan transition-colors duration-200"
              )}>
                <span className="text-neon-magenta mr-2">&gt;</span>
                {event.title}
              </h3>

              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {serviceInfo.name.toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {getEventTypeLabel(event.event_type || 'unknown')}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("text-xs", neonColors.text, neonColors.border)}
                >
                  {category.name.toUpperCase()}
                </Badge>

                {/* Expand/Collapse Button */}
                {hasMetadata && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 px-2 text-xs ml-auto"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        LESS
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        MORE
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Event Details (expandable) */}
          {hasMetadata && isExpanded && (
            <div className={cn(
              "mt-4 pt-4 border-t",
              "border-neon-cyan/30"
            )}>
              <div className="font-mono text-sm">
                {renderEventDetail()}
              </div>
            </div>
          )}
        </div>

        {/* Hover Accent Bar - bottom scanline effect */}
        <div className={cn(
          "h-1 w-full transition-all duration-200",
          "bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan",
          "opacity-0 group-hover:opacity-100",
          "scale-x-0 group-hover:scale-x-100 origin-left"
        )} />
      </CardContent>
    </Card>
  )
}
