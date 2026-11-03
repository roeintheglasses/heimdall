'use client';

import { Activity, Wifi, WifiOff, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StreamState = 'connecting' | 'live' | 'backend-down' | 'disconnected';

interface ConnectionStatusProps {
  streamState: StreamState;
  eventCount: number;
  error?: string | null;
}

export default function ConnectionStatus({
  streamState,
  eventCount,
  error,
}: ConnectionStatusProps) {
  const isConnected = streamState === 'live' && !error;

  const getStatusConfig = () => {
    if (streamState === 'backend-down') {
      return {
        icon: WifiOff,
        label: 'BACKEND DOWN',
        borderColor: 'border-destructive',
        textColor: 'text-destructive',
        bgColor: 'bg-destructive/10',
        dotColor: 'bg-destructive',
        glowColor: 'shadow-[0_0_10px_hsl(0_100%_50%)]',
        description: 'BACKEND_UNREACHABLE',
      };
    }

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

    if (streamState === 'live') {
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
      label: streamState === 'connecting' ? 'CONNECTING' : 'OFFLINE',
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
        role="status"
        className={cn(
          'flex items-center gap-2 border-2 px-2 py-1',
          config.borderColor,
          config.bgColor,
          isConnected && config.glowColor
        )}
      >
        {/* LED Indicator */}
        <div className="relative" aria-hidden="true">
          <div
            className={cn(
              'h-2 w-2 transition-all duration-300',
              config.dotColor,
              isConnected && 'animate-pulse-slow'
            )}
          />
          {isConnected && (
            <div
              className={cn(
                'absolute inset-0 h-2 w-2 animate-ping motion-reduce:animate-none',
                config.dotColor,
                'opacity-30'
              )}
            />
          )}
        </div>

        <StatusIcon className={cn('h-3 w-3', config.textColor)} aria-hidden="true" />
        <span className="sr-only">Connection status: </span>
        <span className={cn('text-xs uppercase tracking-wider', config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Event Count - Database style */}
      <div
        className={cn(
          'hidden items-center gap-2 border-2 px-2 py-1 sm:flex',
          'border-neon-cyan/50 bg-neon-cyan/5'
        )}
      >
        <Database className="h-3 w-3 text-neon-cyan" aria-hidden="true" />
        <span className="text-xs font-bold tabular-nums text-neon-cyan">
          {String(eventCount).padStart(4, '0')}
        </span>
        <span className="hidden text-xs text-muted-foreground xs:inline">REC</span>
        <span className="sr-only">events loaded</span>
      </div>

      {/* Activity Indicator */}
      {isConnected && (
        <div
          className={cn(
            'hidden items-center gap-2 border-2 px-2 py-1 2xl:flex',
            'border-neon-magenta/50 bg-neon-magenta/5'
          )}
        >
          <Activity className="h-3 w-3 animate-pulse-slow text-neon-magenta" aria-hidden="true" />
          <span className="hidden text-xs uppercase tracking-wider text-neon-magenta 2xl:inline">
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
