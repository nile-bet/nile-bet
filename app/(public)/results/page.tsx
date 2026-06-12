'use client'

import { useState, useEffect } from 'react'
import { PublicNavbar } from '@/components/shared/PublicNavbar'
import { Footer } from '@/components/shared/Footer'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/formatCurrency'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { Trophy, Swords } from 'lucide-react'

type Tab = 'normal' | 'jackpot'

function derive1X2(ftHome: number | null, ftAway: number | null): 'home' | 'draw' | 'away' | null {
  if (ftHome === null || ftAway === null) return null
  if (ftHome > ftAway) return 'home'
  if (ftHome === ftAway) return 'draw'
  return 'away'
}

function ResultBadge({ result }: { result: 'home' | 'draw' | 'away' | null }) {
  if (!result) return <span className="text-white/20 text-sm">—</span>
  const label = result === 'home' ? '1' : result === 'draw' ? 'X' : '2'
  const cls = result === 'home'
    ? 'bg-nile-success/20 border-nile-success/40 text-nile-success'
    : result === 'draw'
    ? 'bg-gold/20 border-gold/40 text-gold'
    : 'bg-nile-blue/30 border-nile-blue/50 text-nile-blue-light'
  return (
    <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-full border font-bold text-base', cls)}>
      {label}
    </span>
  )
}

export default function ResultsPage() {
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
        .then(({ data }) => {
          // Only show matches that have a result record with scores
          const settled = (data ?? []).filter((m: any) => {
            const r = m.match_results?.[0]
            return r && (r.ft_home !== null && r.ft_away !== null)
          })
          setMatches(settled)
          setLoading(false)
        })
    } else {
      supabase
        .from('jackpots')
        .select('*, jackpot_matches(*)')
        .eq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          // Only show jackpots where at least one match is settled
          const settled = (data ?? []).filter((jp: any) =>
            (jp.jackpot_matches ?? []).some((m: any) => m.result !== 'pending')
          )
          setJackpots(settled)
          setLoading(false)
        })
    }
  }, [tab])

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-white mb-6">Results</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'normal', label: 'Match Results', icon: Swords },
            { key: 'jackpot', label: 'Jackpot Results', icon: Trophy },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                tab === key
                  ? 'bg-gold/20 border-gold/50 text-gold'
                  : 'bg-slate-dark border-nile-blue/30 text-white/50 hover:text-white'
              )}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-white/40">Loading results...</div>
        ) : tab === 'normal' ? (
          matches.length === 0 ? (
            <EmptyState title="No results yet" message="Settled match results will appear here" icon={Swords} />
          ) : (
            <div className="space-y-3">
              {matches.map((match: any) => {
                const result = match.match_results?.[0]
                const ftHome = result?.ft_home ?? null
                const ftAway = result?.ft_away ?? null
                const outcome = derive1X2(ftHome, ftAway)
                const league = match.leagues
                const country = league?.countries
                return (
                  <div key={match.id} className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4">
                    {/* League & date */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] text-gold/60">
                        {country?.flag_emoji} {country?.name} · {league?.name}
                      </span>
                      <span className="text-[11px] text-white/40">{formatDate(match.kick_off_time)}</span>
                    </div>
                    {/* Teams + score + 1X2 */}
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium flex-1 truncate">{match.home_team}</span>
                      <div className="flex flex-col items-center gap-1 min-w-[90px]">
                        <span className="text-gold font-mono text-xl font-bold leading-none">
                          {ftHome ?? '?'} - {ftAway ?? '?'}
                        </span>
                        {result?.ht_home !== null && result?.ht_home !== undefined && (
                          <span className="text-[10px] text-white/30">
                            HT: {result.ht_home} - {result.ht_away}
                          </span>
                        )}
                      </div>
                      <span className="text-white font-medium flex-1 text-right truncate">{match.away_team}</span>
                    </div>
                    {/* 1X2 result */}
                    <div className="flex justify-center mt-3">
                      <ResultBadge result={outcome} />
                    </div>
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
                const jpMatches = (jackpot.jackpot_matches ?? [])
                  .sort((a: any, b: any) => a.game_number - b.game_number)
                const settledCount = jpMatches.filter((m: any) => m.result !== 'pending').length
                return (
                  <div key={jackpot.id} className="bg-slate-dark border border-gold/20 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gold/10 border-b border-gold/20 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-gold" />
                        <span className="text-white font-bold">{jackpot.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white/40 text-xs">{settledCount}/{jpMatches.length} settled</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full border font-medium text-nile-success bg-nile-success/10 border-nile-success/30">
                          finished
                        </span>
                      </div>
                    </div>

                    {/* Match rows */}
                    <div className="divide-y divide-nile-blue/10">
                      {jpMatches.map((m: any) => {
                        const settled = m.result !== 'pending'
                        return (
                          <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-nile-blue/5">
                            {/* Game number */}
                            <span className="text-[11px] text-white/30 font-mono w-5 text-center flex-shrink-0">
                              {m.game_number}
                            </span>
                            {/* Home team */}
                            <span className="text-white text-sm flex-1 truncate">{m.home_team}</span>
                            {/* 1X2 result badge */}
                            <div className="flex-shrink-0">
                              {settled
                                ? <ResultBadge result={m.result} />
                                : <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/10 text-white/20 text-sm">—</span>
                              }
                            </div>
                            {/* Away team */}
                            <span className="text-white text-sm flex-1 text-right truncate">{m.away_team}</span>
                            {/* Date */}
                            <span className="text-white/30 text-[10px] flex-shrink-0 w-16 text-right">
                              {new Date(m.kick_off_time).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Rewards */}
                    <div className="bg-charcoal/50 border-t border-nile-blue/20 px-5 py-3 flex gap-6">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-0.5">Win All</p>
                        <p className="text-gold font-mono text-sm font-bold">ETB {Number(jackpot.win_all_reward ?? 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-0.5">Near Win</p>
                        <p className="text-nile-success font-mono text-sm">ETB {Number(jackpot.near_win_reward ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="ml-auto">
                        <p className="text-[10px] text-white/40 uppercase mb-0.5">Entry Fee</p>
                        <p className="text-white font-mono text-sm">ETB {Number(jackpot.fixed_stake ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </main>

      <Footer />
    </div>
  )
}
