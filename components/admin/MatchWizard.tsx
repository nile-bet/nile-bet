'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createMatch }
  from '@/lib/actions/adminMatches'
import {
  getCountriesWithLeagues,
} from '@/lib/actions/matches'
import { createClient }
  from '@/lib/supabase/client'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Plus,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react'

interface MatchWizardProps {
  onClose: () => void
  onSuccess: () => void
}

const STEP_LABELS = [
  'Match Info',
  'Markets',
  'Odds',
]

const CATEGORY_ORDER = [
  'MAIN', 'GOALS', 'HANDICAP', 'HALVES',
  'CORNERS', 'CARDS', 'TEAM GOALS',
  'CLEAN SHEET', 'GOALS ODD/EVEN',
  'SCORERS', 'SCORE', 'COMBO',
  'MIN 1X2', 'MIN GOALS', 'SPECIALS',
]

export function MatchWizard({
  onClose,
  onSuccess,
}: MatchWizardProps) {
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [leagueId, setLeagueId] = useState('')
  const [kickOff, setKickOff] = useState('')
  const [isFeatured, setIsFeatured] =
    useState(false)
  const [countries, setCountries] =
    useState<any[]>([])
  const [selectedCountry, setSelectedCountry] =
    useState('')

  // Step 2
  const [templates, setTemplates] =
    useState<any[]>([])
  const [selectedMarkets, setSelectedMarkets] =
    useState<string[]>([])
  const [players, setPlayers] =
    useState<{ name: string; team: 'home' | 'away' }[]>([])
  const [newPlayer, setNewPlayer] =
    useState<{ name: string; team: 'home' | 'away' }>({ name: '', team: 'home' })

  // Step 3
  const [odds, setOdds] = useState<
    Record<
      string,
      Record<string, string>
    >
  >({})

  useEffect(() => {
    getCountriesWithLeagues().then(
      setCountries
    )
    const supabase = createClient()
    supabase
      .from('market_templates')
      .select('*, market_categories(*)')
      .order('display_order')
      .then(({ data }) => {
        if (data) setTemplates(data)
      })
  }, [])

  const availableLeagues =
    countries.find(
      (c) => c.id === selectedCountry
    )?.leagues ?? []

  const templatesByCategory = CATEGORY_ORDER
    .reduce(
      (acc, cat) => {
        const catTemplates = templates.filter(
          (t) =>
            t.market_categories?.name === cat
        )
        if (catTemplates.length > 0) {
          acc[cat] = catTemplates
        }
        return acc
      },
      {} as Record<string, any[]>
    )

  const toggleMarket = (templateId: string) => {
    setSelectedMarkets((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    )
  }

  const toggleCategory = (cat: string) => {
    const catTemplates =
      templatesByCategory[cat] ?? []
    const catIds = catTemplates.map(
      (t) => t.id
    )
    const allSelected = catIds.every((id) =>
      selectedMarkets.includes(id)
    )
    if (allSelected) {
      setSelectedMarkets((prev) =>
        prev.filter(
          (id) => !catIds.includes(id)
        )
      )
    } else {
      setSelectedMarkets((prev) => [
        ...new Set([...prev, ...catIds]),
      ])
    }
  }

  const setOdd = (
    templateId: string,
    selection: string,
    value: string
  ) => {
    setOdds((prev) => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] ?? {}),
        [selection]: value,
      },
    }))
  }

  const getOdd = (
    templateId: string,
    selection: string
  ) => odds[templateId]?.[selection] ?? ''

  const handlePublish = async (
    immediately: boolean
  ) => {
    if (!user) return
    setSaving(true)

    const oddsArray: {
      marketTemplateId: string
      selection: string
      oddValue: number
    }[] = []

    for (const templateId of selectedMarkets) {
      const template = templates.find(
        (t) => t.id === templateId
      )
      if (!template || template.is_dynamic)
        continue
      const sels: string[] =
        template.selections ?? []
      for (const sel of sels) {
        const val = parseFloat(
          getOdd(templateId, sel)
        )
        if (val > 1.0) {
          oddsArray.push({
            marketTemplateId: templateId,
            selection: sel,
            oddValue: val,
          })
        }
      }
    }

    const result = await createMatch({
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      leagueId,
      kickOffTime: kickOff,
      isFeatured,
      publishImmediately: immediately,
      selectedMarkets,
      odds: oddsArray,
      players,
      createdBy: user.id,
    })

    if (result.success) {
      toast.success(
        `Match ${immediately ? 'published' : 'saved as draft'}!`
      )
      onSuccess()
    } else {
      toast.error(
        result.error ?? 'Failed to create match'
      )
    }
    setSaving(false)
  }

  const step1Valid =
    homeTeam.trim() &&
    awayTeam.trim() &&
    homeTeam.trim() !== awayTeam.trim() &&
    leagueId &&
    kickOff

  const kickOffWarning =
    kickOff &&
    new Date(kickOff) 
      new Date(Date.now() + 3600000)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            Create New Match
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1
            const isActive = step === stepNum
            const isDone = step > stepNum
            return (
              <div
                key={label}
                className="flex items-center gap-2"
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                    isDone
                      ? 'bg-nile-success text-white'
                      : isActive
                      ? 'bg-gold text-charcoal'
                      : 'bg-nile-blue/30 text-white/40'
                  )}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium hidden sm:block',
                    isActive
                      ? 'text-gold'
                      : 'text-white/40'
                  )}
                >
                  {label}
                </span>
                {i < 2 && (
                  <div className="w-8 h-px bg-nile-blue/30 mx-1" />
                )}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Home Team *
                </label>
                <input
                  value={homeTeam}
                  onChange={(e) =>
                    setHomeTeam(e.target.value)
                  }
                  placeholder="e.g. Arsenal"
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Away Team *
                </label>
                <input
                  value={awayTeam}
                  onChange={(e) =>
                    setAwayTeam(e.target.value)
                  }
                  placeholder="e.g. Chelsea"
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Country *
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(
                      e.target.value
                    )
                    setLeagueId('')
                  }}
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
                >
                  <option value="">
                    Select country...
                  </option>
                  {countries.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.flag_emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  League *
                </label>
                <select
                  value={leagueId}
                  onChange={(e) =>
                    setLeagueId(e.target.value)
                  }
                  disabled={!selectedCountry}
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none disabled:opacity-40"
                >
                  <option value="">
                    Select league...
                  </option>
                  {availableLeagues.map(
                    (l: any) => (
                      <option
                        key={l.id}
                        value={l.id}
                      >
                        {l.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Kick-off Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={kickOff}
                  onChange={(e) =>
                    setKickOff(e.target.value)
                  }
                  min={new Date()
                    .toISOString()
                    .slice(0, 16)}
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
                />
                {kickOffWarning && (
                  <p className="text-nile-orange text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Less than 1 hour away
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  Featured Match
                </label>
                <button
                  onClick={() =>
                    setIsFeatured(!isFeatured)
                  }
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm w-full',
                    isFeatured
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'border-nile-blue/30 text-white/50 hover:text-white'
                  )}
                >
                  <span>
                    {isFeatured ? '⭐' : '☆'}
                  </span>
                  {isFeatured
                    ? 'Featured'
                    : 'Not featured'}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className={cn(
                  'px-6 py-2.5 rounded-lg text-sm font-semibold',
                  step1Valid
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                Next Step &#8594;
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const allIds =
                      templates.map((t) => t.id)
                    setSelectedMarkets(allIds)
                  }}
                  className="text-xs border border-gold/30 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10"
                >
                  Select All
                </button>
                <button
                  onClick={() =>
                    setSelectedMarkets([])
                  }
                  className="text-xs border border-white/20 text-white/50 px-3 py-1.5 rounded-lg hover:text-white"
                >
                  Clear All
                </button>
              </div>
              <span className="text-xs text-gold bg-gold/10 px-2 py-1 rounded-full">
                {selectedMarkets.length}{' '}
                selected
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
              {CATEGORY_ORDER.map((cat) => {
                const catTemplates =
                  templatesByCategory[cat]
                if (!catTemplates) return null

                const catIds = catTemplates.map(
                  (t) => t.id
                )
                const allCatSelected =
                  catIds.every((id) =>
                    selectedMarkets.includes(id)
                  )
                const someCatSelected =
                  catIds.some((id) =>
                    selectedMarkets.includes(id)
                  )

                return (
                  <div
                    key={cat}
                    className="bg-charcoal/50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        onClick={() =>
                          toggleCategory(cat)
                        }
                        className={cn(
                          'w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center cursor-pointer',
                          allCatSelected
                            ? 'bg-gold border-gold'
                            : someCatSelected
                            ? 'bg-gold/50 border-gold'
                            : 'border-white/30 hover:border-gold/50'
                        )}
                      >
                        {allCatSelected && (
                          <Check className="w-3 h-3 text-charcoal" />
                        )}
                      </div>
                      <span className="text-white font-medium text-sm">
                        {cat}
                      </span>
                      <span className="text-white/40 text-xs">
                        ({catTemplates.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      {catTemplates.map(
                        (template) => (
                          <button
                            key={template.id}
                            onClick={() =>
                              toggleMarket(
                                template.id
                              )
                            }
                            className={cn(
                              'text-[11px] px-2 py-1 rounded border transition-colors',
                              selectedMarkets.includes(
                                template.id
                              )
                                ? 'bg-gold/20 border-gold text-gold'
                                : 'border-nile-blue/30 text-white/50 hover:text-white hover:border-gold/30'
                            )}
                          >
                            {template.is_dynamic
                              ? `${template.name} (dynamic)`
                              : template.name}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Scorers players */}
            {selectedMarkets.some((id) => {
              const t = templates.find(
                (t) => t.id === id
              )
              return t?.is_dynamic
            }) && (
              <div className="bg-nile-blue/20 border border-gold/20 rounded-lg p-4">
                <p className="text-white font-medium text-sm mb-3">
                  Add Players (for Scorers markets)
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newPlayer.name}
                    onChange={(e) =>
                      setNewPlayer((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Player name..."
                    className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                  />
                  <select
                    value={newPlayer.team}
                    onChange={(e) =>
                      setNewPlayer((prev) => ({
                        ...prev,
                        team: e.target.value as
                          | 'home'
                          | 'away',
                      }))
                    }
                    className="bg-charcoal border border-gold/20 rounded-lg px-2 py-2 text-white text-sm"
                  >
                    <option value="home">
                      {homeTeam || 'Home'}
                    </option>
                    <option value="away">
                      {awayTeam || 'Away'}
                    </option>
                  </select>
                  <button
                    onClick={() => {
                      if (!newPlayer.name.trim())
                        return
                      setPlayers((prev) => [
                        ...prev,
                        {
                          name: newPlayer.name.trim(),
                          team: newPlayer.team,
                        },
                      ])
                      setNewPlayer({
                        name: '',
                        team: 'home',
                      })
                    }}
                    className="bg-gold text-charcoal px-3 py-2 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {players.map((p, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 bg-charcoal border border-nile-blue/30 text-white/70 text-xs px-2.5 py-1 rounded-full"
                    >
                      {p.name}
                      <span className="text-gold text-[10px]">
                        (
                        {p.team === 'home'
                          ? homeTeam
                          : awayTeam}
                        )
                      </span>
                      <button
                        onClick={() =>
                          setPlayers((prev) =>
                            prev.filter(
                              (_, j) => j !== i
                            )
                          )
                        }
                        className="text-white/30 hover:text-nile-danger"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="border border-white/20 text-white/60 px-6 py-2.5 rounded-lg text-sm"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={
                  selectedMarkets.length === 0
                }
                className={cn(
                  'px-6 py-2.5 rounded-lg text-sm font-semibold',
                  selectedMarkets.length > 0
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                Next Step &#8594;
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-nile-orange/10 border border-nile-orange/30 rounded-lg p-3 text-xs text-nile-orange">
              ⚠️ All odds must be greater than 1.00. Unavailable markets leave odds blank.
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
              {CATEGORY_ORDER.map((cat) => {
                const catSelected =
                  (
                    templatesByCategory[cat] ??
                    []
                  ).filter((t) =>
                    selectedMarkets.includes(t.id)
                  )
                if (catSelected.length === 0)
                  return null

                return (
                  <div key={cat}>
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
                      {cat}
                    </p>
                    {catSelected.map(
                      (template) => {
                        if (template.is_dynamic)
                          return (
                            <p
                              key={template.id}
                              className="text-white/40 text-xs px-2 mb-1"
                            >
                              {template.name} — player odds auto-generated from player list
                            </p>
                          )

                        const sels: string[] =
                          template.selections ??
                          []
                        return (
                          <div
                            key={template.id}
                            className="bg-charcoal/50 rounded-lg p-3 mb-2"
                          >
                            <p className="text-white/60 text-xs mb-2">
                              {template.name}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {sels.map(
                                (sel) => {
                                  const val =
                                    getOdd(
                                      template.id,
                                      sel
                                    )
                                  const numVal =
                                    parseFloat(val)
                                  const isInvalid =
                                    val &&
                                    numVal <= 1.0
                                  const isHigh =
                                    numVal > 50

                                  return (
                                    <div
                                      key={sel}
                                      className="flex flex-col items-center"
                                    >
                                      <label className="text-[10px] text-white/40 mb-0.5">
                                        {sel}
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="1.01"
                                        value={val}
                                        onChange={(
                                          e
                                        ) =>
                                          setOdd(
                                            template.id,
                                            sel,
                                            e.target.value
                                          )
                                        }
                                        placeholder="—"
                                        className={cn(
                                          'w-20 bg-charcoal border rounded px-2 py-1.5 text-center font-mono text-sm focus:outline-none',
                                          isInvalid
                                            ? 'border-nile-danger text-nile-danger'
                                            : isHigh
                                            ? 'border-nile-orange text-nile-orange'
                                            : val
                                            ? 'border-gold text-gold'
                                            : 'border-nile-blue/40 text-white/60'
                                        )}
                                      />
                                      {isHigh && (
                                        <span className="text-[9px] text-nile-orange">
                                          ⚠️ high
                                        </span>
                                      )}
                                    </div>
                                  )
                                }
                              )}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setStep(2)}
                className="border border-white/20 text-white/60 px-6 py-2.5 rounded-lg text-sm"
              >
                ← Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    handlePublish(false)
                  }
                  disabled={saving}
                  className="border border-gold/30 text-gold px-4 py-2.5 rounded-lg text-sm hover:bg-gold/10"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() =>
                    handlePublish(true)
                  }
                  disabled={saving}
                  className={cn(
                    'px-4 py-2.5 rounded-lg text-sm font-semibold',
                    !saving
                      ? 'bg-gold text-charcoal hover:bg-gold-light'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  )}
                >
                  {saving
                    ? 'Publishing...'
                    : 'Publish Match ✓'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}