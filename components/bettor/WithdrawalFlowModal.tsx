'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  generateWithdrawalCoupon,
  cancelCoupon,
  getActiveCoupon,
} from '@/lib/actions/coupons'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  formatETB,
  formatCountdown,
} from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Copy } from 'lucide-react'

interface WithdrawalFlowModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WithdrawalFlowModal({
  isOpen,
  onClose,
}: WithdrawalFlowModalProps) {
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState('')
  const [code, setCode] = useState('')
  const [expiresAt, setExpiresAt] =
    useState('')
  const [loading, setLoading] = useState(false)
  const [activeCoupon, setActiveCoupon] =
    useState<any>(null)
  const [countdown, setCountdown] =
    useState('')
  const { user } = useAuthStore()

  const available =
    (user?.credit_balance ?? 0) -
    (user?.reserved_balance ?? 0)

  useEffect(() => {
    if (isOpen && user) {
      getActiveCoupon(user.id).then(
        (coupons) => {
          const wd = coupons.find(
            (c: any) =>
              c.type === 'withdrawal'
          )
          setActiveCoupon(wd ?? null)
        }
      )
    }
  }, [isOpen, user])

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      setCountdown(formatCountdown(expiresAt))
    }, 1000)
    setCountdown(formatCountdown(expiresAt))
    return () => clearInterval(interval)
  }, [expiresAt])

  const handleGenerate = async () => {
    if (!user || !amount) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (amt > available) {
      toast.error('Amount exceeds available balance')
      return
    }

    setLoading(true)
    const result =
      await generateWithdrawalCoupon(
        user.id,
        amt
      )

    if (result.success) {
      setCode(result.code!)
      setExpiresAt(result.expiresAt!)
      setStep(2)
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }

  const handleClose = () => {
    setStep(1)
    setAmount('')
    setCode('')
    setExpiresAt('')
    setActiveCoupon(null)
    onClose()
  }

  const quickAmounts = [
    100, 250, 500,
  ].filter((a) => a <= available)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleClose}
    >
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {step === 1
              ? 'Withdraw Winnings 💸'
              : 'Your Withdrawal Coupon 💸'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            {/* Balance display */}
            <div className="bg-charcoal/50 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">
                Available Balance:
              </p>
              <p className="text-gold font-mono text-xl font-bold">
                {formatETB(available)}
              </p>
            </div>

            {activeCoupon && (
              <div className="bg-nile-orange/10 border border-nile-orange/30 rounded-lg p-3">
                <p className="text-nile-orange text-sm">
                  Active withdrawal coupon:{' '}
                  {activeCoupon.code}
                </p>
                <button
                  onClick={async () => {
                    if (!user) return
                    const r =
                      await cancelCoupon(
                        activeCoupon.id,
                        user.id
                      )
                    if (r.success) {
                      setActiveCoupon(null)
                      toast.success(
                        'Coupon cancelled, balance restored'
                      )
                    }
                  }}
                  className="text-xs text-nile-danger mt-1 border border-nile-danger/30 px-2 py-0.5 rounded"
                >
                  Cancel it
                </button>
              </div>
            )}

            <div>
              <label className="text-sm text-white/70 block mb-1.5">
                Amount (ETB)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="0.00"
                min="1"
                max={available}
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white font-mono text-lg text-center focus:outline-none focus:border-gold/50"
                disabled={!!activeCoupon}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((a) => (
                <button
                  key={a}
                  onClick={() =>
                    setAmount(String(a))
                  }
                  className={cn(
                    'border text-xs px-3 py-1.5 rounded-full',
                    amount === String(a)
                      ? 'bg-gold border-gold text-charcoal font-semibold'
                      : 'border-gold/30 text-gold hover:bg-gold/10'
                  )}
                >
                  ETB {a}
                </button>
              ))}
              <button
                onClick={() =>
                  setAmount(
                    Math.floor(available).toString()
                  )
                }
                className="border border-gold/30 text-gold text-xs px-3 py-1.5 rounded-full hover:bg-gold/10"
              >
                Max
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                !amount ||
                !!activeCoupon
              }
              className={cn(
                'w-full py-3 rounded-lg font-semibold text-sm transition-colors',
                !loading &&
                  amount &&
                  !activeCoupon
                  ? 'bg-gold text-charcoal hover:bg-gold-light'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {loading
                ? 'Generating...'
                : 'Generate Withdrawal Coupon &#8594;'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-nile-blue/20 border border-gold/40 rounded-xl p-6 text-center">
              <div className="flex justify-center gap-2 mb-3">
                {code.split('').map(
                  (digit, i) => (
                    <div
                      key={i}
                      className="w-10 h-12 bg-charcoal border border-gold/50 rounded-lg flex items-center justify-center text-gold font-mono text-2xl font-bold"
                    >
                      {digit}
                    </div>
                  )
                )}
              </div>
              <p className="text-white/60 text-sm">
                Withdraw:{' '}
                <span className="text-gold font-mono font-bold">
                  {formatETB(
                    parseFloat(amount)
                  )}
                </span>
              </p>
              <p className="text-nile-orange text-sm mt-1">
                Expires in: {countdown}
              </p>
            </div>

            <div className="bg-nile-orange/10 border border-nile-orange/20 rounded-lg p-3">
              <p className="text-white/60 text-sm">
                ETB {amount} has been
                reserved from your balance.
                It will be restored if this
                coupon expires or is
                cancelled.
              </p>
            </div>

            <p className="text-white/50 text-sm text-center">
              Take this code to any NILE Bet
              cashier to collect your cash
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code)
                  toast.success('Code copied!')
                }}
                className="flex-1 flex items-center justify-center gap-2 border border-gold/30 text-gold py-2.5 rounded-lg text-sm hover:bg-gold/10"
              >
                <Copy className="w-4 h-4" />
                Copy Code
              </button>
              <button
                onClick={handleClose}
                className="flex-1 bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}