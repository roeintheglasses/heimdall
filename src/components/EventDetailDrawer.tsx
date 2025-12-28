'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardEvent } from '@/types/categories';
import { useCategories } from '@/contexts/CategoryContext';
import { getServiceFromEventType } from '@/types/services';
import { ServiceIcon } from '@/components/ServiceIcon';
import { cn } from '@/lib/utils';
import { Terminal, Copy, Check, ExternalLink, FileJson, List, Info, Clock, X } from 'lucide-react';

// Service-specific event detail components
import GitHubEventDetail from '@/components/event-details/GitHubEventDetail';
import VercelEventDetail from '@/components/event-details/VercelEventDetail';
import RailwayEventDetail from '@/components/event-details/RailwayEventDetail';
import GenericEventDetail from '@/components/event-details/GenericEventDetail';

interface EventDetailDrawerProps {
  event: DashboardEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Category to neon color mapping
const CATEGORY_NEON_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  blue: { border: 'border-neon-cyan', bg: 'bg-neon-cyan/10', text: 'text-neon-cyan' },
  green: { border: 'border-neon-magenta', bg: 'bg-neon-magenta/10', text: 'text-neon-magenta' },
  purple: { border: 'border-neon-green', bg: 'bg-neon-green/10', text: 'text-neon-green' },
  red: { border: 'border-neon-orange', bg: 'bg-neon-orange/10', text: 'text-neon-orange' },
  orange: { border: 'border-neon-pink', bg: 'bg-neon-pink/10', text: 'text-neon-pink' },
};

function getNeonColors(categoryColor: string) {
  return CATEGORY_NEON_COLORS[categoryColor] || CATEGORY_NEON_COLORS.blue;
}

