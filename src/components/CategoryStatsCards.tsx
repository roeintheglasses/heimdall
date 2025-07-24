'use client'

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  GitBranch, 
  Rocket, 
  Server, 
  AlertCircle, 
  Shield, 
  TrendingUp,
  Activity
} from 'lucide-react'
import { useCategories, useCategoryOperations } from '@/contexts/CategoryContext'
import { CategoryStats, getCategoryColorClasses, DashboardEvent } from '@/types/categories'
import { ServiceIcon, ServiceAvatar } from '@/components/ServiceIcon'
import { getServiceFromEventType, SERVICES } from '@/types/services'

interface CategoryStatsCardsProps {
  categoryStats: CategoryStats
  events?: DashboardEvent[]  // Add events prop to show service breakdown
  className?: string
  compact?: boolean
}

// Icon mapping for categories
const CATEGORY_ICONS = {
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield
} as const

function CategoryIcon({ iconName, className }: { iconName: string, className?: string }) {
  const IconComponent = CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || Activity
  return <IconComponent className={className} />
}

export default function CategoryStatsCards({ 
  categoryStats, 
  events = [],
  className = '',
  compact = false 
}: CategoryStatsCardsProps) {
  const { categories, filter } = useCategories()
  const { getSortedCategories, selectCategory, isCategorySelected } = useCategoryOperations()
  
  const sortedCategories = getSortedCategories()
  const totalEvents = Object.values(categoryStats).reduce((sum, count) => sum + count, 0)

  // Calculate percentage for each category
  const getCategoryPercentage = (count: number) => {
    return totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0
  }

  // Get trend indicator (placeholder for future enhancement)
  const getTrendIndicator = (categoryId: string) => {
    // This could be enhanced to show actual trends from historical data
    const count = categoryStats[categoryId] || 0
    return count > 0 ? 'stable' : 'none'
  }
  
  // Get service breakdown for a category
  const { getEventCategory } = useCategories()
  const getServiceBreakdown = (categoryId: string) => {
    const categoryEvents = events.filter(event => {
      const eventCategory = getEventCategory(event)
      return eventCategory.id === categoryId
    })
    
    const serviceCount: Record<string, number> = {}
    categoryEvents.forEach(event => {
      const service = getServiceFromEventType(event.event_type || 'unknown')
      serviceCount[service.id] = (serviceCount[service.id] || 0) + 1
    })
    
    return Object.entries(serviceCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3) // Top 3 services
      .map(([serviceId, count]) => ({ serviceId, count }))
  }

  if (compact) {
    return (
      <div className={`grid grid-cols-5 gap-2 sm:gap-4 ${className}`}>
        {sortedCategories.map(category => {
          const count = categoryStats[category.id] || 0
          const percentage = getCategoryPercentage(count)
          const isSelected = isCategorySelected(category.id)
          const colorClasses = getCategoryColorClasses(category.color)
          
          return (
            <Card 
              key={category.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary shadow-md' : ''
              }`}
              onClick={() => selectCategory(isSelected ? null : category.id)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`p-2 rounded-full ${colorClasses.bg}`}>
                    <CategoryIcon 
                      iconName={category.icon} 
                      className={`h-4 w-4 ${colorClasses.text}`} 
                    />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {category.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {sortedCategories.map(category => {
        const count = categoryStats[category.id] || 0
        const percentage = getCategoryPercentage(count)
        const isSelected = isCategorySelected(category.id)
        const trend = getTrendIndicator(category.id)
        const colorClasses = getCategoryColorClasses(category.color)
        
        const cardClasses = isSelected 
          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 ring-2 ring-slate-900 dark:ring-slate-100'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
        
        return (
          <Card 
            key={category.id}
            className={`
              cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group border
              ${cardClasses}
              ${isSelected ? 'ring-2 ring-primary shadow-xl scale-105' : ''}
            `}
            onClick={() => selectCategory(isSelected ? null : category.id)}
          >
            <CardContent className="p-4 sm:p-6 relative overflow-hidden">
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10 bg-gradient-to-bl from-current via-transparent to-transparent rounded-full blur-2xl" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`
                  p-3 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl
                  ${colorClasses.bg} border ${colorClasses.border}
                `}>
                  <CategoryIcon 
                    iconName={category.icon} 
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${colorClasses.text} drop-shadow-sm`} 
                  />
                </div>
                
                {trend === 'stable' && count > 0 && (
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm sm:text-base truncate text-slate-900 dark:text-slate-100">
                    {category.name}
                  </h3>
                  {isSelected && (
                    <Badge variant="default" className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                      Active
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-end gap-2">
                  <p className={`text-2xl sm:text-3xl font-bold ${
                    isSelected 
                      ? 'text-slate-900 dark:text-slate-100'
                      : `${colorClasses.text}`
                  }`}>
                    {count}
                  </p>
                  <p className="text-sm mb-1 font-medium text-slate-600 dark:text-slate-400">
                    {percentage}%
                  </p>
                </div>
                
                <p className="text-xs leading-tight text-slate-500 dark:text-slate-400">
                  {category.description}
                </p>
                
                {/* Service breakdown for this category */}
                {!compact && events.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {getServiceBreakdown(category.id).map(({ serviceId, count }) => {
                      const service = SERVICES.find(s => s.id === serviceId)
                      if (!service) return null
                      
                      return (
                        <div key={serviceId} className="flex items-center gap-1">
                          <ServiceAvatar 
                            service={service} 
                            size="sm" 
                            className="h-4 w-4"
                            showTooltip={true}
                          />
                          <span className="text-xs text-muted-foreground">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3 overflow-hidden shadow-inner">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${colorClasses.bg} shadow-sm`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Summary stats card for overview
export function CategorySummaryCard({ 
  categoryStats, 
  events = [],
  className = '' 
}: Pick<CategoryStatsCardsProps, 'categoryStats' | 'events' | 'className'>) {
  const { categories } = useCategories()
  
  const totalEvents = Object.values(categoryStats).reduce((sum, count) => sum + count, 0)
  const activeCategories = Object.values(categoryStats).filter(count => count > 0).length
  const mostActiveCategory = categories.find(cat => 
    cat.id === Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)[0]?.[0]
  )
  
  return (
    <Card className={`${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Event Summary</h3>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalEvents}</p>
              <p className="text-sm text-muted-foreground">Total Events</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold">{activeCategories}</p>
              <p className="text-sm text-muted-foreground">Active Categories</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold">
                {mostActiveCategory ? categoryStats[mostActiveCategory.id] : 0}
              </p>
              <p className="text-sm text-muted-foreground">
                {mostActiveCategory?.name || 'Most Active'}
              </p>
            </div>
          </div>
          
          {mostActiveCategory && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <CategoryIcon iconName={mostActiveCategory.icon} className="h-4 w-4" />
                <span>
                  <strong>{mostActiveCategory.name}</strong> is your most active category
                </span>
              </div>
              
              {/* Show top services across all categories */}
              {events.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Top services:</span>
                  {Object.entries(
                    events.reduce((acc, event) => {
                      const service = getServiceFromEventType(event.event_type || 'unknown')
                      acc[service.id] = (acc[service.id] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  )
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([serviceId, count]) => {
                      const service = SERVICES.find(s => s.id === serviceId)
                      if (!service) return null
                      
                      return (
                        <div key={serviceId} className="flex items-center gap-1">
                          <ServiceIcon service={service} className="h-3 w-3" />
                          <span>{service.name} ({count})</span>
                        </div>
                      )
                    })
                    .filter(Boolean)
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}