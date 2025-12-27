'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ScanlineOverlayProps {
  className?: string
  intensity?: 'subtle' | 'medium' | 'heavy'
  enabled?: boolean
}

const intensityMap = {
  subtle: {
    opacity: '0.02',
    lineHeight: '4px',
  },
  medium: {
    opacity: '0.05',
    lineHeight: '3px',
  },
  heavy: {
    opacity: '0.08',
    lineHeight: '2px',
  },
}

export function ScanlineOverlay({
  className,
  intensity = 'subtle',
  enabled = true,
}: ScanlineOverlayProps) {
  const [isVisible, setIsVisible] = useState(enabled)

  useEffect(() => {
    setIsVisible(enabled)
  }, [enabled])

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      setIsVisible(false)
    }

    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsVisible(false)
      } else {
        setIsVisible(enabled)
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [enabled])

  if (!isVisible) return null

  const settings = intensityMap[intensity]

  return (
    <div
      className={cn(
        'fixed inset-0 pointer-events-none z-[9999]',
        className
      )}
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 255, 255, ${settings.opacity}) 2px,
          rgba(0, 255, 255, ${settings.opacity}) ${settings.lineHeight}
        )`,
      }}
      aria-hidden="true"
    />
  )
}

// CRT screen effect wrapper
interface CRTScreenProps {
  children: React.ReactNode
  className?: string
  scanlines?: boolean
  vignette?: boolean
  flicker?: boolean
}

export function CRTScreen({
  children,
  className,
  scanlines = true,
  vignette = true,
  flicker = true,
}: CRTScreenProps) {
  return (
    <div
      className={cn(
        'relative',
        vignette && 'crt-vignette',
        flicker && 'animate-flicker',
        className
      )}
    >
      {children}
      {scanlines && <ScanlineOverlay intensity="subtle" />}
    </div>
  )
}

// Neon glow wrapper component
interface NeonGlowProps {
  children: React.ReactNode
  className?: string
  color?: 'cyan' | 'magenta' | 'green' | 'pink' | 'orange'
  intensity?: 'low' | 'medium' | 'high'
  animate?: boolean
}

const glowColors = {
  cyan: 'shadow-glow-cyan',
  magenta: 'shadow-glow-magenta',
  green: 'shadow-glow-green',
  pink: 'shadow-[0_0_10px_hsl(330_100%_60%),_0_0_20px_hsl(330_100%_60%)]',
  orange: 'shadow-[0_0_10px_hsl(30_100%_50%),_0_0_20px_hsl(30_100%_50%)]',
}

export function NeonGlow({
  children,
  className,
  color = 'cyan',
  intensity = 'medium',
  animate = false,
}: NeonGlowProps) {
  return (
    <div
      className={cn(
        glowColors[color],
        animate && 'animate-glow-pulse',
        className
      )}
    >
      {children}
    </div>
  )
}

// Retro border wrapper
interface RetroBorderProps {
  children: React.ReactNode
  className?: string
  color?: 'cyan' | 'magenta' | 'green' | 'pink' | 'orange'
  shadow?: boolean
}

const borderColors = {
  cyan: 'border-neon-cyan',
  magenta: 'border-neon-magenta',
  green: 'border-neon-green',
  pink: 'border-neon-pink',
  orange: 'border-neon-orange',
}

const shadowColors = {
  cyan: 'shadow-retro',
  magenta: 'shadow-retro-magenta',
  green: 'shadow-retro-green',
  pink: 'shadow-retro-pink',
  orange: 'shadow-retro-orange',
}

export function RetroBorder({
  children,
  className,
  color = 'cyan',
  shadow = true,
}: RetroBorderProps) {
  return (
    <div
      className={cn(
        'border-2',
        borderColors[color],
        shadow && shadowColors[color],
        className
      )}
    >
      {children}
    </div>
  )
}
