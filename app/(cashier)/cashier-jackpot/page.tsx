'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { placeJackpotBet, getJackpotSlipById } from '@/lib/actions/jackpot'
import { Trophy, Loader2, Lock, Unlock, User, CheckCircle, XCircle, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { formatETB } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Selection = 'home' | 'draw' | 'away'
type Tab = 'pick' | 'slips'

export default function CashierJackpotPage() {
  const { user } = useAuthStore()
  const [jackpot, setJackpot] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [selections, setSelections] = useState<Record<number, Selection>>({})
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [bettorName, setBettorName] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('pick')
  const [slipSearchId, setSlipSearchId] = useState('')
  const [searchingSlip, setSearchingSlip] = useState(false)
  const [loadedSlip, setLoadedSlip] = useState<any>(null)
  const [slipSearchError, setSlipSearchError] = useState('')
  const [slips, setSlips] = useState<any[]>([])
  const [loadingSlips, setLoadingSlips] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: jp } = await supabase
        .from('jackpots').select('*')
        .in('status', ['open', 'draft'])
        .order('created_at', { ascending: false })
        .limit(1).single()
      if (jp) {
        setJackpot(jp)
        const { data: m } = await supabase
          .from('jackpot_matches').select('*')
          .eq('jackpot_id', jp.id)
          .order('game_number', { ascending: true })
        setMatches(m ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const loadSlips = async () => {
    if (!jackpot) return
    setLoadingSlips(true)
    const { data } = await supabase
      .from('jackpot_slips')
      .select('*, jackpot_slip_selections(*, jackpot_matches(home_team, away_team))')
      .eq('jackpot_id', jackpot.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setSlips(data ?? [])
    setLoadingSlips(false)
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'slips') loadSlips()
  }

  const handleSelect = (gameNumber: number, sel: Selection) => {
    setSelections(prev => ({ ...prev, [gameNumber]: sel }))
  }

  const selectedCount = Object.keys(selections).length
  const allSelected = selectedCount === matches.length && matches.length > 0
  const canPlace = allSelected && !placing && (isAnonymous || bettorName.trim().length > 0)

  const handlePlace = async () => {
    if (!user || !jackpot || !allSelected) return
    setPlacing(true)
    const result = await placeJackpotBet({
      jackpotId: jackpot.id,
      bettorId: user.id,
      placedById: user.id,
      isAnonymous,
      selections: matches.map(m => ({
        gameNumber: m.game_number,
        selection: selections[m.game_number],
        odd: selections[m.game_number] === 'home' ? m.home_odd
          : selections[m.game_number] === 'draw' ? m.draw_odd : m.away_odd,
      })),
    })
    if (result.success) {
      toast.success(`🏆 Jackpot placed! Slip #${result.slipId}`)
      setSelections({})
      setBettorName('')
      setIsAnonymous(false)
    } else {
      toast.error(result.error ?? 'Failed')
    }
    setPlacing(false)
  }

  const handleSearchSlip = async () => {
    if (!slipSearchId.trim()) return
    setSearchingSlip(true)
    setSlipSearchError('')
    setLoadedSlip(null)
    const slip = await getJackpotSlipById(slipSearchId.trim().toUpperCase())
    if (!slip) {
      setSlipSearchError('Slip not found')
    } else {
      // Load selections into state regardless of status
      const sels: Record<number, Selection> = {}
      const slipSelections = (slip as any).jackpot_slip_selections ?? []
      slipSelections.forEach((s: any) => {
        sels[s.game_number] = s.selection as Selection
      })
      setSelections(sels)
      if ((slip as any).status !== 'pending') {
        // Already placed — copy the selections but will get a new slip ID on place
        setLoadedSlip({ ...(slip as any), _isCopy: true })
        toast.success('Selections copied! A new slip ID will be assigned on place.')
      } else {
        setLoadedSlip(slip)
        toast.success('Slip loaded! Review and place the bet.')
      }
    }
    setSearchingSlip(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-gold" />
    </div>
  )

  if (!jackpot) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="p-4 bg-gold/10 rounded-full border border-gold/20">
        <Trophy className="w-10 h-10 text-gold/40" />
      </div>
      <p className="text-white/40 text-sm">No active jackpot</p>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* Hero Banner */}
      <div className="relative overflow-hidden px-4 py-4 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #1B3A6B 60%, #C9A84C15 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute text-gold/10 animate-pulse"
              style={{
                top: `${10 + (i * 13) % 80}%`,
                left: `${5 + (i * 17) % 90}%`,
                fontSize: `${8 + (i % 3) * 5}px`,
                animationDelay: `${i * 0.4}s`,
              }}>★</div>
          ))}
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 rounded-xl border border-gold/30">
              <Trophy className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">{jackpot.name}</h1>
              <p className="text-gold/70 text-xs">Pick {matches.length} · Win Big</p>
            </div>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Win All</p>
              <p className="text-gold font-mono font-bold text-sm">{formatETB(jackpot.win_all_reward)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Entry</p>
              <p className="text-white font-mono font-bold text-sm">{formatETB(jackpot.fixed_stake)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-nile-blue/20 bg-slate-dark flex-shrink-0">
        {([
          { key: 'pick', label: '🎯 Place Bet' },
          { key: 'slips', label: "🎫 Today's Slips" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors',
              activeTab === t.key
                ? 'border-gold text-gold'
                : 'border-transparent text-white/40 hover:text-white'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PICK TAB */}
      {activeTab === 'pick' && (
        <div className="flex flex-1 overflow-hidden">

          {/* Left — matches */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Slip ID Search */}
            <div className="bg-nile-blue/20 border border-gold/20 rounded-xl p-3 mb-3">
              <p className="text-xs text-white/60 mb-2 font-medium">📋 Load Customer Slip by ID</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slipSearchId}
                  onChange={(e) => setSlipSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSlip()}
                  placeholder="Enter JP slip code (e.g. JP12345678)"
                  className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-gold/40"
                />
                <button
                  onClick={handleSearchSlip}
                  disabled={searchingSlip || !slipSearchId.trim()}
                  className="bg-gold text-charcoal px-3 py-2 rounded-lg text-xs font-bold hover:bg-gold-light disabled:opacity-50 flex items-center gap-1"
                >
                  {searchingSlip ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  Load
                </button>
                {loadedSlip && (
                  <button
                    onClick={() => { setLoadedSlip(null); setSlipSearchId(''); setSelections({}) }}
                    className="text-white/40 hover:text-white px-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {slipSearchError && <p className="text-nile-danger text-xs mt-1">{slipSearchError}</p>}
              {loadedSlip && (
                <div className="mt-2 bg-nile-success/10 border border-nile-success/30 rounded-lg px-3 py-2">
                  <p className="text-nile-success text-xs font-medium">✅ Slip #{loadedSlip.slip_id} loaded — {Object.keys(selections).length} selections pre-filled</p>
                  <p className="text-white/40 text-[10px] mt-0.5">A NEW unique slip ID will be generated when you place the bet</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gold rounded-full transition-all duration-300"
                  style={{ width: `${matches.length ? (selectedCount / matches.length) * 100 : 0}%` }} />
              </div>
              <span className="text-[11px] text-white/40 flex-shrink-0 font-mono">{selectedCount}/{matches.length}</span>
              {selectedCount > 0 && (
                <button onClick={() => setSelections({})}
                  className="text-[10px] text-white/30 hover:text-nile-danger transition-colors">
                  Clear
                </button>
              )}
            </div>

            {matches.map((m) => {
              const sel = selections[m.game_number]
              const result = m.result
              const isResulted = !!result
              return (
                <div key={m.id} className={cn(
                  'border rounded-xl p-3 transition-all',
                  isResulted && result === sel ? 'border-nile-success/40 bg-nile-success/5'
                    : isResulted && result !== sel && sel ? 'border-nile-danger/30 bg-nile-danger/5'
                    : sel ? 'border-gold/30 bg-gold/5'
                    : 'border-nile-blue/20 bg-slate-dark'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gold/50 font-semibold">GAME {m.game_number}</span>
                    {isResulted && (
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full border font-semibold',
                        result === 'home' ? 'text-gold border-gold/40 bg-gold/10'
                          : result === 'away' ? 'text-nile-blue-light border-nile-blue-light/40'
                          : 'text-white/50 border-white/20'
                      )}>
                        {result === 'home' ? '1' : result === 'away' ? '2' : 'X'} Result
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-white text-xs font-medium flex-1 truncate">{m.home_team}</span>
                    <span className="text-white/30 text-[10px] px-2 flex-shrink-0">VS</span>
                    <span className="text-white text-xs font-medium flex-1 text-right truncate">{m.away_team}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { key: 'home' as Selection, label: '1', sublabel: 'Home', odd: m.home_odd },
                      { key: 'draw' as Selection, label: 'X', sublabel: 'Draw', odd: m.draw_odd },
                      { key: 'away' as Selection, label: '2', sublabel: 'Away', odd: m.away_odd },
                    ]).map(opt => {
                      const isSelected = sel === opt.key
                      const isCorrect = isResulted && result === opt.key
                      const isWrong = isResulted && isSelected && result !== opt.key
                      return (
                        <button key={opt.key}
                          onClick={() => handleSelect(m.game_number, opt.key)}
                          className={cn(
                            'flex flex-col items-center py-2 rounded-lg border transition-all',
                            isCorrect ? 'bg-nile-success/20 border-nile-success text-nile-success'
                              : isWrong ? 'bg-nile-danger/20 border-nile-danger text-nile-danger'
                              : isSelected ? 'bg-gold/20 border-gold text-gold'
                              : 'border-nile-blue/20 text-white/50 hover:border-gold/40 hover:text-white bg-charcoal'
                          )}>
                          <span className="text-sm font-bold leading-none">{opt.label}</span>
                          <span className="text-[9px] mt-0.5 opacity-60">{opt.sublabel}</span>
                          {opt.odd && <span className="text-[10px] font-mono mt-1 opacity-80">{opt.odd?.toFixed(2)}</span>}
                          {isCorrect && <CheckCircle className="w-3 h-3 mt-0.5" />}
                          {isWrong && <XCircle className="w-3 h-3 mt-0.5" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right — bettor + summary */}
          <div className="w-60 border-l border-gold/10 bg-slate-dark flex flex-col p-3 gap-3 overflow-y-auto">
            {/* Slip ID Search */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Load Slip Code</p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={slipSearchId}
                  onChange={e => { setSlipSearchId(e.target.value.toUpperCase()); setSlipSearchError(''); setLoadedSlip(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleSearchSlip()}
                  placeholder="JP12345678"
                  className="flex-1 bg-charcoal border border-gold/20 rounded-lg px-2.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-gold/50 placeholder:text-white/20"
                />
                <button
                  onClick={handleSearchSlip}
                  disabled={searchingSlip || !slipSearchId.trim()}
                  className="px-2.5 py-2 rounded-lg bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30 disabled:opacity-40 transition-all">
                  {searchingSlip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </button>
                {(loadedSlip || slipSearchId) && (
                  <button onClick={() => { setSlipSearchId(''); setLoadedSlip(null); setSlipSearchError(''); setSelections({}) }}
                    className="px-2 py-2 rounded-lg border border-white/10 text-white/30 hover:text-white/60 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {slipSearchError && (
                <p className="text-nile-danger text-[10px] flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {slipSearchError}
                </p>
              )}
              {loadedSlip && (
                <div className={cn(
                  "border rounded-lg px-3 py-2 space-y-0.5",
                  loadedSlip._isCopy
                    ? "bg-nile-orange/10 border-nile-orange/30"
                    : "bg-nile-success/10 border-nile-success/30"
                )}>
                  <p className={cn(
                    "text-[10px] font-semibold flex items-center gap-1",
                    loadedSlip._isCopy ? "text-nile-orange" : "text-nile-success"
                  )}>
                    <CheckCircle className="w-3 h-3" />
                    {loadedSlip._isCopy ? "Copying selections" : "Slip loaded"}
                  </p>
                  <p className="text-white/60 text-[10px] font-mono">
                    {loadedSlip._isCopy ? `Copied from #${loadedSlip.slip_id}` : `#${loadedSlip.slip_id}`}
                  </p>
                  <p className="text-white/40 text-[10px]">
                    {loadedSlip._isCopy
                      ? "New slip ID will be assigned on place"
                      : `${loadedSlip.jackpot_slip_selections?.length ?? 0} selections pre-filled`}
                  </p>
                </div>
              )}
            </div>

            <div className="h-px bg-white/10" />

            {/* Slip ID Search */}
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Place For</p>

            <button onClick={() => { setIsAnonymous(!isAnonymous); setBettorName('') }}
              className={cn(
                'flex items-center gap-2 text-xs px-3 py-2 rounded-lg border w-full transition-all',
                isAnonymous
                  ? 'border-nile-orange/40 text-nile-orange bg-nile-orange/10'
                  : 'border-nile-blue/30 text-white/50 hover:text-white hover:border-white/20'
              )}>
              {isAnonymous ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {isAnonymous ? 'Anonymous' : 'Named bettor'}
            </button>

            {!isAnonymous && (
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold/40" />
                  <input
                    type="text"
                    value={bettorName}
                    onChange={e => setBettorName(e.target.value)}
                    placeholder="Bettor name"
                    className="w-full bg-charcoal border border-gold/20 rounded-lg pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-gold/50 placeholder:text-white/20"
                  />
                </div>
                {bettorName.trim() && (
                  <div className="bg-nile-blue/20 border border-nile-blue/30 rounded-lg px-3 py-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center flex-shrink-0">
                      <User className="w-2.5 h-2.5 text-gold" />
                    </div>
                    <p className="text-white text-xs font-semibold truncate">{bettorName}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1" />

            <div className="bg-charcoal/60 rounded-xl p-3 space-y-2 border border-white/5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Summary</p>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Progress</span>
                <span className={cn('font-mono', allSelected ? 'text-nile-success' : 'text-white')}>
                  {selectedCount}/{matches.length}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Entry fee</span>
                <span className="text-gold font-mono font-bold">{formatETB(jackpot.fixed_stake)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Win all</span>
                <span className="text-nile-success font-mono">{formatETB(jackpot.win_all_reward)}</span>
              </div>
              {jackpot.near_win_reward > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Miss 1</span>
                  <span className="text-white/60 font-mono">{formatETB(jackpot.near_win_reward)}</span>
                </div>
              )}
            </div>

            <button onClick={handlePlace} disabled={!canPlace}
              className={cn(
                'w-full py-3 rounded-xl text-sm font-bold transition-all',
                canPlace
                  ? 'bg-gold text-charcoal hover:bg-gold-light shadow-lg shadow-gold/20'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}>
              {placing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Placing...
                </span>
              ) : !allSelected
                ? `Pick ${matches.length - selectedCount} more`
                : !isAnonymous && !bettorName.trim()
                ? 'Enter bettor name'
                : `🏆 Place — ${formatETB(jackpot.fixed_stake)}`}
            </button>
          </div>
        </div>
      )}

      {/* SLIPS TAB */}
      {activeTab === 'slips' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingSlips ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
          ) : slips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Trophy className="w-10 h-10 text-gold/20" />
              <p className="text-white/30 text-sm">No slips placed yet</p>
            </div>
          ) : (
            slips.map(slip => <CashierSlipCard key={slip.id} slip={slip} />)
          )}
        </div>
      )}
    </div>
  )
}

function CashierSlipCard({ slip }: { slip: any }) {
  const [expanded, setExpanded] = useState(false)
  const selections = slip.jackpot_slip_selections?.sort(
    (a: any, b: any) => a.game_number - b.game_number
  ) ?? []

  const statusBorder =
    slip.status === 'won' ? 'border-gold/40 bg-gold/5'
    : slip.status === 'near_win' ? 'border-nile-success/30 bg-nile-success/5'
    : slip.status === 'lost' ? 'border-nile-danger/20'
    : 'border-nile-blue/20'

  return (
    <div className={cn('bg-slate-dark border rounded-xl overflow-hidden', statusBorder)}>
      {slip.status === 'won' && (
        <div className="bg-gold/20 border-b border-gold/30 px-4 py-1.5 text-center">
          <p className="text-gold font-bold text-xs">🏆 JACKPOT WINNER!</p>
        </div>
      )}
      {slip.status === 'near_win' && (
        <div className="bg-nile-success/10 border-b border-nile-success/20 px-4 py-1.5 text-center">
          <p className="text-nile-success font-semibold text-xs">🥈 11/12 Correct!</p>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-gold font-mono font-bold text-sm">#{slip.slip_id}</p>
            <p className="text-white/30 text-[10px]">
              {slip.is_anonymous ? 'Anonymous' : slip.bettor_name ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {slip.correct_count !== null && (
              <span className="text-white/60 text-xs bg-nile-blue/20 px-2 py-0.5 rounded-full font-mono">
                {slip.correct_count}/{selections.length || 12}
              </span>
            )}
            {slip.reward_amount > 0 && (
              <span className="text-nile-success text-xs font-mono">
                +{formatETB(slip.reward_amount)}
              </span>
            )}
            <button onClick={() => setExpanded(!expanded)}
              className="text-white/30 hover:text-white transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {expanded && (
          <div className="mt-2 space-y-1">
            {selections.map((sel: any) => {
              const match = sel.jackpot_matches
              const isCorrect = sel.result === 'correct'
              const isWrong = sel.result === 'wrong'
              return (
                <div key={sel.id} className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs',
                  isCorrect ? 'bg-nile-success/10' : isWrong ? 'bg-nile-danger/10' : 'bg-charcoal/40'
                )}>
                  <span className="text-white/50 truncate flex-1 text-[11px]">
                    {match?.home_team} vs {match?.away_team}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={cn(
                      'font-bold text-xs',
                      isCorrect ? 'text-nile-success' : isWrong ? 'text-nile-danger' : 'text-gold'
                    )}>
                      {sel.selection === 'home' ? '1' : sel.selection === 'away' ? '2' : 'X'}
                    </span>
                    {isCorrect && <CheckCircle className="w-3 h-3 text-nile-success" />}
                    {isWrong && <XCircle className="w-3 h-3 text-nile-danger" />}
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