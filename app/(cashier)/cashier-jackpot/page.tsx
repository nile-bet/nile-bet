'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { placeJackpotBet } from '@/lib/actions/jackpot'
import { Trophy, Loader2, Lock, Unlock } from 'lucide-react'
import { formatETB } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Selection = 'home' | 'draw' | 'away'

export default function CashierJackpotPage() {
  const { user } = useAuthStore()
  const [jackpot, setJackpot] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [selections, setSelections] = useState<Record<number, Selection>>({})
  const [isAnonymous, setIsAnonymous] = useState(false)
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

  const handleSelect = (gameNumber: number, sel: Selection) => {
    setSelections(prev => ({ ...prev, [gameNumber]: sel }))
  }

  const selectedCount = Object.keys(selections).length
  const allSelected = selectedCount === matches.length && matches.length > 0

  const handlePlace = async () => {
    if (!user || !jackpot || !allSelected) return
    setPlacing(true)
    const result = await placeJackpotBet({
      jackpotId: jackpot.id,
      bettorId: user.id,
      placedById: user.id,
      isAnonymous,
      selections: matches.map(m => ({
        gameNumber: m.game_number,
        selection: selections[m.game_number],
        odd: selections[m.game_number] === 'home' ? m.home_odd
          : selections[m.game_number] === 'draw' ? m.draw_odd
          : m.away_odd,
      })),
    })
    if (result.success) {
      toast.success(`Jackpot slip placed! #${result.slipId}`)
      setSelections({})
    } else {
      toast.error(result.error ?? 'Failed to place jackpot bet')
    }
    setPlacing(false)
  }

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
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-7 h-7 text-gold" />
          <div>
            <h1 className="text-2xl font-bold text-white">{jackpot.name}</h1>
            <p className="text-gold text-sm">Win {formatETB(jackpot.win_all_reward)} — Pick all {matches.length} correctly</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">Stake</p>
          <p className="text-gold font-mono font-bold text-lg">{formatETB(jackpot.fixed_stake)}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-slate-dark border border-gold/20 rounded-xl p-3 mb-4 flex items-center justify-between">
        <span className="text-white/60 text-sm">{selectedCount} of {matches.length} selected</span>
        <div className="flex gap-1">
          {matches.map((_, i) => (
            <div key={i} className={cn('w-4 h-1.5 rounded-full', selections[i+1] ? 'bg-gold' : 'bg-white/10')} />
          ))}
        </div>
      </div>

      {/* Matches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {matches.map((m) => (
          <div key={m.id} className={cn(
            'bg-slate-dark border rounded-xl p-4 transition-colors',
            selections[m.game_number] ? 'border-gold/40' : 'border-nile-blue/30'
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gold/60 font-medium">Game {m.game_number}</span>
              {selections[m.game_number] && (
                <span className="text-xs text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                  {selections[m.game_number] === 'home' ? m.home_team : selections[m.game_number] === 'away' ? m.away_team : 'Draw'}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-white text-sm font-medium flex-1 truncate">{m.home_team}</span>
              <div className="flex gap-1 flex-shrink-0">
                {(['home', 'draw', 'away'] as Selection[]).map((sel) => (
                  <button
                    key={sel}
                    onClick={() => handleSelect(m.game_number, sel)}
                    className={cn(
                      'px-2 py-1.5 rounded text-center min-w-[52px] transition-all border',
                      selections[m.game_number] === sel
                        ? 'bg-gold border-gold text-charcoal font-bold'
                        : 'bg-charcoal border-gold/20 hover:border-gold/50'
                    )}
                  >
                    <p className="text-[10px] text-inherit opacity-60">{sel === 'home' ? '1' : sel === 'draw' ? 'X' : '2'}</p>
                    <p className="text-sm font-bold">
                      {sel === 'home' ? m.home_odd : sel === 'draw' ? m.draw_odd : m.away_odd}
                    </p>
                  </button>
                ))}
              </div>
              <span className="text-white text-sm font-medium flex-1 text-right truncate">{m.away_team}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Place bet */}
      <div className="bg-slate-dark border border-gold/20 rounded-xl p-4 space-y-3">
        <button
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={cn(
            'flex items-center gap-2 text-xs px-3 py-2 rounded-lg border w-full',
            isAnonymous ? 'border-nile-orange/40 text-nile-orange bg-nile-orange/10' : 'border-nile-blue/30 text-white/50 hover:text-white'
          )}
        >
          {isAnonymous ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {isAnonymous ? 'Placing anonymously' : 'Place anonymously'}
        </button>
        <button
          onClick={handlePlace}
          disabled={!allSelected || placing || !user}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-bold transition-colors',
            allSelected && !placing && user
              ? 'bg-gold text-charcoal hover:bg-gold-light'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          )}
        >
          {placing ? 'Placing...' : allSelected ? `Place Jackpot — ${formatETB(jackpot.fixed_stake)}` : `Select all ${matches.length} games to place bet`}
        </button>
      </div>
    </div>
  )
}
