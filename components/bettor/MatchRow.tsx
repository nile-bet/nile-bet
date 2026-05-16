'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OddButton } from './OddButton'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MatchWithMarkets } from '@/types/database.types'

interface MatchRowProps {
  match: MatchWithMarkets
  isEven: boolean
  basePath?: string
}

function getQuickOdds(match: MatchWithMarkets, marketName: string) {
  return match.match_markets?.find(
    (mm) => mm.market_templates?.name === marketName && mm.is_enabled
  ) ?? null
}

export function MatchRow({ match, isEven, basePath = '' }: MatchRowProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const market1x2 = getQuickOdds(match, '1X2 (Full Time Result)')
  const marketDC = getQuickOdds(match, 'Double Chance')
  const marketBTTS = getQuickOdds(match, 'Both Teams to Score')

  const getOdd = (market: ReturnType<typeof getQuickOdds>, sel: string) => {
    if (!market) return null
    return market.match_market_odds?.find((o) => o.selection === sel)?.odd_value ?? null
  }

  const totalMarkets = match.match_markets?.filter((m) => m.is_enabled).length ?? 0

  // Group markets by category
  const marketsByCategory = (match.match_markets ?? [])
    .filter((mm) => mm.is_enabled)
    .reduce((acc, mm) => {
      const cat = (mm.market_templates as any)?.market_categories?.name ?? 'MAIN'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(mm)
      return acc
    }, {} as Record<string, typeof match.match_markets>)

  const categories = Object.keys(marketsByCategory)
  const currentCategory = activeCategory ?? categories[0] ?? 'MAIN'
  const currentMarkets = marketsByCategory[currentCategory] ?? []

  const commonProps = {
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    leagueName: (match as any).league_name ?? '',
    countryFlag: (match as any).flag_emoji ?? '🏳️',
    kickOffTime: match.kick_off_time,
    matchStatus: match.status,
  }

  return (
    <div
      className={cn(
        'border-b border-nile-blue/20 transition-colors',
        isEven ? 'bg-charcoal' : 'bg-charcoal/60',
        match.is_featured && 'border border-gold/30 bg-gold/5'
      )}
    >
      {/* Match name row */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-2">
          {match.is_featured && (
            <span className="text-[10px] bg-gold/20 text-gold border border-gold/30 px-1.5 py-0.5 rounded font-medium">
              ⭐ FEATURED
            </span>
          )}
          <span className="text-[14px] font-medium text-white">
            {match.home_team} V {match.away_team}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-nile-blue-light text-xs bg-nile-blue/20 border border-nile-blue/40 px-2 py-1 rounded hover:bg-nile-blue/30 transition-colors flex-shrink-0 ml-2 flex items-center gap-1"
        >
          +{totalMarkets} more
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Main odds row */}
      <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 flex-shrink-0">
          <OddButton {...commonProps} label="1" odd={getOdd(market1x2, 'Home')} matchMarketId={market1x2?.id ?? `${match.id}-1x2-1`} selection="Home" marketName="1X2 (Full Time Result)" categoryName="MAIN" />
          <OddButton {...commonProps} label="X" odd={getOdd(market1x2, 'Draw')} matchMarketId={market1x2?.id ?? `${match.id}-1x2-x`} selection="Draw" marketName="1X2 (Full Time Result)" categoryName="MAIN" />
          <OddButton {...commonProps} label="2" odd={getOdd(market1x2, 'Away')} matchMarketId={market1x2?.id ?? `${match.id}-1x2-2`} selection="Away" marketName="1X2 (Full Time Result)" categoryName="MAIN" />
        </div>
        <div className="w-px h-8 bg-gold/20 flex-shrink-0 mx-1" />
        <div className="flex gap-1 flex-shrink-0">
          <OddButton {...commonProps} label="1X" odd={getOdd(marketDC, '1X')} matchMarketId={marketDC?.id ?? `${match.id}-dc-1x`} selection="1X" marketName="Double Chance" categoryName="MAIN" />
          <OddButton {...commonProps} label="12" odd={getOdd(marketDC, '12')} matchMarketId={marketDC?.id ?? `${match.id}-dc-12`} selection="12" marketName="Double Chance" categoryName="MAIN" />
          <OddButton {...commonProps} label="X2" odd={getOdd(marketDC, 'X2')} matchMarketId={marketDC?.id ?? `${match.id}-dc-x2`} selection="X2" marketName="Double Chance" categoryName="MAIN" />
        </div>
        <div className="w-px h-8 bg-gold/20 flex-shrink-0 mx-1" />
        <div className="flex gap-1 flex-shrink-0">
          <OddButton {...commonProps} label="Yes" odd={getOdd(marketBTTS, 'Yes')} matchMarketId={marketBTTS?.id ?? `${match.id}-btts-y`} selection="Yes" marketName="Both Teams to Score" categoryName="MAIN" />
          <OddButton {...commonProps} label="No" odd={getOdd(marketBTTS, 'No')} matchMarketId={marketBTTS?.id ?? `${match.id}-btts-n`} selection="No" marketName="Both Teams to Score" categoryName="MAIN" />
        </div>
      </div>

      {/* Expanded markets panel */}
      {expanded && (
        <div className="border-t border-nile-blue/30 bg-slate-dark">
          {/* Category tabs */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-nile-blue/20">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'text-[9px] px-3 py-2 font-bold tracking-widest uppercase whitespace-nowrap transition-colors flex-shrink-0 border-b-2',
                  currentCategory === cat
                    ? 'text-gold border-gold'
                    : 'text-white/30 border-transparent hover:text-white/60'
                )}
              >
                {cat}({marketsByCategory[cat]?.length ?? 0})
              </button>
            ))}
          </div>
          {/* Markets list */}
          <div className="divide-y divide-nile-blue/10 overflow-y-auto max-h-64">
            {currentMarkets?.map((market) => (
              <div key={market.id}>
                <div className="flex items-center justify-between px-4 py-1.5 bg-nile-blue/5">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                    {market.market_templates?.name}
                  </span>
                  <ChevronUp className="w-3 h-3 text-white/30" />
                </div>
                <div className="grid px-4 py-2 gap-y-1.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {market.match_market_odds?.map((odd) => (
                    <div key={odd.id} className="flex items-center justify-between pr-2">
                      <span className="text-[10px] text-white/50">{odd.selection}</span>
                      <OddButton
                        {...commonProps}
                        label={String(odd.odd_value)}
                        odd={odd.odd_value}
                        matchMarketId={market.id}
                        selection={odd.selection}
                        marketName={market.market_templates?.name ?? ''}
                        categoryName={(market.market_templates as any)?.market_categories?.name ?? 'MAIN'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
