'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getMatchesForAdmin,
} from '@/lib/actions/adminMatches'
import {
  publishMatches,
  cancelMatch,
  toggleFeatured,
  cloneMatch,
} from '@/lib/actions/adminMatches'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { ConfirmModal }
  from '@/components/shared/ConfirmModal'
import { MatchWizard }
  from '@/components/admin/MatchWizard'
import { formatDate, formatKickOff }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Plus,
  Search,
  Star,
  Copy,
  Ban,
  BarChart3,
  Trophy,
} from 'lucide-react'

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'closed', label: 'Closed' },
  { key: 'finished', label: 'Finished' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function MatchesPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [matches, setMatches] =
    useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] =
    useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] =
    useState<string[]>([])

  const [showCreate, setShowCreate] =
    useState(false)
  const [showConfirm, setShowConfirm] =
    useState(false)
  const [confirmData, setConfirmData] =
    useState<any>(null)

  useEffect(() => {
    loadMatches()
  }, [page, statusFilter, search])

  const loadMatches = async () => {
    setLoading(true)
    const { matches: data, total: t } =
      await getMatchesForAdmin({
        status:
          statusFilter === 'all'
            ? undefined
            : statusFilter,
        search: search || undefined,
        page,
        limit: 20,
      })
    setMatches(data)
    setTotal(t)
    setLoading(false)
  }

  const handleBulkPublish = async () => {
    if (!user || selected.length === 0) return
    const result = await publishMatches(
      selected,
      user.id
    )
    if (result.success) {
      toast.success(
        `${selected.length} matches published`
      )
      setSelected([])
      loadMatches()
    }
  }

  const handleCancel = async (
    matchId: string
  ) => {
    if (!user) return
    const result = await cancelMatch(
      matchId,
      user.id
    )
    if (result.success) {
      toast.success('Match cancelled')
      loadMatches()
    } else {
      toast.error('Failed to cancel match')
    }
    setShowConfirm(false)
  }

  const handleToggleFeatured = async (
    matchId: string,
    current: boolean
  ) => {
    if (!user) return
    await toggleFeatured(
      matchId,
      !current,
      user.id
    )
    toast.success(
      !current
        ? 'Match featured'
        : 'Match unfeatured'
    )
    loadMatches()
  }

  const handleClone = async (
    matchId: string
  ) => {
    if (!user) return
    const result = await cloneMatch(
      matchId,
      user.id
    )
    if (result.success) {
      toast.success(
        'Match cloned as draft'
      )
      loadMatches()
    }
  }

  const columns = [
    {
      key: 'id',
      label: '☑',
      width: 'w-8',
      render: (_: any, row: any) => (
        <input
          type="checkbox"
          checked={selected.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelected((prev) => [
                ...prev,
                row.id,
              ])
            } else {
              setSelected((prev) =>
                prev.filter((id) => id !== row.id)
              )
            }
          }}
          className="accent-gold"
        />
      ),
    },
    {
      key: 'home_team',
      label: 'Match',
      render: (v: any, row: any) => (
        <div>
          <p className="text-white font-medium text-sm">
            {v} V {row.away_team}
          </p>
          <p className="text-white/40 text-xs">
            {row.flag_emoji} {row.league_name}
          </p>
        </div>
      ),
    },
    {
      key: 'kick_off_time',
      label: 'Kick-off',
      render: (v: any) => (
        <span className="text-white/60 text-xs">
          {formatKickOff(v)}
        </span>
      ),
    },
    {
      key: 'enabled_markets',
      label: 'Markets',
      render: (v: any, row: any) => (
        <span className="text-white/60 text-xs">
          {v}/{row.total_markets}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: any) => (
        <StatusBadge status={v} type="match" />
      ),
    },
    {
      key: 'is_featured',
      label: '⭐',
      render: (v: any, row: any) => (
        <button
          onClick={() =>
            handleToggleFeatured(row.id, v)
          }
          className={cn(
            'text-lg',
            v ? 'opacity-100' : 'opacity-20'
          )}
        >
          ⭐
        </button>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-1">
          <button
            onClick={() =>
              router.push(
                `/matches/${row.id}/odds`
              )
            }
            className="p-1.5 border border-nile-blue/30 text-nile-blue-light rounded hover:bg-nile-blue/20"
            title="Manage Odds"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          {row.status === 'closed' && (
            <button
              onClick={() =>
                router.push(
                  `/matches/${row.id}`
                )
              }
              className="p-1.5 border border-gold/30 text-gold rounded hover:bg-gold/20"
              title="Enter Result"
            >
              <Trophy className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => handleClone(row.id)}
            className="p-1.5 border border-white/20 text-white/50 rounded hover:text-white"
            title="Clone"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {row.status !== 'cancelled' &&
            row.status !== 'finished' && (
              <button
                onClick={() => {
                  setConfirmData(row)
                  setShowConfirm(true)
                }}
                className="p-1.5 border border-nile-danger/30 text-nile-danger rounded hover:bg-nile-danger/10"
                title="Cancel"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">
          Match Management
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gold-light"
        >
          <Plus className="w-4 h-4" />
          Add Match
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setStatusFilter(t.key)
              setPage(1)
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              statusFilter === t.key
                ? 'bg-gold text-charcoal'
                : 'bg-slate-dark border border-nile-blue/30 text-white/60 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 bg-nile-blue/20 border border-gold/20 rounded-lg px-4 py-2">
          <span className="text-white/70 text-sm">
            {selected.length} selected
          </span>
          <button
            onClick={handleBulkPublish}
            className="bg-nile-success text-white text-xs px-3 py-1.5 rounded-lg hover:bg-nile-success/80"
          >
            ✅ Publish Selected
          </button>
          <button
            onClick={() => setSelected([])}
            className="text-white/40 text-xs hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search team names..."
          className="w-full bg-slate-dark border border-nile-blue/30 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/40"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={matches}
        isLoading={loading}
        emptyMessage="No matches found"
      />

      {/* Pagination */}
      {total > 20 && (
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
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={
              page >= Math.ceil(total / 20)
            }
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}

      {/* Match Wizard */}
      {showCreate && (
        <MatchWizard
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            loadMatches()
          }}
        />
      )}

      {/* Cancel confirm */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          if (confirmData) {
            handleCancel(confirmData.id)
          }
        }}
        title="Cancel Match?"
        message={`Cancel ${confirmData?.home_team} vs ${confirmData?.away_team}? All pending bets will be voided.`}
        confirmText="Yes, Cancel Match"
        variant="danger"
      />
    </div>
  )
}