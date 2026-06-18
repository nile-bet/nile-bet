'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth }
  from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/stores/authStore'
import { useRealtimeAgent }
  from '@/lib/hooks/useRealtimeAgent'
import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import {
  LayoutDashboard,
  Users,
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
    href: '/agent-jackpot',
    label: 'Jackpot',
    icon: Trophy,
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
  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (!isLoading && user && user.role !== 'agent') {
      router.replace('/login')
    }
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])
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
      <SidebarLayout navItems={agentNav} theme="agent">
        {children}
      </SidebarLayout>
    </>
  )
}