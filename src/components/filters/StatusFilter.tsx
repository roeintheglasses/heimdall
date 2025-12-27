'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/contexts/CategoryContext';
import { EventStatus } from '@/types/categories';
import { cn } from '@/lib/utils';

interface StatusFilterProps {
  className?: string;
  showLabel?: boolean;
}

const STATUS_OPTIONS: {
  value: EventStatus;
  label: string;
  icon: React.ElementType;
  color: { border: string; bg: string; text: string };
}[] = [
  {
    value: 'success',
    label: 'SUCCESS',
    icon: CheckCircle,
    color: {
      border: 'border-neon-green',
      bg: 'bg-neon-green/10',
      text: 'text-neon-green',
    },
  },
  {
    value: 'failure',
    label: 'FAILED',
    icon: XCircle,
    color: {
      border: 'border-neon-orange',
      bg: 'bg-neon-orange/10',
      text: 'text-neon-orange',
    },
  },
  {
    value: 'pending',
    label: 'PENDING',
    icon: Clock,
    color: {
      border: 'border-neon-cyan',
      bg: 'bg-neon-cyan/10',
      text: 'text-neon-cyan',
    },
  },
];

export default function StatusFilter({ className = '', showLabel = true }: StatusFilterProps) {
  const { filter, setFilter } = useCategories();

  const toggleStatus = (status: EventStatus) => {
    const current = filter.selectedStatuses;
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilter({ selectedStatuses: updated });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && <div className="font-mono text-xs text-muted-foreground">STATUS::FILTER</div>}

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => {
          const isSelected = filter.selectedStatuses.includes(value);

          return (
            <Button
              key={value}
              variant="outline"
              size="sm"
              onClick={() => toggleStatus(value)}
              className={cn(
                'font-mono text-xs transition-all duration-200',
                'border-2',
                isSelected
                  ? `${color.border} ${color.bg} ${color.text} shadow-retro-sm`
                  : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
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
