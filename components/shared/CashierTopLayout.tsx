'use client'

import { useState, useEffect } from 'react'
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
  const [jackpotOpen, setJackpotOpen] = useState(false)

  useEffect(() => {
    supabase
      .from('jackpots')
      .select('status')
      .eq('status', 'open')
      .limit(1)
      .then(({ data }) => {
        setJackpotOpen(!!(data && data.length > 0))
      })
  }, [])

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
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                jackpotOpen
                  ? 'bg-gold text-charcoal animate-pulse-gold hover:animate-none hover:bg-gold-light'
                  : 'text-white/60'
              }`}
              style={!jackpotOpen ? { background: 'rgba(255,255,255,0.12)' } : {}}
            >
              🏆 JACKPOT
              {!jackpotOpen && (
                <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  CLOSED
                </span>
              )}
            </button>
          </Link>

          <div className="hidden sm:flex">
            {role && <RoleBadge role={role as UserRole} />}
          </div>
          <NotificationBell />

          {/* Avatar dropdown with all nav + dashboard + check slip + logout */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#0D1526' }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </button>

            {dropdownOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />

                {/* Dropdown */}
                <div className="absolute right-0 top-10 z-50 w-56 rounded-2xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(160deg, #0f1729 0%, #1a1042 100%)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08)',
                  }}>

                  {/* User info */}
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(212,175,55,0.15)', background: 'rgba(212,175,55,0.05)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#0D1526' }}>
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white">@{user?.username}</p>
                        {role && <RoleBadge role={role as UserRole} className="mt-0.5" />}
                      </div>
                    </div>
                    {user?.credit_balance !== undefined && (
                      <div className="mt-2 px-2 py-1 rounded-lg text-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <p className="text-gold font-mono text-sm font-bold">{formatETB(user.credit_balance)}</p>
                      </div>
                    )}
                  </div>

                  {/* All nav items */}
                  <div className="py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {navItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm transition-all"
                          style={isActive ? {
                            color: '#FFD700',
                            background: 'rgba(212,175,55,0.12)',
                            borderLeft: '2px solid #FFD700',
                          } : {
                            color: 'rgba(255,255,255,0.6)',
                            borderLeft: '2px solid transparent',
                          }}
                          onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}}
                          onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>

                  <div className="py-1.5">
                    <button
                      onClick={() => { setDropdownOpen(false); setShowLogoutConfirm(true) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-all"
                      style={{ color: '#f87171', borderLeft: '2px solid transparent' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
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
