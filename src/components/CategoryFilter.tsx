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
  X,
  Terminal
} from 'lucide-react'
import { useCategories, useCategoryOperations } from '@/contexts/CategoryContext'
import { EventCategory, CategoryStats } from '@/types/categories'
import { cn } from '@/lib/utils'

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

// Category to neon color mapping
const CATEGORY_NEON_MAP: Record<string, { border: string; bg: string; text: string }> = {
  development: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
  },
  deployments: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
  },
  infrastructure: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
  },
  issues: {
    border: 'border-neon-orange',
    bg: 'bg-neon-orange/10',
    text: 'text-neon-orange',
  },
  security: {
    border: 'border-neon-pink',
    bg: 'bg-neon-pink/10',
    text: 'text-neon-pink',
  },
}

function CategoryIcon({ iconName, className }: { iconName: string, className?: string }) {
  const IconComponent = CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || LayoutGrid
  return <IconComponent className={className} />
}

function getCategoryNeonColors(categoryId: string) {
  return CATEGORY_NEON_MAP[categoryId] || CATEGORY_NEON_MAP.development
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
    <div className={cn("space-y-4", className)}>
      {/* Terminal-style header */}
      <div className="flex items-center gap-2 text-xs font-mono text-neon-magenta">
        <Terminal className="h-3 w-3" />
        <span>CATEGORY::FILTER</span>
      </div>

      {/* Main Category Tabs - Arcade style */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs
          value={selectedValue}
          onValueChange={handleCategoryChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto p-1 bg-terminal-black border-2 border-neon-cyan/50">
            {/* All Categories Tab */}
            <TabsTrigger
              value="all"
              className={cn(
                "flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3",
                "text-xs sm:text-sm h-auto min-h-[60px] sm:min-h-[50px]",
                "font-mono border-2 border-transparent",
                "data-[state=active]:border-neon-cyan data-[state=active]:bg-neon-cyan/10",
                "data-[state=active]:text-neon-cyan data-[state=active]:shadow-retro-sm",
                "hover:bg-neon-cyan/5 hover:text-neon-cyan",
                "text-muted-foreground transition-all duration-200"
              )}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <div className="flex flex-col sm:flex-row items-center gap-1">
                <span className="font-bold uppercase">All</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-auto min-h-0 border-neon-cyan/30"
                >
                  {totalEvents}
                </Badge>
              </div>
            </TabsTrigger>

            {/* Category Tabs */}
            {sortedCategories.map(category => {
              const count = categoryStats[category.id] || 0
              const isSelected = isCategorySelected(category.id)
              const neonColors = getCategoryNeonColors(category.id)

              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className={cn(
                    "flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3",
                    "text-xs sm:text-sm h-auto min-h-[60px] sm:min-h-[50px]",
                    "font-mono border-2 border-transparent",
                    "data-[state=active]:" + neonColors.border,
                    "data-[state=active]:" + neonColors.bg,
                    "data-[state=active]:" + neonColors.text,
                    "data-[state=active]:shadow-retro-sm",
                    "hover:" + neonColors.bg,
                    "hover:" + neonColors.text,
                    "text-muted-foreground transition-all duration-200"
                  )}
                >
                  <CategoryIcon
                    iconName={category.icon}
                    className="h-4 w-4 shrink-0"
                  />
                  <div className="flex flex-col sm:flex-row items-center gap-1">
                    <span className="font-bold truncate max-w-16 sm:max-w-none uppercase">
                      {category.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-auto min-h-0",
                        isSelected
                          ? neonColors.border
                          : "border-muted-foreground/30"
                      )}
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
            className="flex items-center gap-2 shrink-0 border-2 border-neon-orange text-neon-orange hover:bg-neon-orange/10 font-mono text-xs"
          >
            <X className="h-4 w-4" />
            CLEAR
          </Button>
        )}
      </div>

      {/* Active Filter Indicator - Terminal style */}
      {filter.selectedCategory && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-neon-magenta">&gt;</span>
          <span className="text-muted-foreground">FILTER_ACTIVE:</span>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 border-2",
              getCategoryNeonColors(filter.selectedCategory).border,
              getCategoryNeonColors(filter.selectedCategory).text
            )}
          >
            <CategoryIcon
              iconName={categories.find(c => c.id === filter.selectedCategory)?.icon || 'LayoutGrid'}
              className="h-3 w-3"
            />
            {categories.find(c => c.id === filter.selectedCategory)?.name.toUpperCase()}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-transparent ml-1"
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
