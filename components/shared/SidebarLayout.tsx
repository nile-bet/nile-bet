'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from './Logo'
import { DashboardNavbar }
  from './DashboardNavbar'
import { RoleBadge } from './RoleBadge'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { UserRole }
  from '@/types/database.types'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface SidebarLayoutProps {
  navItems: NavItem[]
  children: React.ReactNode
  showRedeemSlip?: boolean
  onRedeemSlip?: () => void
}

function SidebarContent({
  navItems,
  onClose,
}: {
  navItems: NavItem[]
  onClose?: () => void
}) {
  const pathname = usePathname()
  const { user, role } = useAuthStore()

  return (
    <div className="flex flex-col h-full bg-slate-dark">
      {/* Logo */}
      <div className="p-4 border-b border-gold/10">
        <Logo size="sm" showTagline />
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/' &&
              pathname.startsWith(
                item.href
              ))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2',
                isActive
                  ? 'bg-gold/10 text-gold border-gold font-medium'
                  : 'text-white/60 hover:text-white hover:bg-gold/5 border-transparent'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User card at bottom */}
      <div className="p-4 border-t border-gold/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-nile-blue border border-gold/30 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
            {user?.username
              ?.charAt(0)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              @{user?.username}
            </p>
            {role && (
              <RoleBadge
                role={role as UserRole}
                size="sm"
              />
            )}
            {role !== 'admin' &&
              user?.credit_balance !==
                undefined && (
                <p className="text-gold font-mono text-xs mt-0.5">
                  {formatETB(
                    user.credit_balance
                  )}
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SidebarLayout({
  navItems,
  children,
  showRedeemSlip = false,
  onRedeemSlip,
}: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-charcoal">
      {/* Desktop sidebar */}
      <div className={cn("hidden md:flex flex-shrink-0 transition-all duration-300 border-r border-gold/10", sidebarCollapsed ? "w-0 overflow-hidden" : "w-60")}>
        <div className="w-full">
          <SidebarContent
            navItems={navItems}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar
          showRedeemSlip={showRedeemSlip}
          onRedeemSlip={onRedeemSlip}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Mobile sidebar trigger */}
        <div className="md:hidden fixed bottom-4 left-4 z-50">
          <Sheet
            open={mobileOpen}
            onOpenChange={setMobileOpen}
          >
            <SheetTrigger asChild>
              <button className="bg-gold text-charcoal p-3 rounded-full shadow-lg">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-64 bg-slate-dark border-gold/20"
            >
              <SidebarContent
                navItems={navItems}
                onClose={() =>
                  setMobileOpen(false)
                }
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}