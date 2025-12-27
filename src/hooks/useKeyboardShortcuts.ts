'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface ShortcutHandlers {
  // Navigation
  onNextEvent?: () => void
  onPrevEvent?: () => void
  onExpandEvent?: () => void
  onClearSelection?: () => void

  // Filtering
  onFocusSearch?: () => void
  onFilterCategory?: (categoryIndex: number) => void
  onClearFilters?: () => void

  // General
  onToggleSound?: () => void
  onToggleTimeline?: () => void
  onShowHelp?: () => void

  // Custom
  onCustomShortcut?: (key: string) => void
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  handlers: ShortcutHandlers
  categoryCount?: number
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const {
    enabled = true,
    handlers,
    categoryCount = 5
  } = options

  const router = useRouter()
  const pendingKey = useRef<string | null>(null)
  const pendingTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return

    // Skip if typing in an input or textarea
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    const key = e.key.toLowerCase()

    // Handle multi-key sequences (like 'g h' for go home)
    if (pendingKey.current === 'g') {
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current)
        pendingTimeout.current = null
      }
      pendingKey.current = null

      if (key === 'h') {
        e.preventDefault()
        router.push('/')
        return
      }
      if (key === 'd') {
        e.preventDefault()
        router.push('/dashboard')
        return
      }
    }

    // Start multi-key sequence
    if (key === 'g') {
      pendingKey.current = 'g'
      pendingTimeout.current = setTimeout(() => {
        pendingKey.current = null
      }, 1000)
      return
    }

    // Single key shortcuts
    switch (key) {
      // Navigation
      case 'j':
        e.preventDefault()
        handlers.onNextEvent?.()
        break

      case 'k':
        e.preventDefault()
        handlers.onPrevEvent?.()
        break

      case 'enter':
        e.preventDefault()
        handlers.onExpandEvent?.()
        break

      case 'escape':
        e.preventDefault()
        handlers.onClearSelection?.()
        break

      // Filtering
      case 'f':
      case '/':
        e.preventDefault()
        handlers.onFocusSearch?.()
        break

      case '0':
        e.preventDefault()
        handlers.onClearFilters?.()
        break

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        const categoryIndex = parseInt(key) - 1
        if (categoryIndex < categoryCount) {
          e.preventDefault()
          handlers.onFilterCategory?.(categoryIndex)
        }
        break

      // General
      case 's':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handlers.onToggleSound?.()
        }
        break

      case 't':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handlers.onToggleTimeline?.()
        }
        break

      case '?':
        e.preventDefault()
        handlers.onShowHelp?.()
        break

      default:
        handlers.onCustomShortcut?.(key)
    }
  }, [enabled, handlers, router, categoryCount])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (pendingTimeout.current) {
        clearTimeout(pendingTimeout.current)
      }
    }
  }, [handleKeyDown])
}

// Shortcut definitions for display in help modal
export const SHORTCUT_DEFINITIONS = {
  navigation: [
    { key: 'j', description: 'Select next event' },
    { key: 'k', description: 'Select previous event' },
    { key: 'Enter', description: 'Expand selected event' },
    { key: 'Esc', description: 'Clear selection' },
  ],
  filtering: [
    { key: 'f, /', description: 'Focus search input' },
    { key: '1-5', description: 'Filter by category' },
    { key: '0', description: 'Clear all filters' },
  ],
  general: [
    { key: 's', description: 'Toggle sound' },
    { key: 't', description: 'Toggle timeline view' },
    { key: '?', description: 'Show this help' },
  ],
  goTo: [
    { key: 'g h', description: 'Go to home' },
    { key: 'g d', description: 'Go to dashboard' },
  ]
}
