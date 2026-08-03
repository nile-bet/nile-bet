import Link from 'next/link'
import { Logo } from './Logo'
import { Phone } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-slate-dark border-t-4 border-gold/20 mt-8 md:mt-16">
      <div className="px-4 py-6 md:px-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {/* Col 1: Brand */}
          <div>
            <Logo
              size="lg"
              showTagline
            />
            <p className="text-xs md:text-sm text-white/60 mt-3 mb-2 md:mt-4 md:mb-3 leading-relaxed">
              Premium international sports
              betting platform built for
              Ethiopians. Most competitive
              sports betting platform.
              100+ markets. 50+ leagues.
            </p>
            <p className="text-xs md:text-sm text-white/70 mb-1">
              Instant payouts. Zero hassle.
            </p>
            <p className="text-xs md:text-sm text-white/70 mb-3 md:mb-4">
              Your bet. Your rules. Your moment.
            </p>
            <Link href="/rules">
              <button className="border border-nile-danger text-nile-danger text-xs px-4 py-2 rounded-md hover:bg-nile-danger/10 transition-colors">
                21+ | Play Responsibly
              </button>
            </Link>
          </div>

          {/* Col 2: Popular Leagues */}
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-white mb-2 md:mb-4">
              Popular Leagues
            </h4>
            <div className="flex flex-col gap-1.5 md:gap-2.5">
              {[
                {
                  label:
                    'Ethiopian Premier League',
                  href: '/?league=eth',
                },
                {
                  label: 'Premier League',
                  href: '/?league=epl',
                },
                {
                  label: 'La Liga',
                  href: '/?league=laliga',
                },
                {
                  label: 'Serie A',
                  href: '/?league=seriea',
                },
                {
                  label: 'Bundesliga',
                  href: '/?league=bundes',
                },
                {
                  label: 'UEFA Champions League',
                  href: '/?league=ucl',
                },
                {
                  label: 'Ligue 1',
                  href: '/?league=ligue1',
                },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs md:text-sm text-white/60 hover:text-gold transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: NILE Sports Betting */}
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-white mb-2 md:mb-4">
              NILE Sports Betting
            </h4>
            <div className="flex flex-col gap-1.5 md:gap-2.5">
              {[
                { label: 'My Bets', href: '/bettor-bets' },
                { label: 'Top-up', href: '/bettor-profile?tab=topup' },
                { label: 'Withdraw', href: '/bettor-profile?tab=withdraw' },
                { label: 'Check Slip', href: '/check-slip' },
                { label: 'Weekend Jackpot', href: '/weekend-jackpot' },
                { label: 'About NILE Betting', href: '/about' },
                { label: 'Rules & Regulations', href: '/rules' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms & Conditions', href: '/terms' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs md:text-sm text-white/60 hover:text-gold transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 4: Company */}
          <div>
            <h4 className="text-xs md:text-sm font-semibold text-white mb-2 md:mb-4">
              Company Information
            </h4>
            <div className="text-xs md:text-sm text-white/60 leading-relaxed md:leading-loose">
              <p>elitebet Ltd.</p>
              <p>Mail Box Office 66 95</p>
              <p>Wilton Rd London</p>
              <p>Greater London,</p>
              <p>SW1V 1BZ, United Kingdom</p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Phone className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs md:text-sm text-gold font-medium">
                +44 7788 443322
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <a href="mailto:nilebetting@gmail.com" className="text-xs md:text-sm text-gold font-medium hover:underline">✉ nilebetting@gmail.com</a>
            </div>
          </div>
        </div>
      </div>

      {/* Follow Us */}
      <div className="border-t border-gold/10 px-4 py-5 md:px-6 md:py-6">
        <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-0">
          <h4 className="text-xs md:text-sm font-semibold tracking-wide text-white/80 uppercase">
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
      <div className="border-t border-gold/10 py-3 md:py-4 px-4 md:px-6">
        <p className="text-xs text-white/30 text-center">
          © 2026 NILE Betting. All rights
          reserved. Bet responsibly. 21+
          only.
        </p>
      </div>
    </footer>
  )
}
