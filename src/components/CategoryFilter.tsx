'use client'

import React from 'react'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  GitBranch, 
  Rocket, 
  Server, 
  AlertCircle, 
  Shield, 
  LayoutGrid,
  X
} from 'lucide-react'
import { useCategories, useCategoryOperations } from '@/contexts/CategoryContext'
import { EventCategory, CategoryStats } from '@/types/categories'

interface CategoryFilterProps {
  categoryStats: CategoryStats
  className?: string
}

// Icon mapping for categories
const CATEGORY_ICONS = {
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield,
  LayoutGrid
} as const

function CategoryIcon({ iconName, className }: { iconName: string, className?: string }) {
  const IconComponent = CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || LayoutGrid
  return <IconComponent className={className} />
}

export default function CategoryFilter({ categoryStats, className = '' }: CategoryFilterProps) {
  const { categories, filter } = useCategories()
  const { getSortedCategories, selectCategory, isCategorySelected, clearFilters } = useCategoryOperations()
  
  const sortedCategories = getSortedCategories()
  const totalEvents = Object.values(categoryStats).reduce((sum, count) => sum + count, 0)
  
  const handleCategoryChange = (value: string) => {
    if (value === 'all') {
      selectCategory(null)
    } else {
      selectCategory(value)
    }
  }

  const selectedValue = filter.selectedCategory || 'all'

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Category Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs 
          value={selectedValue} 
          onValueChange={handleCategoryChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto p-1">
            {/* All Categories Tab */}
            <TabsTrigger 
              value="all" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm h-auto min-h-[60px] sm:min-h-[50px]"
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <div className="flex flex-col sm:flex-row items-center gap-1">
                <span className="font-medium">All</span>
                <Badge 
                  variant="secondary" 
                  className="text-xs px-1.5 py-0.5 h-auto min-h-0"
                >
                  {totalEvents}
                </Badge>
              </div>
            </TabsTrigger>

            {/* Category Tabs */}
            {sortedCategories.map(category => {
              const count = categoryStats[category.id] || 0
              const isSelected = isCategorySelected(category.id)
              
              return (
                <TabsTrigger 
                  key={category.id}
                  value={category.id}
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm h-auto min-h-[60px] sm:min-h-[50px]"
                >
                  <CategoryIcon 
                    iconName={category.icon} 
                    className="h-4 w-4 shrink-0" 
                  />
                  <div className="flex flex-col sm:flex-row items-center gap-1">
                    <span className="font-medium truncate max-w-16 sm:max-w-none">
                      {category.name}
                    </span>
                    <Badge 
                      variant={isSelected ? "default" : "secondary"}
                      className="text-xs px-1.5 py-0.5 h-auto min-h-0"
                    >
                      {count}
                    </Badge>
                  </div>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        
        {/* Clear Filters Button */}
        {(filter.selectedCategory || filter.searchQuery) && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="flex items-center gap-2 shrink-0"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Indicator */}
      {filter.selectedCategory && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing:</span>
          <Badge variant="outline" className="flex items-center gap-1">
            <CategoryIcon 
              iconName={categories.find(c => c.id === filter.selectedCategory)?.icon || 'LayoutGrid'} 
              className="h-3 w-3" 
            />
            {categories.find(c => c.id === filter.selectedCategory)?.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-transparent"
              onClick={() => selectCategory(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}
    </div>
  )
}

// Compact version for mobile or constrained spaces
export function CompactCategoryFilter({ categoryStats, className = '' }: CategoryFilterProps) {
  const { categories, filter } = useCategories()
  const { selectCategory } = useCategoryOperations()
  
  const totalEvents = Object.values(categoryStats).reduce((sum, count) => sum + count, 0)
  
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* All Button */}
      <Button
        variant={!filter.selectedCategory ? "default" : "outline"}
        size="sm"
        onClick={() => selectCategory(null)}
        className="flex items-center gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        All
        <Badge variant="secondary" className="text-xs">
          {totalEvents}
        </Badge>
      </Button>
      
      {/* Category Buttons */}
      {categories.map(category => {
        const count = categoryStats[category.id] || 0
        const isSelected = filter.selectedCategory === category.id
        
        return (
          <Button
            key={category.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => selectCategory(category.id)}
            className="flex items-center gap-2"
          >
            <CategoryIcon iconName={category.icon} className="h-4 w-4" />
            {category.name}
            <Badge 
              variant={isSelected ? "secondary" : "outline"} 
              className="text-xs"
            >
              {count}
            </Badge>
          </Button>
        )
      })}
    </div>
  )
}