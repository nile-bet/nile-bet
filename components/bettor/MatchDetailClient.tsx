'use client'

import { useState, useRef } from 'react'
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
      <div
        className="grid border-t border-white/5"
        style={{
          gridTemplateColumns: `repeat(${Math.min(selections.length, 3)}, 1fr)`,
        }}
      >
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
        <span className="text-[14px] font-extrabold text-white uppercase tracking-wide">
          {marketName}
        </span>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-white/30" />
          : <ChevronUp className="w-4 h-4 text-white/30" />
        }
      </button>
      {!collapsed && renderRows()}
    </div>
  )
}

export function MatchDetailClient({
  match,
}: {
  match: MatchWithMarkets
}) {
  const router = useRouter()
  const leagues = match.leagues as any
  const leagueName = leagues?.name ?? ''
  const countryFlag = leagues?.countries?.flag_emoji ?? '🏳️'
  const countryName = leagues?.countries?.name ?? ''

  // Build category map — ALL 15 always present
  const byCategory = new Map<string, typeof match.match_markets>()
  CATEGORY_ORDER.forEach((cat) => byCategory.set(cat, []))

  match.match_markets?.forEach((mm) => {
    if (!mm.is_enabled) return
    const catName =
      (mm.market_templates as any)?.market_categories?.name ?? 'OTHER'
    if (!byCategory.has(catName)) byCategory.set(catName, [])
    byCategory.get(catName)!.push(mm)
  })

  const marketsScrollRef = useRef<HTMLDivElement>(null)

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    setTimeout(() => {
      if (marketsScrollRef.current) {
        marketsScrollRef.current.scrollTop = 0
      }
    }, 0)
  }

  const [activeCategory, setActiveCategory] =
    useState(CATEGORY_ORDER[0])

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
  const hasMarkets = activeMarkets.length > 0

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Match header ── */}
      <div className="flex-shrink-0 bg-slate-dark border-b border-gold/20 px-4 py-3">
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
              {match.home_team} V {match.away_team}
            </h1>
            <p className="text-[12px] text-gold/60 mt-0.5">
              <FlagImage emoji={countryFlag} />{' '}
              {countryName} - {leagueName} •{' '}
              {formatKickOff(match.kick_off_time)}
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

      {/* ── Category tab bar — ALL 15 always visible ── */}
      <div className="flex-shrink-0 bg-slate-dark border-b border-gold/20 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          {CATEGORY_ORDER.map((cat) => {
            const count = byCategory.get(cat)?.length ?? 0
            const isEmpty = count === 0
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  'relative text-[12px] px-4 py-3 whitespace-nowrap border-b-2 transition-colors tracking-wide flex-shrink-0',
                  activeCategory === cat
                    ? 'text-gold border-gold font-semibold'
                    : isEmpty
                    ? 'text-white/25 border-transparent hover:text-white/50 hover:border-gold/20'
                    : 'text-white/50 border-transparent hover:text-white hover:border-gold/40'
                )}
              >
                {cat}
                <span
                  className={cn(
                    'absolute top-2 right-1.5 w-1.5 h-1.5 rounded-full',
                    isEmpty
                      ? 'bg-white/15'
                      : 'bg-nile-success'
                  )}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Market content — scrolls independently ── */}
      <div className="flex-1 overflow-y-auto p-4" ref={marketsScrollRef}>
        {!hasMarkets ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">📋</span>
            <p className="text-white/40 text-base font-semibold mb-1">
              No market list here
            </p>
            <p className="text-white/25 text-xs leading-relaxed max-w-xs">
              <span className="text-gold/60 font-medium">
                {activeCategory}
              </span>{' '}
              markets are not available for this match.
              Check other categories above.
            </p>
            {CATEGORY_ORDER.some(
              (c) => (byCategory.get(c)?.length ?? 0) > 0
            ) && (
              <button
                onClick={() => {
                  const first = CATEGORY_ORDER.find(
                    (c) => (byCategory.get(c)?.length ?? 0) > 0
                  )
                  if (first) setActiveCategory(first)
                }}
                className="mt-6 bg-gold/20 text-gold border border-gold/30 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gold/30"
              >
                Go to available markets →
              </button>
            )}
          </div>
        ) : (
          <div>
            {activeMarkets.map((mm) => (
              <MarketBlock
                key={mm.id}
                mm={mm}
                match={match}
                commonProps={commonProps}
                activeCategory={activeCategory}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
