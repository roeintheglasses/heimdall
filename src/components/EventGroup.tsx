'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventGroup as EventGroupType } from '@/lib/eventGrouping';
import { DashboardEvent } from '@/types/categories';
import { ServiceIcon } from '@/components/ServiceIcon';
import { getServiceFromEventType } from '@/types/services';
import { cn } from '@/lib/utils';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  GitCommit,
  Rocket,
  GitPullRequest,
  Clock,
  Eye,
} from 'lucide-react';

interface EventGroupProps {
  group: EventGroupType;
  onViewDetails?: (event: DashboardEvent) => void;
}

// Group type styling
const GROUP_TYPE_STYLES = {
  push_batch: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    icon: GitCommit,
    label: 'PUSH_BATCH',
  },
  deploy_lifecycle: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
    icon: Rocket,
    label: 'DEPLOY_LIFECYCLE',
  },
  pr_updates: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    icon: GitPullRequest,
    label: 'PR_UPDATES',
  },
  single: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    icon: Terminal,
    label: 'EVENT',
  },
};

export default function EventGroup({ group, onViewDetails }: EventGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const style = GROUP_TYPE_STYLES[group.type];
  const Icon = style.icon;
  const serviceInfo = getServiceFromEventType(group.events[0].event_type || 'unknown');

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const formatTimeRange = () => {
    if (group.events.length === 1) {
      return formatTimestamp(group.endTime);
    }
    return `${formatTimestamp(group.startTime)} - ${formatTimestamp(group.endTime)}`;
  };

  // For single events, render a simpler card
  if (group.type === 'single') {
    const event = group.events[0];
    return (
      <Card
        className={cn(
          'border-2 bg-terminal-black transition-all duration-200',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-retro',
          style.border
        )}
      >
        <div className={cn('flex items-center gap-2 border-b px-3 py-1.5', style.border, style.bg)}>
          <Terminal className={cn('h-3 w-3', style.text)} />
          <span className={cn('font-mono text-xs uppercase tracking-wider', style.text)}>
            {serviceInfo.name}://{group.title}
          </span>
          <div className="flex-1" />
          <span className="font-mono text-xs text-muted-foreground">
            [{formatTimestamp(group.endTime)}]
          </span>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-sm text-foreground">
              <span className="mr-2 text-neon-magenta">&gt;</span>
              {event.title}
            </h3>
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(event)}
                className={cn(
                  'h-6 px-2 text-xs',
                  'border border-neon-cyan/50 hover:bg-neon-cyan/10',
                  'text-neon-cyan'
                )}
              >
                <Eye className="mr-1 h-3 w-3" />
                VIEW
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-2 bg-terminal-black transition-all duration-200', style.border)}>
      {/* Group Header */}
      <div
        className={cn(
          'flex cursor-pointer items-center gap-2 border-b px-3 py-1.5',
          style.border,
          style.bg
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Icon className={cn('h-4 w-4', style.text)} />
        <span className={cn('font-mono text-xs uppercase tracking-wider', style.text)}>
          {style.label}
        </span>
        <Badge variant="outline" className={cn('font-mono text-xs', style.text, style.border)}>
          {group.events.length} EVENTS
        </Badge>
        <div className="flex-1" />
        <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatTimeRange()}
        </span>
        {isExpanded ? (
          <ChevronUp className={cn('h-4 w-4', style.text)} />
        ) : (
          <ChevronDown className={cn('h-4 w-4', style.text)} />
        )}
      </div>

      <CardContent className="p-4">
        {/* Group Summary */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center border-2',
                style.border,
                style.bg
              )}
            >
              <ServiceIcon service={serviceInfo} className={cn('h-5 w-5', style.text)} />
            </div>
            <div>
              <h3 className="font-mono text-sm leading-tight text-foreground">
                <span className="mr-2 text-neon-magenta">&gt;</span>
                {group.title}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                {group.metadata.repo && (
                  <Badge variant="secondary" className="text-xs">
                    {group.metadata.repo}
                  </Badge>
                )}
                {group.metadata.branch && (
                  <Badge variant="outline" className="text-xs">
                    {group.metadata.branch}
                  </Badge>
                )}
                {group.metadata.status && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      group.metadata.status === 'SUCCESS' && 'border-neon-green text-neon-green',
                      group.metadata.status === 'FAILED' && 'border-neon-orange text-neon-orange',
                      group.metadata.status === 'BUILDING' && 'border-neon-cyan text-neon-cyan'
                    )}
                  >
                    {group.metadata.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Timeline */}
        {isExpanded && (
          <div className={cn('mt-4 space-y-2 border-t pt-4', 'border-neon-cyan/30')}>
            <div className="mb-2 font-mono text-xs text-muted-foreground">EVENT_TIMELINE:</div>
            <div className="relative space-y-3 border-l-2 border-neon-cyan/30 pl-4">
              {group.events.map((event, index) => (
                <div key={event.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute -left-[21px] top-1 h-3 w-3 border-2',
                      style.border,
                      style.bg,
                      index === group.events.length - 1 && 'bg-neon-cyan'
                    )}
                  />

                  {/* Event content */}
                  <div className="flex items-start justify-between gap-2 rounded border border-neon-cyan/20 bg-terminal-black/50 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(new Date(event.created_at))}
                      </p>
                    </div>
                    {onViewDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(event);
                        }}
                        className="h-6 shrink-0 px-2 text-xs"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
