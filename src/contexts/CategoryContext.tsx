'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { 
  EventCategory, 
  DashboardEvent, 
  CategoryStats, 
  CategoryFilter,
  ServiceType,
  ServiceStats,
  DEFAULT_CATEGORIES,
  DEFAULT_SERVICES,
  classifyEvent,
  extractService,
  getServiceById
} from '@/types/categories'

interface CategoryContextType {
  // Category data
  categories: EventCategory[]
  categoryStats: CategoryStats
  
  // Service data
  services: ServiceType[]
  serviceStats: ServiceStats
  
  // Filter state
  filter: CategoryFilter
  setFilter: (filter: Partial<CategoryFilter>) => void
  
  // Helper functions
  getEventCategory: (event: DashboardEvent) => EventCategory
  getEventService: (event: DashboardEvent) => ServiceType | null
  calculateStats: (events: DashboardEvent[]) => CategoryStats
  calculateServiceStats: (events: DashboardEvent[]) => ServiceStats
  filterEvents: (events: DashboardEvent[]) => DashboardEvent[]
  
  // Loading states
  isLoading: boolean
  error: string | null
}

const CategoryContext = createContext<CategoryContextType | null>(null)

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  // State
  const [categories, setCategories] = useState<EventCategory[]>(DEFAULT_CATEGORIES)
  const [services, setServices] = useState<ServiceType[]>(DEFAULT_SERVICES)
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({})
  const [serviceStats, setServiceStats] = useState<ServiceStats>({})
  const [filter, setFilterState] = useState<CategoryFilter>({
    selectedCategory: null,
    selectedService: null,
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

  // Helper function to get service for an event
  const getEventService = (event: DashboardEvent): ServiceType | null => {
    const serviceId = extractService(event.event_type)
    return getServiceById(serviceId) || null
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

  // Calculate service statistics from events
  const calculateServiceStats = (events: DashboardEvent[]): ServiceStats => {
    const stats: ServiceStats = {}
    
    // Initialize all services with 0
    services.forEach(service => {
      stats[service.id] = 0
    })
    
    // Count events by service
    events.forEach(event => {
      const serviceId = extractService(event.event_type)
      if (stats[serviceId] !== undefined) {
        stats[serviceId] = (stats[serviceId] || 0) + 1
      } else {
        // Handle unknown services
        stats[serviceId] = (stats[serviceId] || 0) + 1
      }
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
    
    // Filter by service
    if (filter.selectedService && filter.selectedService !== 'all') {
      filtered = filtered.filter(event => {
        const serviceId = extractService(event.event_type)
        return serviceId === filter.selectedService
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
    
    return filtered
  }

  // Update filter state
  const setFilter = useCallback((newFilter: Partial<CategoryFilter>) => {
    setFilterState(prev => ({
      ...prev,
      ...newFilter
    }))
  }, [])

  // Context value
  const value: CategoryContextType = {
    categories,
    categoryStats,
    services,
    serviceStats,
    filter,
    setFilter,
    getEventCategory,
    getEventService,
    calculateStats,
    calculateServiceStats,
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
      context.setFilter({ selectedCategory: null, selectedService: null, searchQuery: '' }),
    
    // Set search query
    setSearch: (query: string) => 
      context.setFilter({ searchQuery: query }),
    
    // Service operations
    selectService: (serviceId: string | null) => 
      context.setFilter({ selectedService: serviceId }),
    
    // Check if service is selected
    isServiceSelected: (serviceId: string) => 
      context.filter.selectedService === serviceId
  }
}