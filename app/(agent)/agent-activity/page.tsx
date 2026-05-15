'use client'

import { useState, useEffect } from 'react'
import { getAgentActivityLog }
  from '@/lib/actions/agent'
import { DataTable }
  from '@/components/shared/DataTable'
import { formatDate }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

const ACTION_COLORS: Record<
  string,
  string
> = {
  bet_placed: 'text-nile-blue-light',
  cashier_created: 'text-nile-success',
  credits_assigned: 'text-gold',
  coupon_topup_approved: 'text-nile-success',
  coupon_withdrawal_approved:
    'text-nile-orange',
  credit_request_created:
    'text-nile-blue-light',
  user_suspended: 'text-nile-danger',
  user_activated: 'text-nile-success',
}

export default function AgentActivityPage() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] =
    useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (user) loadLogs()
  }, [user, page])

  const loadLogs = async () => {
    if (!user) return
    setLoading(true)
    const { logs: data, total: t } =
      await getAgentActivityLog(user.id, {
        page,
        limit: 30,
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
      wb,
      ws,
      'Activity'
    )
    XLSX.writeFile(
      wb,
      'agent-activity.xlsx'
    )
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
          Activity Log
        </h1>
        <button
          onClick={handleExport}
          className="border border-gold/30 text-gold px-4 py-2 rounded-lg text-sm hover:bg-gold/10"
        >
          Export Excel
        </button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={loading}
        emptyMessage="No activity yet"
      />

      {total > 30 && (
        <div className="flex justify-center gap-3">
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
            {page} / {Math.ceil(total / 30)}
          </span>
          <button
            onClick={() =>
              setPage((p) => p + 1)
            }
            disabled={
              page >= Math.ceil(total / 30)
            }
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            Next &#8594;
          </button>
        </div>
      )}
    </div>
  )
}