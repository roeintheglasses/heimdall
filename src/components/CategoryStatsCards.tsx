'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Rocket, Server, AlertCircle, Shield, Activity } from 'lucide-react';
import { useCategories, useCategoryOperations } from '@/contexts/CategoryContext';
import { CategoryStats, DashboardEvent, extractService, getServiceById } from '@/types/categories';
import { cn } from '@/lib/utils';

interface CategoryStatsCardsProps {
  categoryStats: CategoryStats;
  events?: DashboardEvent[];
  className?: string;
  compact?: boolean;
}

// Icon mapping for categories
const CATEGORY_ICONS = {
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield,
} as const;

// Category to neon color mapping
const CATEGORY_NEON_MAP: Record<
  string,
  { border: string; bg: string; text: string; shadow: string }
> = {
  blue: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    shadow: 'shadow-[4px_4px_0_hsl(180_100%_50%)]',
  },
  green: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
    shadow: 'shadow-[4px_4px_0_hsl(300_100%_50%)]',
  },
  purple: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    shadow: 'shadow-[4px_4px_0_hsl(120_100%_50%)]',
  },
  red: {
    border: 'border-neon-orange',
    bg: 'bg-neon-orange/10',
    text: 'text-neon-orange',
    shadow: 'shadow-[4px_4px_0_hsl(30_100%_50%)]',
  },
  orange: {
    border: 'border-neon-pink',
    bg: 'bg-neon-pink/10',
    text: 'text-neon-pink',
    shadow: 'shadow-[4px_4px_0_hsl(330_100%_60%)]',
  },
};

function getNeonColors(color: string) {
  return CATEGORY_NEON_MAP[color] || CATEGORY_NEON_MAP.blue;
}

function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || Activity;
  return <IconComponent className={className} />;
}

export default function CategoryStatsCards({
  categoryStats,
  events = [],
  className = '',
  compact = false,
}: CategoryStatsCardsProps) {
  const { categories: _categories, filter: _filter, getEventCategory } = useCategories();
  const { getSortedCategories, selectCategory, isCategorySelected } = useCategoryOperations();

  const sortedCategories = getSortedCategories();
  const totalEvents = Object.values(categoryStats).reduce((sum, count) => sum + count, 0);

  const getCategoryPercentage = (count: number) => {
    return totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
  };

  const getServiceBreakdown = (categoryId: string) => {
    const categoryEvents = events.filter((event) => {
      const eventCategory = getEventCategory(event);
      return eventCategory.id === categoryId;
    });

    const serviceCount: Record<string, number> = {};
    categoryEvents.forEach((event) => {
      const serviceId = extractService(event.event_type || 'unknown');
      serviceCount[serviceId] = (serviceCount[serviceId] || 0) + 1;
    });

    return Object.entries(serviceCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([serviceId, count]) => ({ serviceId, count }));
  };

  if (compact) {
    return (
      <div
        className={cn('grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-5 sm:gap-4', className)}
      >
        {sortedCategories.map((category) => {
          const count = categoryStats[category.id] || 0;
          const isSelected = isCategorySelected(category.id);
          const neonColors = getNeonColors(category.color);

          return (
            <div
              key={category.id}
              className={cn(
                'cursor-pointer transition-all duration-200',
                'border-2 bg-terminal-black p-3',
                neonColors.border,
                isSelected && [neonColors.shadow, 'ring-2 ring-neon-cyan'],
                'hover:-translate-y-0.5 hover:shadow-retro-sm'
              )}
              onClick={() => selectCategory(isSelected ? null : category.id)}
            >
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className={cn('border-2 p-2', neonColors.border, neonColors.bg)}>
                  <CategoryIcon
                    iconName={category.icon}
                    className={cn('h-4 w-4', neonColors.text)}
                  />
                </div>
                <div>
                  <p className={cn('font-mono text-lg font-bold', neonColors.text)}>
                    {String(count).padStart(2, '0')}
                  </p>
                  <p className="truncate font-mono text-xs uppercase text-muted-foreground">
                    {category.name}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 gap-3 xs:gap-4 sm:grid-cols-2 lg:grid-cols-5', className)}>
      {sortedCategories.map((category) => {
        const count = categoryStats[category.id] || 0;
        const percentage = getCategoryPercentage(count);
        const isSelected = isCategorySelected(category.id);
        const neonColors = getNeonColors(category.color);

        return (
          <div
            key={category.id}
            className={cn(
              'group cursor-pointer transition-all duration-200',
              'border-2 bg-terminal-black',
              neonColors.border,
              isSelected && [
                neonColors.shadow,
                '-translate-x-1 -translate-y-1 ring-2 ring-neon-cyan',
              ],
              'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro-sm'
            )}
            onClick={() => selectCategory(isSelected ? null : category.id)}
          >
            {/* Terminal header */}
            <div
              className={cn(
                'flex items-center justify-between border-b px-3 py-1.5',
                neonColors.border,
                neonColors.bg
              )}
            >
              <span className={cn('font-mono text-xs uppercase tracking-wider', neonColors.text)}>
                {category.name}
              </span>
              {isSelected && (
                <Badge
                  variant="outline"
                  className={cn('px-1.5 py-0 text-[10px]', neonColors.text, neonColors.border)}
                >
                  ACTIVE
                </Badge>
              )}
            </div>

            <div className="relative overflow-hidden p-3 xs:p-4">
              {/* Icon and count */}
              <div className="mb-4 flex items-start justify-between">
                <div
                  className={cn(
                    'border-2 p-3 transition-all duration-200',
                    'group-hover:shadow-[0_0_15px_currentColor]',
                    neonColors.border,
                    neonColors.bg
                  )}
                >
                  <CategoryIcon
                    iconName={category.icon}
                    className={cn('h-5 w-5 sm:h-6 sm:w-6', neonColors.text)}
                  />
                </div>

                {/* Big count display */}
                <div className="text-right">
                  <p
                    className={cn(
                      'font-mono text-2xl font-bold tabular-nums xs:text-3xl sm:text-4xl',
                      neonColors.text,
                      'text-glow-cyan'
                    )}
                  >
                    {String(count).padStart(2, '0')}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground xs:text-xs">
                    {percentage}%
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="mb-3 line-clamp-2 font-mono text-[10px] leading-tight text-muted-foreground xs:text-xs">
                {category.description}
              </p>

              {/* Service breakdown */}
              {events.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1">
                  {getServiceBreakdown(category.id).map(({ serviceId, count }) => {
                    const service = getServiceById(serviceId);
                    if (!service) return null;

                    return (
                      <Badge
                        key={serviceId}
                        variant="outline"
                        className="px-1.5 py-0 font-mono text-[10px]"
                      >
                        {service.name.toUpperCase()}:{count}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Progress bar - retro pixel style */}
              <div className="h-2 w-full overflow-hidden border border-neon-cyan/30 bg-terminal-gray">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    'bg-gradient-to-r',
                    neonColors.text.replace('text-', 'from-'),
                    'to-transparent'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
