'use client'

import React, { useEffect } from 'react'
import { useBootSequence, BootPhase, BootCheck } from '@/hooks/useBootSequence'
import { useSoundEffects } from '@/contexts/SoundContext'
import { cn } from '@/lib/utils'
import { Shield, Check, Loader2 } from 'lucide-react'

interface BootSequenceProps {
  onComplete?: () => void
  skipOnRefresh?: boolean
  children: React.ReactNode
}

const HEIMDALL_BOOT_ASCII = `
 ██╗  ██╗███████╗██╗███╗   ███╗██████╗  █████╗ ██╗     ██╗
 ██║  ██║██╔════╝██║████╗ ████║██╔══██╗██╔══██╗██║     ██║
 ███████║█████╗  ██║██╔████╔██║██║  ██║███████║██║     ██║
 ██╔══██║██╔══╝  ██║██║╚██╔╝██║██║  ██║██╔══██║██║     ██║
 ██║  ██║███████╗██║██║ ╚═╝ ██║██████╔╝██║  ██║███████╗███████╗
 ╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
`.trim()

export function BootSequence({
  onComplete,
  skipOnRefresh = true,
  children
}: BootSequenceProps) {
  const {
    phase,
    progress,
    checks,
    showBoot,
    isComplete,
    skipBoot
  } = useBootSequence({ skipOnRefresh, onComplete })

  const { playClick, playSuccess } = useSoundEffects()

  // Play sounds during boot
  useEffect(() => {
    if (phase === 'init') {
      playClick()
    } else if (phase === 'complete') {
      playSuccess()
    }
  }, [phase, playClick, playSuccess])

  // Play click for each check completion
  useEffect(() => {
    const completedChecks = checks.filter(c => c.status === 'ok').length
    if (completedChecks > 0) {
      playClick()
    }
  }, [checks, playClick])

  if (isComplete) {
    return <>{children}</>
  }

  if (!showBoot) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-terminal-black flex items-center justify-center">
      <div className="w-full max-w-2xl px-4">
        {/* Boot screen content */}
        <div className="font-mono text-neon-cyan">
          {/* Init phase - blinking cursor */}
          {phase === 'idle' && (
            <div className="flex items-center">
              <span className="w-3 h-5 bg-neon-cyan animate-typing-cursor" />
            </div>
          )}

          {/* Title phase - ASCII art reveal */}
          {(phase === 'init' || phase === 'title' || phase === 'progress' || phase === 'checks' || phase === 'complete') && (
            <div className="space-y-4">
              {/* ASCII Logo */}
              <pre className={cn(
                "text-[6px] sm:text-xs leading-tight text-neon-cyan text-glow-cyan whitespace-pre overflow-hidden",
                phase === 'init' && "animate-text-reveal"
              )}>
                {HEIMDALL_BOOT_ASCII}
              </pre>

              {/* Version and System info */}
              <div className={cn(
                "text-sm text-muted-foreground",
                phase === 'init' ? "opacity-0" : "animate-boot-check"
              )}>
                <p><span className="text-neon-magenta">&gt;</span> HEIMDALL SYSTEM v2.0</p>
                <p><span className="text-neon-magenta">&gt;</span> Initializing dashboard...</p>
              </div>
            </div>
          )}

          {/* Progress bar phase */}
          {(phase === 'progress' || phase === 'checks' || phase === 'complete') && (
            <div className="mt-6 space-y-2 animate-boot-check">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-neon-green">LOADING:</span>
                <span className="tabular-nums">{progress}%</span>
              </div>

              {/* ASCII progress bar */}
              <div className="font-mono text-sm">
                <span className="text-muted-foreground">[</span>
                <span className="text-neon-cyan">
                  {'█'.repeat(Math.floor(progress / 5))}
                </span>
                <span className="text-muted-foreground/30">
                  {'░'.repeat(20 - Math.floor(progress / 5))}
                </span>
                <span className="text-muted-foreground">]</span>
              </div>
            </div>
          )}

          {/* System checks phase */}
          {(phase === 'checks' || phase === 'complete') && (
            <div className="mt-6 space-y-1">
              <p className="text-sm text-muted-foreground mb-2">
                <span className="text-neon-magenta">&gt;</span> Running system checks...
              </p>

              {checks.map((check, index) => (
                <BootCheckLine
                  key={check.id}
                  check={check}
                  delay={index * 100}
                />
              ))}
            </div>
          )}

          {/* Complete phase */}
          {phase === 'complete' && (
            <div className="mt-6 animate-boot-check">
              <div className="flex items-center gap-2 text-neon-green text-lg">
                <Shield className="h-5 w-5" />
                <span className="text-glow-green">BOOT COMPLETE</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <span className="text-neon-magenta">&gt;</span> Launching dashboard...
              </p>
            </div>
          )}

          {/* Skip button */}
          {phase !== 'complete' && phase !== 'done' && (
            <button
              onClick={skipBoot}
              className="mt-8 text-xs text-muted-foreground hover:text-neon-cyan transition-colors"
            >
              Press any key to skip...
            </button>
          )}
        </div>
      </div>

      {/* Scanline overlay for boot screen */}
      <div className="fixed inset-0 pointer-events-none z-[10000] scanlines opacity-50" />
    </div>
  )
}

function BootCheckLine({ check, delay }: { check: BootCheck; delay: number }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        check.status === 'pending' && "opacity-0",
        check.status !== 'pending' && "animate-boot-check"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Status indicator */}
      <span className="w-12 text-right">
        {check.status === 'pending' && (
          <span className="text-muted-foreground/50">[...]</span>
        )}
        {check.status === 'running' && (
          <span className="text-neon-yellow flex items-center justify-end gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
          </span>
        )}
        {check.status === 'ok' && (
          <span className="text-neon-green">[OK]</span>
        )}
        {check.status === 'error' && (
          <span className="text-neon-orange">[ERR]</span>
        )}
      </span>

      {/* Check label */}
      <span className={cn(
        check.status === 'ok' && "text-neon-green",
        check.status === 'error' && "text-neon-orange",
        check.status === 'running' && "text-neon-yellow",
        check.status === 'pending' && "text-muted-foreground"
      )}>
        {check.label}
      </span>

      {/* Check mark for completed */}
      {check.status === 'ok' && (
        <Check className="h-3 w-3 text-neon-green" />
      )}
    </div>
  )
}

