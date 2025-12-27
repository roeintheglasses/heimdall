'use client';

import React from 'react';
import { Clock, Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/contexts/CategoryContext';
import { TimeRangePreset } from '@/types/categories';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  className?: string;
  showLabel?: boolean;
}

const TIME_PRESETS: { value: TimeRangePreset; label: string; icon: React.ElementType }[] = [
  { value: '1h', label: '1H', icon: Clock },
  { value: '24h', label: '24H', icon: Clock },
  { value: 'week', label: 'WEEK', icon: CalendarDays },
];

export default function DateRangeFilter({
  className = '',
  showLabel = true,
}: DateRangeFilterProps) {
  const { filter, setFilter } = useCategories();

  const handleTimeRangeChange = (value: TimeRangePreset) => {
    if (filter.timeRange === value) {
      // Toggle off if clicking the same value
      setFilter({ timeRange: 'all', customDateRange: null });
    } else {
      setFilter({ timeRange: value, customDateRange: null });
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && <div className="font-mono text-xs text-muted-foreground">TIME::RANGE</div>}

      <div className="flex flex-wrap gap-2">
        {TIME_PRESETS.map(({ value, label, icon: Icon }) => {
          const isSelected = filter.timeRange === value;

          return (
            <Button
              key={value}
              variant="outline"
              size="sm"
              onClick={() => handleTimeRangeChange(value)}
              className={cn(
                'font-mono text-xs transition-all duration-200',
                'border-2 hover:border-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-cyan',
                isSelected
                  ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-retro-sm'
                  : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              <Icon className="mr-1.5 h-3 w-3" />
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
