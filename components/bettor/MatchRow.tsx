'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OddButton } from './OddButton'
import { formatKickOff }
  from '@/lib/utils/formatCurrency'
import type { MatchWithMarkets }
  from '@/types/database.types'

interface MatchRowProps {
  match: MatchWithMarkets
  isEven: boolean
  basePath?: string
}

function getQuickOdds(
  match: MatchWithMarkets,
  marketName: string
) {
  const market = match.match_markets?.find(
    (mm) =>
      mm.market_templates?.name ===
        marketName && mm.is_enabled
  )
  if (!market) return null
  return market
}

export function MatchRow({
  match,
  isEven,
  basePath = '',
}: MatchRowProps) {
  const router = useRouter()

  const market1x2 = getQuickOdds(
    match,
    '1X2 (Full Time Result)'
  )
  const marketDC = getQuickOdds(
    match,
    'Double Chance'
  )
  const marketBTTS = getQuickOdds(
    match,
    'Both Teams to Score'
  )

  const getOdd = (
    market: typeof market1x2,
    sel: string
  ) => {
    if (!market) return null
    const o = market.match_market_odds?.find(
      (o) => o.selection === sel
    )
    return o?.odd_value ?? null
  }

  const totalMarkets =
    match.match_markets?.filter(
      (m) => m.is_enabled
    ).length ?? 0

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
        match.is_featured &&
          'border border-gold/30 bg-gold/5'
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
            {match.home_team} V{' '}
            {match.away_team}
          </span>
        </div>
        <button
          onClick={() =>
            router.push(
              `${basePath}/match/${match.id}`
            )
          }
          className="text-nile-blue-light text-xs bg-nile-blue/20 border border-nile-blue/40 px-2 py-1 rounded hover:bg-nile-blue/30 transition-colors flex-shrink-0 ml-2"
        >
          +{totalMarkets} more ▶
        </button>
      </div>

      {/* Odds row */}
      <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
        {/* 1X2 */}
        <div className="flex gap-1 flex-shrink-0">
          <OddButton
            {...commonProps}
            label="1"
            odd={getOdd(market1x2, 'Home')}
            matchMarketId={
              market1x2?.id ?? `${match.id}-1x2-1`
            }
            selection="Home"
            marketName="1X2 (Full Time Result)"
            categoryName="MAIN"
          />
          <OddButton
            {...commonProps}
            label="X"
            odd={getOdd(market1x2, 'Draw')}
            matchMarketId={
              market1x2?.id ?? `${match.id}-1x2-x`
            }
            selection="Draw"
            marketName="1X2 (Full Time Result)"
            categoryName="MAIN"
          />
          <OddButton
            {...commonProps}
            label="2"
            odd={getOdd(market1x2, 'Away')}
            matchMarketId={
              market1x2?.id ?? `${match.id}-1x2-2`
            }
            selection="Away"
            marketName="1X2 (Full Time Result)"
            categoryName="MAIN"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gold/20 flex-shrink-0 mx-1" />

        {/* Double Chance */}
        <div className="flex gap-1 flex-shrink-0">
          <OddButton
            {...commonProps}
            label="1X"
            odd={getOdd(marketDC, '1X')}
            matchMarketId={
              marketDC?.id ?? `${match.id}-dc-1x`
            }
            selection="1X"
            marketName="Double Chance"
            categoryName="MAIN"
          />
          <OddButton
            {...commonProps}
            label="12"
            odd={getOdd(marketDC, '12')}
            matchMarketId={
              marketDC?.id ?? `${match.id}-dc-12`
            }
            selection="12"
            marketName="Double Chance"
            categoryName="MAIN"
          />
          <OddButton
            {...commonProps}
            label="X2"
            odd={getOdd(marketDC, 'X2')}
            matchMarketId={
              marketDC?.id ?? `${match.id}-dc-x2`
            }
            selection="X2"
            marketName="Double Chance"
            categoryName="MAIN"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gold/20 flex-shrink-0 mx-1" />

        {/* BTTS */}
        <div className="flex gap-1 flex-shrink-0">
          <OddButton
            {...commonProps}
            label="Yes"
            odd={getOdd(marketBTTS, 'Yes')}
            matchMarketId={
              marketBTTS?.id ?? `${match.id}-btts-y`
            }
            selection="Yes"
            marketName="Both Teams to Score"
            categoryName="MAIN"
          />
          <OddButton
            {...commonProps}
            label="No"
            odd={getOdd(marketBTTS, 'No')}
            matchMarketId={
              marketBTTS?.id ?? `${match.id}-btts-n`
            }
            selection="No"
            marketName="Both Teams to Score"
            categoryName="MAIN"
          />
        </div>
      </div>
    </div>
  )
}