'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Ticket, AlertTriangle, Search, Loader2, Clock, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useBetSlipStore } from '@/lib/stores/betSlipStore'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  formatETB,
  formatKickOff,
} from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import { getSlipById } from '@/lib/actions/bets'
import { AnonymousSlipModal } from './AnonymousSlipModal'
import { createClient } from '@/lib/supabase/client'
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
  // Countdown ticker
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // Realtime: auto-flag and auto-remove selections when match goes closed
  useEffect(() => {
    const supabase = createClient()
    const matchIds = useBetSlipStore.getState().selections.map(s => s.matchId)
    if (!matchIds.length) return
    const channel = supabase
      .channel('betslip-match-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
      }, (payload) => {
        const updated = payload.new as any
        if (updated.status === 'closed' || updated.status === 'finished') {
          const store = useBetSlipStore.getState()
          const affected = store.selections.filter(s => s.matchId === updated.id)
          if (affected.length > 0) {
            const matchName = `${affected[0].homeTeam} vs ${affected[0].awayTeam}`
            // Update matchStatus in selections
            const newSelections = store.selections.map(s =>
              s.matchId === updated.id ? { ...s, matchStatus: updated.status } : s
            )
            useBetSlipStore.setState({ selections: newSelections })
            toast.warning(`⚠️ ${matchName} has started — remove it to place your bet`)
          }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Helper: countdown string
  function getCountdown(kickOffTime: string): string | null {
    const target = new Date(kickOffTime).getTime()
    const diff = target - now
    if (diff <= 0) return null
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    if (hours > 0) return null // don't show for far-off matches
    if (mins < 1) return 'Starts < 1min'
    if (mins <= 60) return `Starts in ${mins}min`
    return null
  }

  const [copySlipId, setCopySlipId] =
    useState('')
  const [slipCode, setSlipCode] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)
  const [loadingSlip, setLoadingSlip] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [generatedSlipData, setGeneratedSlipData] = useState<any>(null)
  const [flashedOdds, setFlashedOdds] = useState<Record<string, number>>({})
  const [copiedCode, setCopiedCode] = useState(false)
  const prevOddsRef = useRef<Record<string, number>>({})
  const {
    selections,
    stake,
    calculation,
    setStake,
    removeSelection,
    removeStartedSelections,
    clearSlip,
    getValidationErrors,
  } = useBetSlipStore()
  const { user, isAuthenticated } =
    useAuthStore()

  // Odd change flash detection
  useEffect(() => {
    const newFlashed: Record<string, number> = {}
    selections.forEach(s => {
      const key = `${s.matchMarketId}-${s.selection}`
      const prev = prevOddsRef.current[key]
      if (prev !== undefined && prev !== s.odd) {
        newFlashed[key] = s.odd
      }
      prevOddsRef.current[key] = s.odd
    })
    if (Object.keys(newFlashed).length > 0) {
      setFlashedOdds(newFlashed)
      setTimeout(() => setFlashedOdds({}), 1500)
    }
  }, [selections])

  const errors = getValidationErrors(settings)
  const canPlace =
    errors.length === 0 &&
    selections.length >= settings.minSelections &&
    stake >= settings.minStake

  const startedSelections = selections.filter(
    (s) => s.matchStatus === 'closed' || s.matchStatus === 'finished'
  )
  const hasStarted = startedSelections.length > 0

  return (
    <div className="hidden md:flex w-[240px] flex-shrink-0 bg-[#1C2155] border-l border-[rgba(212,175,55,0.15)] rounded-none flex-col" style={{ fontSize: "78%", position: "sticky", top: "60px", height: "calc(100vh - 60px)" }}>
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
            className="relative group text-xs bg-gradient-to-r from-gold/80 to-gold text-charcoal px-2 py-1.5 rounded-md hover:from-gold hover:to-gold-light transition-all disabled:opacity-50 shadow-sm hover:shadow-gold/30 hover:shadow-md"
          >
            {loadingSlip ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Search className="w-3 h-3" /><span className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-charcoal border border-gold/30 text-gold text-[10px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Search</span></>}
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
            <span className="text-gold font-mono text-xs font-semibold">
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
          <div className="p-3 space-y-1.5">
            {/* Remove all started button */}
            {hasStarted && (
              <button
                onClick={() => {
                  removeStartedSelections()
                  toast.success('Started matches removed')
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-nile-danger/20 border border-nile-danger/40 text-nile-danger text-[11px] font-semibold hover:bg-nile-danger/30 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                Remove {startedSelections.length} started match{startedSelections.length > 1 ? 'es' : ''}
              </button>
            )}

            <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
            {selections.map((s) => {
              const started =
                s.matchStatus === 'closed' ||
                s.matchStatus === 'finished'
              const countdown = getCountdown(s.kickOffTime)
              return (
                <div
                  key={`${s.matchMarketId}-${s.selection}`}
                  className={cn(
                    'rounded-lg p-2 border transition-colors',
                    started
                      ? 'border-nile-danger/60 bg-nile-danger/15'
                      : countdown
                      ? 'border-nile-orange/40 bg-nile-orange/10'
                      : 'border-gold/40 bg-gold/10'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-white font-semibold truncate leading-tight">
                        {s.homeTeam} vs {s.awayTeam}
                      </p>
                      <p className="text-[9px] text-gold/50 truncate leading-tight mt-0.5">
                        {s.leagueName}
                      </p>
                      <p className="text-[9px] text-white/30 flex items-center gap-0.5 leading-tight mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatKickOff(s.kickOffTime)}
                      </p>
                      <p className="text-[10px] text-white/40 truncate leading-tight mt-0.5">
                        {s.marketName}: <span className="text-white font-medium">{s.selection}</span>
                      </p>
                      {started ? (
                        <p className="text-[9px] text-nile-danger flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Match started!
                        </p>
                      ) : countdown ? (
                        <p className="text-[9px] text-nile-orange flex items-center gap-1 mt-0.5">
                          ⏱ {countdown}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 ml-2">
                      <span className={cn(
                        'font-mono text-[14px] font-bold transition-all duration-300',
                        flashedOdds[`${s.matchMarketId}-${s.selection}`] ? 'text-nile-orange scale-110' : 'text-gold'
                      )}>
                        {s.odd.toFixed(2)}
                        {flashedOdds[`${s.matchMarketId}-${s.selection}`] && <span className="text-[9px] ml-0.5">▲</span>}
                      </span>
                      <button
                        onClick={() =>
                          removeSelection(s.matchMarketId, s.selection)
                        }
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded',
                          started
                            ? 'bg-nile-danger text-white'
                            : 'text-nile-danger hover:text-nile-danger/80'
                        )}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        )}
      </div>

      {/* Footer: stake + calculation */}
      {selections.length > 0 && (
        <div className="border-t border-gold/10 p-4 space-y-3">
          {/* Selection progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-white/40">Progress</span>
              <span className={cn('text-[10px] font-medium', selections.length >= settings.minSelections ? 'text-nile-success' : 'text-nile-orange')}>
                {selections.length}/{settings.minSelections} min
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', selections.length >= settings.minSelections ? 'bg-nile-success shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-nile-orange')}
                style={{ width: `${Math.min((selections.length / settings.minSelections) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Total odds warning */}
          {calculation.totalOdds > 0 && (() => {
            const pct = calculation.totalOdds / settings.maxTotalOdds
            if (pct < 0.7) return null
            return (
              <div className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium border', pct >= 1 ? 'bg-nile-danger/20 border-nile-danger/40 text-nile-danger' : 'bg-nile-orange/20 border-nile-orange/40 text-nile-orange')}>
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                {pct >= 1 ? `Max odds reached (${settings.maxTotalOdds.toLocaleString()})` : `Odds at ${Math.round(pct * 100)}% of max (${settings.maxTotalOdds.toLocaleString()})`}
              </div>
            )
          })()}

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
              Min: ETB {settings.minStake} | Max: ETB {settings.maxStakePerSlip.toLocaleString()}
            </p>
            {/* Quick stake presets */}
            <div className="flex gap-1 mt-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              {[25, 50, 100, 200].map(amt => (
                <button key={amt} onClick={() => setStake(amt)}
                  className={cn('text-[10px] px-2.5 py-1 rounded-full border flex-shrink-0 transition-colors',
                    stake === amt ? 'bg-gold border-gold text-charcoal font-bold' : 'border-gold/25 text-gold/70 hover:border-gold/60 hover:text-gold'
                  )}>
                  {amt}
                </button>
              ))}
              {isAuthenticated && user && user.credit_balance > 0 && (<>
                {[0.25, 0.5, 1].map(pct => {
                  const amt = Math.floor(user.credit_balance * pct)
                  if (amt < settings.minStake) return null
                  return (
                    <button key={pct} onClick={() => setStake(amt)}
                      className={cn('text-[10px] px-2.5 py-1 rounded-full border flex-shrink-0 transition-colors',
                        stake === amt ? 'bg-gold border-gold text-charcoal font-bold' : 'border-gold/25 text-gold/70 hover:border-gold/60 hover:text-gold'
                      )}>
                      {pct === 1 ? 'MAX' : `${pct * 100}%`}
                    </button>
                  )
                })}
              </>)}
            </div>
          </div>

          {/* Calculation — only show when stake entered */}
          {stake > 0 && <div className="space-y-1 text-sm">
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
          </div>}

          {/* Validation errors — single pill */}
          {errors.length > 0 && (
            <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg px-2.5 py-2 space-y-0.5">
              {errors.map((e, i) => (
                <p key={i} className="text-[10px] text-nile-danger flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {e}
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
              {generatingCode ? 'Generating...' : slipCode ? '🔄 Regenerate Code' : '🎟️ Place Bet'}
            </button>
          ) : (
            <button
              onClick={onPlaceBet}
              disabled={!canPlace || hasStarted}
              className={cn(
                'w-full py-3 rounded-xl font-bold text-sm transition-all',
                canPlace && !hasStarted
                  ? 'bg-gold text-charcoal hover:bg-gold-light shadow-lg shadow-gold/20 hover:shadow-gold/40'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {hasStarted ? `Remove ${startedSelections.length} started match${startedSelections.length > 1 ? 'es' : ''} first` : 'Place Bet'}
            </button>
          )}

          {/* Copy slip code button */}
          {!isAuthenticated && slipCode && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(slipCode)
                setCopiedCode(true)
                setTimeout(() => setCopiedCode(false), 2000)
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gold/30 text-gold text-[11px] hover:bg-gold/10 transition-colors"
            >
              {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedCode ? 'Copied!' : `Copy Code: ${slipCode}`}
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
    {/* Mobile floating bottom bar */}
    {selections.length > 0 && (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1C2155] border-t border-gold/20 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[10px] text-white/50">{selections.length} selections · {calculation.totalOdds.toFixed(2)}x</span>
          <span className="text-gold font-mono text-sm font-bold">{formatETB(calculation.netPayout)}</span>
        </div>
        <button
          onClick={isAuthenticated ? onPlaceBet : undefined}
          disabled={isAuthenticated ? (!canPlace || hasStarted) : false}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors',
            (!isAuthenticated || (canPlace && !hasStarted))
              ? 'bg-gold text-charcoal hover:bg-gold-light'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          )}
        >
          {hasStarted ? 'Remove started' : isAuthenticated ? 'Place Bet' : '🎟️ Place Bet'}
        </button>
      </div>
    )}
    </div>
  )
}