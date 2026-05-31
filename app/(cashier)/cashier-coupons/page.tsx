'use client'

import { useState, useEffect, useCallback } from 'react'
import { lookupCouponByAgent, approveCouponByAgent } from '@/lib/actions/agent'
import { getCouponHistoryByUser } from '@/lib/actions/adminFinance'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatETB, formatCountdown, formatDate } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Check, X, History, Ticket } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending:  'text-gold bg-gold/10 border-gold/30',
  redeemed: 'text-nile-success bg-nile-success/10 border-nile-success/30',
  expired:  'text-white/40 bg-white/5 border-white/10',
}

type Tab = 'redeem' | 'history'

export default function CashierCouponsPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('redeem')

  // Redeem state
  const [code, setCode] = useState('')
  const [lookedUp, setLookedUp] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)

  // History state
  const [coupons, setCoupons] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const LIMIT = 20

  const loadHistory = useCallback(async () => {
    if (!user) return
    setHistoryLoading(true)
    const { coupons: data, total: t } = await getCouponHistoryByUser(user.id, { page, limit: LIMIT, type: typeFilter })
    setCoupons(data)
    setTotal(t)
    setHistoryLoading(false)
  }, [user, page, typeFilter])

  useEffect(() => { if (tab === 'history') loadHistory() }, [tab, loadHistory])

  const handleLookup = async () => {
    if (code.length !== 6) return
    setLoading(true); setLookedUp(null); setError('')
    const result = await lookupCouponByAgent(code.trim())
    if (result.success) setLookedUp(result.coupon)
    else setError(result.error ?? 'Coupon not found')
    setLoading(false)
  }

  const handleApprove = async () => {
    if (!user || !lookedUp) return
    setApproving(true)
    const result = await approveCouponByAgent(code.trim(), user.id)
    if (result.success) {
      toast.success('Coupon approved!')
      setLookedUp(null); setCode('')
      if (tab === 'history') loadHistory()
    } else toast.error(result.error)
    setApproving(false)
  }

  const isInsufficient = lookedUp?.type === 'topup' && (user?.credit_balance ?? 0) < (lookedUp?.amount ?? 0)
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Coupons</h1>
        <div className="bg-slate-dark border border-gold/30 rounded-lg px-4 py-2 flex items-center gap-2">
          <span className="text-white/60 text-xs">Balance:</span>
          <span className="text-gold font-mono font-bold">{formatETB(user?.credit_balance ?? 0)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'redeem', label: 'Redeem Coupon', icon: Ticket },
          { key: 'history', label: 'History', icon: History },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              tab === key ? 'bg-gold/20 border-gold/50 text-gold' : 'border-nile-blue/30 text-white/50 hover:text-white'
            )}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── REDEEM TAB ── */}
      {tab === 'redeem' && (
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Enter Coupon Code</h2>
          <div className="flex gap-3">
            <input type="text" value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="6-digit code" maxLength={6}
              className="w-48 bg-charcoal border border-gold/30 rounded-lg px-4 py-3 text-gold font-mono text-xl text-center focus:outline-none tracking-widest"
            />
            <button onClick={handleLookup} disabled={code.length !== 6 || loading}
              className={cn('px-6 py-3 rounded-lg font-semibold text-sm flex-1',
                code.length === 6 && !loading ? 'bg-gold text-charcoal hover:bg-gold-light' : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}>
              {loading ? 'Searching...' : 'Look Up'}
            </button>
          </div>
          {error && <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-3"><p className="text-nile-danger text-sm">❌ {error}</p></div>}
          {lookedUp && (
            <div className="bg-nile-blue/20 border border-gold/30 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-white font-semibold">@{lookedUp.bettor?.username}</p>
                <p className="text-gold font-mono text-2xl font-bold mt-1">{formatETB(lookedUp.amount)}</p>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="bg-nile-blue/40 text-nile-blue-light px-2 py-0.5 rounded capitalize">{lookedUp.type}</span>
                  <span className="text-nile-orange">Expires: {formatCountdown(lookedUp.expires_at)}</span>
                </div>
              </div>
              {lookedUp.type === 'topup' && (
                <div className="bg-charcoal/50 rounded-lg p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/50">Your balance after:</span>
                    <span className={cn('font-mono', isInsufficient ? 'text-nile-danger' : 'text-nile-success')}>
                      {formatETB((user?.credit_balance ?? 0) - (lookedUp.amount ?? 0))}
                    </span>
                  </div>
                </div>
              )}
              {lookedUp.type === 'withdrawal' && (
                <div className="bg-nile-success/10 border border-nile-success/20 rounded-lg p-3 text-xs">
                  <p className="text-nile-success">💵 Give bettor {formatETB(lookedUp.amount)} cash</p>
                  <p className="text-white/50 mt-1">Your balance will increase by {formatETB(lookedUp.amount)} after approval</p>
                </div>
              )}
              {isInsufficient && (
                <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-3">
                  <p className="text-nile-danger text-sm font-semibold">⚠️ Insufficient Balance</p>
                  <p className="text-white/60 text-xs mt-1">You need {formatETB(lookedUp.amount)} but have {formatETB(user?.credit_balance ?? 0)}</p>
                  <p className="text-xs text-nile-orange mt-2">→ Request credits from your agent</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleApprove} disabled={approving || isInsufficient}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold',
                    !approving && !isInsufficient ? 'bg-nile-success text-white hover:bg-nile-success/80' : 'bg-white/10 text-white/30 cursor-not-allowed'
                  )}>
                  <Check className="w-4 h-4" />{approving ? 'Processing...' : 'Approve'}
                </button>
                <button onClick={() => { setLookedUp(null); setCode('') }}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-nile-danger/40 text-nile-danger py-2.5 rounded-lg text-sm hover:bg-nile-danger/10">
                  <X className="w-4 h-4" />Decline
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['all', 'topup', 'withdrawal'] as const).map(t => (
              <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize',
                  typeFilter === t ? 'bg-gold/20 border-gold/40 text-gold' : 'border-nile-blue/30 text-white/40 hover:text-white'
                )}>{t === 'all' ? 'All Types' : t}</button>
            ))}
          </div>
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl overflow-hidden">
            {historyLoading ? (
              <div className="py-12 text-center text-white/40 text-sm">Loading...</div>
            ) : coupons.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-sm">No coupon history yet</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-nile-blue/20">
                  <th className="text-left text-[11px] text-white/40 font-medium px-4 py-3 uppercase">Code</th>
                  <th className="text-left text-[11px] text-white/40 font-medium px-4 py-3 uppercase">Bettor</th>
                  <th className="text-left text-[11px] text-white/40 font-medium px-4 py-3 uppercase">Type</th>
                  <th className="text-right text-[11px] text-white/40 font-medium px-4 py-3 uppercase">Amount</th>
                  <th className="text-center text-[11px] text-white/40 font-medium px-4 py-3 uppercase">Status</th>
                  <th className="text-left text-[11px] text-white/40 font-medium px-4 py-3 uppercase">Date</th>
                </tr></thead>
                <tbody className="divide-y divide-nile-blue/10">
                  {coupons.map(c => (
                    <tr key={c.id} className="hover:bg-nile-blue/5 transition-colors">
                      <td className="px-4 py-3"><span className="text-gold font-mono font-bold">{c.code}</span></td>
                      <td className="px-4 py-3"><span className="text-white/60 text-xs">@{c.bettor?.username ?? '—'}</span></td>
                      <td className="px-4 py-3"><span className="text-nile-blue-light text-xs capitalize">{c.type}</span></td>
                      <td className="px-4 py-3 text-right"><span className="text-white font-mono text-xs">{formatETB(c.amount)}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border', STATUS_COLORS[c.status] ?? 'text-white/40 bg-white/5 border-white/10')}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="text-white/40 text-xs">{formatDate(c.created_at)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30">← Prev</button>
              <span className="text-white/50 text-sm py-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
