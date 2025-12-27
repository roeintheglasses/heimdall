'use client'

import React, { useEffect } from 'react'
import { SHORTCUT_DEFINITIONS } from '@/hooks/useKeyboardShortcuts'
import { cn } from '@/lib/utils'
import { X, Keyboard, Terminal } from 'lucide-react'

interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-terminal-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full max-w-lg",
            "bg-terminal-black border-2 border-neon-cyan",
            "shadow-retro",
            "font-mono animate-fade-glow-pulse glow-cyan"
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Terminal header */}
          <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neon-cyan bg-neon-cyan/10">
            <div className="flex items-center gap-2 text-neon-cyan">
              <Keyboard className="h-4 w-4" />
              <span className="text-sm font-bold">KEYBOARD_SHORTCUTS.TXT</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-neon-cyan hover:bg-neon-cyan/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Navigation section */}
            <ShortcutSection
              title="NAVIGATION"
              shortcuts={SHORTCUT_DEFINITIONS.navigation}
              color="cyan"
            />

            {/* Filtering section */}
            <ShortcutSection
              title="FILTERING"
              shortcuts={SHORTCUT_DEFINITIONS.filtering}
              color="magenta"
            />

            {/* General section */}
            <ShortcutSection
              title="GENERAL"
              shortcuts={SHORTCUT_DEFINITIONS.general}
              color="green"
            />

            {/* Go To section */}
            <ShortcutSection
              title="GO TO"
              shortcuts={SHORTCUT_DEFINITIONS.goTo}
              color="orange"
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-neon-cyan/30 text-xs text-muted-foreground flex items-center gap-2">
            <Terminal className="h-3 w-3 text-neon-magenta" />
            <span>Press <kbd className="px-1 border border-neon-cyan/50 text-neon-cyan">ESC</kbd> to close</span>
          </div>
        </div>
      </div>
    </>
  )
}

interface ShortcutSectionProps {
  title: string
  shortcuts: Array<{ key: string; description: string }>
  color: 'cyan' | 'magenta' | 'green' | 'orange' | 'pink'
}

const COLOR_MAP = {
  cyan: {
    title: 'text-neon-cyan',
    key: 'border-neon-cyan text-neon-cyan',
    line: 'border-neon-cyan/30'
  },
  magenta: {
    title: 'text-neon-magenta',
    key: 'border-neon-magenta text-neon-magenta',
    line: 'border-neon-magenta/30'
  },
  green: {
    title: 'text-neon-green',
    key: 'border-neon-green text-neon-green',
    line: 'border-neon-green/30'
  },
  orange: {
    title: 'text-neon-orange',
    key: 'border-neon-orange text-neon-orange',
    line: 'border-neon-orange/30'
  },
  pink: {
    title: 'text-neon-pink',
    key: 'border-neon-pink text-neon-pink',
    line: 'border-neon-pink/30'
  }
}

function ShortcutSection({ title, shortcuts, color }: ShortcutSectionProps) {
  const colors = COLOR_MAP[color]

  return (
    <div>
      <h3 className={cn("text-xs font-bold mb-2", colors.title)}>
        {title}
      </h3>
      <div className={cn("border-l-2 pl-3 space-y-2", colors.line)}>
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center gap-3">
            <kbd
              className={cn(
                "inline-flex items-center justify-center",
                "min-w-[2rem] px-2 py-0.5",
                "border text-xs",
                colors.key
              )}
            >
              {shortcut.key}
            </kbd>
            <span className="text-sm text-muted-foreground">
              {shortcut.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Compact keyboard hint for footer/status bar
export function KeyboardHint({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1 text-xs font-mono text-muted-foreground", className)}>
      <span>Press</span>
      <kbd className="px-1 border border-neon-cyan/50 text-neon-cyan">?</kbd>
      <span>for shortcuts</span>
    </div>
  )
}
