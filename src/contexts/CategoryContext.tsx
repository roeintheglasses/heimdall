'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  EventCategory,
  DashboardEvent,
  CategoryStats,
  CategoryFilter,
  ServiceType,
  ServiceStats,
  TimeRangePreset,
  EventStatus,
  DEFAULT_CATEGORIES,
  DEFAULT_SERVICES,
  classifyEvent,
  extractService,
  extractEventStatus,
  extractRepository,
  isEventInTimeRange,
} from '@/types/categories';

interface ActiveFilter {
  type: 'category' | 'service' | 'search' | 'time' | 'status' | 'repository';
  label: string;
  value: string;
}

interface CategoryContextType {
  // Category data
  categories: EventCategory[];
  categoryStats: CategoryStats;

  // Service data
  services: ServiceType[];
  serviceStats: ServiceStats;

  // Filter state
  filter: CategoryFilter;
  setFilter: (_filter: Partial<CategoryFilter>) => void;
  clearAllFilters: () => void;

  // Helper functions
  getEventCategory: (_event: DashboardEvent) => EventCategory;
  getEventService: (_event: DashboardEvent) => ServiceType | null;
  calculateStats: (_events: DashboardEvent[]) => CategoryStats;
  calculateServiceStats: (_events: DashboardEvent[]) => ServiceStats;
  filterEvents: (_events: DashboardEvent[]) => DashboardEvent[];

  // Active filter helpers
  getActiveFilters: () => ActiveFilter[];
  getActiveFilterCount: () => number;
  hasActiveFilters: () => boolean;
  removeFilter: (_type: ActiveFilter['type'], _value?: string) => void;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

const CategoryContext = createContext<CategoryContextType | null>(null);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  // State
  const [categories, _setCategories] = useState<EventCategory[]>(DEFAULT_CATEGORIES);
  const [services, _setServices] = useState<ServiceType[]>(DEFAULT_SERVICES);
  const [categoryStats, _setCategoryStats] = useState<CategoryStats>({});
  const [serviceStats, _setServiceStats] = useState<ServiceStats>({});
  const [filter, setFilterState] = useState<CategoryFilter>({
    selectedCategory: null,
    selectedService: null,
    searchQuery: '',
    timeRange: 'all',
    customDateRange: null,
    selectedStatuses: [],
    repositoryFilter: '',
  });
  const [isLoading, _setIsLoading] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  // Create Map lookups for O(1) category and service access (instead of O(n) .find())
  const categoryMap = useMemo(() => new Map(categories.map((cat) => [cat.id, cat])), [categories]);
  const serviceMap = useMemo(() => new Map(services.map((svc) => [svc.id, svc])), [services]);

  // Helper function to get category for an event - O(1) Map lookup
  const getEventCategory = useCallback(
    (event: DashboardEvent): EventCategory => {
      // Use backend category if available, otherwise classify from event_type
      const categoryId = event.category || classifyEvent(event.event_type);
      return categoryMap.get(categoryId) || categories[0];
    },
    [categoryMap, categories]
  );

  // Helper function to get service for an event - O(1) Map lookup
  const getEventService = useCallback(
    (event: DashboardEvent): ServiceType | null => {
      const serviceId = extractService(event.event_type);
      return serviceMap.get(serviceId) || null;
    },
    [serviceMap]
  );

  // Calculate category statistics from events
  const calculateStats = (events: DashboardEvent[]): CategoryStats => {
    const stats: CategoryStats = {};

    // Initialize all categories with 0
    categories.forEach((cat) => {
      stats[cat.id] = 0;
    });

    // Count events by category
    events.forEach((event) => {
      const category = getEventCategory(event);
      stats[category.id] = (stats[category.id] || 0) + 1;
    });

    return stats;
  };

  // Calculate service statistics from events
  const calculateServiceStats = (events: DashboardEvent[]): ServiceStats => {
    const stats: ServiceStats = {};

    // Initialize all services with 0
    services.forEach((service) => {
      stats[service.id] = 0;
    });

    // Count events by service
    events.forEach((event) => {
      const serviceId = extractService(event.event_type);
      if (stats[serviceId] !== undefined) {
        stats[serviceId] = (stats[serviceId] || 0) + 1;
      } else {
        // Handle unknown services
        stats[serviceId] = (stats[serviceId] || 0) + 1;
      }
    });

    return stats;
  };

