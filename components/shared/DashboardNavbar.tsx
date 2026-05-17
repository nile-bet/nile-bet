'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, LogOut, LayoutDashboard,
  Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from './Logo'
import { NotificationBell }
  from './NotificationBell'
import { RoleBadge } from './RoleBadge'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { createClient }
  from '@/lib/supabase/client'
import type { UserRole }
  from '@/types/database.types'

interface DashboardNavbarProps {
  title?: string
  showRedeemSlip?: boolean
  onRedeemSlip?: () => void
  onToggleSidebar?: () => void
  sidebarCollapsed?: boolean
}

export function DashboardNavbar({
  title,
  showRedeemSlip = false,
  onRedeemSlip,
  onToggleSidebar,
  sidebarCollapsed,
}: DashboardNavbarProps) {
  const { user, role } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const dashboardLink =
    role === 'admin'
      ? '/dashboard'
      : role === 'agent'
      ? '/agent-dashboard'
      : '/cashier-dashboard'

  return (
    <nav className="bg-slate-dark border-b border-gold/20 h-14 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Logo + Toggle */}
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button onClick={onToggleSidebar} className="hidden md:flex p-1.5 text-white/40 hover:text-white">
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        )}
        <Link href={dashboardLink}>
          <Logo size="sm" showTagline />
        </Link>
      </div>

      {/* Center: Redeem or Title */}
      <div className="flex items-center gap-4">
        {showRedeemSlip ? (
          <button
            onClick={onRedeemSlip}
            className="bg-gold text-charcoal font-bold text-xs px-4 py-2 rounded-md hover:bg-gold-light transition-colors flex items-center gap-1.5"
            title="Ctrl+R"
          >
            🎟️ REDEEM SLIP
          </button>
        ) : (
          title && (
            <h1 className="text-white font-semibold hidden md:block">
              {title}
            </h1>
          )
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Jackpot */}
        <Link href={role === "agent" ? "/agent-jackpot" : role === "cashier" ? "/cashier-jackpot" : "/jackpot"}>
          <button className="bg-gold text-charcoal font-bold text-xs px-3 py-1.5 rounded-md hover:bg-gold-light transition-colors animate-pulse-gold hover:animate-none">
            🏆 JACKPOT
          </button>
        </Link>

        {/* Balance (agent + cashier) */}
        {role !== 'admin' &&
          user?.credit_balance !==
            undefined && (
            <div className="hidden md:flex items-center bg-gold/10 border border-gold/30 rounded-md px-2.5 py-1">
              <span className="text-gold font-mono text-sm">
                {formatETB(
                  user.credit_balance
                )}
              </span>
            </div>
          )}

        {/* Notification bell */}
        {role && role !== 'admin' && (
          <span className={`hidden md:flex text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
            role === 'cashier' ? 'bg-nile-blue/30 text-nile-blue-light border border-nile-blue/40' :
            role === 'agent' ? 'bg-nile-orange/20 text-nile-orange border border-nile-orange/40' :
            'bg-gold/20 text-gold border border-gold/40'
          }`}>{role}</span>
        )}
        <NotificationBell />

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full bg-nile-blue border border-gold/30 flex items-center justify-center text-gold font-bold text-sm hover:border-gold/60 transition-colors">
              {user?.username
                ?.charAt(0)
                .toUpperCase()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-slate-dark border-nile-blue/40 text-white w-52"
          >
            <div className="px-3 py-2 border-b border-nile-blue/20">
              <p className="font-semibold text-sm">
                @{user?.username}
              </p>
              {role && (
                <RoleBadge
                  role={role as UserRole}
                  className="mt-1"
                />
              )}
              {role !== 'admin' &&
                user?.credit_balance !==
                  undefined && (
                  <p className="text-gold font-mono text-sm mt-1">
                    {formatETB(
                      user.credit_balance
                    )}
                  </p>
                )}
            </div>
            <DropdownMenuItem asChild>
              <Link
                href={dashboardLink}
                className="cursor-pointer flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={
                  role === 'cashier'
                    ? '/cashier-check-slip'
                    : role === 'agent'
                    ? '/agent-check-slip'
                    : role === 'admin'
                    ? '/slip-lookup'
                    : '/check-slip'
                }
                className="cursor-pointer flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Check Slip
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-nile-blue/20" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-nile-danger cursor-pointer focus:text-nile-danger flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}