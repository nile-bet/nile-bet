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
  deleteMatches,
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
  Trash2,
  Filter,
  X,
  Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  const [showFilters, setShowFilters] = useState(false)
  const [countries, setCountries] = useState<any[]>([])
  const [leagues, setLeagues] = useState<any[]>([])
  const [filterCountry, setFilterCountry] = useState('')
  const [filterLeague, setFilterLeague] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterFeatured, setFilterFeatured] = useState<string>('')

  useEffect(() => {
    loadMatches()
  }, [page, statusFilter, search, filterCountry, filterLeague, filterDateFrom, filterDateTo, filterFeatured])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('countries').select('id, name, flag_emoji').order('name').then(({ data }) => {
      if (data) setCountries(data)
    })
    supabase.from('leagues').select('id, name, country_id').order('name').then(({ data }) => {
      if (data) setLeagues(data)
    })
  }, [])

  const loadMatches = async () => {
    setLoading(true)
    const { matches: data, total: t } =
      await getMatchesForAdmin({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        leagueId: filterLeague || undefined,
        countryId: filterCountry || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        isFeatured: filterFeatured === 'featured' ? true : filterFeatured === 'normal' ? false : undefined,
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

  const handleBulkDelete = async () => {
    if (!user || selected.length === 0) return
    const result = await deleteMatches(selected, user.id)
    if (result.success) {
      toast.success(`${result.deleted} matches deleted`)
      setSelected([])
      loadMatches()
    } else {
      toast.error(result.error ?? 'Failed to delete')
    }
  }

  const handleDeleteSingle = async (matchId: string) => {
    if (!user) return
    const result = await deleteMatches([matchId], user.id)
    if (result.success) {
      toast.success('Match deleted')
      loadMatches()
    } else {
      toast.error(result.error ?? 'Failed to delete')
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
          {(row.status === 'closed' || (row.kick_off_time && new Date(row.kick_off_time) < new Date() && row.status !== 'finished' && row.status !== 'cancelled')) && (
            <button
              onClick={() =>
                router.push(
                  `/matches/${row.id}`
                )
              }
              className="p-1.5 border border-gold/30 text-gold rounded hover:bg-gold/20"
              title="Enter Result & Settle"
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
            onClick={() => setConfirmData({ type: 'bulkDelete' })}
            className="bg-nile-danger text-white text-xs px-3 py-1.5 rounded-lg hover:bg-nile-danger/80 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete Selected
          </button>
          <button
            onClick={() => setSelected([])}
            className="text-white/40 text-xs hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search team names..."
            className="w-full bg-slate-dark border border-nile-blue/30 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/40"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors',
            showFilters || filterCountry || filterLeague || filterDateFrom || filterDateTo || filterFeatured
              ? 'bg-gold/20 border-gold text-gold'
              : 'bg-slate-dark border-nile-blue/30 text-white/60 hover:text-white'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filterCountry || filterLeague || filterDateFrom || filterDateTo || filterFeatured) && (
            <span className="bg-gold text-charcoal text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {[filterCountry, filterLeague, filterDateFrom, filterFeatured].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-slate-dark border border-gold/20 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium text-sm">Filters</span>
            <button
              onClick={() => {
                setFilterCountry('')
                setFilterLeague('')
                setFilterDateFrom('')
                setFilterDateTo('')
                setFilterFeatured('')
                setPage(1)
              }}
              className="text-xs text-white/40 hover:text-white flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Country */}
            <div>
              <label className="text-xs text-white/50 block mb-1">Country</label>
              <select
                value={filterCountry}
                onChange={(e) => { setFilterCountry(e.target.value); setFilterLeague(''); setPage(1) }}
                className="w-full bg-charcoal border border-nile-blue/30 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold/40"
              >
                <option value="">All Countries</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>{c.flag_emoji} {c.name}</option>
                ))}
              </select>
            </div>

            {/* League */}
            <div>
              <label className="text-xs text-white/50 block mb-1">League</label>
              <select
                value={filterLeague}
                onChange={(e) => { setFilterLeague(e.target.value); setPage(1) }}
                className="w-full bg-charcoal border border-nile-blue/30 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold/40"
              >
                <option value="">All Leagues</option>
                {(filterCountry
                  ? leagues.filter(l => l.country_id === filterCountry)
                  : leagues
                ).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="text-xs text-white/50 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> From
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value ? new Date(e.target.value).toISOString() : ''); setPage(1) }}
                className="w-full bg-charcoal border border-nile-blue/30 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold/40"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs text-white/50 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> To
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : ''); setPage(1) }}
                className="w-full bg-charcoal border border-nile-blue/30 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>

          {/* Featured filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Featured:</span>
            {[
              { key: '', label: 'All' },
              { key: 'featured', label: '⭐ Featured Only' },
              { key: 'normal', label: 'Normal Only' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilterFeatured(f.key); setPage(1) }}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs border transition-colors',
                  filterFeatured === f.key
                    ? 'bg-gold/20 border-gold text-gold'
                    : 'border-nile-blue/30 text-white/50 hover:text-white'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
            Next &#8594;
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

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={confirmData?.type === 'delete'}
        onClose={() => setConfirmData(null)}
        onConfirm={() => {
          handleDeleteSingle(confirmData.id)
          setConfirmData(null)
        }}
        title="Delete Match?"
        message={`Permanently delete "${confirmData?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Bulk delete confirm */}
      <ConfirmModal
        isOpen={confirmData?.type === 'bulkDelete'}
        onClose={() => setConfirmData(null)}
        onConfirm={() => {
          handleBulkDelete()
          setConfirmData(null)
        }}
        title={`Delete ${selected.length} Matches?`}
        message="This will permanently delete all selected matches and their data. This cannot be undone."
        confirmText="Delete All"
        variant="danger"
      />

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