'use client'
import { CouponRedeemPanel } from '@/components/cashier/CouponRedeemPanel'

export default function AgentRedeemSlipPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-white mb-6">
        🎟️ Redeem Slip
      </h1>
      <CouponRedeemPanel />
    </div>
  )
}
