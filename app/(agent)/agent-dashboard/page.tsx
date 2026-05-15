'use client'

import { useState, useEffect } from 'react'
import { createClient }
  from '@/lib/supabase/client'
import { getAgentStats }
  from '@/lib/actions/agent'
import { StatsCard }
  from '@/components/shared/StatsCard'
import { SkeletonStatCard }
  from '@/components/shared/SkeletonCard'
import { formatETB, formatTimeAgo }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  Wallet,
  Users,
  User,
  TrendingUp,
  Clock,
  Ticket,
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
} from 'recharts'
import { cn } from '@/lib/utils'
import { getAgentReport }
  from '@/lib/actions/agent'

const DATE_FILTERS = [
  { key: 'lifetime', label: 'Lifetime' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

export default function AgentDashboard() {
  const { user } = useAuthStore()
  const [dateFilter, setDateFilter] =
    useState('daily')
  const [stats, setStats] =
    useState<any>(null)
  const [report, setReport] =
    useState<any>(null)
  const [loading, setLoading] =
    useState(true)
  const [recentActivity, setRecentActivity] =
    useState<any[]>([])

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, dateFilter])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    supabase
      .from('activity_logs')
      .select('*, profiles(username, role)')
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })
      .limit(10)
      .then(({ data }) => {
        if (data) setRecentActivity(data)
      })
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    const [statsData, reportData] =
      await Promise.all([
        getAgentStats(user.id, dateFilter),
        getAgentReport(user.id),
      ])

    setStats(statsData)
    setReport(reportData)
    setLoading(false)
  }

  const isLowBalance =
    (stats?.myBalance ?? 0) < 1000

  return (
    <div className="p-6 space-y-6">
      {/* Low balance alert */}
      {!loading && isLowBalance && (
        <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-nile-danger font-semibold text-sm">
              ⚠️ Low Balance Warning
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              Your balance is{' '}
              {formatETB(
                stats?.myBalance ?? 0
              )}
              . Request credits from admin.
            </p>
          </div>
          <a
            href="/agent-credits"
            className="bg-gold text-charcoal text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gold-light"
          >
            Request Credits
          </a>
        </div>
      )}

      {/* Date filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() =>
              setDateFilter(f.key)
            }
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium',
              dateFilter === f.key
                ? 'bg-gold text-charcoal'
                : 'bg-slate-dark border border-nile-blue/30 text-white/60 hover:text-white'
            )}
          >
            {f.label}
            {f.key === 'daily' && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-nile-success inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatsCard
            title="My Balance"
            value={formatETB(
              stats?.myBalance ?? 0
            )}
            subtitle={
              (stats?.reservedBalance ?? 0) > 0
                ? `Reserved: ${formatETB(stats.reservedBalance)}`
                : 'Available'
            }
            icon={Wallet}
            variant="gold"
          />
          <StatsCard
            title="Total Cashiers"
            value={`${stats?.activeCashiers ?? 0} / ${stats?.totalCashiers ?? 0}`}
            subtitle="Active / Total"
            icon={Users}
          />
          <StatsCard
            title="Total Bettors"
            value={stats?.totalBettors ?? 0}
            subtitle="In my network"
            icon={User}
          />
          <StatsCard
            title="Revenue"
            value={formatETB(
              stats?.totalRevenue ?? 0
            )}
            subtitle="Total staked"
            icon={TrendingUp}
            variant="gold"
          />
          <StatsCard
            title="Pending Credits"
            value={
              stats?.pendingRequests ?? 0
            }
            subtitle="Awaiting approval"
            icon={Clock}
            variant={
              (stats?.pendingRequests ?? 0) > 0
                ? 'warning'
                : 'default'
            }
          />
          <StatsCard
            title="Active Slips"
            value={stats?.activeSlips ?? 0}
            subtitle="Pending settlement"
            icon={Ticket}
          />
        </div>
      )}

      {/* Charts row */}
      {!loading && report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue trend */}
          <div className="lg:col-span-2 bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">
              My Revenue Trend
            </h3>
            {report.trendData.length === 0 ? (
              <p className="text-white/30 text-center py-8">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={180}
              >
                <LineChart
                  data={report.trendData}
                >
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
                      fontSize: '12px',
                    }}
                    formatter={(v: any) =>
                      formatETB(v)
                    }
                  />
                  <Line
                    dataKey="collected"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    dot={false}
                    name="Collected"
                  />
                  <Line
                    dataKey="paid"
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

          {/* Profit summary */}
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">
              Profit Summary
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Total Collected',
                  value:
                    report.summary
                      .totalCollected,
                  color: 'text-gold',
                },
                {
                  label: 'Total Paid Out',
                  value:
                    report.summary.totalPaid,
                  color: 'text-nile-danger',
                },
                {
                  label: 'Gross Profit',
                  value:
                    report.summary.grossProfit,
                  color:
                    report.summary
                      .grossProfit >= 0
                      ? 'text-nile-success'
                      : 'text-nile-danger',
                },
                {
                  label: 'My Share (60%)',
                  value:
                    report.summary.agentShare,
                  color: 'text-nile-blue-light',
                },
                {
                  label: 'Tax Collected',
                  value:
                    report.summary.taxCollected,
                  color: 'text-white/60',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between"
                >
                  <span className="text-white/50 text-sm">
                    {item.label}:
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm font-medium',
                      item.color
                    )}
                  >
                    {formatETB(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">
            Recent Activity
          </h3>
          <a
            href="/agent-activity"
            className="text-gold text-xs hover:text-gold-light"
          >
            View All &#8594;
          </a>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">
            No activity yet
          </p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((log, i) => (
              <div
                key={log.id ?? i}
                className="flex items-center gap-3 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                <span className="text-white/60 capitalize flex-1">
                  {log.action.replace(/_/g, ' ')}
                </span>
                <span className="text-white/30 text-xs">
                  {formatTimeAgo(
                    log.created_at
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}