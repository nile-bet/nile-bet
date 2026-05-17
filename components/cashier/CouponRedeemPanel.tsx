'use client'

import { useState } from 'react'
import { lookupCouponByAgent, approveCouponByAgent } from '@/lib/actions/agent'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatETB, formatCountdown } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Check, X, Search } from 'lucide-react'

interface Props {
  onClose?: () => void
}

export function CouponRedeemPanel({ onClose }: Props) {
  const { user } = useAuthStore()
  const [code, setCode] = useState('')
  const [lookedUp, setLookedUp] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)

  const handleLookup = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setLookedUp(null)
    setError('')
    const result = await lookupCouponByAgent(code)
    if (result.success) {
      setLookedUp(result.coupon)
    } else {
      setError(result.error ?? 'Coupon not found')
    }
    setLoading(false)
  }

  const handleApprove = async () => {
    if (!user || !lookedUp) return
    setApproving(true)
    const result = await approveCouponByAgent(code, user.id)
    if (result.success) {
      toast.success('Coupon approved!')
      setLookedUp(null)
      setCode('')
      onClose?.()
    } else {
      toast.error(result.error)
    }
    setApproving(false)
  }

  const isInsufficient =
    lookedUp?.type === 'topup' &&
    (user?.credit_balance ?? 0) < (lookedUp?.amount ?? 0)

  return (
    <div className="space-y-4 p-1">
      {/* Code input row */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          placeholder="000000"
          maxLength={6}
          autoFocus
          className="flex-1 bg-charcoal border-2 border-gold/40 rounded-xl px-4 py-3 text-gold font-mono text-2xl text-center focus:outline-none focus:border-gold tracking-[0.4em]"
        />
        <button
          onClick={handleLookup}
          disabled={code.length !== 6 || loading}
          className={cn(
            'px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-1.5 whitespace-nowrap',
            code.length === 6 && !loading
              ? 'bg-gold text-charcoal hover:bg-gold-light'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          )}
        >
          <Search className="w-4 h-4" />
          {loading ? '...' : 'Look Up'}
        </button>
      </div>

      {/* Balance */}
      <div className="flex justify-between items-center text-sm bg-charcoal/50 rounded-lg px-4 py-2.5">
        <span className="text-white/50">Your Balance:</span>
        <span className="text-gold font-mono font-bold text-base">
          {formatETB(user?.credit_balance ?? 0)}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg px-4 py-3">
          <p className="text-nile-danger text-sm">❌ {error}</p>
        </div>
      )}

      {/* Coupon details */}
      {lookedUp && (
        <div className="bg-nile-blue/20 border border-gold/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-xs">Bettor</p>
              <p className="text-white font-semibold text-lg">@{lookedUp.bettor?.username}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Amount</p>
              <p className="text-gold font-mono text-2xl font-bold">{formatETB(lookedUp.amount)}</p>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full font-semibold uppercase',
              lookedUp.type === 'topup'
                ? 'bg-nile-success/20 text-nile-success border border-nile-success/30'
                : 'bg-nile-orange/20 text-nile-orange border border-nile-orange/30'
            )}>
              {lookedUp.type === 'topup' ? '⬆ Top-up' : '⬇ Withdrawal'}
            </span>
            <span className="text-nile-orange text-xs">
              ⏱ {formatCountdown(lookedUp.expires_at)}
            </span>
          </div>

          {lookedUp.type === 'topup' && (
            <div className="bg-charcoal/50 rounded-lg px-3 py-2 text-sm flex justify-between">
              <span className="text-white/50">Balance after:</span>
              <span className={cn('font-mono font-bold', isInsufficient ? 'text-nile-danger' : 'text-nile-success')}>
                {formatETB((user?.credit_balance ?? 0) - (lookedUp.amount ?? 0))}
              </span>
            </div>
          )}

          {lookedUp.type === 'withdrawal' && (
            <div className="bg-nile-success/10 border border-nile-success/20 rounded-lg px-3 py-2">
              <p className="text-nile-success text-sm font-medium">
                💵 Give bettor {formatETB(lookedUp.amount)} cash
              </p>
            </div>
          )}

          {isInsufficient && (
            <p className="text-nile-danger text-xs">⚠️ Insufficient balance. Request credits from your agent.</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleApprove}
              disabled={approving || isInsufficient}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold',
                !approving && !isInsufficient
                  ? 'bg-nile-success text-white hover:bg-nile-success/80'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              <Check className="w-4 h-4" />
              {approving ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => { setLookedUp(null); setCode('') }}
              className="flex-1 flex items-center justify-center gap-2 border border-nile-danger/40 text-nile-danger py-2.5 rounded-lg text-sm font-bold hover:bg-nile-danger/10"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
