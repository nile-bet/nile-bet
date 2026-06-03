'use client'

import { useState, useEffect } from 'react'
import { X, Ticket, AlertTriangle } from 'lucide-react'
import { useBetSlipStore } from '@/lib/stores/betSlipStore'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  formatETB,
} from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import { getSlipById } from '@/lib/actions/bets'
import { AnonymousSlipModal } from './AnonymousSlipModal'
import type { PlatformSettings }
  from '@/types/database.types'

interface BetSlipSidebarProps {
  settings: PlatformSettings
  role?: string
  onPlaceBet?: () => void
  onTopup?: () => void
}

export function BetSlipSidebar({
  settings: settingsProp,
  role,
  onPlaceBet,
  onTopup,
}: BetSlipSidebarProps) {
  const { settings: liveSettings, setSettings } = useAuthStore()
  const [freshSettings, setFreshSettings] = useState<any>(null)
  const settings = freshSettings ?? liveSettings ?? settingsProp

  // Fetch fresh settings from DB on mount and on settings-updated event
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        const json = await res.json()
        if (json.success && json.settings) {
          const sm: Record<string, string> = json.settings
          if (true) {
          const parsed = {
            minStake: parseFloat(sm.min_stake ?? '10'),
            maxStakePerSlip: parseFloat(sm.max_stake_per_slip ?? '50000'),
            maxStakePerMarket: parseFloat(sm.max_stake_per_market ?? '10000'),
            maxOddPerSelection: parseFloat(sm.max_odd_per_selection ?? '50'),
            maxTotalOdds: parseFloat(sm.max_total_odds ?? '5000'),
            minSelections: parseInt(sm.min_selections ?? '4'),
            winningTaxPercent: parseFloat(sm.winning_tax_percent ?? '15'),
            maxPayout: parseFloat(sm.max_payout ?? '500000'),
            maxInstantRedemption: parseFloat(sm.max_instant_redemption ?? '150000'),
            cashierProfitPercent: parseFloat(sm.cashier_profit_percent ?? '40'),
            agentProfitPercent: parseFloat(sm.agent_profit_percent ?? '60'),
            topupExpiryHours: parseInt(sm.topup_expiry_hours ?? '6'),
            withdrawalExpiryHours: parseInt(sm.withdrawal_expiry_hours ?? '6'),
            loginAttemptLimit: parseInt(sm.login_attempt_limit ?? '5'),
            sessionTimeoutHours: parseInt(sm.session_timeout_hours ?? '8'),
            cancellationWindowMins: parseInt(sm.cancellation_window_mins ?? '5'),
            insuranceMinSelections: parseInt(sm.insurance_min_selections ?? '10'),
            insurance1LossPct: parseFloat(sm.insurance_1_loss_pct ?? '2'),
            insurance2LossPct: parseFloat(sm.insurance_2_loss_pct ?? '1'),
            insurance3LossRefund: sm.insurance_3_loss_refund === 'true',
            welcomeBonusEnabled: sm.welcome_bonus_enabled === 'true',
            welcomeBonusMinTopup: parseFloat(sm.welcome_bonus_min_topup ?? '500'),
            welcomeBonusAmount: parseFloat(sm.welcome_bonus_amount ?? '50'),
            jackpotFixedStake: parseFloat(sm.jackpot_fixed_stake ?? '50'),
            jackpotWinAllReward: parseFloat(sm.jackpot_win_all_reward ?? '250000'),
            jackpotNearWinReward: parseFloat(sm.jackpot_near_win_reward ?? '25000'),
          }
          setFreshSettings(parsed)
          setSettings(parsed)
          }
        }
      } catch (e) { console.error('Failed to fetch settings:', e) }
    }
    fetchSettings()
    window.addEventListener('platform-settings-updated', fetchSettings)
    return () => window.removeEventListener('platform-settings-updated', fetchSettings)
  }, [])
  const [copySlipId, setCopySlipId] =
    useState('')
  const [slipCode, setSlipCode] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)
  const [loadingSlip, setLoadingSlip] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [generatedSlipData, setGeneratedSlipData] = useState<any>(null)
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
    <div className="w-[240px] flex-shrink-0 bg-slate-dark border border-nile-blue/20 rounded-xl flex flex-col" style={{ fontSize: "78%", position: "sticky", top: "60px" }}>
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
          <button
            onClick={async () => {
              if (!copySlipId.trim()) return
              setLoadingSlip(true)
              setLoadError('')
              const slip = await getSlipById(copySlipId.trim())
              if (!slip) {
                setLoadError('Slip not found')
                setLoadingSlip(false)
                return
              }
              // Load selections into bet slip
              clearSlip()
              const sels = (slip as any).slip_selections ?? []
              sels.forEach((s: any) => {
                const match = s.matches as any
                const market = s.match_markets as any
                const template = market?.market_templates as any
                const category = template?.market_categories as any
                const leagues = match?.leagues as any
                const countries = leagues?.countries as any
                useBetSlipStore.getState().addSelection({
                  matchId: s.match_id,
                  matchMarketId: s.match_market_id,
                  homeTeam: match?.home_team ?? '',
                  awayTeam: match?.away_team ?? '',
                  leagueName: leagues?.name ?? '',
                  countryFlag: countries?.flag_emoji ?? '🏳️',
                  marketName: template?.name ?? '',
                  categoryName: category?.name ?? '',
                  selection: s.selection,
                  odd: s.odd_at_placement,
                  kickOffTime: match?.kick_off_time ?? '',
                  matchStatus: match?.status ?? 'upcoming',
                })
              })
              if ((slip as any).stake) setStake((slip as any).stake)
              setCopySlipId('')
              setLoadingSlip(false)
            }}
            disabled={loadingSlip || !copySlipId.trim()}
            className="text-xs bg-nile-blue text-white px-2 py-1.5 rounded-md hover:bg-nile-blue/80 transition-colors disabled:opacity-50"
          >
            {loadingSlip ? '...' : 'Load'}
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
          {/* Slip code display */}


          {!isAuthenticated ? (
            <button
              onClick={async () => {
                setGeneratingCode(true)
                try {
                  const res = await fetch('/api/anonymous-slip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selections, stake }),
                  })
                  const result = await res.json()
                  if (result.success && result.slipCode) {
                    setSlipCode(result.slipCode)
                    const totalOdds = selections.reduce((a, s) => a * s.odd, 1)
                    const maxPayout = stake * totalOdds
                    const taxRate = (settings.winningTaxPercent ?? 15) / 100
                    const winningTax = maxPayout * taxRate
                    const netPayout = maxPayout - winningTax
                    setGeneratedSlipData({
                      slipCode: result.slipCode,
                      stake,
                      totalOdds,
                      maxPayout,
                      winningTax,
                      netPayout,
                      selections: selections.map(s => ({
                        homeTeam: s.homeTeam,
                        awayTeam: s.awayTeam,
                        marketName: s.marketName,
                        selection: s.selection,
                        odd: s.odd,
                      }))
                    })
                    setShowSlipModal(true)
                  } else {
                    alert(result.error ?? 'Failed to generate code')
                  }
                } catch(e) {
                  alert('Error: ' + String(e))
                }
                setGeneratingCode(false)
              }}
              disabled={selections.length === 0 || generatingCode}
              className={cn(
                'w-full py-2.5 rounded-lg font-semibold text-sm transition-colors',
                selections.length > 0 && !generatingCode
                  ? 'bg-gold text-charcoal hover:bg-gold-light'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {generatingCode ? 'Generating...' : slipCode ? '🔄 Regenerate Code' : '🎟️ Get Slip Code (Cash)'}
            </button>
          ) : (
            <button
              onClick={onPlaceBet}
              disabled={!canPlace || hasStarted}
              className={cn(
                'w-full py-2.5 rounded-lg font-semibold text-sm transition-colors',
                canPlace && !hasStarted
                  ? 'bg-gold text-charcoal hover:bg-gold-light'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {hasStarted ? 'Remove started matches' : 'Place Bet'}
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={onTopup}
              className="w-full py-2 rounded-lg font-medium text-sm border border-nile-blue text-nile-blue-light hover:bg-nile-blue/20 transition-colors"
            >
              Request Top-up
            </button>
          )}
        </div>
      )}
    {generatedSlipData && (
      <AnonymousSlipModal
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
        slipCode={generatedSlipData.slipCode}
        stake={generatedSlipData.stake}
        totalOdds={generatedSlipData.totalOdds}
        maxPayout={generatedSlipData.maxPayout}
        winningTax={generatedSlipData.winningTax}
        netPayout={generatedSlipData.netPayout}
        selections={generatedSlipData.selections}
        onOk={() => {
          clearSlip()
          setStake(0)
          setSlipCode('')
          setGeneratedSlipData(null)
          setShowSlipModal(false)
        }}
      />
    )}
    </div>
  )
}