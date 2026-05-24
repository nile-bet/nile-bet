'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { OddButton } from './OddButton'
import { formatKickOff } from '@/lib/utils/formatCurrency'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type { MatchWithMarkets } from '@/types/database.types'

const CATEGORY_ORDER = [
  'MAIN', 'GOALS', 'HANDICAP', 'HALVES',
  'CORNERS', 'CARDS', 'TEAM GOALS',
  'CLEAN SHEET', 'GOALS ODD/EVEN',
  'SCORERS', 'SCORE', 'COMBO',
  'MIN 1X2', 'MIN GOALS', 'SPECIALS',
]

function MarketBlock({ mm, match, commonProps, activeCategory }: any) {
  const [collapsed, setCollapsed] = useState(false)
  const template = mm.market_templates as any
  const odds = mm.match_market_odds ?? []
  const selections: string[] = template?.selections ?? []
  const isDynamic = template?.is_dynamic ?? false
  const marketName = template?.name ?? ''
  const catName = template?.market_categories?.name ?? activeCategory

  const renderRows = () => {
    if (isDynamic) {
      const homePlayers = match.match_players?.filter((p: any) => p.team === 'home') ?? []
      const awayPlayers = match.match_players?.filter((p: any) => p.team === 'away') ?? []
      const allPlayers = [...homePlayers, ...awayPlayers]
      if (allPlayers.length === 0) {
        return (
          <div className="flex items-center gap-2 text-white/25 text-xs px-4 py-3">
            <AlertTriangle className="w-3 h-3" />
            No players added for this market
          </div>
        )
      }
      return (
        <>
          {allPlayers.map((player: any) => {
            const oddRow = odds.find((o: any) => o.selection === player.player_name)
            if (!oddRow) return null
            return (
              <OddButton
                key={player.id}
                {...commonProps}
                label={player.player_name}
                odd={oddRow.odd_value ?? null}
                matchMarketId={mm.id}
                selection={player.player_name}
                marketName={marketName}
                categoryName={catName}
                size="row"
              />
            )
          })}
        </>
      )
    }

    if (selections.length === 0) {
      return (
        <div className="flex items-center gap-2 text-white/25 text-xs px-4 py-3">
          <AlertTriangle className="w-3 h-3" />
          Unavailable for this match
        </div>
      )
    }

    return (
      <div className="grid border-t border-white/5" style={{ gridTemplateColumns: `repeat(${Math.min(selections.length, 3)}, 1fr)` }}>
        {selections.map((sel, i) => {
          const oddRow = odds.find((o: any) => o.selection === sel)
          return (
            <div key={sel} className={i % 3 !== 2 ? 'border-r border-white/5' : ''}>
              <OddButton
                {...commonProps}
                label={sel}
                odd={oddRow?.odd_value ?? null}
                matchMarketId={mm.id}
                selection={sel}
                marketName={marketName}
                categoryName={catName}
                size="col"
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/5 mb-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-nile-blue/20 border-b border-white/5"
      >
        <span className="text-[14px] font-extrabold text-white uppercase tracking-wide">{marketName}</span>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-white/30" />
          : <ChevronUp className="w-4 h-4 text-white/30" />}
      </button>
      {!collapsed && renderRows()}
    </div>
  )
}

export function MatchDetailClient({ match }: { match: MatchWithMarkets }) {
  const router = useRouter()
  const leagues = match.leagues as any
  const leagueName = leagues?.name ?? ''
  const countryFlag = leagues?.countries?.flag_emoji ?? '🏳️'
  const countryName = leagues?.countries?.name ?? ''

  const byCategory = new Map<string, typeof match.match_markets>()
  CATEGORY_ORDER.forEach((cat) => byCategory.set(cat, []))

  match.match_markets?.forEach((mm) => {
    if (!mm.is_enabled) return
    const catName = (mm.market_templates as any)?.market_categories?.name ?? 'OTHER'
    if (!byCategory.has(catName)) byCategory.set(catName, [])
    byCategory.get(catName)!.push(mm)
  })

  const categories = CATEGORY_ORDER.filter((c) => (byCategory.get(c)?.length ?? 0) > 0)
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? 'MAIN')

  const commonProps = {
    matchId: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    leagueName,
    countryFlag,
    kickOffTime: match.kick_off_time,
    matchStatus: match.status,
  }

  const activeMarkets = byCategory.get(activeCategory) ?? []

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 bg-slate-dark border-b border-gold/20 px-4 py-3">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-semibold text-white">{match.home_team} V {match.away_team}</h1>
            <p className="text-[12px] text-gold/60 mt-0.5">{countryFlag} {countryName} - {leagueName} • {formatKickOff(match.kick_off_time)}</p>
          </div>
          {match.status !== 'upcoming' && <StatusBadge status={match.status} type="match" />}
        </div>
      </div>

      <div className="sticky top-[89px] z-10 bg-slate-dark border-b border-gold/20 overflow-x-auto scrollbar-hide">
        <div className="flex">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'text-[12px] px-4 py-3 whitespace-nowrap border-b-2 transition-colors tracking-wide',
                activeCategory === cat
                  ? 'text-gold border-gold font-semibold'
                  : 'text-white/50 border-transparent hover:text-white hover:border-gold/40'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeMarkets.length === 0 ? (
          <div className="flex items-center gap-2 text-white/30 text-sm py-8">
            <AlertTriangle className="w-4 h-4" />
            <span>No markets available for {activeCategory}</span>
          </div>
        ) : (
          <div>
            {activeMarkets.map((mm) => (
              <MarketBlock key={mm.id} mm={mm} match={match} commonProps={commonProps} activeCategory={activeCategory} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
