'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { StatusBadge } from './StatusBadge'
import { formatDate, formatETB } from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { SlipWithSelections } from '@/types/database.types'

interface SlipDetailCardProps {
  slip: SlipWithSelections
  showShareOptions?: boolean
  showAdminInfo?: boolean
  className?: string
}

export function SlipDetailCard({ slip, showShareOptions = false, className }: SlipDetailCardProps) {
  const qrRef = useRef<HTMLCanvasElement>(null)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nile-bet.vercel.app'
  const isJackpot = slip.slip_id?.startsWith('JP')
  const selections = (slip as any).slip_selections ?? []

  useEffect(() => {
    if (qrRef.current && slip.slip_id) {
      QRCode.toCanvas(qrRef.current, `${appUrl}/slip/${slip.slip_id}`, {
        width: 100, margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      }).catch(console.error)
    }
  }, [slip.slip_id, appUrl])

  const statusColor = {
    won: 'border-nile-success/40 bg-nile-success/5',
    lost: 'border-nile-danger/40 bg-nile-danger/5',
    pending: 'border-gold/20 bg-nile-blue/5',
    void: 'border-white/10 bg-white/5',

    cancelled: 'border-white/10 bg-white/5',
    near_win: 'border-gold/40 bg-gold/5',
    paid: 'border-nile-success/40 bg-nile-success/5',
  }[slip.status] ?? 'border-gold/20'

  const resultIcon = (result: string) => {
    switch (result) {
      case 'won': return '✅'
      case 'lost': return '❌'
      case 'void': return '↩️'
      default: return '⏳'
    }
  }

  const resultRowColor = (result: string) => {
    switch (result) {
      case 'won': return 'border-l-4 border-l-nile-success bg-nile-success/5'
      case 'lost': return 'border-l-4 border-l-nile-danger bg-nile-danger/5'
      case 'void': return 'border-l-4 border-l-white/20 bg-white/5'
      default: return 'border-l-4 border-l-gold/30 bg-charcoal/50'
    }
  }

  const wonCount = selections.filter((s: any) => s.result === 'won').length
  const lostCount = selections.filter((s: any) => s.result === 'lost').length
  const pendingCount = selections.filter((s: any) => s.result === 'pending').length

  return (
    <div className={cn('bg-slate-dark border rounded-xl overflow-hidden', statusColor, className)}>
      {/* Header */}
      <div className="bg-nile-blue/20 px-5 py-4 border-b border-gold/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isJackpot && (
              <span className="text-[10px] bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded font-medium">
                🏆 JACKPOT
              </span>
            )}
            <span className="text-gold font-mono font-bold text-lg">#{slip.slip_id}</span>
          </div>
          <StatusBadge status={slip.status} type="slip" />
        </div>
        <p className="text-white/40 text-xs mt-1">{formatDate(slip.created_at)}</p>

        {/* Summary bar */}
        <div className="flex gap-3 mt-3">
          <span className="text-[11px] bg-nile-success/20 text-nile-success px-2 py-0.5 rounded-full">
            ✅ {wonCount} Won
          </span>
          <span className="text-[11px] bg-nile-danger/20 text-nile-danger px-2 py-0.5 rounded-full">
            ❌ {lostCount} Lost
          </span>
          <span className="text-[11px] bg-gold/10 text-gold px-2 py-0.5 rounded-full">
            ⏳ {pendingCount} Pending
          </span>
        </div>
      </div>

      {/* Selections */}
      <div className="p-4 space-y-2">
        <p className="text-[11px] text-white/40 uppercase tracking-widest mb-3">
          Selections ({selections.length})
        </p>
        {selections.map((sel: any, i: number) => {
          const match = sel.matches
          const market = sel.match_markets
          const template = market?.market_templates
          const category = template?.market_categories
          return (
            <div key={sel.id ?? i} className={cn('rounded-lg p-3', resultRowColor(sel.result))}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {match?.home_team} vs {match?.away_team}
                  </p>
                  <p className="text-white/40 text-[11px] mt-0.5">
                    {category?.name && <span className="text-gold/60">{category.name} · </span>}
                    {template?.name}
                  </p>
                  <p className="text-white/70 text-xs mt-1 font-medium">
                    {sel.selection}
                  </p>
                  {match?.kick_off_time && (
                    <p className="text-white/30 text-[10px] mt-0.5">
                      🕐 {new Date(match.kick_off_time).toLocaleString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-gold font-mono text-sm font-bold">
                    {sel.odd_at_placement?.toFixed(2)}
                  </span>
                  <span className="text-lg">{resultIcon(sel.result)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Financials */}
      <div className="px-5 pb-4 space-y-2 border-t border-gold/10 pt-4">
        <div className="flex justify-between">
          <span className="text-white/50 text-xs">Stake</span>
          <span className="text-white font-mono text-xs">{formatETB(slip.stake)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50 text-xs">Total Odds</span>
          <span className="text-white font-mono text-xs">{slip.total_odds?.toFixed(2)}</span>
        </div>
        <div className="border-t border-gold/10 my-2" />
        <div className="flex justify-between">
          <span className="text-white/50 text-xs">Max Payout</span>
          <span className="text-white font-mono text-xs">{formatETB(slip.max_payout)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50 text-xs">Tax (15%)</span>
          <span className="text-nile-danger font-mono text-xs">- {formatETB(slip.winning_tax)}</span>
        </div>
        <div className="border-t border-gold/10 my-2" />
        <div className="flex justify-between items-center">
          <span className="text-white font-medium text-sm">Net Payout</span>
          <span className={cn(
            'font-mono font-bold text-lg',
            slip.status === 'won' ? 'text-nile-success' : 'text-gold'
          )}>
            {formatETB(slip.net_payout)}
          </span>
        </div>

        {/* Status message */}
        {slip.status === 'won' && (
          <div className="mt-2 bg-nile-success/10 border border-nile-success/30 rounded-lg p-3 text-center">
            <p className="text-nile-success font-semibold text-sm">🎉 You Won! Visit a cashier to claim your prize.</p>
          </div>
        )}
        {slip.status === 'lost' && (
          <div className="mt-2 bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-3 text-center">
            <p className="text-nile-danger text-sm">Better luck next time!</p>
          </div>
        )}

        {slip.insurance_applied && (
          <div className="mt-2 bg-gold/10 border border-gold/30 rounded-lg p-2 text-center space-y-1">
            <p className="text-gold text-xs font-semibold">🛡️ Insurance Applied — {formatETB(slip.insurance_payout)} credited</p>
            {(slip.insurance_tax ?? 0) > 0 && (
              <p className="text-white/40 text-[10px]">Tax of {formatETB(slip.insurance_tax)} already deducted</p>
            )}
          </div>
        )}
      </div>

      {/* QR + Share */}
      {showShareOptions && (
        <div className="px-5 pb-5 flex flex-col items-center gap-3 border-t border-gold/10 pt-4">
          <canvas ref={qrRef} className="rounded-lg" />
          <p className="text-white/30 text-xs">Scan to check slip status</p>
          <button
            onClick={() => navigator.clipboard.writeText(`${appUrl}/slip/${slip.slip_id}`)}
            className="w-full text-xs border border-gold/30 text-gold py-2 rounded-lg hover:bg-gold/10 transition-colors"
          >
            📋 Copy Slip Link
          </button>
        </div>
      )}
    </div>
  )
}
