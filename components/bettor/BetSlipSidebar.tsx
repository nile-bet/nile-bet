'use client'

import { useState } from 'react'
import { X, Ticket, AlertTriangle } from 'lucide-react'
import { useBetSlipStore }
  from '@/lib/stores/betSlipStore'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  formatETB,
} from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { PlatformSettings }
  from '@/types/database.types'

interface BetSlipSidebarProps {
  settings: PlatformSettings
  role?: string
  onPlaceBet?: () => void
  onTopup?: () => void
}

export function BetSlipSidebar({
  settings,
  role,
  onPlaceBet,
  onTopup,
}: BetSlipSidebarProps) {
  const [copySlipId, setCopySlipId] =
    useState('')
  const {
    selections,
    stake,
    calculation,
    setStake,
    removeSelection,
    clearSlip,
    getValidationErrors,
  } = useBetSlipStore()
  const { user, isAuthenticated } =
    useAuthStore()

  const errors = getValidationErrors(settings)
  const canPlace =
    errors.length === 0 &&
    selections.length >= settings.minSelections &&
    stake >= settings.minStake

  const hasStarted = selections.some(
    (s) =>
      s.matchStatus === 'closed' ||
      s.matchStatus === 'finished'
  )

  return (
    <div className="w-[280px] flex-shrink-0 bg-slate-dark border-l border-gold/10 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gold/10 flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <Ticket className="w-4 h-4 text-gold" />
          Bet Slip
        </h3>
        {selections.length > 0 && (
          <button
            onClick={clearSlip}
            className="text-xs text-white/40 hover:text-white"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Copy slip input */}
      <div className="px-4 py-2 border-b border-gold/10">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Load slip by ID..."
            value={copySlipId}
            onChange={(e) =>
              setCopySlipId(e.target.value)
            }
            className="flex-1 bg-charcoal border border-gold/20 rounded-md px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 font-mono"
            maxLength={10}
          />
          <button className="text-xs bg-nile-blue text-white px-2 py-1.5 rounded-md hover:bg-nile-blue/80 transition-colors">
            Load
          </button>
        </div>
      </div>

      {/* Wallet (logged in) */}
      {isAuthenticated && user && (
        <div className="px-4 py-2 border-b border-gold/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">
              Wallet:
            </span>
            <span className="text-gold font-mono text-sm font-medium">
              {formatETB(user.credit_balance)}
            </span>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {selections.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <Ticket className="w-12 h-12 text-gold/20 mb-3" />
            <p className="text-white/40 text-sm font-medium">
              Your bet slip is empty
            </p>
            <p className="text-white/25 text-xs mt-1">
              Click on odds to add selections
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {selections.map((s) => {
              const started =
                s.matchStatus === 'closed' ||
                s.matchStatus === 'finished'
              return (
                <div
                  key={`${s.matchMarketId}-${s.selection}`}
                  className={cn(
                    'bg-charcoal rounded-lg p-2.5 border',
                    started
                      ? 'border-nile-danger/50 bg-nile-danger/10'
                      : 'border-nile-blue/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/50 truncate">
                        {s.homeTeam} vs{' '}
                        {s.awayTeam}
                      </p>
                      <p className="text-[11px] text-white/40 truncate">
                        {s.marketName}
                      </p>
                      <p className="text-[13px] text-white font-medium">
                        {s.selection}
                      </p>
                      {started && (
                        <p className="text-[10px] text-nile-danger flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          Match started!
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-gold font-mono text-[13px] font-medium">
                        {s.odd.toFixed(2)}
                      </span>
                      <button
                        onClick={() =>
                          removeSelection(
                            s.matchMarketId,
                            s.selection
                          )
                        }
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded',
                          started
                            ? 'bg-nile-danger text-white'
                            : 'text-nile-danger hover:text-nile-danger/80'
                        )}
                      >
                        {started
                          ? 'Remove ✕'
                          : '✕'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer: stake + calculation */}
      {selections.length > 0 && (
        <div className="border-t border-gold/10 p-4 space-y-3">
          {/* Selection count */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">
              Selections:
            </span>
            <span
              className={cn(
                'text-xs font-medium',
                selections.length >=
                  settings.minSelections
                  ? 'text-nile-success'
                  : 'text-nile-orange'
              )}
            >
              {selections.length} /{' '}
              {settings.minSelections} min
            </span>
          </div>

          {/* Stake input */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Stake (ETB)
            </label>
            <input
              type="number"
              min={settings.minStake}
              max={settings.maxStakePerSlip}
              value={stake || ''}
              onChange={(e) =>
                setStake(
                  parseFloat(e.target.value) ||
                    0
                )
              }
              placeholder="0.00"
              className="w-full bg-charcoal border border-gold/30 rounded-md px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-gold"
            />
            <p className="text-[10px] text-white/30 mt-1">
              Min: ETB {settings.minStake} |
              Max: ETB{' '}
              {settings.maxStakePerSlip.toLocaleString()}
            </p>
          </div>

          {/* Calculation */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50 text-xs">
                Stake:
              </span>
              <span className="text-white font-mono text-xs">
                {formatETB(calculation.stake)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-xs">
                Total Odds:
              </span>
              <span className="text-white font-mono text-xs">
                {calculation.totalOdds.toFixed(
                  2
                )}
              </span>
            </div>
            <div className="border-t border-gold/20 my-1.5" />
            <div className="flex justify-between">
              <span className="text-white/50 text-xs">
                Max Payout:
              </span>
              <span className="text-white font-mono text-xs">
                {formatETB(
                  calculation.maxPayout
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-xs">
                Tax (15%):
              </span>
              <span className="text-nile-danger font-mono text-xs">
                -{' '}
                {formatETB(
                  calculation.winningTax
                )}
              </span>
            </div>
            <div className="border-t border-gold/20 my-1.5" />
            <div className="flex justify-between">
              <span className="text-white font-medium text-xs">
                Net Payout:
              </span>
              <span className="text-gold font-mono text-sm font-bold">
                {formatETB(
                  calculation.netPayout
                )}
              </span>
            </div>
          </div>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((e, i) => (
                <p
                  key={i}
                  className="text-[10px] text-nile-danger"
                >
                  ⚠️ {e}
                </p>
              ))}
            </div>
          )}

          {/* Buttons */}
          <button
            onClick={onPlaceBet}
            disabled={
              !canPlace ||
              hasStarted ||
              !isAuthenticated
            }
            className={cn(
              'w-full py-2.5 rounded-lg font-semibold text-sm transition-colors',
              canPlace &&
                !hasStarted &&
                isAuthenticated
                ? 'bg-gold text-charcoal hover:bg-gold-light'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            {!isAuthenticated
              ? 'Login to Place Bet'
              : hasStarted
              ? 'Remove started matches'
              : 'Place Bet'}
          </button>

          <button
            onClick={onTopup}
            className="w-full py-2 rounded-lg font-medium text-sm border border-nile-blue text-nile-blue-light hover:bg-nile-blue/20 transition-colors"
          >
            Request Top-up
          </button>
        </div>
      )}
    </div>
  )
}