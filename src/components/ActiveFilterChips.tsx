'use client';

import React from 'react';
import { X, Tag, Clock, CheckCircle, GitBranch, Search, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCategories, ActiveFilter } from '@/contexts/CategoryContext';
import { cn } from '@/lib/utils';

interface ActiveFilterChipsProps {
  className?: string;
}

// Icon mapping for filter types
const FILTER_TYPE_ICONS: Record<ActiveFilter['type'], React.ElementType> = {
  category: Layers,
  service: Tag,
  search: Search,
  time: Clock,
  status: CheckCircle,
  repository: GitBranch,
};

// Color mapping for filter types
const FILTER_TYPE_COLORS: Record<
  ActiveFilter['type'],
  { border: string; bg: string; text: string }
> = {
  category: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
  },
  service: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
  },
  search: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
  },
  time: {
    border: 'border-neon-orange',
    bg: 'bg-neon-orange/10',
    text: 'text-neon-orange',
  },
  status: {
    border: 'border-neon-pink',
    bg: 'bg-neon-pink/10',
    text: 'text-neon-pink',
  },
  repository: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
  },
};

export default function ActiveFilterChips({ className = '' }: ActiveFilterChipsProps) {
  const { getActiveFilters, removeFilter } = useCategories();

  const activeFilters = getActiveFilters();

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {activeFilters.map((filter, index) => {
        const Icon = FILTER_TYPE_ICONS[filter.type];
        const colors = FILTER_TYPE_COLORS[filter.type];

        return (
          <Badge
            key={`${filter.type}-${filter.value}-${index}`}
            variant="outline"
            className={cn(
              'flex items-center gap-1.5 border-2 px-2 py-1 font-mono text-xs',
              'transition-all duration-200 hover:opacity-80',
              colors.border,
              colors.bg,
              colors.text
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="max-w-24 truncate uppercase">{filter.label}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-0.5 h-auto p-0 hover:bg-transparent"
              onClick={() => removeFilter(filter.type, filter.value)}
            >
              <X className="h-3 w-3 hover:opacity-70" />
            </Button>
          </Badge>
        );
      })}
    </div>
  );
}
