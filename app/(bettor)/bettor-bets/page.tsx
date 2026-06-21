'use client'

import { useState, useEffect, useRef } from 'react'
import { redirect } from 'next/navigation'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { EmptyState }
  from '@/components/shared/EmptyState'
import { SkeletonSlipCard }
  from '@/components/shared/SkeletonCard'
import { SlipCard }
  from '@/components/bettor/SlipCard'
import {
  getMyBets,
  getMyJackpotBets,
} from '@/lib/actions/coupons'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { Ticket, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'near_win', label: 'Near Win 🛡️' },
  { key: 'jackpot', label: '🏆 Jackpot' },
]

export default function MyBetsPage() {
  const { user, isAuthenticated } =
    useAuthStore()
  const [activeTab, setActiveTab] =
    useState('all')
  const [slips, setSlips] = useState<any[]>([])
  const [jackpotSlips, setJackpotSlips] =
    useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    loadBets()
  }, [user, activeTab, page])

  const loadBets = async () => {
    if (!user) return
    setLoading(true)

    if (activeTab === 'jackpot') {
      const data =
        await getMyJackpotBets(user.id)
      setJackpotSlips(data)
    } else {
      const { slips: data, total: t } =
        await getMyBets(user.id, {
          status:
            activeTab === 'all'
              ? undefined
              : activeTab,
          page,
          limit: 10,
        })
      setSlips(data)
      setTotal(t)
    }

    setLoading(false)
  }

  if (!isAuthenticated && !user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-white mb-6">
          My Bets
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6 pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setPage(1)
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.key
                  ? 'bg-gold text-charcoal'
                  : 'bg-slate-dark text-white/60 hover:text-white border border-nile-blue/30'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonSlipCard key={i} />
            ))}
          </div>
        ) : activeTab === 'jackpot' ? (
          jackpotSlips.length === 0 ? (
            <EmptyState
              title="No jackpot entries"
              message="Your jackpot entries will appear here"
              icon={Ticket}
            />
          ) : (
            <div className="space-y-4">
              {jackpotSlips.map((js) => (
                <JackpotSlipCard key={js.id} slip={js} />
              ))}
            </div>
          )
        ) : slips.length === 0 ? (
          <EmptyState
            title="No bets found"
            message="Your bets will appear here once you start betting"
            icon={Ticket}
          />
        ) : (
          <div className="space-y-4">
            {slips.map((slip) => (
              <SlipCard
                key={slip.id}
                slip={slip}
                onRefresh={loadBets}
              />
            ))}

            {/* Pagination */}
            {total > 10 && (
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.max(1, p - 1)
                    )
                  }
                  disabled={page === 1}
                  className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
                >
                  ← Prev
                </button>
                <span className="text-white/50 text-sm py-2">
                  Page {page} of{' '}
                  {Math.ceil(total / 10)}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => p + 1)
                  }
                  disabled={
                    page >= Math.ceil(total / 10)
                  }
                  className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
                >
                  Next &#8594;
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function JackpotSlipCard({ slip }: { slip: any }) {
  const [expanded, setExpanded] = useState(false)
  const selections = slip.jackpot_slip_selections?.sort(
    (a: any, b: any) => a.game_number - b.game_number
  ) ?? []

  const placedAt = slip.created_at ? new Date(slip.created_at) : null
  const dateStr = placedAt?.toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
  const timeStr = placedAt?.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="rounded-2xl overflow-hidden border transition-all" style={
      slip.status === 'won' ? { borderColor: 'rgba(212,175,55,0.4)', background: 'linear-gradient(135deg,rgba(212,175,55,0.06),#1A1F4D)' } :
      slip.status === 'near_win' ? { borderColor: 'rgba(74,222,128,0.3)', background: 'linear-gradient(135deg,rgba(74,222,128,0.04),#1A1F4D)' } :
      slip.status === 'lost' ? { borderColor: 'rgba(239,68,68,0.2)', background: '#1A1F4D' } :
      { borderColor: 'rgba(37,46,109,0.8)', background: 'linear-gradient(135deg,#1A1F4D,#1C2155)' }
    }>
      {slip.status === 'won' && (
        <div className="px-4 py-2 text-center border-b border-[#D4AF37]/20" style={{ background: 'rgba(212,175,55,0.1)' }}>
          <p className="font-bold text-sm" style={{ color: '#FFD700' }}>🏆 JACKPOT WINNER!</p>
        </div>
      )}
      {slip.status === 'near_win' && (
        <div className="px-4 py-2 text-center border-b border-green-500/20" style={{ background: 'rgba(74,222,128,0.06)' }}>
          <p className="font-semibold text-sm text-green-400">🥈 Near Win — 11/12!</p>
        </div>
      )}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-mono font-bold text-base" style={{ color: '#D4AF37' }}>#{slip.slip_id}</p>
            <p className="text-white/40 text-xs mt-0.5">{slip.jackpots?.name}</p>
            <p className="text-white/25 text-[10px] mt-0.5 font-mono">{dateStr} · {timeStr}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold border" style={
              slip.status === 'won' ? { color: '#FFD700', borderColor: 'rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.1)' } :
              slip.status === 'near_win' ? { color: '#4ade80', borderColor: 'rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.1)' } :
              slip.status === 'lost' ? { color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)' } :
              { color: '#4A90D9', borderColor: 'rgba(74,144,217,0.4)', background: 'rgba(74,144,217,0.1)' }
            }>{slip.status.toUpperCase()}</span>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(37,46,109,0.6)', color: slip.status !== 'pending' ? '#D4AF37' : 'rgba(255,255,255,0.4)' }}>
              {slip.correct_count !== null && slip.status !== 'pending' ? `${slip.correct_count}/12` : `${selections.length}/12 picks`}
            </span>
            {(slip.reward_amount ?? 0) > 0 && (
              <span className="text-xs font-mono font-bold" style={{ color: '#4ade80' }}>+{slip.reward_amount?.toLocaleString('en-ET', { style: 'currency', currency: 'ETB' })}</span>
            )}
          </div>
        </div>

        {/* Expand button */}
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-[#252E6D]/60 text-white/40 hover:text-white hover:border-[#D4AF37]/30 mb-0">
          <span>{expanded ? 'Hide Picks' : `View ${selections.length} Picks`}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Picks list */}
        {expanded && (
          <div className="mt-2 space-y-1.5">
            {selections.map((sel: any) => {
              const match = sel.jackpot_matches
              const isCorrect = sel.result === 'correct'
              const isWrong = sel.result === 'wrong'
              return (
                <div key={sel.id} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs border" style={
                  isCorrect ? { background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)' } :
                  isWrong ? { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' } :
                  { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(37,46,109,0.4)' }
                }>
                  <span className="text-white/50 truncate flex-1">
                    <span className="font-mono font-bold mr-2 text-[10px]" style={{ color: 'rgba(212,175,55,0.6)' }}>G{sel.game_number}</span>
                    {match?.home_team ?? '—'} <span className="text-white/25">vs</span> {match?.away_team ?? '—'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className="font-black px-2 py-0.5 rounded-lg text-[11px]" style={
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
