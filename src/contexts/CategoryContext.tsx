'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { 
  EventCategory, 
  DashboardEvent, 
  CategoryStats, 
  CategoryFilter,
  DEFAULT_CATEGORIES,
  classifyEvent
} from '@/types/categories'

interface CategoryContextType {
  // Category data
  categories: EventCategory[]
  categoryStats: CategoryStats
  
  // Filter state
  filter: CategoryFilter
  setFilter: (filter: Partial<CategoryFilter>) => void
  
  // Helper functions
  getEventCategory: (event: DashboardEvent) => EventCategory
  calculateStats: (events: DashboardEvent[]) => CategoryStats
  filterEvents: (events: DashboardEvent[]) => DashboardEvent[]
  
  // Loading states
  isLoading: boolean
  error: string | null
}

const CategoryContext = createContext<CategoryContextType | null>(null)

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  // State
  const [categories, setCategories] = useState<EventCategory[]>(DEFAULT_CATEGORIES)
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({})
  const [filter, setFilterState] = useState<CategoryFilter>({
    selectedCategory: null,
    searchQuery: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper function to get category for an event
  const getEventCategory = (event: DashboardEvent): EventCategory => {
    // Use backend category if available, otherwise classify from event_type
    const categoryId = event.category || classifyEvent(event.event_type)
    return categories.find(cat => cat.id === categoryId) || categories[0]
  }

  // Calculate category statistics from events
  const calculateStats = (events: DashboardEvent[]): CategoryStats => {
    const stats: CategoryStats = {}
    
    // Initialize all categories with 0
    categories.forEach(cat => {
      stats[cat.id] = 0
    })
    
    // Count events by category
    events.forEach(event => {
      const category = getEventCategory(event)
      stats[category.id] = (stats[category.id] || 0) + 1
    })
    
    return stats
  }

  // Filter events based on current filter state
  const filterEvents = (events: DashboardEvent[]): DashboardEvent[] => {
    let filtered = [...events]
    
    // Filter by category
    if (filter.selectedCategory && filter.selectedCategory !== 'all') {
      filtered = filtered.filter(event => {
        const category = getEventCategory(event)
        return category.id === filter.selectedCategory
      })
    }
    
    // Filter by search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.event_type.toLowerCase().includes(query) ||
        Object.values(event.metadata).some(value => 
          String(value).toLowerCase().includes(query)
        )
      )
    }
    
    // Filter by date range (if implemented)
    if (filter.dateRange) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.created_at)
        return eventDate >= filter.dateRange!.start && eventDate <= filter.dateRange!.end
      })
    }
    
    return filtered
  }

  // Update filter state
  const setFilter = useCallback((newFilter: Partial<CategoryFilter>) => {
    setFilterState(prev => ({
      ...prev,
      ...newFilter
    }))
  }, [])

  // Fetch categories from backend (when available)
  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/categories')
      
      if (response.ok) {
        const backendCategories = await response.json()
        setCategories(backendCategories)
      } else {
        // Use default categories if backend not available
        console.log('Using default categories (backend not available)')
      }
    } catch (err) {
      console.log('Using default categories (network error)')
      setError(null) // Don't show error for missing backend categories
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  // Context value
  const value: CategoryContextType = {
    categories,
    categoryStats,
    filter,
    setFilter,
    getEventCategory,
    calculateStats,
    filterEvents,
    isLoading,
    error
  }

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  )
}

// Custom hook to use category context
export function useCategories() {
  const context = useContext(CategoryContext)
  
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider')
  }
  
  return context
}

// Helper hook for category-specific operations
export function useCategoryOperations() {
  const context = useCategories()
  
  return {
    // Get category by ID
    getCategoryById: (id: string) => 
      context.categories.find(cat => cat.id === id),
    
    // Get all categories sorted by priority
    getSortedCategories: () => 
      [...context.categories].sort((a, b) => a.priority - b.priority),
    
    // Check if category is selected
    isCategorySelected: (categoryId: string) => 
      context.filter.selectedCategory === categoryId,
    
    // Select category
    selectCategory: (categoryId: string | null) => 
      context.setFilter({ selectedCategory: categoryId }),
    
    // Clear all filters
    clearFilters: () => 
      context.setFilter({ selectedCategory: null, searchQuery: '' }),
    
    // Set search query
    setSearch: (query: string) => 
      context.setFilter({ searchQuery: query })
  }
}