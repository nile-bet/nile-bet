'use client'

import { useAuth }
  from '@/lib/hooks/useAuth'
import { useRealtimeBettor }
  from '@/lib/hooks/useRealtimeBettor'
import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import { BroadcastBanner }
  from '@/components/shared/BroadcastBanner'

function BettorInitializer() {
  useAuth()
  useRealtimeBettor()
  return null
}

export default function BettorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-charcoal">
      <BettorInitializer />
      <OfflineBanner />
      <BroadcastBanner />
      {children}
    </div>
  )
}