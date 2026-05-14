import { PublicNavbar } from '@/components/shared/PublicNavbar'
import { Footer } from '@/components/shared/Footer'
import { Logo } from '@/components/shared/Logo'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 text-center">
        <div className="flex justify-center mb-6"><Logo size="lg" showTagline /></div>
        <h1 className="font-display text-3xl font-bold text-white mb-4">About NILE Bet</h1>
        <p className="text-white/60 leading-relaxed mb-8">Premium international sports betting platform built for Ethiopians. The most competitive sports betting platform with 100+ markets and 50+ leagues.</p>
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[{ v: '50+', l: 'Leagues' }, { v: '100+', l: 'Markets' }, { v: 'ETB 250K', l: 'Jackpot Prize' }].map(item => (
            <div key={item.l} className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4">
              <p className="text-gold font-mono text-2xl font-bold">{item.v}</p>
              <p className="text-white/50 text-sm">{item.l}</p>
            </div>
          ))}
        </div>
        <p className="text-white/40 text-sm">elitebet Ltd. | SW1V 1BZ, United Kingdom | +44 7788 443322</p>
      </main>
      <Footer />
    </div>
  )
}