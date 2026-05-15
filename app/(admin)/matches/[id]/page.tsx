'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient }
  from '@/lib/supabase/client'
import {
  enterMatchResult,
  getSettlementPreview,
} from '@/lib/actions/adminMatches'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { ConfirmModal }
  from '@/components/shared/ConfirmModal'
import { LoadingSpinner }
  from '@/components/shared/LoadingSpinner'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Check,
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

const STEP_LABELS = [
  'Final Scores',
  'Match Stats',
  'Minute Results',
  'Scorers & Settle',
]

export default function ResultEntryPage({
  params,
}: Props) {
  const [matchId, setMatchId] = useState('')
  const [match, setMatch] = useState<any>(null)
  const router = useRouter()
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [settling, setSettling] =
    useState(false)
  const [preview, setPreview] =
    useState<any>(null)
  const [showConfirm, setShowConfirm] =
    useState(false)

  // Step 1: Scores
  const [ftHome, setFtHome] = useState(0)
  const [ftAway, setFtAway] = useState(0)
  const [htHome, setHtHome] = useState(0)
  const [htAway, setHtAway] = useState(0)

  // Step 2: Stats
  const [homeCorners, setHomeCorners] =
    useState(0)
  const [awayCorners, setAwayCorners] =
    useState(0)
  const [homeCards, setHomeCards] = useState(0)
  const [awayCards, setAwayCards] = useState(0)
  const [specials, setSpecials] = useState<
    Record<string, boolean>
  >({
    penaltyAwarded: false,
    penaltyScored: false,
    ownGoal: false,
    hatTrick: false,
    homeRedCard: false,
    awayRedCard: false,
    anyRedCard: false,
    bothTeamsPenalty: false,
    subBefore30: false,
    injuryTimeOver4: false,
    injuryTimeOver6: false,
    goalkeeperScore: false,
    matchToPenalties: false,
    homePenalty: false,
    awayPenalty: false,
  })

  // Step 3: Minute scores
  const MINUTES = ['10', '20', '30', '45', '60', '75']
  const [minuteScores, setMinuteScores] =
    useState<Record<string, { home: number; away: number }>>(
      Object.fromEntries(
        MINUTES.map((m) => [m, { home: 0, away: 0 }])
      )
    )
  const [firstTeamScore, setFirstTeamScore] =
    useState<'home' | 'away' | 'no_goal'>('no_goal')
  const [lastTeamScore, setLastTeamScore] =
    useState<'home' | 'away' | 'no_goal'>('no_goal')
  const [timeOfFirstGoal, setTimeOfFirstGoal] =
    useState('No Goal')

  // Step 4: Scorers
  const [firstScorer, setFirstScorer] =
    useState('no_goal')
  const [lastScorer, setLastScorer] =
    useState('no_goal')
  const [goalscorers, setGoalscorers] =
    useState<string[]>([])
  const [matchPlayers, setMatchPlayers] =
    useState<any[]>([])

  useEffect(() => {
    params.then(({ id }) => {
      setMatchId(id)
      const supabase = createClient()
      supabase
        .from('matches')
        .select(
          `*, leagues(name, countries(flag_emoji)), match_players(*)`
        )
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) {
            setMatch(data)
            setMatchPlayers(
              data.match_players ?? []
            )
          }
        })
    })
  }, [params])

  const scoreValid =
    htHome <= ftHome && htAway <= ftAway

  const setSpecial = (
    key: string,
    value: boolean
  ) => {
    setSpecials((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const setMinuteScore = (
    minute: string,
    team: 'home' | 'away',
    value: number
  ) => {
    setMinuteScores((prev) => ({
      ...prev,
      [minute]: {
        ...prev[minute],
        [team]: value,
      },
    }))
  }

  const buildResultData = () => ({
    ft_home: ftHome,
    ft_away: ftAway,
    ht_home: htHome,
    ht_away: htAway,
    home_corners: homeCorners,
    away_corners: awayCorners,
    home_cards: homeCards,
    away_cards: awayCards,
    minute_scores: minuteScores,
    scorers: { firstScorer, lastScorer, goalscorers },
    specials: {
      ...specials,
      firstTeamToScore: firstTeamScore,
      lastTeamToScore: lastTeamScore,
      timeOfFirstGoal,
    },
  })

  const handlePreview = async () => {
    if (!matchId) return
    const data = await getSettlementPreview(
      matchId,
      buildResultData()
    )
    setPreview(data)
  }

  const handleSettle = async () => {
    if (!user || !matchId) return
    setSettling(true)
    setShowConfirm(false)

    const result = await enterMatchResult({
      matchId,
      htHome,
      htAway,
      ftHome,
      ftAway,
      homeCorners,
      awayCorners,
      homeCards,
      awayCards,
      minuteScores,
      scorers: {
        firstScorer,
        lastScorer,
        goalscorers,
      },
      specials: {
        ...specials,
        firstTeamToScore: firstTeamScore,
        lastTeamToScore: lastTeamScore,
        timeOfFirstGoal,
      },
      settledBy: user.id,
    })

    if (result.success) {
      toast.success(
        `Match settled! ${result.settledCount} slips processed.`
      )
      router.push('/matches')
    } else {
      toast.error(
        result.error ?? 'Settlement failed'
      )
    }
    setSettling(false)
  }

  if (!match) {
    return (
      <div className="p-6">
        <LoadingSpinner
          size="md"
          color="gold"
          text="Loading match..."
        />
      </div>
    )
  }

  const specialsList = [
    { key: 'penaltyAwarded', label: 'Penalty Awarded' },
    { key: 'penaltyScored', label: 'Penalty Scored' },
    { key: 'homePenalty', label: 'Home Penalty' },
    { key: 'awayPenalty', label: 'Away Penalty' },
    { key: 'ownGoal', label: 'Own Goal' },
    { key: 'matchToPenalties', label: 'Match to Penalties' },
    { key: 'hatTrick', label: 'Hat-trick Scored' },
    { key: 'goalkeeperScore', label: 'Goalkeeper to Score' },
    { key: 'injuryTimeOver4', label: 'Injury Time > 4 min' },
    { key: 'injuryTimeOver6', label: 'Injury Time > 6 min' },
    { key: 'bothTeamsPenalty', label: 'Both Teams Penalty' },
    { key: 'subBefore30', label: 'Sub Before 30 min' },
    { key: 'homeRedCard', label: 'Home Red Card' },
    { key: 'awayRedCard', label: 'Away Red Card' },
    { key: 'anyRedCard', label: 'Any Red Card' },
  ]

  const timeGroups = [
    '0-15', '16-30', '31-45',
    '46-60', '61-75', '76-90', 'No Goal',
  ]

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/matches')}
          className="text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-white">
            Enter Result
          </h1>
          <p className="text-white/50 text-sm">
            {match.home_team} vs {match.away_team}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const isActive = step === stepNum
          const isDone = step > stepNum
          return (
            <div
              key={label}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
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
                  'text-xs hidden sm:block',
                  isActive
                    ? 'text-gold font-medium'
                    : 'text-white/40'
                )}
              >
                {label}
              </span>
              {i < 3 && (
                <div className="w-6 h-px bg-nile-blue/30" />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-6">
              Full Time Score
            </h2>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-white/60 text-sm mb-2">
                  {match.home_team}
                </p>
                <input
                  type="number"
                  min={0}
                  value={ftHome}
                  onChange={(e) =>
                    setFtHome(
                      parseInt(e.target.value) ||
                        0
                    )
                  }
                  className="w-20 h-16 text-center text-3xl font-bold text-gold bg-charcoal border border-gold/30 rounded-xl font-mono focus:outline-none"
                />
              </div>
              <span className="text-white/40 text-3xl font-bold">
                -
              </span>
              <div className="text-center">
                <p className="text-white/60 text-sm mb-2">
                  {match.away_team}
                </p>
                <input
                  type="number"
                  min={0}
                  value={ftAway}
                  onChange={(e) =>
                    setFtAway(
                      parseInt(e.target.value) ||
                        0
                    )
                  }
                  className="w-20 h-16 text-center text-3xl font-bold text-gold bg-charcoal border border-gold/30 rounded-xl font-mono focus:outline-none"
                />
              </div>
            </div>

            <h2 className="text-white font-semibold mt-8 mb-6">
              Half Time Score
            </h2>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <input
                  type="number"
                  min={0}
                  max={ftHome}
                  value={htHome}
                  onChange={(e) =>
                    setHtHome(
                      parseInt(e.target.value) ||
                        0
                    )
                  }
                  className={cn(
                    'w-16 h-12 text-center text-2xl font-bold bg-charcoal border rounded-xl font-mono focus:outline-none',
                    htHome > ftHome
                      ? 'border-nile-danger text-nile-danger'
                      : 'border-nile-blue/40 text-white'
                  )}
                />
                {htHome > ftHome && (
                  <p className="text-nile-danger text-xs mt-1">
                    ❌ Exceeds FT
                  </p>
                )}
              </div>
              <span className="text-white/40 text-2xl">
                -
              </span>
              <div className="text-center">
                <input
                  type="number"
                  min={0}
                  max={ftAway}
                  value={htAway}
                  onChange={(e) =>
                    setHtAway(
                      parseInt(e.target.value) ||
                        0
                    )
                  }
                  className={cn(
                    'w-16 h-12 text-center text-2xl font-bold bg-charcoal border rounded-xl font-mono focus:outline-none',
                    htAway > ftAway
                      ? 'border-nile-danger text-nile-danger'
                      : 'border-nile-blue/40 text-white'
                  )}
                />
                {htAway > ftAway && (
                  <p className="text-nile-danger text-xs mt-1">
                    ❌ Exceeds FT
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!scoreValid}
              className={cn(
                'px-6 py-2.5 rounded-lg text-sm font-semibold',
                scoreValid
                  ? 'bg-gold text-charcoal hover:bg-gold-light'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              Next &#8594;
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">
              Corners & Cards
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-white/60 text-sm mb-3">
                  Corners
                </p>
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs text-white/40">
                      {match.home_team}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={homeCorners}
                      onChange={(e) =>
                        setHomeCorners(
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-16 h-10 text-center text-lg font-bold bg-charcoal border border-nile-blue/40 rounded-lg text-white font-mono focus:outline-none mt-1 block"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40">
                      {match.away_team}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={awayCorners}
                      onChange={(e) =>
                        setAwayCorners(
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-16 h-10 text-center text-lg font-bold bg-charcoal border border-nile-blue/40 rounded-lg text-white font-mono focus:outline-none mt-1 block"
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-white/60 text-sm mb-3">
                  Cards (Yellow+Red)
                </p>
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs text-white/40">
                      {match.home_team}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={homeCards}
                      onChange={(e) =>
                        setHomeCards(
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-16 h-10 text-center text-lg font-bold bg-charcoal border border-nile-blue/40 rounded-lg text-white font-mono focus:outline-none mt-1 block"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40">
                      {match.away_team}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={awayCards}
                      onChange={(e) =>
                        setAwayCards(
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-16 h-10 text-center text-lg font-bold bg-charcoal border border-nile-blue/40 rounded-lg text-white font-mono focus:outline-none mt-1 block"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specials */}
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">
              Match Specials
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {specialsList.map((sp) => (
                <div
                  key={sp.key}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-white/70 text-sm">
                    {sp.label}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSpecial(sp.key, true)
                      }
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-semibold border',
                        specials[sp.key]
                          ? 'bg-nile-success border-nile-success text-white'
                          : 'border-nile-blue/30 text-white/40 hover:text-white'
                      )}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() =>
                        setSpecial(sp.key, false)
                      }
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-semibold border',
                        !specials[sp.key]
                          ? 'bg-nile-danger border-nile-danger text-white'
                          : 'border-nile-blue/30 text-white/40 hover:text-white'
                      )}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="border border-white/20 text-white/60 px-6 py-2.5 rounded-lg text-sm"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-gold text-charcoal px-6 py-2.5 rounded-lg text-sm font-semibold"
            >
              Next &#8594;
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">
              Score at Each Minute
            </h2>
            <div className="space-y-3">
              {MINUTES.map((min) => (
                <div
                  key={min}
                  className="flex items-center gap-4"
                >
                  <span className="text-white/50 text-sm w-16">
                    {min} min
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={minuteScores[min]?.home ?? 0}
                    onChange={(e) =>
                      setMinuteScore(
                        min,
                        'home',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-14 h-9 text-center text-sm font-bold bg-charcoal border border-nile-blue/40 rounded text-white font-mono focus:outline-none"
                  />
                  <span className="text-white/30">
                    -
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={minuteScores[min]?.away ?? 0}
                    onChange={(e) =>
                      setMinuteScore(
                        min,
                        'away',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-14 h-9 text-center text-sm font-bold bg-charcoal border border-nile-blue/40 rounded text-white font-mono focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-white/60 text-sm mb-2">
                First Team to Score
              </p>
              <div className="flex gap-2">
                {(
                  ['home', 'away', 'no_goal'] as const
                ).map((v) => (
                  <button
                    key={v}
                    onClick={() =>
                      setFirstTeamScore(v)
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border capitalize',
                      firstTeamScore === v
                        ? 'bg-gold border-gold text-charcoal font-semibold'
                        : 'border-nile-blue/30 text-white/50 hover:text-white'
                    )}
                  >
                    {v === 'no_goal'
                      ? 'No Goal'
                      : v === 'home'
                      ? match.home_team
                      : match.away_team}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-2">
                Last Team to Score
              </p>
              <div className="flex gap-2">
                {(
                  ['home', 'away', 'no_goal'] as const
                ).map((v) => (
                  <button
                    key={v}
                    onClick={() =>
                      setLastTeamScore(v)
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border capitalize',
                      lastTeamScore === v
                        ? 'bg-gold border-gold text-charcoal font-semibold'
                        : 'border-nile-blue/30 text-white/50 hover:text-white'
                    )}
                  >
                    {v === 'no_goal'
                      ? 'No Goal'
                      : v === 'home'
                      ? match.home_team
                      : match.away_team}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/60 text-sm mb-2">
                Time of First Goal
              </p>
              <div className="flex flex-wrap gap-2">
                {timeGroups.map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setTimeOfFirstGoal(t)
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border',
                      timeOfFirstGoal === t
                        ? 'bg-gold border-gold text-charcoal font-semibold'
                        : 'border-nile-blue/30 text-white/50 hover:text-white'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="border border-white/20 text-white/60 px-6 py-2.5 rounded-lg text-sm"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                setStep(4)
                handlePreview()
              }}
              className="bg-gold text-charcoal px-6 py-2.5 rounded-lg text-sm font-semibold"
            >
              Next &#8594;
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4 ── */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Scorers */}
          {matchPlayers.length > 0 && (
            <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold">
                Goal Scorers
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60 block mb-1">
                    First Scorer
                  </label>
                  <select
                    value={firstScorer}
                    onChange={(e) =>
                      setFirstScorer(e.target.value)
                    }
                    className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    <option value="no_goal">
                      No Goal
                    </option>
                    {matchPlayers.map((p) => (
                      <option
                        key={p.id}
                        value={p.player_name}
                      >
                        {p.player_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">
                    Last Scorer
                  </label>
                  <select
                    value={lastScorer}
                    onChange={(e) =>
                      setLastScorer(e.target.value)
                    }
                    className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                  >
                    <option value="no_goal">
                      No Goal
                    </option>
                    {matchPlayers.map((p) => (
                      <option
                        key={p.id}
                        value={p.player_name}
                      >
                        {p.player_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-2">
                  All Goal Scorers (check all who scored)
                </label>
                <div className="flex flex-wrap gap-2">
                  {matchPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setGoalscorers((prev) =>
                          prev.includes(
                            p.player_name
                          )
                            ? prev.filter(
                                (n) =>
                                  n !==
                                  p.player_name
                              )
                            : [...prev, p.player_name]
                        )
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs border',
                        goalscorers.includes(
                          p.player_name
                        )
                          ? 'bg-nile-success/20 border-nile-success text-nile-success'
                          : 'border-nile-blue/30 text-white/50 hover:text-white'
                      )}
                    >
                      {p.player_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">
                Settlement Preview
              </h2>
              <button
                onClick={handlePreview}
                className="text-xs border border-gold/30 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10"
              >
                Refresh Preview
              </button>
            </div>

            {!preview ? (
              <LoadingSpinner
                size="sm"
                color="gold"
                text="Loading preview..."
              />
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-nile-success font-mono">
                      {preview.wonCount}
                    </p>
                    <p className="text-xs text-white/50">
                      Selections Won
                    </p>
                  </div>
                  <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-nile-danger font-mono">
                      {preview.lostCount}
                    </p>
                    <p className="text-xs text-white/50">
                      Selections Lost
                    </p>
                  </div>
                  <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white/50 font-mono">
                      {preview.voidCount}
                    </p>
                    <p className="text-xs text-white/50">
                      Void
                    </p>
                  </div>
                  <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gold font-mono">
                      {preview.totalSlipsAffected}
                    </p>
                    <p className="text-xs text-white/50">
                      Slips to Settle
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-4">
            <p className="text-nile-danger font-semibold text-sm mb-1">
              ⚠️ IRREVERSIBLE ACTION
            </p>
            <p className="text-white/60 text-xs">
              Once confirmed, all slips will be settled and balances updated. This cannot be undone.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="border border-white/20 text-white/60 px-6 py-2.5 rounded-lg text-sm"
            >
              ← Back
            </button>
            <button
              onClick={() =>
                setShowConfirm(true)
              }
              disabled={settling}
              className="bg-gold text-charcoal px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light disabled:opacity-50"
            >
              {settling
                ? 'Settling...'
                : 'Confirm & Settle All Slips ✓'}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSettle}
        title="Settle All Slips?"
        message={`This will settle ${preview?.totalSlipsAffected ?? 0} slips for ${match.home_team} vs ${match.away_team}. Final score: ${ftHome}-${ftAway}. This CANNOT be undone.`}
        confirmText="Yes, Settle All Slips"
        variant="danger"
        isLoading={settling}
      />
    </div>
  )
}