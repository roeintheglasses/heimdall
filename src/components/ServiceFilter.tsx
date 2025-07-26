'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCategories, useCategoryOperations } from '@/contexts/CategoryContext'
import { getServiceColorClasses, DEFAULT_SERVICES } from '@/types/categories'
import { 
  GitBranch, 
  Zap, 
  Train, 
  Activity, 
  Shield, 
  Globe,
  LucideIcon
} from 'lucide-react'

interface ServiceFilterProps {
  serviceStats: Record<string, number>
  className?: string
}

// Icon mapping for services
const serviceIcons: Record<string, LucideIcon> = {
  GitBranch,
  Zap,
  Train,
  Activity,
  Shield,
  Globe
}

export default function ServiceFilter({ serviceStats, className = '' }: ServiceFilterProps) {
  const { filter } = useCategories()
  const { selectService, isServiceSelected } = useCategoryOperations()

  // Get available services that have events
  const availableServices = DEFAULT_SERVICES.filter(service => 
    serviceStats[service.id] > 0
  )

  // Calculate total events
  const totalEvents = Object.values(serviceStats).reduce((sum, count) => sum + count, 0)

  const handleServiceClick = (serviceId: string) => {
    if (isServiceSelected(serviceId)) {
      // If already selected, deselect (show all)
      selectService(null)
    } else {
      // Select this service
      selectService(serviceId)
    }
  }

  if (availableServices.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Filter by Service</h4>
        <Badge variant="outline" className="text-xs">
          {totalEvents} total events
        </Badge>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* All Services Button */}
        <Button
          variant={!filter.selectedService ? "default" : "outline"}
          size="sm"
          onClick={() => selectService(null)}
          className="transition-all duration-200 hover:scale-105"
        >
          <Globe className="w-4 h-4 mr-2" />
          All Services
          <Badge 
            variant="secondary" 
            className="ml-2 bg-white/20 text-current border-0"
          >
            {totalEvents}
          </Badge>
        </Button>

        {/* Individual Service Buttons */}
        {availableServices.map(service => {
          const count = serviceStats[service.id] || 0
          const isSelected = isServiceSelected(service.id)
          const colors = getServiceColorClasses(service.color)
          const IconComponent = serviceIcons[service.icon] || Globe

          return (
            <Button
              key={service.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleServiceClick(service.id)}
              className={`transition-all duration-200 hover:scale-105 ${
                isSelected 
                  ? `${colors.bg} ${colors.text} ${colors.border} shadow-md` 
                  : `hover:${colors.bg} hover:${colors.text}`
              }`}
            >
              <IconComponent className="w-4 h-4 mr-2" />
              {service.name}
              {count > 0 && (
                <Badge 
                  variant="secondary" 
                  className={`ml-2 ${
                    isSelected 
                      ? 'bg-white/20 text-current' 
                      : colors.badge
                  } border-0`}
                >
                  {count}
                </Badge>
              )}
            </Button>
          )
        })}
      </div>

      {/* Service Description for Selected Service */}
      {filter.selectedService && (
        <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
          {(() => {
            const selectedService = DEFAULT_SERVICES.find(s => s.id === filter.selectedService)
            if (!selectedService) return null
            
            const colors = getServiceColorClasses(selectedService.color)
            const IconComponent = serviceIcons[selectedService.icon] || Globe
            
            return (
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                  <IconComponent className={`w-4 h-4 ${colors.text}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-sm">{selectedService.name}</h5>
                    <Badge className={colors.badge}>
                      {serviceStats[selectedService.id]} events
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedService.description}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}