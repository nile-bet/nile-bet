'use client'

import { useState, useEffect } from 'react'
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter'
import { createClient }
  from '@/lib/supabase/client'
import {
  getPlatformStats,
  getRevenueByDay,
  getSlipStatusCounts,
  getAgentPerformance,
  getJackpotDashboardStats,
  getAdminPayoutsReport,
} from '@/lib/actions/admin'
import { StatsCard }
  from '@/components/shared/StatsCard'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { SkeletonStatCard }
  from '@/components/shared/SkeletonCard'
import { formatETB, formatTimeAgo }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  DollarSign,
  Users,
  Ticket,
  Clock,
  TrendingUp,
  Gift,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wallet,
  ArrowUpRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'


const PIE_COLORS = {
  pending: '#4A90D9',
  won: '#2ECC71',
  lost: '#E74C3C',
  cancelled: '#ffffff30',
  near_win: '#C9A84C',
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'daily' })
  const [stats, setStats] =
    useState<any>(null)
  const [revenueData, setRevenueData] =
    useState<any[]>([])
  const [pieData, setPieData] =
    useState<any[]>([])
  const [agents, setAgents] =
    useState<any[]>([])
  const [liveLogs, setLiveLogs] =
    useState<any[]>([])
  const [jackpotStats, setJackpotStats] =
    useState<any>(null)
  const [jackpotExpanded, setJackpotExpanded] =
    useState(false)
  const [payouts, setPayouts] = useState<any>(null)
  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    loadData()
  }, [dateFilter])

  useEffect(() => {
    const supabase = createClient()

    // Realtime activity feed
    const channel = supabase
      .channel('admin-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload) => {
          setLiveLogs((prev) =>
            [payload.new, ...prev].slice(0, 20)
          )
        }
      )
      .subscribe()

    // Load initial logs
    supabase
      .from('activity_logs')
      .select('*, profiles(username, role)')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setLiveLogs(data)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [
      statsData,
      revenue,
      slipCounts,
      agentData,
      jackpotStatsData,
      payoutsData,
    ] = await Promise.all([
      getPlatformStats(dateFilter),
      getRevenueByDay(30),
      getSlipStatusCounts(),
      getAgentPerformance(dateFilter),
      getJackpotDashboardStats(dateFilter),
      getAdminPayoutsReport(dateFilter),
    ])
    setPayouts(payoutsData)

    setJackpotStats(jackpotStatsData)

    setStats(statsData)
    setRevenueData(revenue)
    setPieData(
      Object.entries(slipCounts).map(
        ([name, value]) => ({
          name: name
            .replace('_', ' ')
            .toUpperCase(),
          value,
        })
      )
    )
    setAgents(agentData)
    setLoading(false)
  }

  const agentColumns = [
    {
      key: 'username',
      label: 'Agent',
      render: (v: any) => (
        <span className="text-gold font-medium">
          @{v}
        </span>
      ),
    },
    {
      key: 'cashiers_count',
      label: 'Cashiers',
      sortable: true,
    },
    {
      key: 'revenue',
      label: 'Revenue',
      sortable: true,
      render: (v: any) => formatETB(v),
    },
    {
      key: 'credit_balance',
      label: 'Balance',
      render: (v: any) => (
        <span className="text-gold font-mono">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: any) => (
        <StatusBadge status={v} type="user" />
      ),
    },
  ]

  const logColors: Record<string, string> = {
    bet_placed: 'bg-nile-blue-light',
    user_created: 'bg-nile-success',
    credits_assigned: 'bg-gold',
    force_logout: 'bg-nile-orange',
    broadcast_sent: 'bg-nile-purple',
    settings_updated: 'bg-white/40',
    coupon_generated: 'bg-nile-blue',
    login: 'bg-white/20',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Date filter */}
      <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      <div className="text-xs text-white/40 bg-nile-blue/20 border border-gold/20 px-3 py-1.5 rounded-lg w-fit">
        Showing: {dateFilter.type} data • {stats?.totalSlipsToday ?? 0} slips
      </div>

      {/* Stats Row 1 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Collected"
            value={formatETB(stats?.totalRevenue ?? 0)}
            icon={DollarSign}
            variant="gold"
          />
          <StatsCard
            title="Gross Profit/Loss"
            value={formatETB(stats?.grossProfit ?? 0)}
            subtitle="Collected - Paid - Tax"
            icon={TrendingUp}
            variant={(stats?.grossProfit ?? 0) >= 0 ? 'success' : 'danger'}
          />
          <StatsCard
            title="Total Slips"
            value={stats?.totalSlipsToday ?? 0}
            subtitle="Selected period"
            icon={Ticket}
          />
          <StatsCard
            title="Pending Payouts"
            value={formatETB(stats?.pendingPayouts ?? 0)}
            subtitle="If all pending win"
            icon={Clock}
            variant={(stats?.pendingPayouts ?? 0) > 0 ? 'warning' : 'default'}
          />
        </div>
      )}

      {/* Stats Row 2 */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Tax Collected"
            value={formatETB(
              stats?.taxCollected ?? 0
            )}
            icon={TrendingUp}
            variant="gold"
          />
          <StatsCard
            title="Total Agents"
            value={stats?.totalAgents ?? 0}
            icon={Users}
          />
          <StatsCard
            title="Total Cashiers"
            value={stats?.totalCashiers ?? 0}
            icon={Users}
          />
          <StatsCard
            title="Platform Balance"
            value={formatETB(
              stats?.platformBalance ?? 0
            )}
            subtitle="Admin balance"
            icon={DollarSign}
            variant="gold"
          />
        </div>
      )}


      {/* ── Slip Status Mini Cards ── */}
      {!loading && stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-slate-dark border border-nile-blue/40 rounded-xl p-3 text-center">
            <Ticket className="w-5 h-5 text-white/50 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white font-mono">{stats.totalSlipsToday}</p>
            <p className="text-white/50 text-xs">Total</p>
          </div>
          <div className="bg-nile-success/10 border border-nile-success/30 rounded-xl p-3 text-center">
            <CheckCircle className="w-5 h-5 text-nile-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-success font-mono">{stats.wonSlips ?? 0}</p>
            <p className="text-white/50 text-xs">Won</p>
          </div>
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 text-center">
            <span className="text-xl block mb-1">🛡️</span>
            <p className="text-2xl font-bold text-gold font-mono">{stats.insuredSlips ?? 0}</p>
            <p className="text-white/50 text-xs">Insured</p>
          </div>
          <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-xl p-3 text-center">
            <XCircle className="w-5 h-5 text-nile-danger mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-danger font-mono">{stats.lostSlips ?? 0}</p>
            <p className="text-white/50 text-xs">Lost</p>
          </div>
          <div className="bg-nile-blue/20 border border-nile-blue/30 rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 text-gold mx-auto mb-1" />
            <p className="text-2xl font-bold text-gold font-mono">{stats.pendingSlips ?? 0}</p>
            <p className="text-white/50 text-xs">Pending</p>
          </div>
          <div className="bg-nile-blue/10 border border-nile-blue/20 rounded-xl p-3 text-center">
            <RefreshCw className="w-5 h-5 text-nile-blue-light mx-auto mb-1" />
            <p className="text-2xl font-bold text-nile-blue-light font-mono">{stats.cancelledSlips ?? 0}</p>
            <p className="text-white/50 text-xs">Cancelled</p>
          </div>
        </div>
      )}

      {/* ── Profit Split ── */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-nile-success/10 border border-nile-success/20 rounded-xl p-5">
            <p className="text-white/60 text-sm">Platform Gross Profit</p>
            <p className={cn('font-mono text-xl font-bold mt-1', (stats.grossProfit ?? 0) >= 0 ? 'text-nile-success' : 'text-nile-danger')}>
              {(stats.grossProfit ?? 0) >= 0 ? '+' : ''}{formatETB(stats.grossProfit ?? 0)}
            </p>
            <p className="text-white/40 text-xs mt-1">Collected - Paid Out - Tax</p>
          </div>
          <div className="bg-nile-blue/10 border border-nile-blue/30 rounded-xl p-5">
            <p className="text-white/60 text-sm">Total Agent Share (60%)</p>
            <p className="text-gold font-mono text-xl font-bold mt-1">
              {formatETB((stats.grossProfit ?? 0) * 0.6)}
            </p>
            <p className="text-white/40 text-xs mt-1">Sum across all agents</p>
          </div>
          <div className="bg-nile-blue/10 border border-nile-blue/30 rounded-xl p-5">
            <p className="text-white/60 text-sm">Total Cashier Share (40%)</p>
            <p className="text-nile-blue-light font-mono text-xl font-bold mt-1">
              {formatETB((stats.grossProfit ?? 0) * 0.4)}
            </p>
            <p className="text-white/40 text-xs mt-1">Sum across all cashiers</p>
          </div>
        </div>
      )}

      {/* ── Platform Payout Report ── */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-nile-blue/20 flex items-center gap-2.5">
          <div className="p-1.5 bg-gold/10 rounded-lg">
            <TrendingUp className="w-4 h-4 text-gold" />
          </div>
          <h3 className="font-semibold text-white text-sm tracking-wide">Platform Payout Report</h3>
          {payouts && <span className="ml-auto text-white/30 text-xs">{payouts.slips?.length ?? 0} entries</span>}
        </div>
        {!loading && payouts && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-nile-blue/20">
            <div className="rounded-xl p-3" style={{background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.18)'}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Total Won</span>
                <CheckCircle className="w-3.5 h-3.5 text-nile-success" />
              </div>
              <p className="text-nile-success font-mono text-xl font-bold">{formatETB(payouts?.totals?.totalWonNet ?? 0)}</p>
              <p className="text-white/35 text-[10px] mt-1">{payouts?.totals?.totalWonCount ?? 0} slips · net after tax</p>
            </div>
            <div className="rounded-xl p-3" style={{background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.18)'}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Redeemed</span>
                <CheckCircle className="w-3.5 h-3.5 text-nile-blue-light" />
              </div>
              <p className="text-nile-blue-light font-mono text-xl font-bold">{formatETB(payouts?.totals?.wonRedeemedNet ?? 0)}</p>
              <p className="text-white/35 text-[10px] mt-1">{payouts?.totals?.wonRedeemedCount ?? 0} slips paid out</p>
            </div>
            <div className="rounded-xl p-3" style={{background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.18)'}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">🛡️ Insured</span>
                <CheckCircle className="w-3.5 h-3.5 text-gold" />
              </div>
              <p className="text-gold font-mono text-xl font-bold">{formatETB(payouts?.totals?.insuredRedeemedNet ?? 0)}</p>
              <p className="text-white/35 text-[10px] mt-1">✓ {payouts?.totals?.insuredRedeemedCount ?? 0} paid · ⏳ {payouts?.totals?.insuredPendingCount ?? 0} pending</p>
            </div>
            <div className="rounded-xl p-3" style={{
              background: (payouts?.totals?.pendingPayoutNet ?? 0) > 0 ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)',
              border: (payouts?.totals?.pendingPayoutNet ?? 0) > 0 ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(255,255,255,0.06)'
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Pending Payout</span>
                <Clock className="w-3.5 h-3.5 text-nile-orange" />
              </div>
              <p className={cn('font-mono text-xl font-bold', (payouts?.totals?.pendingPayoutNet ?? 0) > 0 ? 'text-nile-orange' : 'text-white/30')}>
                {formatETB(payouts?.totals?.pendingPayoutNet ?? 0)}
              </p>
              <p className="text-white/35 text-[10px] mt-1">{payouts?.totals?.pendingCount ?? 0} slips awaiting payment</p>
            </div>
          </div>
        )}
        {payouts && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-nile-blue/20">
                  <th className="text-left px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Slip ID</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Cashier</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Bettor</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Stake</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Gross Win</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Tax</th>
                  <th className="text-right px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Net Payout</th>
                  <th className="text-center px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-semibold uppercase tracking-wider text-[10px]">Redeemed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nile-blue/10">
                {(payouts.slips ?? []).length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-white/30 text-sm">No winning slips in this period</td></tr>
                ) : (payouts.slips ?? []).map((row: any, i: number) => (
                  <tr key={row.slip_id ?? i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-white/40 text-[11px]">
                        {row.is_jackpot ? <span className="text-gold">🏆 </span> : null}···{String(row.slip_id ?? '').slice(-6)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><span className="text-white/60 text-xs">@{row.cashier_username}</span></td>
                    <td className="px-4 py-2.5"><span className="text-white/80">{row.is_anonymous ? <span className="text-white/30 italic">Anonymous</span> : `@${row.bettor?.username ?? '—'}`}</span></td>
                    <td className="px-4 py-2.5 text-right"><span className="text-white/70 font-mono">{formatETB(row.stake)}</span></td>
                    <td className="px-4 py-2.5 text-right"><span className="text-white font-mono font-semibold">{formatETB(row.max_payout)}</span></td>
                    <td className="px-4 py-2.5 text-right">
                      {(row.winning_tax ?? 0) > 0
                        ? <span className="text-nile-danger/80 font-mono">-{formatETB(row.winning_tax)}</span>
                        : <span className="text-white/20 font-mono text-[10px]">exempt</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right"><span className="text-nile-success font-mono font-bold">{formatETB(row.net_payout)}</span></td>
                    <td className="px-4 py-2.5 text-center">
                      {row.payout_status === 'redeemed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-nile-blue-light/15 text-nile-blue-light border border-nile-blue-light/25">
                          {row.is_insured ? '🛡️ INSURED · PAID' : '✓ PAID'}
                        </span>
                      ) : row.is_insured ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold/12 text-gold border border-gold/25">🛡️ INSURED</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-nile-success/12 text-nile-success border border-nile-success/25">⏳ WON</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.redeemed_at
                        ? <span className="text-nile-success/80 text-[10px] font-medium">{new Date(row.redeemed_at).toLocaleString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        : <span className="text-nile-orange/60 text-[10px]">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(payouts.slips ?? []).length > 0 && (
              <div className="border-t border-gold/20 bg-gold/5 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                <span className="text-gold font-bold text-[10px] uppercase tracking-widest">TOTALS · {payouts.slips?.length} slips</span>
                <div className="flex items-center gap-6 ml-auto">
                  <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">Gross Win</p>
                    <p className="text-white font-mono text-xs font-bold">{formatETB(payouts.totals.grossWinTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">Tax (15%)</p>
                    <p className="text-nile-danger font-mono text-xs font-bold">-{formatETB(payouts.totals.taxTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">Net Payout</p>
                    <p className="text-nile-success font-mono text-sm font-bold">{formatETB(payouts.totals.netPayoutTotal)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Jackpot Status Card */}
      <div className="bg-slate-dark border border-gold/20 rounded-xl overflow-hidden">
        <button
          onClick={() => setJackpotExpanded(!jackpotExpanded)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-gold" />
            <h3 className="font-semibold text-white">Jackpot Status</h3>
            {jackpotStats && (
              <span className="text-white/40 text-xs font-mono ml-2">
                {jackpotStats.total} slips
              </span>
            )}
          </div>
          <span className={cn(
            'text-white/40 transition-transform text-sm',
            jackpotExpanded && 'rotate-180'
          )}>
            ▼
          </span>
        </button>

        {jackpotExpanded && (
          <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {loading || !jackpotStats ? (
              [...Array(6)].map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <StatsCard
                  title="Total"
                  value={jackpotStats.total}
                  icon={Ticket}
                  variant="default"
                />
                <StatsCard
                  title="Won"
                  value={jackpotStats.won}
                  icon={TrendingUp}
                  variant="gold"
                />
                <StatsCard
                  title="Pending"
                  value={jackpotStats.pending}
                  icon={Clock}
                  variant="default"
                />
                <StatsCard
                  title="Insured"
                  value={jackpotStats.insured}
                  icon={Gift}
                  variant="default"
                />
                <StatsCard
                  title="Lost"
                  value={jackpotStats.lost}
                  icon={Ticket}
                  variant="default"
                />
                <StatsCard
                  title="In Progress"
                  value={jackpotStats.inProgress}
                  icon={Clock}
                  variant="gold"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">
            Revenue Trend (30 days)
          </h3>
          {revenueData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={200}
            >
              <LineChart data={revenueData}>
                <XAxis
                  dataKey="date"
                  tick={{
                    fill: '#ffffff40',
                    fontSize: 10,
                  }}
                  tickFormatter={(v) =>
                    v.slice(5)
                  }
                />
                <YAxis
                  tick={{
                    fill: '#ffffff40',
                    fontSize: 10,
                  }}
                  tickFormatter={(v) =>
                    `${(v / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: '#16213E',
                    border:
                      '1px solid rgba(201,168,76,0.3)',
                    borderRadius: '8px',
                    color: '#F0F0F0',
                  }}
                  formatter={(v: any) =>
                    formatETB(v)
                  }
                />
                <Line
                  dataKey="revenue"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  dot={false}
                  name="Staked"
                />
                <Line
                  dataKey="payouts"
                  stroke="#E74C3C"
                  strokeWidth={2}
                  dot={false}
                  name="Paid Out"
                />
                <Line
                  dataKey="profit"
                  stroke="#2ECC71"
                  strokeWidth={2}
                  dot={false}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">
            Slips by Status
          </h3>
          {pieData.every(
            (d) => d.value === 0
          ) ? (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={200}
            >
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                >
                  {pieData.map(
                    (entry, index) => {
                      const key =
                        entry.name
                          .toLowerCase()
                          .replace(' ', '_')
                      return (
                        <Cell
                          key={index}
                          fill={
                            PIE_COLORS[
                              key as keyof typeof PIE_COLORS
                            ] ?? '#ffffff20'
                          }
                        />
                      )
                    }
                  )}
                </Pie>
                <Legend
                  formatter={(v) => (
                    <span
                      style={{ color: '#ffffff80', fontSize: 11 }}
                    >
                      {v}
                    </span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    background: '#16213E',
                    border:
                      '1px solid rgba(201,168,76,0.3)',
                    borderRadius: '8px',
                    color: '#F0F0F0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Agent performance */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">
          Agent Performance
        </h3>
        <DataTable
          columns={agentColumns}
          data={agents}
          isLoading={loading}
          emptyMessage="No agents yet"
        />
      </div>

      {/* Live activity */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-nile-danger animate-pulse" />
          Live Activity
        </h3>
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
          {liveLogs.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">
              No activity yet
            </p>
          ) : (
            liveLogs.map((log: any, i) => {
              const color =
                logColors[log.action] ??
                'bg-white/20'
              return (
                <div
                  key={log.id ?? i}
                  className="flex items-center gap-3 text-sm"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      color
                    )}
                  />
                  <span className="text-white/70">
                    {log.action.replace(
                      /_/g,
                      ' '
                    )}
                  </span>
                  <span className="text-white/40">
                    @{log.profiles?.username ?? 'system'}
                  </span>
                  <span className="text-white/30 ml-auto text-xs">
                    {formatTimeAgo(
                      log.created_at
                    )}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}