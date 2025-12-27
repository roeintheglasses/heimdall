import { z } from 'zod';

// GitHub Push Event Metadata
export const GitHubPushMetadataSchema = z.object({
  repo: z.string(),
  message: z.string().optional(),
  author: z.string().optional(),
  branch: z.string().optional(),
  commits: z.number().optional(),
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

// Vercel Deploy Event Metadata
export const VercelDeployMetadataSchema = z.object({
  project: z.string(),
  status: z.string(),
  url: z.string().optional(),
  deployment_id: z.string().optional(),
  target: z.string().optional(),
  plan: z.string().optional(),
  regions: z.array(z.string()).optional(),
  event_type: z.string().optional(),
});
export type VercelDeployMetadata = z.infer<typeof VercelDeployMetadataSchema>;

// Railway Deploy Event Metadata
export const RailwayDeployMetadataSchema = z.object({
  project_name: z.string(),
  project_id: z.string().optional(),
  status: z.string(),
  environment: z.string().optional(),
  environment_id: z.string().optional(),
  deployment_id: z.string().optional(),
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
