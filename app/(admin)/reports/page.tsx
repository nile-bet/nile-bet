'use client'

import { useState, useEffect } from 'react'
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter'
import {
  getAgentProfitReport,
  getTopUsersReport,
  getPlatformProfitReport,
  getTaxReport,
} from '@/lib/actions/adminFinance'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatsCard }
  from '@/components/shared/StatsCard'
import { formatETB, formatDate }
  from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from 'recharts'
import * as XLSX from 'xlsx'

const REPORT_TABS = [
  { key: 'agent', label: 'Agent Profit' },
  { key: 'topusers', label: 'Top Users' },
  { key: 'platform', label: 'Platform P&L' },
  { key: 'tax', label: 'Tax Collection' },
]

const DATE_PRESETS = [
  { key: 'month', label: 'This Month' },
  { key: 'lastmonth', label: 'Last Month' },
  { key: 'year', label: 'This Year' },
]

function getDateRange(preset: string): {
  startDate?: string
  endDate?: string
} {
  const now = new Date()
  if (preset === 'daily') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    }
  }
  if (preset === 'weekly') {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    }
  }
  if (preset === 'monthly') {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    )
    start.setHours(0, 0, 0, 0)
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    }
  }
  // lifetime — no bounds
  return { startDate: undefined, endDate: undefined }
}

