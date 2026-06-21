'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { Logo }
  from '@/components/shared/Logo'
import { SlipDetailCard }
  from '@/components/shared/SlipDetailCard'
import { LoadingSpinner }
  from '@/components/shared/LoadingSpinner'
import { getSlipById } from '@/lib/actions/bets'
import { getJackpotSlipById } from '@/lib/actions/jackpot'
import { cn } from '@/lib/utils'
import { Clock, Trash2, Info } from 'lucide-react'
import type { SlipWithSelections }
  from '@/types/database.types'

const HISTORY_KEY = 'nilebet_slip_history_public'
const MAX_HISTORY = 10

export default function CheckSlipPage() {
  const [slipId, setSlipId] = useState('')
  const [loading, setLoading] =
    useState(false)
  const [slip, setSlip] =
    useState<SlipWithSelections | null>(null)
  const [notFound, setNotFound] =
    useState(false)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) setHistory(JSON.parse(stored))
  }, [])

  const addToHistory = (id: string) => {
    setHistory(prev => {
      const updated = [id, ...prev.filter(i => i !== id)].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  const [jackpotSlip, setJackpotSlip] = useState<any>(null)

  const handleCheck = async () => {
    if (!slipId.trim()) return
    const id = slipId.trim().toUpperCase()
    setLoading(true)
    setNotFound(false)
    setSlip(null)
    setJackpotSlip(null)

    if (id.startsWith('JP')) {
      const data = await getJackpotSlipById(id)
      if (data) { setJackpotSlip(data); addToHistory(id) }
      else setNotFound(true)
    } else {
      const data = await getSlipById(id)
      if (data) { setSlip(data); addToHistory(id) }
      else setNotFound(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="flex justify-center mb-2">
              <Logo size="lg" showTagline />
            </div>
            <h1 className="font-display text-xl font-bold text-white mb-1">
              Check Your Slip
            </h1>
            <p className="text-white/40 text-xs">
              Enter your slip ID to see the
              current status
            </p>
          </div>

          {/* Input card */}
          <div className="bg-slate-dark border border-gold/20 rounded-xl p-6 mb-6">
            <label className="text-sm text-white/70 block mb-2">
              Enter Slip ID
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={slipId}
                onChange={(e) =>
                  setSlipId(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  handleCheck()
                }
                placeholder="e.g. 48392017 or JP85391421"
                maxLength={10}
                className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white font-mono text-center placeholder:text-white/25 placeholder:font-sans focus:outline-none focus:border-gold/50"
              />
              <button
                onClick={handleCheck}
                disabled={
                  !slipId.trim() || loading
                }
                className={cn(
                  'px-5 py-3 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2',
                  slipId.trim() && !loading
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                <Search className="w-4 h-4" />
                Check
              </button>
            </div>
          </div>

          {/* Result */}
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner
                size="md"
                color="gold"
                text="Searching..."
              />
            </div>
          )}

          {notFound && !loading && (
            <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-xl p-6 text-center">
              <p className="text-nile-danger font-semibold">
                ❌ Slip not found
              </p>
              <p className="text-white/40 text-xs mt-1">
                Please check the ID and try
                again
              </p>
            </div>
          )}

          {slip && !loading && (
            <SlipDetailCard
              slip={slip}
              showShareOptions
            />
          )}

              {jackpotSlip && !loading && (
                <div className="bg-slate-dark border border-gold/30 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="bg-gold/10 border-b border-gold/20 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      <div>
                        <p className="text-gold font-bold font-mono">#{jackpotSlip.slip_id}</p>
                        <p className="text-white/40 text-xs">{jackpotSlip.jackpots?.name}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                      jackpotSlip.status === 'paid' ? 'text-sky-400 border-sky-400/30 bg-sky-400/10' :
                      jackpotSlip.status === 'won' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                      jackpotSlip.status === 'near_win' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
                      jackpotSlip.status === 'lost' ? 'text-red-400 border-red-400/30 bg-red-400/10' :
                      'text-white/50 border-white/20 bg-white/5'
                    }`}>{jackpotSlip.status === 'paid' ? '✓ PAID' : jackpotSlip.status?.toUpperCase()}</span>
                  </div>
                  {/* Info */}
                  <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b border-nile-blue/20 text-sm">
                    <div>
                      <p className="text-white/40 text-xs">Bettor</p>
                      <p className="text-white font-medium">{jackpotSlip.is_anonymous ? '🔒 Anonymous' : `@${(jackpotSlip.bettor as any)?.username ?? '—'}`}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Entry Fee</p>
                      <p className="text-gold font-mono font-bold">{jackpotSlip.stake ? `ETB ${Number(jackpotSlip.stake).toLocaleString()}` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Score</p>
                      <p className="text-white font-mono">{jackpotSlip.correct_count !== null ? `${jackpotSlip.correct_count}/12` : 'Pending'}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">
                        {jackpotSlip.status === 'paid' ? 'Prize (Paid)' : jackpotSlip.status === 'near_win' ? 'Insured Refund (no tax)' : 'Prize (after 15% tax)'}
                      </p>
                      <p className={`font-mono font-bold ${(jackpotSlip.reward_amount ?? 0) > 0 ? (jackpotSlip.status === 'paid' ? 'text-sky-400' : 'text-green-400') : 'text-white/30'}`}>
                        {(jackpotSlip.reward_amount ?? 0) > 0
                          ? `+ETB ${(jackpotSlip.status === 'near_win' ? jackpotSlip.reward_amount : jackpotSlip.reward_amount * 0.85).toLocaleString()}`
                          : '—'}
                      </p>
                      {jackpotSlip.status === 'paid' && (
                        <p className="text-sky-400/60 text-[10px] mt-0.5">✓ Already redeemed</p>
                      )}
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Placed At</p>
                      <p className="text-white/60 text-xs">{new Date(jackpotSlip.created_at).toLocaleString('en-ET')}</p>
                    </div>
                  </div>
                  {/* Picks */}
                  <div className="px-5 py-3">
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-2 font-bold">Picks ({(jackpotSlip.jackpot_slip_selections ?? []).length}/12)</p>
                    <div className="space-y-1">
                      {(jackpotSlip.jackpot_slip_selections ?? [])
                        .sort((a: any, b: any) => a.game_number - b.game_number)
                        .map((sel: any) => {
                          const match = sel.jackpot_matches
                          const settled = match?.result && match.result !== 'pending'
                          const correct = settled ? sel.selection === match.result : sel.result === 'correct'
                          const wrong = settled ? sel.selection !== match.result : sel.result === 'wrong'
                          const pick = sel.selection === 'home' ? '1' : sel.selection === 'away' ? '2' : 'X'
                          return (
                            <div key={sel.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs border"
                              style={{ background: correct ? 'rgba(74,222,128,0.06)' : wrong ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)', borderColor: correct ? 'rgba(74,222,128,0.2)' : wrong ? 'rgba(239,68,68,0.2)' : 'rgba(37,46,109,0.4)' }}>
                              <span className="text-white/40">
                                <span className="font-mono text-gold/50 mr-2">G{sel.game_number}</span>
                                {match?.home_team ?? '—'} v {match?.away_team ?? '—'}
                              </span>
                              <span className={`font-black px-2 py-0.5 rounded text-sm ${correct ? 'text-green-400 bg-green-400/15' : wrong ? 'text-red-400 bg-red-400/15' : 'text-gold bg-gold/15'}`}>
                                {pick}{correct ? ' ✓' : wrong ? ' ✗' : ''}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              )}

          {/* Recent History */}
          {history.length > 0 && (
            <div className="mt-8 bg-slate-dark border border-gold/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold/60" />
                  <span className="text-sm font-semibold text-white/70">Recent Slips</span>
                </div>
                <button onClick={clearHistory} className="flex items-center gap-1 text-xs text-nile-danger/70 hover:text-nile-danger transition-colors">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="space-y-2">
                {history.map(id => (
                  <button key={id} onClick={() => { setSlipId(id); handleCheck() }} className="w-full flex items-center justify-between px-3 py-2 bg-charcoal/50 hover:bg-charcoal rounded-lg border border-gold/10 hover:border-gold/30 transition-all">
                    <span className="font-mono text-sm text-white">{id}</span>
                    <Search className="w-3 h-3 text-white/30" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

          {/* Information Card */}
          <div className="mt-8 bg-slate-dark border border-gold/15 rounded-xl p-6 w-full max-w-xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-gold flex-shrink-0" />
              <h2 className="text-white font-bold text-base tracking-wide">Information</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                'Verify the authenticity and status of your betting slip using your unique Slip ID.',
                'Newly placed bets may require a short processing period before appearing in the system.',
                'Keep your Slip ID safe, as it serves as proof of your wager.',
                'Winning payouts are subject to applicable taxes, regulations, and verification procedures.',
                'Only officially confirmed Nile Betting records are considered valid for settlement.',
                'For support, disputes, or payout inquiries, contact an authorized Nile Betting Shop.',
                'Nile Betting is committed to providing secure, transparent, and reliable betting services.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[#A9B4D0] leading-relaxed">
                  <span className="text-gold mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

      <Footer />
    </div>
  )
}