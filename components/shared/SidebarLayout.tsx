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
    <div className="flex flex-col h-full" style={{background: "linear-gradient(180deg, #0f1729 0%, #0a1020 60%, #080d1a 100%)"}}>
      {/* Logo */}
      <div className="p-4 border-b border-gold/20" style={{background: "linear-gradient(90deg, rgba(212,175,55,0.08) 0%, transparent 100%)"}}>
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
                  ? 'bg-gradient-to-r from-gold/20 to-transparent text-gold border-gold font-semibold shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5 hover:border-white/20 border-transparent transition-all duration-200'
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-gold drop-shadow-sm" : "text-white/40 group-hover:text-white/70")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User card at bottom */}
      <div className="p-4 border-t border-gold/20" style={{background: "linear-gradient(0deg, rgba(212,175,55,0.06) 0%, transparent 100%)"}}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gold/50 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0" style={{background: "linear-gradient(135deg, #1a2a4a 0%, #0f1729 100%)"}}>
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
      <div className={cn("hidden md:flex flex-shrink-0 transition-all duration-300 border-r border-gold/20 shadow-xl shadow-black/30", sidebarCollapsed ? "w-0 overflow-hidden" : "w-60")}>
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
              <button className="p-3 rounded-full shadow-lg shadow-gold/30 text-charcoal font-bold" style={{background: "linear-gradient(135deg, #f0c040 0%, #d4af37 100%)"}}>
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