const tooltipStyle = {
  contentStyle: {
    background: '#16213E',
    border: '1px solid rgba(201,168,76,0.3)',
    borderRadius: '8px',
    color: '#F0F0F0',
    fontSize: '12px',
  },
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] =
    useState('agent')
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'monthly' })
  const [loading, setLoading] =
    useState(true)

  // Data
  const [agentData, setAgentData] =
    useState<any[]>([])
  const [topCashiers, setTopCashiers] =
    useState<any[]>([])
  const [topBettors, setTopBettors] =
    useState<any[]>([])
  const [platformData, setPlatformData] =
    useState<any[]>([])
  const [taxData, setTaxData] =
    useState<any[]>([])
  const [granularity, setGranularity] =
    useState<'daily' | 'weekly' | 'monthly'>(
      'daily'
    )

  useEffect(() => {
    loadData()
  }, [activeTab, dateFilter, granularity])

  const loadData = async () => {
    setLoading(true)
    const filters = dateFilter.type === 'custom'
      ? { startDate: dateFilter.startDate, endDate: dateFilter.endDate }
      : getDateRange(dateFilter.type)

    if (activeTab === 'agent') {
      const data =
        await getAgentProfitReport(filters)
      setAgentData(data.filter(Boolean))
    } else if (activeTab === 'topusers') {
      const [cashiers, bettors] =
        await Promise.all([
          getTopUsersReport(
            'cashiers',
            filters
          ),
          getTopUsersReport(
            'bettors',
            filters
          ),
        ])
      setTopCashiers(cashiers)
      setTopBettors(bettors)
    } else if (activeTab === 'platform') {
      const data =
        await getPlatformProfitReport(
          granularity,
          filters
        )
      setPlatformData(data)
    } else if (activeTab === 'tax') {
      const data =
        await getTaxReport(filters)
      setTaxData(data)
    }
    setLoading(false)
  }

  const exportExcel = (
    data: any[],
    filename: string
  ) => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Report'
    )
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }

  const agentTotal = {
    collected: agentData.reduce(
      (a, r) => a + r.totalCollected,
      0
    ),
    paidOut: agentData.reduce(
      (a, r) => a + r.totalPaidOut,
      0
    ),
    grossProfit: agentData.reduce(
      (a, r) => a + r.grossProfit,
      0
    ),
    tax: agentData.reduce(
      (a, r) => a + r.taxCollected,
      0
    ),
  }

  const platformTotal = {
    staked: platformData.reduce(
      (a, r) => a + r.totalStaked,
      0
    ),
    paidOut: platformData.reduce(
      (a, r) => a + r.totalPaidOut,
      0
    ),
    profit: platformData.reduce(
      (a, r) => a + r.grossProfit,
      0
    ),
    tax: platformData.reduce(
      (a, r) => a + r.taxCollected,
      0
    ),
  }

  const taxTotal = {
    slips: taxData.reduce(
      (a, r) => a + r.winningSlips,
      0
    ),
    gross: taxData.reduce(
      (a, r) => a + r.grossPayout,
      0
    ),
    tax: taxData.reduce(
      (a, r) => a + r.taxAmount,
      0
    ),
    net: taxData.reduce(
      (a, r) => a + r.netPaidOut,
      0
    ),
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">
        Reports
      </h1>

      {/* Report tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key)
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              activeTab === t.key
                ? 'bg-gold text-charcoal'
                : 'bg-slate-dark border border-nile-blue/30 text-white/60 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        <button
          onClick={() =>
            exportExcel(
              activeTab === 'agent'
                ? agentData
                : activeTab === 'platform'
                ? platformData
                : activeTab === 'tax'
                ? taxData
                : topCashiers,
              `${activeTab}-report`
            )
          }
          className="ml-auto border border-gold/30 text-gold px-4 py-1.5 rounded-lg text-xs hover:bg-gold/10"
        >
          📊 Export Excel
        </button>
      </div>

      {loading ? (
        <div className="text-white/50 text-center py-12">
          Loading report data...
        </div>
      ) : (
        <>
          {/* ── AGENT PROFIT ── */}
          {activeTab === 'agent' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Collected"
                  value={formatETB(
                    agentTotal.collected
                  )}
                  variant="gold"
                />
                <StatsCard
                  title="Total Paid Out"
                  value={formatETB(
                    agentTotal.paidOut
                  )}
                  variant="danger"
                />
                <StatsCard
                  title="Gross Profit"
                  value={formatETB(
                    agentTotal.grossProfit
                  )}
                  variant={
                    agentTotal.grossProfit >= 0
                      ? 'success'
                      : 'danger'
                  }
                />
                <StatsCard
                  title="Tax Collected"
                  value={formatETB(
                    agentTotal.tax
                  )}
                  variant="gold"
                />
              </div>

              <DataTable
                columns={[
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
                    key: 'totalCollected',
                    label: 'Collected',
                    sortable: true,
                    render: (v: any) =>
                      formatETB(v),
                  },
                  {
                    key: 'totalPaidOut',
                    label: 'Paid Out',
                    render: (v: any) => (
                      <span className="text-nile-danger font-mono text-xs">
                        {formatETB(v)}
                      </span>
                    ),
                  },
                  {
                    key: 'grossProfit',
                    label: 'Gross P/L',
                    sortable: true,
                    render: (v: any) => (
                      <span
                        className={cn(
                          'font-mono text-xs',
                          v >= 0
                            ? 'text-nile-success'
                            : 'text-nile-danger'
                        )}
                      >
                        {v >= 0 ? '+' : ''}
                        {formatETB(v)}
                      </span>
                    ),
                  },
                  {
                    key: 'agentShare',
                    label: 'Agent (60%)',
                    render: (v: any) => (
                      <span className="text-nile-blue-light font-mono text-xs">
                        {formatETB(v)}
                      </span>
                    ),
                  },
                  {
                    key: 'cashierShare',
                    label: 'Cashier (40%)',
                    render: (v: any) => (
                      <span className="text-white/60 font-mono text-xs">
                        {formatETB(v)}
                      </span>
                    ),
                  },
                  {
                    key: 'taxCollected',
                    label: 'Tax',
                    render: (v: any) => (
                      <span className="text-gold font-mono text-xs">
                        {formatETB(v)}
                      </span>
                    ),
                  },
                ]}
                data={agentData}
                emptyMessage="No agent data"
              />
            </div>
          )}

          {/* ── TOP USERS ── */}
          {activeTab === 'topusers' && (
            <div className="space-y-8">
              {/* Top Cashiers */}
              <div>
                <h2 className="text-white font-semibold text-lg mb-4">
                  🏆 Top Cashiers
                </h2>
                {/* Podium */}
                {topCashiers.length >= 3 && (
                  <div className="flex items-end justify-center gap-4 mb-6">
                    {[1, 0, 2].map((idx) => {
                      const item =
                        topCashiers[idx]
                      if (!item) return null
                      const rank = idx + 1
                      const height =
                        rank === 1
                          ? 'h-32'
                          : rank === 2
                          ? 'h-24'
                          : 'h-20'
                      const medal =
                        rank === 1
                          ? '🥇'
                          : rank === 2
                          ? '🥈'
                          : '🥉'
                      return (
                        <div
                          key={idx}
                          className="text-center"
                        >
                          <p className="text-2xl mb-1">
                            {medal}
                          </p>
                          <p className="text-white font-medium text-sm">
                            @{item.username}
                          </p>
                          <p className="text-gold font-mono text-xs">
                            {formatETB(
                              item.netProfit
                            )}
                          </p>
                          <div
                            className={cn(
                              'mt-2 rounded-t-lg bg-nile-blue/40 border border-nile-blue/30 w-24',
                              height
                            )}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                <DataTable
                  columns={[
                    {
                      key: 'username',
                      label: 'Cashier',
                      render: (v: any) => (
                        <span className="text-gold font-medium">
                          @{v}
                        </span>
                      ),
                    },
                    {
                      key: 'slipCount',
                      label: 'Slips',
                      sortable: true,
                    },
                    {
                      key: 'totalStaked',
                      label: 'Collected',
                      sortable: true,
                      render: (v: any) =>
                        formatETB(v),
                    },
                    {
                      key: 'totalPaid',
                      label: 'Paid Out',
                      render: (v: any) => (
                        <span className="text-nile-danger font-mono text-xs">
                          {formatETB(v)}
                        </span>
                      ),
                    },
                    {
                      key: 'netProfit',
                      label: 'Net Profit',
                      sortable: true,
                      render: (v: any) => (
                        <span
                          className={cn(
                            'font-mono text-xs',
                            v >= 0
                              ? 'text-nile-success'
                              : 'text-nile-danger'
                          )}
                        >
                          {v >= 0 ? '+' : ''}
                          {formatETB(v)}
                        </span>
                      ),
                    },
                  ]}
                  data={topCashiers}
                  emptyMessage="No cashier data"
                />
              </div>

              {/* Top Bettors */}
              <div>
                <h2 className="text-white font-semibold text-lg mb-4">
                  🏆 Top Bettors
                </h2>
                <DataTable
                  columns={[
                    {
                      key: 'username',
                      label: 'Bettor',
                      render: (v: any) => (
                        <span className="text-nile-purple font-medium">
                          @{v}
                        </span>
                      ),
                    },
                    {
                      key: 'slipCount',
                      label: 'Bets',
                      sortable: true,
                    },
                    {
                      key: 'wonBets',
                      label: 'Won',
                      render: (v: any) => (
                        <span className="text-nile-success text-xs">
                          {v}
                        </span>
                      ),
                    },
                    {
                      key: 'lostBets',
                      label: 'Lost',
                      render: (v: any) => (
                        <span className="text-nile-danger text-xs">
                          {v}
                        </span>
                      ),
                    },
                    {
                      key: 'totalStaked',
                      label: 'Staked',
                      render: (v: any) =>
                        formatETB(v),
                    },
                    {
                      key: 'winRate',
                      label: 'Win Rate',
                      render: (v: any) => (
                        <span
                          className={cn(
                            'text-xs font-mono',
                            v >= 50
                              ? 'text-nile-success'
                              : v < 30
                              ? 'text-nile-danger'
                              : 'text-white/60'
                          )}
                        >
                          {v.toFixed(1)}%
                        </span>
                      ),
                    },
                  ]}
                  data={topBettors}
                  emptyMessage="No bettor data"
                />
              </div>
            </div>
          )}

          {/* ── PLATFORM P&L ── */}
          {activeTab === 'platform' && (
            <div className="space-y-6">
              {/* Granularity */}
              <div className="flex gap-2">
                {(
                  [
                    'daily',
                    'weekly',
                    'monthly',
                  ] as const
                ).map((g) => (
                  <button
                    key={g}
                    onClick={() =>
                      setGranularity(g)
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs capitalize border',
                      granularity === g
                        ? 'bg-gold border-gold text-charcoal font-semibold'
                        : 'border-nile-blue/30 text-white/50 hover:text-white'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Staked"
                  value={formatETB(
                    platformTotal.staked
                  )}
                  variant="gold"
                />
                <StatsCard
                  title="Total Paid Out"
                  value={formatETB(
                    platformTotal.paidOut
                  )}
                  variant="danger"
                />
                <StatsCard
                  title="Gross Profit"
                  value={formatETB(
                    platformTotal.profit
                  )}
                  variant={
                    platformTotal.profit >= 0
                      ? 'success'
                      : 'danger'
                  }
                />
                <StatsCard
                  title="Tax Collected"
                  value={formatETB(
                    platformTotal.tax
                  )}
                  variant="gold"
                />
              </div>

              {/* Chart */}
              <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">
                  Revenue & Profit Trend
                </h3>
                {platformData.length === 0 ? (
                  <p className="text-white/30 text-center py-8">
                    No data for this period
                  </p>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >
                    <ComposedChart
                      data={platformData}
                    >
                      <XAxis
                        dataKey="period"
                        tick={{
                          fill: '#ffffff40',
                          fontSize: 10,
                        }}
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
                        {...tooltipStyle}
                        formatter={(v: any) =>
                          formatETB(v)
                        }
                      />
                      <Legend
                        formatter={(v) => (
                          <span
                            style={{
                              color: '#ffffff60',
                              fontSize: 11,
                            }}
                          >
                            {v}
                          </span>
                        )}
                      />
                      <Bar
                        dataKey="totalStaked"
                        fill="#1B3A6B"
                        name="Staked"
                        radius={[2, 2, 0, 0]}
                      />
                      <Bar
                        dataKey="totalPaidOut"
                        fill="#E74C3C"
                        name="Paid Out"
                        radius={[2, 2, 0, 0]}
                      />
                      <Line
                        dataKey="grossProfit"
                        stroke="#C9A84C"
                        strokeWidth={2}
                        dot={false}
                        name="Profit"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Table */}
              <DataTable
                columns={[
                  {
                    key: 'period',
                    label: 'Period',
                    render: (v: any) => (
                      <span className="text-white/70 text-xs font-mono">
                        {v}
                      </span>
                    ),
                  },
                  {
                    key: 'slipCount',
                    label: 'Slips',
                    sortable: true,
                  },
                  {
                    key: 'totalStaked',
                    label: 'Staked',
                    render: (v: any) =>
                      formatETB(v),
                  },
                  {
                    key: 'totalPaidOut',
                    label: 'Paid Out',
                    render: (v: any) => (
                      <span className="text-nile-danger font-mono text-xs">
                        {formatETB(v)}
                      </span>
                    ),
                  },
                  {
                    key: 'grossProfit',
                    label: 'Gross P/L',
                    render: (v: any) => (
                      <span
                        className={cn(
                          'font-mono text-xs',
                          v >= 0
                            ? 'text-nile-success'
                            : 'text-nile-danger'
                        )}
                      >
                        {v >= 0 ? '+' : ''}
                        {formatETB(v)}
                      </span>
                    ),
                  },
                  {
                    key: 'taxCollected',
                    label: 'Tax',
                    render: (v: any) => (
                      <span className="text-gold font-mono text-xs">
                        {formatETB(v)}
                      </span>
                    ),
                  },
                ]}
                data={platformData}
                emptyMessage="No platform data"
              />
            </div>
          )}

          {/* ── TAX COLLECTION ── */}
          {activeTab === 'tax' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Tax Collected"
                  value={formatETB(taxTotal.tax)}
                  variant="gold"
                />
                <StatsCard
                  title="Winning Slips"
                  value={taxTotal.slips}
                />
                <StatsCard
                  title="Gross Payout"
                  value={formatETB(
                    taxTotal.gross
                  )}
                />
                <StatsCard
                  title="Net Paid Out"
                  value={formatETB(taxTotal.net)}
                  variant="success"
                />
              </div>

              {/* Chart */}
              <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">
                  Daily Tax Collected
                </h3>
                {taxData.length === 0 ? (
                  <p className="text-white/30 text-center py-8">
                    No winning slips in this period
                  </p>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={200}
                  >
                    <BarChart
                      data={taxData.slice(0, 30)}
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
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(v: any) =>
                          formatETB(v)
                        }
                      />
                      <Bar
                        dataKey="taxAmount"
                        fill="#C9A84C"
                        name="Tax"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <DataTable
                columns={[
                  {
                    key: 'date',
                    label: 'Date',
                    render: (v: any) => (
                      <span className="text-white/70 text-xs font-mono">
                        {v}
                      </span>
                    ),
                  },
                  {
                    key: 'winningSlips',
                    label: 'Winning Slips',
                    sortable: true,
                  },
                  {
                    key: 'grossPayout',
                    label: 'Gross Payout',
                    render: (v: any) =>
                      formatETB(v),
                  },
                  {
                    key: 'taxAmount',
                    label: 'Tax (15%)',
                    render: (v: any) => (
                      <span className="text-gold font-mono text-xs">
                        {formatETB(v)}
                      </span>
                    ),
                  },
                  {
                    key: 'netPaidOut',
                    label: 'Net Paid Out',
                    render: (v: any) => (
                      <span className="text-nile-success font-mono text-xs">
                        {formatETB(v)}
                      </span>
                    ),
                  },
                ]}
                data={taxData}
                emptyMessage="No tax data"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}