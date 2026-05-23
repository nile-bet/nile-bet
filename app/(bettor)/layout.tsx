'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth }
  from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/stores/authStore'
import { useRealtimeBettor }
  from '@/lib/hooks/useRealtimeBettor'
import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import { BroadcastBanner }
  from '@/components/shared/BroadcastBanner'

function BettorInitializer() {
  useAuth()
  useRealtimeBettor()
  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (!isLoading && user && user.role !== 'bettor') {
      router.replace('/login')
    }
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])
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