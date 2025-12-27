'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PixelIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

// GitHub Octocat - 16x16 pixel grid
export function PixelGitHub({ size = 16, className, animated = false }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn('pixel-icon', animated && 'hover:animate-pulse-slow', className)}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Octocat silhouette */}
      <rect x="5" y="1" width="6" height="1" />
      <rect x="4" y="2" width="1" height="1" />
      <rect x="11" y="2" width="1" height="1" />
      <rect x="3" y="3" width="1" height="1" />
      <rect x="12" y="3" width="1" height="1" />
      <rect x="2" y="4" width="1" height="3" />
      <rect x="13" y="4" width="1" height="3" />
      <rect x="3" y="7" width="1" height="1" />
      <rect x="12" y="7" width="1" height="1" />
      <rect x="4" y="8" width="1" height="1" />
      <rect x="11" y="8" width="1" height="1" />
      <rect x="5" y="9" width="1" height="1" />
      <rect x="10" y="9" width="1" height="1" />
      <rect x="4" y="10" width="2" height="1" />
      <rect x="10" y="10" width="2" height="1" />
      <rect x="3" y="11" width="2" height="1" />
      <rect x="11" y="11" width="2" height="1" />
      <rect x="4" y="12" width="1" height="2" />
      <rect x="11" y="12" width="1" height="2" />
      <rect x="5" y="14" width="2" height="1" />
      <rect x="9" y="14" width="2" height="1" />
      {/* Eyes */}
      <rect x="5" y="5" width="2" height="2" />
      <rect x="9" y="5" width="2" height="2" />
      {/* Body fill */}
      <rect x="4" y="4" width="8" height="3" fillOpacity="0.3" />
    </svg>
  );
}

// Vercel Triangle - 16x16 pixel grid
export function PixelVercel({ size = 16, className, animated = false }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn('pixel-icon', animated && 'hover:animate-pulse-slow', className)}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Triangle pointing up */}
      <rect x="7" y="2" width="2" height="1" />
      <rect x="6" y="3" width="4" height="1" />
      <rect x="5" y="4" width="6" height="1" />
      <rect x="5" y="5" width="6" height="1" />
      <rect x="4" y="6" width="8" height="1" />
      <rect x="4" y="7" width="8" height="1" />
      <rect x="3" y="8" width="10" height="1" />
      <rect x="3" y="9" width="10" height="1" />
      <rect x="2" y="10" width="12" height="1" />
      <rect x="2" y="11" width="12" height="1" />
      <rect x="1" y="12" width="14" height="1" />
      <rect x="1" y="13" width="14" height="1" />
    </svg>
  );
}

// Railway Train - 16x16 pixel grid
export function PixelRailway({ size = 16, className, animated = false }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn('pixel-icon', animated && 'hover:animate-pulse-slow', className)}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Train front view */}
      {/* Top of train */}
      <rect x="5" y="1" width="6" height="1" />
      <rect x="4" y="2" width="8" height="1" />
      {/* Cabin */}
      <rect x="3" y="3" width="10" height="5" />
      {/* Windows (cut out) */}
      <rect x="4" y="4" width="2" height="2" fillOpacity="0" />
      <rect x="7" y="4" width="2" height="2" fillOpacity="0" />
      <rect x="10" y="4" width="2" height="2" fillOpacity="0" />
      {/* Window frames */}
      <rect x="4" y="4" width="2" height="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <rect x="7" y="4" width="2" height="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <rect x="10" y="4" width="2" height="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
      {/* Body */}
      <rect x="2" y="8" width="12" height="3" />
      {/* Undercarriage */}
      <rect x="3" y="11" width="10" height="1" />
      {/* Wheels */}
      <rect x="4" y="12" width="2" height="2" />
      <rect x="10" y="12" width="2" height="2" />
      {/* Wheel detail */}
      <rect x="5" y="13" width="1" height="1" fillOpacity="0.5" />
      <rect x="11" y="13" width="1" height="1" fillOpacity="0.5" />
      {/* Headlight */}
      <rect x="7" y="9" width="2" height="1" fillOpacity="0.7" />
    </svg>
  );
}

// Generic Activity/Monitor icon for other services
export function PixelMonitor({ size = 16, className, animated = false }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn('pixel-icon', animated && 'hover:animate-pulse-slow', className)}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Monitor frame */}
      <rect x="1" y="2" width="14" height="9" />
      {/* Screen (cut out) */}
      <rect x="2" y="3" width="12" height="7" fillOpacity="0.2" />
      {/* Stand */}
      <rect x="6" y="11" width="4" height="2" />
      <rect x="4" y="13" width="8" height="1" />
      {/* Screen content - blinking cursor */}
      <rect x="3" y="5" width="2" height="3" fillOpacity="0.8" />
      <rect x="6" y="5" width="4" height="1" fillOpacity="0.5" />
      <rect x="6" y="7" width="6" height="1" fillOpacity="0.5" />
    </svg>
  );
}