  // Check if any filters are currently active (for early exit)
  const hasAnyActiveFilter = useCallback((): boolean => {
    return !!(
      (filter.selectedCategory && filter.selectedCategory !== 'all') ||
      (filter.selectedService && filter.selectedService !== 'all') ||
      filter.searchQuery ||
      filter.timeRange !== 'all' ||
      filter.selectedStatuses.length > 0 ||
      filter.repositoryFilter
    );
  }, [filter]);

  // Filter events using single-pass with early-exit conditions
  // This is O(n) instead of O(n*m) where m is the number of active filters
  const filterEvents = useCallback(
    (events: DashboardEvent[]): DashboardEvent[] => {
      // Early exit if no filters active
      if (!hasAnyActiveFilter()) return events;

      // Pre-compute lowercase search query once
      const searchQuery = filter.searchQuery?.toLowerCase();
      const repoQuery = filter.repositoryFilter?.toLowerCase();

      return events.filter((event) => {
        // Category filter - O(1) with Map lookup
        if (filter.selectedCategory && filter.selectedCategory !== 'all') {
          const categoryId = event.category || classifyEvent(event.event_type);
          if (categoryId !== filter.selectedCategory) return false;
        }

        // Service filter - uses cached extractService
        if (filter.selectedService && filter.selectedService !== 'all') {
          const serviceId = extractService(event.event_type);
          if (serviceId !== filter.selectedService) return false;
        }

        // Search filter - check title and event_type first (faster), then metadata
        if (searchQuery) {
          const matchesTitle = event.title.toLowerCase().includes(searchQuery);
          const matchesType = event.event_type.toLowerCase().includes(searchQuery);
          if (!matchesTitle && !matchesType) {
            // Only check metadata if title and type don't match
            const matchesMetadata = Object.values(event.metadata).some((value) =>
              String(value).toLowerCase().includes(searchQuery)
            );
            if (!matchesMetadata) return false;
          }
        }

        // Time range filter
        if (filter.timeRange !== 'all') {
          if (!isEventInTimeRange(event, filter.timeRange, filter.customDateRange)) {
            return false;
          }
        }

        // Status filter
        if (filter.selectedStatuses.length > 0) {
          const eventStatus = extractEventStatus(event);
          if (eventStatus === null || !filter.selectedStatuses.includes(eventStatus)) {
            return false;
          }
        }

        // Repository filter
        if (repoQuery) {
          const repo = extractRepository(event);
          if (repo === null || !repo.toLowerCase().includes(repoQuery)) {
            return false;
          }
        }

        return true;
      });
    },
    [filter, hasAnyActiveFilter]
  );

  // Update filter state
  const setFilter = useCallback((newFilter: Partial<CategoryFilter>) => {
    setFilterState((prev) => ({
      ...prev,
      ...newFilter,
    }));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilterState({
      selectedCategory: null,
      selectedService: null,
      searchQuery: '',
      timeRange: 'all',
      customDateRange: null,
      selectedStatuses: [],
      repositoryFilter: '',
    });
  }, []);

