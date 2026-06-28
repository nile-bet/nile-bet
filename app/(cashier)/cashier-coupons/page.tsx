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

  const [code, setCode] = useState('')
  const [lookedUp, setLookedUp] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)

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
    <div className="p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-4.5 h-4.5 text-gold" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white leading-tight">Coupons</h1>
              <p className="text-white/40 text-xs">Redeem bettor coupons &amp; view history</p>
            </div>
          </div>
          {/* Balance pill */}
          <div className="flex items-center gap-2 bg-slate-dark border border-gold/20 rounded-lg px-3 py-2">
            <Wallet className="w-3.5 h-3.5 text-gold/60" />
            <span className="text-white/40 text-xs">Balance</span>
            <span className="text-gold font-mono font-bold text-sm">{formatETB(user?.credit_balance ?? 0)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-charcoal rounded-lg p-0.5 gap-0.5 mb-4 max-w-xs">
          {([
            { key: 'redeem', label: 'Redeem', icon: Ticket },
            { key: 'history', label: 'History', icon: History },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all',
                tab === key ? 'bg-gold text-charcoal shadow' : 'text-white/50 hover:text-white'
              )}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* ── REDEEM TAB ── */}
        {tab === 'redeem' && (
          <div className="lg:grid lg:grid-cols-[320px_1fr] gap-5">

            {/* Left: input */}
            <div className="bg-slate-dark border border-white/8 rounded-xl p-4 space-y-4 h-fit">
              <div>
                <label className="text-white/50 text-[11px] font-semibold uppercase tracking-wider block mb-0.5">Coupon Code</label>
                <p className="text-white/30 text-[11px]">6-digit code from the bettor's app</p>
              </div>

              <div className="flex flex-col items-center gap-3">
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
                  className="w-40 bg-charcoal border border-gold/30 focus:border-gold rounded-xl px-3 py-3 text-gold font-mono text-2xl text-center tracking-[0.5em] focus:outline-none placeholder:text-white/15 placeholder:tracking-[0.3em] transition-colors"
                />
                <button
                  onClick={handleLookup}
                  disabled={code.length !== 6 || loading}
                  className={cn(
                    'w-full py-2.5 rounded-lg font-bold text-sm transition-all',
                    code.length === 6 && !loading
                      ? 'bg-gold text-charcoal hover:bg-gold/90 active:scale-[0.98]'
                      : 'bg-white/8 text-white/25 cursor-not-allowed'
                  )}>
                  {loading ? 'Looking up...' : 'Look Up Coupon'}
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-red-400 text-xs font-medium">❌ {error}</p>
                </div>
              )}
            </div>

            {/* Right: result */}
            <div>
              {!lookedUp && !error && (
                <div className="border border-dashed border-white/8 rounded-xl p-10 text-center">
                  <Ticket className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-white/20 text-sm">Enter a coupon code to look it up</p>
                </div>
              )}

              {lookedUp && (
                <div className="bg-slate-dark border border-gold/30 rounded-xl overflow-hidden">
                  <div className={cn(
                    'px-4 py-3 flex items-center justify-between border-b',
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

                  <div className="p-4 space-y-3">
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

                    {lookedUp.type === 'topup' && (
                      <div className="bg-charcoal rounded-lg px-3 py-2.5 flex justify-between items-center">
                        <span className="text-white/50 text-sm">Your balance after</span>
                        <span className={cn('font-mono font-bold text-sm', isInsufficient ? 'text-red-400' : 'text-emerald-400')}>
                          {formatETB((user?.credit_balance ?? 0) - (lookedUp.amount ?? 0))}
                        </span>
                      </div>
                    )}

                    {lookedUp.type === 'withdrawal' && (
                      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
                        <span className="text-xl">💵</span>
                        <div>
                          <p className="text-emerald-400 font-semibold text-sm">Hand bettor {formatETB(lookedUp.amount)} cash</p>
                          <p className="text-white/40 text-xs">Your balance increases after approval</p>
                        </div>
                      </div>
                    )}

                    {isInsufficient && (
                      <div className="bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2.5">
                        <p className="text-red-400 font-semibold text-sm">⚠️ Insufficient balance</p>
                        <p className="text-white/50 text-xs mt-0.5">
                          Need {formatETB(lookedUp.amount)} · have {formatETB(user?.credit_balance ?? 0)}
                        </p>
                        <p className="text-amber-400 text-xs mt-0.5">→ Request credits from your agent first</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleApprove}
                        disabled={approving || isInsufficient}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all',
                          !approving && !isInsufficient
                            ? 'bg-emerald-500 text-white hover:bg-emerald-500/85 active:scale-[0.98]'
                            : 'bg-white/8 text-white/25 cursor-not-allowed'
                        )}>
                        <Check className="w-4 h-4" />
                        {approving ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => { setLookedUp(null); setCode('') }}
                        className="flex-1 flex items-center justify-center gap-2 border border-red-500/30 text-red-400 py-2.5 rounded-lg font-bold text-sm hover:bg-red-500/10 transition-all">
                        <X className="w-4 h-4" />Decline
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['all', 'topup', 'withdrawal'] as const).map(t => (
                <button key={t} onClick={() => { setTypeFilter(t); setPage(1) }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize',
                    typeFilter === t
                      ? 'bg-gold/15 border-gold/40 text-gold'
                      : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
                  )}>
                  {t === 'all' ? 'All Types' : t}
                </button>
              ))}
            </div>

            <div className="bg-slate-dark border border-white/8 rounded-xl overflow-hidden">
              {historyLoading ? (
                <div className="py-12 text-center text-white/30 text-sm">Loading...</div>
              ) : coupons.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="w-7 h-7 text-white/15 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">No coupon history yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['Code', 'Bettor', 'Type', 'Amount', 'Status', 'Date'].map(h => (
                        <th key={h} className={cn(
                          'text-[10px] text-white/30 font-semibold uppercase tracking-wider py-2.5 px-4',
                          h === 'Amount' ? 'text-right' : h === 'Status' ? 'text-center' : 'text-left'
                        )}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {coupons.map(c => (
                      <tr key={c.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3"><span className="text-gold font-mono font-bold text-sm">{c.code}</span></td>
                        <td className="px-4 py-3"><span className="text-white/60 text-sm">@{c.bettor?.username ?? '—'}</span></td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-medium capitalize px-2 py-0.5 rounded-md',
                            c.type === 'topup' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'
                          )}>{c.type}</span>
                        </td>
                        <td className="px-4 py-3 text-right"><span className="text-white font-mono text-sm">{formatETB(c.amount)}</span></td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize', STATUS_STYLES[c.status] ?? 'text-white/30 bg-white/5 border-white/10')}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span className="text-white/35 text-xs">{formatDate(c.created_at)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border border-white/10 text-white/50 rounded-lg text-xs hover:text-white hover:border-white/25 disabled:opacity-30 transition-all">
                  ← Prev
                </button>
                <span className="text-white/40 text-xs tabular-nums">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-white/10 text-white/50 rounded-lg text-xs hover:text-white hover:border-white/25 disabled:opacity-30 transition-all">
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
