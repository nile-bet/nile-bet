'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/stores/authStore'
import { useRealtimeCashier } from '@/lib/hooks/useRealtimeCashier'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { ShortcutsHelpModal } from '@/components/cashier/ShortcutsHelpModal'
import { useBetSlipStore } from '@/lib/stores/betSlipStore'
import {
  LayoutDashboard,
  Swords,
  Ticket,
  Search,
  CreditCard,
  ClipboardList,
  Trophy,
  History as HistoryIcon,
} from 'lucide-react'
import { SidebarLayout } from '@/components/shared/SidebarLayout'
import type { NavItem } from '@/components/shared/SidebarLayout'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CouponRedeemPanel } from '@/components/cashier/CouponRedeemPanel'

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
    href: '/cashier-jackpot',
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
    href: '/cashier-slip-history',
    label: 'Slip History',
    icon: HistoryIcon,
  },
  {
    href: '/cashier-activity',
    label: 'Activity',
    icon: ClipboardList,
  },
]

function CashierInitializer({ onRedeem }: { onRedeem: () => void }) {
  useAuth()
  useRealtimeCashier()
  const router = useRouter()
  const { clearSlip } = useBetSlipStore()
  const { user, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading && user && user.role !== 'cashier') {
      router.replace('/login')
    }
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  useKeyboardShortcuts({
    onRedeemSlip: onRedeem,
    onNewBet: () => clearSlip(),
    onCheckSlip: () => router.push('/cashier-check-slip'),
    onDashboard: () => router.push('/cashier-dashboard'),
  })

  return null
}

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <>
      <CashierInitializer onRedeem={() => setRedeemOpen(true)} />
      <OfflineBanner />
      <SidebarLayout
        navItems={cashierNav}
        showRedeemSlip
        onRedeemSlip={() => setRedeemOpen(true)}
      >
        {children}
      </SidebarLayout>

      {/* Redeem Modal */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-white">
              🎟️ Redeem Coupon
              <span className="ml-2 text-xs text-white/30 font-normal">Ctrl+R</span>
            </DialogTitle>
          </DialogHeader>
          <CouponRedeemPanel onClose={() => setRedeemOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Shortcuts help */}
      <ShortcutsHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
