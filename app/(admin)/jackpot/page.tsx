'use client'

import { useState, useEffect } from 'react'
import {
  getAllJackpots,
  createJackpot,
  publishJackpot,
  settleJackpot,
} from '@/lib/actions/adminMatches'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { ConfirmModal }
  from '@/components/shared/ConfirmModal'
import { formatDate, formatETB }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Plus, Trophy } from 'lucide-react'

export default function AdminJackpotPage() {
  const { user } = useAuthStore()
  const [jackpots, setJackpots] =
    useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] =
    useState(false)
  const [showSettle, setShowSettle] =
    useState(false)
  const [activeJackpot, setActiveJackpot] =
    useState<any>(null)
  const [settling, setSettling] =
    useState(false)
  const [publishing, setPublishing] =
    useState(false)
  const [showPublishConfirm, setShowPublishConfirm] =
    useState(false)

  // Create form
  const [jackpotName, setJackpotName] =
    useState('Weekend Jackpot')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [stake, setStake] = useState('50')
  const [winAll, setWinAll] =
    useState('250000')
  const [nearWin, setNearWin] =
    useState('25000')
  const [games, setGames] = useState(
    Array.from({ length: 12 }, (_, i) => ({
      gameNumber: i + 1,
      homeTeam: '',
      awayTeam: '',
      kickOffTime: '',
      homeOdd: '',
      drawOdd: '',
      awayOdd: '',
    }))
  )

  // Settle form
  const [results, setResults] = useState<
    Record<
      number,
      'home' | 'draw' | 'away'
    >
  >({})

  useEffect(() => {
    loadJackpots()
  }, [])

  const loadJackpots = async () => {
    setLoading(true)
    const data = await getAllJackpots()
    setJackpots(data)
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!user) return

    const matchesData = games.map((g) => ({
      gameNumber: g.gameNumber,
      homeTeam: g.homeTeam.trim(),
      awayTeam: g.awayTeam.trim(),
      kickOffTime: g.kickOffTime,
      homeOdd: parseFloat(g.homeOdd) || 2.0,
      drawOdd: parseFloat(g.drawOdd) || 3.0,
      awayOdd: parseFloat(g.awayOdd) || 3.5,
    }))

    const incomplete = matchesData.find(
      (g) => !g.homeTeam || !g.awayTeam
    )
    if (incomplete) {
      toast.error(
        'Fill in all 12 team names'
      )
      return
    }

    const result = await createJackpot({
      name: jackpotName,
      opensAt: opensAt || new Date().toISOString(),
      closesAt,
      fixedStake: parseFloat(stake) || 50,
      winAllReward: parseFloat(winAll) || 250000,
      nearWinReward: parseFloat(nearWin) || 25000,
      matches: matchesData,
      createdBy: user.id,
    })

    if (result.success) {
      toast.success('Jackpot created!')
      setShowCreate(false)
      loadJackpots()
    } else {
      toast.error(result.error)
    }
  }

  const handlePublish = async () => {
    if (!user || !activeJackpot) return
    setPublishing(true)

    const result = await publishJackpot(
      activeJackpot.id,
      user.id
    )

    if (result.success) {
      toast.success(
        'Jackpot published! Broadcast sent to all users.'
      )
      loadJackpots()
    } else {
      toast.error('Failed to publish')
    }
    setPublishing(false)
    setShowPublishConfirm(false)
  }

  const handleSettle = async () => {
    if (!user || !activeJackpot) return

    const resultArray = activeJackpot.jackpot_matches.map(
      (m: any) => ({
        gameNumber: m.game_number,
        result:
          results[m.game_number] ?? 'home',
      })
    )

    setSettling(true)
    const result = await settleJackpot(
      activeJackpot.id,
      resultArray,
      user.id
    )

    if (result.success) {
      toast.success(
        `Jackpot settled! Winners: ${result.winners}, Near wins: ${result.nearWins}`
      )
      setShowSettle(false)
      loadJackpots()
    } else {
      toast.error('Settlement failed')
    }
    setSettling(false)
  }

  const setGame = (
    index: number,
    field: string,
    value: string
  ) => {
    setGames((prev) =>
      prev.map((g, i) =>
        i === index ? { ...g, [field]: value } : g
      )
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">
          Jackpot Management
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Jackpot
        </button>
      </div>

      {/* Current jackpots */}
      {loading ? (
        <p className="text-white/50">
          Loading...
        </p>
      ) : jackpots.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gold/30 mx-auto mb-3" />
          <p className="text-white/40">
            No jackpots yet
          </p>
        </div>
      ) : (
        jackpots.map((jp) => (
          <div
            key={jp.id}
            className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg">
                  {jp.name}
                </h2>
                <p className="text-white/50 text-sm">
                  Closes: {formatDate(jp.closes_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={jp.status}
                  type="jackpot"
                />
                {jp.status === 'draft' && (
                  <button
                    onClick={() => {
                      setActiveJackpot(jp)
                      setShowPublishConfirm(true)
                    }}
                    className="bg-nile-success text-white text-xs px-3 py-1.5 rounded-lg hover:bg-nile-success/80"
                  >
                    Publish
                  </button>
                )}
                {jp.status === 'closed' && (
                  <button
                    onClick={() => {
                      setActiveJackpot(jp)
                      setShowSettle(true)
                      const initial: Record<
                        number,
                        'home' | 'draw' | 'away'
                      > = {}
                      jp.jackpot_matches?.forEach(
                        (m: any) => {
                          initial[
                            m.game_number
                          ] = 'home'
                        }
                      )
                      setResults(initial)
                    }}
                    className="bg-gold text-charcoal text-xs px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Enter Results
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-gold font-mono text-lg font-bold">
                  {formatETB(jp.win_all_reward)}
                </p>
                <p className="text-white/50 text-xs">
                  All 12 correct
                </p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-gold font-mono text-lg font-bold">
                  {formatETB(jp.near_win_reward)}
                </p>
                <p className="text-white/50 text-xs">
                  Miss 1
                </p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-white font-mono text-lg font-bold">
                  ETB {jp.fixed_stake}
                </p>
                <p className="text-white/50 text-xs">
                  Entry fee
                </p>
              </div>
            </div>

            {/* Games list (collapsed) */}
            <p className="text-white/40 text-xs">
              {jp.jackpot_matches?.length ?? 0} games configured
            </p>
          </div>
        ))
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-dark border border-nile-blue/40 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-white font-semibold text-xl mb-6">
              Create Weekend Jackpot
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="col-span-2">
                <label className="text-xs text-white/60 block mb-1">
                  Jackpot Name
                </label>
                <input
                  value={jackpotName}
                  onChange={(e) =>
                    setJackpotName(e.target.value)
                  }
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Closes At
                </label>
                <input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) =>
                    setClosesAt(e.target.value)
                  }
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Fixed Stake (ETB)
                </label>
                <input
                  type="number"
                  value={stake}
                  onChange={(e) =>
                    setStake(e.target.value)
                  }
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Win All 12 Reward (ETB)
                </label>
                <input
                  type="number"
                  value={winAll}
                  onChange={(e) =>
                    setWinAll(e.target.value)
                  }
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Miss 1 Reward (ETB)
                </label>
                <input
                  type="number"
                  value={nearWin}
                  onChange={(e) =>
                    setNearWin(e.target.value)
                  }
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
                />
              </div>
            </div>

            <h3 className="text-white font-medium mb-4">
              12 Games
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
              {games.map((game, i) => (
                <div
                  key={i}
                  className="bg-charcoal/50 rounded-lg p-3"
                >
                  <p className="text-gold text-[10px] tracking-widest uppercase mb-2">
                    Game {game.gameNumber}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      value={game.homeTeam}
                      onChange={(e) =>
                        setGame(
                          i,
                          'homeTeam',
                          e.target.value
                        )
                      }
                      placeholder="Home Team"
                      className="bg-charcoal border border-nile-blue/30 rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                    />
                    <input
                      value={game.awayTeam}
                      onChange={(e) =>
                        setGame(
                          i,
                          'awayTeam',
                          e.target.value
                        )
                      }
                      placeholder="Away Team"
                      className="bg-charcoal border border-nile-blue/30 rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="datetime-local"
                      value={game.kickOffTime}
                      onChange={(e) =>
                        setGame(
                          i,
                          'kickOffTime',
                          e.target.value
                        )
                      }
                      className="col-span-1 bg-charcoal border border-nile-blue/30 rounded px-2 py-1 text-white text-xs focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={game.homeOdd}
                      onChange={(e) =>
                        setGame(
                          i,
                          'homeOdd',
                          e.target.value
                        )
                      }
                      placeholder="1 Home"
                      className="bg-charcoal border border-nile-blue/30 rounded px-2 py-1 text-gold font-mono text-xs text-center focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={game.drawOdd}
                      onChange={(e) =>
                        setGame(
                          i,
                          'drawOdd',
                          e.target.value
                        )
                      }
                      placeholder="X Draw"
                      className="bg-charcoal border border-nile-blue/30 rounded px-2 py-1 text-gold font-mono text-xs text-center focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={game.awayOdd}
                      onChange={(e) =>
                        setGame(
                          i,
                          'awayOdd',
                          e.target.value
                        )
                      }
                      placeholder="2 Away"
                      className="bg-charcoal border border-nile-blue/30 rounded px-2 py-1 text-gold font-mono text-xs text-center focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() =>
                  setShowCreate(false)
                }
                className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light"
              >
                Create Jackpot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {showSettle && activeJackpot && (
        <div className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-dark border border-nile-blue/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-white font-semibold text-xl mb-6">
              Enter Jackpot Results
            </h2>
            <div className="space-y-3 mb-6">
              {activeJackpot.jackpot_matches
                ?.sort(
                  (a: any, b: any) =>
                    a.game_number -
                    b.game_number
                )
                .map((m: any) => (
                  <div
                    key={m.id}
                    className="bg-charcoal/50 rounded-lg p-3"
                  >
                    <p className="text-white/50 text-xs mb-2">
                      Game {m.game_number}:{' '}
                      {m.home_team} vs {m.away_team}
                    </p>
                    <div className="flex gap-2">
                      {(
                        [
                          { key: 'home', label: '1 Home' },
                          { key: 'draw', label: 'X Draw' },
                          { key: 'away', label: '2 Away' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() =>
                            setResults((prev) => ({
                              ...prev,
                              [m.game_number]: opt.key,
                            }))
                          }
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-xs border',
                            results[m.game_number] ===
                              opt.key
                              ? 'bg-gold border-gold text-charcoal font-semibold'
                              : 'border-nile-blue/30 text-white/50 hover:text-white'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-3 mb-4">
              <p className="text-nile-danger text-xs">
                ⚠️ This will settle all jackpot entries and credit winners. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setShowSettle(false)
                }
                className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSettle}
                disabled={settling}
                className="flex-1 bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold"
              >
                {settling
                  ? 'Settling...'
                  : 'Confirm & Settle'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() =>
          setShowPublishConfirm(false)
        }
        onConfirm={handlePublish}
        title="Publish Jackpot?"
        message="This will make the jackpot visible to all users and send a broadcast notification."
        confirmText="Yes, Publish"
        variant="warning"
        isLoading={publishing}
      />
    </div>
  )
}