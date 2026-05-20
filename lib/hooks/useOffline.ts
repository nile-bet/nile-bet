'use client'

import { useEffect } from 'react'
import { useOfflineStore }
  from '@/lib/stores/offlineStore'

export function useOffline() {
  const { isOffline, setOffline } = useOfflineStore()
  const isOnline = !isOffline
  const setOnline = (online: boolean) => setOffline(!online)
  const setWasOffline = (_v: boolean) => {}

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setWasOffline(true)
      setTimeout(
        () => setWasOffline(false),
        3000
      )
    }

    const handleOffline = () => {
      setOnline(false)
      setWasOffline(false)
    }

    // Set initial state
    setOnline(navigator.onLine)

    window.addEventListener(
      'online', handleOnline
    )
    window.addEventListener(
      'offline', handleOffline
    )

    return () => {
      window.removeEventListener(
        'online', handleOnline
      )
      window.removeEventListener(
        'offline', handleOffline
      )
    }
  }, [])

  return { isOnline }
}