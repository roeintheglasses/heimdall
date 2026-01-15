import { z } from 'zod';

// ============================================================================
// GitHub Metadata Types
// ============================================================================

// GitHub Commit structure (for push events with multiple commits)
export const GitHubCommitSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string(),
  }),
  url: z.string().url().optional(),
});
export type GitHubCommit = z.infer<typeof GitHubCommitSchema>;

// GitHub Push Event Metadata
export const GitHubPushMetadataSchema = z.object({
  repo: z.string(),
  message: z.string().optional(),
  author: z.string().optional(),
  branch: z.string().optional(),
  commits: z.union([z.number(), z.array(GitHubCommitSchema)]).optional(),
  commit_sha: z.string().optional(),
  commit_url: z.string().url().optional(),
  repository_url: z.string().url().optional(),
  pusher: z
    .object({
      name: z.string(),
      email: z.string(),
    })
    .optional(),
  url: z.string().url().optional(),
});
export type GitHubPushMetadata = z.infer<typeof GitHubPushMetadataSchema>;

// GitHub PR Event Metadata
export const GitHubPRMetadataSchema = z.object({
  repo: z.string(),
  action: z.string(),
  author: z.string().optional(),
  state: z.string().optional(),
  pr_url: z.string().url().optional(),
  number: z.number().optional(),
  merged: z.boolean().optional(),
});
export type GitHubPRMetadata = z.infer<typeof GitHubPRMetadataSchema>;

// GitHub Issue Event Metadata
export const GitHubIssueMetadataSchema = z.object({
  repo: z.string(),
  action: z.string(),
  author: z.string().optional(),
  state: z.string().optional(),
  issue_url: z.string().url().optional(),
  number: z.number().optional(),
});
export type GitHubIssueMetadata = z.infer<typeof GitHubIssueMetadataSchema>;

// GitHub Release Event Metadata
export const GitHubReleaseMetadataSchema = z.object({
  repo: z.string(),
  action: z.string(),
  tag: z.string().optional(),
  author: z.string().optional(),
  release_url: z.string().url().optional(),
  draft: z.boolean().optional(),
});
export type GitHubReleaseMetadata = z.infer<typeof GitHubReleaseMetadataSchema>;

// ============================================================================
// Vercel Metadata Types
// ============================================================================

export const VercelDeploymentStatusSchema = z.enum([
  'READY',
  'BUILDING',
  'ERROR',
  'CANCELED',
  'QUEUED',
]);
export type VercelDeploymentStatus = z.infer<typeof VercelDeploymentStatusSchema>;

export const VercelEnvironmentSchema = z.enum(['production', 'preview', 'development']);
export type VercelEnvironment = z.infer<typeof VercelEnvironmentSchema>;

// Vercel Deploy Event Metadata
export const VercelDeployMetadataSchema = z.object({
  project: z.string().optional(),
  project_name: z.string().optional(),
  status: z.string().optional(),
  url: z.string().optional(),
  deployment_url: z.string().optional(),
  deployment_id: z.string().optional(),
  environment: z.string().optional(),
  target: z.string().optional(),
  branch: z.string().optional(),
  commit_sha: z.string().optional(),
  author: z.string().optional(),
  build_time: z.number().optional(),
  created_at: z.string().optional(),
  domain: z.string().optional(),
  framework: z.string().optional(),
  plan: z.string().optional(),
  regions: z.array(z.string()).optional(),
  event_type: z.string().optional(),
});
export type VercelDeployMetadata = z.infer<typeof VercelDeployMetadataSchema>;

// ============================================================================
// Railway Metadata Types
// ============================================================================

export const RailwayDeploymentStatusSchema = z.enum([
  'SUCCESS',
  'BUILDING',
  'FAILED',
  'CRASHED',
  'DEPLOYING',
]);
export type RailwayDeploymentStatus = z.infer<typeof RailwayDeploymentStatusSchema>;

export const RailwayEnvironmentSchema = z.enum(['production', 'staging', 'development']);
export type RailwayEnvironment = z.infer<typeof RailwayEnvironmentSchema>;