  // Get list of active filters for chip display - uses O(1) Map lookups
  const getActiveFilters = useCallback((): ActiveFilter[] => {
    const active: ActiveFilter[] = [];

    if (filter.selectedCategory && filter.selectedCategory !== 'all') {
      // O(1) Map lookup instead of O(n) find
      const cat = categoryMap.get(filter.selectedCategory);
      active.push({
        type: 'category',
        label: cat?.name || filter.selectedCategory,
        value: filter.selectedCategory,
      });
    }

    if (filter.selectedService && filter.selectedService !== 'all') {
      // O(1) Map lookup instead of O(n) find
      const svc = serviceMap.get(filter.selectedService);
      active.push({
        type: 'service',
        label: svc?.name || filter.selectedService,
        value: filter.selectedService,
      });
    }

    if (filter.searchQuery) {
      active.push({
        type: 'search',
        label: `"${filter.searchQuery}"`,
        value: filter.searchQuery,
      });
    }

    if (filter.timeRange !== 'all') {
      const labels: Record<string, string> = {
        '1h': 'Last Hour',
        '24h': 'Last 24h',
        week: 'Last Week',
        custom: 'Custom Range',
      };
      active.push({
        type: 'time',
        label: labels[filter.timeRange] || filter.timeRange,
        value: filter.timeRange,
      });
    }

    filter.selectedStatuses.forEach((status) => {
      const labels: Record<string, string> = {
        success: 'Success',
        failure: 'Failed',
        pending: 'Pending',
      };
      active.push({
        type: 'status',
        label: labels[status] || status,
        value: status,
      });
    });

    if (filter.repositoryFilter) {
      active.push({
        type: 'repository',
        label: filter.repositoryFilter,
        value: filter.repositoryFilter,
      });
    }

    return active;
  }, [filter, categoryMap, serviceMap]);

  // Get count of active filters
  const getActiveFilterCount = useCallback((): number => {
    return getActiveFilters().length;
  }, [getActiveFilters]);

  // Check if any filters are active
  const hasActiveFilters = useCallback((): boolean => {
    return getActiveFilterCount() > 0;
  }, [getActiveFilterCount]);

  // Remove a specific filter
  const removeFilter = useCallback(
    (type: ActiveFilter['type'], value?: string) => {
      switch (type) {
        case 'category':
          setFilter({ selectedCategory: null });
          break;
        case 'service':
          setFilter({ selectedService: null });
          break;
        case 'search':
          setFilter({ searchQuery: '' });
          break;
        case 'time':
          setFilter({ timeRange: 'all', customDateRange: null });
          break;
        case 'status':
          if (value) {
            setFilter({
              selectedStatuses: filter.selectedStatuses.filter((s) => s !== value),
            });
          } else {
            setFilter({ selectedStatuses: [] });
          }
          break;
        case 'repository':
          setFilter({ repositoryFilter: '' });
          break;
      }
    },
    [filter.selectedStatuses, setFilter]
  );

  // Context value
  const value: CategoryContextType = {
    categories,
    categoryStats,
    services,
    serviceStats,
    filter,
    setFilter,
    clearAllFilters,
    getEventCategory,
    getEventService,
    calculateStats,
    calculateServiceStats,
    filterEvents,
    getActiveFilters,
    getActiveFilterCount,
    hasActiveFilters,
    removeFilter,
    isLoading,
    error,
  };

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

// Custom hook to use category context
export function useCategories() {
  const context = useContext(CategoryContext);

  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }

  return context;
}

// Helper hook for category-specific operations
export function useCategoryOperations() {
  const context = useCategories();

  return {
    // Get category by ID
    getCategoryById: (id: string) => context.categories.find((cat) => cat.id === id),

    // Get all categories sorted by priority
    getSortedCategories: () => [...context.categories].sort((a, b) => a.priority - b.priority),

    // Check if category is selected
    isCategorySelected: (categoryId: string) => context.filter.selectedCategory === categoryId,

    // Select category
    selectCategory: (categoryId: string | null) =>
      context.setFilter({ selectedCategory: categoryId }),

    // Clear all filters
    clearFilters: () => context.clearAllFilters(),

    // Set search query
    setSearch: (query: string) => context.setFilter({ searchQuery: query }),

    // Service operations
    selectService: (serviceId: string | null) => context.setFilter({ selectedService: serviceId }),

    // Check if service is selected
    isServiceSelected: (serviceId: string) => context.filter.selectedService === serviceId,

    // Time range operations
    setTimeRange: (timeRange: TimeRangePreset) => context.setFilter({ timeRange }),

    // Status operations
    toggleStatus: (status: EventStatus) => {
      const current = context.filter.selectedStatuses;
      const updated = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      context.setFilter({ selectedStatuses: updated });
    },

    // Repository filter
    setRepositoryFilter: (repo: string) => context.setFilter({ repositoryFilter: repo }),
  };
}

// Export ActiveFilter type for use in components
export type { ActiveFilter };
