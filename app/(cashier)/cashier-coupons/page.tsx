'use client'

import { useState } from 'react'
import { lookupCouponByAgent, approveCouponByAgent } from '@/lib/actions/agent'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatETB, formatCountdown } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

export default function CashierCouponsPage() {
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
    const result = await lookupCouponByAgent(code.trim())
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
    const result = await approveCouponByAgent(code.trim(), user.id)
    if (result.success) {
      toast.success('Coupon approved!')
      setLookedUp(null)
      setCode('')
    } else {
      toast.error(result.error)
    }
    setApproving(false)
  }

  const isInsufficient =
    lookedUp?.type === 'topup' &&
    (user?.credit_balance ?? 0) < (lookedUp?.amount ?? 0)

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">
        Coupon Redemption
      </h1>

      <div className="bg-slate-dark border border-gold/30 rounded-xl p-4 flex justify-between items-center">
        <span className="text-white/60 text-sm">Your Balance:</span>
        <span className="text-gold font-mono text-xl font-bold">
          {formatETB(user?.credit_balance ?? 0)}
        </span>
      </div>

      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-white">Enter Coupon Code</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="6-digit code"
            maxLength={6}
            className="w-48 bg-charcoal border border-gold/30 rounded-lg px-4 py-3 text-gold font-mono text-xl text-center focus:outline-none tracking-widest"
          />
          <button
            onClick={handleLookup}
            disabled={code.length !== 6 || loading}
            className={cn(
              'px-6 py-3 rounded-lg font-semibold text-sm flex-1',
              code.length === 6 && !loading
                ? 'bg-gold text-charcoal hover:bg-gold-light'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            {loading ? 'Searching...' : 'Look Up'}
          </button>
        </div>

        {error && (
          <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-3">
            <p className="text-nile-danger text-sm">❌ {error}</p>
          </div>
        )}

        {lookedUp && (
          <div className="bg-nile-blue/20 border border-gold/30 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-white font-semibold">@{lookedUp.bettor?.username}</p>
              <p className="text-gold font-mono text-2xl font-bold mt-1">
                {formatETB(lookedUp.amount)}
              </p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="bg-nile-blue/40 text-nile-blue-light px-2 py-0.5 rounded capitalize">
                  {lookedUp.type}
                </span>
                <span className="text-nile-orange">
                  Expires: {formatCountdown(lookedUp.expires_at)}
                </span>
              </div>
            </div>

            {lookedUp.type === 'topup' && (
              <div className="bg-charcoal/50 rounded-lg p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">Your balance after:</span>
                  <span className={cn('font-mono', isInsufficient ? 'text-nile-danger' : 'text-nile-success')}>
                    {formatETB((user?.credit_balance ?? 0) - (lookedUp.amount ?? 0))}
                  </span>
                </div>
              </div>
            )}

            {lookedUp.type === 'withdrawal' && (
              <div className="bg-nile-success/10 border border-nile-success/20 rounded-lg p-3 text-xs">
                <p className="text-nile-success">💵 Give bettor {formatETB(lookedUp.amount)} cash</p>
                <p className="text-white/50 mt-1">Your balance will increase by {formatETB(lookedUp.amount)} after approval</p>
              </div>
            )}

            {isInsufficient && (
              <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-3">
                <p className="text-nile-danger text-sm font-semibold">⚠️ Insufficient Balance</p>
                <p className="text-white/60 text-xs mt-1">
                  You need {formatETB(lookedUp.amount)} but have {formatETB(user?.credit_balance ?? 0)}
                </p>
                <p className="text-xs text-nile-orange mt-2">→ Request credits from your agent</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={approving || isInsufficient}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold',
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
                className="flex-1 flex items-center justify-center gap-1.5 border border-nile-danger/40 text-nile-danger py-2.5 rounded-lg text-sm hover:bg-nile-danger/10"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
