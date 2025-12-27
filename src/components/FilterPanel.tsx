'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  X,
  Search,
  LayoutGrid,
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield,
  Zap,
  Train,
  Globe,
} from 'lucide-react';
import { useCategories, useCategoryOperations } from '@/contexts/CategoryContext';
import { CategoryStats, ServiceStats, DEFAULT_SERVICES } from '@/types/categories';
import ActiveFilterChips from '@/components/ActiveFilterChips';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import StatusFilter from '@/components/filters/StatusFilter';
import RepositoryFilter from '@/components/filters/RepositoryFilter';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  categoryStats: CategoryStats;
  serviceStats: ServiceStats;
  className?: string;
  defaultOpen?: boolean;
}

// Icon mappings
const CATEGORY_ICONS = {
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield,
  LayoutGrid,
} as const;

const SERVICE_ICONS: Record<string, React.ElementType> = {
  GitBranch,
  Zap,
  Train,
  Globe,
};

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
};

// Service to neon color mapping
const SERVICE_NEON_MAP: Record<string, { border: string; bg: string; text: string }> = {
  github: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
  },
  vercel: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
  },
  railway: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
  },
};

function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || LayoutGrid;
  return <IconComponent className={className} />;
}

export default function FilterPanel({
  categoryStats,
  serviceStats,
  className = '',
  defaultOpen = false,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { categories, filter, setFilter, hasActiveFilters, getActiveFilterCount, clearAllFilters } =
    useCategories();
  const {
    getSortedCategories,
    selectCategory,
    selectService,
    isCategorySelected,
    isServiceSelected,
  } = useCategoryOperations();

  const [searchValue, setSearchValue] = useState(filter.searchQuery);

  // Sync search value with context
  useEffect(() => {
    setSearchValue(filter.searchQuery);
  }, [filter.searchQuery]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filter.searchQuery) {
        setFilter({ searchQuery: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filter.searchQuery, setFilter]);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setFilter({ searchQuery: '' });
  }, [setFilter]);

  const sortedCategories = getSortedCategories();
  const totalEvents = Object.values(categoryStats).reduce((sum, count) => sum + count, 0);
  const availableServices = DEFAULT_SERVICES.filter((service) => serviceStats[service.id] > 0);

  const handleCategoryChange = (value: string) => {
    if (value === 'all') {
      selectCategory(null);
    } else {
      selectCategory(value);
    }
  };

  const handleServiceClick = (serviceId: string) => {
    if (isServiceSelected(serviceId)) {
      selectService(null);
    } else {
      selectService(serviceId);
    }
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={cn('space-y-3', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="flex items-center justify-between rounded-none border-2 border-neon-cyan/50 bg-terminal-black p-3">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 p-0 font-mono text-xs text-neon-cyan hover:bg-transparent hover:text-neon-cyan"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Terminal className="h-3 w-3" />
              <span>FILTERS::PANEL</span>
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <>
                <Badge
                  variant="outline"
                  className="border-neon-magenta font-mono text-xs text-neon-magenta"
                >
                  {activeFilterCount} ACTIVE
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 border-2 border-neon-orange px-2 font-mono text-xs text-neon-orange hover:bg-neon-orange/10"
                >
                  <X className="mr-1 h-3 w-3" />
                  CLEAR
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Active Filter Chips - Always visible when collapsed */}
        {!isOpen && hasActiveFilters() && (
          <div className="border-x-2 border-b-2 border-neon-cyan/30 bg-terminal-black/50 p-3">
            <ActiveFilterChips />
          </div>
        )}

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="space-y-4 border-x-2 border-b-2 border-neon-cyan/30 bg-terminal-black/50 p-4">
            {/* Row 1: Services and Categories */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Services */}
              <div className="space-y-2">
                <div className="font-mono text-xs text-muted-foreground">SERVICE::FILTER</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={!filter.selectedService ? 'neon' : 'outline'}
                    size="sm"
                    onClick={() => selectService(null)}
                    className={cn(
                      'font-mono text-xs',
                      !filter.selectedService && 'shadow-retro-sm'
                    )}
                  >
                    <Globe className="mr-1.5 h-3 w-3" />
                    ALL
                  </Button>
                  {availableServices.map((service) => {
                    const isSelected = isServiceSelected(service.id);
                    const neonColors = SERVICE_NEON_MAP[service.id] || SERVICE_NEON_MAP.github;
                    const IconComponent = SERVICE_ICONS[service.icon] || Globe;

                    return (
                      <Button
                        key={service.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleServiceClick(service.id)}
                        className={cn(
                          'font-mono text-xs transition-all duration-200',
                          'border-2',
                          neonColors.border,
                          isSelected && [neonColors.bg, neonColors.text, 'shadow-retro-sm'],
                          !isSelected && 'hover:bg-opacity-10'
                        )}
                      >
                        <IconComponent className="mr-1.5 h-3 w-3" />
                        {service.name.toUpperCase()}
                        <Badge
                          variant="outline"
                          className={cn(
                            'ml-1.5 h-4 border-0 px-1 text-[9px]',
                            isSelected ? neonColors.text : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {serviceStats[service.id] || 0}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <div className="font-mono text-xs text-muted-foreground">CATEGORY::FILTER</div>
                <Tabs
                  value={filter.selectedCategory || 'all'}
                  onValueChange={handleCategoryChange}
                  className="w-full"
                >
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-1 border-2 border-neon-magenta/30 bg-terminal-black p-1 sm:grid-cols-6">
                    <TabsTrigger
                      value="all"
                      className={cn(
                        'flex items-center gap-1 p-1.5 text-[10px]',
                        'border border-transparent font-mono',
                        'data-[state=active]:border-neon-cyan data-[state=active]:bg-neon-cyan/10',
                        'data-[state=active]:text-neon-cyan',
                        'hover:bg-neon-cyan/5 hover:text-neon-cyan',
                        'text-muted-foreground'
                      )}
                    >
                      <LayoutGrid className="h-3 w-3" />
                      ALL
                      <span className="text-[8px] opacity-70">{totalEvents}</span>
                    </TabsTrigger>
                    {sortedCategories.map((category) => {
                      const count = categoryStats[category.id] || 0;
                      const neonColors =
                        CATEGORY_NEON_MAP[category.id] || CATEGORY_NEON_MAP.development;
                      const isSelected = isCategorySelected(category.id);

                      return (
                        <TabsTrigger
                          key={category.id}
                          value={category.id}
                          className={cn(
                            'flex items-center gap-1 p-1.5 text-[10px]',
                            'border border-transparent font-mono',
                            isSelected && [neonColors.border, neonColors.bg, neonColors.text],
                            !isSelected && 'text-muted-foreground',
                            'hover:opacity-80'
                          )}
                        >
                          <CategoryIcon iconName={category.icon} className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {category.name.slice(0, 3).toUpperCase()}
                          </span>
                          <span className="text-[8px] opacity-70">{count}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Row 2: Time Range and Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <DateRangeFilter />
              <StatusFilter />
            </div>

            {/* Row 3: Search and Repository */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Search */}
              <div className="space-y-2">
                <div className="font-mono text-xs text-muted-foreground">SEARCH::QUERY</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="SEARCH_EVENTS..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className={cn(
                      'h-9 border-2 bg-terminal-black pl-9 pr-8 font-mono text-xs',
                      'placeholder:text-muted-foreground/50',
                      'focus:border-neon-green focus:ring-0 focus-visible:ring-0',
                      searchValue
                        ? 'border-neon-green text-neon-green'
                        : 'border-muted-foreground/30 text-foreground'
                    )}
                  />
                  {searchValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-neon-orange/10"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-neon-orange" />
                    </Button>
                  )}
                </div>
              </div>

              <RepositoryFilter />
            </div>

            {/* Active Filter Chips inside expanded panel */}
            {hasActiveFilters() && (
              <div className="border-t border-neon-cyan/20 pt-3">
                <div className="mb-2 font-mono text-xs text-muted-foreground">ACTIVE::FILTERS</div>
                <ActiveFilterChips />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
