'use client'

import { useState, useEffect } from 'react'
import { requestCreditsByCashier } from '@/lib/actions/cashier'
import { createClient } from '@/lib/supabase/client'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatETB, formatDate } from '@/lib/utils/formatCurrency'
import { useAuthStore } from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CheckCircle, Clock, XCircle, CreditCard, TrendingUp, User, Shield } from 'lucide-react'

export default function CashierCreditsPage() {
  const { user } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [toAgent, setToAgent] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('request')

  useEffect(() => { if (user) loadRequests() }, [user])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const channel = supabase
      .channel(`cashier-credits-page-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'credit_requests',
        filter: `requester_id=eq.${user.id}`,
      }, async (payload) => {
        const updated = payload.new as any
        loadRequests()
        if (updated.status === 'approved') {
          const { data: profile } = await supabase
            .from('profiles').select('credit_balance').eq('id', user.id).single()
          if (profile) useAuthStore.getState().updateBalance(profile.credit_balance)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const loadRequests = async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('credit_requests')
      .select('*, approver:profiles!credit_requests_to_user_id_fkey(username, role)')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setRequests(data ?? [])
  }

  const handleSubmit = async () => {
    if (!user || !amount) return
    setSubmitting(true)
    const result = await requestCreditsByCashier(user.id, parseFloat(amount) || 0, note, toAgent)
    if (result.success) {
      toast.success('Credit request sent!')
      setAmount(''); setNote('')
      loadRequests()
    } else {
      toast.error(result.error)
    }
    setSubmitting(false)
  }

  const isLowBalance = (user?.credit_balance ?? 0) < 1000
  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4.5 h-4.5 text-gold" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white leading-tight">Credits</h1>
            <p className="text-white/40 text-xs">Manage your credit balance &amp; requests</p>
          </div>
        </div>

        {/* Desktop two-column */}
        <div className="lg:grid lg:grid-cols-[340px_1fr] gap-5">

          {/* Left: balance + request form */}
          <div className="space-y-3">

            {/* Balance card */}
            <div className={cn(
              'rounded-xl p-4 border flex items-center justify-between',
              isLowBalance ? 'bg-red-500/8 border-red-500/25' : 'bg-slate-dark border-gold/20'
            )}>
              <div>
                <p className={cn('text-[11px] font-medium mb-0.5', isLowBalance ? 'text-red-400' : 'text-white/50')}>
                  {isLowBalance ? '⚠️ Low Balance' : 'Current Balance'}
                </p>
                <p className="text-gold font-mono text-2xl font-bold">{formatETB(user?.credit_balance ?? 0)}</p>
              </div>
              {pendingCount > 0 && (
                <div className="text-right">
                  <p className="text-white/35 text-[11px] mb-0.5">Pending</p>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-bold text-sm">{pendingCount}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Request form */}
            <div className="bg-slate-dark border border-white/8 rounded-xl p-4 space-y-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Request Credits</p>

              {/* Request from toggle */}
              <div>
                <label className="text-white/40 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">From</label>
                <div className="flex bg-charcoal rounded-lg p-0.5 gap-0.5">
                  <button onClick={() => setToAgent(true)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all',
                      toAgent ? 'bg-gold text-charcoal' : 'text-white/50 hover:text-white'
                    )}>
                    <User className="w-3.5 h-3.5" />My Agent
                  </button>
                  <button onClick={() => setToAgent(false)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all',
                      !toAgent ? 'bg-gold text-charcoal' : 'text-white/50 hover:text-white'
                    )}>
                    <Shield className="w-3.5 h-3.5" />Admin
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-white/40 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">Amount (ETB)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  className="w-full bg-charcoal border border-white/8 focus:border-gold rounded-lg px-3 py-2.5 text-white font-mono text-lg focus:outline-none placeholder:text-white/15 transition-colors"
                />
                <div className="flex gap-1.5 mt-2">
                  {[500, 1000, 2000, 5000].map(v => (
                    <button key={v} onClick={() => setAmount(String(v))}
                      className={cn(
                        'flex-1 py-1.5 rounded-md text-[11px] font-medium border transition-all',
                        amount === String(v)
                          ? 'bg-gold/15 border-gold/40 text-gold'
                          : 'border-white/8 text-white/35 hover:text-white hover:border-white/20'
                      )}>
                      {v >= 1000 ? `${v/1000}k` : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-white/40 text-[11px] font-semibold uppercase tracking-wider block mb-1.5">
                  Note <span className="text-white/25 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Reason for request..."
                  className="w-full bg-charcoal border border-white/8 focus:border-gold/40 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none placeholder:text-white/20 transition-colors"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !amount}
                className={cn(
                  'w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2',
                  !submitting && amount
                    ? 'bg-gold text-charcoal hover:bg-gold/90 active:scale-[0.98]'
                    : 'bg-white/8 text-white/25 cursor-not-allowed'
                )}>
                <TrendingUp className="w-3.5 h-3.5" />
                {submitting ? 'Submitting...' : `Request from ${toAgent ? 'Agent' : 'Admin'}`}
              </button>
            </div>
          </div>

          {/* Right: history */}
          <div className="mt-4 lg:mt-0">
            {/* Tabs */}
            <div className="flex bg-charcoal rounded-lg p-0.5 gap-0.5 mb-3">
              {[
                { key: 'request', label: 'Recent' },
                { key: 'history', label: 'All Requests' },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-xs font-semibold transition-all',
                    activeTab === t.key ? 'bg-gold text-charcoal shadow' : 'text-white/50 hover:text-white'
                  )}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'request' && (
              <div className="space-y-2">
                {requests.length === 0 && (
                  <div className="bg-slate-dark border border-white/8 rounded-xl p-8 text-center">
                    <p className="text-white/25 text-sm">No requests yet</p>
                  </div>
                )}
                {requests.slice(0, 8).map(req => (
                  <div key={req.id} className={cn(
                    'bg-slate-dark border rounded-xl px-4 py-3 flex items-center gap-3',
                    req.status === 'pending' ? 'border-amber-500/25' :
                    req.status === 'approved' ? 'border-emerald-500/25' :
                    'border-white/8'
                  )}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: req.status === 'pending' ? 'rgba(245,158,11,0.1)' : req.status === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                      {req.status === 'pending' ? <Clock className="w-4 h-4 text-amber-400" /> :
                       req.status === 'approved' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                       <XCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono font-bold text-sm">{formatETB(req.amount)}</p>
                      {req.note && <p className="text-white/40 text-xs truncate">{req.note}</p>}
                      {req.admin_note && <p className="text-red-400 text-xs">{req.admin_note}</p>}
                      <p className="text-white/25 text-[11px]">{formatDate(req.created_at)}</p>
                    </div>
                    <StatusBadge status={req.status} type="request" />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-slate-dark border border-white/8 rounded-xl p-4">
                <DataTable
                  columns={[
                    { key: 'amount', label: 'Amount', render: (v: any) => <span className="font-mono text-sm font-bold text-white">{formatETB(v)}</span> },
                    { key: 'status', label: 'Status', render: (v: any) => <StatusBadge status={v} type="request" /> },
                    { key: 'note', label: 'Note', render: (v: any) => <span className="text-white/35 text-xs">{v ?? '—'}</span> },
                    { key: 'created_at', label: 'Date', render: (v: any) => <span className="text-white/35 text-xs">{formatDate(v)}</span> },
                    {
                      key: 'approver', label: 'By',
                      render: (_v: any, row: any) => {
                        if (row.status === 'pending') return <span className="text-white/25 text-xs">—</span>
                        const name = row.approver?.username
                        const role = row.approver?.role
                        if (!name) return <span className="text-white/25 text-xs">—</span>
                        return (
                          <span className="text-xs font-medium">
                            <span className={role === 'admin' ? 'text-purple-400' : 'text-gold'}>@{name}</span>
                            <span className="text-white/25 ml-1">({role})</span>
                          </span>
                        )
                      },
                    },
                  ]}
                  data={requests}
                  emptyMessage="No requests yet"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
