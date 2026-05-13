'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft,
  AlertTriangle } from 'lucide-react'
import { OddButton } from './OddButton'
import { formatKickOff }
  from '@/lib/utils/formatCurrency'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type {
  MatchWithMarkets,
  MarketCategory,
} from '@/types/database.types'

const CATEGORY_ORDER = [
  'MAIN', 'GOALS', 'HANDICAP', 'HALVES',
  'CORNERS', 'CARDS', 'TEAM GOALS',
  'CLEAN SHEET', 'GOALS ODD/EVEN',
  'SCORERS', 'SCORE', 'COMBO',
  'MIN 1X2', 'MIN GOALS', 'SPECIALS',
]

interface MatchDetailClientProps {
  match: MatchWithMarkets
}

export function MatchDetailClient({
  match,
}: MatchDetailClientProps) {
  const router = useRouter()
  const leagues = match.leagues as any
  const leagueName = leagues?.name ?? ''
  const countryFlag =
    leagues?.countries?.flag_emoji ?? '🏳️'
  const countryName =
    leagues?.countries?.name ?? ''

  // Group markets by category
  const byCategory = new Map<
    string,
    typeof match.match_markets
  >()

  CATEGORY_ORDER.forEach((cat) => {
    byCategory.set(cat, [])
  })

  match.match_markets?.forEach((mm) => {
    if (!mm.is_enabled) return
    const catName =
      (mm.market_templates as any)
        ?.market_categories?.name ?? 'OTHER'
    if (!byCategory.has(catName)) {
      byCategory.set(catName, [])
    }
    byCategory.get(catName)!.push(mm)
  })

  const categories = CATEGORY_ORDER.filter(
    (c) => byCategory.has(c)
  )

  const [activeCategory, setActiveCategory] =
    useState(categories[0] ?? 'MAIN')

  const commonProps = {
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    leagueName,
    countryFlag,
    kickOffTime: match.kick_off_time,
    matchStatus: match.status,
  }

  const activeMarkets =
    byCategory.get(activeCategory) ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Match header */}
      <div className="sticky top-0 z-20 bg-slate-dark border-b border-gold/20 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-semibold text-white">
              {match.home_team} V{' '}
              {match.away_team}
            </h1>
            <p className="text-[12px] text-gold/60 mt-0.5">
              {countryFlag} {countryName} -{' '}
              {leagueName} •{' '}
              {formatKickOff(
                match.kick_off_time
              )}
            </p>
          </div>
          {match.status !== 'upcoming' && (
            <StatusBadge
              status={match.status}
              type="match"
            />
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-[89px] z-10 bg-slate-dark border-b border-gold/20 overflow-x-auto scrollbar-hide">
        <div className="flex">
          {categories.map((cat) => {
            const markets =
              byCategory.get(cat) ?? []
            const hasMarkets =
              markets.length > 0
            return (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(cat)
                }
                className={cn(
                  'text-[12px] px-4 py-3 whitespace-nowrap border-b-2 transition-colors tracking-wide',
                  activeCategory === cat
                    ? 'text-gold border-gold font-semibold'
                    : hasMarkets
                    ? 'text-white/50 border-transparent hover:text-white hover:border-gold/40'
                    : 'text-white/20 border-transparent'
                )}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Market grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeMarkets.length === 0 ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-8">
            <AlertTriangle className="w-4 h-4" />
            <span>
              No markets available for{' '}
              {activeCategory}
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {activeMarkets.map((mm) => {
              const template =
                mm.market_templates as any
              const odds =
                mm.match_market_odds ?? []
              const selections: string[] =
                template?.selections ?? []
              const isDynamic =
                template?.is_dynamic ?? false
              const marketName =
                template?.name ?? ''
              const catName =
                template?.market_categories
                  ?.name ?? activeCategory

              const dynamicSelections =
                isDynamic
                  ? match.match_players?.map(
                      (p) => p.player_name
                    ) ?? []
                  : selections

              return (
                <div
                  key={mm.id}
                  className="border-b border-gold/10 pb-4"
                >
                  <p className="text-[13px] text-white/60 font-medium mb-2">
                    {marketName}
                  </p>

                  {dynamicSelections.length ===
                  0 ? (
                    <div className="flex items-center gap-2 text-white/25 text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      Unavailable for this
                      match
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {dynamicSelections.map(
                        (sel) => {
                          const oddRow =
                            odds.find(
                              (o) =>
                                o.selection ===
                                sel
                            )
                          return (
                            <OddButton
                              key={sel}
                              {...commonProps}
                              label={sel}
                              odd={
                                oddRow?.odd_value ??
                                null
                              }
                              matchMarketId={
                                mm.id
                              }
                              selection={sel}
                              marketName={
                                marketName
                              }
                              categoryName={
                                catName
                              }
                              size="lg"
                            />
                          )
                        }
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}