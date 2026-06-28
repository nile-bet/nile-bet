'use client'

import { useState, useEffect } from 'react'
import { getSlipById } from '@/lib/actions/bets'
import { getJackpotSlipById } from '@/lib/actions/jackpot'
import { SlipDetailCard } from '@/components/shared/SlipDetailCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { QRScanner } from '@/components/cashier/QRScanner'
import { Search, Camera, Clock, Trash2, ScanSearch } from 'lucide-react'
import type { SlipWithSelections } from '@/types/database.types'
import { cn } from '@/lib/utils'

export default function CashierCheckSlipPage() {
  const [slipId, setSlipId] = useState('')
  const [slip, setSlip] = useState<SlipWithSelections | null>(null)
  const [jackpotSlip, setJackpotSlip] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('nilebet_slip_history_cashier')
    if (stored) setHistory(JSON.parse(stored))
  }, [])

  const addToHistory = (id: string) => {
    setHistory(prev => {
      const updated = [id, ...prev.filter(i => i !== id)].slice(0, 10)
      localStorage.setItem('nilebet_slip_history_cashier', JSON.stringify(updated))
      return updated
    })
  }

  const clearHistory = () => {
    localStorage.removeItem('nilebet_slip_history_cashier')
    setHistory([])
  }

  const handleCheck = async (id?: string) => {
    const checkId = (id ?? slipId).trim().toUpperCase()
    if (!checkId) return
    setLoading(true); setNotFound(false); setSlip(null); setJackpotSlip(null); setShowScanner(false)

    if (checkId.startsWith('JP')) {
      const data = await getJackpotSlipById(checkId)
      if (data) { setJackpotSlip(data); addToHistory(checkId) }
      else setNotFound(true)
    } else {
      const data = await getSlipById(checkId)
      if (data) { setSlip(data); addToHistory(checkId) }
      else setNotFound(true)
    }
    setLoading(false)
  }

  const handleScan = (code: string) => {
    setSlipId(code)
    handleCheck(code)
  }

  const hasResult = slip || jackpotSlip || notFound || loading

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
            <ScanSearch className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white leading-tight">Check Slip</h1>
            <p className="text-white/40 text-xs">Enter a slip ID or scan QR / barcode</p>
          </div>
        </div>

        {/* Desktop: side-by-side when result exists */}
        <div className={cn('gap-5', hasResult ? 'lg:grid lg:grid-cols-[380px_1fr]' : 'max-w-md')}>

          {/* Left: search panel */}
          <div className="space-y-3">
            <div className="bg-slate-dark border border-white/8 rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slipId}
                  onChange={(e) => setSlipId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                  placeholder="48392017 or JP85391421"
                  maxLength={12}
                  autoFocus
                  className="flex-1 bg-charcoal border border-gold/20 focus:border-gold rounded-lg px-3 py-2.5 text-white font-mono text-base text-center placeholder:text-white/15 placeholder:font-sans placeholder:text-sm focus:outline-none transition-colors"
                />
                <button
                  onClick={() => handleCheck()}
                  disabled={!slipId.trim() || loading}
                  className="bg-gold text-charcoal px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-[0.97] transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  Check
                </button>
                <button
                  onClick={() => setShowScanner(!showScanner)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg border transition-all',
                    showScanner
                      ? 'bg-gold/15 border-gold/40 text-gold'
                      : 'border-white/10 text-white/50 hover:text-white hover:border-white/25'
                  )}
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {showScanner && (
                <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} label="Scan Slip QR Code" />
              )}

              <p className="text-white/20 text-[11px] text-center">
                ↵ Barcode scanner submits on Enter · 📷 Camera for QR
              </p>
            </div>

            {/* Recent history */}
            {history.length > 0 && (
              <div className="bg-slate-dark border border-white/6 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-white/50 text-xs font-semibold">Recent</span>
                  </div>
                  <button onClick={clearHistory} className="flex items-center gap-1 text-[11px] text-red-400/60 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {history.map(id => (
                    <button key={id} onClick={() => { setSlipId(id); handleCheck(id) }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-charcoal/60 hover:bg-charcoal rounded-lg border border-white/6 hover:border-gold/25 transition-all group">
                      <span className="font-mono text-xs text-white">{id}</span>
                      <Search className="w-3 h-3 text-white/25 group-hover:text-gold/60 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: results */}
          <div>
            {loading && (
              <div className="flex justify-center py-10">
                <LoadingSpinner size="md" color="gold" text="Searching..." />
              </div>
            )}

            {notFound && !loading && (
              <div className="bg-red-500/8 border border-red-500/25 rounded-xl p-6 text-center space-y-1.5">
                <p className="text-3xl">🔍</p>
                <p className="text-red-400 font-semibold text-sm">Slip not found</p>
                <p className="text-white/40 text-xs">Double-check the ID and try again</p>
              </div>
            )}

            {slip && !loading && <SlipDetailCard slip={slip} showShareOptions />}

            {jackpotSlip && !loading && (
              <div className="bg-slate-dark border border-gold/25 rounded-xl overflow-hidden">
                <div className="bg-gold/8 border-b border-gold/15 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🏆</span>
                    <div>
                      <p className="text-gold font-bold font-mono text-sm">#{jackpotSlip.slip_id}</p>
                      <p className="text-white/40 text-xs">{jackpotSlip.jackpots?.name}</p>
                    </div>
                  </div>
                  <span className={cn('text-[11px] px-2.5 py-1 rounded-full border font-bold uppercase',
                    jackpotSlip.status === 'paid' ? 'text-sky-400 border-sky-400/30 bg-sky-400/8' :
                    jackpotSlip.status === 'won' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/8' :
                    jackpotSlip.status === 'near_win' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/8' :
                    jackpotSlip.status === 'lost' ? 'text-red-400 border-red-400/30 bg-red-400/8' :
                    'text-white/40 border-white/15 bg-white/5'
                  )}>
                    {jackpotSlip.status === 'paid' ? '✓ Paid' : jackpotSlip.status?.replace('_', ' ')}
                  </span>
                </div>

                <div className="px-4 py-3 grid grid-cols-4 gap-3 border-b border-white/6">
                  {[
                    { label: 'Bettor', value: jackpotSlip.is_anonymous ? '🔒 Anon' : `@${(jackpotSlip.bettor as any)?.username ?? '—'}` },
                    { label: 'Entry', value: jackpotSlip.stake ? `ETB ${Number(jackpotSlip.stake).toLocaleString()}` : '—', gold: true },
                    { label: 'Score', value: jackpotSlip.correct_count !== null ? `${jackpotSlip.correct_count}/12` : 'Pending' },
                    { label: 'Prize', value: (jackpotSlip.reward_amount ?? 0) > 0 ? `+ETB ${jackpotSlip.reward_amount.toLocaleString()}` : '—', green: (jackpotSlip.reward_amount ?? 0) > 0 },
                  ].map(({ label, value, gold, green }) => (
                    <div key={label}>
                      <p className="text-white/35 text-[10px] mb-0.5">{label}</p>
                      <p className={cn('font-medium text-sm', gold ? 'text-gold font-mono font-bold' : green ? 'text-emerald-400 font-mono font-bold' : 'text-white')}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3">
                  <p className="text-white/35 text-[10px] uppercase tracking-widest font-semibold mb-2">
                    Picks — {(jackpotSlip.jackpot_slip_selections ?? []).length}/12
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {(jackpotSlip.jackpot_slip_selections ?? [])
                      .sort((a: any, b: any) => a.game_number - b.game_number)
                      .map((sel: any) => {
                        const match = sel.jackpot_matches
                        const settled = match?.result && match.result !== 'pending'
                        const correct = settled ? sel.selection === match.result : sel.result === 'correct'
                        const wrong = settled ? sel.selection !== match.result : sel.result === 'wrong'
                        const pick = sel.selection === 'home' ? '1' : sel.selection === 'away' ? '2' : 'X'
                        return (
                          <div key={sel.id}
                            className={cn(
                              'flex items-center justify-between px-3 py-2 rounded-lg text-xs border',
                              correct ? 'bg-emerald-500/6 border-emerald-500/20' :
                              wrong ? 'bg-red-500/6 border-red-500/20' :
                              'bg-white/2 border-white/6'
                            )}>
                            <span className="text-white/50 truncate max-w-[130px]">
                              <span className="font-mono text-gold/50 mr-1.5">G{sel.game_number}</span>
                              {match?.home_team ?? '—'} vs {match?.away_team ?? '—'}
                            </span>
                            <span className={cn('font-black px-2 py-0.5 rounded-md text-xs ml-2 flex-shrink-0',
                              correct ? 'text-emerald-400 bg-emerald-400/12' :
                              wrong ? 'text-red-400 bg-red-400/12' :
                              'text-gold bg-gold/12'
                            )}>
                              {pick}{correct ? ' ✓' : wrong ? ' ✗' : ''}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
