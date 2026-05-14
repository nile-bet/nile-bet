'use client'

import { useAuth }
  from '@/lib/hooks/useAuth'
import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import { BroadcastBanner }
  from '@/components/shared/BroadcastBanner'

function AuthInitializer() {
  useAuth()
  return null
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-charcoal">
      <AuthInitializer />
      <OfflineBanner />
      <BroadcastBanner />
      {children}
    </div>
  )
}