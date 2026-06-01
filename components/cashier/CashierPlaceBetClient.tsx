'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Home, Globe, BarChart2 } from 'lucide-react'
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
  jackpot?: any
}
export function CashierPlaceBetClient({
  initialMatches,
  countries,
  topLeagues,
  settings,
  jackpot,
}: Props) {
  const [showPlaceBet, setShowPlaceBet] =
    useState(false)

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/cashier-place-bet', label: 'Sports', icon: Globe },
    { href: '/results', label: 'Results', icon: BarChart2 },
  ]

  return (
    <div className="flex flex-col">
      {/* Mini nav */}
      <div className="flex items-center gap-6 px-4 py-2 bg-slate-dark border-b border-gold/10">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-gold transition-colors"
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 56px)" }}>
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
    </div>
  )
}