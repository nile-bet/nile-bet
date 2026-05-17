'use client'

import { useState } from 'react'
import {
  lookupCouponByAgent,
} from '@/lib/actions/agent'
import {
  approveTopupByAdmin,
  approveWithdrawalByAdmin,
} from '@/lib/actions/adminFinance'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  formatETB,
  formatCountdown,
} from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

// Cashier uses same lookup as agent
// but approval goes through admin flow
// (deducts from cashier balance)
import { approveCouponByAgent }
  from '@/lib/actions/agent'

interface Props {
  onClose?: () => void
}

export function CouponRedeemPanel({
  onClose,
}: Props) {
  const { user } = useAuthStore()
  const [code, setCode] = useState('')
  const [lookedUp, setLookedUp] =
    useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] =
    useState(false)
  const [approving, setApproving] =
    useState(false)

  const handleLookup = async () => {
    if (code.length !== 6) return
    setLoading(true)
    setLookedUp(null)
    setError('')

    const result =
      await lookupCouponByAgent(code)
    if (result.success) {
      setLookedUp(result.coupon)
    } else {
      setError(
        result.error ?? 'Coupon not found'
      )
    }
    setLoading(false)
  }

  const handleApprove = async () => {
    if (!user || !lookedUp) return
    setApproving(true)

    const result =
      await approveCouponByAgent(
        code,
        user.id
      )

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
    (user?.credit_balance ?? 0) <
      (lookedUp?.amount ?? 0)

  return (
    <div className="space-y-4">
      {/* Code input */}
      <div>
        <label className="text-xs text-white/60 block mb-2">
          Enter 6-digit Coupon Code
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .replace(/[^0-9]/g, '')
                  .slice(0, 6)
              )
            }
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              handleLookup()
            }
            placeholder="000000"
            maxLength={6}
            autoFocus
            className="flex-1 bg-charcoal border border-gold/30 rounded-lg px-4 py-3 text-gold font-mono text-2xl text-center focus:outline-none tracking-widest"
          />
          <button
            onClick={handleLookup}
            disabled={
              code.length !== 6 || loading
            }
            className={cn(
              'px-5 py-3 rounded-lg font-semibold text-sm',
              code.length === 6 && !loading
                ? 'bg-gold text-charcoal hover:bg-gold-light'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            {loading ? '...' : 'Look Up'}
          </button>
        </div>
      </div>

      {/* Balance display */}
      <div className="flex justify-between text-sm bg-charcoal/50 rounded-lg p-3">
        <span className="text-white/50">
          Your Balance:
        </span>
        <span className="text-gold font-mono font-bold">
          {formatETB(
            user?.credit_balance ?? 0
          )}
        </span>
      </div>

      {error && (
        <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-3">
          <p className="text-nile-danger text-sm">
            ❌ {error}
          </p>
        </div>
      )}

      {lookedUp && (
        <div className="bg-nile-blue/20 border border-gold/30 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-white font-semibold">
              @{lookedUp.bettor?.username}
            </p>
            <p className="text-gold font-mono text-2xl font-bold mt-1">
              {formatETB(lookedUp.amount)}
            </p>
            <div className="flex gap-3 mt-1 text-xs">
              <span className="bg-nile-blue/40 text-nile-blue-light px-2 py-0.5 rounded capitalize">
                {lookedUp.type}
              </span>
              <span className="text-nile-orange">
                {formatCountdown(
                  lookedUp.expires_at
                )}
              </span>
            </div>
          </div>

          {lookedUp.type === 'topup' && (
            <div className="bg-charcoal/50 rounded-lg p-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">
                  Your balance after:
                </span>
                <span
                  className={cn(
                    'font-mono',
                    isInsufficient
                      ? 'text-nile-danger'
                      : 'text-nile-success'
                  )}
                >
                  {formatETB(
                    (user?.credit_balance ??
                      0) -
                      (lookedUp.amount ?? 0)
                  )}
                </span>
              </div>
            </div>
          )}

          {lookedUp.type === 'withdrawal' && (
            <p className="text-nile-success text-sm">
              💵 Give bettor{' '}
              {formatETB(lookedUp.amount)} cash
            </p>
          )}

          {isInsufficient && (
            <p className="text-nile-danger text-xs">
              ⚠️ Insufficient balance. Request
              credits from your agent.
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={
                approving || isInsufficient
              }
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold',
                !approving && !isInsufficient
                  ? 'bg-nile-success text-white hover:bg-nile-success/80'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              <Check className="w-4 h-4" />
              {approving
                ? 'Processing...'
                : 'Approve'}
            </button>
            <button
              onClick={() => {
                setLookedUp(null)
                setCode('')
              }}
              className="flex-1 flex items-center justify-center gap-1.5 border border-nile-danger/40 text-nile-danger py-2.5 rounded-lg text-sm hover:bg-nile-danger/10"
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