'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBetSlipStore }
  from '@/lib/stores/betSlipStore'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { placeBet }
  from '@/lib/actions/bets'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PlaceBetModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PlaceBetModal({
  isOpen,
  onClose,
}: PlaceBetModalProps) {
  const [loading, setLoading] =
    useState(false)
  const [slipId, setSlipId] = useState('')
  const [success, setSuccess] =
    useState(false)

  const {
    selections,
    stake,
    calculation,
    clearSlip,
    copiedFromSlipId,
  } = useBetSlipStore()

  const { user, isAuthenticated } =
    useAuthStore()
  const router = useRouter()

  const handleConfirm = async () => {
    if (!user || !isAuthenticated) {
      router.push('/login')
      return
    }

    setLoading(true)

    const result = await placeBet({
      selections,
      stake,
      bettorId: user.id,
      placedById: user.id,
      isAnonymous: false,
      copiedFromSlipId:
        copiedFromSlipId ?? undefined,
    })

    if (result.success && result.slipId) {
      setSlipId(result.slipId)
      setSuccess(true)
      clearSlip()
      toast.success(
        `🎉 Bet placed! Slip #${result.slipId}`
      )
    } else {
      toast.error(
        result.error ?? 'Failed to place bet'
      )
      onClose()
    }

    setLoading(false)
  }

  const handleClose = () => {
    setSuccess(false)
    setSlipId('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {success
              ? '🎉 Bet Placed!'
              : 'Confirm Bet'}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-4">
            <p className="text-white/60 text-sm mb-3">
              Your slip ID:
            </p>
            <p className="text-gold font-mono text-3xl font-bold mb-6">
              #{slipId}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleClose()
                  router.push('/bettor-bets')
                }}
                className="flex-1 border border-gold/30 text-gold py-2 rounded-lg text-sm hover:bg-gold/10"
              >
                View My Bets
              </button>
              <button
                onClick={handleClose}
                className="flex-1 bg-gold text-charcoal py-2 rounded-lg text-sm font-semibold hover:bg-gold-light"
              >
                Place Another
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selections */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {selections.map((s) => (
                <div
                  key={`${s.matchMarketId}-${s.selection}`}
                  className="flex justify-between text-xs bg-charcoal/50 rounded px-3 py-1.5"
                >
                  <span className="text-white/60 truncate flex-1">
                    {s.homeTeam} vs {s.awayTeam} — {s.selection}
                  </span>
                  <span className="text-gold font-mono ml-2">
                    {s.odd.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculation */}
            <div className="bg-charcoal/50 rounded-lg p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Stake:</span>
                <span className="text-white font-mono">{formatETB(stake)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Total Odds:</span>
                <span className="text-white font-mono">{calculation.totalOdds.toFixed(2)}</span>
              </div>
              <div className="border-t border-gold/10 my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Max Payout:</span>
                <span className="text-white font-mono">{formatETB(calculation.maxPayout)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Tax (15%):</span>
                <span className="text-nile-danger font-mono">- {formatETB(calculation.winningTax)}</span>
              </div>
              <div className="border-t border-gold/10 my-1" />
              <div className="flex justify-between">
                <span className="text-white font-medium">Net Payout:</span>
                <span className="text-gold font-mono font-bold text-lg">{formatETB(calculation.netPayout)}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm hover:border-white/40 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                  loading
                    ? 'bg-white/10 text-white/30'
                    : 'bg-gold text-charcoal hover:bg-gold-light'
                )}
              >
                {loading
                  ? 'Placing...'
                  : 'Confirm & Place Bet'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}