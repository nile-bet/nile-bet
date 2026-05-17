'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient }
  from '@/lib/supabase/client'
import {
  updateMatch,
  applyGlobalMargin,
  addPlayerToScorers,
  removePlayerFromScorers,
} from '@/lib/actions/adminMatches'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { ConfirmModal }
  from '@/components/shared/ConfirmModal'
import { formatKickOff }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

const CATEGORIES = [
  'MAIN', 'GOALS', 'HANDICAP', 'HALVES',
  'CORNERS', 'CARDS', 'TEAM GOALS',
  'CLEAN SHEET', 'GOALS ODD/EVEN',
  'SCORERS', 'SCORE', 'COMBO',
  'MIN 1X2', 'MIN GOALS', 'SPECIALS',
]

export default function OddsPage({
  params,
}: Props) {
  const { user } = useAuthStore()
  const router = useRouter()
  const [matchId, setMatchId] = useState('')
  const [match, setMatch] = useState<any>(null)
  const [activeCategory, setActiveCategory] =
    useState('MAIN')
  const [margin, setMargin] = useState('')
  const [showMarginConfirm, setShowMarginConfirm] =
    useState(false)
  const [saving, setSaving] = useState(false)
  const [players, setPlayers] = useState<any[]>([])
  const [newPlayer, setNewPlayer] = useState({ name: '', team: 'home' as 'home' | 'away', odd: '2.00' })
  const [addingPlayer, setAddingPlayer] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setMatchId(id)
      loadMatch(id)
    })
  }, [params])

  const loadMatch = async (id: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('matches')
      .select(
        `
        *,
        leagues(name, countries(flag_emoji, name)),
        match_markets(
          id,
          is_enabled,
          status,
          market_templates(
            id,
            name,
            selections,
            market_categories(name)
          ),
          match_market_odds(*)
        )
      `
      )
      .eq('id', id)
      .single()

    if (data) {
      setMatch(data)
      // Load players for scorers markets
      const supabase2 = createClient()
      const { data: pl } = await supabase2
        .from('match_players')
        .select('*')
        .eq('match_id', id)
        .order('team', { ascending: true })
      if (pl) setPlayers(pl)
    }
  }

  const handleAddPlayer = async () => {
    if (!newPlayer.name.trim() || !matchId || !user) return
    setAddingPlayer(true)
    const result = await addPlayerToScorers(
      matchId,
      newPlayer.name.trim(),
      newPlayer.team,
      parseFloat(newPlayer.odd) || 2.00,
      user.id
    )
    if (result.success) {
      setNewPlayer({ name: '', team: 'home', odd: '2.00' })
      toast.success('Player added!')
      loadMatch(matchId)
      // Reload players
      const supabase = createClient()
      const { data: pl } = await supabase.from('match_players').select('*').eq('match_id', matchId).order('team')
      if (pl) setPlayers(pl)
    } else {
      toast.error(result.error ?? 'Failed to add player')
    }
    setAddingPlayer(false)
  }

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    await removePlayerFromScorers(matchId, playerId, playerName)
    setPlayers(players.filter((p: any) => p.id !== playerId))
    loadMatch(matchId)
    toast.success('Player removed')
  }

  const getCategoryMarkets = (cat: string) =>
    (match?.match_markets ?? []).filter(
      (mm: any) =>
        mm.market_templates?.market_categories
          ?.name === cat && mm.is_enabled
    )

  const handleOddUpdate = async (
    matchMarketId: string,
    selection: string,
    newOdd: string
  ) => {
    if (!user || !matchId) return
    const val = parseFloat(newOdd)
    if (isNaN(val) || val <= 1.0) return

    setSaving(true)
    const result = await updateMatch(matchId, {
      updatedBy: user.id,
      oddsUpdates: [
        {
          matchMarketId,
          selection,
          newOdd: val,
        },
      ],
    })

    if (result.success) {
      toast.success('Odd updated')
      loadMatch(matchId)
    } else {
      toast.error('Failed to update odd')
    }
    setSaving(false)
  }

  const handleApplyMargin = async () => {
    if (!user || !matchId) return
    const pct = parseFloat(margin)
    if (isNaN(pct)) return

    setSaving(true)
    const result = await applyGlobalMargin(
      matchId,
      pct,
      user.id
    )

    if (result.success) {
      toast.success(`Margin of ${pct}% applied`)
      setMargin('')
      loadMatch(matchId)
    } else {
      toast.error(result.error ?? 'Failed')
    }
    setShowMarginConfirm(false)
    setSaving(false)
  }

  if (!match) {
    return (
      <div className="p-6 text-white/50">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/matches')}
          className="text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-white">
            {match.home_team} vs{' '}
            {match.away_team}
          </h1>
          <p className="text-white/50 text-sm">
            {match.leagues?.countries?.flag_emoji}{' '}
            {match.leagues?.name} •{' '}
            {formatKickOff(match.kick_off_time)}
          </p>
        </div>
        <StatusBadge
          status={match.status}
          type="match"
        />
      </div>

      {/* Warning */}
      {match.status === 'upcoming' && (
        <div className="bg-nile-orange/10 border border-nile-orange/30 rounded-lg p-3 mb-4 text-xs text-nile-orange">
          ⚠️ Existing bets keep original odds. Changes only affect new bets.
        </div>
      )}

      {/* Global margin */}
      <div className="bg-nile-blue/20 border border-gold/20 rounded-xl p-4 mb-6">
        <p className="text-white font-medium text-sm mb-3">
          Apply Global Margin
        </p>
        <div className="flex gap-3 items-center">
          <div className="flex gap-2 items-center">
            <span className="text-white/50 text-sm">
              Adjust all odds by:
            </span>
            <input
              type="number"
              step="0.5"
              value={margin}
              onChange={(e) =>
                setMargin(e.target.value)
              }
              placeholder="+5 or -5"
              className="w-24 bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white font-mono text-sm text-center focus:outline-none"
            />
            <span className="text-white/50 text-sm">
              %
            </span>
          </div>
          <button
            onClick={() =>
              setShowMarginConfirm(true)
            }
            disabled={!margin}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold',
              margin
                ? 'bg-gold text-charcoal hover:bg-gold-light'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            Apply to All Markets
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto scrollbar-hide mb-6">
        <div className="flex gap-0 border-b border-gold/10">
          {CATEGORIES.map((cat) => {
            const hasMarkets =
              getCategoryMarkets(cat).length > 0
            return (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(cat)
                }
                className={cn(
                  'text-[11px] px-3 py-2.5 whitespace-nowrap border-b-2 transition-colors',
                  activeCategory === cat
                    ? 'text-gold border-gold font-semibold'
                    : hasMarkets
                    ? 'text-white/50 border-transparent hover:text-white'
                    : 'text-white/20 border-transparent'
                )}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Odds table */}
      <div className="space-y-4">
        {/* SCORERS special UI */}
        {activeCategory === 'SCORERS' && (
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4 mb-4">
            <p className="text-white font-medium text-sm mb-3">Add Player</p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                placeholder="Player name"
                className="flex-1 min-w-[160px] bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
              <select
                value={newPlayer.team}
                onChange={(e) => setNewPlayer({ ...newPlayer, team: e.target.value as 'home' | 'away' })}
                className="bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              >
                <option value="home">{match.home_team}</option>
                <option value="away">{match.away_team}</option>
              </select>
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={newPlayer.odd}
                onChange={(e) => setNewPlayer({ ...newPlayer, odd: e.target.value })}
                placeholder="Odd"
                className="w-24 bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none text-center"
              />
              <button
                onClick={handleAddPlayer}
                disabled={addingPlayer || !newPlayer.name.trim()}
                className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
              >
                {addingPlayer ? 'Adding...' : '+ Add Player'}
              </button>
            </div>
            {/* Player list */}
            {players.length > 0 && (
              <div className="mt-4">
                <p className="text-white/50 text-xs mb-2 uppercase tracking-widest">Players ({players.length})</p>
                <div className="grid grid-cols-2 gap-2">
                  {players.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-charcoal/60 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-white text-sm">{p.player_name}</span>
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${p.team === 'home' ? 'bg-nile-blue/30 text-nile-blue-light' : 'bg-nile-orange/20 text-nile-orange'}`}>
                          {p.team === 'home' ? match.home_team : match.away_team}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemovePlayer(p.id, p.player_name)}
                        className="text-nile-danger/60 hover:text-nile-danger text-xs ml-2"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {getCategoryMarkets(activeCategory)
          .length === 0 ? (
          <p className="text-white/30 text-sm">
            {activeCategory === 'SCORERS' ? 'Add players above to enable scorer markets' : 'No markets in this category'}
          </p>
        ) : (
          getCategoryMarkets(activeCategory).map(
            (mm: any) => {
              const template =
                mm.market_templates
              const odds =
                mm.match_market_odds ?? []

              return (
                <div
                  key={mm.id}
                  className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4"
                >
                  <p className="text-white/70 text-sm font-medium mb-3">
                    {template?.name}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-nile-blue/20">
                          <th className="text-left text-xs text-white/40 pb-2">
                            Selection
                          </th>
                          <th className="text-right text-xs text-white/40 pb-2">
                            Current Odd
                          </th>
                          <th className="text-right text-xs text-white/40 pb-2">
                            Original Odd
                          </th>
                          <th className="text-right text-xs text-white/40 pb-2">
                            Update
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {odds.map((odd: any) => (
                          <tr
                            key={odd.id}
                            className="border-b border-nile-blue/10"
                          >
                            <td className="py-2 text-white/70">
                              {odd.selection}
                            </td>
                            <td className="py-2 text-right text-gold font-mono">
                              {odd.odd_value?.toFixed(
                                2
                              )}
                            </td>
                            <td className="py-2 text-right text-white/30 font-mono text-xs">
                              {odd.original_odd?.toFixed(
                                2
                              )}
                            </td>
                            <td className="py-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="1.01"
                                defaultValue={odd.odd_value?.toFixed(
                                  2
                                )}
                                onBlur={(e) => {
                                  const val =
                                    e.target.value
                                  if (
                                    val &&
                                    parseFloat(
                                      val
                                    ) !==
                                      odd.odd_value
                                  ) {
                                    handleOddUpdate(
                                      mm.id,
                                      odd.selection,
                                      val
                                    )
                                  }
                                }}
                                className="w-20 bg-charcoal border border-nile-blue/40 rounded px-2 py-1 text-center text-gold font-mono text-sm focus:outline-none focus:border-gold"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          )
        )}
      </div>

      <ConfirmModal
        isOpen={showMarginConfirm}
        onClose={() =>
          setShowMarginConfirm(false)
        }
        onConfirm={handleApplyMargin}
        title="Apply Global Margin?"
        message={`Adjust all enabled odds by ${margin}%. This will update current odds for new bets only.`}
        confirmText="Yes, Apply"
        variant="warning"
        isLoading={saving}
      />
    </div>
  )
}