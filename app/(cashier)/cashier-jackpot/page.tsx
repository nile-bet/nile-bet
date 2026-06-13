'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { placeJackpotBet, getJackpotSlipById } from '@/lib/actions/jackpot'
import { Trophy, Loader2, Lock, Unlock, User, CheckCircle, XCircle, ChevronDown, ChevronUp, Search, X, Printer, Zap } from 'lucide-react'
import { ThermalReceipt } from '@/components/cashier/ThermalReceipt'
import { usePrint } from '@/lib/hooks/usePrint'
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
  const receiptRef = useRef<HTMLDivElement>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [placedSlip, setPlacedSlip] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: jp } = await supabase.from('jackpots').select('*').in('status', ['open', 'draft']).order('created_at', { ascending: false }).limit(1).single()
      if (jp) {
        setJackpot(jp)
        const { data: m } = await supabase.from('jackpot_matches').select('*').eq('jackpot_id', jp.id).order('game_number', { ascending: true })
        setMatches(m ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const loadSlips = async () => {
    if (!jackpot) return
    setLoadingSlips(true)
    const { data } = await supabase.from('jackpot_slips').select('*, jackpot_slip_selections(*, jackpot_matches(home_team, away_team))').eq('jackpot_id', jackpot.id).order('created_at', { ascending: false }).limit(50)
    setSlips(data ?? [])
    setLoadingSlips(false)
  }

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); if (tab === 'slips') loadSlips() }
  const handleSelect = (gameNumber: number, sel: Selection) => setSelections(prev => ({ ...prev, [gameNumber]: sel }))
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
      toast.success(`🏆 Jackpot placed! Slip #${result.slipId}`)
      const savedBettorName = bettorName
      setTimeout(async () => {
        const slip = await getJackpotSlipById(result.slipId!)
        if (slip) {
          setPlacedSlip({ ...slip, _bettorName: savedBettorName })
          setShowPrintModal(true)
        }
      }, 1500)
      setSelections({}); setBettorName(''); setIsAnonymous(false)
    } else { toast.error(result.error ?? 'Failed') }
    setPlacing(false)
  }

  const handleSearchSlip = async () => {
    if (!slipSearchId.trim()) return
    setSearchingSlip(true); setSlipSearchError(''); setLoadedSlip(null)
    const slip = await getJackpotSlipById(slipSearchId.trim().toUpperCase())
    if (!slip) {
      setSlipSearchError('Slip not found')
    } else {
      const sels: Record<number, Selection> = {}
      ;(slip as any).jackpot_slip_selections?.forEach((s: any) => { sels[s.game_number] = s.selection as Selection })
      setSelections(sels)
      if ((slip as any).status !== 'pending') {
        setLoadedSlip({ ...(slip as any), _isCopy: true })
        toast.success('Selections copied! New slip ID will be assigned.')
      } else { setLoadedSlip(slip); toast.success('Slip loaded!') }
    }
    setSearchingSlip(false)
  }

  const handlePrint = usePrint(receiptRef, {
    documentTitle: `NILE-Jackpot-${placedSlip?.slip_id ?? ''}`,
    pageStyle: `@page { size: 80mm auto; margin: 0; } @media print { body { margin: 0; } .thermal-receipt { width: 80mm !important; } }`,
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
          <Trophy className="w-6 h-6" style={{ color: '#D4AF37' }} />
        </div>
        <p className="text-white/30 text-sm">Loading jackpot...</p>
      </div>
    </div>
  )

  if (!jackpot) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="p-5 rounded-2xl border border-[#D4AF37]/20" style={{ background: 'rgba(212,175,55,0.06)' }}>
        <Trophy className="w-10 h-10" style={{ color: 'rgba(212,175,55,0.3)' }} />
      </div>
      <p className="text-white/30 text-sm">No active jackpot</p>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

      {/* Print Modal */}
      {showPrintModal && placedSlip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] border border-[#D4AF37]/25" style={{ background: 'linear-gradient(160deg, #1A1F4D 0%, #252E6D 100%)' }}>
            <div className="flex items-center justify-between p-4 border-b border-[#252E6D]/60">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Printer className="w-5 h-5" style={{ color: '#D4AF37' }} /> Jackpot Receipt
              </h3>
              <button onClick={() => setShowPrintModal(false)} className="text-white/30 hover:text-white w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex gap-2">
              <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155' }}>
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button onClick={() => setShowPrintModal(false)} className="flex-1 py-2.5 rounded-xl text-sm transition-all border border-[#252E6D]/60 text-white/40 hover:text-white hover:border-white/20">
                Close
              </button>
            </div>
            <div className="overflow-auto flex-1 border-t border-[#252E6D]/40">
              <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', backgroundColor: 'white' }}>
                <ThermalReceipt
                  ref={receiptRef}
                  slipId={placedSlip.slip_id}
                  isJackpot={true}
                  stake={jackpot.fixed_stake}
                  placedAt={placedSlip.created_at ?? new Date().toISOString()}
                  bettorUsername={placedSlip._bettorName || undefined}
                  cashierUsername={user?.username}
                  isAnonymous={placedSlip.is_anonymous}
                  selections={(placedSlip.jackpot_slip_selections ?? []).sort((a: any, b: any) => a.game_number - b.game_number).map((s: any) => ({
                    matchName: `${s.jackpot_matches?.home_team ?? 'Home'} vs ${s.jackpot_matches?.away_team ?? 'Away'}`,
                    marketName: `Game ${s.game_number}`,
                    selection: s.selection === 'home' ? '1 Home' : s.selection === 'away' ? '2 Away' : 'X Draw',
                    odd: s.odd ?? 1,
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden px-5 py-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0f1422 0%, #1A1F4D 50%, #252E6D 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="absolute animate-pulse" style={{ top: `${10 + (i * 13) % 80}%`, left: `${5 + (i * 17) % 90}%`, fontSize: `${6 + (i % 3) * 4}px`, color: 'rgba(212,175,55,0.12)', animationDelay: `${i * 0.4}s` }}>★</div>
          ))}
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border border-[#D4AF37]/30" style={{ background: 'rgba(212,175,55,0.12)' }}>
              <Trophy className="w-5 h-5" style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">{jackpot.name}</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(212,175,55,0.6)' }}>Pick {matches.length} · Win Big</p>
            </div>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Win All</p>
              <p className="font-mono font-bold text-sm" style={{ color: '#FFD700' }}>{formatETB(jackpot.win_all_reward)}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Miss 1</p>
              <p className="font-mono font-bold text-sm text-white/70">{formatETB(jackpot.near_win_reward)}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">Entry</p>
              <p className="font-mono font-bold text-sm text-white">{formatETB(jackpot.fixed_stake)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-shrink-0 border-b border-[#252E6D]/60" style={{ background: '#1A1F4D' }}>
        {([{ key: 'pick', label: '🎯 Place Bet' }, { key: 'slips', label: "🎫 Today's Slips" }] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className="flex-1 py-2.5 text-xs font-bold transition-all border-b-2"
            style={activeTab === t.key ? { borderColor: '#D4AF37', color: '#FFD700' } : { borderColor: 'transparent', color: 'rgba(255,255,255,0.3)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PICK TAB */}
      {activeTab === 'pick' && (
        <div className="flex flex-1 overflow-hidden">

          {/* Left — matches */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background: '#0f1422' }}>

            {/* Search bar */}
            <div className="rounded-xl p-3 border border-[#D4AF37]/15" style={{ background: 'rgba(212,175,55,0.04)' }}>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-semibold">📋 Load Customer Slip</p>
              <div className="flex gap-2">
                <input type="text" value={slipSearchId} onChange={e => setSlipSearchId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchSlip()}
                  placeholder="JP12345678"
                  className="flex-1 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)', color: 'white' }} />
                <button onClick={handleSearchSlip} disabled={searchingSlip || !slipSearchId.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #FFD700)', color: '#1C2155' }}>
                  {searchingSlip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </button>
                {loadedSlip && <button onClick={() => { setLoadedSlip(null); setSlipSearchId(''); setSelections({}) }} className="px-2 rounded-lg text-white/30 hover:text-white transition-all" style={{ border: '1px solid rgba(255,255,255,0.1)' }}><X className="w-3.5 h-3.5" /></button>}
              </div>
              {slipSearchError && <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1"><XCircle className="w-3 h-3" />{slipSearchError}</p>}
              {loadedSlip && (
                <div className="mt-2 rounded-lg px-3 py-2 border" style={loadedSlip._isCopy ? { background: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.25)' } : { background: 'rgba(74,222,128,0.06)', borderColor: 'rgba(74,222,128,0.25)' }}>
                  <p className="text-[10px] font-semibold flex items-center gap-1" style={{ color: loadedSlip._isCopy ? '#fbbf24' : '#4ade80' }}>
                    <CheckCircle className="w-3 h-3" />
                    {loadedSlip._isCopy ? `Copied from #${loadedSlip.slip_id} — new ID on place` : `Slip #${loadedSlip.slip_id} loaded`}
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${matches.length ? (selectedCount / matches.length) * 100 : 0}%`, background: allSelected ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#D4AF37,#FFD700)' }} />
              </div>
              <span className="text-[11px] font-mono font-bold flex-shrink-0" style={{ color: allSelected ? '#4ade80' : '#D4AF37' }}>{selectedCount}/{matches.length}</span>
              {selectedCount > 0 && <button onClick={() => setSelections({})} className="text-[10px] text-white/20 hover:text-red-400 transition-colors">Clear</button>}
            </div>

            {/* Match cards */}
            {matches.map(m => {
              const sel = selections[m.game_number]
              const result = m.result
              const isResulted = !!result && result !== 'pending'
              return (
                <div key={m.id} className="rounded-xl p-3 transition-all border" style={
                  isResulted && result === sel ? { background: 'rgba(74,222,128,0.06)', borderColor: 'rgba(74,222,128,0.3)' } :
                  isResulted && result !== sel && sel ? { background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' } :
                  sel ? { background: 'rgba(212,175,55,0.06)', borderColor: 'rgba(212,175,55,0.25)' } :
                  { background: 'rgba(26,31,77,0.8)', borderColor: 'rgba(37,46,109,0.6)' }
                }>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: 'rgba(212,175,55,0.7)', border: '1px solid rgba(212,175,55,0.2)' }}>GAME {m.game_number}</span>
                    {isResulted && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border" style={
                        result === 'home' ? { color: '#FFD700', borderColor: 'rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.1)' } :
                        result === 'away' ? { color: '#4A90D9', borderColor: 'rgba(74,144,217,0.4)', background: 'rgba(74,144,217,0.1)' } :
                        { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }
                      }>{result === 'home' ? '1' : result === 'away' ? '2' : 'X'} Result</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2.5 px-0.5">
                    <span className="text-white font-bold text-xs flex-1 truncate">{m.home_team}</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full mx-2 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>VS</span>
                    <span className="text-white font-bold text-xs flex-1 text-right truncate">{m.away_team}</span>
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
                        <button key={opt.key} onClick={() => handleSelect(m.game_number, opt.key)}
                          className="flex flex-col items-center py-2.5 rounded-xl transition-all"
                          style={
                            isCorrect ? { background: 'rgba(74,222,128,0.18)', border: '1.5px solid #4ade80', color: '#4ade80' } :
                            isWrong ? { background: 'rgba(239,68,68,0.15)', border: '1.5px solid #ef4444', color: '#ef4444' } :
                            isSelected ? { background: 'linear-gradient(135deg,rgba(212,175,55,0.25),rgba(255,215,0,0.12))', border: '1.5px solid #D4AF37', color: '#FFD700' } :
                            { background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(37,46,109,0.7)', color: 'rgba(255,255,255,0.4)' }
                          }>
                          <span className="text-sm font-black leading-none">{opt.label}</span>
                          <span className="text-[9px] mt-0.5 opacity-60 uppercase tracking-wide">{opt.sublabel}</span>
                          {opt.odd && <span className="text-[10px] font-mono font-bold mt-1">{opt.odd?.toFixed(2)}</span>}
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

          {/* Right — Slip Builder */}
          <div className="w-64 flex-shrink-0 flex flex-col border-l border-[#252E6D]/60 overflow-y-auto" style={{ background: 'linear-gradient(160deg, #1A1F4D 0%, #0f1422 100%)' }}>

            {/* Slip header */}
            <div className="p-3 border-b border-[#252E6D]/50 flex-shrink-0" style={{ background: 'rgba(212,175,55,0.04)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(212,175,55,0.7)' }}>🏆 Jackpot Slip</p>
                {selectedCount > 0 && <button onClick={() => setSelections({})} className="text-[10px] text-white/20 hover:text-red-400 transition-colors">Clear</button>}
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-white/30">Selections</span>
                <span className="text-[11px] font-mono font-bold" style={{ color: allSelected ? '#4ade80' : '#D4AF37' }}>{selectedCount}/{matches.length}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(selectedCount / matches.length) * 100}%`, background: allSelected ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#D4AF37,#FFD700)' }} />
              </div>
            </div>

            {/* Picks list */}
            <div className="flex-1 overflow-y-auto py-1.5 scrollbar-hide">
              {matches.map(m => {
                const pick = selections[m.game_number]
                return (
                  <div key={m.game_number} className="flex items-center gap-2 px-3 py-1.5 border-b border-[#252E6D]/20 last:border-0">
                    <span className="text-[10px] font-bold w-5 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.5)' }}>G{m.game_number}</span>
                    <span className="text-white/50 text-[10px] truncate flex-1">{m.home_team} <span className="text-white/20">v</span> {m.away_team}</span>
                    {pick ? (
                      <span className="text-[10px] font-black w-6 text-center px-1 py-0.5 rounded-lg flex-shrink-0" style={
                        pick === 'home' ? { background: 'rgba(212,175,55,0.2)', color: '#FFD700', border: '1px solid rgba(212,175,55,0.3)' } :
                        pick === 'draw' ? { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' } :
                        { background: 'rgba(74,144,217,0.2)', color: '#4A90D9', border: '1px solid rgba(74,144,217,0.3)' }
                      }>{pick === 'home' ? '1' : pick === 'draw' ? 'X' : '2'}</span>
                    ) : (
                      <span className="text-[10px] text-white/15 w-6 text-center" style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '6px', padding: '1px 2px' }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Load slip section */}
            <div className="p-3 border-t border-[#252E6D]/40 flex-shrink-0 space-y-2" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Load Slip Code</p>
              <div className="flex gap-1.5">
                <input type="text" value={slipSearchId} onChange={e => { setSlipSearchId(e.target.value.toUpperCase()); setSlipSearchError(''); setLoadedSlip(null) }} onKeyDown={e => e.key === 'Enter' && handleSearchSlip()}
                  placeholder="JP12345678"
                  className="flex-1 rounded-lg px-2.5 py-2 text-white text-[11px] font-mono focus:outline-none placeholder:text-white/15"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.2)' }} />
                <button onClick={handleSearchSlip} disabled={searchingSlip || !slipSearchId.trim()}
                  className="px-2.5 py-2 rounded-lg transition-all disabled:opacity-40"
                  style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                  {searchingSlip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </button>
                {(loadedSlip || slipSearchId) && (
                  <button onClick={() => { setSlipSearchId(''); setLoadedSlip(null); setSlipSearchError(''); setSelections({}) }}
                    className="px-2 rounded-lg text-white/20 hover:text-white/60 transition-all" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {slipSearchError && <p className="text-red-400 text-[10px] flex items-center gap-1"><XCircle className="w-3 h-3" />{slipSearchError}</p>}
              {loadedSlip && (
                <div className="rounded-lg px-2.5 py-2 border" style={loadedSlip._isCopy ? { background: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.2)' } : { background: 'rgba(74,222,128,0.06)', borderColor: 'rgba(74,222,128,0.2)' }}>
                  <p className="text-[10px] font-semibold" style={{ color: loadedSlip._isCopy ? '#fbbf24' : '#4ade80' }}>
                    {loadedSlip._isCopy ? `Copying from #${loadedSlip.slip_id}` : `Loaded #${loadedSlip.slip_id}`}
                  </p>
                </div>
              )}
            </div>

            {/* Place For section */}
            <div className="p-3 border-t border-[#252E6D]/40 flex-shrink-0 space-y-2" style={{ background: 'rgba(0,0,0,0.1)' }}>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Place For</p>
              <button onClick={() => { setIsAnonymous(!isAnonymous); setBettorName('') }}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl border w-full transition-all"
                style={isAnonymous ? { borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24', background: 'rgba(251,191,36,0.08)' } : { borderColor: 'rgba(37,46,109,0.8)', color: 'rgba(255,255,255,0.4)' }}>
                {isAnonymous ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {isAnonymous ? 'Anonymous' : 'Named bettor'}
              </button>
              {!isAnonymous && (
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(212,175,55,0.4)' }} />
                  <input type="text" value={bettorName} onChange={e => setBettorName(e.target.value)} placeholder="Bettor name"
                    className="w-full rounded-xl pl-8 pr-3 py-2 text-white text-xs focus:outline-none placeholder:text-white/15"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.2)' }} />
                </div>
              )}
              {!isAnonymous && bettorName.trim() && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#252E6D]/60" style={{ background: 'rgba(37,46,109,0.3)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
                    <User className="w-2.5 h-2.5" style={{ color: '#D4AF37' }} />
                  </div>
                  <p className="text-white text-xs font-semibold truncate">{bettorName}</p>
                </div>
              )}
            </div>

            {/* Summary + Place button */}
            <div className="p-3 border-t border-[#252E6D]/40 flex-shrink-0 space-y-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="rounded-xl p-3 space-y-1.5 border border-[#D4AF37]/10" style={{ background: 'rgba(212,175,55,0.05)' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Entry Fee</span>
                  <span className="font-mono font-bold" style={{ color: '#FFD700' }}>{formatETB(jackpot.fixed_stake)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Win All 12</span>
                  <span className="font-mono" style={{ color: '#4ade80' }}>{formatETB(jackpot.win_all_reward)}</span>
                </div>
                {jackpot.near_win_reward > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Miss 1</span>
                    <span className="font-mono text-white/50">{formatETB(jackpot.near_win_reward)}</span>
                  </div>
                )}
              </div>
              <button onClick={handlePlace} disabled={!canPlace}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={canPlace ? { background: 'linear-gradient(135deg,#D4AF37,#FFD700)', color: '#1C2155', boxShadow: '0 4px 20px rgba(212,175,55,0.3)' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}>
                {placing ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Placing...</span>
                ) : !allSelected ? `Pick ${matches.length - selectedCount} more`
                  : !isAnonymous && !bettorName.trim() ? 'Enter bettor name'
                  : `🏆 Place — ${formatETB(jackpot.fixed_stake)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIPS TAB */}
      {activeTab === 'slips' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background: '#0f1422' }}>
          {loadingSlips ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#D4AF37' }} />
            </div>
          ) : slips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Trophy className="w-10 h-10" style={{ color: 'rgba(212,175,55,0.2)' }} />
              <p className="text-white/30 text-sm">No slips placed yet</p>
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

  return (
    <div className="rounded-xl overflow-hidden border transition-all" style={
      slip.status === 'won' ? { borderColor: 'rgba(212,175,55,0.4)', background: 'linear-gradient(135deg,rgba(212,175,55,0.06),#1A1F4D)' } :
      slip.status === 'near_win' ? { borderColor: 'rgba(74,222,128,0.3)', background: 'linear-gradient(135deg,rgba(74,222,128,0.04),#1A1F4D)' } :
      slip.status === 'lost' ? { borderColor: 'rgba(239,68,68,0.2)', background: '#1A1F4D' } :
      { borderColor: 'rgba(37,46,109,0.7)', background: 'linear-gradient(135deg,#1A1F4D,#0f1422)' }
    }>
      {slip.status === 'won' && <div className="px-4 py-1.5 text-center border-b border-[#D4AF37]/20" style={{ background: 'rgba(212,175,55,0.1)' }}><p className="font-bold text-xs" style={{ color: '#FFD700' }}>🏆 JACKPOT WINNER!</p></div>}
      {slip.status === 'near_win' && <div className="px-4 py-1.5 text-center border-b border-green-500/20" style={{ background: 'rgba(74,222,128,0.06)' }}><p className="font-semibold text-xs text-green-400">🥈 11/12 Correct!</p></div>}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-mono font-bold text-sm" style={{ color: '#D4AF37' }}>#{slip.slip_id}</p>
            <p className="text-white/30 text-[10px] mt-0.5">{slip.is_anonymous ? 'Anonymous' : slip.bettor_name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            {slip.correct_count !== null && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold" style={{ background: 'rgba(37,46,109,0.6)', color: '#D4AF37' }}>{slip.correct_count}/{selections.length || 12}</span>
            )}
            {slip.reward_amount > 0 && <span className="text-xs font-mono font-bold" style={{ color: '#4ade80' }}>+{formatETB(slip.reward_amount)}</span>}
            <button onClick={() => setExpanded(!expanded)} className="text-white/20 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10">
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
                <div key={sel.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border" style={
                  isCorrect ? { background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)' } :
                  isWrong ? { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' } :
                  { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(37,46,109,0.4)' }
                }>
                  <span className="text-white/40 truncate flex-1 text-[11px]">
                    <span className="font-mono mr-1.5" style={{ color: 'rgba(212,175,55,0.4)' }}>G{sel.game_number}</span>
                    {match?.home_team} vs {match?.away_team}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-black text-xs px-1.5 py-0.5 rounded-lg" style={
                      isCorrect ? { color: '#4ade80', background: 'rgba(74,222,128,0.15)' } :
                      isWrong ? { color: '#ef4444', background: 'rgba(239,68,68,0.15)' } :
                      { color: '#FFD700', background: 'rgba(212,175,55,0.15)' }
                    }>{sel.selection === 'home' ? '1' : sel.selection === 'away' ? '2' : 'X'}</span>
                    {isCorrect && <CheckCircle className="w-3 h-3 text-green-400" />}
                    {isWrong && <XCircle className="w-3 h-3 text-red-400" />}
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
