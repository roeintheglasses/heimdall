import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  GitBranch, 
  GitCommit, 
  ExternalLink, 
  User, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Hash
} from "lucide-react"
import { useState } from "react"
import { DashboardEvent } from '@/types/categories'

interface GitHubEventDetailProps {
  event: DashboardEvent
}

interface GitHubCommit {
  id: string
  message: string
  timestamp: string
  author: {
    name: string
    email: string
  }
  url?: string
}

interface GitHubMetadata {
  repo: string
  message: string
  author: string
  branch?: string
  commit_sha?: string
  commit_url?: string
  repository_url?: string
  commits?: GitHubCommit[]
  pusher?: {
    name: string
    email: string
  }
}

export default function GitHubEventDetail({ event }: GitHubEventDetailProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedSha, setCopiedSha] = useState<string | null>(null)
  
  const metadata = event.metadata as GitHubMetadata
  
  // Extract branch name from ref (e.g., "refs/heads/main" -> "main")
  const getBranchName = (branch?: string) => {
    if (!branch) return 'main'
    return branch.replace('refs/heads/', '')
  }

  const formatCommitSha = (sha: string) => {
    return sha.substring(0, 7)
  }

  const copyToClipboard = async (text: string, sha: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSha(sha)
      setTimeout(() => setCopiedSha(null), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const formatCommitMessage = (message: string) => {
    const lines = message.split('\n')
    const title = lines[0]
    const body = lines.slice(1).join('\n').trim()
    return { title, body }
  }

  const branchName = getBranchName(metadata.branch)
  const commits = metadata.commits || []
  const mainCommit: GitHubCommit = {
    id: metadata.commit_sha || 'unknown',
    message: metadata.message,
    author: { name: metadata.author, email: '' },
    timestamp: event.created_at,
    url: metadata.commit_url
  }

  // Use commits array if available, otherwise fall back to main commit data
  const displayCommits = commits.length > 0 ? commits : [mainCommit]

  return (
    <div className="space-y-4">
      {/* Repository and Branch Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm text-muted-foreground">
            {metadata.repo}
          </span>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline" className="font-mono text-xs">
            {branchName}
          </Badge>
        </div>
        
        {metadata.repository_url && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 px-2"
          >
            <a
              href={metadata.repository_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="text-xs">View Repo</span>
            </a>
          </Button>
        )}
      </div>

      {/* Commits Section */}
      <div className="space-y-3">
        {displayCommits.slice(0, isExpanded ? displayCommits.length : 1).map((commit, index) => {
          const { title, body } = formatCommitMessage(commit.message)
          const shortSha = formatCommitSha(commit.id)
          
          return (
            <div key={commit.id || index} className="border rounded-lg p-4 bg-muted/30">
              {/* Commit Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GitCommit className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm leading-tight break-words">
                      {title}
                    </p>
                    {body && (
                      <div className="mt-2 p-2 bg-background/50 rounded text-xs text-muted-foreground whitespace-pre-wrap border">
                        {body}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Commit SHA */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(commit.id, commit.id)}
                    className="h-6 px-2 font-mono text-xs hover:bg-muted"
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {shortSha}
                    {copiedSha === commit.id ? (
                      <span className="ml-1 text-green-600">✓</span>
                    ) : (
                      <Copy className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Commit Metadata */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{commit.author.name}</span>
                  {commit.author.email && (
                    <span className="font-mono">({commit.author.email})</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <time dateTime={commit.timestamp}>
                    {new Date(commit.timestamp).toLocaleString()}
                  </time>
                </div>

                {commit.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-5 px-1 text-xs"
                  >
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {/* Expand/Collapse Button */}
        {displayCommits.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full h-8 text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {displayCommits.length - 1} More Commit{displayCommits.length > 2 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Additional Metadata */}
      {(metadata.pusher || Object.keys(metadata).some(key => !['repo', 'message', 'author', 'branch', 'commit_sha', 'commit_url', 'repository_url', 'commits', 'pusher'].includes(key))) && (
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Additional Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {metadata.pusher && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Pushed by:</span>
                <span className="text-foreground">{metadata.pusher.name}</span>
              </div>
            )}
            
            {/* Show any additional metadata fields */}
            {Object.entries(metadata)
              .filter(([key]) => !['repo', 'message', 'author', 'branch', 'commit_sha', 'commit_url', 'repository_url', 'commits', 'pusher'].includes(key))
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