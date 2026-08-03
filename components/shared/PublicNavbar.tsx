'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, Search, Receipt, Home, Trophy, BarChart2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
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
import { cn } from '@/lib/utils'

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] =
    useState(false)
  const [jackpotOpen, setJackpotOpen] =
    useState(false)
  const { user, role, isAuthenticated } =
    useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('jackpots')
      .select('status')
      .eq('status', 'open')
      .limit(1)
      .then(({ data }) => {
        setJackpotOpen(
          !!(data && data.length > 0)
        )
      })
  }, [])

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.clear()
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k)
    })
    window.location.href = '/'
  }

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/results', label: 'Results', icon: BarChart2 },
  ]

  const handleSportsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('open-countries-panel'))
  }

  const JackpotButton = () => (
    <Link href="/weekend-jackpot">
      <button
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-charcoal transition-all',
          jackpotOpen
            ? 'bg-gold animate-pulse-gold hover:animate-none hover:bg-gold-light'
            : 'bg-white/20 text-white/60'
        )}
      >
        🏆 JACKPOT
        {!jackpotOpen && (
          <span className="text-[9px] bg-white/10 px-1 rounded">
            CLOSED
          </span>
        )}
      </button>
    </Link>
  )

  return (
    <>
    <nav className="bg-slate-dark border-b border-gold/20 sticky top-0 z-50">
      {/* Top bar: Logo | Actions */}
      <div className="h-14 md:h-16 px-3 md:px-6 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/">
          <Logo size="md" showTagline />
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-2">
          {!isAuthenticated ? (
            <>
              <div className="hidden md:block">
                <JackpotButton />
              </div>
              <Link href="/weekend-jackpot" className="md:hidden">
                <button className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[9px] font-bold transition-all ${
                  jackpotOpen
                    ? 'bg-gold text-charcoal animate-pulse-gold'
                    : 'text-white/60 bg-white/10'
                }`}>
                  🏆
                  {!jackpotOpen && (
                    <span className="text-[7px] px-0.5 rounded bg-white/10">CLOSED</span>
                  )}
                </button>
              </Link>
              <Link href="/check-slip">
                <button className="flex items-center gap-1.5 bg-[#1C2155] border border-gold/30 text-gold px-2.5 py-2 md:px-3 md:py-2 rounded-lg text-xs font-semibold hover:bg-gold/10 transition-colors">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Check</span>
                </button>
              </Link>
              <Link href="/login">
                <button className="bg-gold text-charcoal px-3.5 py-2 md:px-4 md:py-2 rounded-lg text-xs font-bold hover:bg-gold-light transition-colors">
                  LOGIN
                </button>
              </Link>
            </>
          ) : (
            <>
              <div className="hidden md:block">
                <JackpotButton />
              </div>
              {/* Balance */}
              <div className="hidden md:flex items-center bg-gold/10 border border-gold/30 rounded-md px-2 py-1">
                <span className="text-gold font-mono text-xs font-semibold">
                  {formatETB(user?.credit_balance ?? 0)}
                </span>
              </div>
              {/* Jackpot button — mobile only */}
              <Link href="/weekend-jackpot" className="md:hidden">
                <button className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[9px] font-bold transition-all ${
                  jackpotOpen
                    ? 'bg-gold text-charcoal animate-pulse-gold'
                    : 'text-white/60 bg-white/10'
                }`}>
                  🏆
                  {!jackpotOpen && (
                    <span className="text-[7px] px-0.5 rounded bg-white/10">CLOSED</span>
                  )}
                </button>
              </Link>
              <NotificationBell />
              {/* Avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-nile-blue border border-gold/30 flex items-center justify-center text-gold font-bold text-sm hover:border-gold/60 transition-colors">
                    {user?.username?.charAt(0).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-dark border-nile-blue/40 text-white w-48">
                  <div className="px-3 py-2 border-b border-nile-blue/20">
                    <p className="font-semibold text-sm">@{user?.username}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-gold/30 to-nile-blue/30 border border-gold/40 text-gold mt-1">⚡ BETTOR</span>
                    <p className="md:hidden text-gold font-mono text-sm font-bold mt-1.5">{formatETB(user?.credit_balance ?? 0)}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/bettor-bets" className="cursor-pointer">
                      <span className="flex items-center gap-2 text-emerald-400 font-medium">🎟️ My Bets</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bettor-profile" className="cursor-pointer">
                      <span className="flex items-center gap-2 text-sky-400 font-medium">👤 My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bettor-notifications" className="cursor-pointer">
                      <span className="flex items-center gap-2 text-violet-400 font-medium">🔔 Notifications</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-nile-blue/20" />
                  <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="text-nile-danger cursor-pointer focus:text-nile-danger">
                    <span className="flex items-center gap-2 font-medium">🚪 Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Bottom icon tab bar — mobile only */}
      <div className="md:hidden border-t border-gold/10 bg-slate-dark grid grid-cols-5 px-1.5 py-1.5 gap-1">
        <Link href="/" className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-white/70 hover:bg-white/5 active:bg-gold/15 active:text-gold transition-all">
          <Home className="w-[18px] h-[18px]" />
          <span className="text-[9px] font-bold uppercase tracking-wide">Home</span>
        </Link>
        <button onClick={handleSportsClick} className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-white/70 hover:bg-white/5 active:bg-gold/15 active:text-gold transition-all">
          <Globe className="w-[18px] h-[18px]" />
          <span className="text-[9px] font-bold uppercase tracking-wide">Sport</span>
        </button>
        <Link href="/results" className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-white/70 hover:bg-white/5 active:bg-gold/15 active:text-gold transition-all">
          <BarChart2 className="w-[18px] h-[18px]" />
          <span className="text-[9px] font-bold uppercase tracking-wide">Results</span>
        </Link>
        <Link href="/weekend-jackpot" className={cn(
          'flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all',
          jackpotOpen ? 'bg-gold/15 text-gold hover:bg-gold/25' : 'text-white/40 hover:bg-white/5'
        )}>
          <Trophy className="w-[18px] h-[18px]" />
          <span className="text-[9px] font-bold uppercase tracking-wide">Jackpot</span>
        </Link>
        <Link href="/check-slip" className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-white/70 hover:bg-white/5 active:bg-gold/15 active:text-gold transition-all">
          <Receipt className="w-[18px] h-[18px]" />
          <span className="text-[9px] font-bold uppercase tracking-wide">Check</span>
        </Link>
      </div>

      {/* Desktop center nav */}
      <div className="hidden md:flex relative border-t border-gold/10 items-center justify-center px-6 py-2 bg-slate-dark">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white/80 px-4 py-2 rounded-full border border-transparent hover:bg-gold/10 hover:border-gold/25 hover:text-gold transition-all group">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <button onClick={handleSportsClick} className="flex items-center gap-2 text-sm font-semibold text-white/80 px-4 py-2 rounded-full border border-transparent hover:bg-gold/10 hover:border-gold/25 hover:text-gold transition-all group">
            <Globe className="w-4 h-4" />
            <span>Sports</span>
          </button>
          <Link href="/results" className="flex items-center gap-2 text-sm font-semibold text-white/80 px-4 py-2 rounded-full border border-transparent hover:bg-gold/10 hover:border-gold/25 hover:text-gold transition-all group">
            <BarChart2 className="w-4 h-4" />
            <span>Results</span>
          </Link>
        </div>
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
