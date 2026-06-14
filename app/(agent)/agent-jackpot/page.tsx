'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { formatETB } from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import { FlagImage } from '@/components/shared/FlagImage'

export default function AgentJackpotPage() {
  const [jackpot, setJackpot] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: jp } = await supabase
        .from('jackpots')
        .select('*')
        .in('status', ['open', 'draft', 'closed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (jp) {
        setJackpot(jp)
        const { data: m } = await supabase
          .from('jackpot_matches')
          .select('*, leagues (name, countries (name, flag_emoji))')
          .eq('jackpot_id', jp.id)
          .order('game_number', { ascending: true })
        setMatches(m ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-gold" />
    </div>
  )

  if (!jackpot) return (
    <div className="p-6 text-center">
      <Trophy className="w-12 h-12 text-gold/30 mx-auto mb-3" />
      <p className="text-white/40">No active jackpot at the moment</p>
    </div>
  )

  return (
    <div className="p-4 max-w-2xl">
      {/* Header */}
      <div className="bg-slate-dark border border-gold/20 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-gold" />
          <div>
            <h1 className="text-lg font-bold text-white">{jackpot.name}</h1>
            <p className="text-gold text-xs">Prize: {formatETB(jackpot.win_all_reward)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Entry</p>
          <p className="text-gold font-mono font-bold">{formatETB(jackpot.fixed_stake)}</p>
        </div>
      </div>

      {/* Matches - compact view only */}
      <div className="space-y-2">
        {matches.map((m) => (
          <div key={m.id} className="bg-slate-dark border border-nile-blue/20 rounded-lg p-3">
            {/* Meta row: flag, league, date/time */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-gold/10 text-gold/70 flex-shrink-0">G{m.game_number}</span>
              {m.leagues?.countries?.flag_emoji && <FlagImage emoji={m.leagues.countries.flag_emoji} size="sm" />}
              {m.leagues?.name && <span className="text-[10px] text-white/40 truncate">{m.leagues.name}</span>}
              {m.kick_off_time && (
                <span className="text-[10px] text-white/25 font-mono ml-auto flex-shrink-0">
                  {new Date(m.kick_off_time).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })} · {new Date(m.kick_off_time).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-white text-xs font-medium flex-1 truncate">{m.home_team}</span>
              <div className="flex gap-1 flex-shrink-0">
                {[
                  { key: 'home', label: '1', odd: m.home_odd },
                  { key: 'draw', label: 'X', odd: m.draw_odd },
                  { key: 'away', label: '2', odd: m.away_odd },
                ].map((opt) => (
                  <div key={opt.key} className={cn(
                    'px-2 py-1 rounded text-center min-w-[40px] border',
                    m.result === opt.key ? 'bg-gold/20 border-gold' : 'bg-charcoal border-gold/10'
                  )}>
                    <p className="text-[9px] text-white/40">{opt.label}</p>
                    <p className="text-xs font-bold text-gold">{opt.odd}</p>
                  </div>
                ))}
              </div>
              <span className="text-white text-xs font-medium flex-1 text-right truncate">{m.away_team}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-white/30 text-xs text-center mt-4">View only — cashiers place jackpot bets</p>
    </div>
  )
}
