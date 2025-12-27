'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '@/contexts/SoundContext';
import { cn } from '@/lib/utils';

interface SoundToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SoundToggle({ className, size = 'md' }: SoundToggleProps) {
  const { isEnabled, toggle, initialized } = useSound();

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5',
  };

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <button
      onClick={toggle}
      disabled={!initialized}
      className={cn(
        // Base styles
        'relative flex items-center justify-center',
        'border-2 transition-all duration-100',
        // Retro terminal styling
        'bg-transparent',
        isEnabled
          ? 'border-neon-cyan text-neon-cyan shadow-retro-sm hover:shadow-retro'
          : 'border-muted-foreground text-muted-foreground hover:border-neon-cyan hover:text-neon-cyan',
        // Hover effects
        'hover:translate-x-[-1px] hover:translate-y-[-1px]',
        'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
        // Focus
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-black',
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0',
        // Size
        sizeClasses[size],
        className
      )}
      aria-label={isEnabled ? 'Mute sounds' : 'Enable sounds'}
      title={isEnabled ? 'Sound ON - Click to mute' : 'Sound OFF - Click to enable'}
    >
      {/* Glow effect when enabled */}
      {isEnabled && <span className="absolute inset-0 animate-glow-pulse bg-neon-cyan/10" />}

      {/* Icon */}
      {isEnabled ? (
        <Volume2 size={iconSize[size]} className="relative z-10 animate-pulse-slow" />
      ) : (
        <VolumeX size={iconSize[size]} className="relative z-10" />
      )}

      {/* Corner decoration */}
      <span className="absolute right-0 top-0 h-1 w-1 bg-current" />
      <span className="absolute bottom-0 left-0 h-1 w-1 bg-current" />
    </button>
  );
}

// Compact version for inline use
export function SoundToggleCompact({ className }: { className?: string }) {
  const { isEnabled, toggle, initialized } = useSound();

  return (
    <button
      onClick={toggle}
      disabled={!initialized}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1',
        'font-mono text-xs uppercase tracking-wider',
        'border transition-all duration-100',
        isEnabled
          ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
          : 'border-muted-foreground/30 bg-transparent text-muted-foreground',
        'hover:border-neon-cyan hover:text-neon-cyan',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      aria-label={isEnabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {isEnabled ? (
        <>
          <Volume2 size={12} />
          <span>SFX ON</span>
        </>
      ) : (
        <>
          <VolumeX size={12} />
          <span>SFX OFF</span>
        </>
      )}
    </button>
  );
}
