'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { generateTopupCoupon,
  cancelCoupon,
  getActiveCoupon } from '@/lib/actions/coupons'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  formatETB,
  formatCountdown,
} from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Copy } from 'lucide-react'

interface TopupFlowModalProps {
  isOpen: boolean
  onClose: () => void
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000]

export function TopupFlowModal({
  isOpen,
  onClose,
}: TopupFlowModalProps) {
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

  useEffect(() => {
    if (isOpen && user) {
      getActiveCoupon(user.id).then(
        (coupons) => {
          const topup = coupons.find(
            (c: any) => c.type === 'topup'
          )
          setActiveCoupon(topup ?? null)
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

    setLoading(true)
    const result = await generateTopupCoupon(
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

  const handleCancelActive = async () => {
    if (!user || !activeCoupon) return
    setLoading(true)
    const result = await cancelCoupon(
      activeCoupon.id,
      user.id
    )
    if (result.success) {
      setActiveCoupon(null)
      toast.success('Coupon cancelled')
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleClose}
    >
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {step === 1
              ? 'Request Top-up 💳'
              : 'Your Top-up Coupon 🎫'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            {/* Active coupon warning */}
            {activeCoupon && (
              <div className="bg-nile-orange/10 border border-nile-orange/30 rounded-lg p-3">
                <p className="text-nile-orange text-sm font-medium mb-1">
                  Active coupon: {activeCoupon.code}
                </p>
                <p className="text-white/50 text-xs mb-2">
                  Expires:{' '}
                  {formatCountdown(
                    activeCoupon.expires_at
                  )}
                </p>
                <button
                  onClick={handleCancelActive}
                  disabled={loading}
                  className="text-xs border border-nile-danger/40 text-nile-danger px-3 py-1 rounded-lg hover:bg-nile-danger/10"
                >
                  Cancel Active Coupon
                </button>
              </div>
            )}

            {/* Amount input */}
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
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white font-mono text-lg text-center focus:outline-none focus:border-gold/50"
                disabled={!!activeCoupon}
              />
            </div>

            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() =>
                    setAmount(String(a))
                  }
                  disabled={!!activeCoupon}
                  className={cn(
                    'border text-xs px-3 py-1.5 rounded-full transition-colors',
                    amount === String(a)
                      ? 'bg-gold border-gold text-charcoal font-semibold'
                      : 'border-gold/30 text-gold hover:bg-gold/10'
                  )}
                >
                  ETB {a}
                </button>
              ))}
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
                : 'Generate Coupon &#8594;'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Coupon display */}
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
                Amount:{' '}
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

            {/* Info pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                '⏰ Expires in 6 hours',
                '1️⃣ One-time use only',
                '🏪 Valid at any cashier',
              ].map((pill) => (
                <span
                  key={pill}
                  className="bg-nile-blue/20 text-white/60 text-xs rounded-full px-3 py-1"
                >
                  {pill}
                </span>
              ))}
            </div>

            <p className="text-white/50 text-sm text-center">
              Show this code to any NILE Bet
              cashier or agent to top up your
              balance
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    code
                  )
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