import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  ExternalLink,
  Clock,
  Globe,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  GitBranch,
  User,
} from 'lucide-react';
import { DashboardEvent } from '@/types/categories';

interface VercelEventDetailProps {
  event: DashboardEvent;
}

interface VercelMetadata {
  deployment_url?: string;
  project_name?: string;
  status?: 'READY' | 'BUILDING' | 'ERROR' | 'CANCELED' | 'QUEUED';
  environment?: 'production' | 'preview' | 'development';
  branch?: string;
  commit_sha?: string;
  author?: string;
  build_time?: number;
  created_at?: string;
  domain?: string;
  framework?: string;
  [key: string]: any;
}

export default function VercelEventDetail({ event }: VercelEventDetailProps) {
  const metadata = event.metadata as VercelMetadata;

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'building':
      case 'queued':
        return <Timer className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'canceled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Rocket className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'ready':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300';
      case 'building':
      case 'queued':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300';
      case 'canceled':
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
    }
  };

  const getEnvironmentColor = (env?: string) => {
    switch (env?.toLowerCase()) {
      case 'production':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'preview':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'development':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatBuildTime = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatCommitSha = (sha?: string) => {
    if (!sha) return null;
    return sha.substring(0, 7);
  };

  return (
    <div className="space-y-4">
      {/* Deployment Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon(metadata.status)}
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(metadata.status)} font-medium`}>
              {metadata.status || 'Unknown'}
            </Badge>
            {metadata.environment && (
              <Badge variant="outline" className={getEnvironmentColor(metadata.environment)}>
                {metadata.environment}
              </Badge>
            )}
          </div>
        </div>

        {metadata.deployment_url && (
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <a
              href={metadata.deployment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="text-xs">Visit</span>
            </a>
          </Button>
        )}
      </div>

      {/* Project Information */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metadata.project_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Project:</span>
              <span className="font-mono text-sm">{metadata.project_name}</span>
            </div>
          )}

          {metadata.domain && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Domain:</span>
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-sm">{metadata.domain}</span>
              </div>
            </div>
          )}

          {metadata.framework && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Framework:</span>
              <Badge variant="secondary" className="text-xs">
                {metadata.framework}
              </Badge>
            </div>
          )}

          {metadata.build_time && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Build Time:</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-sm">{formatBuildTime(metadata.build_time)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Git Information */}
      {(metadata.branch || metadata.commit_sha || metadata.author) && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <GitBranch className="h-4 w-4" />
            Git Details
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {metadata.branch && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Branch:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {metadata.branch.replace('refs/heads/', '')}
                </Badge>
              </div>
            )}

            {metadata.commit_sha && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Commit:</span>
                <code className="rounded bg-muted px-2 py-1 text-xs">
                  {formatCommitSha(metadata.commit_sha)}
                </code>
              </div>
            )}

            {metadata.author && (
              <div className="col-span-full flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Author:</span>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{metadata.author}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deployment URL Preview */}
      {metadata.deployment_url && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Globe className="h-4 w-4" />
            Deployment URL
          </h4>

          <div className="flex items-center justify-between rounded border bg-background p-3">
            <span className="mr-2 truncate font-mono text-sm text-muted-foreground">
              {metadata.deployment_url}
            </span>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <a
                href={metadata.deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Additional Metadata */}
      {Object.keys(metadata).some(
        (key) =>
          ![
            'deployment_url',
            'project_name',
            'status',
            'environment',
            'branch',
            'commit_sha',
            'author',
            'build_time',
            'created_at',
            'domain',
            'framework',
          ].includes(key)
      ) && (
        <div className="border-t pt-3">
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Additional Details</h4>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            {Object.entries(metadata)
              .filter(
                ([key]) =>
                  ![
                    'deployment_url',
                    'project_name',
                    'status',
                    'environment',
                    'branch',
                    'commit_sha',
                    'author',
                    'build_time',
                    'created_at',
                    'domain',
                    'framework',
                  ].includes(key)
              )
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="font-medium capitalize text-muted-foreground">
                    {key.replace('_', ' ')}:
                  </span>
                  <span className="max-w-32 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
