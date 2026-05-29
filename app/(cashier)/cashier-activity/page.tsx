'use client'

import { useState, useEffect } from 'react'
import { getCashierActivityLog } from '@/lib/actions/cashier'
import { DataTable } from '@/components/shared/DataTable'
import { formatDate } from '@/lib/utils/formatCurrency'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { Printer } from 'lucide-react'
import { ReprintReceiptModal } from '@/components/cashier/ReprintReceiptModal'

const ACTION_COLORS: Record<string, string> = {
  bet_placed: 'text-nile-blue-light',
  jackpot_bet_placed: 'text-gold',
  bet_cancelled: 'text-nile-orange',
  coupon_topup_approved: 'text-nile-success',
  coupon_withdrawal_approved: 'text-nile-orange',
  credit_request_created: 'text-nile-blue-light',
  register: 'text-nile-success',
  login: 'text-white/40',
}

export default function CashierActivityPage() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [reprintSlip, setReprintSlip] = useState<{ slipId: string; isJackpot: boolean } | null>(null)

  useEffect(() => {
    if (user) loadLogs()
  }, [user, page])

  const loadLogs = async () => {
    if (!user) return
    setLoading(true)
    const { logs: data, total: t } = await getCashierActivityLog(user.id, { page, limit: 30 })
    setLogs(data)
    setTotal(t)
    setLoading(false)
  }

  const handleExport = () => {
    const rows = logs.map((l) => ({
      Action: l.action,
      Details: JSON.stringify(l.details),
      Time: formatDate(l.created_at),
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Activity')
    XLSX.writeFile(wb, 'cashier-activity.xlsx')
  }

  const columns = [
    {
      key: 'action',
      label: 'Action',
      render: (v: any) => (
        <span className={cn('text-xs font-medium', ACTION_COLORS[v] ?? 'text-white/60')}>
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
        <span className="text-white/50 text-xs">{formatDate(v)}</span>
      ),
    },
    {
      key: 'details',
      label: '',
      render: (v: any, row: any) => {
        const isNormal = row.action === 'bet_placed'
        const isJackpot = row.action === 'jackpot_bet_placed'
        if ((!isNormal && !isJackpot) || !v?.slip_id) return null
        return (
          <button
            onClick={() => setReprintSlip({ slipId: v.slip_id, isJackpot })}
            title={isJackpot ? 'Re-print jackpot slip' : 'Re-print slip'}
            className={cn(
              'flex items-center gap-1 text-xs border px-2 py-1 rounded transition-colors',
              isJackpot
                ? 'text-gold border-gold/40 hover:bg-gold/10'
                : 'text-nile-blue-light border-nile-blue/30 hover:bg-nile-blue/10'
            )}
          >
            <Printer className="w-3 h-3" />
            Print
          </button>
        )
      },
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">My Activity</h1>
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-white/50 text-sm py-2">
            {page} / {Math.ceil(total / 30)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 30)}
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}

      {reprintSlip && (
        <ReprintReceiptModal
          isOpen={!!reprintSlip}
          onClose={() => setReprintSlip(null)}
          slipId={reprintSlip.slipId}
          isJackpot={reprintSlip.isJackpot}
        />
      )}
    </div>
  )
}
