'use client'

import { useAuth }
  from '@/lib/hooks/useAuth'
import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import {
  LayoutDashboard,
  Users,
  Swords,
  Trophy,
  CreditCard,
  Ticket,
  BarChart3,
  Megaphone,
  ClipboardList,
  Settings,
} from 'lucide-react'
import { SidebarLayout }
  from '@/components/shared/SidebarLayout'
import type { NavItem }
  from '@/components/shared/SidebarLayout'

const adminNav: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/matches',
    label: 'Matches',
    icon: Swords,
  },
  {
    href: '/jackpot',
    label: 'Jackpot',
    icon: Trophy,
  },
  {
    href: '/users',
    label: 'Users',
    icon: Users,
  },
  {
    href: '/credits',
    label: 'Credits',
    icon: CreditCard,
  },
  {
    href: '/coupons',
    label: 'Coupons',
    icon: Ticket,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: BarChart3,
  },
  {
    href: '/broadcast',
    label: 'Broadcast',
    icon: Megaphone,
  },
  {
    href: '/activity',
    label: 'Activity',
    icon: ClipboardList,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
]

function AdminInitializer() {
  useAuth()
  return null
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AdminInitializer />
      <OfflineBanner />
      <SidebarLayout navItems={adminNav}>
        {children}
      </SidebarLayout>
    </>
  )
}