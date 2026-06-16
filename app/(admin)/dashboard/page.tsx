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
    ] = await Promise.all([
      getPlatformStats(dateFilter),
      getRevenueByDay(30),
      getSlipStatusCounts(),
      getAgentPerformance(dateFilter),
    ])

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
            title="Total Revenue"
            value={formatETB(
              stats?.totalRevenue ?? 0
            )}
            subtitle="Tax collected"
            icon={DollarSign}
            variant="gold"
          />
          <StatsCard
            title="Active Bettors"
            value={
              stats?.activeBettors ?? 0
            }
            subtitle="Registered accounts"
            icon={Users}
          />
          <StatsCard
            title="Total Slips"
            value={
              stats?.totalSlipsToday ?? 0
            }
            subtitle="Selected period"
            icon={Ticket}
          />
          <StatsCard
            title="Pending Payouts"
            value={formatETB(
              stats?.pendingPayouts ?? 0
            )}
            subtitle="If all pending win"
            icon={Clock}
            variant={
              (stats?.pendingPayouts ?? 0) > 0
                ? 'warning'
                : 'default'
            }
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