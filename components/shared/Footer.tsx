import Link from 'next/link'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="bg-slate-dark border-t border-gold/10 py-4 px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Logo size="sm" showTagline={false} />
          <span className="text-white/30 text-xs">© 2026 NILE Bet. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/rules" className="hover:text-white transition-colors">Rules</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/check-slip" className="hover:text-white transition-colors">Check Slip</Link>
          <a href="mailto:nilebetting@gmail.com" className="hover:text-white transition-colors">nilebetting@gmail.com</a>
          <Link href="/rules">
            <span className="border border-nile-danger text-nile-danger px-2 py-0.5 rounded text-[10px]">18+ Bet Responsibly</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
