'use client'

import { useState } from 'react'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  placeJackpotBet,
  getMyJackpotSlips,
} from '@/lib/actions/jackpot'
import {
  formatETB,
  formatDate,
  formatCountdown,
} from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  Star,
} from 'lucide-react'
import { JackpotPrintReceiptModal }
  from './JackpotPrintReceiptModal'

interface Props {
  jackpot: any
  leaderboard: any[]
  pastJackpots: any[]
}

type Selection =
  'home' | 'draw' | 'away'

export function JackpotClient({
  jackpot,
  leaderboard,
  pastJackpots,
}: Props) {
  const { user, isAuthenticated } =
    useAuthStore()
  const [activeTab, setActiveTab] =
    useState<
      'pick' | 'myslips' | 'leaderboard' | 'history'
    >('pick')
  const [selections, setSelections] =
    useState<Record<number, Selection>>({})
  const [isAnonymous, setIsAnonymous] =
    useState(false)
  const [placing, setPlacing] =
    useState(false)
  const [mySlips, setMySlips] =
    useState<any[]>([])
  const [loadingSlips, setLoadingSlips] =
    useState(false)

  // Receipt
  const [showReceipt, setShowReceipt] =
    useState(false)
  const [receiptSlipId, setReceiptSlipId] =
    useState('')

  const matches =
    jackpot?.jackpot_matches?.sort(
      (a: any, b: any) =>
        a.game_number - b.game_number
    ) ?? []

  const selectedCount =
    Object.keys(selections).length
  const allSelected = selectedCount === 12

  const handleSelect = (
    gameNumber: number,
    sel: Selection
  ) => {
    setSelections((prev) => ({
      ...prev,
      [gameNumber]: sel,
    }))
  }

  const handleLoadMySlips = async () => {
    if (!user) return
    setLoadingSlips(true)
    const data = await getMyJackpotSlips(
      user.id
    )
    setMySlips(data)
    setLoadingSlips(false)
  }

  const handleTabChange = (
    tab: 'pick' | 'myslips' | 'leaderboard' | 'history'
  ) => {
    setActiveTab(tab)
    if (tab === 'myslips' && user) {
      handleLoadMySlips()
    }
  }

  const handlePlace = async () => {
    if (
      !user ||
      !isAuthenticated ||
      !jackpot ||
      !allSelected
    )
      return

    setPlacing(true)

    const sels = matches.map((m: any) => ({
      gameNumber: m.game_number,
      selection: selections[m.game_number]!,
      odd:
        selections[m.game_number] === 'home'
          ? m.home_odd
          : selections[m.game_number] ===
            'draw'
          ? m.draw_odd
          : m.away_odd,
    }))

    const result = await placeJackpotBet({
      jackpotId: jackpot.id,
      bettorId: user.id,
      placedById: user.id,
      isAnonymous,
      selections: sels,
    })

    if (result.success && result.slipId) {
      toast.success(
        `🏆 Jackpot entered! Slip #${result.slipId}`
      )
      setReceiptSlipId(result.slipId)
      setShowReceipt(true)
      setSelections({})
    } else {
      toast.error(
        result.error ?? 'Failed to place bet'
      )
    }

    setPlacing(false)
  }

  const tabs = [
    { key: 'pick', label: '🎯 Pick Games' },
    ...(isAuthenticated
      ? [
          {
            key: 'myslips',
            label: '🎫 My Slips',
          },
        ]
      : []),
    {
      key: 'leaderboard',
      label: '🏆 Leaderboard',
    },
    { key: 'history', label: '📋 History' },
  ]

  if (!jackpot) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-8 text-center">
          <Trophy className="w-16 h-16 text-gold/30 mx-auto mb-4" />
          <h2 className="text-white font-semibold text-xl mb-2">
            No Active Jackpot
          </h2>
          <p className="text-white/50">
            The next jackpot will be
            announced soon. Stay tuned!
          </p>
        </div>

        {/* Past jackpots */}
        {pastJackpots.filter(
          (j) => j.status === 'settled'
        ).length > 0 && (
          <div>
            <h2 className="text-white font-semibold mb-4">
              Past Jackpots
            </h2>
            <div className="space-y-3">
              {pastJackpots
                .filter(
                  (j) =>
                    j.status === 'settled'
                )
                .map((jp) => (
                  <div
                    key={jp.id}
                    className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {jp.name}
                      </p>
                      <p className="text-white/40 text-xs">
                        {formatDate(
                          jp.created_at
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gold font-mono font-bold">
                        {formatETB(
                          jp.win_all_reward
                        )}
                      </p>
                      <p className="text-nile-success text-xs">
                        Settled
                      </p>
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
  const isClosed =
    jackpot.status === 'closed'
  const isSettled =
    jackpot.status === 'settled'

  return (
    <div className="space-y-6">
      {/* Jackpot info bar */}
      <div className="bg-slate-dark border border-gold/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold">
            {jackpot.name}
          </h2>
          <p className="text-white/50 text-xs">
            {isOpen && (
              <span className="text-nile-success">
                🟢 Open
              </span>
            )}
            {isClosed && (
              <span className="text-nile-orange">
                🟡 Closed
              </span>
            )}
            {isSettled && (
              <span className="text-nile-danger">
                🔴 Settled
              </span>
            )}{' '}
            • Closes:{' '}
            {formatDate(jackpot.closes_at)}
          </p>
        </div>
        {isOpen && (
          <div className="flex items-center gap-2 bg-nile-danger/10 border border-nile-danger/30 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4 text-nile-danger" />
            <span className="text-nile-danger text-sm font-mono">
              {formatCountdown(
                jackpot.closes_at
              )}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-nile-blue/30 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() =>
              handleTabChange(t.key as any)
            }
            className={cn(
              'px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors flex-shrink-0',
              activeTab === t.key
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-white/50 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PICK GAMES TAB ── */}
      {activeTab === 'pick' && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-sm">
              {selectedCount}/12 games
              selected
            </p>
            {selectedCount > 0 && (
              <button
                onClick={() =>
                  setSelections({})
                }
                className="text-xs text-white/40 hover:text-nile-danger"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-nile-blue/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{
                width: `${(selectedCount / 12) * 100}%`,
              }}
            />
          </div>

          {!isOpen && (
            <div
              className={cn(
                'rounded-xl p-4 text-center border',
                isClosed
                  ? 'bg-nile-orange/10 border-nile-orange/30'
                  : 'bg-slate-dark border-nile-blue/30'
              )}
            >
              <p
                className={cn(
                  'font-semibold',
                  isClosed
                    ? 'text-nile-orange'
                    : 'text-white/60'
                )}
              >
                {isClosed
                  ? '⏱️ Betting has closed — results coming soon'
                  : '🏁 This jackpot has been settled'}
              </p>
            </div>
          )}

          {/* Games */}
          <div className="space-y-3">
            {matches.map((match: any) => {
              const sel =
                selections[match.game_number]
              const result = match.result
              const isResulted = !!result

              return (
                <div
                  key={match.id}
                  className={cn(
                    'bg-slate-dark border rounded-xl p-4',
                    isResulted &&
                      result === sel
                      ? 'border-nile-success/40 bg-nile-success/5'
                      : isResulted &&
                        result !== sel &&
                        sel
                      ? 'border-nile-danger/30'
                      : sel
                      ? 'border-gold/30'
                      : 'border-nile-blue/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gold text-xs font-semibold">
                      Game {match.game_number}
                    </span>
                    {isResulted && (
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full border font-semibold',
                          result === 'home'
                            ? 'text-gold border-gold/40 bg-gold/10'
                            : result === 'away'
                            ? 'text-nile-blue-light border-nile-blue-light/40'
                            : 'text-white/60 border-white/20'
                        )}
                      >
                        {result === 'home'
                          ? '1'
                          : result === 'away'
                          ? '2'
                          : 'X'}{' '}
                        Result
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium text-sm">
                      {match.home_team}
                    </span>
                    <span className="text-white/40 text-xs px-2">
                      VS
                    </span>
                    <span className="text-white font-medium text-sm">
                      {match.away_team}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          key: 'home' as const,
                          label: '1',
                          sublabel: 'Home',
                          odd: match.home_odd,
                        },
                        {
                          key: 'draw' as const,
                          label: 'X',
                          sublabel: 'Draw',
                          odd: match.draw_odd,
                        },
                        {
                          key: 'away' as const,
                          label: '2',
                          sublabel: 'Away',
                          odd: match.away_odd,
                        },
                      ] as const
                    ).map((opt) => {
                      const isSelected =
                        sel === opt.key
                      const isCorrect =
                        isResulted &&
                        result === opt.key
                      const isWrong =
                        isResulted &&
                        isSelected &&
                        result !== opt.key

                      return (
                        <button
                          key={opt.key}
                          onClick={() => {
                            if (isOpen) {
                              handleSelect(
                                match.game_number,
                                opt.key
                              )
                            }
                          }}
                          disabled={
                            !isOpen
                          }
                          className={cn(
                            'flex flex-col items-center py-3 px-2 rounded-xl border transition-all',
                            isCorrect
                              ? 'bg-nile-success/20 border-nile-success text-nile-success'
                              : isWrong
                              ? 'bg-nile-danger/20 border-nile-danger text-nile-danger'
                              : isSelected
                              ? 'bg-gold/20 border-gold text-gold'
                              : 'border-nile-blue/30 text-white/60 hover:border-gold/40 hover:text-white',
                            !isOpen &&
                              'cursor-default'
                          )}
                        >
                          <span className="text-lg font-bold leading-none">
                            {opt.label}
                          </span>
                          <span className="text-xs mt-0.5 opacity-60">
                            {opt.sublabel}
                          </span>
                          {opt.odd && (
                            <span className="text-xs font-mono mt-1 opacity-80">
                              {opt.odd.toFixed(
                                2
                              )}
                            </span>
                          )}
                          {isCorrect && (
                            <CheckCircle className="w-3 h-3 mt-1" />
                          )}
                          {isWrong && (
                            <XCircle className="w-3 h-3 mt-1" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Place bet section */}
          {isOpen && (
            <div className="sticky bottom-4 bg-slate-dark border border-gold/30 rounded-2xl p-4 shadow-2xl">
              {!isAuthenticated ? (
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-3">
                    Login to enter the jackpot
                  </p>
                  <a
                    href="/login"
                    className="bg-gold text-charcoal px-6 py-2.5 rounded-xl text-sm font-bold inline-block hover:bg-gold-light"
                  >
                    Login to Play
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">
                      Entry fee:
                    </span>
                    <span className="text-gold font-mono font-bold">
                      {formatETB(
                        jackpot.fixed_stake
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">
                      Your balance:
                    </span>
                    <span
                      className={cn(
                        'font-mono',
                        (user?.credit_balance ??
                          0) <
                          jackpot.fixed_stake
                          ? 'text-nile-danger'
                          : 'text-white'
                      )}
                    >
                      {formatETB(
                        user?.credit_balance ??
                          0
                      )}
                    </span>
                  </div>

                  {/* Anonymous toggle */}
                  <button
                    onClick={() =>
                      setIsAnonymous(!isAnonymous)
                    }
                    className={cn(
                      'flex items-center gap-2 text-xs px-3 py-2 rounded-lg border w-full',
                      isAnonymous
                        ? 'border-nile-orange/40 text-nile-orange bg-nile-orange/10'
                        : 'border-nile-blue/30 text-white/50'
                    )}
                  >
                    <span>
                      {isAnonymous
                        ? '🔒'
                        : '🔓'}
                    </span>
                    {isAnonymous
                      ? 'Anonymous entry'
                      : 'Enter with username'}
                  </button>

                  <button
                    onClick={handlePlace}
                    disabled={
                      !allSelected || placing
                    }
                    className={cn(
                      'w-full py-3 rounded-xl text-sm font-bold transition-colors',
                      allSelected && !placing
                        ? 'bg-gold text-charcoal hover:bg-gold-light'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    )}
                  >
                    {placing
                      ? 'Placing...'
                      : !allSelected
                      ? `Select ${12 - selectedCount} more game${12 - selectedCount !== 1 ? 's' : ''}`
                      : `🏆 Enter Jackpot — ${formatETB(jackpot.fixed_stake)}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MY SLIPS TAB ── */}
      {activeTab === 'myslips' && (
        <div className="space-y-4">
          {loadingSlips ? (
            <p className="text-white/50 text-center py-8">
              Loading your slips...
            </p>
          ) : mySlips.length === 0 ? (
            <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-8 text-center">
              <Trophy className="w-12 h-12 text-gold/30 mx-auto mb-3" />
              <p className="text-white/50">
                No jackpot entries yet
              </p>
              <button
                onClick={() =>
                  handleTabChange('pick')
                }
                className="mt-3 bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Enter Now
              </button>
            </div>
          ) : (
            mySlips.map((slip) => (
              <JackpotSlipCard
                key={slip.id}
                slip={slip}
                onPrint={(slipId) => {
                  setReceiptSlipId(slipId)
                  setShowReceipt(true)
                }}
              />
            ))
          )}
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {leaderboard.length === 0 ? (
            <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-8 text-center">
              <Star className="w-12 h-12 text-gold/30 mx-auto mb-3" />
              <p className="text-white/50">
                No results yet
              </p>
            </div>
          ) : (
            <div className="bg-slate-dark border border-nile-blue/30 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-nile-blue/20">
                <h3 className="text-white font-semibold">
                  Top Entries
                </h3>
              </div>
              {leaderboard.map(
                (entry, i) => {
                  const rank = i + 1
                  const medal =
                    rank === 1
                      ? '🥇'
                      : rank === 2
                      ? '🥈'
                      : rank === 3
                      ? '🥉'
                      : `#${rank}`

                  return (
                    <div
                      key={entry.slip_id}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 border-b border-nile-blue/10',
                        entry.status ===
                          'won'
                          ? 'bg-gold/5'
                          : entry.status ===
                            'near_win'
                          ? 'bg-nile-success/5'
                          : ''
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg w-8 text-center">
                          {medal}
                        </span>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {entry.is_anonymous
                              ? 'Anonymous'
                              : `@${entry.bettor?.username ?? '—'}`}
                          </p>
                          <p className="text-white/40 text-xs font-mono">
                            #{entry.slip_id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gold font-bold">
                          {entry.correct_count ?? 0}
                          /12
                        </p>
                        {entry.reward_amount >
                          0 && (
                          <p className="text-nile-success text-xs font-mono">
                            +{formatETB(
                              entry.reward_amount
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {pastJackpots.length === 0 ? (
            <p className="text-white/50 text-center py-8">
              No past jackpots
            </p>
          ) : (
            pastJackpots.map((jp) => (
              <div
                key={jp.id}
                className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-semibold">
                      {jp.name}
                    </p>
                    <p className="text-white/40 text-xs">
                      {formatDate(
                        jp.created_at
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full border',
                      jp.status === 'settled'
                        ? 'text-nile-success border-nile-success/30'
                        : jp.status === 'open'
                        ? 'text-gold border-gold/30'
                        : 'text-white/50 border-white/20'
                    )}
                  >
                    {jp.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-white/40 text-xs">
                      Win All
                    </p>
                    <p className="text-gold font-mono">
                      {formatETB(
                        jp.win_all_reward
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">
                      Miss 1
                    </p>
                    <p className="text-white/70 font-mono">
                      {formatETB(
                        jp.near_win_reward
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs">
                      Entry
                    </p>
                    <p className="text-white/70 font-mono">
                      {formatETB(
                        jp.fixed_stake
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Jackpot Receipt Modal */}
      {receiptSlipId && (
        <JackpotPrintReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false)
            setReceiptSlipId('')
          }}
          slipId={receiptSlipId}
          jackpot={jackpot}
        />
      )}
    </div>
  )
}

// ─── Jackpot Slip Card ────────────────

function JackpotSlipCard({
  slip,
  onPrint,
}: {
  slip: any
  onPrint: (slipId: string) => void
}) {
  const [expanded, setExpanded] =
    useState(false)

  const statusColor =
    slip.status === 'won'
      ? 'border-gold/40 bg-gold/5'
      : slip.status === 'near_win'
      ? 'border-nile-success/30 bg-nile-success/5'
      : slip.status === 'lost'
      ? 'border-nile-danger/20'
      : 'border-nile-blue/30'

  const selections =
    slip.jackpot_slip_selections?.sort(
      (a: any, b: any) =>
        a.game_number - b.game_number
    ) ?? []

  return (
    <div
      className={cn(
        'bg-slate-dark border rounded-xl overflow-hidden',
        statusColor
      )}
    >
      {/* Won banner */}
      {slip.status === 'won' && (
        <div className="bg-gold/20 border-b border-gold/30 px-4 py-2 text-center">
          <p className="text-gold font-bold">
            🏆 JACKPOT WINNER!
          </p>
        </div>
      )}
      {slip.status === 'near_win' && (
        <div className="bg-nile-success/10 border-b border-nile-success/20 px-4 py-2 text-center">
          <p className="text-nile-success font-semibold">
            🥈 11/12 Correct!
          </p>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-gold font-mono font-bold">
              #{slip.slip_id}
            </p>
            <p className="text-white/40 text-xs">
              {slip.jackpots?.name} •{' '}
              {formatDate(slip.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {slip.correct_count !== null && (
              <span className="text-white/70 text-sm bg-nile-blue/20 px-3 py-1 rounded-full">
                {slip.correct_count}/12
              </span>
            )}
            {slip.reward_amount > 0 && (
              <span className="text-nile-success font-mono text-sm">
                +{formatETB(
                  slip.reward_amount
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              setExpanded(!expanded)
            }
            className="flex-1 border border-nile-blue/30 text-white/60 py-1.5 rounded-lg text-xs hover:text-white"
          >
            {expanded
              ? 'Hide Picks'
              : 'View Picks'}
          </button>
          <button
            onClick={() =>
              onPrint(slip.slip_id)
            }
            className="border border-gold/30 text-gold px-3 py-1.5 rounded-lg text-xs hover:bg-gold/10"
          >
            🖨️
          </button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-1.5">
            {selections.map((sel: any) => {
              const match = sel.jackpot_matches
              const isCorrect =
                sel.result === 'correct'
              const isWrong =
                sel.result === 'wrong'

              return (
                <div
                  key={sel.id}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs',
                    isCorrect
                      ? 'bg-nile-success/10'
                      : isWrong
                      ? 'bg-nile-danger/10'
                      : 'bg-charcoal/40'
                  )}
                >
                  <span className="text-white/60 truncate flex-1">
                    {match?.home_team} vs{' '}
                    {match?.away_team}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={cn(
                        'font-semibold',
                        isCorrect
                          ? 'text-nile-success'
                          : isWrong
                          ? 'text-nile-danger'
                          : 'text-gold'
                      )}
                    >
                      {sel.selection ===
                      'home'
                        ? '1'
                        : sel.selection ===
                          'away'
                        ? '2'
                        : 'X'}
                    </span>
                    {isCorrect && (
                      <CheckCircle className="w-3.5 h-3.5 text-nile-success" />
                    )}
                    {isWrong && (
                      <XCircle className="w-3.5 h-3.5 text-nile-danger" />
                    )}
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