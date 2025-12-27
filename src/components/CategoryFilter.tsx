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
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {/* All Categories Tab */}
            <TabsTrigger 
              value="all" 
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm h-auto min-h-[60px] sm:min-h-[50px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200"
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
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm h-auto min-h-[60px] sm:min-h-[50px] data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-200"
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
                      className={`text-xs px-1.5 py-0.5 h-auto min-h-0 ${
                        isSelected 
                          ? 'bg-white text-slate-900'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
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