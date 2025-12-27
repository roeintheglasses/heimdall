'use client';

import { useEffect } from 'react';
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
import { Terminal, Search, X, Filter, RotateCcw, Check } from 'lucide-react';

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryStats: Record<string, number>;
  serviceStats: Record<string, number>;
}

export default function MobileFilterSheet({
  open,
  onOpenChange,
  searchQuery,
  onSearchChange,
  categoryStats,
  serviceStats,
}: MobileFilterSheetProps) {
  const { categories, filter, setFilter } = useCategories();

  // Count active filters
  const activeFilterCount = [filter.selectedCategory, filter.selectedService, searchQuery].filter(
    Boolean
  ).length;

  const clearAllFilters = () => {
    setFilter({
      selectedCategory: null,
      selectedService: null,
      searchQuery: '',
    });
    onSearchChange('');
  };

  const services = [
    { id: 'github', name: 'GitHub', color: 'neon-cyan' },
    { id: 'vercel', name: 'Vercel', color: 'neon-magenta' },
    { id: 'railway', name: 'Railway', color: 'neon-green' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl border-t-2 border-neon-cyan p-0"
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
            {activeFilterCount > 0 && (
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
          Filter events by category, service, or search query
        </SheetDescription>

        <div className="max-h-[calc(85vh-60px)] space-y-6 overflow-y-auto p-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-mono text-xs text-neon-cyan">
              <Search className="h-3 w-3" />
              SEARCH
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neon-cyan" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search events..."
                className="pl-10 pr-10 font-mono"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange('')}
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
            <div className="grid grid-cols-3 gap-2">
              {services.map((service) => {
                const isSelected = filter.selectedService === service.id;
                const count = serviceStats[service.id] || 0;

                return (
                  <Button
                    key={service.id}
                    variant="outline"
                    onClick={() =>
                      setFilter({
                        ...filter,
                        selectedService: isSelected ? null : service.id,
                      })
                    }
                    className={cn(
                      'h-auto flex-col gap-1 py-3 font-mono text-xs',
                      'border-2 transition-all',
                      isSelected
                        ? `border-${service.color} bg-${service.color}/20 text-${service.color}`
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
                    onClick={() =>
                      setFilter({
                        ...filter,
                        selectedCategory: isSelected ? null : category.id,
                      })
                    }
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

          {/* Apply Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className={cn(
              'h-12 w-full font-mono text-sm',
              'border-2 border-neon-cyan bg-neon-cyan/20',
              'text-neon-cyan hover:bg-neon-cyan/30'
            )}
          >
            APPLY FILTERS
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
