import Link from 'next/link'
import { Logo } from './Logo'
import { Phone, Mail } from 'lucide-react'

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
                21+ | Play Responsibly
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
              <a href="mailto:nilebetting@gmail.com" className="text-sm text-gold font-medium hover:underline flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />nilebetting@gmail.com</a>
            </div>
          </div>
        </div>
      </div>

      {/* Follow Us */}
      <div className="border-t border-gold/10 px-6 py-6">
        <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-0">
          <h4 className="text-sm font-semibold tracking-wide text-white/80 uppercase">
            Follow Us
          </h4>
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/nilebetting"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="group w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white shadow-md shadow-black/30 transition-transform duration-200 hover:scale-110 hover:shadow-lg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a
              href="https://t.me/nilebetting"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="group w-10 h-10 flex items-center justify-center rounded-full bg-[#29A9EA] text-white shadow-md shadow-black/30 transition-transform duration-200 hover:scale-110 hover:shadow-lg"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M21.05 3.16 2.83 10.4c-1.24.5-1.23 1.2-.23 1.5l4.66 1.46 1.8 5.5c.22.6.37.85.75.85.3 0 .43-.14.6-.3l1.75-1.7 4.65 3.4c.86.47 1.47.23 1.68-.8l3.05-14.3c.31-1.26-.48-1.83-1.5-1.4Z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gold/10 py-4 px-6">
        <p className="text-xs text-white/30 text-center">
          © 2026 NILE Betting. All rights reserved. Bet responsibly. 21+ only.
        </p>
      </div>
    </footer>
  )
}
