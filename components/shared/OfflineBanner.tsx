'use client'

import { useOfflineStore }
  from '@/lib/stores/offlineStore'
import { useOffline } from '@/lib/hooks/useOffline'
import { Wifi, WifiOff } from 'lucide-react'

export function OfflineBanner() {
  useOffline()

  const { isOnline, wasOffline } =
    useOfflineStore()

  if (isOnline && !wasOffline) return null

  if (!isOnline) {
    return (
      <div className="bg-gold text-charcoal text-sm font-medium text-center py-2 px-4 flex items-center justify-center gap-2 z-50">
        <WifiOff className="w-4 h-4" />
        <span>
          You are offline. Some features
          may not work.
        </span>
      </div>
    )
  }

  if (wasOffline) {
    return (
      <div className="bg-nile-success text-white text-sm font-medium text-center py-2 px-4 flex items-center justify-center gap-2">
        <Wifi className="w-4 h-4" />
        <span>Back online! Refreshing...</span>
      </div>
    )
  }

  return null
}