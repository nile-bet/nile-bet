'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
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
        countryFlag: '🏳️',
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

  const borderColor =
    slip.status === 'won'
      ? 'border-nile-success/30'
      : slip.status === 'lost'
      ? 'border-nile-danger/20'
      : slip.status === 'near_win'
      ? 'border-gold/40'
      : slip.status === 'cancelled'
      ? 'border-white/10'
      : 'border-nile-blue/30'

  const bgTint =
    slip.status === 'won'
      ? 'bg-nile-success/5'
      : slip.status === 'near_win'
      ? 'bg-gold/5'
      : ''

  return (
    <>
      <div
        className={cn(
          'rounded-xl border overflow-hidden',
          borderColor,
          bgTint
        )}
      >
        {/* Won banner */}
        {slip.status === 'won' && (
          <div className="bg-nile-success/20 border-b border-nile-success/30 px-4 py-2 text-center">
            <span className="text-nile-success font-semibold text-sm">
              🎉 You Won!
            </span>
          </div>
        )}

        {/* Near win banner */}
        {slip.status === 'near_win' && (
          <div className="bg-gold/10 border-b border-gold/30 px-4 py-2 text-center">
            <span className="text-gold font-semibold text-sm">
              🛡️ Insurance Applied —{' '}
              {formatETB(
                slip.insurance_payout
              )}{' '}
              credited
            </span>
            {(slip.insurance_tax ?? 0) > 0 && (
              <span className="block text-white/40 text-[10px] mt-0.5">
                Tax of {formatETB(slip.insurance_tax)} already deducted
              </span>
            )}
          </div>
        )}

        {/* Main row */}
        <div className="bg-slate-dark px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {isJackpot && (
                  <span className="text-[10px] bg-gold/20 text-gold border border-gold/30 px-1.5 py-0.5 rounded">
                    🏆 JACKPOT
                  </span>
                )}
                <span className="text-gold font-mono font-bold text-sm">
                  #{slip.slip_id}
                </span>
              </div>
              <p className="text-white/40 text-xs mt-0.5">
                {formatDate(slip.created_at)}{' '}
                •{' '}
                {
                  slip.slip_selections
                    ?.length
                }{' '}
                selections
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge
                status={slip.status}
                type="slip"
              />
              <div className="text-right">
                <p className="text-white/50 text-xs">
                  Stake:{' '}
                  {formatETB(slip.stake)}
                </p>
                {(slip.status === 'won' ||
                  slip.status ===
                    'near_win') && (
                  <p className="text-nile-success text-xs font-mono">
                    +{formatETB(slip.net_payout)}
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  setExpanded(!expanded)
                }
                className="text-white/40 hover:text-white"
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="bg-charcoal border-t border-nile-blue/20 p-4">
            {/* Selections */}
            <div className="space-y-2 mb-4">
              {(
                slip.slip_selections ?? []
              ).map((sel: any, i: number) => {
                const match = sel.matches
                const market =
                  sel.match_markets
                const template =
                  market?.market_templates
                const resultIcon =
                  sel.result === 'won'
                    ? '✅'
                    : sel.result === 'lost'
                    ? '❌'
                    : sel.result === 'void'
                    ? '↩️'
                    : '⏳'

                return (
                  <div
                    key={sel.id ?? i}
                    className="bg-slate-dark/50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-xs truncate">
                        {match?.home_team} vs{' '}
                        {match?.away_team}
                      </p>
                      <p className="text-white/40 text-xs">
                        {template?.name}
                      </p>
                      <p className="text-white text-sm font-medium">
                        {sel.selection}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gold font-mono text-sm">
                        {sel.odd_at_placement?.toFixed(
                          2
                        )}
                      </span>
                      <span className="text-lg">
                        {resultIcon}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Calculation */}
            <div className="border-t border-gold/10 pt-3 space-y-1 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">
                  Stake:
                </span>
                <span className="text-white font-mono">
                  {formatETB(slip.stake)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">
                  Total Odds:
                </span>
                <span className="text-white font-mono">
                  {slip.total_odds?.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gold/10 my-1" />
              <div className="flex justify-between text-xs">
                <span className="text-white/50">
                  Max Payout:
                </span>
                <span className="text-white font-mono">
                  {formatETB(slip.max_payout)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">
                  Tax (15%):
                </span>
                <span className="text-nile-danger font-mono">
                  -{formatETB(slip.winning_tax)}
                </span>
              </div>
              <div className="border-t border-gold/10 my-1" />
              <div className="flex justify-between">
                <span className="text-white font-medium text-xs">
                  Net Payout:
                </span>
                <span className="text-gold font-mono font-bold">
                  {formatETB(slip.net_payout)}
                </span>
              </div>
            </div>

            {/* Cancel timer */}
            {canCancel && (
              <div className="flex items-center justify-between bg-nile-orange/10 border border-nile-orange/30 rounded-lg px-3 py-2 mb-3">
                <span className="text-nile-orange text-xs">
                  Cancel within: {countdown}
                </span>
                <button
                  onClick={() =>
                    setShowCancel(true)
                  }
                  className="text-xs border border-nile-danger/40 text-nile-danger px-3 py-1 rounded-lg hover:bg-nile-danger/10"
                >
                  Cancel Bet
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    slip.slip_id
                  )
                  toast.success('Slip ID copied!')
                }}
                className="flex items-center gap-1.5 text-xs border border-nile-blue/30 text-white/60 px-3 py-1.5 rounded-lg hover:border-gold/30 hover:text-white"
              >
                <Copy className="w-3 h-3" />
                Copy ID
              </button>
              <button
                onClick={handleCopySlip}
                className="flex items-center gap-1.5 text-xs border border-nile-blue/30 text-white/60 px-3 py-1.5 rounded-lg hover:border-gold/30 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
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