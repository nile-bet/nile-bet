'use client'

import { useState } from 'react'
import { PublicNavbar } from '@/components/shared/PublicNavbar'
import { BetSlipSidebar } from './BetSlipSidebar'
import { MatchDetailClient } from './MatchDetailClient'
import { PlaceBetModal } from './PlaceBetModal'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useBetSlipStore } from '@/lib/stores/betSlipStore'
import type { MatchWithMarkets, PlatformSettings } from '@/types/database.types'

function MobileSlipButton({ onOpen }: { onOpen: () => void }) {
  const { selections, calculation } = useBetSlipStore()
  return (
    <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <button
        onClick={onOpen}
        className="pointer-events-auto flex items-center gap-2 bg-gold text-charcoal pl-4 pr-3 py-2.5 rounded-full shadow-2xl shadow-gold/40 font-bold text-sm hover:bg-gold-light transition-all active:scale-95 whitespace-nowrap"
      >
        🎟️ Slip
        {selections.length > 0 && (
          <span className="bg-charcoal/25 text-charcoal text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
            {selections.length}
          </span>
        )}
        {calculation.totalOdds > 0 && (
          <span className="text-charcoal/70 text-xs font-semibold">
            · {calculation.totalOdds.toFixed(2)}x
          </span>
        )}
      </button>
    </div>
  )
}

interface MatchPageClientProps {
  match: MatchWithMarkets
  settings: PlatformSettings
}

export function MatchPageClient({ match, settings }: MatchPageClientProps) {
  const [showPlaceBet, setShowPlaceBet] = useState(false)
  const [showMobileSlip, setShowMobileSlip] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PublicNavbar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MatchDetailClient match={match} />
        </div>
        {/* Desktop sidebar (hidden on mobile via BetSlipSidebar's own responsive classes) */}
        <BetSlipSidebar
          settings={settings}
          role="bettor"
          onPlaceBet={() => setShowPlaceBet(true)}
        />
      </div>

      <PlaceBetModal
        isOpen={showPlaceBet}
        onClose={() => setShowPlaceBet(false)}
      />

      {/* Mobile floating Slip button — same pattern as match list page */}
      <MobileSlipButton onOpen={() => setShowMobileSlip(true)} />

      {/* Mobile slip drawer — same pattern as match list page */}
      <Sheet open={showMobileSlip} onOpenChange={setShowMobileSlip}>
        <SheetContent side="right" className="w-full max-w-[320px] p-0 bg-[#1C2155] border-l border-gold/20">
          <BetSlipSidebar
            settings={settings}
            role="bettor"
            forceVisible
            onPlaceBet={() => { setShowMobileSlip(false); setShowPlaceBet(true) }}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
