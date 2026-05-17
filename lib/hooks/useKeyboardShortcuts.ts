'use client'

import { useEffect } from 'react'

interface ShortcutHandlers {
  onRedeemSlip?: () => void
  onNewBet?: () => void
  onCheckSlip?: () => void
  onDashboard?: () => void
  onShowHelp?: () => void
}

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Only allow Escape in these elements
        if (e.key === 'Escape') {
          ;(target as HTMLInputElement).blur()
        }
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault()
            handlers.onRedeemSlip?.()
            break
          case 'n':
            e.preventDefault()
            handlers.onNewBet?.()
            break
          case 'k':
            e.preventDefault()
            handlers.onCheckSlip?.()
            break
          case 'b':
            e.preventDefault()
            handlers.onDashboard?.()
            break
        }
        return
      }

      // ? key for help
      if (e.key === '?') {
        handlers.onShowHelp?.()
      }
    }

    document.addEventListener(
      'keydown',
      handler
    )
    return () => {
      document.removeEventListener(
        'keydown',
        handler
      )
    }
  }, [handlers])
}