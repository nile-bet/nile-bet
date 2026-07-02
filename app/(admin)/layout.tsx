'use client'

import { useAuth }
  from '@/lib/hooks/useAuth'
import { useRealtimeAdmin } from '@/lib/hooks/useRealtimeAdmin'
import { useAuthStore } from '@/lib/stores/authStore'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  ScanLine,
  UserCheck,
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
    href: '/redeem-slip',
    label: 'Redeem Slip',
    icon: ScanLine,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: BarChart3,
  },
  {
    href: '/bettor-report',
    label: 'Bettors',
    icon: UserCheck,
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
  useRealtimeAdmin()
  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      router.replace('/login')
    }
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])
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
      <SidebarLayout navItems={adminNav} theme="admin">
        {children}
      </SidebarLayout>
    </>
  )
}