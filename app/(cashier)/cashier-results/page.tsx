'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import { Trophy, Swords, Home, Globe, BarChart2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

type Tab = 'normal' | 'jackpot'

export default function CashierResultsPage() {
  const [tab, setTab] = useState<Tab>('normal')
  const [matches, setMatches] = useState<any[]>([])
  const [jackpots, setJackpots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)

    if (tab === 'normal') {
      supabase
        .from('matches')
        .select('*, leagues(name, countries(flag_emoji, name)), match_results(*)')
        .eq('status', 'finished')
        .order('kick_off_time', { ascending: false })
        .limit(100)
        .then(({ data }) => { setMatches(data ?? []); setLoading(false) })
    } else {
      supabase
        .from('jackpots')
        .select('*, jackpot_matches(*)')
        .in('status', ['finished', 'closed', 'results_in'])
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => { setJackpots(data ?? []); setLoading(false) })
    }
  }, [tab])

  const resultLabel = (result: string) => {
    if (result === 'home') return '1'
    if (result === 'draw') return 'X'
    if (result === 'away') return '2'
    return '?'
  }

  const resultColor = (result: string) => {
    if (result === 'home') return 'text-nile-success'
    if (result === 'draw') return 'text-gold'
    if (result === 'away') return 'text-nile-blue-light'
    return 'text-white/30'
  }

  const handleSportsClick = (e: React.MouseEvent) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('open-countries-panel'))
  }
  return (
    <div className="flex flex-col">

    <div className="py-4 max-w-4xl" style={{ paddingLeft: "8.75rem", paddingRight: "8.75rem" }}>
      <h1 className="font-display text-2xl font-bold text-white mb-6">Results</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'normal', label: 'Match Results', icon: Swords },
          { key: 'jackpot', label: 'Jackpot Results', icon: Trophy },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              tab === key ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-slate-dark border-nile-blue/30 text-white/50 hover:text-white'
            )}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-white/40">Loading results...</div>
      ) : tab === 'normal' ? (
        matches.length === 0 ? (
          <EmptyState title="No results yet" message="Finished match results will appear here" icon={Swords} />
        ) : (
          <div className="space-y-3">
            {matches.map((match: any) => {
              const result = match.match_results?.[0]
              const league = match.leagues
              const country = league?.countries
              return (
                <div key={match.id} className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-gold/60">
                      {country?.flag_emoji} {country?.name} - {league?.name}
                    </span>
                    <span className="text-[11px] text-white/40">{formatDate(match.kick_off_time)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium flex-1">{match.home_team}</span>
                    <div className="text-center px-4">
                      {result ? (
                        <span className="text-gold font-mono text-xl font-bold">
                          {result.ft_home} - {result.ft_away}
                        </span>
                      ) : (
                        <span className="text-white/30 text-sm">vs</span>
                      )}
                    </div>
                    <span className="text-white font-medium flex-1 text-right">{match.away_team}</span>
                  </div>
                  {result && result.ht_home !== null && (
                    <p className="text-center text-[11px] text-white/30 mt-1">
                      HT: {result.ht_home} - {result.ht_away}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : (
        jackpots.length === 0 ? (
          <EmptyState title="No jackpot results yet" message="Finished jackpot results will appear here" icon={Trophy} />
        ) : (
          <div className="space-y-6">
            {jackpots.map((jackpot: any) => {
              const jpMatches = (jackpot.jackpot_matches ?? []).sort((a: any, b: any) => a.game_number - b.game_number)
              const finished = jpMatches.filter((m: any) => m.result !== 'pending').length
              return (
                <div key={jackpot.id} className="bg-slate-dark border border-gold/20 rounded-xl overflow-hidden">
                  <div className="bg-gold/10 border-b border-gold/20 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gold" />
                      <span className="text-white font-bold">{jackpot.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 text-xs">{finished}/{jpMatches.length} results</span>
                      <span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium',
                        jackpot.status === 'finished' ? 'text-nile-success bg-nile-success/10 border-nile-success/30' : 'text-gold bg-gold/10 border-gold/30'
                      )}>{jackpot.status}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-nile-blue/10">
                    {jpMatches.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-nile-blue/5">
                        <div className="w-6 text-center">
                          <span className="text-[11px] text-white/30 font-mono">{m.game_number}</span>
                        </div>
                        <span className="text-white text-sm flex-1 ml-3">{m.home_team}</span>
                        <div className="flex items-center gap-2 px-4">
                          {m.result !== 'pending' ? (
                            <span className={cn('font-bold text-lg w-6 text-center', resultColor(m.result))}>
                              {resultLabel(m.result)}
                            </span>
                          ) : (
                            <span className="text-white/20 text-sm w-6 text-center">-</span>
                          )}
                        </div>
                        <span className="text-white text-sm flex-1 text-right">{m.away_team}</span>
                        <span className="text-white/30 text-[10px] ml-3 w-20 text-right">
                          {new Date(m.kick_off_time).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-charcoal/50 border-t border-nile-blue/20 px-5 py-3 flex gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-white/40 uppercase">Win All</p>
                      <p className="text-gold font-mono text-sm font-bold">ETB {Number(jackpot.win_all_reward ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-white/40 uppercase">Near Win</p>
                      <p className="text-nile-success font-mono text-sm">ETB {Number(jackpot.near_win_reward ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center ml-auto">
                      <p className="text-[10px] text-white/40 uppercase">Entry</p>
                      <p className="text-white font-mono text-sm">ETB {Number(jackpot.fixed_stake ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
    </div>
  )
}