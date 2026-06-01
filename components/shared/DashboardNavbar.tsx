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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Clear sessionStorage to prevent auto-login
    sessionStorage.clear()
    // Clear all supabase keys from localStorage
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k)
    })
    window.location.href = '/login'
  }

  const dashboardLink =
    role === 'admin'
      ? '/dashboard'
      : role === 'agent'
      ? '/agent-dashboard'
      : '/cashier-dashboard'

  return (
    <>
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
              onClick={() => setShowLogoutConfirm(true)}
              className="text-nile-danger cursor-pointer focus:text-nile-danger flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-dark border border-nile-blue/40 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-white font-semibold text-lg mb-2">Logout</h3>
            <p className="text-white/50 text-sm mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm hover:text-white hover:border-white/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-nile-danger text-white py-2.5 rounded-lg text-sm font-semibold hover:opacity-80 transition-colors"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
