'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Trophy,
  Shield,
  CheckCircle2,
  XCircle,
  Undo2,
  Clock,
  Ticket,
  Timer,
} from 'lucide-react'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { ConfirmModal }
  from '@/components/shared/ConfirmModal'
import { cancelBet }
  from '@/lib/actions/bets'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { useBetSlipStore }
  from '@/lib/stores/betSlipStore'
import {
  formatETB,
  formatDate,
  formatCountdown,
} from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SlipCardProps {
  slip: any
  onRefresh?: () => void
}

export function SlipCard({
  slip,
  onRefresh,
}: SlipCardProps) {
  const [expanded, setExpanded] =
    useState(false)
  const [showCancel, setShowCancel] =
    useState(false)
  const [cancelling, setCancelling] =
    useState(false)
  const [countdown, setCountdown] =
    useState('')
  const { user } = useAuthStore()
  const { clearSlip, addSelection } =
    useBetSlipStore()
  const router = useRouter()

  const isJackpot =
    slip.slip_id?.startsWith('JP')
  const isWon = slip.status === 'won' || slip.status === 'paid'
  const isNearWin = slip.status === 'near_win'
  const isLost = slip.status === 'lost'
  const isCancelled = slip.status === 'cancelled'
  const isPending = slip.status === 'pending'

  const canCancel =
    slip.status === 'pending' &&
    slip.cancellation_deadline &&
    new Date(slip.cancellation_deadline) >
      new Date()

  // Live countdown
  useEffect(() => {
    if (!canCancel) return
    const interval = setInterval(() => {
      setCountdown(
        formatCountdown(
          slip.cancellation_deadline
        )
      )
    }, 1000)
    setCountdown(
      formatCountdown(
        slip.cancellation_deadline
      )
    )
    return () => clearInterval(interval)
  }, [slip.cancellation_deadline, canCancel])

  const handleCancel = async () => {
    if (!user) return
    setCancelling(true)
    const result = await cancelBet(
      slip.slip_id,
      user.id
    )
    if (result.success) {
      toast.success('Bet cancelled. Stake refunded.')
      setShowCancel(false)
      onRefresh?.()
    } else {
      toast.error(result.error ?? 'Failed to cancel')
    }
    setCancelling(false)
  }

  const handleCopySlip = () => {
    const selections =
      slip.slip_selections ?? []
    if (selections.length === 0) return

    clearSlip()
    selections.forEach((s: any) => {
      const match = s.matches
      const market = s.match_markets
      const template =
        market?.market_templates
      addSelection({
        matchId: match?.id ?? s.match_id,
        matchMarketId:
          market?.id ?? s.match_market_id,
        homeTeam: match?.home_team ?? '',
        awayTeam: match?.away_team ?? '',
        leagueName: '',
        countryFlag: '',
        marketName: template?.name ?? '',
        categoryName:
          template?.market_categories
            ?.name ?? '',
        selection: s.selection,
        odd: s.odd_at_placement,
        kickOffTime:
          match?.kick_off_time ?? '',
        matchStatus:
          match?.status ?? 'upcoming',
      })
    })
    toast.success('Selections copied to slip!')
    router.push('/')
  }

  // Card visual language, driven off a single status classification.
  const styleMap = {
    won: {
      border: 'border-gold/40',
      bg: 'bg-gradient-to-br from-gold/[0.06] to-transparent',
      accent: 'text-gold',
    },
    nearWin: {
      border: 'border-nile-success/30',
      bg: 'bg-gradient-to-br from-nile-success/[0.05] to-transparent',
      accent: 'text-nile-success',
    },
    lost: {
      border: 'border-nile-danger/15',
      bg: '',
      accent: 'text-nile-danger',
    },
    cancelled: {
      border: 'border-white/10',
      bg: '',
      accent: 'text-white/40',
    },
    pending: {
      border: 'border-nile-blue/30',
      bg: '',
      accent: 'text-nile-blue-light',
    },
  }
  const style = isWon
    ? styleMap.won
    : isNearWin
    ? styleMap.nearWin
    : isLost
    ? styleMap.lost
    : isCancelled
    ? styleMap.cancelled
    : styleMap.pending

  return (
    <>
      <div
        className={cn(
          'rounded-2xl border overflow-hidden transition-all hover:border-opacity-70',
          style.border,
          style.bg
        )}
      >
        {/* Status banner */}
        {isWon && (
          <div className="bg-gold/10 border-b border-gold/20 px-4 py-2 flex items-center justify-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-gold" />
            <span className="text-gold font-semibold text-xs tracking-wide">
              YOU WON
            </span>
          </div>
        )}
        {isNearWin && (
          <div className="bg-nile-success/10 border-b border-nile-success/20 px-4 py-2 text-center">
            <span className="text-nile-success font-semibold text-xs flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Insurance Applied — {formatETB(slip.insurance_payout)} credited
            </span>
            {(slip.insurance_tax ?? 0) > 0 && (
              <span className="block text-white/35 text-[10px] mt-0.5">
                Tax of {formatETB(slip.insurance_tax)} already deducted
              </span>
            )}
          </div>
        )}

        {/* Main row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full bg-slate-dark px-3.5 py-3 md:px-4 md:py-3.5 flex items-center gap-3 text-left"
        >
          {/* Left: icon + id + meta */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                isWon ? 'bg-gold/15' : isNearWin ? 'bg-nile-success/15' : 'bg-nile-blue/10'
              )}
            >
              <Ticket className={cn('w-4 h-4', style.accent)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isJackpot && (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-gold/20 text-gold border border-gold/30 px-1.5 py-0.5 rounded-full font-semibold">
                    <Trophy className="w-2.5 h-2.5" /> JACKPOT
                  </span>
                )}
                <span className="text-gold font-mono font-bold text-sm truncate">
                  #{slip.slip_id}
                </span>
              </div>
              <p className="text-white/35 text-[11px] mt-0.5 truncate">
                {formatDate(slip.created_at)} · {slip.slip_selections?.length ?? 0} selection
                {slip.slip_selections?.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/* Right: status + amounts + chevron */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <div className="hidden sm:block">
              <StatusBadge status={slip.status} type="slip" />
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[11px]">
                {formatETB(slip.stake)}
              </p>
              {(isWon || isNearWin) && (
                <p className="text-nile-success text-xs md:text-sm font-mono font-semibold">
                  +{formatETB(slip.net_payout)}
                </p>
              )}
            </div>
            <div className="sm:hidden">
              <StatusBadge status={slip.status} type="slip" />
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-white/30" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/30" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="bg-charcoal border-t border-nile-blue/20 p-3.5 md:p-4">
            {/* Selections */}
            <div className="space-y-1.5 mb-4">
              {(slip.slip_selections ?? []).map((sel: any, i: number) => {
                const match = sel.matches
                const market = sel.match_markets
                const template = market?.market_templates
                const ResultIcon =
                  sel.result === 'won'
                    ? CheckCircle2
                    : sel.result === 'lost'
                    ? XCircle
                    : sel.result === 'void'
                    ? Undo2
                    : Clock
                const resultColor =
                  sel.result === 'won'
                    ? 'text-nile-success'
                    : sel.result === 'lost'
                    ? 'text-nile-danger'
                    : sel.result === 'void'
                    ? 'text-white/40'
                    : 'text-gold/50'

                return (
                  <div
                    key={sel.id ?? i}
                    className="bg-slate-dark/60 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white/45 text-[11px] truncate">
                        {match?.home_team} vs {match?.away_team}
                      </p>
                      <p className="text-white/35 text-[10px]">
                        {template?.name}
                      </p>
                      <p className="text-white text-sm font-medium truncate">
                        {sel.selection}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gold font-mono text-sm font-semibold">
                        {sel.odd_at_placement?.toFixed(2)}
                      </span>
                      <ResultIcon className={cn('w-4 h-4', resultColor)} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Calculation */}
            <div className="bg-slate-dark/40 rounded-xl px-3.5 py-3 space-y-1.5 mb-3.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/45">Stake</span>
                <span className="text-white font-mono">{formatETB(slip.stake)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/45">Total Odds</span>
                <span className="text-white font-mono">{slip.total_odds?.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/5 my-1.5" />
              <div className="flex justify-between text-xs">
                <span className="text-white/45">Max Payout</span>
                <span className="text-white font-mono">{formatETB(slip.max_payout)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/45">Tax (15%)</span>
                <span className="text-nile-danger font-mono">-{formatETB(slip.winning_tax)}</span>
              </div>
              <div className="border-t border-white/5 my-1.5" />
              <div className="flex justify-between items-center">
                <span className="text-white font-medium text-xs">Net Payout</span>
                <span className="text-gold font-mono font-bold text-base">
                  {formatETB(slip.net_payout)}
                </span>
              </div>
            </div>

            {/* Cancel timer */}
            {canCancel && (
              <div className="flex items-center justify-between bg-nile-orange/10 border border-nile-orange/25 rounded-xl px-3.5 py-2.5 mb-3.5">
                <span className="text-nile-orange text-xs flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  Cancel within: <span className="font-mono font-semibold">{countdown}</span>
                </span>
                <button
                  onClick={() => setShowCancel(true)}
                  className="text-xs border border-nile-danger/40 text-nile-danger px-3 py-1.5 rounded-lg hover:bg-nile-danger/10 font-medium"
                >
                  Cancel Bet
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(slip.slip_id)
                  toast.success('Slip ID copied!')
                }}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-nile-blue/30 text-white/60 px-3 py-2 rounded-xl hover:border-gold/30 hover:text-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy ID
              </button>
              <button
                onClick={handleCopySlip}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-nile-blue/30 text-white/60 px-3 py-2 rounded-xl hover:border-gold/30 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Copy Selections
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        title="Cancel Bet?"
        message={`Cancel slip #${slip.slip_id}? ETB ${slip.stake} will be refunded to your balance.`}
        confirmText="Yes, Cancel Bet"
        variant="danger"
        isLoading={cancelling}
      />
    </>
  )
}
