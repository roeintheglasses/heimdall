'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  RadarASCII,
  SatelliteASCII,
  SearchASCII,
  TerminalASCII,
  WebhookASCII,
  ErrorASCII,
} from '@/components/ASCIIIllustrations';
import { cn } from '@/lib/utils';
import { Terminal, RefreshCw, Filter, Zap } from 'lucide-react';

export type EmptyStateType =
  | 'first-visit'
  | 'no-events'
  | 'no-matches'
  | 'loading'
  | 'error'
  | 'disconnected';

interface EmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
  actionLabel?: string;
  message?: string;
  className?: string;
}

const EMPTY_STATE_CONFIG = {
  'first-visit': {
    Illustration: SatelliteASCII,
    title: 'WELCOME_TO_HEIMDALL',
    defaultMessage: 'Configure your webhooks to start monitoring',
    icon: Zap,
    actionLabel: 'SETUP_WEBHOOKS',
    color: 'cyan',
  },
  'no-events': {
    Illustration: RadarASCII,
    title: 'AWAITING_SIGNALS',
    defaultMessage: 'Listening for incoming webhook events...',
    icon: Terminal,
    actionLabel: 'SEND_TEST',
    color: 'cyan',
  },
  'no-matches': {
    Illustration: SearchASCII,
    title: 'NO_MATCHES_FOUND',
    defaultMessage: 'Try adjusting your filters or search query',
    icon: Filter,
    actionLabel: 'CLEAR_FILTERS',
    color: 'orange',
  },
  loading: {
    Illustration: TerminalASCII,
    title: 'INITIALIZING',
    defaultMessage: 'Connecting to event stream...',
    icon: RefreshCw,
    actionLabel: undefined,
    color: 'green',
  },
  error: {
    Illustration: ErrorASCII,
    title: 'CONNECTION_ERROR',
    defaultMessage: 'Failed to connect to the event stream',
    icon: RefreshCw,
    actionLabel: 'RETRY',
    color: 'orange',
  },
  disconnected: {
    Illustration: WebhookASCII,
    title: 'DISCONNECTED',
    defaultMessage: 'Lost connection to the server',
    icon: RefreshCw,
    actionLabel: 'RECONNECT',
    color: 'magenta',
  },
};

export default function EmptyState({
  type,
  onAction,
  actionLabel,
  message,
  className,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];
  const { Illustration, title, defaultMessage, icon: Icon, color } = config;

  const colorClasses = {
    cyan: {
      border: 'border-neon-cyan',
      text: 'text-neon-cyan',
      bg: 'bg-neon-cyan/10',
      button: 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10',
    },
    magenta: {
      border: 'border-neon-magenta',
      text: 'text-neon-magenta',
      bg: 'bg-neon-magenta/10',
      button: 'border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10',
    },
    green: {
      border: 'border-neon-green',
      text: 'text-neon-green',
      bg: 'bg-neon-green/10',
      button: 'border-neon-green text-neon-green hover:bg-neon-green/10',
    },
    orange: {
      border: 'border-neon-orange',
      text: 'text-neon-orange',
      bg: 'bg-neon-orange/10',
      button: 'border-neon-orange text-neon-orange hover:bg-neon-orange/10',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses];
  const finalActionLabel = actionLabel || config.actionLabel;

  return (
    <Card className={cn('border-2 bg-terminal-black', colors.border, className)}>
      {/* Terminal header */}
      <div className={cn('flex items-center gap-2 border-b-2 px-4 py-2', colors.border, colors.bg)}>
        <Terminal className={cn('h-4 w-4', colors.text)} />
        <span className={cn('font-mono text-xs', colors.text)}>STATUS::{title}</span>
      </div>

      <CardContent className="p-8">
        <div className="flex flex-col items-center space-y-6 text-center">
          {/* ASCII Illustration */}
          <div className={cn('border-2 p-4', colors.border, colors.bg)}>
            <Illustration />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className={cn('font-mono text-lg font-bold', colors.text)}>{title}</h3>
            <p className="max-w-md font-mono text-sm text-muted-foreground">
              <span className="mr-2 text-neon-magenta">&gt;</span>
              {message || defaultMessage}
            </p>
          </div>

          {/* Action Button */}
          {finalActionLabel && onAction && (
            <Button
              onClick={onAction}
              variant="outline"
              className={cn('border-2 font-mono', colors.button)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {finalActionLabel}
            </Button>
          )}

          {/* First Visit: Additional Help */}
          {type === 'first-visit' && (
            <div className="w-full max-w-md border-t border-neon-cyan/30 pt-4">
              <p className="mb-3 font-mono text-xs text-muted-foreground">QUICK_START:</p>
              <div className="space-y-2 text-left">
                <div className="flex items-start gap-2 font-mono text-xs">
                  <span className="text-neon-cyan">1.</span>
                  <span className="text-muted-foreground">
                    Add GitHub webhook:{' '}
                    <code className="text-neon-green">Settings &gt; Webhooks</code>
                  </span>
                </div>
                <div className="flex items-start gap-2 font-mono text-xs">
                  <span className="text-neon-cyan">2.</span>
                  <span className="text-muted-foreground">
                    Add Vercel integration via{' '}
                    <code className="text-neon-green">Project Settings</code>
                  </span>
                </div>
                <div className="flex items-start gap-2 font-mono text-xs">
                  <span className="text-neon-cyan">3.</span>
                  <span className="text-muted-foreground">
                    Add Railway webhook in <code className="text-neon-green">Project Settings</code>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
