'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { SlipDetailCard } from '@/components/shared/SlipDetailCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getSlipById } from '@/lib/actions/bets'
import { getJackpotSlipById } from '@/lib/actions/jackpot'
import { cn } from '@/lib/utils'
import type { SlipWithSelections } from '@/types/database.types'

export default function AdminCheckSlipPage() {
  const [slipId, setSlipId] = useState('')
  const [slip, setSlip] = useState<SlipWithSelections | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [jackpotSlip, setJackpotSlip] = useState<any>(null)

  const handleSearch = async () => {
    if (!slipId.trim()) return
    const id = slipId.trim().toUpperCase()
    setLoading(true)
    setError('')
    setSlip(null)
    setJackpotSlip(null)

    if (id.startsWith('JP')) {
      const result = await getJackpotSlipById(id)
      if (result) setJackpotSlip(result)
      else setError('Jackpot slip not found.')
    } else {
      const result = await getSlipById(id)
      if (result) setSlip(result)
      else setError('Slip not found. Please check the ID and try again.')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Check Slip</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={slipId}
          onChange={(e) => setSlipId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. 48392017 (regular) or JP85391421 (jackpot)"
          className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-gold text-charcoal px-6 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>
      {loading && <LoadingSpinner />}
      {error && (
        <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg px-4 py-3">
          <p className="text-nile-danger text-sm">{error}</p>
        </div>
      )}
      {slip && <SlipDetailCard slip={slip} />}

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
                {jackpotSlip.status === 'paid' ? 'Prize (Paid, net of tax)' : 'Prize (net of tax)'}
              </p>
              <p className={`font-mono font-bold ${(jackpotSlip.reward_amount ?? 0) > 0 ? (jackpotSlip.status === 'paid' ? 'text-sky-400' : 'text-green-400') : 'text-white/30'}`}>
                {(jackpotSlip.reward_amount ?? 0) > 0 ? `+ETB ${jackpotSlip.reward_amount.toLocaleString()}` : '—'}
              </p>
              {(jackpotSlip.reward_tax ?? 0) > 0 && (
                <p className="text-white/25 text-[10px] mt-0.5">Tax deducted: ETB {jackpotSlip.reward_tax.toLocaleString()}</p>
              )}
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
    </div>
  )
}
