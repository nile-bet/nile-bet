'use client'

import { useState, useEffect } from 'react'
import {
  getBettorsUnderAgent,
  getCashiersUnderAgent,
  suspendUserByAgent,
} from '@/lib/actions/agent'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { ConfirmModal }
  from '@/components/shared/ConfirmModal'
import { formatETB, formatDate }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

export default function AgentBettorsPage() {
  const { user } = useAuthStore()
  const [bettors, setBettors] =
    useState<any[]>([])
  const [cashiers, setCashiers] =
    useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] =
    useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [cashierFilter, setCashierFilter] =
    useState('')
  const [showConfirm, setShowConfirm] =
    useState(false)
  const [confirmData, setConfirmData] =
    useState<any>(null)

  useEffect(() => {
    if (user) {
      loadCashiers()
    }
  }, [user])

  useEffect(() => {
    if (user) loadBettors()
  }, [user, page, search, cashierFilter])

  const loadCashiers = async () => {
    if (!user) return
    const data =
      await getCashiersUnderAgent(user.id)
    setCashiers(data)
  }

  const loadBettors = async () => {
    if (!user) return
    setLoading(true)
    const { bettors: data, total: t } =
      await getBettorsUnderAgent(user.id, {
        search: search || undefined,
        cashierId:
          cashierFilter || undefined,
        page,
        limit: 20,
      })
    setBettors(data)
    setTotal(t)
    setLoading(false)
  }

  const handleSuspend = async () => {
    if (!user || !confirmData) return
    const isSuspended =
      confirmData.status === 'suspended'
    const result = await suspendUserByAgent(
      confirmData.id,
      user.id,
      !isSuspended
    )
    if (result.success) {
      toast.success(
        isSuspended
          ? `@${confirmData.username} activated`
          : `@${confirmData.username} suspended`
      )
      setShowConfirm(false)
      loadBettors()
    } else {
      toast.error(result.error)
    }
  }

  const columns = [
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
      key: 'cashier_name',
      label: 'Cashier',
      render: (v: any) => (
        <span className="text-white/60 text-xs">
          @{v}
        </span>
      ),
    },
    {
      key: 'credit_balance',
      label: 'Balance',
      sortable: true,
      render: (v: any) => (
        <span className="text-gold font-mono text-xs">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'bet_count',
      label: 'Bets',
      render: (v: any) => (
        <span className="text-white/60 text-xs">
          {v}
        </span>
      ),
    },
    {
      key: 'won_count',
      label: 'Won',
      render: (v: any) => (
        <span className="text-nile-success text-xs">
          {v}
        </span>
      ),
    },
    {
      key: 'lost_count',
      label: 'Lost',
      render: (v: any) => (
        <span className="text-nile-danger text-xs">
          {v}
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
    {
      key: 'id',
      label: 'Actions',
      render: (_: any, row: any) => (
        <button
          onClick={() => {
            setConfirmData(row)
            setShowConfirm(true)
          }}
          className={cn(
            'text-xs border px-2 py-1 rounded',
            row.status === 'active'
              ? 'border-nile-orange/30 text-nile-orange hover:bg-nile-orange/10'
              : 'border-nile-success/30 text-nile-success hover:bg-nile-success/10'
          )}
        >
          {row.status === 'active'
            ? '⏸'
            : '▶'}
        </button>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">
          My Bettors
        </h1>
        <span className="text-white/50 text-sm">
          {total} bettors in your network
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search bettors..."
            className="w-full bg-slate-dark border border-nile-blue/30 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/40"
          />
        </div>
        <select
          value={cashierFilter}
          onChange={(e) => {
            setCashierFilter(e.target.value)
            setPage(1)
          }}
          className="bg-slate-dark border border-nile-blue/30 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
        >
          <option value="">
            All Cashiers
          </option>
          {cashiers.map((c) => (
            <option key={c.id} value={c.id}>
              @{c.username}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={bettors}
        isLoading={loading}
        emptyMessage="No bettors found"
      />

      {total > 20 && (
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
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() =>
              setPage((p) => p + 1)
            }
            disabled={
              page >= Math.ceil(total / 20)
            }
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            Next &#8594;
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSuspend}
        title={
          confirmData?.status === 'active'
            ? 'Suspend Bettor?'
            : 'Activate Bettor?'
        }
        message={`${confirmData?.status === 'active' ? 'Suspend' : 'Activate'} @${confirmData?.username}?`}
        confirmText={
          confirmData?.status === 'active'
            ? 'Yes, Suspend'
            : 'Yes, Activate'
        }
        variant={
          confirmData?.status === 'active'
            ? 'danger'
            : 'warning'
        }
      />
    </div>
  )
}