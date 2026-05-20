'use client'

import { useState } from 'react'
import { MatchListClient }
  from '@/components/bettor/MatchListClient'
import { PlaceBetModal }
  from '@/components/bettor/PlaceBetModal'
import { JackpotClient }
  from '@/components/jackpot/JackpotClient'
import type {
  MatchWithLeague,
  CountryWithLeagues,
  League,
  PlatformSettings,
} from '@/types/database.types'
import { cn } from '@/lib/utils'

interface Props {
  initialMatches: MatchWithLeague[]
  countries: CountryWithLeagues[]
  topLeagues: League[]
  settings: PlatformSettings
  jackpot?: any
}

export function AgentPlaceBetClient({
  initialMatches,
  countries,
  topLeagues,
  settings,
  jackpot,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<'matches' | 'jackpot'>(
      'matches'
    )
  const [showPlaceBet, setShowPlaceBet] =
    useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Tab switcher */}
      <div className="flex gap-0 border-b border-nile-blue/30 bg-slate-dark flex-shrink-0">
        <button
          onClick={() =>
            setActiveTab('matches')
          }
          className={cn(
            'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'matches'
              ? 'border-gold text-gold'
              : 'border-transparent text-white/50 hover:text-white'
          )}
        >
          ⚽ Matches
        </button>
        <button
          onClick={() =>
            setActiveTab('jackpot')
          }
          className={cn(
            'flex-1 py-3 text-sm font-medium border-b-2 transition-colors relative',
            activeTab === 'jackpot'
              ? 'border-gold text-gold'
              : 'border-transparent text-white/50 hover:text-white'
          )}
        >
          🏆 Jackpot
          {jackpot?.status === 'open' && (
            <span className="absolute top-2 right-1/4 w-2 h-2 bg-nile-success rounded-full" />
          )}
        </button>
      </div>

      {activeTab === 'matches' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <MatchListClient
            initialMatches={initialMatches}
            countries={countries}
            topLeagues={topLeagues}
            settings={settings}
            basePath="/agent"
            onPlaceBet={() =>
              setShowPlaceBet(true)
            }
          />
          <PlaceBetModal
            isOpen={showPlaceBet}
            onClose={() =>
              setShowPlaceBet(false)
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <JackpotClient
            jackpot={jackpot}
            leaderboard={[]}
            pastJackpots={[]}
          />
        </div>
      )}
    </div>
  )
}