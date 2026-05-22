'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent
  extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
  }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(
      null
    )
  const [showBanner, setShowBanner] =
    useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] =
    useState(false)

  useEffect(() => {
    // Check if already installed
    if (
      window.matchMedia(
        '(display-mode: standalone)'
      ).matches
    ) {
      setIsInstalled(true)
      return
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem(
      'pwa-dismissed'
    )
    if (dismissed) {
      const dismissedAt = parseInt(dismissed)
      const daysSince =
        (Date.now() - dismissedAt) /
        86400000
      if (daysSince < 7) return
    }

    // iOS detection
    const ua = navigator.userAgent
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as any).MSStream
    setIsIOS(isIOSDevice)

    if (isIOSDevice) {
      setShowBanner(true)
      return
    }

    // Chrome/Android install prompt
    const handler = (
      e: BeforeInstallPromptEvent
    ) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener(
      'beforeinstallprompt',
      handler as EventListener
    )

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handler as EventListener
      )
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } =
      await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setShowBanner(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem(
      'pwa-dismissed',
      Date.now().toString()
    )
    setShowBanner(false)
  }

  if (!showBanner || isInstalled) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50',
        'bg-slate-dark border border-gold/30',
        'rounded-2xl p-4 shadow-2xl',
        'animate-in slide-in-from-bottom-4'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gold/20 rounded-xl flex-shrink-0">
          <Download className="w-5 h-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            Install NILE Bet
          </p>
          {isIOS ? (
            <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
              Tap{' '}
              <span className="text-gold">
                Share
              </span>{' '}
              then{' '}
              <span className="text-gold">
                Add to Home Screen
              </span>{' '}
              for the best experience
            </p>
          ) : (
            <p className="text-white/50 text-xs mt-0.5">
              Add to your home screen for
              faster access
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/30 hover:text-white flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isIOS && deferredPrompt && (
        <button
          onClick={handleInstall}
          className="mt-3 w-full bg-gold text-charcoal py-2.5 rounded-xl text-sm font-semibold hover:bg-gold-light"
        >
          Install App
        </button>
      )}

      {isIOS && (
        <div className="mt-3 flex items-center justify-center gap-2 text-white/40 text-xs">
          <span>📤</span>
          <span>Share</span>
          <span>→</span>
          <span>➕</span>
          <span>Add to Home Screen</span>
        </div>
      )}
    </div>
  )
}