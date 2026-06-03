import Link from 'next/link'
import { Logo } from './Logo'
import { Phone } from 'lucide-react'

export function CashierFooter() {
  return (
    <footer className="bg-slate-dark border-t border-gold/10">
      <div className="px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div>
            <Logo size="lg" showTagline />
            <p className="text-sm text-white/60 mt-4 mb-3 leading-relaxed">
              Premium international sports betting platform built for Ethiopians. Most competitive sports betting platform. 100+ markets. 50+ leagues.
            </p>
            <p className="text-sm text-white/70 mb-1">Instant payouts. Zero hassle.</p>
            <p className="text-sm text-white/70 mb-4">Your bet. Your rules. Your moment.</p>
            <Link href="/cashier-rules">
              <button className="border border-nile-danger text-nile-danger text-xs px-4 py-2 rounded-md hover:bg-nile-danger/10 transition-colors">
                18+ | Play Responsibly
              </button>
            </Link>
          </div>

          {/* Col 2: Popular Leagues */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Popular Leagues</h4>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Ethiopian Premier League', href: '/cashier-place-bet?league=eth' },
                { label: 'Premier League', href: '/cashier-place-bet?league=epl' },
                { label: 'La Liga', href: '/cashier-place-bet?league=laliga' },
                { label: 'Serie A', href: '/cashier-place-bet?league=seriea' },
                { label: 'Bundesliga', href: '/cashier-place-bet?league=bundes' },
                { label: 'UEFA Champions League', href: '/cashier-place-bet?league=ucl' },
                { label: 'Ligue 1', href: '/cashier-place-bet?league=ligue1' },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-white/60 hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: Cashier Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">NILE Sports Betting</h4>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Place Bet', href: '/cashier-place-bet' },
                { label: 'Check Slip', href: '/cashier-check-slip' },
                { label: 'Slip History', href: '/cashier-slip-history' },
                { label: 'Weekend Jackpot', href: '/cashier-jackpot' },
                { label: 'Results', href: '/cashier-results' },
                { label: 'About NILE Betting', href: '/cashier-about' },
                { label: 'Rules & Regulations', href: '/cashier-rules' },
                { label: 'Privacy Policy', href: '/cashier-privacy' },
                { label: 'Terms & Conditions', href: '/cashier-terms' },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-white/60 hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 4: Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company Information</h4>
            <div className="text-sm text-white/60 leading-loose">
              <p>elitebet Ltd.</p>
              <p>Mail Box Office 66 95</p>
              <p>Wilton Rd London</p>
              <p>Greater London,</p>
              <p>SW1V 1BZ, United Kingdom</p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Phone className="w-3.5 h-3.5 text-gold" />
              <span className="text-sm text-gold font-medium">+44 7788 443322</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gold font-medium">✉ nilebetting@gmail.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gold/10 py-4 px-6">
        <p className="text-xs text-white/30 text-center">
          © 2026 NILE Bet. All rights reserved. Bet responsibly. 18+ only.
        </p>
      </div>
    </footer>
  )
}
