'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, Search } from 'lucide-react'
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'Sports' },
    { href: '/results', label: 'Results' },
  ]

  const JackpotButton = () => (
    <Link href="/jackpot">
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
    <nav className="bg-slate-dark border-b border-gold/20 sticky top-0 z-50 h-14">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/">
          <Logo size="md" showTagline />
        </Link>

        {/* Center: Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/70 hover:text-gold transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <JackpotButton />

          {!isAuthenticated ? (
            <>
              <Link href="/check-slip">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex border-gold/30 text-gold hover:bg-gold/10 text-xs"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Check Slip
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white text-xs"
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-gold text-charcoal hover:bg-gold-light font-semibold text-xs"
                >
                  Register
                </Button>
              </Link>
            </>
          ) : (
            <>
              {/* Balance */}
              <div className="hidden md:flex items-center bg-gold/10 border border-gold/30 rounded-md px-2.5 py-1">
                <span className="text-gold font-mono text-sm font-medium">
                  {formatETB(
                    user?.credit_balance ?? 0
                  )}
                </span>
              </div>

              {/* My Bets */}
              <Link
                href="/bettor-bets"
                className="hidden md:block text-sm text-white/70 hover:text-gold transition-colors"
              >
                My Bets
              </Link>

              {/* Notification Bell */}
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
                  className="bg-slate-dark border-nile-blue/40 text-white w-48"
                >
                  <div className="px-3 py-2 border-b border-nile-blue/20">
                    <p className="font-semibold text-sm">
                      @{user?.username}
                    </p>
                    {role && (
                      <RoleBadge
                        role={role}
                        className="mt-1"
                      />
                    )}
                  </div>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/bettor-bets"
                      className="cursor-pointer"
                    >
                      My Bets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/bettor-profile"
                      className="cursor-pointer"
                    >
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/bettor-notifications"
                      className="cursor-pointer"
                    >
                      Notifications
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-nile-blue/20" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-nile-danger cursor-pointer focus:text-nile-danger"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {/* Mobile menu */}
          <Sheet
            open={mobileOpen}
            onOpenChange={setMobileOpen}
          >
            <SheetTrigger asChild>
              <button className="md:hidden p-2 text-white/60 hover:text-white">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-slate-dark border-nile-blue/40 w-72"
            >
              <div className="flex flex-col gap-4 mt-6">
                <Logo size="md" showTagline />
                <div className="flex flex-col gap-2 mt-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() =>
                        setMobileOpen(false)
                      }
                      className="text-white/70 hover:text-gold py-2 border-b border-nile-blue/20"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/check-slip"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                    className="text-white/70 hover:text-gold py-2 border-b border-nile-blue/20"
                  >
                    Check Slip
                  </Link>
                  {isAuthenticated && (
                    <>
                      <Link
                        href="/bettor-bets"
                        onClick={() =>
                          setMobileOpen(false)
                        }
                        className="text-white/70 hover:text-gold py-2 border-b border-nile-blue/20"
                      >
                        My Bets
                      </Link>
                      <Link
                        href="/bettor-profile"
                        onClick={() =>
                          setMobileOpen(false)
                        }
                        className="text-white/70 hover:text-gold py-2 border-b border-nile-blue/20"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="text-nile-danger text-left py-2"
                      >
                        Logout
                      </button>
                    </>
                  )}
                  {!isAuthenticated && (
                    <div className="flex gap-2 mt-2">
                      <Link
                        href="/login"
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full border-gold/30 text-gold"
                        >
                          Login
                        </Button>
                      </Link>
                      <Link
                        href="/register"
                        className="flex-1"
                      >
                        <Button className="w-full bg-gold text-charcoal">
                          Register
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}