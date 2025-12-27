// Neon color schemes for categories and services

export interface NeonColorScheme {
  border: string;
  bg: string;
  text: string;
  shadow?: string;
}

// Color name to neon styles mapping
export const NEON_COLORS: Record<string, NeonColorScheme> = {
  blue: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    shadow: 'shadow-[4px_4px_0_hsl(180_100%_50%)]',
  },
  green: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
    shadow: 'shadow-[4px_4px_0_hsl(300_100%_50%)]',
  },
  purple: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    shadow: 'shadow-[4px_4px_0_hsl(120_100%_50%)]',
  },
  red: {
    border: 'border-neon-orange',
    bg: 'bg-neon-orange/10',
    text: 'text-neon-orange',
    shadow: 'shadow-[4px_4px_0_hsl(30_100%_50%)]',
  },
  orange: {
    border: 'border-neon-pink',
    bg: 'bg-neon-pink/10',
    text: 'text-neon-pink',
    shadow: 'shadow-[4px_4px_0_hsl(330_100%_60%)]',
  },
  cyan: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    shadow: 'shadow-[4px_4px_0_hsl(180_100%_50%)]',
  },
  magenta: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
    shadow: 'shadow-[4px_4px_0_hsl(300_100%_50%)]',
  },
  pink: {
    border: 'border-neon-pink',
    bg: 'bg-neon-pink/10',
    text: 'text-neon-pink',
    shadow: 'shadow-[4px_4px_0_hsl(330_100%_60%)]',
  },
};

// Category ID to neon color mapping
export const CATEGORY_NEON_COLORS: Record<string, NeonColorScheme> = {
  development: NEON_COLORS.cyan,
  deployments: NEON_COLORS.magenta,
  infrastructure: NEON_COLORS.green,
  issues: NEON_COLORS.orange,
  security: NEON_COLORS.pink,
};

// Service ID to neon color mapping
export const SERVICE_NEON_COLORS: Record<string, NeonColorScheme> = {
  github: {
    border: 'border-slate-400',
    bg: 'bg-slate-400/10',
    text: 'text-slate-400',
    shadow: 'shadow-[4px_4px_0_hsl(215_14%_34%)]',
  },
  vercel: {
    border: 'border-emerald-400',
    bg: 'bg-emerald-400/10',
    text: 'text-emerald-400',
    shadow: 'shadow-[4px_4px_0_hsl(160_84%_39%)]',
  },
  railway: {
    border: 'border-violet-400',
    bg: 'bg-violet-400/10',
    text: 'text-violet-400',
    shadow: 'shadow-[4px_4px_0_hsl(270_76%_53%)]',
  },
  monitoring: {
    border: 'border-amber-400',
    bg: 'bg-amber-400/10',
    text: 'text-amber-400',
    shadow: 'shadow-[4px_4px_0_hsl(45_93%_47%)]',
  },
  security: {
    border: 'border-red-400',
    bg: 'bg-red-400/10',
    text: 'text-red-400',
    shadow: 'shadow-[4px_4px_0_hsl(0_84%_60%)]',
  },
};

// Get neon colors by color name with fallback
export function getNeonColorsByName(colorName: string): NeonColorScheme {
  return NEON_COLORS[colorName] || NEON_COLORS.cyan;
}

// Get neon colors by category ID with fallback
export function getCategoryNeonColors(categoryId: string): NeonColorScheme {
  return CATEGORY_NEON_COLORS[categoryId] || NEON_COLORS.cyan;
}

// Get neon colors by service ID with fallback
export function getServiceNeonColors(serviceId: string): NeonColorScheme {
  return SERVICE_NEON_COLORS[serviceId] || NEON_COLORS.cyan;
}

// Status color mapping for deployment/build statuses
export const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'text-neon-green',
  READY: 'text-neon-green',
  COMPLETED: 'text-neon-green',
  BUILDING: 'text-neon-cyan',
  PENDING: 'text-neon-cyan',
  QUEUED: 'text-neon-cyan',
  FAILED: 'text-neon-orange',
  ERROR: 'text-neon-orange',
  CANCELED: 'text-slate-400',
};

export function getStatusColor(status?: string): string {
  if (!status) return 'text-slate-400';
  const normalized = status.toUpperCase();
  return STATUS_COLORS[normalized] || 'text-slate-400';
}

// Environment color mapping
export const ENVIRONMENT_COLORS: Record<string, string> = {
  production: 'text-neon-magenta',
  staging: 'text-neon-cyan',
  preview: 'text-neon-green',
  development: 'text-slate-400',
};

export function getEnvironmentColor(environment?: string): string {
  if (!environment) return 'text-slate-400';
  const normalized = environment.toLowerCase();
  return ENVIRONMENT_COLORS[normalized] || 'text-slate-400';
}
