import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import { BroadcastBanner }
  from '@/components/shared/BroadcastBanner'

export default function BettorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-charcoal">
      <OfflineBanner />
      <BroadcastBanner />
      {children}
    </div>
  )
}