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

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 mb-2">
            <ScanSearch className="w-6 h-6 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Check Slip</h1>
          <p className="text-white/40 text-sm">Enter a slip ID or scan its QR / barcode</p>
        </div>

        {/* Search panel */}
        <div className="bg-slate-dark border border-white/8 rounded-2xl p-6 space-y-4">
          {/* Input row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={slipId}
              onChange={(e) => setSlipId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              placeholder="48392017 or JP85391421"
              maxLength={12}
              autoFocus
              className="flex-1 bg-charcoal border-2 border-gold/20 focus:border-gold rounded-xl px-4 py-3.5 text-white font-mono text-xl text-center placeholder:text-white/15 placeholder:font-sans placeholder:text-base focus:outline-none transition-colors"
            />
            <button
              onClick={() => handleCheck()}
              disabled={!slipId.trim() || loading}
              className="bg-gold text-charcoal px-5 py-3 rounded-xl font-bold text-sm hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.97] transition-all"
            >
              <Search className="w-4 h-4" />
              Check
            </button>
            <button
              onClick={() => setShowScanner(!showScanner)}
              className={cn(
                'px-3.5 py-3 rounded-xl border transition-all',
                showScanner
                  ? 'bg-gold/15 border-gold/40 text-gold'
                  : 'border-white/10 text-white/50 hover:text-white hover:border-white/25'
              )}
              title="Scan QR Code"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {showScanner && (
            <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} label="Scan Slip QR Code" />
          )}

          <p className="text-white/20 text-xs text-center">
            ↵ Barcode scanner submits on Enter &nbsp;·&nbsp; 📷 Tap camera for QR
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" color="gold" text="Searching..." />
          </div>
        )}

        {/* Not found */}
        {notFound && !loading && (
          <div className="bg-red-500/8 border border-red-500/25 rounded-2xl p-8 text-center space-y-2">
            <p className="text-4xl">🔍</p>
            <p className="text-red-400 font-semibold">Slip not found</p>
            <p className="text-white/40 text-sm">Double-check the ID and try again</p>
          </div>
        )}

        {/* Regular slip result */}
        {slip && !loading && (
          <SlipDetailCard slip={slip} showShareOptions />
        )}

        {/* Jackpot slip result */}
        {jackpotSlip && !loading && (
          <div className="bg-slate-dark border border-gold/25 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gold/8 border-b border-gold/15 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-gold font-bold font-mono">#{jackpotSlip.slip_id}</p>
                  <p className="text-white/40 text-xs">{jackpotSlip.jackpots?.name}</p>
                </div>
              </div>
              <span className={cn('text-xs px-3 py-1 rounded-full border font-bold uppercase',
                jackpotSlip.status === 'paid' ? 'text-sky-400 border-sky-400/30 bg-sky-400/8' :
                jackpotSlip.status === 'won' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/8' :
                jackpotSlip.status === 'near_win' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/8' :
                jackpotSlip.status === 'lost' ? 'text-red-400 border-red-400/30 bg-red-400/8' :
                'text-white/40 border-white/15 bg-white/5'
              )}>
                {jackpotSlip.status === 'paid' ? '✓ Paid' : jackpotSlip.status?.replace('_', ' ')}
              </span>
            </div>

            {/* Info grid */}
            <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-white/6">
              {[
                { label: 'Bettor', value: jackpotSlip.is_anonymous ? '🔒 Anonymous' : `@${(jackpotSlip.bettor as any)?.username ?? '—'}` },
                { label: 'Entry Fee', value: jackpotSlip.stake ? `ETB ${Number(jackpotSlip.stake).toLocaleString()}` : '—', gold: true },
                { label: 'Score', value: jackpotSlip.correct_count !== null ? `${jackpotSlip.correct_count}/12` : 'Pending' },
                { label: jackpotSlip.status === 'paid' ? 'Prize (paid)' : 'Prize', value: (jackpotSlip.reward_amount ?? 0) > 0 ? `+ETB ${jackpotSlip.reward_amount.toLocaleString()}` : '—', green: (jackpotSlip.reward_amount ?? 0) > 0 },
              ].map(({ label, value, gold, green }) => (
                <div key={label}>
                  <p className="text-white/35 text-xs mb-0.5">{label}</p>
                  <p className={cn('font-medium text-sm', gold ? 'text-gold font-mono font-bold' : green ? 'text-emerald-400 font-mono font-bold' : 'text-white')}>{value}</p>
                </div>
              ))}
            </div>

            {/* Picks */}
            <div className="px-5 py-4">
              <p className="text-white/35 text-[10px] uppercase tracking-widest font-semibold mb-3">
                Picks — {(jackpotSlip.jackpot_slip_selections ?? []).length}/12
              </p>
              <div className="space-y-1.5">
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
                          'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs border',
                          correct ? 'bg-emerald-500/6 border-emerald-500/20' :
                          wrong ? 'bg-red-500/6 border-red-500/20' :
                          'bg-white/2 border-white/6'
                        )}>
                        <span className="text-white/50">
                          <span className="font-mono text-gold/50 mr-2">G{sel.game_number}</span>
                          {match?.home_team ?? '—'} vs {match?.away_team ?? '—'}
                        </span>
                        <span className={cn('font-black px-2.5 py-1 rounded-lg text-sm',
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

        {/* Recent history */}
        {history.length > 0 && (
          <div className="bg-slate-dark border border-white/6 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/30" />
                <span className="text-white/60 text-sm font-semibold">Recent Slips</span>
              </div>
              <button onClick={clearHistory} className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />Clear
              </button>
            </div>
            <div className="space-y-2">
              {history.map(id => (
                <button key={id} onClick={() => { setSlipId(id); handleCheck(id) }}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-charcoal/60 hover:bg-charcoal rounded-xl border border-white/6 hover:border-gold/25 transition-all group">
                  <span className="font-mono text-sm text-white">{id}</span>
                  <Search className="w-3.5 h-3.5 text-white/25 group-hover:text-gold/60 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}