// Pixel icon wrapper component for service selection
interface ServicePixelIconProps extends PixelIconProps {
  service: 'github' | 'vercel' | 'railway' | 'unknown';
}

export function ServicePixelIcon({ service, ...props }: ServicePixelIconProps) {
  switch (service) {
    case 'github':
      return <PixelGitHub {...props} />;
    case 'vercel':
      return <PixelVercel {...props} />;
    case 'railway':
      return <PixelRailway {...props} />;
    default:
      return <PixelMonitor {...props} />;
  }
}

// Larger 32x32 versions for headers and prominent displays
export function PixelGitHubLarge({ size = 32, className, animated = false }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      className={cn(
        'pixel-icon',
        animated && 'hover:animate-pulse-slow hover:drop-shadow-[0_0_8px_currentColor]',
        className
      )}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Scaled 2x version of octocat */}
      <rect x="10" y="2" width="12" height="2" />
      <rect x="8" y="4" width="2" height="2" />
      <rect x="22" y="4" width="2" height="2" />
      <rect x="6" y="6" width="2" height="2" />
      <rect x="24" y="6" width="2" height="2" />
      <rect x="4" y="8" width="2" height="6" />
      <rect x="26" y="8" width="2" height="6" />
      <rect x="6" y="14" width="2" height="2" />
      <rect x="24" y="14" width="2" height="2" />
      <rect x="8" y="16" width="2" height="2" />
      <rect x="22" y="16" width="2" height="2" />
      <rect x="10" y="18" width="2" height="2" />
      <rect x="20" y="18" width="2" height="2" />
      <rect x="8" y="20" width="4" height="2" />
      <rect x="20" y="20" width="4" height="2" />
      <rect x="6" y="22" width="4" height="2" />
      <rect x="22" y="22" width="4" height="2" />
      <rect x="8" y="24" width="2" height="4" />
      <rect x="22" y="24" width="2" height="4" />
      <rect x="10" y="28" width="4" height="2" />
      <rect x="18" y="28" width="4" height="2" />
      {/* Eyes */}
      <rect x="10" y="10" width="4" height="4" />
      <rect x="18" y="10" width="4" height="4" />
      {/* Body fill */}
      <rect x="8" y="8" width="16" height="6" fillOpacity="0.3" />
    </svg>
  );
}

export function PixelVercelLarge({ size = 32, className, animated = false }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      className={cn(
        'pixel-icon',
        animated && 'hover:animate-pulse-slow hover:drop-shadow-[0_0_8px_currentColor]',
        className
      )}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Scaled 2x triangle */}
      <rect x="14" y="4" width="4" height="2" />
      <rect x="12" y="6" width="8" height="2" />
      <rect x="10" y="8" width="12" height="2" />
      <rect x="10" y="10" width="12" height="2" />
      <rect x="8" y="12" width="16" height="2" />
      <rect x="8" y="14" width="16" height="2" />
      <rect x="6" y="16" width="20" height="2" />
      <rect x="6" y="18" width="20" height="2" />
      <rect x="4" y="20" width="24" height="2" />
      <rect x="4" y="22" width="24" height="2" />
      <rect x="2" y="24" width="28" height="2" />
      <rect x="2" y="26" width="28" height="2" />
    </svg>
  );
}

export function PixelRailwayLarge({ size = 32, className, animated = false }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      className={cn(
        'pixel-icon',
        animated && 'hover:animate-pulse-slow hover:drop-shadow-[0_0_8px_currentColor]',
        className
      )}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Scaled 2x train */}
      <rect x="10" y="2" width="12" height="2" />
      <rect x="8" y="4" width="16" height="2" />
      <rect x="6" y="6" width="20" height="10" />
      {/* Windows */}
      <rect x="8" y="8" width="4" height="4" fillOpacity="0.2" />
      <rect x="14" y="8" width="4" height="4" fillOpacity="0.2" />
      <rect x="20" y="8" width="4" height="4" fillOpacity="0.2" />
      {/* Body */}
      <rect x="4" y="16" width="24" height="6" />
      <rect x="6" y="22" width="20" height="2" />
      {/* Wheels */}
      <rect x="8" y="24" width="4" height="4" />
      <rect x="20" y="24" width="4" height="4" />
      {/* Headlight */}
      <rect x="14" y="18" width="4" height="2" fillOpacity="0.7" />
    </svg>
  );
}
