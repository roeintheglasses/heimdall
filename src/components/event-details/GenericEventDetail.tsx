import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { DashboardEvent } from '@/types/categories';

interface GenericEventDetailProps {
  event: DashboardEvent;
}

export default function GenericEventDetail({ event }: GenericEventDetailProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [showAllFields, setShowAllFields] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const metadata = event.metadata || {};
  const metadataEntries = Object.entries(metadata);
  const visibleEntries = showAllFields ? metadataEntries : metadataEntries.slice(0, 6);

  const toggleFieldExpansion = (key: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedFields(newExpanded);
  };

  const copyToClipboard = async (text: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value, null, 2);
  };

  const isLongValue = (value: any): boolean => {
    const formatted = formatValue(value);
    return formatted.length > 100 || formatted.includes('\n');
  };

  const truncateValue = (value: any, maxLength: number = 100): string => {
    const formatted = formatValue(value);
    if (formatted.length <= maxLength) return formatted;
    return formatted.substring(0, maxLength) + '...';
  };

  const formatFieldName = (key: string): string => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isUrl = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return value.startsWith('http://') || value.startsWith('https://');
    } catch {
      return false;
    }
  };

  const getValueBadgeVariant = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'default' : 'secondary';
    }
    if (typeof value === 'number') {
      return 'outline';
    }
    if (isUrl(value)) {
      return 'default';
    }
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Event Type Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="font-mono text-xs">
          {event.event_type || 'unknown'}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
        </div>
      </div>

      {/* Metadata Fields */}
      {metadataEntries.length > 0 ? (
        <div className="space-y-3">
          {visibleEntries.map(([key, value]) => {
            const isExpanded = expandedFields.has(key);
            const isLong = isLongValue(value);
            const formattedValue = formatValue(value);
            const displayValue = isExpanded ? formattedValue : truncateValue(value);

            return (
              <div key={key} className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatFieldName(key)}
                    </span>
                    <Badge variant={getValueBadgeVariant(value)} className="text-xs">
                      {typeof value}
                    </Badge>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formattedValue, key)}
                      className="h-6 px-2"
                    >
                      {copiedField === key ? (
                        <span className="text-xs text-green-600">✓</span>
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>

                    {isLong && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFieldExpansion(key)}
                        className="h-6 px-2"
                      >
                        {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Value Display */}
                <div className="space-y-2">
                  {isUrl(value) ? (
                    <div className="flex items-center justify-between rounded border bg-background p-2">
                      <span className="mr-2 truncate font-mono text-sm text-muted-foreground">
                        {displayValue}
                      </span>
                      <Button variant="outline" size="sm" asChild className="shrink-0">
                        <a
                          href={String(value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`rounded border p-2 ${
                        isExpanded && isLong
                          ? 'max-h-64 overflow-auto whitespace-pre-wrap bg-background font-mono text-xs'
                          : 'bg-background/50 text-sm'
                      }`}
                    >
                      {typeof value === 'boolean' ? (
                        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
                          {String(value)}
                        </Badge>
                      ) : (
                        <span className={isExpanded && isLong ? '' : 'break-words'}>
                          {displayValue}
                        </span>
                      )}
                    </div>
                  )}

                  {isLong && !isExpanded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFieldExpansion(key)}
                      className="h-6 w-full text-xs"
                    >
                      <ChevronDown className="mr-1 h-3 w-3" />
                      Show Full Value
                    </Button>
                  )}

                  {isLong && isExpanded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFieldExpansion(key)}
                      className="h-6 w-full text-xs"
                    >
                      <ChevronUp className="mr-1 h-3 w-3" />
                      Collapse
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Show More/Less Button */}
          {metadataEntries.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllFields(!showAllFields)}
              className="h-8 w-full text-xs"
            >
              {showAllFields ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Show {metadataEntries.length - 6} More Field
                  {metadataEntries.length > 7 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No additional metadata available for this event.</p>
        </div>
      )}
    </div>
  );
}
