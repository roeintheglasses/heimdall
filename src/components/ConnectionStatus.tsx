'use client';

import { Badge } from '@/components/ui/badge';
import { Activity, Wifi, WifiOff, Database, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  eventCount: number;
  error?: string | null;
}

export default function ConnectionStatus({
  isConnected,
  eventCount,
  error,
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    if (error) {
      return {
        icon: WifiOff,
        label: 'ERROR',
        borderColor: 'border-destructive',
        textColor: 'text-destructive',
        bgColor: 'bg-destructive/10',
        dotColor: 'bg-destructive',
        glowColor: 'shadow-[0_0_10px_hsl(0_100%_50%)]',
        description: 'CONNECTION_FAILED',
      };
    }

    if (isConnected) {
      return {
        icon: Wifi,
        label: 'LIVE',
        borderColor: 'border-neon-green',
        textColor: 'text-neon-green',
        bgColor: 'bg-neon-green/10',
        dotColor: 'bg-neon-green',
        glowColor: 'shadow-[0_0_10px_hsl(120_100%_50%)]',
        description: 'STREAM_ACTIVE',
      };
    }

    return {
      icon: WifiOff,
      label: 'OFFLINE',
      borderColor: 'border-neon-orange',
      textColor: 'text-neon-orange',
      bgColor: 'bg-neon-orange/10',
      dotColor: 'bg-neon-orange',
      glowColor: 'shadow-[0_0_10px_hsl(30_100%_50%)]',
      description: 'RECONNECTING...',
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono xs:gap-2 sm:gap-3">
      {/* Connection Status */}
      <div
        className={cn(
          'flex items-center gap-2 border-2 px-2 py-1',
          config.borderColor,
          config.bgColor,
          isConnected && config.glowColor
        )}
      >
        {/* LED Indicator */}
        <div className="relative">
          <div
            className={cn(
              'h-2 w-2 transition-all duration-300',
              config.dotColor,
              isConnected && 'animate-pulse-slow'
            )}
          />
          {isConnected && (
            <div
              className={cn('absolute inset-0 h-2 w-2 animate-ping', config.dotColor, 'opacity-30')}
            />
          )}
        </div>

        <StatusIcon className={cn('h-3 w-3', config.textColor)} />
        <span className={cn('text-[10px] uppercase tracking-wider xs:text-xs', config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Event Count - Database style */}
      <div
        className={cn(
          'flex items-center gap-2 border-2 px-2 py-1',
          'border-neon-cyan/50 bg-neon-cyan/5'
        )}
      >
        <Database className="h-3 w-3 text-neon-cyan" />
        <span className="text-[10px] font-bold tabular-nums text-neon-cyan xs:text-xs">
          {String(eventCount).padStart(4, '0')}
        </span>
        <span className="hidden text-xs text-muted-foreground xs:inline">REC</span>
      </div>

      {/* Activity Indicator */}
      {isConnected && (
        <div
          className={cn(
            'hidden items-center gap-2 border-2 px-2 py-1 sm:flex',
            'border-neon-magenta/50 bg-neon-magenta/5'
          )}
        >
          <Activity className="h-3 w-3 animate-pulse-slow text-neon-magenta" />
          <span className="hidden text-xs uppercase tracking-wider text-neon-magenta md:inline">
            {config.description}
          </span>
        </div>
      )}
    </div>
  );
}

// Compact terminal-style status for headers
export function ConnectionStatusCompact({ isConnected }: { isConnected: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 border px-2 py-0.5 font-mono text-xs',
        isConnected
          ? 'border-neon-green/50 text-neon-green'
          : 'border-neon-orange/50 text-neon-orange'
      )}
    >
      <div
        className={cn(
          'h-1.5 w-1.5',
          isConnected ? 'animate-pulse-slow bg-neon-green' : 'bg-neon-orange'
        )}
      />
      <span className="uppercase tracking-wider">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
    </div>
  );
}
