'use client'

import { useState, useEffect, useCallback } from 'react'
import { lookupCouponByAgent, approveCouponByAgent } from '@/lib/actions/agent'
import { getCouponHistoryByUser } from '@/lib/actions/adminFinance'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatETB, formatCountdown, formatDate } from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Check, X, History, Ticket, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  pending:  'text-amber-400 bg-amber-400/10 border-amber-400/30',
  redeemed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  expired:  'text-white/30 bg-white/5 border-white/10',
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
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 mb-2">
            <Ticket className="w-6 h-6 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Coupons</h1>
          <p className="text-white/40 text-sm">Redeem bettor coupons &amp; view history</p>
        </div>

        {/* Balance pill */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 bg-slate-dark border border-gold/25 rounded-2xl px-5 py-3">
            <Wallet className="w-4 h-4 text-gold/60" />
            <span className="text-white/50 text-sm">Your balance</span>
            <span className="text-gold font-mono font-bold text-lg">{formatETB(user?.credit_balance ?? 0)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-charcoal rounded-2xl p-1 gap-1">
          {([
            { key: 'redeem', label: 'Redeem Coupon', icon: Ticket },
            { key: 'history', label: 'History', icon: History },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                tab === key ? 'bg-gold text-charcoal shadow' : 'text-white/50 hover:text-white'
              )}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* ── REDEEM TAB ── */}
        {tab === 'redeem' && (
          <div className="space-y-4">
            <div className="bg-slate-dark border border-white/8 rounded-2xl p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Coupon Code</label>
                <p className="text-white/30 text-xs">Enter the 6-digit code from the bettor's app</p>
              </div>

              {/* Code input — large, centered, easy to type */}
              <div className="flex flex-col items-center gap-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                    setError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="w-52 bg-charcoal border-2 border-gold/30 focus:border-gold rounded-2xl px-4 py-4 text-gold font-mono text-3xl text-center tracking-[0.5em] focus:outline-none placeholder:text-white/15 placeholder:tracking-[0.3em] transition-colors"
                />
                <button
                  onClick={handleLookup}
                  disabled={code.length !== 6 || loading}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-bold text-sm transition-all',
                    code.length === 6 && !loading
                      ? 'bg-gold text-charcoal hover:bg-gold/90 active:scale-[0.98]'
                      : 'bg-white/8 text-white/25 cursor-not-allowed'
                  )}>
                  {loading ? 'Looking up...' : 'Look Up Coupon'}
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-center">
                  <p className="text-red-400 text-sm font-medium">❌ {error}</p>
                </div>
              )}
            </div>

            {/* Coupon result card */}
            {lookedUp && (
              <div className="bg-slate-dark border border-gold/30 rounded-2xl overflow-hidden">
                {/* Type banner */}
                <div className={cn(
                  'px-5 py-3 flex items-center justify-between border-b',
                  lookedUp.type === 'topup' ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-amber-500/8 border-amber-500/20'
                )}>
                  <div className="flex items-center gap-2">
                    {lookedUp.type === 'topup'
                      ? <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                      : <ArrowDownCircle className="w-4 h-4 text-amber-400" />}
                    <span className={cn('text-sm font-bold capitalize', lookedUp.type === 'topup' ? 'text-emerald-400' : 'text-amber-400')}>
                      {lookedUp.type === 'topup' ? 'Top-up Request' : 'Withdrawal Request'}
                    </span>
                  </div>
                  <span className="text-white/40 text-xs font-mono">Expires {formatCountdown(lookedUp.expires_at)}</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Bettor + amount */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/40 text-xs mb-0.5">Bettor</p>
                      <p className="text-white font-semibold text-lg">@{lookedUp.bettor?.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40 text-xs mb-0.5">Amount</p>
                      <p className="text-gold font-mono font-bold text-2xl">{formatETB(lookedUp.amount)}</p>
                    </div>
                  </div>

                  {/* Balance impact */}
                  {lookedUp.type === 'topup' && (
                    <div className="bg-charcoal rounded-xl px-4 py-3 flex justify-between items-center">
                      <span className="text-white/50 text-sm">Your balance after</span>
                      <span className={cn('font-mono font-bold', isInsufficient ? 'text-red-400' : 'text-emerald-400')}>
                        {formatETB((user?.credit_balance ?? 0) - (lookedUp.amount ?? 0))}
                      </span>
                    </div>
                  )}

                  {lookedUp.type === 'withdrawal' && (
                    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl">💵</span>
                      <div>
                        <p className="text-emerald-400 font-semibold text-sm">Hand bettor {formatETB(lookedUp.amount)} cash</p>
                        <p className="text-white/40 text-xs mt-0.5">Your balance increases by this amount after approval</p>
                      </div>
                    </div>
                  )}

                  {isInsufficient && (
                    <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                      <p className="text-red-400 font-semibold text-sm">⚠️ Insufficient balance</p>
                      <p className="text-white/50 text-xs mt-1">
                        You need {formatETB(lookedUp.amount)} but only have {formatETB(user?.credit_balance ?? 0)}
                      </p>
                      <p className="text-amber-400 text-xs mt-1">→ Request credits from your agent first</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleApprove}
                      disabled={approving || isInsufficient}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all',
                        !approving && !isInsufficient
                          ? 'bg-emerald-500 text-white hover:bg-emerald-500/85 active:scale-[0.98]'
                          : 'bg-white/8 text-white/25 cursor-not-allowed'
                      )}>
                      <Check className="w-4 h-4" />
                      {approving ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => { setLookedUp(null); setCode('') }}
                      className="flex-1 flex items-center justify-center gap-2 border border-red-500/30 text-red-400 py-3 rounded-xl font-bold text-sm hover:bg-red-500/10 transition-all">
                      <X className="w-4 h-4" />Decline
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div className="space-y-4">
            {/* Type filter */}
            <div className="flex gap-2">
              {(['all', 'topup', 'withdrawal'] as const).map(t => (
                <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-semibold border transition-all capitalize',
                    typeFilter === t
                      ? 'bg-gold/15 border-gold/40 text-gold'
                      : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
                  )}>
                  {t === 'all' ? 'All Types' : t}
                </button>
              ))}
            </div>

            <div className="bg-slate-dark border border-white/8 rounded-2xl overflow-hidden">
              {historyLoading ? (
                <div className="py-16 text-center text-white/30 text-sm">Loading...</div>
              ) : coupons.length === 0 ? (
                <div className="py-16 text-center">
                  <History className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No coupon history yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['Code', 'Bettor', 'Type', 'Amount', 'Status', 'Date'].map(h => (
                        <th key={h} className={cn(
                          'text-[10px] text-white/30 font-semibold uppercase tracking-wider py-3 px-4',
                          h === 'Amount' ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left'
                        )}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {coupons.map(c => (
                      <tr key={c.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="text-gold font-mono font-bold text-sm">{c.code}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-white/60 text-sm">@{c.bettor?.username ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn(
                            'text-xs font-medium capitalize px-2.5 py-1 rounded-lg',
                            c.type === 'topup' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'
                          )}>{c.type}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-white font-mono text-sm">{formatETB(c.amount)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize', STATUS_STYLES[c.status] ?? 'text-white/30 bg-white/5 border-white/10')}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-white/35 text-xs">{formatDate(c.created_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 border border-white/10 text-white/50 rounded-xl text-sm hover:text-white hover:border-white/25 disabled:opacity-30 transition-all">
                  ← Prev
                </button>
                <span className="text-white/40 text-sm tabular-nums">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-4 py-2 border border-white/10 text-white/50 rounded-xl text-sm hover:text-white hover:border-white/25 disabled:opacity-30 transition-all">
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}