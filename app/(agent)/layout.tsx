'use client'

import { useAuth }
  from '@/lib/hooks/useAuth'
import { useRealtimeAgent }
  from '@/lib/hooks/useRealtimeAgent'
import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import {
  LayoutDashboard,
  Users,
  User,
  CreditCard,
  Ticket,
  BarChart3,
  ClipboardList,
  Search,
  Trophy,
} from 'lucide-react'
import { SidebarLayout }
  from '@/components/shared/SidebarLayout'
import type { NavItem }
  from '@/components/shared/SidebarLayout'

const agentNav: NavItem[] = [
  {
    href: '/agent-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/agent-cashiers',
    label: 'Cashiers',
    icon: Users,
  },
  {
    href: '/agent-bettors',
    label: 'Bettors',
    icon: User,
  },

  {
    href: '/agent-credits',
    label: 'Credits',
    icon: CreditCard,
  },
  {
    href: '/agent-coupons',
    label: 'Coupons',
    icon: Ticket,
  },
  {
    href: '/agent-check-slip',
    label: 'Check Slip',
    icon: Search,
  },
  {
    href: '/agent-reports',
    label: 'Reports',
    icon: BarChart3,
  },
  {
    href: '/agent-activity',
    label: 'Activity',
    icon: ClipboardList,
  },
]

function AgentInitializer() {
  useAuth()
  useRealtimeAgent()
  return null
}

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AgentInitializer />
      <OfflineBanner />
      <SidebarLayout navItems={agentNav}>
        {children}
      </SidebarLayout>
    </>
  )
}