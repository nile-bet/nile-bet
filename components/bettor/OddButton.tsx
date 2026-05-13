'use client'

import { cn } from '@/lib/utils'
import { useBetSlipStore }
  from '@/lib/stores/betSlipStore'
import type {
  BetSlipSelection,
  MatchStatus,
} from '@/types/database.types'

interface OddButtonProps {
  label: string
  odd: number | null
  matchMarketId: string
  selection: string
  matchId: string
  homeTeam: string
  awayTeam: string
  leagueName: string
  countryFlag: string
  marketName: string
  categoryName: string
  kickOffTime: string
  matchStatus: MatchStatus
  size?: 'sm' | 'lg'
  disabled?: boolean
}

export function OddButton({
  label,
  odd,
  matchMarketId,
  selection,
  matchId,
  homeTeam,
  awayTeam,
  leagueName,
  countryFlag,
  marketName,
  categoryName,
  kickOffTime,
  matchStatus,
  size = 'sm',
  disabled = false,
}: OddButtonProps) {
  const {
    addSelection,
    removeSelection,
    isSelectionAdded,
  } = useBetSlipStore()

  const isSelected = isSelectionAdded(
    matchMarketId,
    selection
  )

  const isUnavailable = !odd || disabled

  const handleClick = () => {
    if (isUnavailable) return

    if (isSelected) {
      removeSelection(
        matchMarketId,
        selection
      )
    } else {
      const s: BetSlipSelection = {
        matchId,
        matchMarketId,
        homeTeam,
        awayTeam,
        leagueName,
        countryFlag,
        marketName,
        categoryName,
        selection,
        odd: odd!,
        kickOffTime,
        matchStatus,
      }
      addSelection(s)
    }
  }

  if (size === 'lg') {
    return (
      <button
        onClick={handleClick}
        disabled={isUnavailable}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border px-3 py-2.5 transition-all duration-150 min-w-[100px]',
          isSelected
            ? 'bg-gold border-gold'
            : isUnavailable
            ? 'bg-transparent border-transparent cursor-not-allowed'
            : 'bg-slate-dark border-nile-blue/40 hover:border-gold/40 hover:bg-gold/10 cursor-pointer'
        )}
      >
        <span
          className={cn(
            'text-[11px] mb-1',
            isSelected
              ? 'text-charcoal'
              : isUnavailable
              ? 'text-white/20'
              : 'text-white/50'
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'font-mono text-[15px] font-medium',
            isSelected
              ? 'text-charcoal font-bold'
              : isUnavailable
              ? 'text-white/20'
              : 'text-gold'
          )}
        >
          {odd ? odd.toFixed(2) : '—'}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isUnavailable}
      className={cn(
        'flex flex-col items-center justify-center rounded-md border px-2.5 py-1.5 min-w-[52px] transition-all duration-150',
        isSelected
          ? 'bg-gold border-gold'
          : isUnavailable
          ? 'bg-transparent border-transparent cursor-not-allowed'
          : 'bg-slate-dark border-nile-blue/40 hover:border-gold/40 hover:bg-gold/10 cursor-pointer'
      )}
    >
      <span
        className={cn(
          'text-[10px] mb-0.5',
          isSelected
            ? 'text-charcoal'
            : isUnavailable
            ? 'text-white/20'
            : 'text-white/50'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[13px] font-medium',
          isSelected
            ? 'text-charcoal font-bold'
            : isUnavailable
            ? 'text-white/20'
            : 'text-gold'
        )}
      >
        {odd ? odd.toFixed(2) : '—'}
      </span>
    </button>
  )
}