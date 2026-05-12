import { OfflineBanner }
  from '@/components/shared/OfflineBanner'
import {
  LayoutDashboard,
  Users,
  User,
  Swords,
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
    href: '/weekend-jackpot',
    label: 'Jackpot',
    icon: Trophy,
  },
  {
    href: '/agent-place-bet',
    label: 'Place Bet',
    icon: Swords,
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

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <OfflineBanner />
      <SidebarLayout navItems={agentNav}>
        {children}
      </SidebarLayout>
    </>
  )
}