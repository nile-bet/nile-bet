'use client'

import { useState, useEffect,
  useCallback, useRef } from 'react'
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
  onSportsNavReady?: (openFn: () => void) => void
}

export function MatchListClient({
  initialMatches,
  countries,
  topLeagues,
  settings,
  basePath = '',
  onSportsNavReady,
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
  const openCountriesPanelRef = useRef<(() => void) | null>(null)
  const supabase = createClient()

  // Listen for Sports nav click from PublicNavbar
  useEffect(() => {
    const handler = () => {
      if (openCountriesPanelRef.current) openCountriesPanelRef.current()
    }
    window.addEventListener('open-countries-panel', handler)
    return () => window.removeEventListener('open-countries-panel', handler)
  }, [])

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
    <div className="flex flex-col w-full">
      <FilterBar
        onFilterChange={handleFilterChange}
        matchCount={matches.length}
      />

      <div className="flex items-start">
        {/* League Sidebar */}
        <div className="hidden md:flex flex-col flex-shrink-0 border-r border-nile-blue/20" style={{ position: "sticky", top: "60px", alignSelf: "flex-start" }}>
          <LeagueSidebar
            countries={countries}
            topLeagues={topLeagues}
            selectedLeagueId={selectedLeagueId}
            onLeagueSelect={handleLeagueSelect}
            className="flex flex-col"
            openPanelRef={openCountriesPanelRef}
          />
        </div>

        {/* Match List */}
        <div className="flex-1 overflow-y-auto overscroll-auto border-r border-nile-blue/20" style={{ height: "calc(100vh - 120px)", backgroundColor: "#0D1526" }}>
          {/* Column headers */}
          <div className="sticky top-0 z-10 bg-[#141F36] border-b border-gold/20 hidden md:flex items-stretch">
            <div className="flex-1">
              <div className="grid text-[13px] font-extrabold uppercase tracking-widest" style={{ gridTemplateColumns: '1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr' }}>
                <div className="flex items-center justify-center py-3 bg-[#141F36] text-white font-extrabold col-span-5 border-b-2 border-indigo-500/40">Match Result</div>
                <div className="bg-[rgba(255,255,255,0.06)]" />
                <div className="flex items-center justify-center py-3 bg-[#141F36] text-white font-extrabold col-span-5 border-b-2 border-emerald-500/40">Double Chance</div>
                <div className="bg-[rgba(255,255,255,0.06)]" />
                <div className="flex items-center justify-center py-3 bg-[#141F36] text-white font-extrabold col-span-3 border-b-2 border-amber-500/40">Both Score</div>
              </div>
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
                      <div className="flex items-center justify-between px-4 py-2 bg-[#111C31] border-b border-[rgba(255,255,255,0.06)]">
                        <span className="text-[11px] text-[#A9B4D0] font-medium flex items-center gap-1.5">
                          <FlagImage emoji={first.flag_emoji ?? '🏳️'} />
                          <span className="text-[#7D89A8]">{first.country_name}</span>
                          <span className="text-[#7D89A8]/50">·</span>
                          <span>{first.league_name}</span>
                        </span>
                        <span className="text-[11px] text-[#7D89A8]">
                          {formatKickOff(groupMatches[0].kick_off_time)}
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