// Railway Deploy Event Metadata
export const RailwayDeployMetadataSchema = z.object({
  project_name: z.string().optional(),
  project_id: z.string().optional(),
  service_name: z.string().optional(),
  service_id: z.string().optional(),
  status: z.string().optional(),
  environment: z.string().optional(),
  environment_id: z.string().optional(),
  deployment_id: z.string().optional(),
  deployment_url: z.string().optional(),
  logs_url: z.string().optional(),
  branch: z.string().optional(),
  commit_sha: z.string().optional(),
  author: z.string().optional(),
  build_time: z.number().optional(),
  memory_limit: z.number().optional(),
  cpu_limit: z.number().optional(),
  creator_name: z.string().optional(),
  creator_id: z.string().optional(),
  event_type: z.string().optional(),
  timestamp: z.string().optional(),
});
export type RailwayDeployMetadata = z.infer<typeof RailwayDeployMetadataSchema>;

// Union of all metadata schemas
export const EventMetadataSchema = z.union([
  GitHubPushMetadataSchema,
  GitHubPRMetadataSchema,
  GitHubIssueMetadataSchema,
  GitHubReleaseMetadataSchema,
  VercelDeployMetadataSchema,
  RailwayDeployMetadataSchema,
]);

// Type guards for metadata
export function isGitHubPushMetadata(metadata: unknown): metadata is GitHubPushMetadata {
  return GitHubPushMetadataSchema.safeParse(metadata).success;
}

export function isGitHubPRMetadata(metadata: unknown): metadata is GitHubPRMetadata {
  return GitHubPRMetadataSchema.safeParse(metadata).success;
}

export function isGitHubIssueMetadata(metadata: unknown): metadata is GitHubIssueMetadata {
  return GitHubIssueMetadataSchema.safeParse(metadata).success;
}

export function isGitHubReleaseMetadata(metadata: unknown): metadata is GitHubReleaseMetadata {
  return GitHubReleaseMetadataSchema.safeParse(metadata).success;
}

export function isVercelDeployMetadata(metadata: unknown): metadata is VercelDeployMetadata {
  return VercelDeployMetadataSchema.safeParse(metadata).success;
}

export function isRailwayDeployMetadata(metadata: unknown): metadata is RailwayDeployMetadata {
  return RailwayDeployMetadataSchema.safeParse(metadata).success;
}

// Parse metadata safely with fallback
export function parseMetadata<T>(schema: z.ZodSchema<T>, data: unknown, fallback: T): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : fallback;
}

// Validate and return typed metadata or null
export function validateMetadata<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

// ============================================================================
// Union Types & Helpers
// ============================================================================

// Union type for all event metadata - use this instead of Record<string, any>
export type EventMetadata =
  | GitHubPushMetadata
  | GitHubPRMetadata
  | GitHubIssueMetadata
  | GitHubReleaseMetadata
  | VercelDeployMetadata
  | RailwayDeployMetadata;

// Generic metadata type for when the event type is unknown
// Using 'any' for backward compatibility with existing metadata access patterns
export type GenericMetadata = Record<string, any>; // eslint-disable-line

// Helper to get typed metadata based on event type prefix
export function getMetadataForEventType(
  eventType: string,
  metadata: GenericMetadata
): EventMetadata | GenericMetadata {
  if (eventType.startsWith('github.push')) {
    return metadata as GitHubPushMetadata;
  }
  if (eventType.startsWith('github.pr')) {
    return metadata as GitHubPRMetadata;
  }
  if (eventType.startsWith('github.issue')) {
    return metadata as GitHubIssueMetadata;
  }
  if (eventType.startsWith('github.release')) {
    return metadata as GitHubReleaseMetadata;
  }
  if (eventType.startsWith('vercel.')) {
    return metadata as VercelDeployMetadata;
  }
  if (eventType.startsWith('railway.')) {
    return metadata as RailwayDeployMetadata;
  }
  return metadata;
}
