'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LucideIcon, Menu, X, LogOut, LayoutDashboard, Search, ChevronDown } from 'lucide-react'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'
import { RoleBadge } from './RoleBadge'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatETB } from '@/lib/utils/formatCurrency'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database.types'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface CashierTopLayoutProps {
  navItems: NavItem[]
  children: React.ReactNode
  showRedeemSlip?: boolean
  onRedeemSlip?: () => void
}

export function CashierTopLayout({
  navItems,
  children,
  showRedeemSlip = false,
  onRedeemSlip,
}: CashierTopLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, role } = useAuthStore()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.clear()
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k)
    })
    window.location.href = '/login'
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-charcoal">
      {/* Top Navbar */}
      <nav className="bg-slate-dark border-b border-gold/20 h-14 px-4 flex items-center justify-between sticky top-0 z-40 flex-shrink-0">

        {/* Left: Logo */}
        <Link href="/cashier-place-bet">
          <Logo size="sm" showTagline />
        </Link>

        {/* Center: Redeem */}
        {showRedeemSlip && (
          <button
            onClick={onRedeemSlip}
            className="bg-gold text-charcoal font-bold text-xs px-4 py-2 rounded-md hover:bg-gold-light transition-colors flex items-center gap-1.5"
            title="Ctrl+R"
          >
            🎟️ REDEEM SLIP
          </button>
        )}

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Balance */}
          {user?.credit_balance !== undefined && (
            <div className="hidden sm:flex items-center bg-gold/10 border border-gold/30 rounded-md px-2.5 py-1">
              <span className="text-gold font-mono text-sm">{formatETB(user.credit_balance)}</span>
            </div>
          )}

          {/* Jackpot */}
          <Link href="/cashier-jackpot">
            <button className="bg-gold text-charcoal font-bold text-xs px-3 py-1.5 rounded-md hover:bg-gold-light transition-colors animate-pulse-gold hover:animate-none">
              🏆 JACKPOT
            </button>
          </Link>

          <NotificationBell />

          {/* Avatar dropdown with all nav + dashboard + check slip + logout */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full bg-nile-blue border border-gold/30 flex items-center justify-center text-gold font-bold text-sm hover:border-gold/60 transition-colors"
            >
              {user?.username?.charAt(0).toUpperCase()}
            </button>

            {dropdownOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />

                {/* Dropdown */}
                <div className="absolute right-0 top-10 z-50 w-52 rounded-xl overflow-hidden shadow-xl"
                  style={{ background: '#1A1F4D', border: '1px solid rgba(255,255,255,0.1)' }}>

                  {/* User info */}
                  <div className="px-3 py-2.5 border-b border-white/10">
                    <p className="font-semibold text-sm text-white">@{user?.username}</p>
                    {role && <RoleBadge role={role as UserRole} className="mt-1" />}
                    {user?.credit_balance !== undefined && (
                      <p className="text-gold font-mono text-sm mt-1">{formatETB(user.credit_balance)}</p>
                    )}
                  </div>

                  {/* All nav items */}
                  <div className="py-1 border-b border-white/10">
                    {navItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDropdownOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                            isActive ? 'text-gold bg-gold/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>

                  <div className="py-1 border-t border-white/10">
                    <button
                      onClick={() => { setDropdownOpen(false); setShowLogoutConfirm(true) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Page content — full width, no sidebar */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Logout confirm modal */}
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
    </div>
  )
}
