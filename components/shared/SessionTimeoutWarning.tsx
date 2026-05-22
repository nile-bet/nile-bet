'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { createClient }
  from '@/lib/supabase/client'
import { Clock } from 'lucide-react'

const WARNING_BEFORE_MS = 2 * 60 * 1000 // 2 min warning
const CHECK_INTERVAL_MS = 30 * 1000     // Check every 30s

export function SessionTimeoutWarning() {
  const { user, logout } = useAuthStore()
  const [showWarning, setShowWarning] =
    useState(false)
  const [countdown, setCountdown] =
    useState(120)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivity = useRef(Date.now())

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivity.current = Date.now()
      if (showWarning) {
        setShowWarning(false)
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
        }
      }
    }

    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    events.forEach((e) =>
      window.addEventListener(
        e,
        updateActivity,
        { passive: true }
      )
    )

    return () => {
      events.forEach((e) =>
        window.removeEventListener(
          e,
          updateActivity
        )
      )
    }
  }, [showWarning])

  useEffect(() => {
    if (!user) return

    // Get session timeout from settings
    // Default 8 hours
    const sessionTimeoutMs =
      8 * 60 * 60 * 1000

    intervalRef.current = setInterval(
      () => {
        const idle =
          Date.now() - lastActivity.current
        const remaining =
          sessionTimeoutMs - idle

        if (
          remaining <= WARNING_BEFORE_MS &&
          remaining > 0 &&
          !showWarning
        ) {
          setShowWarning(true)
          setCountdown(
            Math.floor(remaining / 1000)
          )

          // Start countdown
          countdownRef.current = setInterval(
            () => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  handleLogout()
                  return 0
                }
                return prev - 1
              })
            },
            1000
          )
        }

        if (remaining <= 0) {
          handleLogout()
        }
      },
      CHECK_INTERVAL_MS
    )

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [user, showWarning])

  const handleContinue = async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    lastActivity.current = Date.now()

    // Refresh Supabase session
    const supabase = createClient()
    await supabase.auth.refreshSession()
    setShowWarning(false)
  }

  const handleLogout = async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setShowWarning(false)
    await logout()
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (!user || !showWarning) return null

  return (
    <Dialog
      open={showWarning}
      onOpenChange={() => {}}
    >
      <DialogContent className="bg-slate-dark border-nile-orange/40 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-nile-orange" />
            Session Expiring Soon
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <div className="w-20 h-20 rounded-full border-4 border-nile-orange/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-nile-orange font-mono text-xl font-bold">
              {formatCountdown(countdown)}
            </span>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            You'll be logged out due to
            inactivity. Click continue to
            stay logged in.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm hover:text-white"
          >
            Logout
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light"
          >
            Continue Session
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}