'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { StatusBadge }
  from './StatusBadge'
import { formatDate, formatETB }
  from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { SlipWithSelections }
  from '@/types/database.types'

interface SlipDetailCardProps {
  slip: SlipWithSelections
  showShareOptions?: boolean
  showAdminInfo?: boolean
  className?: string
}

export function SlipDetailCard({
  slip,
  showShareOptions = false,
  className,
}: SlipDetailCardProps) {
  const qrRef = useRef<HTMLCanvasElement>(null)
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://nile-bet.vercel.app'

  const isJackpot = slip.slip_id?.startsWith('JP')
  const selections =
    (slip as any).slip_selections ?? []

  useEffect(() => {
    if (qrRef.current && slip.slip_id) {
      QRCode.toCanvas(
        qrRef.current,
        `${appUrl}/slip/${slip.slip_id}`,
        {
          width: 100,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        }
      ).catch(console.error)
    }
  }, [slip.slip_id, appUrl])

  const resultIcon = (result: string) => {
    switch (result) {
      case 'won':
        return '✅'
      case 'lost':
        return '❌'
      case 'void':
        return '↩️'
      default:
        return '⏳'
    }
  }

  return (
    <div
      className={cn(
        'bg-slate-dark border border-gold/20 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="bg-nile-blue/20 px-5 py-4 border-b border-gold/10">
        <div className="flex items-center justify-between">
          <div>
            {isJackpot && (
              <span className="text-[10px] bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded font-medium mr-2">
                🏆 JACKPOT
              </span>
            )}
            <span className="text-gold font-mono font-bold">
              #{slip.slip_id}
            </span>
          </div>
          <StatusBadge
            status={slip.status}
            type="slip"
          />
        </div>
        <p className="text-white/40 text-xs mt-1">
          {formatDate(slip.created_at)}
        </p>
      </div>

      {/* Selections */}
      <div className="p-4 space-y-2">
        {selections.map(
          (sel: any, i: number) => {
            const match = sel.matches
            const market = sel.match_markets
            const template =
              market?.market_templates
            return (
              <div
                key={sel.id ?? i}
                className="bg-charcoal/50 rounded-lg p-3"
              >
                <p className="text-white/50 text-xs">
                  {match?.home_team} vs{' '}
                  {match?.away_team}
                </p>
                <p className="text-white/40 text-xs">
                  {template?.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-white font-medium text-sm">
                    {sel.selection}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-gold font-mono text-sm">
                      {sel.odd_at_placement?.toFixed(
                        2
                      )}
                    </span>
                    <span>
                      {resultIcon(sel.result)}
                    </span>
                  </div>
                </div>
              </div>
            )
          }
        )}
      </div>

      {/* Calculation */}
      <div className="px-5 pb-4 space-y-1 text-sm border-t border-gold/10 pt-4">
        <div className="flex justify-between">
          <span className="text-white/50 text-xs">
            Stake:
          </span>
          <span className="text-white font-mono text-xs">
            {formatETB(slip.stake)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50 text-xs">
            Total Odds:
          </span>
          <span className="text-white font-mono text-xs">
            {slip.total_odds?.toFixed(2)}
          </span>
        </div>
        <div className="border-t border-gold/10 my-2" />
        <div className="flex justify-between">
          <span className="text-white/50 text-xs">
            Max Payout:
          </span>
          <span className="text-white font-mono text-xs">
            {formatETB(slip.max_payout)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50 text-xs">
            Tax (15%):
          </span>
          <span className="text-nile-danger font-mono text-xs">
            - {formatETB(slip.winning_tax)}
          </span>
        </div>
        <div className="border-t border-gold/10 my-2" />
        <div className="flex justify-between">
          <span className="text-white font-medium text-xs">
            Net Payout:
          </span>
          <span className="text-gold font-mono font-bold text-base">
            {formatETB(slip.net_payout)}
          </span>
        </div>

        {/* Insurance badge */}
        {slip.insurance_applied && (
          <div className="mt-3 bg-gold/10 border border-gold/30 rounded-lg p-2 text-center">
            <p className="text-gold text-xs font-semibold">
              🛡️ Insurance Applied —{' '}
              {formatETB(
                slip.insurance_payout
              )}{' '}
              credited
            </p>
          </div>
        )}
      </div>

      {/* QR Code */}
      {showShareOptions && (
        <div className="px-5 pb-5 flex flex-col items-center gap-3 border-t border-gold/10 pt-4">
          <canvas
            ref={qrRef}
            className="rounded-lg"
          />
          <p className="text-white/30 text-xs">
            Scan to check slip status
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => {
                const url = `${appUrl}/slip/${slip.slip_id}`
                navigator.clipboard.writeText(
                  url
                )
              }}
              className="flex-1 text-xs border border-gold/30 text-gold py-2 rounded-lg hover:bg-gold/10 transition-colors"
            >
              📋 Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  )
}