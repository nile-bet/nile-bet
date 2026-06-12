'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { OddButton } from './OddButton'
import { formatKickOff } from '@/lib/utils/formatCurrency'
import { FlagImage } from '@/components/shared/FlagImage'
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

// Market name overrides: key = original market name (lowercase), value = display name
const MARKET_NAME_OVERRIDES: Record<string, string> = {
  // Goals category
  'goal over/under': 'Goal Over/Under',
  'over/under': 'Goal Over/Under',
  // Halves category
  'halves over/under': 'Goal Over/Under',
  'half over/under': 'Goal Over/Under',
  // Corners category
  'corners over/under': 'Total Corners Over/Under',
  'total corners': 'Total Corners Over/Under',
  'total corners over/under': 'Total Corners Over/Under',
  '1st half corners': '1st Half Corners Over/Under',
  '1st half corners over/under': '1st Half Corners Over/Under',
  'first half corners': '1st Half Corners Over/Under',
  // Cards category
  'cards over/under': 'Total Cards Over/Under',
  'total cards': 'Total Cards Over/Under',
  'total cards over/under': 'Total Cards Over/Under',
  // Team Goals category
  'home team goals': 'Home Team Goals Over/Under',
  'home goals over/under': 'Home Team Goals Over/Under',
  'home team goals over/under': 'Home Team Goals Over/Under',
  'away team goals': 'Away Team Goals Over/Under',
  'away goals over/under': 'Away Team Goals Over/Under',
  'away team goals over/under': 'Away Team Goals Over/Under',
}

function resolveMarketName(raw: string): string {
  return MARKET_NAME_OVERRIDES[raw.toLowerCase()] ?? raw
}

function MarketBlock({ mm, match, commonProps, activeCategory }: any) {
  const [collapsed, setCollapsed] = useState(false)
  const template = mm.market_templates as any
  const odds = mm.match_market_odds ?? []
  const selections: string[] = template?.selections ?? []
  const isDynamic = template?.is_dynamic ?? false
  const marketName = resolveMarketName(template?.name ?? '')
  const catName = (template?.market_categories?.name ?? activeCategory).toUpperCase()

  const renderRows = () => {
    if (isDynamic) {
      const homePlayers = match.match_players?.filter((p: any) => p.team === 'home') ?? []
      const awayPlayers = match.match_players?.filter((p: any) => p.team === 'away') ?? []
      const allPlayers = [...homePlayers, ...awayPlayers]
      if (allPlayers.length === 0) {
        return (
          <div className="flex items-center gap-2 text-white/25 text-xs px-4 py-3 bg-[#181818]/40">
            <AlertTriangle className="w-3 h-3" />
            No players added for this market
          </div>
        )
      }
      return (
        <div>
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
        </div>
      )
    }

    if (selections.length === 0) {
      return (
        <div className="flex items-center gap-2 text-white/25 text-xs px-4 py-3 bg-[#181818]/40">
          <AlertTriangle className="w-3 h-3" />
          Unavailable for this match
        </div>
      )
    }

    // Render selections in rows of 3 — each: name left, odd right
    const chunks: string[][] = []
    for (let i = 0; i < selections.length; i += 3) {
      chunks.push(selections.slice(i, i + 3))
    }

    return (
      <div>
        {chunks.map((chunk, rowIdx) => (
          <div
            key={rowIdx}
            className="grid border-t border-white/[0.04]"
            style={{ gridTemplateColumns: `repeat(${chunk.length}, 1fr)` }}
          >
            {chunk.map((sel, i) => {
              const oddRow = odds.find((o: any) => o.selection === sel)
              return (
                <div key={sel} className={i < chunk.length - 1 ? 'border-r border-white/[0.04]' : ''}>
                  <OddButton
                    {...commonProps}
                    label={sel}
                    odd={oddRow?.odd_value ?? null}
                    matchMarketId={mm.id}
                    selection={sel}
                    marketName={marketName}
                    categoryName={catName}
                    size="row"
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="border-b border-white/[0.06]">
      {/* Market title */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1e1e1e] hover:bg-[#222222] transition-colors"
      >
        <span className="text-[11px] font-bold text-white/90 uppercase tracking-widest">{marketName}</span>
        {collapsed
          ? <ChevronDown className="w-3.5 h-3.5 text-white/30" />
          : <ChevronUp className="w-3.5 h-3.5 text-white/30" />}
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
    const rawCat = (mm.market_templates as any)?.market_categories?.name ?? 'OTHER'
    const catName = rawCat.toUpperCase()
    if (!byCategory.has(catName)) byCategory.set(catName, [])
    byCategory.get(catName)!.push(mm)
  })

  // Always show ALL categories
  const categories = CATEGORY_ORDER
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
    <div className="flex flex-col h-full" style={{ backgroundColor: '#181818' }}>
      {/* Match header */}
      <div className="sticky top-0 z-20 border-b border-white/10 px-4 py-3" style={{ backgroundColor: '#181818' }}>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-white/50 hover:text-white text-xs mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">{match.home_team} V {match.away_team}</h1>
            <p className="text-[11px] text-white/40 mt-0.5">
              <FlagImage emoji={countryFlag} /> {countryName} · {leagueName} · {formatKickOff(match.kick_off_time)}
            </p>
          </div>
          {match.status !== 'upcoming' && <StatusBadge status={match.status} type="match" />}
        </div>
      </div>

      {/* Category tabs */}
      <div
        className="sticky top-[80px] z-10 border-b border-[#2a1a4a]/60 overflow-x-auto scrollbar-hide"
        style={{ backgroundColor: '#181818' }}
      >
        <div className="flex min-w-max">
          {categories.map((cat) => {
            const hasMarkets = (byCategory.get(cat)?.length ?? 0) > 0
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors',
                  activeCategory === cat
                    ? 'text-gold border-gold bg-[#1e1040]'
                    : hasMarkets
                    ? 'text-white/50 border-transparent hover:text-white hover:border-gold/30'
                    : 'text-white/20 border-transparent hover:text-white/40'
                )}
              >
                {cat}{!hasMarkets ? ' (0)' : ` (${byCategory.get(cat)?.length ?? 0})`}
              </button>
            )
          })}
        </div>
      </div>

      {/* Markets */}
      <div className="flex-1 overflow-y-auto">
        {activeMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-3xl mb-3">📋</span>
            <p className="text-white/30 text-sm">No market list here</p>
            <p className="text-white/20 text-xs mt-1">{activeCategory} markets not available for this match</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-white/[0.04] p-px">
            {activeMarkets.map((mm) => (
              <div key={mm.id} className="bg-[#181818]">
                <MarketBlock
                  mm={mm}
                  match={match}
                  commonProps={commonProps}
                  activeCategory={activeCategory}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
