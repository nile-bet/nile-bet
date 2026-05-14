'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { EmptyState }
  from '@/components/shared/EmptyState'
import { LoadingSpinner }
  from '@/components/shared/LoadingSpinner'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { getActiveJackpot }
  from '@/lib/actions/jackpot'
import { placeJackpotBet }
  from '@/lib/actions/jackpot'
import { formatETB, formatKickOff }
  from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'
import type { JackpotWithMatches }
  from '@/types/database.types'

type Selection = 'home' | 'draw' | 'away'

export default function JackpotPage() {
  const [jackpot, setJackpot] =
    useState<JackpotWithMatches | null>(null)
  const [loading, setLoading] =
    useState(true)
  const [selections, setSelections] =
    useState<Record<string, Selection>>({})
  const [placing, setPlacing] =
    useState(false)
  const { user, isAuthenticated } =
    useAuthStore()
  const router = useRouter()

  useEffect(() => {
    getActiveJackpot().then((data) => {
      setJackpot(data)
      setLoading(false)
    })
  }, [])

  const handleSelect = (
    matchId: string,
    sel: Selection
  ) => {
    setSelections((prev) => ({
      ...prev,
      [matchId]: sel,
    }))
  }

  const totalSelected = Object.keys(
    selections
  ).length
  const allSelected =
    jackpot &&
    totalSelected ===
      jackpot.jackpot_matches.length

  const handlePlace = async () => {
    if (!jackpot || !allSelected) return

    if (!isAuthenticated || !user) {
      toast.error('Please login to place a jackpot bet')
      router.push('/login')
      return
    }

    const stake = jackpot.fixed_stake ?? 50
    if (user.credit_balance < stake) {
      toast.error(
        `Insufficient balance. You need ETB ${stake}`
      )
      return
    }

    setPlacing(true)

    const selArray =
      jackpot.jackpot_matches.map((m) => ({
        jackpotMatchId: m.id,
        gameNumber: m.game_number,
        selection:
          selections[m.id] ?? 'home',
      }))

    const result = await placeJackpotBet({
      jackpotId: jackpot.id,
      bettorId: user.id,
      placedById: user.id,
      selections: selArray,
      isAnonymous: false,
    })

    if (result.success) {
      toast.success(
        `🏆 Jackpot bet placed! Slip ID: ${result.slipId}`
      )
      setSelections({})
    } else {
      toast.error(
        result.error ?? 'Failed to place bet'
      )
    }

    setPlacing(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 px-4 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-nile-blue to-charcoal border-b border-gold/20 rounded-xl p-8 text-center mb-8 max-w-4xl mx-auto">
          <p className="text-[11px] tracking-widest text-gold uppercase mb-2">
            🏆 Weekend Jackpot
          </p>
          <h1 className="font-display text-3xl font-bold text-white mb-4">
            Flow into Wins
          </h1>
          <div className="flex justify-center gap-8 mb-4">
            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-gold">
                ETB 250,000
              </p>
              <p className="text-white/50 text-sm">
                🏆 All 12 correct
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-gold">
                ETB 25,000
              </p>
              <p className="text-white/50 text-sm">
                🥈 Miss only 1
              </p>
            </div>
          </div>
          <p className="text-white/50 text-sm">
            Entry: ETB{' '}
            {jackpot?.fixed_stake ?? 50} |
            Market: 1X2 Only
          </p>
          {jackpot && (
            <span className="inline-block mt-3 bg-nile-success/20 text-nile-success border border-nile-success/40 text-xs px-3 py-1 rounded-full font-semibold">
              OPEN
            </span>
          )}
          {!loading && !jackpot && (
            <span className="inline-block mt-3 bg-nile-danger/20 text-nile-danger border border-nile-danger/40 text-xs px-3 py-1 rounded-full font-semibold">
              CLOSED
            </span>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner
              size="lg"
              color="gold"
              text="Loading jackpot..."
            />
          </div>
        )}

        {!loading && !jackpot && (
          <EmptyState
            title="No jackpot this weekend"
            message="Check back on Friday for the next Weekend Jackpot!"
            icon={Trophy}
          />
        )}

        {jackpot && !loading && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Match cards */}
            <div className="lg:col-span-2 space-y-3">
              {jackpot.jackpot_matches.map(
                (match) => (
                  <div
                    key={match.id}
                    className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4"
                  >
                    <p className="text-gold text-[10px] tracking-widest uppercase mb-2">
                      Game {match.game_number}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium text-sm">
                        {match.home_team}
                      </span>
                      <span className="text-white/40 text-xs">
                        vs
                      </span>
                      <span className="text-white font-medium text-sm">
                        {match.away_team}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs text-center mb-3">
                      {formatKickOff(
                        match.kick_off_time
                      )}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          {
                            key: 'home' as Selection,
                            label: '1 Home',
                            odd: match.home_odd,
                          },
                          {
                            key: 'draw' as Selection,
                            label: 'X Draw',
                            odd: match.draw_odd,
                          },
                          {
                            key: 'away' as Selection,
                            label: '2 Away',
                            odd: match.away_odd,
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() =>
                            handleSelect(
                              match.id,
                              opt.key
                            )
                          }
                          className={cn(
                            'flex flex-col items-center py-2 px-3 rounded-lg border transition-colors',
                            selections[
                              match.id
                            ] === opt.key
                              ? 'bg-gold border-gold'
                              : 'bg-charcoal border-nile-blue/40 hover:border-gold/40'
                          )}
                        >
                          <span
                            className={cn(
                              'text-xs',
                              selections[
                                match.id
                              ] === opt.key
                                ? 'text-charcoal'
                                : 'text-white/60'
                            )}
                          >
                            {opt.label}
                          </span>
                          <span
                            className={cn(
                              'font-mono text-sm font-bold',
                              selections[
                                match.id
                              ] === opt.key
                                ? 'text-charcoal'
                                : 'text-gold'
                            )}
                          >
                            {opt.odd.toFixed(
                              2
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Slip builder */}
            <div className="lg:col-span-1">
              <div className="bg-slate-dark border border-gold/20 rounded-xl p-5 sticky top-20">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold" />
                  Your Jackpot Slip
                </h3>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/50">
                      Progress
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        allSelected
                          ? 'text-nile-success'
                          : 'text-gold'
                      )}
                    >
                      {totalSelected} / 12
                    </span>
                  </div>
                  <div className="h-2 bg-charcoal rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        allSelected
                          ? 'bg-nile-success'
                          : 'bg-gold'
                      )}
                      style={{
                        width: `${(totalSelected / 12) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Selections list */}
                <div className="space-y-1.5 mb-4 max-h-60 overflow-y-auto scrollbar-hide">
                  {jackpot.jackpot_matches.map(
                    (m, i) => {
                      const sel =
                        selections[m.id]
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-white/50 truncate flex-1">
                            {i + 1}.{' '}
                            {m.home_team} vs{' '}
                            {m.away_team}
                          </span>
                          <span
                            className={cn(
                              'ml-2 font-medium flex-shrink-0',
                              sel
                                ? 'text-gold'
                                : 'text-white/20'
                            )}
                          >
                            {sel
                              ? sel === 'home'
                                ? '1'
                                : sel === 'draw'
                                ? 'X'
                                : '2'
                              : '⬜'}
                          </span>
                        </div>
                      )
                    }
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gold/10 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">
                      Fixed Stake:
                    </span>
                    <span className="text-gold font-mono font-bold">
                      ETB{' '}
                      {jackpot.fixed_stake ?? 50}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">
                      🏆 Win all 12:
                    </span>
                    <span className="text-gold font-mono">
                      {formatETB(
                        jackpot.win_all_reward
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">
                      🥈 Miss 1:
                    </span>
                    <span className="text-gold font-mono">
                      {formatETB(
                        jackpot.near_win_reward
                      )}
                    </span>
                  </div>

                  <button
                    onClick={handlePlace}
                    disabled={
                      !allSelected || placing
                    }
                    className={cn(
                      'w-full py-3 rounded-lg font-semibold text-sm transition-colors mt-2',
                      allSelected && !placing
                        ? 'bg-gold text-charcoal hover:bg-gold-light'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    )}
                  >
                    {placing
                      ? 'Placing...'
                      : allSelected
                      ? 'Place Jackpot Bet 🏆'
                      : `Select all 12 games`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}