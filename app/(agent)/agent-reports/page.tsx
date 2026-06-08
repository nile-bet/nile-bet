'use client'

import { useState, useEffect } from 'react'
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter'
import { getAgentReport }
  from '@/lib/actions/agent'
import { StatsCard }
  from '@/components/shared/StatsCard'
import { formatETB }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

export default function AgentReportsPage() {
  const { user } = useAuthStore()
  const [report, setReport] =
    useState<any>(null)
  const [loading, setLoading] =
    useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'monthly' })

  useEffect(() => {
    if (!user) return
    loadReport()
  }, [user, dateFilter])

  const loadReport = async () => {
    if (!user) return
    setLoading(true)

    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    if (dateFilter.type === 'custom') {
      startDate = dateFilter.startDate
      endDate = dateFilter.endDate
    } else if (dateFilter.type === 'monthly') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate = s.toISOString()
      endDate = now.toISOString()
    } else if (dateFilter.type === 'weekly') {
      const s = new Date(now)
      s.setDate(now.getDate() - 7)
      startDate = s.toISOString()
      endDate = now.toISOString()
    } else if (dateFilter.type === 'daily') {
      const s = new Date(now)
      s.setHours(0,0,0,0)
      startDate = s.toISOString()
      endDate = now.toISOString()
    } else {
      const s = new Date(
        now.getFullYear(),
        0,
        1
      )
      startDate = s.toISOString()
      endDate = now.toISOString()
    }

    const data = await getAgentReport(
      user.id,
      { startDate, endDate }
    )
    setReport(data)
    setLoading(false)
  }

  const handleExport = () => {
    if (!report) return
    const rows = report.trendData.map(
      (d: any) => ({
        Date: d.date,
        Collected: d.collected,
        'Paid Out': d.paid,
        Profit: d.profit,
      })
    )
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'My Report'
    )
    XLSX.writeFile(wb, 'my-agent-report.xlsx')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">
          My Reports
        </h1>
        <button
          onClick={handleExport}
          disabled={!report}
          className="border border-gold/30 text-gold px-4 py-2 rounded-lg text-sm hover:bg-gold/10 disabled:opacity-40"
        >
          📊 Export Excel
        </button>
      </div>

      <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

      {loading ? (
        <p className="text-white/50 text-center py-12">
          Loading report...
        </p>
      ) : !report ? null : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatsCard
              title="Total Collected"
              value={formatETB(
                report.summary.totalCollected
              )}
              variant="gold"
            />
            <StatsCard
              title="Total Paid Out"
              value={formatETB(
                report.summary.totalPaid
              )}
              variant="danger"
            />
            <StatsCard
              title="Gross Profit"
              value={formatETB(
                report.summary.grossProfit
              )}
              variant={
                report.summary.grossProfit >= 0
                  ? 'success'
                  : 'danger'
              }
            />
            <StatsCard
              title="My Share (60%)"
              value={formatETB(
                report.summary.agentShare
              )}
              variant="gold"
            />
            <StatsCard
              title="Tax Collected"
              value={formatETB(
                report.summary.taxCollected
              )}
            />
            <StatsCard
              title="Total Slips"
              value={
                report.summary.slipCount
              }
            />
          </div>

          {/* Chart */}
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">
              Revenue Trend
            </h3>
            {report.trendData.length === 0 ? (
              <p className="text-white/30 text-center py-8">
                No data for this period
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={200}
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
        </>
      )}
    </div>
  )
}