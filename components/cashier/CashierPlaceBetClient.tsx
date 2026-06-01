'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Home, Globe, BarChart2 } from 'lucide-react'
import { MatchListClient } from '@/components/bettor/MatchListClient'
import { PlaceBetModal } from '@/components/bettor/PlaceBetModal'
import type {
  MatchWithLeague,
  CountryWithLeagues,
  League,
  PlatformSettings,
} from '@/types/database.types'

interface Props {
  initialMatches: MatchWithLeague[]
  countries: CountryWithLeagues[]
  topLeagues: League[]
  settings: PlatformSettings
  jackpot?: any
}

export function CashierPlaceBetClient({
  initialMatches,
  countries,
  topLeagues,
  settings,
  jackpot,
}: Props) {
  const [showPlaceBet, setShowPlaceBet] = useState(false)

  const handleSportsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('open-countries-panel'))
  }

  return (
    <div className="flex flex-col">
      {/* Centered bigger nav */}
      <div className="flex items-center justify-center gap-10 px-4 py-3 bg-slate-dark border-b border-gold/10">
        <Link
          href="/cashier-place-bet"
          className="flex items-center gap-2 text-base font-semibold text-white/70 hover:text-gold transition-colors"
        >
          <Home className="w-5 h-5" />
          Home
        </Link>
        <button
          onClick={handleSportsClick}
          className="flex items-center gap-2 text-base font-semibold text-white/70 hover:text-gold transition-colors"
        >
          <Globe className="w-5 h-5" />
          Sports
        </button>
        <Link
          href="/cashier-results"
          className="flex items-center gap-2 text-base font-semibold text-white/70 hover:text-gold transition-colors"
        >
          <BarChart2 className="w-5 h-5" />
          Results
        </Link>
      </div>

      <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <MatchListClient
          initialMatches={initialMatches}
          countries={countries}
          topLeagues={topLeagues}
          settings={settings}
          basePath="/cashier"
        />
      </div>

      <PlaceBetModal
        isOpen={showPlaceBet}
        onClose={() => setShowPlaceBet(false)}
      />
    </div>
  )
}
