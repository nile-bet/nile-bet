'use client'

import { useState, useRef, useEffect } from 'react'
import { lookupCouponByAgent, approveCouponByAgent } from '@/lib/actions/agent'
import { getSlipById, redeemWinningSlip } from '@/lib/actions/bets'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatETB, formatCountdown } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Check, X, Search, Scan, Trophy, Ticket, ArrowRight, AlertTriangle } from 'lucide-react'

type Mode = 'slip' | 'coupon'

interface Props {
  onClose?: () => void
}

export function CouponRedeemPanel({ onClose }: Props) {
  const { user } = useAuthStore()
  const [mode, setMode] = useState<Mode>('slip')
  const [code, setCode] = useState('')
  const [lookedUp, setLookedUp] = useState<any>(null)
  const [slipData, setSlipData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input and support barcode scanner
  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  // Barcode scanner support — scanners type fast and hit Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLookup()
    }
  }

  const resetState = () => {
    setCode('')
    setLookedUp(null)
    setSlipData(null)
    setError('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleLookup = async () => {
    const val = code.trim().toUpperCase()
    if (!val) return
    if (mode === 'slip' && val.length !== 8 && !(val.startsWith('JP') && val.length === 10)) {
      setError('Slip ID must be 8 digits (or JP + 8 digits for jackpot)')
      return
    }
    if (mode === 'coupon' && val.length !== 6) {
      setError('Coupon code must be 6 digits')
      return
    }

    setLoading(true)
    setLookedUp(null)
    setSlipData(null)
    setError('')

    if (mode === 'slip') {
      const slip = await getSlipById(val)
      if (!slip) {
        setError('Slip not found')
      } else {
        setSlipData(slip)
      }
    } else {
      const result = await lookupCouponByAgent(val)
      if (result.success) {
        setLookedUp(result.coupon)
      } else {
        setError(result.error ?? 'Coupon not found')
      }
    }
    setLoading(false)
  }

  const handleRedeemSlip = async () => {
    if (!user || !slipData) return
    setApproving(true)
    const result = await redeemWinningSlip(slipData.slip_id, user.id)
    if (result.success) {
      toast.success(`✅ Paid ${formatETB(result.amount!)} — Slip redeemed!`)
      resetState()
      onClose?.()
    } else {
      toast.error(result.error)
    }
    setApproving(false)
  }

  const handleApproveCoupon = async () => {
    if (!user || !lookedUp) return
    setApproving(true)
    const result = await approveCouponByAgent(code.trim(), user.id)
    if (result.success) {
      toast.success('Coupon approved!')
      resetState()
      onClose?.()
    } else {
      toast.error(result.error)
    }
    setApproving(false)
  }

  const isInsufficient = mode === 'coupon'
    ? lookedUp?.type === 'topup' && (user?.credit_balance ?? 0) < (lookedUp?.amount ?? 0)
    : slipData?.status === 'won' && (user?.credit_balance ?? 0) < (slipData?.net_payout ?? 0)

  const slipStatusColor: Record<string, string> = {
    won: 'text-nile-success',
    lost: 'text-nile-danger',
    pending: 'text-nile-orange',
    paid: 'text-white/40',
    cancelled: 'text-white/40',
  }

  const slipStatusLabel: Record<string, string> = {
    won: '🏆 WON',
    lost: '❌ LOST',
    pending: '⏳ PENDING',
    paid: '✅ PAID',
    cancelled: '🚫 CANCELLED',
  }

  const placeholder = mode === 'slip' ? '12345678 or scan barcode' : '6-digit code'
  const maxLen = mode === 'slip' ? 10 : 6

  return (
    <div className="space-y-4">

      {/* Mode tabs */}
      <div className="grid grid-cols-2 gap-2 bg-charcoal rounded-xl p-1">
        <button
          onClick={() => { setMode('slip'); resetState() }}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
            mode === 'slip' ? 'bg-gold text-charcoal' : 'text-white/50 hover:text-white'
          )}
        >
          <Trophy className="w-4 h-4" />
          Winning Slip
        </button>
        <button
          onClick={() => { setMode('coupon'); resetState() }}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
            mode === 'coupon' ? 'bg-gold text-charcoal' : 'text-white/50 hover:text-white'
          )}
        >
          <Ticket className="w-4 h-4" />
          Coupon
        </button>
      </div>

      {/* Balance bar */}
      <div className="flex justify-between items-center bg-nile-blue/20 border border-nile-blue/30 rounded-xl px-4 py-3">
        <span className="text-white/60 text-xs uppercase tracking-wider">Your Balance</span>
        <span className="text-gold font-mono font-bold text-lg">{formatETB(user?.credit_balance ?? 0)}</span>
      </div>

      {/* Input + scan */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/40" />
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => {
                const val = mode === 'slip'
                  ? e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, maxLen)
                  : e.target.value.replace(/[^0-9]/g, '').slice(0, maxLen)
                setCode(val)
                setError('')
                // Auto-trigger if barcode scanner fills exact length
                if (mode === 'slip' && (val.length === 8 || val.length === 10)) {
                  setTimeout(() => inputRef.current?.blur(), 50)
                }
                if (mode === 'coupon' && val.length === 6) {
                  setTimeout(() => inputRef.current?.blur(), 50)
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLen}
              className="w-full bg-charcoal border-2 border-gold/30 rounded-xl pl-10 pr-4 py-3 text-gold font-mono text-xl text-center focus:outline-none focus:border-gold tracking-[0.3em] placeholder:text-white/20 placeholder:text-sm placeholder:tracking-normal"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={!code.trim() || loading}
            className={cn(
              'px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-1.5 whitespace-nowrap transition-all',
              code.trim() && !loading
                ? 'bg-gold text-charcoal hover:bg-gold-light'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            <Search className="w-4 h-4" />
            {loading ? '...' : 'Find'}
          </button>
        </div>
        <p className="text-white/30 text-xs mt-1.5 text-center">
          {mode === 'slip' ? '🔍 Enter 8-digit slip ID or scan barcode' : '🔢 Enter 6-digit coupon code'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-nile-danger/10 border border-nile-danger/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-nile-danger flex-shrink-0" />
          <p className="text-nile-danger text-sm">{error}</p>
        </div>
      )}

      {/* ── SLIP RESULT ── */}
      {slipData && (
        <div className={cn(
          'border rounded-2xl overflow-hidden',
          slipData.status === 'won' ? 'border-nile-success/40' : 'border-white/10'
        )}>
          {/* Status banner */}
          <div className={cn(
            'px-4 py-3 flex items-center justify-between',
            slipData.status === 'won' ? 'bg-nile-success/10' :
            slipData.status === 'lost' ? 'bg-nile-danger/10' :
            slipData.status === 'paid' ? 'bg-white/5' : 'bg-nile-orange/10'
          )}>
            <span className="text-xs text-white/50 font-mono">{slipData.slip_id}</span>
            <span className={cn('font-bold text-sm', slipStatusColor[slipData.status] ?? 'text-white')}>
              {slipStatusLabel[slipData.status] ?? slipData.status}
            </span>
          </div>

          <div className="p-4 space-y-3 bg-slate-dark/50">
            {/* Bettor + payout */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs">Bettor</p>
                <p className="text-white font-semibold">
                  {slipData.is_anonymous ? '🎭 Anonymous' : `@${slipData.bettor?.username ?? '—'}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs">Net Payout</p>
                <p className={cn('font-mono font-bold text-2xl', slipData.status === 'won' ? 'text-nile-success' : 'text-white/40')}>
                  {formatETB(slipData.net_payout)}
                </p>
              </div>
            </div>

            {/* Stake + odds */}
            <div className="grid grid-cols-3 gap-2 bg-charcoal/50 rounded-xl p-3 text-center">
              <div>
                <p className="text-white/40 text-[10px] uppercase">Stake</p>
                <p className="text-white font-mono text-sm font-bold">{formatETB(slipData.stake)}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase">Odds</p>
                <p className="text-gold font-mono text-sm font-bold">{slipData.total_odds?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase">Selections</p>
                <p className="text-white font-mono text-sm font-bold">{slipData.slip_selections?.length ?? slipData.jackpot_slip_selections?.length ?? '—'}</p>
              </div>
            </div>

            {/* Won — show payout action */}
            {slipData.status === 'won' && (
              <>
                <div className="bg-nile-success/10 border border-nile-success/20 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-nile-success/20 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-nile-success" />
                  </div>
                  <div>
                    <p className="text-nile-success font-bold text-sm">Winning Slip!</p>
                    <p className="text-white/60 text-xs">Pay bettor {formatETB(slipData.net_payout)} cash</p>
                  </div>
                </div>

                {isInsufficient && (
                  <div className="flex items-center gap-2 bg-nile-danger/10 border border-nile-danger/30 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-nile-danger flex-shrink-0" />
                    <p className="text-nile-danger text-xs">Insufficient balance — request credits from your agent</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleRedeemSlip}
                    disabled={approving || isInsufficient}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
                      !approving && !isInsufficient
                        ? 'bg-nile-success text-white hover:bg-nile-success/80'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    )}
                  >
                    <Check className="w-4 h-4" />
                    {approving ? 'Processing...' : `Pay ${formatETB(slipData.net_payout)}`}
                  </button>
                  <button
                    onClick={resetState}
                    className="px-4 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {slipData.status === 'paid' && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-white/40 text-sm">✅ This slip has already been paid out</p>
              </div>
            )}

            {slipData.status === 'lost' && (
              <div className="bg-nile-danger/10 rounded-xl p-3 text-center">
                <p className="text-nile-danger text-sm font-medium">This slip lost — no payout</p>
              </div>
            )}

            {slipData.status === 'pending' && (
              <div className="bg-nile-orange/10 rounded-xl p-3 text-center">
                <p className="text-nile-orange text-sm">Matches still in progress</p>
              </div>
            )}

            {!['won','paid','lost','pending'].includes(slipData.status) && (
              <button onClick={resetState} className="w-full text-white/40 text-xs text-center hover:text-white">
                ← Search again
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── COUPON RESULT ── */}
      {lookedUp && (
        <div className="border border-gold/30 rounded-2xl overflow-hidden">
          <div className="bg-gold/10 px-4 py-3 flex items-center justify-between">
            <span className="text-gold font-mono font-bold tracking-widest">{code}</span>
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full font-bold uppercase',
              lookedUp.type === 'topup'
                ? 'bg-nile-success/20 text-nile-success border border-nile-success/30'
                : 'bg-nile-orange/20 text-nile-orange border border-nile-orange/30'
            )}>
              {lookedUp.type === 'topup' ? '⬆ Top-up' : '⬇ Withdrawal'}
            </span>
          </div>

          <div className="p-4 space-y-3 bg-slate-dark/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs">Bettor</p>
                <p className="text-white font-semibold text-lg">@{lookedUp.bettor?.username}</p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs">Amount</p>
                <p className="text-gold font-mono text-2xl font-bold">{formatETB(lookedUp.amount)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-nile-orange">
              <span>⏱ Expires: {formatCountdown(lookedUp.expires_at)}</span>
            </div>

            {lookedUp.type === 'topup' && (
              <div className="bg-charcoal/50 rounded-xl px-4 py-3 flex justify-between text-sm">
                <span className="text-white/50">Your balance after:</span>
                <span className={cn('font-mono font-bold', isInsufficient ? 'text-nile-danger' : 'text-nile-success')}>
                  {formatETB((user?.credit_balance ?? 0) - (lookedUp.amount ?? 0))}
                </span>
              </div>
            )}

            {lookedUp.type === 'withdrawal' && (
              <div className="bg-nile-success/10 border border-nile-success/20 rounded-xl px-4 py-3">
                <p className="text-nile-success text-sm font-medium">💵 Give bettor {formatETB(lookedUp.amount)} cash</p>
              </div>
            )}

            {isInsufficient && (
              <div className="flex items-center gap-2 bg-nile-danger/10 border border-nile-danger/30 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 text-nile-danger flex-shrink-0" />
                <p className="text-nile-danger text-xs">Insufficient balance — request credits from your agent</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleApproveCoupon}
                disabled={approving || isInsufficient}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
                  !approving && !isInsufficient
                    ? 'bg-nile-success text-white hover:bg-nile-success/80'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                <Check className="w-4 h-4" />
                {approving ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={resetState}
                className="flex-1 flex items-center justify-center gap-2 border border-nile-danger/30 text-nile-danger py-3 rounded-xl text-sm font-bold hover:bg-nile-danger/10 transition-all"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
