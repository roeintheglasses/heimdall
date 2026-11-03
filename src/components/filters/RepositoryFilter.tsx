'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/contexts/CategoryContext';
import { cn } from '@/lib/utils';

interface RepositoryFilterProps {
  className?: string;
  showLabel?: boolean;
}

export default function RepositoryFilter({
  className = '',
  showLabel = true,
}: RepositoryFilterProps) {
  const { filter, setFilter } = useCategories();
  const [localValue, setLocalValue] = useState(filter.repositoryFilter);

  // Sync local value with context when context changes externally
  useEffect(() => {
    setLocalValue(filter.repositoryFilter);
  }, [filter.repositoryFilter]);

  // Debounced update to context
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== filter.repositoryFilter) {
        setFilter({ repositoryFilter: localValue });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, filter.repositoryFilter, setFilter]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    setFilter({ repositoryFilter: '' });
  }, [setFilter]);

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="font-mono text-xs text-muted-foreground">REPOSITORY::FILTER</div>
      )}

      <div className="relative">
        <GitBranch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          aria-label="Filter by repository"
          placeholder="FILTER_REPOS..."
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className={cn(
            'h-9 border-2 bg-terminal-black pl-9 pr-8 font-mono text-xs',
            'placeholder:text-muted-foreground/50',
            'focus-visible:border-neon-cyan focus-visible:ring-2 focus-visible:ring-neon-cyan',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-black',
            localValue
              ? 'border-neon-cyan text-neon-cyan'
              : 'border-muted-foreground/30 text-foreground'
          )}
        />
        {localValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            aria-label="Clear repository filter"
            className="absolute right-0 top-1/2 h-11 w-11 -translate-y-1/2 p-0 hover:bg-neon-orange/10"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-neon-orange" />
          </Button>
        )}
      </div>
    </div>
  );
}
