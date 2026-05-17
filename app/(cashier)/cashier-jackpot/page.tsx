'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Loader2 } from 'lucide-react'
import { formatETB } from '@/lib/utils/formatCurrency'

export default function CashierJackpotPage() {
  const [jackpot, setJackpot] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: jp } = await supabase
        .from('jackpots')
        .select('*')
        .in('status', ['open', 'draft'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (jp) {
        setJackpot(jp)
        const { data: m } = await supabase
          .from('jackpot_matches')
          .select('*')
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
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-gold" />
        <div>
          <h1 className="text-2xl font-bold text-white">{jackpot.name}</h1>
          <p className="text-gold text-sm">Win {formatETB(jackpot.win_all_reward)} — Pick all 12 correctly</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {matches.map((m) => (
          <div key={m.id} className="bg-slate-dark border border-nile-blue/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gold/60 font-medium">Game {m.game_number}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-white text-sm font-medium flex-1">{m.home_team}</span>
              <div className="flex gap-1">
                <div className="bg-charcoal border border-gold/20 rounded px-2 py-1 text-center min-w-[52px]">
                  <p className="text-[10px] text-white/40">1</p>
                  <p className="text-gold text-sm font-bold">{m.home_odd}</p>
                </div>
                <div className="bg-charcoal border border-gold/20 rounded px-2 py-1 text-center min-w-[52px]">
                  <p className="text-[10px] text-white/40">X</p>
                  <p className="text-gold text-sm font-bold">{m.draw_odd}</p>
                </div>
                <div className="bg-charcoal border border-gold/20 rounded px-2 py-1 text-center min-w-[52px]">
                  <p className="text-[10px] text-white/40">2</p>
                  <p className="text-gold text-sm font-bold">{m.away_odd}</p>
                </div>
              </div>
              <span className="text-white text-sm font-medium flex-1 text-right">{m.away_team}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