export default function EventDetailDrawer({ event, open, onOpenChange }: EventDetailDrawerProps) {
  const { getEventCategory } = useCategories();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!event) return null;

  const category = getEventCategory(event);
  const serviceInfo = getServiceFromEventType(event.event_type || 'unknown');
  const neonColors = getNeonColors(category.color);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'github.push':
        return 'PUSH';
      case 'github.pr':
        return 'PR';
      case 'github.issue':
        return 'ISSUE';
      case 'github.release':
        return 'RELEASE';
      case 'vercel.deploy':
        return 'DEPLOY';
      case 'railway.deploy':
        return 'DEPLOY';
      default:
        return (eventType?.split('.')[1] || 'EVENT').toUpperCase();
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderEventDetail = () => {
    const eventType = event.event_type || 'unknown';

    if (eventType.startsWith('github.')) {
      return <GitHubEventDetail event={event} />;
    }

    if (eventType.startsWith('vercel.')) {
      return <VercelEventDetail event={event} />;
    }

    if (eventType.startsWith('railway.')) {
      return <RailwayEventDetail event={event} />;
    }

    return <GenericEventDetail event={event} />;
  };

  // Get direct links based on event type
  const getDirectLinks = () => {
    const links: Array<{ label: string; url: string; icon: React.ReactNode }> = [];
    const metadata = event.metadata || {};

    // GitHub links
    if (event.event_type?.startsWith('github.')) {
      if (metadata.repository_url) {
        links.push({
          label: 'Repository',
          url: metadata.repository_url,
          icon: <ExternalLink className="h-3 w-3" />,
        });
      }
      if (metadata.commit_url) {
        links.push({
          label: 'Commit',
          url: metadata.commit_url,
          icon: <ExternalLink className="h-3 w-3" />,
        });
      }
      if (metadata.pr_url) {
        links.push({
          label: 'Pull Request',
          url: metadata.pr_url,
          icon: <ExternalLink className="h-3 w-3" />,
        });
      }
    }

    // Vercel links
    if (event.event_type?.startsWith('vercel.')) {
      if (metadata.deployment_url) {
        links.push({
          label: 'Deployment',
          url: metadata.deployment_url,
          icon: <ExternalLink className="h-3 w-3" />,
        });
      }
      if (metadata.url) {
        links.push({
          label: 'Preview',
          url: `https://${metadata.url}`,
          icon: <ExternalLink className="h-3 w-3" />,
        });
      }
    }

    // Railway links
    if (event.event_type?.startsWith('railway.')) {
      if (metadata.deployment_url) {
        links.push({
          label: 'Service',
          url: metadata.deployment_url,
          icon: <ExternalLink className="h-3 w-3" />,
        });
      }
      if (metadata.logs_url) {
        links.push({
          label: 'Logs',
          url: metadata.logs_url,
          icon: <ExternalLink className="h-3 w-3" />,
        });
      }
    }

    return links;
  };

  // Get copyable fields based on event type
  const getCopyableFields = () => {
    const fields: Array<{ label: string; value: string }> = [];
    const metadata = event.metadata || {};

    fields.push({ label: 'Event ID', value: event.id });

    if (metadata.commit_sha) {
      fields.push({ label: 'Commit SHA', value: metadata.commit_sha });
    }
    if (metadata.deployment_id) {
      fields.push({ label: 'Deployment ID', value: metadata.deployment_id });
    }
    if (metadata.project_id) {
      fields.push({ label: 'Project ID', value: metadata.project_id });
    }

    return fields;
  };

  const directLinks = getDirectLinks();
  const copyableFields = getCopyableFields();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 xs:w-[90vw] sm:max-w-lg"
        hideCloseButton
      >
        {/* Terminal-style header */}
        <SheetHeader className="flex-row items-center justify-between pr-4">
          <SheetTitle className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span className="uppercase tracking-wider">
              {serviceInfo.name}://{getEventTypeLabel(event.event_type || 'unknown')}
            </span>
          </SheetTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 w-7 p-0 text-neon-cyan hover:bg-neon-cyan/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        <SheetDescription className="sr-only">Detailed view of {event.title}</SheetDescription>

        {/* Event Header */}
        <div className="border-b border-neon-cyan/30 px-3 py-2 xs:px-4 xs:py-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center',
                'border-2',
                neonColors.border,
                neonColors.bg
              )}
            >
              <ServiceIcon service={serviceInfo} className={cn('h-5 w-5', neonColors.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-mono text-sm leading-tight text-foreground">
                <span className="mr-2 text-neon-magenta">&gt;</span>
                {event.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {serviceInfo.name.toUpperCase()}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', neonColors.text, neonColors.border)}
                >
                  {category.name.toUpperCase()}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(event.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3 border border-neon-cyan/30 bg-terminal-black xs:mx-4 xs:mt-4">
            <TabsTrigger
              value="overview"
              className="text-[10px] data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan xs:text-xs"
            >
              <Info className="h-3 w-3 xs:mr-1" />
              <span className="hidden xs:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="text-[10px] data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan xs:text-xs"
            >
              <List className="h-3 w-3 xs:mr-1" />
              <span className="hidden xs:inline">Details</span>
            </TabsTrigger>
            <TabsTrigger
              value="raw"
              className="text-[10px] data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan xs:text-xs"
            >
              <FileJson className="h-3 w-3 xs:mr-1" />
              <span className="hidden xs:inline">Raw</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="m-0 space-y-3 p-3 xs:space-y-4 xs:p-4">
              {/* Quick Actions */}
              {(directLinks.length > 0 || copyableFields.length > 0) && (
                <div className="space-y-3">
                  {/* Direct Links */}
                  {directLinks.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neon-cyan">
                        Quick Links
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {directLinks.map((link, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-7 border-neon-cyan/50 text-xs hover:bg-neon-cyan/10"
                          >
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              {link.icon}
                              {link.label}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copyable Fields */}
                  {copyableFields.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neon-cyan">
                        Copy Values
                      </h4>
                      <div className="space-y-1">
                        {copyableFields.map((field, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded border border-neon-cyan/20 bg-terminal-black p-2"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs text-muted-foreground">{field.label}</span>
                              <p className="truncate font-mono text-xs">{field.value}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(field.value, field.label)}
                              className="h-7 w-7 shrink-0 p-0"
                            >
                              {copiedField === field.label ? (
                                <Check className="h-3 w-3 text-neon-green" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Overview Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-neon-cyan/20 bg-terminal-black p-3">
                  <span className="block text-xs text-muted-foreground">Event Type</span>
                  <span className="font-mono text-sm text-neon-cyan">{event.event_type}</span>
                </div>
                <div className="rounded border border-neon-cyan/20 bg-terminal-black p-3">
                  <span className="block text-xs text-muted-foreground">Category</span>
                  <span className={cn('font-mono text-sm', neonColors.text)}>{category.name}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="m-0 p-4">
              <div className="font-mono text-sm">{renderEventDetail()}</div>
            </TabsContent>

            <TabsContent value="raw" className="m-0 p-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(event, null, 2), 'raw')}
                  className="absolute right-2 top-2 z-10 h-7 text-xs"
                >
                  {copiedField === 'raw' ? (
                    <>
                      <Check className="mr-1 h-3 w-3 text-neon-green" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
                <pre className="overflow-x-auto rounded border border-neon-cyan/20 bg-terminal-black p-4 font-mono text-xs text-muted-foreground">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-neon-cyan/30 px-4 py-2 text-xs text-muted-foreground">
          <Terminal className="h-3 w-3 text-neon-magenta" />
          <span>
            Press <kbd className="border border-neon-cyan/50 px-1 text-neon-cyan">ESC</kbd> to close
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
