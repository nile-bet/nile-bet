'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { getCashierSlipHistory } from '@/lib/actions/cashier'
import { formatDate, formatETB } from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import { ReprintReceiptModal } from '@/components/cashier/ReprintReceiptModal'
import { Search, Printer, Eye, Trophy, Ticket, Filter, X } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending:  'text-gold bg-gold/10 border-gold/30',
  won:      'text-nile-success bg-nile-success/10 border-nile-success/30',
  lost:     'text-nile-danger bg-nile-danger/10 border-nile-danger/30',
  near_win: 'text-nile-success bg-nile-success/10 border-nile-success/30',
  void:     'text-white/40 bg-white/5 border-white/10',
  cancelled:'text-white/40 bg-white/5 border-white/10',
  paid:     'text-nile-success bg-nile-success/10 border-nile-success/30',
}

type Category = 'all' | 'normal' | 'jackpot'
type SortStatus = 'all' | 'pending' | 'won' | 'lost' | 'void' | 'cancelled' | 'near_win'

export default function CashierSlipHistoryPage() {
  const { user } = useAuthStore()
  const [slips, setSlips] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Filters
  const [category, setCategory] = useState<Category>('all')
  const [status, setStatus] = useState<SortStatus>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  // Reprint modal
  const [reprintSlip, setReprintSlip] = useState<{ slipId: string; isJackpot: boolean } | null>(null)

  const LIMIT = 20

  const loadSlips = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { slips: data, total: t } = await getCashierSlipHistory(user.id, {
      page,
      limit: LIMIT,
      category,
      status: status === 'all' ? undefined : status,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
    setSlips(data)
    setTotal(t)
    setLoading(false)
  }, [user, page, category, status, dateFrom, dateTo])

  useEffect(() => {
    loadSlips()
  }, [loadSlips])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [category, status, dateFrom, dateTo])

  const filteredSlips = search.trim()
    ? slips.filter(s => s.slip_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.bettor?.username?.toLowerCase().includes(search.toLowerCase()))
    : slips

  const clearFilters = () => {
    setCategory('all')
    setStatus('all')
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setPage(1)
  }

  const hasFilters = category !== 'all' || status !== 'all' || dateFrom || dateTo || search

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Slip History</h1>
          <p className="text-white/40 text-sm mt-0.5">All slips you have placed</p>
        </div>
        <div className="text-white/40 text-sm">
          {total} slip{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-4 space-y-3">
        {/* Row 1: search + clear */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search slip ID or bettor…"
              className="w-full bg-charcoal border border-gold/20 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-gold/50"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 border border-nile-orange/40 text-nile-orange px-3 py-2 rounded-lg text-sm hover:bg-nile-orange/10"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Row 2: category tabs */}
        <div className="flex gap-2">
          {(['all', 'normal', 'jackpot'] as Category[]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                category === c
                  ? c === 'jackpot'
                    ? 'bg-gold/20 text-gold border-gold/40'
                    : 'bg-nile-blue/30 text-white border-nile-blue/50'
                  : 'text-white/40 border-white/10 hover:text-white/70'
              )}
            >
              {c === 'jackpot' ? <Trophy className="w-3 h-3" /> : <Ticket className="w-3 h-3" />}
              {c === 'all' ? 'All Slips' : c === 'jackpot' ? 'Jackpot' : 'Normal'}
            </button>
          ))}
        </div>

        {/* Row 3: status + dates */}
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={e => setStatus(e.target.value as SortStatus)}
            className="bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="near_win">Near Win</option>
            <option value="void">Void</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
            />
            <span className="text-white/30 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-white/40 text-sm">Loading slips…</div>
        ) : filteredSlips.length === 0 ? (
          <div className="py-16 text-center">
            <Filter className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No slips found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nile-blue/20">
                  <th className="text-left text-[11px] text-white/40 font-medium px-4 py-3 uppercase tracking-wider">Slip</th>
                  <th className="text-left text-[11px] text-white/40 font-medium px-4 py-3 uppercase tracking-wider">Type</th>
                  <th className="text-left text-[11px] text-white/40 font-medium px-4 py-3 uppercase tracking-wider">Bettor</th>
                  <th className="text-right text-[11px] text-white/40 font-medium px-4 py-3 uppercase tracking-wider">Stake</th>
                  <th className="text-right text-[11px] text-white/40 font-medium px-4 py-3 uppercase tracking-wider">Payout</th>
                  <th className="text-center text-[11px] text-white/40 font-medium px-4 py-3 uppercase tracking-wider">Status</th>
                  <th className="text-left text-[11px] text-white/40 font-medium px-4 py-3 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-nile-blue/10">
                {filteredSlips.map((slip) => {
                  const isJackpot = slip._type === 'jackpot'
                  return (
                    <tr key={slip.id} className="hover:bg-nile-blue/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white font-mono font-semibold text-sm">
                          #{slip.slip_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isJackpot ? (
                          <span className="flex items-center gap-1 text-[11px] text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full w-fit">
                            <Trophy className="w-3 h-3" /> Jackpot
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-nile-blue-light bg-nile-blue/10 border border-nile-blue/20 px-2 py-0.5 rounded-full w-fit">
                            <Ticket className="w-3 h-3" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white/60 text-xs">
                          {slip.is_anonymous ? 'Anonymous' : slip.bettor?.username ? `@${slip.bettor.username}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white font-mono text-xs">{formatETB(slip.stake)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white/60 font-mono text-xs">
                          {isJackpot
                            ? (slip.reward_amount > 0 ? formatETB(slip.reward_amount) : '—')
                            : (slip.net_payout ? formatETB(slip.net_payout) : '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'text-[11px] font-medium px-2 py-0.5 rounded-full border',
                          STATUS_COLORS[slip.status] ?? 'text-white/40 bg-white/5 border-white/10'
                        )}>
                          {slip.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white/40 text-xs">{formatDate(slip.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <a
                            href={`/slip/${slip.slip_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview slip"
                            className="flex items-center gap-1 text-xs text-white/50 border border-white/10 px-2 py-1 rounded hover:text-white hover:border-white/30 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => setReprintSlip({ slipId: slip.slip_id, isJackpot })}
                            title="Re-print slip"
                            className={cn(
                              'flex items-center gap-1 text-xs border px-2 py-1 rounded transition-colors',
                              isJackpot
                                ? 'text-gold border-gold/30 hover:bg-gold/10'
                                : 'text-nile-blue-light border-nile-blue/30 hover:bg-nile-blue/10'
                            )}
                          >
                            <Printer className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30 hover:text-white"
          >
            ← Prev
          </button>
          <span className="text-white/50 text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30 hover:text-white"
          >
            Next →
          </button>
        </div>
      )}

      {/* Reprint modal */}
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
