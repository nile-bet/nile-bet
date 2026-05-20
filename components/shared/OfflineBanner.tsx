'use client'

import { useEffect, useState } from 'react'
import { useOfflineStore }
  from '@/lib/stores/offlineStore'
import { placeBet }
  from '@/lib/actions/bets'
import { toast } from 'sonner'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineBanner() {
  const {
    isOffline,
    setOffline,
    pendingBets,
    removePendingBet,
    clearPendingBets,
  } = useOfflineStore()
  const [syncing, setSyncing] =
    useState(false)
  const [wasOffline, setWasOffline] =
    useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false)
      if (wasOffline) {
        toast.success(
          '✅ Back online!'
        )
        setWasOffline(false)
      }
    }
    const handleOffline = () => {
      setOffline(true)
      setWasOffline(true)
      toast.error(
        '📡 No connection — working offline'
      )
    }

    window.addEventListener(
      'online',
      handleOnline
    )
    window.addEventListener(
      'offline',
      handleOffline
    )

    // Initial state
    setOffline(!navigator.onLine)

    return () => {
      window.removeEventListener(
        'online',
        handleOnline
      )
      window.removeEventListener(
        'offline',
        handleOffline
      )
    }
  }, [wasOffline])

  const handleSync = async () => {
    if (syncing || isOffline) return
    setSyncing(true)

    let succeeded = 0
    let failed = 0

    for (const bet of pendingBets) {
      try {
        const result = await placeBet({
          selections: bet.selections,
          stake: bet.stake,
          bettorId: bet.bettorId,
          placedById: bet.placedById,
          isAnonymous: bet.isAnonymous,
        })
        if (result.success) {
          removePendingBet(bet.id)
          succeeded++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    if (succeeded > 0) {
      toast.success(
        `${succeeded} pending bet${succeeded !== 1 ? 's' : ''} synced!`
      )
    }
    if (failed > 0) {
      toast.error(
        `${failed} bet${failed !== 1 ? 's' : ''} failed to sync`
      )
    }

    setSyncing(false)
  }

  if (!isOffline && pendingBets.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-50 px-4 py-2 flex items-center justify-between text-sm',
        isOffline
          ? 'bg-nile-danger text-white'
          : 'bg-nile-orange text-charcoal'
      )}
    >
      <div className="flex items-center gap-2">
        {isOffline ? (
          <WifiOff className="w-4 h-4" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}
        <span className="font-medium">
          {isOffline
            ? 'Offline — Limited functionality'
            : `Back online — ${pendingBets.length} pending bet${pendingBets.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {!isOffline && pendingBets.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 bg-charcoal/20 hover:bg-charcoal/30 px-3 py-1 rounded-lg text-xs font-semibold"
          >
            <RefreshCw
              className={cn(
                'w-3 h-3',
                syncing && 'animate-spin'
              )}
            />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={() => {
              clearPendingBets()
              toast('Pending bets cleared')
            }}
            className="text-charcoal/70 hover:text-charcoal text-xs"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  )
}