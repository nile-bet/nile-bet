'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { getAgentNetworkStats, getAgentReport, getAgentPayoutsReport } from '@/lib/actions/agent'
import { StatsCard } from '@/components/shared/StatsCard'
import { SkeletonStatCard } from '@/components/shared/SkeletonCard'
import { formatETB, formatTimeAgo } from '@/lib/utils/formatCurrency'
import { useAuthStore } from '@/lib/stores/authStore'
import {
  Wallet, Users, TrendingUp, Clock, Ticket,
  CheckCircle, XCircle, RefreshCw, DollarSign, ArrowUpRight,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

export default function AgentDashboard() {
  const { user } = useAuthStore()
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'lifetime' })
  const [payouts, setPayouts] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [jackpotExpanded, setJackpotExpanded] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => { if (user) loadData() }, [user, dateFilter])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase.from('activity_logs')
      .select('*, profiles(username, role)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setRecentActivity(data) })
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    if (dateFilter.type === 'custom') {
      startDate = dateFilter.startDate; endDate = dateFilter.endDate
    } else if (dateFilter.type === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); endDate = now.toISOString()
    } else if (dateFilter.type === 'weekly') {
      const d = new Date(now); d.setDate(d.getDate() - 7)
      startDate = d.toISOString(); endDate = now.toISOString()
    } else if (dateFilter.type === 'daily') {
      const d = new Date(now); d.setHours(0,0,0,0)
      startDate = d.toISOString(); endDate = now.toISOString()
    } else {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString(); endDate = now.toISOString()
    }

    const [statsData, reportData] = await Promise.all([
      getAgentNetworkStats(user.id, dateFilter as any),
      getAgentReport(user.id, { startDate, endDate }),
    ])
    const payoutsData = await getAgentPayoutsReport(user.id, dateFilter as any)
    setStats(statsData)
    setPayouts(payoutsData)
    setReport(reportData)
    setLoading(false)
  }

  const handleExport = () => {
    if (!stats || !report) return
    const wb = XLSX.utils.book_new()
    const summary = [
      { Metric: 'My Balance', Value: stats.myBalance },
      { Metric: 'Total Cashiers', Value: stats.totalCashiers },
      { Metric: 'Active Cashiers', Value: stats.activeCashiers },
      { Metric: 'Total Collected', Value: stats.totalCollected },
      { Metric: 'Total Paid Out', Value: stats.totalPaidOut },
      { Metric: 'Tax Collected', Value: stats.taxCollected },
      { Metric: 'Gross Profit', Value: stats.grossProfit },
      { Metric: 'Agent Profit (60%)', Value: stats.agentProfit },
      { Metric: 'Cashier Profit (40%)', Value: stats.cashierProfit },
      { Metric: 'Pending Liability', Value: stats.pendingLiability },
      { Metric: 'Total Slips', Value: stats.totalSlips },
      { Metric: 'Won Slips', Value: stats.wonSlips },
      { Metric: 'Lost Slips', Value: stats.lostSlips },
      { Metric: 'Pending Slips', Value: stats.pendingSlips },
      { Metric: 'In Progress Slips', Value: stats.inProgressSlips },
      { Metric: 'Insured Slips', Value: stats.insuredSlips },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary')
    if (report.cashierBreakdown?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.cashierBreakdown.map((c: any) => ({
        Cashier: c.username,
        Status: c.status,
        Balance: c.balance,
        Slips: c.slipCount,
        Collected: c.totalCollected,
        'Paid Out': c.totalPaid,
        'Gross Profit': c.grossProfit,
        'Agent Share (60%)': c.agentShare,
      }))), 'Cashier Breakdown')
    }
    if (report.trendData?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.trendData), 'Trend')
    }
    XLSX.writeFile(wb, `agent-report-${dateFilter.type}.xlsx`)
  }

  const isLowBalance = (stats?.myBalance ?? 0) < 1000

  return (
    <div className="p-6 space-y-6">
      {/* Low balance alert */}
      {!loading && isLowBalance && (
        <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-nile-danger font-semibold text-sm">⚠️ Low Balance Warning</p>
            <p className="text-white/60 text-xs mt-0.5">Your balance is {formatETB(stats?.myBalance ?? 0)}. Request credits from admin.</p>
          </div>
          <a href="/agent-credits" className="bg-gold text-charcoal text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gold-light">Request Credits</a>
        </div>
      )}

      {/* Header + Date filter + Export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} onExport={handleExport} exportLoading={loading} />
      </div>

      {/* Data banner */}
      {!loading && stats && (
        <div className="bg-nile-blue/20 border border-gold/20 rounded-lg px-4 py-2 text-xs text-white/50">
          📅 Showing: {dateFilter.type === 'custom' ? `${dateFilter.startDate?.slice(0,10)} → ${dateFilter.endDate?.slice(0,10)}` : dateFilter.type} data • {stats.totalSlips} total slips across {stats.totalCashiers} cashiers
        </div>
      )}

      {/* ── ROW 1: 4 Main Stats ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <SkeletonStatCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-dark border border-gold/30 rounded-xl p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="text-white/60 text-sm">My Balance</p>
              <div className="p-2 bg-gold/10 rounded-lg"><Wallet className="w-5 h-5 text-gold" /></div>
            </div>
            <p className="text-gold font-mono text-2xl font-bold">{formatETB(stats?.myBalance ?? 0)}</p>
            <p className="text-white/40 text-xs mt-1">Available</p>
          </div>
          <StatsCard title="Total Collected" value={formatETB(stats?.totalCollected ?? 0)} subtitle="Staked by bettors" icon={DollarSign} variant="gold" />
          <StatsCard title="Gross Profit/Loss" value={formatETB(stats?.grossProfit ?? 0)} subtitle="Collected - Paid - Tax" icon={TrendingUp} variant={(stats?.grossProfit ?? 0) >= 0 ? 'success' : 'danger'} />
          <StatsCard title="Pending Liability" value={formatETB(stats?.pendingLiability ?? 0)} subtitle="If all pending win" icon={Clock} variant={(stats?.pendingLiability ?? 0) > 0 ? 'danger' : 'default'} />
        </div>
      )}

      {/* ── ROW 2: 6 Slip Status Mini Cards ── */}
      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-dark border border-nile-blue/40 rounded-xl p-3 text-center">
            <Ticket className="w-5 h-5 text-white/50 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white font-mono">{stats.totalSlips}</p>
            <p className="text-white/50 text-xs">Total</p>
          </div>
          <div className="bg-nile-success/10 border border-nile-success/30 rounded-xl p-3 text-center">
            <CheckCircle className="w-5 h-5 text-nile-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-success font-mono">{stats.wonSlips}</p>
            <p className="text-white/50 text-xs">Won</p>
          </div>
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 text-center">
            <span className="text-xl block mb-1">🛡️</span>
            <p className="text-2xl font-bold text-gold font-mono">{stats.insuredSlips}</p>
            <p className="text-white/50 text-xs">Insured</p>
          </div>
          <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-xl p-3 text-center">
            <XCircle className="w-5 h-5 text-nile-danger mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-danger font-mono">{stats.lostSlips}</p>
            <p className="text-white/50 text-xs">Lost</p>
          </div>
          <div className="bg-nile-blue/20 border border-nile-blue/30 rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 text-gold mx-auto mb-1" />
            <p className="text-2xl font-bold text-gold font-mono">{stats.pendingSlips}</p>
            <p className="text-white/50 text-xs">Pending</p>
          </div>
          <div className="bg-nile-blue/10 border border-nile-blue/20 rounded-xl p-3 text-center">
            <RefreshCw className="w-5 h-5 text-nile-blue-light mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-blue-light font-mono">{stats.inProgressSlips}</p>
            <p className="text-white/50 text-xs">In Progress</p>
          </div>
        </div>
      )}

      {/* ── ROW 3: Cashier & Agent Profit Split ── */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-nile-success/10 border border-nile-success/20 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">Total Cashier Profit (40%)</p>
                <p className={cn('font-mono text-xl font-bold mt-1', (stats.cashierProfit ?? 0) >= 0 ? 'text-nile-success' : 'text-nile-danger')}>
                  {(stats.cashierProfit ?? 0) >= 0 ? '+' : ''}{formatETB(stats.cashierProfit)}
                </p>
                <p className="text-white/40 text-xs mt-1">Combined share of all cashiers</p>
              </div>
              <Wallet className="w-6 h-6 text-nile-success/40" />
            </div>
          </div>
          <div className="bg-nile-blue/10 border border-nile-blue/30 rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-sm">Total Agent Profit (60%)</p>
                <p className={cn('font-mono text-xl font-bold mt-1', (stats.agentProfit ?? 0) >= 0 ? 'text-gold' : 'text-nile-danger')}>
                  {(stats.agentProfit ?? 0) >= 0 ? '+' : ''}{formatETB(stats.agentProfit)}
                </p>
                <p className="text-white/40 text-xs mt-1">Your share of gross profit</p>
              </div>
              <ArrowUpRight className="w-6 h-6 text-gold/40" />
            </div>
          </div>
        </div>
      )}

      {/* ── ROW 4: Network Summary ── */}
      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard title="Total Cashiers" value={`${stats.activeCashiers} / ${stats.totalCashiers}`} subtitle="Active / Total" icon={Users} />
          <StatsCard title="Pending Credits" value={stats.pendingRequests ?? 0} subtitle="Awaiting approval" icon={Clock} variant={(stats.pendingRequests ?? 0) > 0 ? 'warning' : 'default'} />
          <StatsCard title="Tax Collected" value={formatETB(stats.taxCollected ?? 0)} subtitle="From winning slips" icon={DollarSign} variant="gold" />
        </div>
      )}

      {/* ── ROW 4b: Jackpot Status (collapsible) ── */}
      {!loading && stats && (
        <div className="bg-slate-dark border border-gold/20 rounded-xl overflow-hidden">
          <button
            onClick={() => setJackpotExpanded(!jackpotExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gold/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gold/10 rounded-lg text-lg">🏆</div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Jackpot Status</p>
                <p className="text-white/40 text-xs">
                  {stats.jackpot?.total ?? 0} jackpot {(stats.jackpot?.total ?? 0) === 1 ? 'slip' : 'slips'} · {formatETB(stats.jackpot?.collected ?? 0)} collected
                </p>
              </div>
            </div>
            <span className="text-gold text-sm">{jackpotExpanded ? '▲ Hide' : '▼ Expand'}</span>
          </button>
          {jackpotExpanded && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 pt-0 border-t border-gold/10">
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-white font-mono text-lg font-bold">{stats.jackpot?.total ?? 0}</p>
                <p className="text-white/50 text-xs">Total</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-success font-mono text-lg font-bold">{stats.jackpot?.won ?? 0}</p>
                <p className="text-white/50 text-xs">Won</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-orange font-mono text-lg font-bold">{stats.jackpot?.pending ?? 0}</p>
                <p className="text-white/50 text-xs">Pending</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-gold font-mono text-lg font-bold">{stats.jackpot?.insured ?? 0}</p>
                <p className="text-white/50 text-xs">Insured (Near Win)</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-danger font-mono text-lg font-bold">{stats.jackpot?.lost ?? 0}</p>
                <p className="text-white/50 text-xs">Lost</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-white/60 font-mono text-lg font-bold">{stats.jackpot?.inProgress ?? 0}</p>
                <p className="text-white/50 text-xs">In Progress</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-success font-mono text-lg font-bold">{formatETB(stats.jackpot?.wonTotal ?? 0)}</p>
                <p className="text-white/50 text-xs">Won Total</p>
              </div>
              <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                <p className="text-nile-orange font-mono text-lg font-bold">{formatETB(stats.jackpot?.pendingLiability ?? 0)}</p>
                <p className="text-white/50 text-xs">Pending Payout</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ROW 5: Revenue Trend Chart ── */}
      {!loading && report && (
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Network Revenue Trend</h3>
          {report?.trendData?.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={report.trendData}>
              <XAxis dataKey="date" tick={{ fill: '#ffffff40', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: '#ffffff40', fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#16213E', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#F0F0F0', fontSize: '12px' }} formatter={(v: any) => formatETB(v)} />
              <Line dataKey="collected" stroke="#C9A84C" strokeWidth={2} dot={false} name="Collected" />
              <Line dataKey="paid" stroke="#E74C3C" strokeWidth={2} dot={false} name="Paid Out" />
              <Line dataKey="profit" stroke="#2ECC71" strokeWidth={2} dot={false} name="Profit" />
            </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-white/30 text-sm">No trend data for this period</div>
          )}
        </div>
      )}

      {/* ── ROW 6: Payout Report ── */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">🏆 Network Payout Report</h3>
        {payouts && (
          <>
            <DataTable
              columns={[
                { key: 'slip_id', label: 'Slip ID', render: (v: any, row: any) => <span className="text-gold font-mono text-xs">{row?.is_jackpot && '🏆 '}#{v}</span> },
                { key: 'cashier_username', label: 'Cashier', render: (v: any) => <span className="text-white/60 text-xs">@{v}</span> },
                { key: 'bettor', label: 'Bettor', render: (v: any, row: any) => <span className="text-white/60 text-xs">{row.is_anonymous ? 'Anonymous' : `@${v?.username ?? '—'}`}</span> },
                { key: 'stake', label: 'Stake', render: (v: any) => <span className="text-white/70 font-mono text-xs">{formatETB(v)}</span> },
                { key: 'max_payout', label: 'Gross Win', render: (v: any) => <span className="text-white/60 font-mono text-xs">{formatETB(v)}</span> },
                { key: 'winning_tax', label: 'Tax (15%)', render: (v: any) => <span className="text-nile-danger font-mono text-xs">-{formatETB(v)}</span> },
                { key: 'net_payout', label: 'Net Payout', render: (v: any) => <span className="text-nile-success font-mono text-xs font-bold">{formatETB(v)}</span> },
                { key: 'status', label: 'Status', render: (v: any) => <StatusBadge status={v} type="slip" /> },
              ]}
              data={payouts.slips ?? []}
              isLoading={loading}
              emptyMessage="No winning slips yet"
            />
            {(payouts.slips ?? []).length > 0 && (
              <div className="mt-3 bg-gold/10 border border-gold/20 rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                <span className="text-gold font-semibold text-sm">TOTALS</span>
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-white/50 text-xs">Gross</p>
                    <p className="text-white font-mono">{formatETB(payouts.totals.grossWinTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs">Tax</p>
                    <p className="text-nile-danger font-mono">-{formatETB(payouts.totals.taxTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs">Net Total</p>
                    <p className="text-nile-success font-mono font-bold">{formatETB(payouts.totals.netPayoutTotal)}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ROW 7: Recent Activity ── */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Recent Activity</h3>
          <a href="/agent-activity" className="text-gold text-xs hover:text-gold-light">View All →</a>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((log, i) => (
              <div key={log.id ?? i} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                <span className="text-white/60 capitalize flex-1">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-white/30 text-xs">{formatTimeAgo(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
