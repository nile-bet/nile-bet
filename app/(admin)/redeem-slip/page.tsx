'use client'
import { CouponRedeemPanel } from '@/components/cashier/CouponRedeemPanel'
import { Ticket } from 'lucide-react'

export default function AdminRedeemSlipPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Ticket className="w-5 h-5" />Redeem Slip
      </h1>
      <CouponRedeemPanel />
    </div>
  )
}
