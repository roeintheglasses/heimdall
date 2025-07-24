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
import { CategoryStats, getCategoryColorClasses } from '@/types/categories'

interface CategoryStatsCardsProps {
  categoryStats: CategoryStats
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
        
        return (
          <Card 
            key={category.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
              isSelected ? 'ring-2 ring-primary shadow-lg' : ''
            }`}
            onClick={() => selectCategory(isSelected ? null : category.id)}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses.bg} transition-colors duration-200`}>
                  <CategoryIcon 
                    iconName={category.icon} 
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${colorClasses.text}`} 
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
                  <h3 className="font-semibold text-sm sm:text-base truncate">
                    {category.name}
                  </h3>
                  {isSelected && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-end gap-2">
                  <p className="text-2xl sm:text-3xl font-bold">
                    {count}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    {percentage}%
                  </p>
                </div>
                
                <p className="text-xs text-muted-foreground leading-tight">
                  {category.description}
                </p>
                
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                  <div 
                    className={`${colorClasses.bg.replace('50', '200').replace('950', '700')} h-1.5 rounded-full transition-all duration-300`}
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
  className = '' 
}: Pick<CategoryStatsCardsProps, 'categoryStats' | 'className'>) {
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CategoryIcon iconName={mostActiveCategory.icon} className="h-4 w-4" />
                <span>
                  <strong>{mostActiveCategory.name}</strong> is your most active category
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}