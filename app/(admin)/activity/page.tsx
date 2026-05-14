'use client'

import { useState, useEffect } from 'react'
import { getActivityLogs }
  from '@/lib/actions/admin'
import { DataTable }
  from '@/components/shared/DataTable'
import { formatDate }
  from '@/lib/utils/formatCurrency'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

const ACTION_COLORS: Record<string, string> =
  {
    bet_placed: 'text-nile-blue-light',
    bet_cancelled: 'text-nile-orange',
    user_created: 'text-nile-success',
    credits_assigned: 'text-gold',
    force_logout: 'text-nile-danger',
    broadcast_sent: 'text-nile-purple',
    settings_updated: 'text-white/60',
    login: 'text-white/40',
    register: 'text-nile-success',
    coupon_generated: 'text-nile-blue',
    jackpot_bet_placed: 'text-gold',
  }

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] =
    useState('')
  const [startDate, setStartDate] =
    useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    loadLogs()
  }, [page, actionFilter, startDate, endDate])

  const loadLogs = async () => {
    setLoading(true)
    const { logs: data, total: t } =
      await getActivityLogs({
        actionType: actionFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 50,
      })
    setLogs(data)
    setTotal(t)
    setLoading(false)
  }

  const handleExport = () => {
    const rows = logs.map((l) => ({
      User: `@${(l as any).profiles?.username ?? 'system'}`,
      Role: (l as any).profiles?.role ?? '',
      Action: l.action,
      Details: JSON.stringify(l.details),
      Time: formatDate(l.created_at),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(
      wb, ws, 'Activity'
    )
    XLSX.writeFile(wb, 'activity-logs.xlsx')
  }

  const columns = [
    {
      key: 'profiles',
      label: 'User',
      render: (v: any) => (
        <span className="text-gold font-mono text-xs">
          @{v?.username ?? 'system'}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (v: any) => (
        <span
          className={cn(
            'text-xs font-medium',
            ACTION_COLORS[v] ?? 'text-white/60'
          )}
        >
          {v?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'details',
      label: 'Details',
      render: (v: any) => (
        <span className="text-white/40 text-xs font-mono truncate max-w-xs block">
          {JSON.stringify(v)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Time',
      render: (v: any) => (
        <span className="text-white/50 text-xs">
          {formatDate(v)}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">
          Activity Logs
        </h1>
        <button
          onClick={handleExport}
          className="border border-gold/30 text-gold px-4 py-2 rounded-lg text-sm hover:bg-gold/10"
        >
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            placeholder="Filter by action..."
            className="bg-slate-dark border border-nile-blue/30 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-gold/40 w-48"
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value)
            setPage(1)
          }}
          className="bg-slate-dark border border-nile-blue/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value)
            setPage(1)
          }}
          className="bg-slate-dark border border-nile-blue/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
        />
        {(actionFilter ||
          startDate ||
          endDate) && (
          <button
            onClick={() => {
              setActionFilter('')
              setStartDate('')
              setEndDate('')
              setPage(1)
            }}
            className="text-xs text-white/50 hover:text-white border border-white/20 px-3 py-2 rounded-lg"
          >
            Clear filters
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={loading}
        emptyMessage="No activity logs"
      />

      {total > 50 && (
        <div className="flex justify-center gap-3">
          <button
            onClick={() =>
              setPage((p) => Math.max(1, p - 1))
            }
            disabled={page === 1}
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-white/50 text-sm py-2">
            {page} / {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={
              page >= Math.ceil(total / 50)
            }
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}