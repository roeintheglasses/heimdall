import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Train, 
  ExternalLink, 
  Clock, 
  Server,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  GitBranch,
  User,
  Package,
  Zap
} from "lucide-react"
import { DashboardEvent } from '@/types/categories'

interface RailwayEventDetailProps {
  event: DashboardEvent
}

interface RailwayMetadata {
  service_name?: string
  deployment_url?: string
  status?: 'SUCCESS' | 'BUILDING' | 'FAILED' | 'CRASHED' | 'DEPLOYING'
  environment?: 'production' | 'staging' | 'development'
  project_name?: string
  branch?: string
  commit_sha?: string
  author?: string
  build_time?: number
  service_id?: string
  deployment_id?: string
  logs_url?: string
  memory_limit?: number
  cpu_limit?: number
  [key: string]: any
}

export default function RailwayEventDetail({ event }: RailwayEventDetailProps) {
  const metadata = event.metadata as RailwayMetadata
  
  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'building':
      case 'deploying':
        return <Timer className="h-4 w-4 text-yellow-500" />
      case 'failed':
      case 'crashed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Train className="h-4 w-4 text-purple-500" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300'
      case 'building':
      case 'deploying':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300'
      case 'failed':
      case 'crashed':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
    }
  }

  const getEnvironmentColor = (env?: string) => {
    switch (env?.toLowerCase()) {
      case 'production':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'staging':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'development':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const formatBuildTime = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatCommitSha = (sha?: string) => {
    if (!sha) return null
    return sha.substring(0, 7)
  }

  const formatMemory = (mb?: number) => {
    if (!mb) return null
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`
    }
    return `${mb} MB`
  }

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

        <div className="flex items-center gap-2">
          {metadata.logs_url && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2"
            >
              <a
                href={metadata.logs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <Package className="h-3 w-3" />
                <span className="text-xs">Logs</span>
              </a>
            </Button>
          )}
          
          {metadata.deployment_url && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2"
            >
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
      </div>

      {/* Project and Service Information */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metadata.project_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Project:</span>
              <span className="text-sm font-mono">{metadata.project_name}</span>
            </div>
          )}

          {metadata.service_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Service:</span>
              <div className="flex items-center gap-1">
                <Server className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-mono">{metadata.service_name}</span>
              </div>
            </div>
          )}

          {metadata.build_time && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Build Time:</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-mono">{formatBuildTime(metadata.build_time)}</span>
              </div>
            </div>
          )}

          {(metadata.deployment_id || metadata.service_id) && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">ID:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {formatCommitSha(metadata.deployment_id || metadata.service_id)}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Resource Configuration */}
      {(metadata.memory_limit || metadata.cpu_limit) && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Resource Limits
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metadata.memory_limit && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Memory:</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {formatMemory(metadata.memory_limit)}
                </Badge>
              </div>
            )}

            {metadata.cpu_limit && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">CPU:</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {metadata.cpu_limit} vCPU
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Git Information */}
      {(metadata.branch || metadata.commit_sha || metadata.author) && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Git Details
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {formatCommitSha(metadata.commit_sha)}
                </code>
              </div>
            )}

            {metadata.author && (
              <div className="flex items-center justify-between col-span-full">
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

      {/* Deployment URL */}
      {metadata.deployment_url && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Service URL
          </h4>
          
          <div className="flex items-center justify-between p-3 bg-background rounded border">
            <span className="text-sm font-mono text-muted-foreground truncate mr-2">
              {metadata.deployment_url}
            </span>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="shrink-0"
            >
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
      {Object.keys(metadata).some(key => !['service_name', 'deployment_url', 'status', 'environment', 'project_name', 'branch', 'commit_sha', 'author', 'build_time', 'service_id', 'deployment_id', 'logs_url', 'memory_limit', 'cpu_limit'].includes(key)) && (
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Additional Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(metadata)
              .filter(([key]) => !['service_name', 'deployment_url', 'status', 'environment', 'project_name', 'branch', 'commit_sha', 'author', 'build_time', 'service_id', 'deployment_id', 'logs_url', 'memory_limit', 'cpu_limit'].includes(key))
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground capitalize">
                    {key.replace('_', ' ')}:
                  </span>
                  <span className="text-foreground font-mono text-xs bg-muted px-2 py-1 rounded truncate max-w-32">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}