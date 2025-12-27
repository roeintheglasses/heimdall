import {
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield,
  FileText,
  LayoutGrid,
  Zap,
  Train,
  Activity,
  Globe,
  LucideIcon,
} from 'lucide-react';

// Category icon mapping
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  GitBranch,
  Rocket,
  Server,
  AlertCircle,
  Shield,
  FileText,
  LayoutGrid,
};

// Service icon mapping
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  GitBranch,
  Zap,
  Train,
  Activity,
  Shield,
  Globe,
};

// Get icon by name with fallback
export function getCategoryIcon(iconName: string): LucideIcon {
  return CATEGORY_ICONS[iconName] || FileText;
}

export function getServiceIcon(iconName: string): LucideIcon {
  return SERVICE_ICONS[iconName] || Globe;
}

// Map category ID to icon
export const CATEGORY_ID_ICONS: Record<string, LucideIcon> = {
  development: GitBranch,
  deployments: Rocket,
  infrastructure: Server,
  issues: AlertCircle,
  security: Shield,
};

// Map service ID to icon
export const SERVICE_ID_ICONS: Record<string, LucideIcon> = {
  github: GitBranch,
  vercel: Zap,
  railway: Train,
  monitoring: Activity,
  security: Shield,
};
