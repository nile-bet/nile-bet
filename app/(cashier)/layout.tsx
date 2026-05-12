'use client'

import { useState } from 'react'
import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import {
  LayoutDashboard,
  Swords,
  Ticket,
  Search,
  CreditCard,
  ClipboardList,
  Trophy,
} from 'lucide-react'
import { SidebarLayout }
  from '@/components/shared/SidebarLayout'
import type { NavItem }
  from '@/components/shared/SidebarLayout'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const cashierNav: NavItem[] = [
  {
    href: '/cashier-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/cashier-place-bet',
    label: 'Place Bet',
    icon: Swords,
  },
  {
    href: '/weekend-jackpot',
    label: 'Jackpot',
    icon: Trophy,
  },
  {
    href: '/cashier-coupons',
    label: 'Coupons',
    icon: Ticket,
  },
  {
    href: '/cashier-check-slip',
    label: 'Check Slip',
    icon: Search,
  },
  {
    href: '/cashier-credits',
    label: 'Credits',
    icon: CreditCard,
  },
  {
    href: '/cashier-activity',
    label: 'Activity',
    icon: ClipboardList,
  },
]

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [redeemOpen, setRedeemOpen] =
    useState(false)

  return (
    <>
      <OfflineBanner />
      <SidebarLayout
        navItems={cashierNav}
        showRedeemSlip
        onRedeemSlip={() =>
          setRedeemOpen(true)
        }
      >
        {children}
      </SidebarLayout>

      <Dialog
        open={redeemOpen}
        onOpenChange={setRedeemOpen}
      >
        <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              🎟️ Redeem Coupon
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/60 text-sm">
            Coupon redemption coming soon.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}