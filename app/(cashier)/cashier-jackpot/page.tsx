'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { placeJackpotBet, getJackpotSlipById } from '@/lib/actions/jackpot'
import { Trophy, Loader2, Lock, Unlock, User, CheckCircle, XCircle, ChevronDown, ChevronUp, Search, X, Printer, Clock, Star } from 'lucide-react'
import { ThermalReceipt } from '@/components/cashier/ThermalReceipt'
import { FlagImage } from '@/components/shared/FlagImage'
import { usePrint } from '@/lib/hooks/usePrint'
import { formatETB } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Selection = 'home' | 'draw' | 'away'
type Tab = 'pick' | 'slips'

const G = '#D4AF37'        // --color-gold
const GOLD = 'rgba(212,175,55,'
const BLUE = 'rgba(37,46,109,'   // --color-nile-blue
const BG = '#101534'             // body background
const CARD = '#1A1F4D'           // --color-slate-dark
const CARD2 = '#1C2155'         // --color-charcoal

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
  const receiptRef = useRef<HTMLDivElement>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [placedSlip, setPlacedSlip] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: jp } = await supabase.from('jackpots').select('*').in('status', ['open', 'draft']).order('created_at', { ascending: false }).limit(1).single()
      if (jp) {
        setJackpot(jp)
        const { data: m } = await supabase.from('jackpot_matches').select('*, leagues (name, countries (name, flag_emoji))').eq('jackpot_id', jp.id).order('game_number', { ascending: true })
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
      .select(`*, jackpots(id,name,status,fixed_stake,win_all_reward,near_win_reward), bettor:profiles!jackpot_slips_bettor_id_fkey(username), jackpot_slip_selections(id,game_number,selection,result,jackpot_matches(game_number,home_team,away_team,kick_off_time,result))`)
      .eq('jackpot_id', jackpot.id)
      .order('created_at', { ascending: false })
      .limit(200)
    setSlips(data ?? [])
    setLoadingSlips(false)
  }

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); if (tab === 'slips') loadSlips() }
  const handleSelect = (gn: number, sel: Selection) => setSelections(prev => ({ ...prev, [gn]: sel }))
  const selectedCount = Object.keys(selections).length
  const allSelected = selectedCount === matches.length && matches.length > 0
  const canPlace = allSelected && !placing && (isAnonymous || bettorName.trim().length > 0)

  const handlePlace = async () => {
    if (!user || !jackpot || !allSelected) return
    setPlacing(true)
    const result = await placeJackpotBet({
      jackpotId: jackpot.id, bettorId: user.id, placedById: user.id, isAnonymous,
      selections: matches.map(m => ({ gameNumber: m.game_number, selection: selections[m.game_number], odd: selections[m.game_number] === 'home' ? m.home_odd : selections[m.game_number] === 'draw' ? m.draw_odd : m.away_odd })),
    })
    if (result.success && result.slipId) {
      toast.success(`🏆 Slip #${result.slipId} placed!`)
      const savedBettorName = bettorName
      setTimeout(async () => {
        const slip = await getJackpotSlipById(result.slipId!)
        if (slip) { setPlacedSlip({ ...slip, _bettorName: savedBettorName }); setShowPrintModal(true) }
      }, 1800)
      setSelections({}); setBettorName(''); setIsAnonymous(false)
    } else { toast.error(result.error ?? 'Failed') }
    setPlacing(false)
  }

  const handleSearchSlip = async () => {
    if (!slipSearchId.trim()) return
    setSearchingSlip(true); setSlipSearchError(''); setLoadedSlip(null)
    const slip = await getJackpotSlipById(slipSearchId.trim().toUpperCase())
    if (!slip) { setSlipSearchError('Slip not found') }
    else {
      const sels: Record<number, Selection> = {}
      ;(slip as any).jackpot_slip_selections?.forEach((s: any) => { sels[s.game_number] = s.selection as Selection })
      setSelections(sels)
      if ((slip as any).status !== 'pending') { setLoadedSlip({ ...(slip as any), _isCopy: true }); toast.success('Selections copied!') }
      else { setLoadedSlip(slip); toast.success('Slip loaded!') }
    }
    setSearchingSlip(false)
  }

  const handlePrint = usePrint(receiptRef, {
    documentTitle: `NILE-Jackpot-${placedSlip?.slip_id ?? ''}`,
    pageStyle: `@page{size:80mm auto;margin:0}@media print{body{margin:0}.thermal-receipt{width:80mm!important}}`,
  })

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: '#101534' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{ background: GOLD + '0.12)', border: `1px solid ${GOLD}0.25)` }}>
          <Trophy className="w-5 h-5" style={{ color: G }} />
        </div>
        <p className="text-white/30 text-xs">Loading jackpot...</p>
      </div>
    </div>
  )

  if (!jackpot) return (
    <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: '#101534' }}>
      <Trophy className="w-10 h-10" style={{ color: GOLD + '0.2)' }} />
      <p className="text-white/30 text-sm">No active jackpot</p>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden" style={{ background: '#101534' }}>

      {/* Print Modal */}
      {showPrintModal && placedSlip && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl w-full max-w-xs shadow-2xl flex flex-col max-h-[88vh] border" style={{ background: 'linear-gradient(160deg,#1A1F4D,#1C2155)', borderColor: GOLD + '0.25)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BLUE + '0.5)' }}>
              <p className="text-white font-bold text-sm flex items-center gap-2"><Printer className="w-4 h-4" style={{ color: G }} /> Receipt</p>
              <button onClick={() => setShowPrintModal(false)} className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-2 p-3">
              <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold" style={{ background: `linear-gradient(135deg,${G},#FFD700)`, color: '#111' }}>
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button onClick={() => setShowPrintModal(false)} className="flex-1 py-2 rounded-lg text-xs text-white/40 hover:text-white border transition-all" style={{ borderColor: BLUE + '0.6)' }}>Close</button>
            </div>
            <div className="overflow-auto flex-1 border-t" style={{ borderColor: BLUE + '0.4)' }}>
              <div style={{ transform: 'scale(0.82)', transformOrigin: 'top center', background: 'white' }}>
                <ThermalReceipt ref={receiptRef} slipId={placedSlip.slip_id} isJackpot={true} stake={jackpot.fixed_stake}
                  placedAt={placedSlip.created_at ?? new Date().toISOString()}
                  bettorUsername={placedSlip._bettorName || undefined}
                  cashierUsername={user?.username} isAnonymous={placedSlip.is_anonymous}
                  selections={(placedSlip.jackpot_slip_selections ?? []).sort((a: any, b: any) => a.game_number - b.game_number).map((s: any) => ({
                    matchName: `${s.jackpot_matches?.home_team ?? 'Home'} vs ${s.jackpot_matches?.away_team ?? 'Away'}`,
                    marketName: `Game ${s.game_number}`,
                    selection: s.selection === 'home' ? '1 Home' : s.selection === 'away' ? '2 Away' : 'X Draw',
                    odd: 1,
                  }))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-b" style={{ background: 'linear-gradient(90deg,#1A1F4D,#1C2155)', borderColor: GOLD + '0.2)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: GOLD + '0.12)', border: `1px solid ${GOLD}0.25)` }}>
            <Trophy className="w-4 h-4" style={{ color: G }} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{jackpot.name}</p>
            <p className="text-[10px]" style={{ color: GOLD + '0.5)' }}>Pick {matches.length} · {jackpot.status === 'open' ? '🟢 Open' : '🟡 Draft'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-widest">Win All</p>
            <p className="font-mono font-bold text-xs" style={{ color: G }}>{formatETB(jackpot.win_all_reward)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-widest">Miss 1</p>
            <p className="font-mono text-xs text-white/50">{formatETB(jackpot.near_win_reward)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase tracking-widest">Entry</p>
            <p className="font-mono font-bold text-xs text-white">{formatETB(jackpot.fixed_stake)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-shrink-0 border-b" style={{ background: '#1C2155', borderColor: BLUE + '0.6)' }}>
        {([{ key: 'pick', label: '🎯 Place Bet' }, { key: 'slips', label: '🎫 Weekly Slips' }] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className="flex-1 py-2 text-xs font-bold tracking-wide transition-all border-b-2"
            style={activeTab === t.key ? { borderColor: G, color: G, background: GOLD + '0.04)' } : { borderColor: 'transparent', color: 'rgba(255,255,255,0.25)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PICK TAB */}
      {activeTab === 'pick' && (
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — Match List */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#101534' }}>
            {/* Search bar */}
            <div className="px-3 pt-2.5 pb-2">
              <div className="flex gap-1.5">
                <input type="text" value={slipSearchId}
                  onChange={e => { setSlipSearchId(e.target.value.toUpperCase()); setSlipSearchError(''); setLoadedSlip(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleSearchSlip()}
                  placeholder="Load slip code (JP12345678)"
                  className="flex-1 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none placeholder:text-white/15"
                  style={{ background: '#1C2155', border: `1px solid ${GOLD}0.2)` }} />
                <button onClick={handleSearchSlip} disabled={searchingSlip || !slipSearchId.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                  style={{ background: GOLD + '0.15)', border: `1px solid ${GOLD}0.3)`, color: G }}>
                  {searchingSlip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </button>
                {(loadedSlip || slipSearchId) && (
                  <button onClick={() => { setSlipSearchId(''); setLoadedSlip(null); setSlipSearchError(''); setSelections({}) }}
                    className="px-2 rounded-lg text-white/20 hover:text-white/60 transition-all" style={{ border: `1px solid ${BLUE}0.5)` }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {slipSearchError && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" />{slipSearchError}</p>}
              {loadedSlip && (
                <div className="mt-1.5 rounded-lg px-2.5 py-1.5 border text-[10px] font-semibold flex items-center gap-1.5"
                  style={loadedSlip._isCopy ? { background: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.25)', color: '#fbbf24' } : { background: 'rgba(74,222,128,0.06)', borderColor: 'rgba(74,222,128,0.25)', color: '#4ade80' }}>
                  <CheckCircle className="w-3 h-3" />
                  {loadedSlip._isCopy ? `Copied from #${loadedSlip.slip_id}` : `Loaded #${loadedSlip.slip_id}`}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="px-3 pb-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${matches.length ? (selectedCount / matches.length) * 100 : 0}%`, background: allSelected ? 'linear-gradient(90deg,#4ade80,#22c55e)' : `linear-gradient(90deg,${G},#FFD700)` }} />
              </div>
              <span className="text-[10px] font-mono font-bold flex-shrink-0" style={{ color: allSelected ? '#4ade80' : G }}>{selectedCount}/{matches.length}</span>
              {selectedCount > 0 && <button onClick={() => setSelections({})} className="text-[9px] text-white/20 hover:text-red-400 transition-colors">✕ Clear</button>}
            </div>

            {/* Match rows — compact table style */}
            <div className="px-2 pb-3 space-y-1">
              {matches.map((m, idx) => {
                const sel = selections[m.game_number]
                const result = m.result
                const isResulted = !!result && result !== 'pending'
                return (
                  <div key={m.id} className="rounded-lg overflow-hidden border transition-all"
                    style={{
                      borderColor: isResulted && result === sel ? 'rgba(74,222,128,0.3)' : isResulted && result !== sel && sel ? 'rgba(239,68,68,0.25)' : sel ? GOLD + '0.3)' : BLUE + '0.5)',
                      background: isResulted && result === sel ? 'rgba(74,222,128,0.04)' : isResulted && result !== sel && sel ? 'rgba(239,68,68,0.04)' : sel ? GOLD + '0.04)' : idx % 2 === 0 ? '#1A1F4D' : '#1C2155',
                    }}>
                    {/* Match info row */}
                    <div className="flex items-center px-2.5 py-1 gap-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <span className="text-[9px] font-bold font-mono flex-shrink-0 px-1.5 py-0.5 rounded" style={{ background: GOLD + '0.12)', color: GOLD + '0.7)' }}>G{m.game_number}</span>
                      {m.leagues?.countries?.flag_emoji && <FlagImage emoji={m.leagues.countries.flag_emoji} size="sm" />}
                      {m.leagues?.name && <span className="text-[9px] text-white/30 truncate flex-shrink-0 max-w-[80px]">{m.leagues.name}</span>}
                      <span className="text-white/15 text-[9px] font-mono flex-shrink-0 ml-auto">
                        {new Date(m.kick_off_time).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })} · {new Date(m.kick_off_time).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center px-2.5 py-1.5 gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <span className="text-white font-semibold text-xs flex-1 truncate">{m.home_team}</span>
                      <span className="text-white/20 text-[9px] flex-shrink-0">vs</span>
                      <span className="text-white/70 text-xs flex-1 text-right truncate">{m.away_team}</span>
                      {isResulted && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={result === 'home' ? { color: G, background: GOLD + '0.15)' } : result === 'away' ? { color: '#60a5fa', background: 'rgba(96,165,250,0.15)' } : { color: 'white', background: 'rgba(255,255,255,0.1)' }}>
                          {result === 'home' ? '1' : result === 'away' ? '2' : 'X'}✓
                        </span>
                      )}
                    </div>
                    {/* Odds row */}
                    <div className="grid grid-cols-3 gap-1 p-1.5">
                      {([
                        { key: 'home' as Selection, label: '1 Home', odd: m.home_odd },
                        { key: 'draw' as Selection, label: 'X Draw', odd: m.draw_odd },
                        { key: 'away' as Selection, label: '2 Away', odd: m.away_odd },
                      ]).map(opt => {
                        const isSelected = sel === opt.key
                        const isCorrect = isResulted && result === opt.key
                        const isWrong = isResulted && isSelected && result !== opt.key
                        return (
                          <button key={opt.key} onClick={() => handleSelect(m.game_number, opt.key)}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all"
                            style={
                              isCorrect ? { background: 'rgba(74,222,128,0.18)', border: '1.5px solid #4ade80' } :
                              isWrong ? { background: 'rgba(239,68,68,0.12)', border: '1.5px solid #ef4444' } :
                              isSelected ? { background: GOLD + '0.18)', border: `1.5px solid ${G}` } :
                              { background: 'rgba(255,255,255,0.04)', border: `1px solid ${BLUE}0.6)` }
                            }>
                            <span className="text-[11px] font-bold" style={{ color: isCorrect ? '#4ade80' : isWrong ? '#ef4444' : isSelected ? G : 'rgba(255,255,255,0.4)' }}>{opt.label}</span>
                            <span className="text-[11px] font-mono font-bold" style={{ color: isCorrect ? '#4ade80' : isWrong ? '#ef4444' : isSelected ? '#FFD700' : 'rgba(255,255,255,0.6)' }}>{opt.odd?.toFixed(2)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT — Slip Builder */}
          <div className="w-60 flex-shrink-0 flex flex-col border-l" style={{ background: 'linear-gradient(160deg,#1A1F4D,#101534)', borderColor: BLUE + '0.6)' }}>

            {/* Picks list */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="px-2 py-2 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: BLUE + '0.4)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD + '0.6)' }}>🏆 Slip</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold" style={{ color: allSelected ? '#4ade80' : G }}>{selectedCount}/{matches.length}</span>
                  {selectedCount > 0 && <button onClick={() => setSelections({})} className="text-[9px] text-white/20 hover:text-red-400 transition-colors">✕</button>}
                </div>
              </div>
              <div className="h-0.5 mx-2 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(selectedCount / Math.max(matches.length, 1)) * 100}%`, background: allSelected ? '#4ade80' : G }} />
              </div>
              {matches.map(m => {
                const pick = selections[m.game_number]
                return (
                  <div key={m.game_number} className="flex items-center gap-1.5 px-2 py-1.5 border-b last:border-0" style={{ borderColor: BLUE + '0.2)' }}>
                    <span className="text-[9px] font-mono font-bold w-5 flex-shrink-0 text-center" style={{ color: GOLD + '0.4)' }}>{m.game_number}</span>
                    <span className="text-white/40 text-[10px] truncate flex-1">{m.home_team} <span className="text-white/15">v</span> {m.away_team}</span>
                    {pick ? (
                      <span className="text-[10px] font-black w-6 text-center px-1 py-0.5 rounded flex-shrink-0"
                        style={pick === 'home' ? { background: GOLD + '0.18)', color: '#FFD700', border: `1px solid ${GOLD}0.3)` } : pick === 'draw' ? { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' } : { background: 'rgba(96,165,250,0.18)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                        {pick === 'home' ? '1' : pick === 'draw' ? 'X' : '2'}
                      </span>
                    ) : (
                      <span className="text-[9px] text-white/15 w-6 text-center rounded" style={{ border: `1px dashed ${BLUE}0.4)`, padding: '1px 2px' }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Load slip */}
            <div className="px-2 py-2 border-t space-y-1.5" style={{ borderColor: BLUE + '0.4)', background: 'rgba(0,0,0,0.2)' }}>
              <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">Load Slip</p>
              <div className="flex gap-1">
                <input type="text" value={slipSearchId}
                  onChange={e => { setSlipSearchId(e.target.value.toUpperCase()); setSlipSearchError(''); setLoadedSlip(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleSearchSlip()}
                  placeholder="JP12345678"
                  className="flex-1 rounded-lg px-2 py-1.5 text-white text-[10px] font-mono focus:outline-none placeholder:text-white/15"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${GOLD}0.2)` }} />
                <button onClick={handleSearchSlip} disabled={searchingSlip || !slipSearchId.trim()}
                  className="px-2 py-1.5 rounded-lg transition-all disabled:opacity-40"
                  style={{ background: GOLD + '0.12)', border: `1px solid ${GOLD}0.25)`, color: G }}>
                  {searchingSlip ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                </button>
                {(loadedSlip || slipSearchId) && (
                  <button onClick={() => { setSlipSearchId(''); setLoadedSlip(null); setSlipSearchError(''); setSelections({}) }}
                    className="px-2 rounded-lg text-white/20 hover:text-white/60" style={{ border: `1px solid ${BLUE}0.5)` }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {slipSearchError && <p className="text-red-400 text-[9px] flex items-center gap-1"><XCircle className="w-2.5 h-2.5" />{slipSearchError}</p>}
              {loadedSlip && (
                <p className="text-[9px] font-semibold flex items-center gap-1" style={{ color: loadedSlip._isCopy ? '#fbbf24' : '#4ade80' }}>
                  <CheckCircle className="w-2.5 h-2.5" />
                  {loadedSlip._isCopy ? `Copy #${loadedSlip.slip_id}` : `Loaded #${loadedSlip.slip_id}`}
                </p>
              )}
            </div>

            {/* Place For */}
            <div className="px-2 py-2 border-t space-y-1.5" style={{ borderColor: BLUE + '0.4)', background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">Place For</p>
              <button onClick={() => { setIsAnonymous(!isAnonymous); setBettorName('') }}
                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border w-full transition-all"
                style={isAnonymous ? { borderColor: 'rgba(251,191,36,0.35)', color: '#fbbf24', background: 'rgba(251,191,36,0.07)' } : { borderColor: BLUE + '0.6)', color: 'rgba(255,255,255,0.35)' }}>
                {isAnonymous ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {isAnonymous ? 'Anonymous' : 'Named bettor'}
              </button>
              {!isAnonymous && (
                <div className="relative">
                  <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: GOLD + '0.4)' }} />
                  <input type="text" value={bettorName} onChange={e => setBettorName(e.target.value)}
                    placeholder="Bettor name"
                    className="w-full rounded-lg pl-7 pr-2.5 py-1.5 text-white text-[10px] focus:outline-none placeholder:text-white/15"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${GOLD}0.2)` }} />
                </div>
              )}
            </div>

            {/* Summary + Place */}
            <div className="px-2 py-2 border-t space-y-2" style={{ borderColor: BLUE + '0.4)', background: 'rgba(0,0,0,0.25)' }}>
              <div className="rounded-lg p-2 space-y-1" style={{ background: GOLD + '0.05)', border: `1px solid ${GOLD}0.1)` }}>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/35">Entry</span>
                  <span className="font-mono font-bold" style={{ color: '#FFD700' }}>{formatETB(jackpot.fixed_stake)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/35">Win All</span>
                  <span className="font-mono text-green-400">{formatETB(jackpot.win_all_reward)}</span>
                </div>
                {jackpot.near_win_reward > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/35">Miss 1</span>
                    <span className="font-mono text-white/45">{formatETB(jackpot.near_win_reward)}</span>
                  </div>
                )}
              </div>
              <button onClick={handlePlace} disabled={!canPlace}
                className="w-full py-2.5 rounded-xl text-xs font-black tracking-wide transition-all"
                style={canPlace
                  ? { background: `linear-gradient(135deg,${G},#FFD700)`, color: '#111', boxShadow: '0 4px 16px rgba(212,175,55,0.25)' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.15)', cursor: 'not-allowed' }}>
                {placing ? <span className="flex items-center justify-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Placing...</span>
                  : !allSelected ? `Pick ${matches.length - selectedCount} more`
                  : !isAnonymous && !bettorName.trim() ? 'Enter name'
                  : `🏆 Place — ${formatETB(jackpot.fixed_stake)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIPS TAB */}
      {activeTab === 'slips' && (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2" style={{ background: '#101534' }}>
          {/* Stats bar */}
          {!loadingSlips && slips.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 mb-1">
              {[
                { label: 'Total', value: slips.length, color: G, border: 'rgba(212,175,55,0.3)', bg: 'rgba(212,175,55,0.08)' },
                { label: 'Pending', value: slips.filter(s => s.status === 'pending').length, color: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.12)', bg: 'rgba(255,255,255,0.04)' },
                { label: 'Won', value: slips.filter(s => s.status === 'won').length, color: '#FFD700', border: 'rgba(212,175,55,0.35)', bg: 'rgba(212,175,55,0.1)' },
                { label: 'Near Win', value: slips.filter(s => s.status === 'near_win').length, color: '#4ade80', border: 'rgba(74,222,128,0.3)', bg: 'rgba(74,222,128,0.08)' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl px-2 py-2.5 text-center border" style={{ background: stat.bg, borderColor: stat.border }}>
                  <p className="font-mono font-black text-xl leading-none mb-1" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
          {loadingSlips ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: G }} />
            </div>
          ) : slips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Trophy className="w-8 h-8" style={{ color: GOLD + '0.2)' }} />
              <p className="text-white/25 text-xs">No slips this week</p>
            </div>
          ) : slips.map(slip => <CashierSlipCard key={slip.id} slip={slip} />)}
        </div>
      )}
    </div>
  )
}

function CashierSlipCard({ slip }: { slip: any }) {
  const [expanded, setExpanded] = useState(false)
  const selections = slip.jackpot_slip_selections?.sort((a: any, b: any) => a.game_number - b.game_number) ?? []
  const d = new Date(slip.created_at)
  const dateTime = d.toLocaleDateString('en-ET', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })
  const totalGames = selections.length || 12
  const statusCfg: Record<string, { color: string; bg: string; border: string; label: string }> = {
    won: { color: '#FFD700', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.35)', label: '🏆 WON' },
    near_win: { color: '#4ade80', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.25)', label: '🥈 NEAR WIN' },
    lost: { color: '#ef4444', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.2)', label: 'LOST' },
    pending: { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.02)', border: 'rgba(37,46,109,0.6)', label: 'PENDING' },
  }
  const st = statusCfg[slip.status] ?? statusCfg.pending

  return (
    <div className="rounded-xl overflow-hidden border transition-all" style={{ borderColor: st.border, background: st.bg }}>
      <div className="px-3 py-2.5">
        {/* Row 1: ID + status + score */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm" style={{ color: G }}>#{slip.slip_id}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: st.color, background: st.color + '18', border: `1px solid ${st.color}35` }}>{st.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {slip.correct_count !== null && (
              <span className="text-[10px] font-mono font-bold" style={{ color: slip.correct_count === totalGames ? '#4ade80' : G }}>
                {slip.correct_count}/{totalGames}
              </span>
            )}
            {(slip.reward_amount ?? 0) > 0 && (
              <span className="text-xs font-mono font-bold text-green-400">+{formatETB(slip.reward_amount)}</span>
            )}
          </div>
        </div>

        {/* Row 2: bettor + datetime + stake */}
        <div className="flex items-center justify-between text-[10px] text-white/30 mb-2">
          <div className="flex items-center gap-2">
            <span>{slip.is_anonymous ? '🔒 Anonymous' : `👤 ${slip.bettor_name ?? slip.bettor?.username ?? slip.placed_by ?? '—'}`}</span>
            <span className="text-white/15">·</span>
            <span>{dateTime}</span>
          </div>
          <span className="font-mono" style={{ color: 'rgba(212,175,55,0.5)' }}>{formatETB(slip.stake ?? slip.jackpots?.fixed_stake ?? 0)}</span>
        </div>

        {/* Expand button */}
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] transition-all"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)', color: 'rgba(212,175,55,0.6)' }}>
          <span className="font-semibold">{expanded ? '▲ Hide Picks' : `▼ View ${selections.length} Picks`}</span>
          <span className="font-mono">{selections.length}/12</span>
        </button>

        {/* Picks */}
        {expanded && (
          <div className="mt-2 space-y-0.5">
            {selections.map((sel: any) => {
              const match = sel.jackpot_matches
              const settled = match?.result && match.result !== 'pending'
              const isCorrect = settled ? sel.selection === match.result : sel.result === 'correct'
              const isWrong = settled ? sel.selection !== match.result : sel.result === 'wrong'
              const pick = sel.selection === 'home' ? '1' : sel.selection === 'away' ? '2' : 'X'
              return (
                <div key={sel.id} className="grid items-center px-2 py-1.5 rounded-lg border text-[10px]"
                  style={{
                    gridTemplateColumns: '20px 1fr 24px',
                    background: isCorrect ? 'rgba(74,222,128,0.06)' : isWrong ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                    borderColor: isCorrect ? 'rgba(74,222,128,0.18)' : isWrong ? 'rgba(239,68,68,0.18)' : 'rgba(37,46,109,0.35)',
                  }}>
                  <span className="font-mono font-bold text-[9px]" style={{ color: 'rgba(212,175,55,0.4)' }}>{sel.game_number}</span>
                  <span className="text-white/40 truncate">{match?.home_team ?? '—'} <span className="text-white/15">v</span> {match?.away_team ?? '—'}</span>
                  <span className="font-black text-center text-[11px] rounded px-0.5" style={
                    isCorrect ? { color: '#4ade80', background: 'rgba(74,222,128,0.15)' } :
                    isWrong ? { color: '#ef4444', background: 'rgba(239,68,68,0.15)' } :
                    { color: '#FFD700', background: 'rgba(212,175,55,0.15)' }
                  }>{pick}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
