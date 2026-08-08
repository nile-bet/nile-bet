'use client'
import { useState, useEffect, useMemo } from 'react'
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
import { ArrowLeft, Search, Save, X, TrendingUp, TrendingDown, RotateCcw, TriangleAlert } from 'lucide-react'

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

// key helper for pending-change map: one entry per (market, selection)
const pendingKey = (matchMarketId: string, selection: string) =>
  `${matchMarketId}::${selection}`

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

  // NEW: search + batch-edit state
  const [marketSearch, setMarketSearch] = useState('')
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({})

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

  // Markets for the active category, filtered by search text
  const visibleMarkets = useMemo(() => {
    const list = getCategoryMarkets(activeCategory)
    if (!marketSearch.trim()) return list
    const q = marketSearch.trim().toLowerCase()
    return list.filter((mm: any) =>
      mm.market_templates?.name?.toLowerCase().includes(q)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, activeCategory, marketSearch])

  const pendingCount = Object.keys(pendingChanges).length

  // Stage a single odd change locally (no network call yet)
  const stageOddChange = (
    matchMarketId: string,
    selection: string,
    newOdd: number
  ) => {
    setPendingChanges((prev) => ({
      ...prev,
      [pendingKey(matchMarketId, selection)]: newOdd,
    }))
  }

  // Remove a single staged change (revert that one field)
  const discardOne = (matchMarketId: string, selection: string) => {
    setPendingChanges((prev) => {
      const next = { ...prev }
      delete next[pendingKey(matchMarketId, selection)]
      return next
    })
  }

  const discardAll = () => setPendingChanges({})

  // Quick ± percentage adjust for every odd within one market card.
  // Applies to the *current* value (staged if present, else server value).
  const quickAdjustMarket = (mm: any, pct: number) => {
    const odds = mm.match_market_odds ?? []
    setPendingChanges((prev) => {
      const next = { ...prev }
      odds.forEach((odd: any) => {
        const key = pendingKey(mm.id, odd.selection)
        const base = next[key] ?? odd.odd_value
        const updated = Math.max(1.01, base * (1 + pct / 100))
        next[key] = Math.round(updated * 100) / 100
      })
      return next
    })
  }

  const handleSaveAll = async () => {
    if (!user || !matchId || pendingCount === 0) return
    setSaving(true)
    const oddsUpdates = Object.entries(pendingChanges).map(([key, newOdd]) => {
      const [matchMarketId, selection] = key.split('::')
      return { matchMarketId, selection, newOdd }
    })
    const result = await updateMatch(matchId, {
      updatedBy: user.id,
      oddsUpdates,
    })
    if (result.success) {
      toast.success(`${oddsUpdates.length} odd${oddsUpdates.length === 1 ? '' : 's'} updated`)
      setPendingChanges({})
      loadMatch(matchId)
    } else {
      toast.error(result.error ?? 'Failed to update odds')
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
    <div className="p-6 pb-24">
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
          <TriangleAlert className="w-3.5 h-3.5 inline mr-1" />Existing bets keep original odds. Changes only affect new bets.
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
      <div className="overflow-x-auto scrollbar-hide mb-4">
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

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={marketSearch}
          onChange={(e) => setMarketSearch(e.target.value)}
          placeholder={`Search markets in ${activeCategory}...`}
          className="w-full bg-slate-dark border border-nile-blue/30 rounded-lg pl-9 pr-9 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold"
        />
        {marketSearch && (
          <button
            onClick={() => setMarketSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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

        {visibleMarkets.length === 0 ? (
          <p className="text-white/30 text-sm">
            {activeCategory === 'SCORERS'
              ? 'Add players above to enable scorer markets'
              : marketSearch
              ? `No markets match "${marketSearch}"`
              : 'No markets in this category'}
          </p>
        ) : (
          visibleMarkets.map(
            (mm: any) => {
              const template = mm.market_templates
              const odds = mm.match_market_odds ?? []
              const marketHasPendingChange = odds.some((odd: any) =>
                pendingChanges[pendingKey(mm.id, odd.selection)] !== undefined
              )

              return (
                <div
                  key={mm.id}
                  className={cn(
                    'bg-slate-dark border rounded-xl p-4 transition-colors',
                    marketHasPendingChange
                      ? 'border-gold/60'
                      : 'border-nile-blue/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="text-white/70 text-sm font-medium">
                        {template?.name}
                      </p>
                      {marketHasPendingChange && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => quickAdjustMarket(mm, -5)}
                        title="Decrease all odds in this market by 5%"
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-nile-blue/30 text-white/50 hover:text-nile-danger hover:border-nile-danger/40 transition-colors"
                      >
                        <TrendingDown className="w-3 h-3" />
                        5%
                      </button>
                      <button
                        onClick={() => quickAdjustMarket(mm, 5)}
                        title="Increase all odds in this market by 5%"
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-nile-blue/30 text-white/50 hover:text-nile-green hover:border-nile-green/40 transition-colors"
                      >
                        <TrendingUp className="w-3 h-3" />
                        5%
                      </button>
                    </div>
                  </div>
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
                            New Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {odds.map((odd: any) => {
                          const key = pendingKey(mm.id, odd.selection)
                          const staged = pendingChanges[key]
                          const isEdited = staged !== undefined

                          return (
                            <tr
                              key={odd.id}
                              className={cn(
                                'border-b border-nile-blue/10',
                                isEdited && 'bg-gold/5'
                              )}
                            >
                              <td className="py-2 text-white/70">
                                {odd.selection}
                              </td>
                              <td className="py-2 text-right font-mono">
                                <span className={isEdited ? 'text-white/30 line-through' : 'text-gold'}>
                                  {odd.odd_value?.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-2 text-right text-white/30 font-mono text-xs">
                                {odd.original_odd?.toFixed(2)}
                              </td>
                              <td className="py-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="1.01"
                                    value={
                                      staged !== undefined
                                        ? staged
                                        : odd.odd_value?.toFixed(2)
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value
                                      const num = parseFloat(val)
                                      if (!isNaN(num) && num > 1.0) {
                                       stageOddChange(mm.id, odd.selection, num)
                                      }
                                    }}
                                    className={cn(
                                      'w-20 bg-charcoal border rounded px-2 py-1 text-center font-mono text-sm focus:outline-none',
                                      isEdited
                                        ? 'border-gold text-gold'
                                        : 'border-nile-blue/40 text-white/70 focus:border-gold'
                                    )}
                                  />
                                  {isEdited && (
                                    <button
                                      onClick={() => discardOne(mm.id, odd.selection)}
                                      title="Discard this change"
                                      className="text-white/30 hover:text-nile-danger"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          )
        )}
      </div>

      {/* Sticky save bar */}
      {pendingCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-slate-dark border-t border-gold/30 px-6 py-3 flex items-center justify-between z-40 shadow-lg shadow-black/40">
          <span className="text-white text-sm">
            <span className="text-gold font-semibold">{pendingCount}</span>{' '}
            unsaved change{pendingCount === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={discardAll}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white disabled:opacity-50"
            >
              Discard All
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 bg-gold text-charcoal px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : `Save ${pendingCount} Change${pendingCount === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

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
