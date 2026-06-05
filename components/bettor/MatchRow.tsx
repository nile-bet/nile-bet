'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { OddButton } from './OddButton'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MatchWithMarkets } from '@/types/database.types'

const CATEGORY_ORDER = [
  'MAIN', 'GOALS', 'HANDICAP', 'HALVES',
  'CORNERS', 'CARDS', 'TEAM GOALS',
  'CLEAN SHEET', 'GOALS ODD/EVEN',
  'SCORERS', 'SCORE', 'COMBO',
  'MIN 1X2', 'MIN GOALS', 'SPECIALS',
]

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
  const [expanded, setExpanded] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORY_ORDER[0])
  const marketsListRef = useRef<HTMLDivElement>(null)

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    setTimeout(() => {
      if (marketsListRef.current) {
        marketsListRef.current.scrollTop = 0
      }
    }, 0)
  }

  const market1x2 = getQuickOdds(match, '1X2 (Full Time Result)')
  const marketDC = getQuickOdds(match, 'Double Chance')
  const marketBTTS = getQuickOdds(match, 'Both Teams to Score')

  const getOdd = (market: ReturnType<typeof getQuickOdds>, sel: string) => {
    if (!market) return null
    return market.match_market_odds?.find((o) => o.selection === sel)?.odd_value ?? null
  }

  const totalMarkets = match.match_markets?.filter((m) => m.is_enabled).length ?? 0

  // Group enabled markets by category
  const marketsByCategory = (match.match_markets ?? [])
    .filter((mm) => mm.is_enabled)
    .reduce((acc, mm) => {
      const cat = (mm.market_templates as any)?.market_categories?.name ?? 'MAIN'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(mm)
      return acc
    }, {} as Record<string, typeof match.match_markets>)

  const currentMarkets = marketsByCategory[activeCategory] ?? []
  const hasMarkets = currentMarkets.length > 0

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
        'border-b border-[rgba(255,255,255,0.08)] transition-all duration-200 hover:bg-[#172540] group',
        isEven ? 'bg-[#0D1526]' : 'bg-[#111C31]',
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
          <span className="text-[13px] font-semibold text-white tracking-wide">
            {match.home_team} <span className="text-white/30 mx-1">vs</span> {match.away_team}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[#A9B4D0] text-[11px] bg-[#172540] border border-white/10 px-2 py-0.5 rounded hover:bg-[#1A2945] transition-colors flex-shrink-0 ml-2 flex items-center gap-1"
        >
          +{totalMarkets} more
          {expanded
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
          }
        </button>
      </div>

      {/* Quick odds row — 1X2 + DC + BTTS */}
      <div
        className="grid border-t border-[rgba(255,255,255,0.04)] mt-1"
        style={{ gridTemplateColumns: '1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr' }}
      >
        <OddButton {...commonProps} label="1" odd={getOdd(market1x2, 'Home')} matchMarketId={market1x2?.id ?? `${match.id}-1x2-1`} selection="Home" marketName="1X2 (Full Time Result)" categoryName="MAIN" size="col" />
        <div className="bg-[rgba(255,255,255,0.06)]" />
        <OddButton {...commonProps} label="X" odd={getOdd(market1x2, 'Draw')} matchMarketId={market1x2?.id ?? `${match.id}-1x2-x`} selection="Draw" marketName="1X2 (Full Time Result)" categoryName="MAIN" size="col" />
        <div className="bg-[rgba(255,255,255,0.06)]" />
        <OddButton {...commonProps} label="2" odd={getOdd(market1x2, 'Away')} matchMarketId={market1x2?.id ?? `${match.id}-1x2-2`} selection="Away" marketName="1X2 (Full Time Result)" categoryName="MAIN" size="col" />
        <div className="bg-[rgba(255,255,255,0.06)]" />
        <OddButton {...commonProps} label="1X" odd={getOdd(marketDC, '1X')} matchMarketId={marketDC?.id ?? `${match.id}-dc-1x`} selection="1X" marketName="Double Chance" categoryName="MAIN" size="col" />
        <div className="bg-[rgba(255,255,255,0.06)]" />
        <OddButton {...commonProps} label="12" odd={getOdd(marketDC, '12')} matchMarketId={marketDC?.id ?? `${match.id}-dc-12`} selection="12" marketName="Double Chance" categoryName="MAIN" size="col" />
        <div className="bg-[rgba(255,255,255,0.06)]" />
        <OddButton {...commonProps} label="X2" odd={getOdd(marketDC, 'X2')} matchMarketId={marketDC?.id ?? `${match.id}-dc-x2`} selection="X2" marketName="Double Chance" categoryName="MAIN" size="col" />
        <div className="bg-[rgba(255,255,255,0.06)]" />
        <OddButton {...commonProps} label="Yes" odd={getOdd(marketBTTS, 'Yes')} matchMarketId={marketBTTS?.id ?? `${match.id}-btts-y`} selection="Yes" marketName="Both Teams to Score" categoryName="MAIN" size="col" />
        <div className="bg-[rgba(255,255,255,0.06)]" />
        <OddButton {...commonProps} label="No" odd={getOdd(marketBTTS, 'No')} matchMarketId={marketBTTS?.id ?? `${match.id}-btts-n`} selection="No" marketName="Both Teams to Score" categoryName="MAIN" size="col" />
      </div>

      {/* Expanded markets panel */}
      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)]" style={{ backgroundColor: "#1E1E26" }}>

          {/* ── Category tab bar — ALL 15 always shown ── */}
          <div className="overflow-x-auto scrollbar-hide border-b border-[rgba(255,255,255,0.06)]" style={{ backgroundColor: '#1E1E26' }}>
            <div className="flex min-w-max">
              {CATEGORY_ORDER.map((cat) => {
                const count = marketsByCategory[cat]?.length ?? 0
                const isEmpty = count === 0
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    style={{ backgroundColor: '#1E1E26' }}
                    className={cn(
                      'text-[9px] px-3 py-2 font-bold tracking-widest uppercase whitespace-nowrap transition-colors flex-shrink-0 border-b-2',
                      activeCategory === cat
                        ? 'text-gold border-gold bg-[#1E1E26]'
                        : isEmpty
                        ? 'text-white/20 border-transparent hover:text-white/40 bg-[#1E1E26]'
                        : 'text-white/50 border-transparent hover:text-white hover:border-gold/30 bg-[#1E1E26]'
                    )}
                  >
                    {cat}
                    <span className="ml-1 opacity-50">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Markets list or empty state ── */}
          {!hasMarkets ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <span className="text-3xl mb-2">📋</span>
              <p className="text-white/30 text-xs font-semibold">
                No market list here
              </p>
              <p className="text-white/20 text-[10px] mt-1">
                {activeCategory} markets not available for this match
              </p>
            </div>
          ) : (
            <div className="divide-y divide-nile-blue/10 overflow-y-auto max-h-64" ref={marketsListRef}>
              {(() => {
                // Group Over/Under markets together under one header
                const overUnderMarkets = currentMarkets.filter(m =>
                  /over.?under/i.test(m.market_templates?.name ?? '') &&
                  !/corner/i.test(m.market_templates?.name ?? '')
                )
                const isCornerOU = (name: string) =>
                  /Corners?\s*O\/U|Corners?\s*Over.?Under/i.test(name)
                const isCardOU = (name: string) =>
                  /Cards?\s*O\/U|Cards?\s*Over.?Under/i.test(name)
                const isTeamGoalOU = (name: string) =>
                  /Home Team O\/U|Away Team O\/U/i.test(name)
                const cornerOUMarkets = currentMarkets.filter(m =>
                  isCornerOU(m.market_templates?.name ?? '')
                )
                const cardOUMarkets = currentMarkets.filter(m =>
                  isCardOU(m.market_templates?.name ?? '')
                )
                const teamGoalOUMarkets = currentMarkets.filter(m =>
                  isTeamGoalOU(m.market_templates?.name ?? '')
                )
                const otherMarkets = currentMarkets.filter(m =>
                  !/over.?under/i.test(m.market_templates?.name ?? '') &&
                  !isCornerOU(m.market_templates?.name ?? '') &&
                  !isCardOU(m.market_templates?.name ?? '') &&
                  !isTeamGoalOU(m.market_templates?.name ?? '')
                )
                const rendered: React.ReactNode[] = []

                // Render Over/Under FIRST
                if (overUnderMarkets.length > 0) {
                  rendered.push(
                    <div key="over-under-group">
                      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e26]">
                        <span className="text-[13px] font-extrabold text-white uppercase tracking-wide">
                          Goals Over/Under
                        </span>
                        <ChevronUp className="w-3 h-3 text-white/30" />
                      </div>
                      <div className="border-t border-white/5">
                        {overUnderMarkets.map((market) => {
                          const odds = market.match_market_odds ?? []
                          const allNums = (market.market_templates?.name ?? '').match(/[\d.]+/g) ?? []
                          const line = allNums[allNums.length - 1] ?? ''
                          const overOdd = odds.find(o => /over/i.test(o.selection))
                          const underOdd = odds.find(o => /under/i.test(o.selection))
                          return (
                            <div key={market.id} className="grid border-b border-white/5 last:border-0 bg-[#1E1E26]" style={{ gridTemplateColumns: '1fr 1px 1fr' }}>
                              <OddButton
                                {...commonProps}
                                label={`Over ${line}`}
                                odd={overOdd?.odd_value ?? null}
                                matchMarketId={market.id}
                                selection={overOdd?.selection ?? ''}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'GOALS'}
                                size="col"
                              darker={true}
                              />
                              <div className="bg-[rgba(255,255,255,0.06)]" />
                              <OddButton
                                {...commonProps}
                                label={`Under ${line}`}
                                odd={underOdd?.odd_value ?? null}
                                matchMarketId={market.id}
                                selection={underOdd?.selection ?? ''}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'GOALS'}
                                size="col"
                              darker={true}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                }

                // Render Corner Over/Under groups
                const cornerGroups = [
                  { key: 'total-corners-ou', label: 'Total Corners Over/Under', regex: /Total Corners/i },
                  { key: 'home-corners-ou',  label: 'Home Corners Over/Under',  regex: /Home Corners/i },
                  { key: 'away-corners-ou',  label: 'Away Corners Over/Under',  regex: /Away Corners/i },
                  { key: 'half-corners-ou',  label: '1st Half Corners Over/Under', regex: /1st Half Corners/i },
                ]
                cornerGroups.forEach(({ key, label, regex }) => {
                  const group = cornerOUMarkets.filter(m => regex.test(m.market_templates?.name ?? ''))
                  if (group.length === 0) return
                  rendered.push(
                    <div key={key}>
                      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e26]">
                        <span className="text-[13px] font-extrabold text-white uppercase tracking-wide">
                          {label}
                        </span>
                        <ChevronUp className="w-3 h-3 text-white/30" />
                      </div>
                      <div className="border-t border-white/5">
                        {group.map((market) => {
                          const odds = market.match_market_odds ?? []
                          const lineMatch = (market.market_templates?.name ?? '').match(/O\/U\s*([\d.]+)/i)
                          const line = lineMatch ? lineMatch[1] : ''
                          const overOdd = odds.find(o => /over/i.test(o.selection))
                          const underOdd = odds.find(o => /under/i.test(o.selection))
                          return (
                            <div key={market.id} className="grid border-b border-white/5 last:border-0 bg-[#1E1E26]" style={{ gridTemplateColumns: '1fr 1px 1fr' }}>
                              <OddButton
                                {...commonProps}
                                label={`Over ${line}`}
                                odd={overOdd?.odd_value ?? null}
                                matchMarketId={market.id}
                                selection={overOdd?.selection ?? ''}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'CORNERS'}
                                size="col"
                              darker={true}
                              />
                              <div className="bg-[rgba(255,255,255,0.06)]" />
                              <OddButton
                                {...commonProps}
                                label={`Under ${line}`}
                                odd={underOdd?.odd_value ?? null}
                                matchMarketId={market.id}
                                selection={underOdd?.selection ?? ''}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'CORNERS'}
                                size="col"
                              darker={true}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })

                // Render Team Goals Over/Under groups
                const teamGoalGroups = [
                  { key: 'home-team-ou', label: 'Home Team Goals Over/Under', regex: /Home Team O\/U/i },
                  { key: 'away-team-ou', label: 'Away Team Goals Over/Under', regex: /Away Team O\/U/i },
                ]
                teamGoalGroups.forEach(({ key, label, regex }) => {
                  const group = teamGoalOUMarkets.filter(m => regex.test(m.market_templates?.name ?? ''))
                  if (group.length === 0) return
                  rendered.push(
                    <div key={key}>
                      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e26]">
                        <span className="text-[13px] font-extrabold text-white uppercase tracking-wide">
                          {label}
                        </span>
                        <ChevronUp className="w-3 h-3 text-white/30" />
                      </div>
                      <div className="border-t border-white/5">
                        {group.map((market) => {
                          const odds = market.match_market_odds ?? []
                          const allNums = (market.market_templates?.name ?? '').match(/[\d.]+/g) ?? []
                          const line = allNums[allNums.length - 1] ?? ''
                          const overOdd = odds.find(o => /over/i.test(o.selection))
                          const underOdd = odds.find(o => /under/i.test(o.selection))
                          return (
                            <div key={market.id} className="grid border-b border-white/5 last:border-0 bg-[#1E1E26]" style={{ gridTemplateColumns: '1fr 1px 1fr' }}>
                              <OddButton
                                {...commonProps}
                                label={`Over ${line}`}
                                odd={overOdd?.odd_value ?? null}
                                matchMarketId={market.id}
                                selection={overOdd?.selection ?? ''}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'TEAM GOALS'}
                                size="col"
                              darker={true}
                              />
                              <div className="bg-[rgba(255,255,255,0.06)]" />
                              <OddButton
                                {...commonProps}
                                label={`Under ${line}`}
                                odd={underOdd?.odd_value ?? null}
                                matchMarketId={market.id}
                                selection={underOdd?.selection ?? ''}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'TEAM GOALS'}
                                size="col"
                              darker={true}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })

                // Render Card Over/Under groups
                const cardGroups = [
                  { key: 'total-cards-ou',  label: 'Total Cards Over/Under',    regex: /Total Cards/i },
                  { key: 'home-cards-ou',   label: 'Home Cards Over/Under',     regex: /Home Cards/i },
                  { key: 'away-cards-ou',   label: 'Away Cards Over/Under',     regex: /Away Cards/i },
                  { key: 'half-cards-ou',   label: '1st Half Cards Over/Under', regex: /1st Half Cards/i },
                ]
                cardGroups.forEach(({ key, label, regex }) => {
                  const group = cardOUMarkets.filter(m => regex.test(m.market_templates?.name ?? ''))
                  if (group.length === 0) return
                  rendered.push(
                    <div key={key}>
                      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e26]">
                        <span className="text-[13px] font-extrabold text-white uppercase tracking-wide">
                          {label}
                        </span>
                        <ChevronUp className="w-3 h-3 text-white/30" />
                      </div>
                      <div className="border-t border-white/5">
                        {group.map((market) => {
                          const odds = market.match_market_odds ?? []
                          const allNums = (market.market_templates?.name ?? '').match(/[\d.]+/g) ?? []
                          const line = allNums[allNums.length - 1] ?? ''
                          const overOdd = odds.find(o => /over/i.test(o.selection))
                          const underOdd = odds.find(o => /under/i.test(o.selection))
                          return (
                            <div key={market.id} className="grid border-b border-white/5 last:border-0 bg-[#1E1E26]" style={{ gridTemplateColumns: '1fr 1px 1fr' }}>
                              <OddButton
                                {...commonProps}
                                label={`Over ${line}`}
                                odd={overOdd?.odd_value ?? null}
                                matchMarketId={market.id}
                                selection={overOdd?.selection ?? ''}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'CARDS'}
                                size="col"
                              darker={true}
                              />
                              <div className="bg-[rgba(255,255,255,0.06)]" />
                              <OddButton
                                {...commonProps}
                                label={`Under ${line}`}
                                odd={underOdd?.odd_value ?? null}
                                matchMarketId={market.id}
                                selection={underOdd?.selection ?? ''}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'CARDS'}
                                size="col"
                              darker={true}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })

                // Render non-Over/Under markets after
                otherMarkets.forEach((market) => {
                  const odds = market.match_market_odds ?? []
                  rendered.push(
                    <div key={market.id}>
                      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e26]">
                        <span className="text-[13px] font-extrabold text-white uppercase tracking-wide">
                          {market.market_templates?.name}
                        </span>
                        <ChevronUp className="w-3 h-3 text-white/30" />
                      </div>
                      {odds.length === 0 ? (
                        <p className="text-[10px] text-white/25 px-4 py-2">No odds available</p>
                      ) : (
                        <div className="grid border-t border-white/5 bg-[#1E1E26]" style={{ gridTemplateColumns: `repeat(${Math.min(odds.length, 3)}, 1fr)` }}>
                          {odds.map((odd, i) => (
                            <div key={odd.id} className={i % 3 !== 2 ? 'border-r border-white/5' : ''}>
                              <OddButton
                                {...commonProps}
                                label={odd.selection}
                                odd={odd.odd_value}
                                matchMarketId={market.id}
                                selection={odd.selection}
                                marketName={market.market_templates?.name ?? ''}
                                categoryName={(market.market_templates as any)?.market_categories?.name ?? 'MAIN'}
                                size="col"
                              darker={true}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })



                return rendered
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
