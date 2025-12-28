'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCategories } from '@/contexts/CategoryContext';
import { cn } from '@/lib/utils';
import { Terminal, Search, X, Filter, RotateCcw, Check, Globe } from 'lucide-react';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import StatusFilter from '@/components/filters/StatusFilter';
import RepositoryFilter from '@/components/filters/RepositoryFilter';
import ActiveFilterChips from '@/components/ActiveFilterChips';

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryStats: Record<string, number>;
  serviceStats: Record<string, number>;
  // Legacy props - kept for backwards compatibility but not used
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function MobileFilterSheet({
  open,
  onOpenChange,
  categoryStats,
  serviceStats,
}: MobileFilterSheetProps) {
  const { categories, filter, setFilter, clearAllFilters, getActiveFilterCount, hasActiveFilters } =
    useCategories();

  const [localSearchValue, setLocalSearchValue] = useState(filter.searchQuery);

  // Sync local value with context
  useEffect(() => {
    setLocalSearchValue(filter.searchQuery);
  }, [filter.searchQuery]);

  // Debounced update to context
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchValue !== filter.searchQuery) {
        setFilter({ searchQuery: localSearchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchValue, filter.searchQuery, setFilter]);

  const handleClearSearch = useCallback(() => {
    setLocalSearchValue('');
    setFilter({ searchQuery: '' });
  }, [setFilter]);

  const activeFilterCount = getActiveFilterCount();

  const services = [
    {
      id: 'github',
      name: 'GitHub',
      border: 'border-neon-cyan',
      bg: 'bg-neon-cyan/20',
      text: 'text-neon-cyan',
    },
    {
      id: 'vercel',
      name: 'Vercel',
      border: 'border-neon-magenta',
      bg: 'bg-neon-magenta/20',
      text: 'text-neon-magenta',
    },
    {
      id: 'railway',
      name: 'Railway',
      border: 'border-neon-green',
      bg: 'bg-neon-green/20',
      text: 'text-neon-green',
    },
  ];

  const handleServiceClick = (serviceId: string) => {
    const isSelected = filter.selectedService === serviceId;
    setFilter({ selectedService: isSelected ? null : serviceId });
  };

  const handleCategoryClick = (categoryId: string) => {
    const isSelected = filter.selectedCategory === categoryId;
    setFilter({ selectedCategory: isSelected ? null : categoryId });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90dvh] rounded-t-2xl border-t-2 border-neon-cyan p-0"
      >
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between border-b border-neon-cyan/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neon-cyan" />
            <SheetTitle className="font-mono text-sm text-neon-cyan">FILTERS</SheetTitle>
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="border-neon-orange text-xs text-neon-orange">
                {activeFilterCount} ACTIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 px-2 text-xs text-neon-orange hover:bg-neon-orange/10"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                CLEAR
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 hover:bg-neon-cyan/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <SheetDescription className="sr-only">
          Filter events by category, service, time range, status, or search query
        </SheetDescription>

        <div className="flex max-h-[calc(90dvh-60px)] flex-col overflow-y-auto p-4">
          <div className="flex-1 space-y-6">
            {/* Active Filter Chips */}
            {hasActiveFilters() && (
              <div className="space-y-2">
                <label className="font-mono text-xs text-muted-foreground">ACTIVE::FILTERS</label>
                <ActiveFilterChips />
              </div>
            )}

            {/* Search */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-mono text-xs text-neon-cyan">
                <Search className="h-3 w-3" />
                SEARCH
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neon-cyan" />
                <Input
                  value={localSearchValue}
                  onChange={(e) => setLocalSearchValue(e.target.value)}
                  placeholder="SEARCH_EVENTS..."
                  className={cn(
                    'h-12 border-2 bg-terminal-black pl-10 pr-10 font-mono text-base',
                    localSearchValue
                      ? 'border-neon-green text-neon-green'
                      : 'border-muted-foreground/30'
                  )}
                />
                {localSearchValue && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-mono text-xs text-neon-magenta">
                <Terminal className="h-3 w-3" />
                SERVICES
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* All Services Button */}
                <Button
                  variant="outline"
                  onClick={() => setFilter({ selectedService: null })}
                  className={cn(
                    'h-auto flex-col gap-1 py-3 font-mono text-xs',
                    'border-2 transition-all',
                    !filter.selectedService
                      ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan'
                      : 'border-muted hover:border-neon-cyan/50'
                  )}
                >
                  <span className="flex items-center gap-1">
                    {!filter.selectedService && <Check className="h-3 w-3" />}
                    <Globe className="h-3 w-3" />
                    ALL
                  </span>
                </Button>
                {services.map((service) => {
                  const isSelected = filter.selectedService === service.id;
                  const count = serviceStats[service.id] || 0;

                  return (
                    <Button
                      key={service.id}
                      variant="outline"
                      onClick={() => handleServiceClick(service.id)}
                      className={cn(
                        'h-auto flex-col gap-1 py-3 font-mono text-xs',
                        'border-2 transition-all',
                        isSelected
                          ? `${service.border} ${service.bg} ${service.text}`
                          : 'border-muted hover:border-neon-cyan/50'
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {isSelected && <Check className="h-3 w-3" />}
                        {service.name.toUpperCase()}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-mono text-xs text-neon-green">
                <Filter className="h-3 w-3" />
                CATEGORIES
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => {
                  const isSelected = filter.selectedCategory === category.id;
                  const count = categoryStats[category.id] || 0;

                  return (
                    <Button
                      key={category.id}
                      variant="outline"
                      onClick={() => handleCategoryClick(category.id)}
                      className={cn(
                        'h-auto flex-col gap-1 py-3 font-mono text-xs',
                        'justify-start border-2 transition-all',
                        isSelected
                          ? 'border-neon-cyan bg-neon-cyan/20 text-neon-cyan'
                          : 'border-muted hover:border-neon-cyan/50'
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {isSelected && <Check className="h-3 w-3" />}
                        {category.name.toUpperCase()}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Time Range Filter */}
            <DateRangeFilter />

            {/* Status Filter */}
            <StatusFilter />

            {/* Repository Filter */}
            <RepositoryFilter />
          </div>

          {/* Apply Button - Sticky at bottom */}
          <div className="sticky bottom-0 mt-4 bg-terminal-black pb-[env(safe-area-inset-bottom)] pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              className={cn(
                'h-14 w-full font-mono text-base',
                'border-2 border-neon-cyan bg-neon-cyan/20',
                'text-neon-cyan hover:bg-neon-cyan/30'
              )}
            >
              APPLY FILTERS
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
