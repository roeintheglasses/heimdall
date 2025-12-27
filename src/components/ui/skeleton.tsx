import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Retro terminal skeleton - phosphor green scanline effect
        'relative overflow-hidden',
        'border border-neon-cyan/20 bg-terminal-gray',
        // Scanline animation overlay
        'after:absolute after:inset-0',
        'after:bg-gradient-to-b after:from-transparent after:via-neon-green/10 after:to-transparent',
        'after:animate-scanline',
        // Base pulse
        'animate-pulse-slow',
        className
      )}
      {...props}
    />
  );
}

// Terminal-style text skeleton with cursor
function SkeletonText({
  className,
  lines = 1,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 border-l-2 border-neon-cyan/50 bg-terminal-gray',
            'relative overflow-hidden',
            // Random widths for more natural look
            i === lines - 1 ? 'w-3/4' : 'w-full',
            // Blinking cursor on last line
            i === lines - 1 &&
              'after:absolute after:right-0 after:top-0 after:h-full after:w-2 after:animate-cursor-blink after:bg-neon-cyan'
          )}
        />
      ))}
    </div>
  );
}

// Card skeleton with terminal styling
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-2 border-neon-cyan/20 bg-terminal-black p-4',
        'relative overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      {/* Content lines */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 animate-scanline bg-gradient-to-b from-transparent via-neon-cyan/5 to-transparent" />
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard };
