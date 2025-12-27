'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Filter, X } from 'lucide-react';

interface FloatingActionButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export default function FloatingActionButton({
  isOpen,
  onClick,
  hasActiveFilters = false,
  className,
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'h-14 w-14 rounded-full p-0',
        'border-2 border-neon-cyan',
        'bg-terminal-black hover:bg-neon-cyan/20',
        'shadow-[0_0_20px_rgba(0,255,255,0.3)]',
        'transition-all duration-300',
        'sm:hidden', // Only show on mobile
        isOpen && 'rotate-45 bg-neon-cyan/20',
        className
      )}
      aria-label={isOpen ? 'Close filters' : 'Open filters'}
    >
      {isOpen ? (
        <X className="h-6 w-6 text-neon-cyan" />
      ) : (
        <Filter className="h-6 w-6 text-neon-cyan" />
      )}

      {/* Active filter indicator */}
      {hasActiveFilters && !isOpen && (
        <span
          className={cn(
            'absolute -right-1 -top-1',
            'h-4 w-4 rounded-full',
            'bg-neon-orange',
            'animate-pulse',
            'border-2 border-terminal-black'
          )}
        />
      )}
    </Button>
  );
}
