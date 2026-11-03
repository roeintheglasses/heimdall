import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { DashboardEvent } from '@/types/categories';

interface PrivateEventDetailProps {
  event: DashboardEvent;
}

// Metadata keys the backend keeps for private events.
const SAFE_KEYS = ['status', 'action', 'commit_count', 'environment', 'merged'] as const;

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export default function PrivateEventDetail({ event }: PrivateEventDetailProps) {
  const metadata = (event.metadata ?? {}) as Record<string, unknown>;
  const rows = SAFE_KEYS.map((key) => [key, formatValue(metadata[key])] as const).filter(
    ([, value]) => value !== ''
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-neon-orange" />
        <Badge variant="outline" className="border-neon-orange text-xs text-neon-orange">
          PRIVATE
        </Badge>
        <span className="text-xs text-muted-foreground">
          Details are hidden for private events.
        </span>
      </div>
      {rows.length > 0 && (
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {rows.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="font-medium capitalize text-muted-foreground">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="max-w-32 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
