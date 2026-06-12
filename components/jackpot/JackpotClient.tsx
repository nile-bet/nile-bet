'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { placeJackpotBet, getMyJackpotSlips } from '@/lib/actions/jackpot'
import { formatETB, formatDate, formatCountdown } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Trophy, Clock, CheckCircle, XCircle, Star, Copy, Check, Zap, Target, TrendingUp, Shield, ChevronRight } from 'lucide-react'
import { JackpotPrintReceiptModal } from './JackpotPrintReceiptModal'

interface Props { jackpot: any; leaderboard: any[]; pastJackpots: any[] }
type Selection = 'home' | 'draw' | 'away'

export function JackpotClient({ jackpot, leaderboard, pastJackpots }: Props) {
  const { user, isAuthenticated, setUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'pick' | 'myslips' | 'leaderboard' | 'history'>('pick')
  const [selections, setSelections] = useState<Record<number, Selection>>({})
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [mySlips, setMySlips] = useState<any[]>([])
  const [loadingSlips, setLoadingSlips] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptSlipId, setReceiptSlipId] = useState('')
  const [guestSlipCode, setGuestSlipCode] = useState('')
  const [generatingGuestCode, setGeneratingGuestCode] = useState(false)
  const [copiedGuestCode, setCopiedGuestCode] = useState(false)
  const [showGuestSlipModal, setShowGuestSlipModal] = useState(false)
  const [lastSelections, setLastSelections] = useState<Record<number, Selection>>({})
  const [betPlaced, setBetPlaced] = useState(false)

  const matches = jackpot?.jackpot_matches?.sort((a: any, b: any) => a.game_number - b.game_number) ?? []
  const selectedCount = Object.keys(selections).length
  const allSelected = selectedCount === 12

  const handleSelect = (gameNumber: number, sel: Selection) => {
    setSelections(prev => ({ ...prev, [gameNumber]: sel }))
  }

  const handleLoadMySlips = async () => {
    if (!user) return
    setLoadingSlips(true)
    const data = await getMyJackpotSlips(user.id)
    setMySlips(data)
    setLoadingSlips(false)
  }

  const refreshMySlips = async () => {
    if (!user) return
    const data = await getMyJackpotSlips(user.id)
    setMySlips(data)
  }

  const handleTabChange = (tab: 'pick' | 'myslips' | 'leaderboard' | 'history') => {
    setActiveTab(tab)
    if (tab === 'myslips' && user) handleLoadMySlips()
  }

  const handlePlace = async () => {
    if (!user || !isAuthenticated || !jackpot || !allSelected) return
    setPlacing(true)
    const sels = matches.map((m: any) => ({
      gameNumber: m.game_number,
      selection: selections[m.game_number]!,
      odd: selections[m.game_number] === 'home' ? m.home_odd : selections[m.game_number] === 'draw' ? m.draw_odd : m.away_odd,
    }))
    const result = await placeJackpotBet({ jackpotId: jackpot.id, bettorId: user.id, placedById: user.id, isAnonymous, selections: sels })
    if (result.success && result.slipId) {
      toast.success(`🏆 Jackpot entered! Slip #${result.slipId}`)
      setReceiptSlipId(result.slipId)
      setShowReceipt(true)
      setLastSelections(selections)
      setBetPlaced(true)
      setSelections({})
      if (user) setUser({ ...user, credit_balance: (user.credit_balance ?? 0) - (jackpot?.fixed_stake ?? 50) })
      setTimeout(async () => {
        if (user) { const data = await getMyJackpotSlips(user.id); setMySlips(data) }
      }, 1500)
    } else {
      toast.error(result.error ?? 'Failed to place bet')
    }
    setPlacing(false)
  }

  const tabs = [
    { key: 'pick', label: '🎯 Pick', icon: Target },
    ...(isAuthenticated ? [{ key: 'myslips', label: '🎫 My Slips', icon: Shield }] : []),
    { key: 'leaderboard', label: '🏆 Board', icon: TrendingUp },
    { key: 'history', label: '📋 History', icon: Star },
  ]

  if (!jackpot) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-10 text-center border border-[#D4AF37]/10" style={{ background: 'linear-gradient(135deg, #1A1F4D 0%, #252E6D 100%)' }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <Trophy className="w-8 h-8" style={{ color: '#D4AF37' }} />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">No Active Jackpot</h2>
          <p className="text-white/40 text-sm">The next jackpot will be announced soon. Stay tuned!</p>
        </div>
        {pastJackpots.filter(j => j.status === 'settled').length > 0 && (
          <div>
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: '#D4AF37' }} /> Past Jackpots</h2>
            <div className="space-y-2">
              {pastJackpots.filter(j => j.status === 'settled').map(jp => (
                <div key={jp.id} className="rounded-xl p-4 flex items-center justify-between border border-[#252E6D]/60" style={{ background: 'linear-gradient(135deg, #1A1F4D 0%, #1C2155 100%)' }}>
                  <div>
                    <p className="text-white font-medium text-sm">{jp.name}</p>
                    <p className="text-white/30 text-xs mt-0.5">{formatDate(jp.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm" style={{ color: '#D4AF37' }}>{formatETB(jp.win_all_reward)}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4ade80' }}>Settled ✓</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const isOpen = jackpot.status === 'open'
  const isClosed = jackpot.status === 'closed'
  const isSettled = jackpot.status === 'settled'

  return (
    <div>
      {/* Guest Slip Modal */}
      {showGuestSlipModal && guestSlipCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#D4AF37]/30" style={{ background: 'linear-gradient(160deg, #1A1F4D 0%, #252E6D 100%)' }}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="text-white font-bold text-lg">Your Jackpot Slip Code</h3>
              <p className="text-white/40 text-xs mt-1">Show this code to the cashier to place your bet</p>
            </div>
            <div className="rounded-xl p-5 text-center mb-4 border border-[#D4AF37]/20" style={{ background: 'rgba(212,175,55,0.06)' }}>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Slip Code</p>
              <div className="flex items-center justify-center gap-3">
                <p className="font-mono text-4xl font-bold tracking-widest" style={{ color: '#FFD700' }}>{guestSlipCode}</p>
                <button onClick={() => { navigator.clipboard.writeText(guestSlipCode); setCopiedGuestCode(true); setTimeout(() => setCopiedGuestCode(false), 2000) }} className="transition-colors" style={{ color: copiedGuestCode ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                  {copiedGuestCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              {copiedGuestCode && <p className="text-xs mt-2" style={{ color: '#4ade80' }}>✅ Copied!</p>}
            </div>
            <p className="text-white/30 text-xs text-center mb-4">The cashier will use this code to find your selections and place the bet for you.</p>
            <button onClick={() => { setShowGuestSlipModal(false); setSelections({}); setGuestSlipCode('') }}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all" style={{ background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155' }}>
              OK — Done
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* LEFT: Match List */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Jackpot info bar */}
          <div className="rounded-2xl p-4 border border-[#D4AF37]/20 flex flex-wrap items-center justify-between gap-3" style={{ background: 'linear-gradient(135deg, #1A1F4D 0%, #252E6D 80%)' }}>
            <div>
              <h2 className="text-white font-bold text-base">{jackpot.name}</h2>
              <p className="text-xs mt-0.5 flex items-center gap-1.5">
                {isOpen && <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" /><span className="text-green-400">Open for betting</span></>}
                {isClosed && <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /><span className="text-amber-400">Betting closed</span></>}
                {isSettled && <><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /><span className="text-red-400">Settled</span></>}
                <span className="text-white/30">• Closes {formatDate(jackpot.closes_at)}</span>
              </p>
            </div>
            {isOpen && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30" style={{ background: 'rgba(239,68,68,0.08)' }}>
                <Clock className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 text-sm font-mono font-bold">{formatCountdown(jackpot.closes_at)}</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0 rounded-xl overflow-hidden border border-[#252E6D]/60" style={{ background: '#1A1F4D' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => handleTabChange(t.key as any)}
                className="flex-1 py-2.5 text-xs font-semibold transition-all"
                style={activeTab === t.key ? { background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155' } : { color: 'rgba(255,255,255,0.4)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* PICK TAB */}
          {activeTab === 'pick' && (
            <div className="space-y-3">
              {/* Post-bet summary */}
              {betPlaced && Object.keys(lastSelections).length === 12 && (
                <div className="rounded-xl p-4 border border-green-500/30" style={{ background: 'rgba(74,222,128,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-green-400 font-semibold text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Bet Placed — Your Picks</p>
                    <button onClick={() => { setBetPlaced(false); setLastSelections({}) }} className="text-white/30 hover:text-white text-xs">Dismiss</button>
                  </div>
                  <div className="space-y-1.5">
                    {matches.map((m: any) => {
                      const pick = lastSelections[m.game_number]
                      return (
                        <div key={m.game_number} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <span className="text-white/50 truncate flex-1">
                            <span className="font-mono mr-2" style={{ color: '#D4AF37' }}>G{m.game_number}</span>
                            {m.home_team} vs {m.away_team}
                          </span>
                          <span className="font-bold ml-2 px-2 py-0.5 rounded text-xs" style={
                            pick === 'home' ? { background: 'rgba(212,175,55,0.2)', color: '#FFD700' } :
                            pick === 'draw' ? { background: 'rgba(255,255,255,0.1)', color: 'white' } :
                            { background: 'rgba(74,144,217,0.2)', color: '#4A90D9' }
                          }>
                            {pick === 'home' ? '1 Home' : pick === 'draw' ? 'X Draw' : '2 Away'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!isOpen && (
                <div className="rounded-xl p-4 text-center border" style={
                  isClosed ? { background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' } :
                  { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }
                }>
                  <p className="font-semibold text-sm" style={isClosed ? { color: '#f59e0b' } : { color: 'rgba(255,255,255,0.4)' }}>
                    {isClosed ? '⏱️ Betting has closed — results coming soon' : '🏁 This jackpot has been settled'}
                  </p>
                </div>
              )}

              {/* Match cards */}
              <div className="space-y-2">
                {matches.map((match: any) => {
                  const sel = selections[match.game_number]
                  const result = match.result
                  const isResulted = !!result && result !== 'pending'
                  return (
                    <div key={match.id}
                      className="rounded-xl border transition-all overflow-hidden"
                      style={
                        isResulted && result === sel ? { borderColor: 'rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.04)' } :
                        isResulted && result !== sel && sel ? { borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.03)' } :
                        sel ? { borderColor: 'rgba(212,175,55,0.35)', background: 'rgba(212,175,55,0.04)' } :
                        { borderColor: 'rgba(37,46,109,0.7)', background: 'linear-gradient(135deg, #1A1F4D, #1C2155)' }
                      }>
                      {/* Match header row */}
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                            G{match.game_number}
                          </span>
                          <span className="text-[10px] text-white/30 font-mono">
                            {new Date(match.kick_off_time).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })}
                            {' · '}
                            {new Date(match.kick_off_time).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {isResulted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={
                            result === 'home' ? { color: '#FFD700', background: 'rgba(212,175,55,0.15)' } :
                            result === 'away' ? { color: '#60a5fa', background: 'rgba(96,165,250,0.15)' } :
                            { color: 'white', background: 'rgba(255,255,255,0.1)' }
                          }>
                            {result === 'home' ? '1 Home' : result === 'away' ? '2 Away' : 'X Draw'} ✓
                          </span>
                        )}
                      </div>
                      {/* Teams + odds row */}
                      <div className="px-3 py-2.5">
                        {/* Team names */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-white font-semibold text-sm flex-1">{match.home_team}</span>
                          <span className="text-white/25 text-xs mx-2 flex-shrink-0">vs</span>
                          <span className="text-white font-semibold text-sm flex-1 text-right">{match.away_team}</span>
                        </div>
                        {/* Odds buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {([
                            { key: 'home' as const, label: '1', sublabel: 'Home', odd: match.home_odd },
                            { key: 'draw' as const, label: 'X', sublabel: 'Draw', odd: match.draw_odd },
                            { key: 'away' as const, label: '2', sublabel: 'Away', odd: match.away_odd },
                          ]).map(opt => {
                            const isSelected = sel === opt.key
                            const isCorrect = isResulted && result === opt.key
                            const isWrong = isResulted && isSelected && result !== opt.key
                            return (
                              <button key={opt.key}
                                onClick={() => { if (isOpen) handleSelect(match.game_number, opt.key) }}
                                disabled={!isOpen}
                                className="flex items-center justify-between px-3 py-2 rounded-lg transition-all"
                                style={
                                  isCorrect ? { background: 'rgba(74,222,128,0.18)', border: '1.5px solid #4ade80' } :
                                  isWrong ? { background: 'rgba(239,68,68,0.12)', border: '1.5px solid #ef4444' } :
                                  isSelected ? { background: 'rgba(212,175,55,0.2)', border: '1.5px solid #D4AF37' } :
                                  { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                                }>
                                <span className="text-xs font-bold" style={
                                  isCorrect ? { color: '#4ade80' } :
                                  isWrong ? { color: '#ef4444' } :
                                  isSelected ? { color: '#FFD700' } :
                                  { color: 'rgba(255,255,255,0.5)' }
                                }>{opt.label}</span>
                                <span className="text-xs font-mono font-bold" style={
                                  isCorrect ? { color: '#4ade80' } :
                                  isWrong ? { color: '#ef4444' } :
                                  isSelected ? { color: '#FFD700' } :
                                  { color: 'rgba(255,255,255,0.7)' }
                                }>{opt.odd?.toFixed(2) ?? '—'}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* MY SLIPS TAB */}
          {activeTab === 'myslips' && (
            <div className="space-y-3">
              {!isAuthenticated ? (
                <div className="rounded-2xl p-10 text-center border border-[#252E6D]/60" style={{ background: 'linear-gradient(135deg, #1A1F4D, #1C2155)' }}>
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#D4AF37' }} />
                  <p className="text-white/40 mb-3">Login to view your slips</p>
                  <a href="/login" className="inline-block px-5 py-2 rounded-xl text-sm font-bold" style={{ background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155' }}>Login</a>
                </div>
              ) : loadingSlips ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-xl h-24 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
              ) : mySlips.length === 0 ? (
                <div className="rounded-2xl p-10 text-center border border-[#252E6D]/60" style={{ background: 'linear-gradient(135deg, #1A1F4D, #1C2155)' }}>
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#D4AF37' }} />
                  <p className="text-white/40 mb-3">No jackpot entries yet</p>
                  <button onClick={() => handleTabChange('pick')} className="px-5 py-2 rounded-xl text-sm font-bold" style={{ background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155' }}>Enter Now</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-white/40 text-xs">{mySlips.length} slip{mySlips.length !== 1 ? 's' : ''}</p>
                    <button onClick={refreshMySlips} className="text-[10px] text-white/30 hover:text-white px-2 py-1 rounded border border-white/10 hover:border-white/20">↻ Refresh</button>
                  </div>
                  {mySlips.map(slip => (
                    <JackpotSlipCard key={slip.id} slip={slip} onPrint={slipId => { setReceiptSlipId(slipId); setShowReceipt(true) }} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <div className="rounded-2xl p-10 text-center border border-[#252E6D]/60" style={{ background: 'linear-gradient(135deg, #1A1F4D, #1C2155)' }}>
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#D4AF37' }} />
                  <p className="text-white/40 text-sm">No entries yet — be the first!</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-[#252E6D]/60" style={{ background: '#13173a' }}>
                  {/* Header */}
                  <div className="grid px-4 py-2.5 border-b border-[#252E6D]/60 text-[10px] font-bold uppercase tracking-widest text-white/25"
                    style={{ gridTemplateColumns: '36px 1fr 60px 80px' }}>
                    <span>#</span>
                    <span>Player</span>
                    <span className="text-center">Score</span>
                    <span className="text-right">Prize</span>
                  </div>
                  {leaderboard.map((entry: any, i: number) => {
                    const rank = i + 1
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
                    const isWinner = entry.status === 'won'
                    const isNearWin = entry.status === 'near_win'
                    const isPending = entry.status === 'pending' || entry.correct_count === null
                    return (
                      <div key={entry.slip_id}
                        className="grid items-center px-4 py-3 border-b border-[#252E6D]/20 last:border-0"
                        style={{
                          gridTemplateColumns: '36px 1fr 60px 80px',
                          background: isWinner ? 'rgba(212,175,55,0.06)' : isNearWin ? 'rgba(74,222,128,0.04)' : 'transparent'
                        }}>
                        {/* Rank */}
                        <span className="text-sm w-8">
                          {medal ?? <span className="text-white/30 font-mono text-xs">#{rank}</span>}
                        </span>
                        {/* Player */}
                        <div>
                          <p className="text-white text-sm font-semibold">
                            {entry.is_anonymous ? '🔒 Anonymous' : `@${(entry.bettor as any)?.username ?? '—'}`}
                          </p>
                          <p className="text-white/25 text-[10px] font-mono">{entry.slip_id}</p>
                        </div>
                        {/* Score */}
                        <div className="text-center">
                          {isPending ? (
                            <span className="text-white/20 text-xs">—</span>
                          ) : (
                            <span className="font-bold text-sm font-mono" style={{ color: isWinner ? '#FFD700' : isNearWin ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>
                              {entry.correct_count}/12
                            </span>
                          )}
                        </div>
                        {/* Prize */}
                        <div className="text-right">
                          {entry.reward_amount > 0 ? (
                            <span className="text-xs font-mono font-bold" style={{ color: '#4ade80' }}>
                              +{formatETB(entry.reward_amount)}
                            </span>
                          ) : isPending ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                              Live
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="px-4 py-2.5 border-t border-[#252E6D]/40 text-center">
                    <p className="text-white/20 text-[10px]">{leaderboard.length} total entries</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {pastJackpots.length === 0 ? (
                <div className="rounded-2xl p-10 text-center border border-[#252E6D]/60" style={{ background: 'linear-gradient(135deg, #1A1F4D, #1C2155)' }}>
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#D4AF37' }} />
                  <p className="text-white/40 text-sm">No past jackpots yet</p>
                </div>
              ) : pastJackpots.map((jp: any) => {
                const jpMatches = (jp.jackpot_matches ?? []).sort((a: any, b: any) => a.game_number - b.game_number)
                const settledMatches = jpMatches.filter((m: any) => m.result && m.result !== 'pending')
                const isCurrentActive = jackpot && jp.id === jackpot.id
                return (
                  <div key={jp.id} className="rounded-xl overflow-hidden border border-[#252E6D]/60" style={{ background: '#13173a' }}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[#252E6D]/40 flex items-center justify-between" style={{ background: 'rgba(212,175,55,0.04)' }}>
                      <div>
                        <p className="text-white font-bold text-sm">{jp.name}</p>
                        <p className="text-white/30 text-xs mt-0.5">{formatDate(jp.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {settledMatches.length > 0 && (
                          <span className="text-[10px] text-white/30">{settledMatches.length}/{jpMatches.length} results</span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold" style={
                          jp.status === 'settled' ? { color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)' } :
                          jp.status === 'open' ? { color: '#FFD700', borderColor: 'rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.08)' } :
                          jp.status === 'closed' ? { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' } :
                          { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }
                        }>{jp.status}</span>
                      </div>
                    </div>
                    {/* Prizes row */}
                    <div className="grid grid-cols-3 divide-x divide-[#252E6D]/40 border-b border-[#252E6D]/40">
                      <div className="px-3 py-2 text-center">
                        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Win All</p>
                        <p className="text-xs font-mono font-bold" style={{ color: '#D4AF37' }}>{formatETB(jp.win_all_reward)}</p>
                      </div>
                      <div className="px-3 py-2 text-center">
                        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Miss 1</p>
                        <p className="text-xs font-mono" style={{ color: '#4ade80' }}>{formatETB(jp.near_win_reward)}</p>
                      </div>
                      <div className="px-3 py-2 text-center">
                        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Entry</p>
                        <p className="text-xs font-mono text-white/60">{formatETB(jp.fixed_stake)}</p>
                      </div>
                    </div>
                    {/* Match results — only if there are any */}
                    {jpMatches.length > 0 && (
                      <div className="divide-y divide-[#252E6D]/20">
                        {jpMatches.map((m: any) => {
                          const settled = m.result && m.result !== 'pending'
                          return (
                            <div key={m.id} className="grid items-center px-3 py-2 text-xs"
                              style={{ gridTemplateColumns: '24px 1fr 36px' }}>
                              <span className="font-mono text-[10px]" style={{ color: 'rgba(212,175,55,0.4)' }}>{m.game_number}</span>
                              <span className="text-white/60 truncate">
                                {m.home_team} <span className="text-white/20">v</span> {m.away_team}
                              </span>
                              <div className="text-right">
                                {settled ? (
                                  <span className="font-bold px-1.5 py-0.5 rounded text-[10px]" style={
                                    m.result === 'home' ? { color: '#FFD700', background: 'rgba(212,175,55,0.15)' } :
                                    m.result === 'away' ? { color: '#4A90D9', background: 'rgba(74,144,217,0.15)' } :
                                    { color: 'white', background: 'rgba(255,255,255,0.08)' }
                                  }>
                                    {m.result === 'home' ? '1' : m.result === 'away' ? '2' : 'X'}
                                  </span>
                                ) : (
                                  <span className="text-white/15 text-[10px]">—</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Bet Slip Builder (desktop only) */}
        {isOpen && activeTab === 'pick' && (
          <div className="hidden lg:flex w-72 flex-shrink-0">
            <div className="w-full rounded-2xl border border-[#D4AF37]/20 flex flex-col sticky top-4 max-h-[calc(100vh-120px)]" style={{ background: 'linear-gradient(160deg, #1A1F4D 0%, #252E6D 100%)' }}>
              {/* Slip header */}
              <div className="p-4 border-b border-[#252E6D]/60" style={{ background: 'rgba(212,175,55,0.05)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.15)' }}>
                      <Trophy className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Jackpot Slip</p>
                      <p className="text-white/30 text-[10px]">{jackpot.name}</p>
                    </div>
                  </div>
                  {selectedCount > 0 && (
                    <button onClick={() => setSelections({})} className="text-[10px] text-white/30 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10">
                      Clear
                    </button>
                  )}
                </div>
                {/* Progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Selections</span>
                    <span className="text-[11px] font-mono font-bold" style={{ color: allSelected ? '#4ade80' : '#D4AF37' }}>{selectedCount}/12</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(selectedCount / 12) * 100}%`, background: allSelected ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #D4AF37, #FFD700)' }} />
                  </div>
                </div>
              </div>

              {/* Picks list */}
              <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
                {matches.map((m: any) => {
                  const pick = selections[m.game_number]
                  return (
                    <div key={m.game_number} className="flex items-center justify-between px-4 py-2 border-b border-[#252E6D]/30 last:border-0">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgba(212,175,55,0.6)' }}>G{m.game_number}</p>
                        <p className="text-white text-xs font-medium truncate">{m.home_team} <span className="text-white/30">v</span> {m.away_team}</p>
                      </div>
                      {pick ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0" style={
                          pick === 'home' ? { background: 'rgba(212,175,55,0.2)', color: '#FFD700', border: '1px solid rgba(212,175,55,0.3)' } :
                          pick === 'draw' ? { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' } :
                          { background: 'rgba(74,144,217,0.2)', color: '#4A90D9', border: '1px solid rgba(74,144,217,0.3)' }
                        }>
                          {pick === 'home' ? '1' : pick === 'draw' ? 'X' : '2'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/20 px-2.5 py-1 rounded-lg flex-shrink-0" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#252E6D]/60 space-y-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                {/* Reward info */}
                <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Entry Fee</span>
                    <span className="font-mono font-bold" style={{ color: '#FFD700' }}>{formatETB(jackpot.fixed_stake)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Win All 12</span>
                    <span className="font-mono" style={{ color: '#4ade80' }}>{formatETB(jackpot.win_all_reward)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Miss 1</span>
                    <span className="font-mono text-white/60">{formatETB(jackpot.near_win_reward)}</span>
                  </div>
                  {isAuthenticated && user && (
                    <div className="flex justify-between text-xs pt-1 border-t border-[#252E6D]/40">
                      <span className="text-white/40">Balance</span>
                      <span className={cn("font-mono text-xs", (user.credit_balance ?? 0) < jackpot.fixed_stake ? "text-red-400" : "text-white/70")}>{formatETB(user.credit_balance ?? 0)}</span>
                    </div>
                  )}
                </div>

                {!isAuthenticated ? (
                  <div className="space-y-2">
                    <button onClick={async () => {
                      if (!allSelected || generatingGuestCode) return
                      setGeneratingGuestCode(true)
                      try {
                        const sels = matches.map((m: any) => ({
                          matchId: m.id, gameNumber: m.game_number,
                          selection: selections[m.game_number]!,
                          odd: selections[m.game_number] === 'home' ? m.home_odd : selections[m.game_number] === 'draw' ? m.draw_odd : m.away_odd,
                        }))
                        const res = await fetch('/api/anonymous-jackpot-slip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jackpotId: jackpot.id, selections: sels }) })
                        const result = await res.json()
                        if (result.success) { setGuestSlipCode(result.slipCode); setShowGuestSlipModal(true); toast.success('Slip code generated!') }
                        else toast.error(result.error ?? 'Failed')
                      } catch { toast.error('Error generating code') }
                      setGeneratingGuestCode(false)
                    }} disabled={!allSelected || generatingGuestCode}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                      style={allSelected && !generatingGuestCode ? { background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155', boxShadow: '0 4px 15px rgba(212,175,55,0.3)' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}>
                      {generatingGuestCode ? 'Generating...' : !allSelected ? `Pick ${12 - selectedCount} more` : '🎟️ Get Slip Code'}
                    </button>
                    <a href="/login" className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all border border-[#252E6D]/60 text-white/50 hover:text-white hover:border-[#D4AF37]/30">
                      Login to Play Directly
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button onClick={() => setIsAnonymous(!isAnonymous)}
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border w-full transition-all"
                      style={isAnonymous ? { borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24', background: 'rgba(251,191,36,0.08)' } : { borderColor: 'rgba(37,46,109,0.8)', color: 'rgba(255,255,255,0.4)' }}>
                      <span>{isAnonymous ? '🔒' : '🔓'}</span>
                      {isAnonymous ? 'Anonymous entry' : 'Enter with username'}
                    </button>
                    <button onClick={handlePlace} disabled={!allSelected || placing}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                      style={allSelected && !placing ? { background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155', boxShadow: '0 4px 20px rgba(212,175,55,0.35)' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}>
                      {placing ? '⏳ Placing...' : !allSelected ? `Pick ${12 - selectedCount} more` : `🏆 Enter — ${formatETB(jackpot.fixed_stake)}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile place bet bar */}
      {isOpen && activeTab === 'pick' && (
        <div className="lg:hidden sticky bottom-2 mt-4 rounded-2xl p-3 border border-[#D4AF37]/20 shadow-2xl" style={{ background: 'linear-gradient(135deg, #1A1F4D, #252E6D)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40">{selectedCount}/12 selected</span>
            <span className="text-xs font-mono font-bold" style={{ color: '#D4AF37' }}>{formatETB(jackpot.fixed_stake)}</span>
          </div>
          <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(selectedCount / 12) * 100}%`, background: allSelected ? '#4ade80' : '#D4AF37' }} />
          </div>
          {!isAuthenticated ? (
            <button onClick={async () => {
              if (!allSelected || generatingGuestCode) return
              setGeneratingGuestCode(true)
              try {
                const sels = matches.map((m: any) => ({ matchId: m.id, gameNumber: m.game_number, selection: selections[m.game_number]!, odd: selections[m.game_number] === 'home' ? m.home_odd : selections[m.game_number] === 'draw' ? m.draw_odd : m.away_odd }))
                const res = await fetch('/api/anonymous-jackpot-slip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jackpotId: jackpot.id, selections: sels }) })
                const result = await res.json()
                if (result.success) { setGuestSlipCode(result.slipCode); setShowGuestSlipModal(true) }
                else toast.error(result.error ?? 'Failed')
              } catch { toast.error('Error') }
              setGeneratingGuestCode(false)
            }} disabled={!allSelected || generatingGuestCode}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={allSelected ? { background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}>
              {!allSelected ? `Select ${12 - selectedCount} more` : '🎟️ Get Slip Code'}
            </button>
          ) : (
            <button onClick={handlePlace} disabled={!allSelected || placing}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={allSelected && !placing ? { background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155', boxShadow: '0 4px 20px rgba(212,175,55,0.3)' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}>
              {placing ? '⏳ Placing...' : !allSelected ? `Pick ${12 - selectedCount} more` : `🏆 Enter Jackpot — ${formatETB(jackpot.fixed_stake)}`}
            </button>
          )}
        </div>
      )}

      {receiptSlipId && (
        <JackpotPrintReceiptModal isOpen={showReceipt} onClose={() => { setShowReceipt(false); setReceiptSlipId('') }} slipId={receiptSlipId} jackpot={jackpot} />
      )}
    </div>
  )
}

// ─── Jackpot Slip Card ────────────────
function JackpotSlipCard({ slip, onPrint }: { slip: any; onPrint: (slipId: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const selections = slip.jackpot_slip_selections?.sort((a: any, b: any) => a.game_number - b.game_number) ?? []

  return (
    <div className="rounded-2xl overflow-hidden border transition-all" style={
      slip.status === 'won' ? { borderColor: 'rgba(212,175,55,0.4)', background: 'linear-gradient(135deg, rgba(212,175,55,0.06), #1A1F4D)' } :
      slip.status === 'near_win' ? { borderColor: 'rgba(74,222,128,0.3)', background: 'linear-gradient(135deg, rgba(74,222,128,0.04), #1A1F4D)' } :
      slip.status === 'lost' ? { borderColor: 'rgba(239,68,68,0.2)', background: '#1A1F4D' } :
      { borderColor: 'rgba(37,46,109,0.8)', background: 'linear-gradient(135deg, #1A1F4D, #1C2155)' }
    }>
      {slip.status === 'won' && (
        <div className="px-4 py-2.5 text-center border-b border-[#D4AF37]/20" style={{ background: 'rgba(212,175,55,0.1)' }}>
          <p className="font-bold text-sm" style={{ color: '#FFD700' }}>🏆 JACKPOT WINNER!</p>
        </div>
      )}
      {slip.status === 'near_win' && (
        <div className="px-4 py-2.5 text-center border-b border-green-500/20" style={{ background: 'rgba(74,222,128,0.06)' }}>
          <p className="font-semibold text-sm text-green-400">🥈 11/12 Correct!</p>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-mono font-bold text-sm" style={{ color: '#D4AF37' }}>#{slip.slip_id}</p>
            <p className="text-white/30 text-xs mt-0.5">
              {slip.jackpots?.name} • {formatDate(slip.created_at)}
            </p>
            <p className="text-white/20 text-[10px] mt-0.5">
              Stake: <span className="font-mono" style={{ color: 'rgba(212,175,55,0.6)' }}>{formatETB(slip.stake ?? slip.jackpots?.fixed_stake ?? 0)}</span>
              {' '}• Status: <span className={
                slip.status === 'won' ? 'text-yellow-400' :
                slip.status === 'near_win' ? 'text-green-400' :
                slip.status === 'lost' ? 'text-red-400' : 'text-white/40'
              }>{slip.status}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full font-mono font-bold" style={{ background: 'rgba(37,46,109,0.6)', color: slip.status !== 'pending' ? '#D4AF37' : 'rgba(255,255,255,0.5)' }}>
              {slip.correct_count !== null && slip.status !== 'pending' ? `${slip.correct_count}/12 ✓` : `${selections.length}/12 picks`}
            </span>
            {(slip.reward_amount ?? 0) > 0 && <span className="text-xs font-mono font-bold" style={{ color: '#4ade80' }}>+{formatETB(slip.reward_amount)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExpanded(!expanded)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border border-[#252E6D]/60 text-white/50 hover:text-white hover:border-[#D4AF37]/30">
            {expanded ? 'Hide Picks' : 'View Picks'}
          </button>
          <button onClick={() => onPrint(slip.slip_id)}
            className="px-3 py-2 rounded-xl text-xs border transition-all hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/10"
            style={{ borderColor: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}>
            🖨️
          </button>
        </div>
        {expanded && (
          <div className="mt-3 space-y-1.5">
            {selections.map((sel: any) => {
              const match = sel.jackpot_matches
              const matchResult = match?.result
              const isSettled = matchResult && matchResult !== 'pending'
              const isCorrect = isSettled ? sel.selection === matchResult : sel.result === 'correct'
              const isWrong = isSettled ? sel.selection !== matchResult : sel.result === 'wrong'
              return (
                <div key={sel.id} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs" style={
                  isCorrect ? { background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' } :
                  isWrong ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' } :
                  { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(37,46,109,0.4)' }
                }>
                  <span className="text-white/50 truncate flex-1">
                    <span className="font-mono mr-1.5" style={{ color: 'rgba(212,175,55,0.5)' }}>G{sel.game_number}</span>
                    {match?.home_team} vs {match?.away_team}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-bold px-2 py-0.5 rounded-lg" style={
                      isCorrect ? { color: '#4ade80', background: 'rgba(74,222,128,0.15)' } :
                      isWrong ? { color: '#ef4444', background: 'rgba(239,68,68,0.15)' } :
                      { color: '#FFD700', background: 'rgba(212,175,55,0.15)' }
                    }>
                      {sel.selection === 'home' ? '1' : sel.selection === 'away' ? '2' : 'X'}
                    </span>
                    {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                    {isWrong && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
