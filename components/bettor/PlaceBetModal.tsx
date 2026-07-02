'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { placeBet }
  from '@/lib/actions/bets'
import { useBetSlipStore }
  from '@/lib/stores/betSlipStore'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { PrintReceiptModal }
  from '@/components/cashier/PrintReceiptModal'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  X,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react'

interface PlaceBetModalProps {
  isOpen: boolean
  onClose: () => void
  forceNamed?: boolean
}

export function PlaceBetModal({
  isOpen,
  onClose,
  forceNamed = false,
}: PlaceBetModalProps) {
  const {
    selections,
    stake,
    setStake,
    calculation,
    removeSelection,
    clearSlip,
    selectedBettorId,
    selectedBettorName,
  } = useBetSlipStore()
  const { totalOdds, maxPayout, netPayout, winningTax } = calculation
  const insuranceApplied = false

  const { user, settings } = useAuthStore()

  const [isAnonymous, setIsAnonymous] =
    useState(forceNamed ? false : true) // default anonymous for cashier-placed bets
  const [placing, setPlacing] =
    useState(false)

  // Receipt
  const [showReceipt, setShowReceipt] =
    useState(false)
  const [receiptData, setReceiptData] =
    useState<any>(null)

  const minStake =
    settings?.minStake ?? 10
  const minSelections =
    settings?.minSelections ?? 4

  const stakeNum = stake || 0
  const balance = user?.credit_balance ?? 0

  const errors: string[] = []
  if (
    selections.length < minSelections
  ) {
    errors.push(
      `Minimum ${minSelections} selections required`
    )
  }
  if (stakeNum < minStake) {
    errors.push(
      `Minimum stake is ${formatETB(minStake)}`
    )
  }
  if (stakeNum > balance) {
    errors.push('Insufficient balance')
  }
  if (stakeNum <= 0) {
    errors.push('Enter a valid stake')
  }

  const canPlace =
    errors.length === 0 && !placing

  const isStaffPlacing = user?.role === 'cashier' || user?.role === 'agent'

  const handlePlace = async () => {
    if (!canPlace || !user) return
    if (isStaffPlacing && forceNamed && !selectedBettorId) {
      toast.error('Select a bettor before placing a named bet')
      return
    }
    setPlacing(true)

    const effectiveBettorId = isStaffPlacing && selectedBettorId ? selectedBettorId : user.id

    const result = await placeBet({
      selections: selections.map((s) => ({
        ...s,
        matchId: s.matchId,
        matchMarketId: s.matchMarketId,
        selection: s.selection,
        odd: s.odd,
      })),
      stake: stakeNum,
      bettorId: effectiveBettorId,
      placedById: user.id,
      isAnonymous: forceNamed ? false : isAnonymous,
    })

    if (result.success && result.slipId) {
      toast.success(
        `Bet placed! Slip #${result.slipId}`
      )

      const effectiveAnonymous = forceNamed ? false : isAnonymous

      // Build receipt data
      setReceiptData({
        slipId: result.slipId,
        stake: stakeNum,
        totalOdds,
        maxPayout,
        netPayout,
        winningTax,
        taxPercent: settings?.winningTaxPercent ?? 15,
        insuranceApplied,
        isAnonymous: effectiveAnonymous,
        bettorUsername: effectiveAnonymous
          ? undefined
          : isStaffPlacing
          ? (selectedBettorName ?? undefined)
          : user.username,
        cashierUsername:
          user.role === 'cashier'
            ? user.username
            : undefined,
        agentUsername:
          user.role === 'agent'
            ? user.username
            : undefined,
        placedAt: new Date().toISOString(),
        selections: selections.map((s) => ({
          matchName: `${s.homeTeam} vs ${s.awayTeam}`,
          leagueName: s.leagueName,
          kickOffTime: s.kickOffTime,
          marketName: s.marketName,
          selection: s.selection,
          odd: s.odd,
        })),
      })

      clearSlip()
      onClose()
      setShowReceipt(true)
    } else {
      toast.error(
        result.error ?? 'Failed to place bet'
      )
    }

    setPlacing(false)
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={onClose}
      >
        <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-lg w-full" style={{ maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle className="text-white">
              Place Bet
            </DialogTitle>
          </DialogHeader>

          {selections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/40">
                No selections yet
              </p>
              <p className="text-white/30 text-sm mt-1">
                Add matches to your slip
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selections list */}
              <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-hide">
                {selections.map((sel, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-charcoal/50 rounded-lg px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-xs truncate">
                        {sel.homeTeam} vs{' '}
                        {sel.awayTeam}
                      </p>
                      <p className="text-white text-sm">
                        {sel.selection}
                      </p>
                      <p className="text-white/40 text-xs">
                        {sel.marketName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gold font-mono text-sm font-bold">
                        {sel.odd.toFixed(2)}
                      </span>
                      <button
                        onClick={() =>
                          removeSelection(
                            sel.matchMarketId,
                            sel.selection
                          )
                        }
                        className="text-white/30 hover:text-nile-danger"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Insurance badge */}
              {insuranceApplied && (
                <div className="bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 text-xs text-gold flex items-center gap-2">
                  🛡️ Insurance active — miss
                  1-2 and still get payout
                </div>
              )}

              {/* Validation errors */}
              {errors.map((e) => (
                <div
                  key={e}
                  className="flex items-center gap-2 text-nile-danger text-xs"
                >
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {e}
                </div>
              ))}

              {/* Stake input */}
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Stake (ETB)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) =>
                      setStake(parseFloat(e.target.value) || 0)
                    }
                    placeholder={`Min: ${formatETB(minStake)}`}
                    min={minStake}
                    className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white font-mono focus:outline-none"
                  />
                </div>
                <p className="text-white/30 text-xs mt-1">
                  Balance:{' '}
                  {formatETB(balance)}
                </p>
              </div>

              {/* Quick stake buttons */}
              <div className="flex gap-2 flex-wrap">
                {[10, 20, 50, 100, 200].map(
                  (amt) => (
                    <button
                      key={amt}
                      onClick={() =>
                        setStake(amt)
                      }
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-full border',
                        stake === amt
                          ? 'bg-gold border-gold text-charcoal font-semibold'
                          : 'border-gold/30 text-gold hover:bg-gold/10'
                      )}
                    >
                      {amt}
                    </button>
                  )
                )}
              </div>

              {/* Calculation */}
              {stakeNum > 0 && (
                <div className="bg-charcoal/50 rounded-xl p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      Selections:
                    </span>
                    <span className="text-white">
                      {selections.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      Total Odds:
                    </span>
                    <span className="text-white font-mono">
                      {totalOdds.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      Max Payout:
                    </span>
                    <span className="text-white font-mono">
                      {formatETB(maxPayout)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      Tax (15%):
                    </span>
                    <span className="text-nile-danger font-mono">
                      -{formatETB(winningTax)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gold/10 pt-1 mt-1">
                    <span className="text-white font-medium">
                      Net Win:
                    </span>
                    <span className="text-gold font-mono font-bold">
                      {formatETB(netPayout)}
                    </span>
                  </div>
                </div>
              )}

              {/* Anonymous toggle (hidden for cashier-forced named bets) */}
              {!forceNamed && (
                <button
                  onClick={() =>
                    setIsAnonymous(!isAnonymous)
                  }
                  className={cn(
                    'flex items-center gap-2 text-xs px-3 py-2 rounded-lg border w-full',
                    isAnonymous
                      ? 'border-nile-orange/40 text-nile-orange bg-nile-orange/10'
                      : 'border-nile-blue/30 text-white/50 hover:text-white'
                  )}
                >
                  {isAnonymous ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <Unlock className="w-3 h-3" />
                  )}
                  {isAnonymous
                    ? 'Placing anonymously'
                    : 'Place anonymously'}
                </button>
              )}

              {/* Place button */}
              <button
                onClick={handlePlace}
                disabled={!canPlace}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-bold transition-colors',
                  canPlace
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                {placing
                  ? 'Placing...'
                  : `Place Bet — ${formatETB(stakeNum)}`}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Receipt after bet */}
      {receiptData && (
        <PrintReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false)
            setReceiptData(null)
          }}
          slipData={receiptData}
        />
      )}
    </>
  )
}