'use client'

import { Trophy, Swords, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type Tab = 'normal' | 'jackpot'

export default function CashierResultsPage() {
  const [tab, setTab] = useState<Tab>('normal')

  return (
    <div className="px-4 py-6 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-white mb-6">Results</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {([
          { key: 'normal', label: 'Match Results', icon: Swords },
          { key: 'jackpot', label: 'Jackpot Results', icon: Trophy },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              tab === key
                ? 'bg-gold/20 border-gold/50 text-gold'
                : 'bg-slate-dark border-nile-blue/30 text-white/50 hover:text-white'
            )}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mb-6">
          <Clock className="w-9 h-9 text-gold" />
        </div>
        <h2 className="text-white font-display text-2xl font-bold mb-3">Coming Soon</h2>
        <p className="text-white/40 text-sm max-w-xs leading-relaxed">
          {tab === 'normal'
            ? 'Match results will be displayed here once available. Check back after matches are settled.'
            : 'Jackpot results will be displayed here once the jackpot is settled. Stay tuned!'}
        </p>
        <div className="mt-8 flex items-center gap-2 text-white/20 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          Results updating soon
        </div>
      </div>
    </div>
  )
}
