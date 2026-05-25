'use client'

import { useState, useEffect,
  useCallback } from 'react'
import { createClient }
  from '@/lib/supabase/client'
import { toast } from 'sonner'
import { FilterBar } from '@/components/shared/FilterBar'
import type { FilterType } from '@/components/shared/FilterBar'
import { LeagueSidebar }
  from '@/components/shared/LeagueSidebar'
import { BetSlipSidebar }
  from './BetSlipSidebar'
import { PlaceBetModal }
  from './PlaceBetModal'
import { MatchRow } from './MatchRow'
import { EmptyState }
  from '@/components/shared/EmptyState'
import { SkeletonMatchRow }
  from '@/components/shared/SkeletonCard'
import {
  getUpcomingMatches,
} from '@/lib/actions/matches'
import { formatKickOff }
  from '@/lib/utils/formatCurrency'
import { Swords } from 'lucide-react'
import { FlagImage } from '@/components/shared/FlagImage'
import type {
  MatchWithLeague,
  CountryWithLeagues,
  League,
  PlatformSettings,
  MatchWithMarkets,
} from '@/types/database.types'

interface MatchListClientProps {
  initialMatches: MatchWithLeague[]
  countries: CountryWithLeagues[]
  topLeagues: League[]
  settings: PlatformSettings
  basePath?: string
  onPlaceBet?: () => void
}

export function MatchListClient({
  initialMatches,
  countries,
  topLeagues,
  settings,
  basePath = '',
}: MatchListClientProps) {
  const [matches, setMatches] =
    useState<MatchWithLeague[]>(initialMatches)
  const [isLoading, setIsLoading] =
    useState(false)
  const [selectedLeagueId, setSelectedLeagueId] =
    useState<string | 'top'>('top')
  const [activeFilter, setActiveFilter] =
    useState<FilterType | null>(null)
  const [showPlaceBet, setShowPlaceBet] =
    useState(false)
  const supabase = createClient()

  const loadMatches = useCallback(
    async (
      leagueId: string | 'top',
      filter: FilterType | null
    ) => {
      setIsLoading(true)
      try {
        const data = await getUpcomingMatches({
          isTopLeagues: leagueId === 'top',
          leagueIds:
            leagueId !== 'top'
              ? [leagueId]
              : undefined,
          filter: filter ?? undefined,
        })
        setMatches(data)
      } catch {
        toast.error('Failed to load matches')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const handleLeagueSelect = (
    id: string | 'top'
  ) => {
    setSelectedLeagueId(id)
    loadMatches(id, activeFilter)
  }

  const handleFilterChange = (
    f: FilterType | null
  ) => {
    setActiveFilter(f)
    loadMatches(selectedLeagueId, f)
  }

  // Realtime: match closes
  useEffect(() => {
    const channel = supabase
      .channel('public-matches')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          const updated = payload.new as any
          if (
            updated.status === 'closed' ||
            updated.status === 'finished'
          ) {
            setMatches((prev) =>
              prev.filter(
                (m) => m.id !== updated.id
              )
            )
            toast.warning(
              'A match has closed for betting'
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Group by league
  const grouped = matches.reduce(
    (acc, m) => {
      const key = `${(m as any).league_name}-${(m as any).flag_emoji}`
      if (!acc[key]) acc[key] = []
      acc[key].push(m)
      return acc
    },
    {} as Record<string, MatchWithLeague[]>
  )

  const featured = matches.filter(
    (m) => m.is_featured
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <FilterBar
        onFilterChange={handleFilterChange}
        matchCount={matches.length}
      />

      <div className="flex flex-1 min-h-0 gap-2 px-2 pb-2">
        {/* League Sidebar */}
        <div className="hidden md:flex flex-col flex-shrink-0 rounded-xl overflow-hidden border border-nile-blue/20" style={{ height: "calc(100vh - 100px)", overflowY: "auto" }}>
          <LeagueSidebar
            countries={countries}
            topLeagues={topLeagues}
            selectedLeagueId={selectedLeagueId}
            onLeagueSelect={handleLeagueSelect}
            className="flex flex-col"
          />
        </div>

        {/* Match List */}
        <div className="flex-1 overflow-y-auto overscroll-auto rounded-xl border border-nile-blue/20" style={{ height: "calc(100vh - 100px)" }}>
          {/* Column headers */}
          <div className="sticky top-0 z-10 bg-slate-dark border-b border-gold/10 hidden md:flex items-stretch">
            <div className="flex-1">
              {/* Top group labels */}
              <div className="grid text-[13px] text-white font-extrabold uppercase tracking-widest" style={{ gridTemplateColumns: '3fr 1px 3fr 1px 2fr' }}>
                <div className="flex items-center justify-center py-3 bg-nile-blue/40">Match Result</div>
                <div className="bg-gold/30" />
                <div className="flex items-center justify-center py-3 bg-nile-blue/30">Double Chance</div>
                <div className="bg-gold/30" />
                <div className="flex items-center justify-center py-3 bg-nile-blue/20">Both Score</div>
              </div>

            </div>
            <div className="px-3 text-[11px] text-white/50 font-bold uppercase tracking-widest flex-shrink-0 flex items-center border-l border-gold/10">
              More
            </div>
          </div>

          {isLoading ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <SkeletonMatchRow key={i} />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <EmptyState
              title="No matches found"
              message="No upcoming matches for this selection"
              icon={Swords}
            />
          ) : (
            <>
              {/* Featured */}
              {featured.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 bg-gold/5 border-b border-gold/20">
                    <span className="text-[10px] text-gold/60 tracking-widest uppercase font-medium">
                      ⭐ Featured Matches
                    </span>
                  </div>
                  {featured.map(
                    (match, i) => (
                      <MatchRow
                        key={match.id}
                        match={match as unknown as MatchWithMarkets}
                        isEven={i % 2 === 0}
                        basePath={basePath}
                      />
                    )
                  )}
                </div>
              )}

              {/* Grouped by league */}
              {Object.entries(grouped).map(
                ([key, groupMatches]) => {
                  const first = groupMatches[0] as any
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-dark/80 border-b border-gold/10">
                        <span className="text-[11px] text-gold/60">
                          <FlagImage emoji={first.flag_emoji ?? '🏳️'} />{' '}
                          {first.country_name} -{' '}
                          {first.league_name}
                        </span>
                        <span className="text-[11px] text-nile-blue-light">
                          {formatKickOff(
                            groupMatches[0].kick_off_time
                          )}
                        </span>
                      </div>
                      {groupMatches.map(
                        (match, i) => (
                          <MatchRow
                            key={match.id}
                            match={match as unknown as MatchWithMarkets}
                            isEven={i % 2 === 0}
                            basePath={basePath}
                          />
                        )
                      )}
                    </div>
                  )
                }
              )}
            </>
          )}
        </div>

        {/* Bet Slip Sidebar */}
        <BetSlipSidebar
          settings={settings}
          role="bettor"
          onPlaceBet={() => setShowPlaceBet(true)}
        />
      </div>

      {/* Place Bet Modal */}
      <PlaceBetModal
        isOpen={showPlaceBet}
        onClose={() => setShowPlaceBet(false)}
      />
    </div>
  )
}