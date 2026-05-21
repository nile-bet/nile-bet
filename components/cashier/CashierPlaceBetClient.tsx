'use client'
import { Footer } from '@/components/shared/Footer'

import { useState } from 'react'
import { MatchListClient }
  from '@/components/bettor/MatchListClient'
import { PlaceBetModal }
  from '@/components/bettor/PlaceBetModal'
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
}

export function CashierPlaceBetClient({
  initialMatches,
  countries,
  topLeagues,
  settings,
}: Props) {
  const [showPlaceBet, setShowPlaceBet] =
    useState(false)

  return (
    <div className="flex flex-col">
      <div className="flex flex-col" style={{ height: "calc(100vh - 56px)", overflow: "hidden" }}>
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
        onClose={() =>
          setShowPlaceBet(false)
        }
      />
      <Footer />
    </div>
  )
}