'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { SoundToggle } from './SoundToggle';

interface CRTMonitorFrameProps {
  children: React.ReactNode;
  showPowerLed?: boolean;
  showBranding?: boolean;
  showVentilation?: boolean;
  isConnected?: boolean;
  className?: string;
}

export function CRTMonitorFrame({
  children,
  showPowerLed = true,
  showBranding = true,
  showVentilation = true,
  isConnected = true,
  className,
}: CRTMonitorFrameProps) {
  return (
    <div className={cn('min-h-screen', className)}>
      {/* Desktop/Tablet: Full CRT frame */}
      <div className="hidden min-h-screen flex-col p-4 md:flex lg:p-6">
        {/* Outer bezel */}
        <div className="crt-bezel flex flex-1 flex-col overflow-hidden rounded-lg">
          {/* Top bezel edge */}
          <div className="h-4 bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] lg:h-6" />

          {/* Main content area with side bezels */}
          <div className="flex flex-1">
            {/* Left bezel */}
            <div className="w-4 bg-gradient-to-r from-[#3a3a3a] to-[#2a2a2a] lg:w-6" />

            {/* Screen area */}
            <div className="crt-screen-glass flex flex-1 flex-col overflow-hidden">{children}</div>

            {/* Right bezel */}
            <div className="w-4 bg-gradient-to-l from-[#3a3a3a] to-[#2a2a2a] lg:w-6" />
          </div>

          {/* Bottom control panel */}
          <div className="flex h-14 items-center justify-between border-t border-[#444] bg-gradient-to-t from-[#2a2a2a] to-[#333] px-6 lg:h-16 lg:px-8">
            {/* Left side - Power LED */}
            <div className="flex items-center gap-3">
              {showPowerLed && (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full transition-colors duration-300',
                      isConnected
                        ? 'animate-pulse-slow bg-neon-green shadow-[0_0_8px_hsl(120_100%_50%)]'
                        : 'bg-neon-orange shadow-[0_0_8px_hsl(30_100%_50%)]'
                    )}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    PWR
                  </span>
                </div>
              )}
            </div>

            {/* Center - Branding */}
            {showBranding && (
              <div className="flex items-center gap-2">
                <span className="text-glow-cyan font-pixel text-xs tracking-wider text-neon-cyan lg:text-sm">
                  HEIMDALL
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">2000</span>
              </div>
            )}

            {/* Right side - Sound toggle styled as button */}
            <div className="flex items-center gap-2">
              <div className="crt-button">
                <SoundToggle />
              </div>
            </div>
          </div>

          {/* Ventilation grille */}
          {showVentilation && (
            <div className="flex h-6 items-center justify-center gap-2 overflow-hidden bg-[#1a1a1a]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-8 rounded-sm bg-[#111]"
                  style={{
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stand hint (optional visual) */}
        <div className="flex justify-center pt-2">
          <div className="font-mono text-[10px] text-muted-foreground/50">
            Press ? for keyboard shortcuts
          </div>
        </div>
      </div>

      {/* Mobile: No frame, just content */}
      <div className="min-h-screen md:hidden">{children}</div>
    </div>
  );
}

// Simplified frame for pages that don't need the full CRT effect
export function CRTScreenOnly({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('crt-screen-glass min-h-screen', className)}>{children}</div>;
}

// Power LED indicator component for use elsewhere
export function PowerLED({
  isConnected = true,
  size = 'sm',
  showLabel = true,
}: {
  isConnected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded-full transition-colors duration-300',
          sizeClasses[size],
          isConnected
            ? 'animate-pulse-slow bg-neon-green shadow-[0_0_8px_hsl(120_100%_50%)]'
            : 'bg-neon-orange shadow-[0_0_8px_hsl(30_100%_50%)]'
        )}
      />
      {showLabel && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </span>
      )}
    </div>
  );
}
