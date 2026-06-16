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
        forceNamed
      />
    </div>
  )
}
