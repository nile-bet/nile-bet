'use client'

import { useState, useEffect } from 'react'
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter'
import { getTopUsersReport } from '@/lib/actions/adminFinance'
import { DataTable } from '@/components/shared/DataTable'
import { StatsCard } from '@/components/shared/StatsCard'
import { formatETB } from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import { Users, TrendingUp, Ticket, Trophy } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function BettorReportPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'lifetime' })
  const [bettors, setBettors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [dateFilter])

  const loadData = async () => {
    setLoading(true)
    const now = new Date()
    const filters = dateFilter.type === 'custom'
      ? { startDate: dateFilter.startDate, endDate: dateFilter.endDate }
      : dateFilter.type === 'daily'
      ? (() => { const d = new Date(); d.setHours(0,0,0,0); return { startDate: d.toISOString(), endDate: now.toISOString() } })()
      : dateFilter.type === 'weekly'
      ? (() => { const d = new Date(); d.setDate(d.getDate()-7); return { startDate: d.toISOString(), endDate: now.toISOString() } })()
      : dateFilter.type === 'monthly'
      ? (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return { startDate: d.toISOString(), endDate: now.toISOString() } })()
      : { startDate: undefined, endDate: undefined }

    const data = await getTopUsersReport('bettors', filters)
    setBettors(data)
    setLoading(false)
  }

  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bettors.map((b: any) => ({
      Bettor: b.username,
      'Total Bets': b.slipCount,
      'Won': b.wonBets,
      'Lost': b.lostBets,
      'JP Won': b.jackpotWon,
      'JP Lost': b.jackpotLost,
      'Total Staked': b.totalStaked,
      'Win Rate': `${b.winRate?.toFixed(1)}%`,
    }))), 'Bettor Report')
    XLSX.writeFile(wb, `bettor-report-${dateFilter.type}.xlsx`)
  }

  const totals = {
    total: bettors.length,
    totalStaked: bettors.reduce((a, b) => a + (b.totalStaked ?? 0), 0),
    totalWon: bettors.reduce((a, b) => a + (b.wonBets ?? 0), 0),
    totalSlips: bettors.reduce((a, b) => a + (b.slipCount ?? 0), 0),
  }

  const top3 = bettors.slice(0, 3)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Bettor Report</h1>
        <button
          onClick={handleExport}
          disabled={!bettors.length}
          className="border border-gold/30 text-gold px-4 py-2 rounded-lg text-sm hover:bg-gold/10 disabled:opacity-40"
        >
          📊 Export Excel
        </button>
      </div>

      <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard title="Total Bettors" value={totals.total} icon={Users} />
          <StatsCard title="Total Slips" value={totals.totalSlips} icon={Ticket} />
          <StatsCard title="Total Staked" value={formatETB(totals.totalStaked)} icon={TrendingUp} variant="gold" />
          <StatsCard title="Total Won Bets" value={totals.totalWon} icon={Trophy} variant="success" />
        </div>
      )}

      {!loading && top3.length >= 3 && (
        <div className="bg-slate-dark border border-gold/20 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-6 text-center">🏆 Top Bettors Podium</h2>
          <div className="flex items-end justify-center gap-6">
            {[1, 0, 2].map((idx) => {
              const item = top3[idx]
              if (!item) return null
              const rank = idx + 1
              const medals = ['🥇', '🥈', '🥉']
              const heights = ['h-32', 'h-24', 'h-20']
              const colors = ['#FFD700', '#CBD5E1', '#D97706']
              const styles = [
                { background: 'linear-gradient(180deg,rgba(255,215,0,0.35),rgba(201,168,76,0.15))', borderColor: 'rgba(255,215,0,0.5)', boxShadow: '0 0 24px rgba(255,215,0,0.25)' },
                { background: 'linear-gradient(180deg,rgba(192,192,192,0.30),rgba(148,163,184,0.12))', borderColor: 'rgba(203,213,225,0.5)', boxShadow: '0 0 18px rgba(203,213,225,0.18)' },
                { background: 'linear-gradient(180deg,rgba(205,127,50,0.32),rgba(180,83,9,0.12))', borderColor: 'rgba(217,119,6,0.5)', boxShadow: '0 0 18px rgba(217,119,6,0.18)' },
              ]
              return (
                <div key={idx} className="text-center">
                  <p className="text-2xl mb-1">{medals[idx]}</p>
                  <p className="text-white font-medium text-sm">@{item.username}</p>
                  <p className="text-gold font-mono text-xs">{formatETB(item.totalStaked ?? 0)}</p>
                  <p className="text-white/40 text-[10px]">{item.slipCount} bets · {item.winRate?.toFixed(1)}% win</p>
                  <div className={cn('mt-2 rounded-t-lg border w-24 flex items-start justify-center pt-2', heights[idx])} style={styles[idx]}>
                    <span className="font-black" style={{ fontSize: rank === 1 ? '2.25rem' : '1.75rem', color: colors[idx], textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>{rank}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">All Bettors</h2>
        <DataTable
          columns={[
            { key: 'username', label: 'Bettor', render: (v: any) => <span className="text-gold font-medium">@{v}</span> },
            { key: 'slipCount', label: 'Total Bets', sortable: true },
            { key: 'wonBets', label: 'Won', sortable: true, render: (v: any) => <span className="text-nile-success text-xs">{v}</span> },
            { key: 'lostBets', label: 'Lost', sortable: true, render: (v: any) => <span className="text-nile-danger text-xs">{v}</span> },
            { key: 'jackpotWon', label: 'JP Won', render: (v: any) => <span className="text-gold/80 text-xs">{v}</span> },
            { key: 'jackpotLost', label: 'JP Lost', render: (v: any) => <span className="text-white/40 text-xs">{v}</span> },
            { key: 'totalStaked', label: 'Staked', sortable: true, render: (v: any) => formatETB(v) },
            { key: 'winRate', label: 'Win Rate', sortable: true, render: (v: any) => (
              <span className={cn('text-xs font-mono', v >= 50 ? 'text-nile-success' : v < 30 ? 'text-nile-danger' : 'text-white/60')}>
                {v?.toFixed(1)}%
              </span>
            )},
          ]}
          data={bettors}
          isLoading={loading}
          emptyMessage="No bettor data"
        />
      </div>
    </div>
  )
}
