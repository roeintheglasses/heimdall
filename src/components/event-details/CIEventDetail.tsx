import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XCircle, GitBranch, GitCommit, ExternalLink } from 'lucide-react';
import { DashboardEvent } from '@/types/categories';
import { safeUrl } from '@/lib/safeUrl';

interface CIEventDetailProps {
  event: DashboardEvent;
}

function text(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export default function CIEventDetail({ event }: CIEventDetailProps) {
  const m = event.metadata ?? {};
  const runUrl = safeUrl(m.run_url);
  const sha = text(m.commit_sha).substring(0, 7);
  const conclusion = text(m.conclusion).replace('_', ' ');
  const runNumber = typeof m.run_number === 'number' ? ` #${m.run_number}` : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm font-medium">
          {text(m.workflow) || 'Workflow'}
          {runNumber}
        </span>
        {conclusion && (
          <Badge variant="outline" className="font-mono text-xs uppercase">
            {conclusion}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{text(m.full_name) || text(m.repo)}</span>
        {text(m.branch) && (
          <Badge variant="outline" className="font-mono text-xs">
            <GitBranch className="mr-1 h-3 w-3" />
            {text(m.branch)}
          </Badge>
        )}
        {sha && (
          <span className="flex items-center gap-1 font-mono">
            <GitCommit className="h-3 w-3" />
            {sha}
          </span>
        )}
        {text(m.event) && <span>trigger: {text(m.event)}</span>}
      </div>

      {runUrl && (
        <Button variant="outline" size="sm" asChild>
          <a
            href={runUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View run
          </a>
        </Button>
      )}
    </div>
  );
}
