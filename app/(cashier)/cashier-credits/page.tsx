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
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 mb-2">
            <CreditCard className="w-6 h-6 text-gold" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Credits</h1>
          <p className="text-white/40 text-sm">Manage your credit balance &amp; requests</p>
        </div>

        {/* Balance card */}
        <div className={cn(
          'rounded-2xl p-6 border flex items-center justify-between',
          isLowBalance
            ? 'bg-red-500/8 border-red-500/25'
            : 'bg-slate-dark border-gold/20'
        )}>
          <div>
            <p className={cn('text-xs font-medium mb-1', isLowBalance ? 'text-red-400' : 'text-white/50')}>
              {isLowBalance ? '⚠️ Low Balance' : 'Current Balance'}
            </p>
            <p className="text-gold font-mono text-3xl font-bold">{formatETB(user?.credit_balance ?? 0)}</p>
          </div>
          {pendingCount > 0 && (
            <div className="text-right">
              <p className="text-white/35 text-xs mb-1">Pending</p>
              <div className="flex items-center gap-1.5 text-amber-400">
                <Clock className="w-4 h-4" />
                <span className="font-bold">{pendingCount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-charcoal rounded-2xl p-1 gap-1">
          {[
            { key: 'request', label: 'Request Credits' },
            { key: 'history', label: 'History' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                activeTab === t.key ? 'bg-gold text-charcoal shadow' : 'text-white/50 hover:text-white'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'request' && (
          <div className="space-y-5">
            <div className="bg-slate-dark border border-white/8 rounded-2xl p-6 space-y-5">

              {/* Request from toggle */}
              <div>
                <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-3">
                  Request from
                </label>
                <div className="flex bg-charcoal rounded-xl p-1 gap-1">
                  <button onClick={() => setToAgent(true)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                      toAgent ? 'bg-gold text-charcoal' : 'text-white/50 hover:text-white'
                    )}>
                    <User className="w-4 h-4" />My Agent
                  </button>
                  <button onClick={() => setToAgent(false)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
                      !toAgent ? 'bg-gold text-charcoal' : 'text-white/50 hover:text-white'
                    )}>
                    <Shield className="w-4 h-4" />Admin
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-2">
                  Amount (ETB)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  className="w-full bg-charcoal border-2 border-white/8 focus:border-gold rounded-xl px-4 py-3.5 text-white font-mono text-xl focus:outline-none placeholder:text-white/15 transition-colors"
                />
                {/* Quick-pick amounts */}
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 2000, 5000].map(v => (
                    <button key={v} onClick={() => setAmount(String(v))}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        amount === String(v)
                          ? 'bg-gold/15 border-gold/40 text-gold'
                          : 'border-white/8 text-white/35 hover:text-white hover:border-white/20'
                      )}>
                      {v.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-2">
                  Note <span className="text-white/25 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Reason for request..."
                  className="w-full bg-charcoal border-2 border-white/8 focus:border-gold/40 rounded-xl px-4 py-3 text-white text-sm focus:outline-none resize-none placeholder:text-white/20 transition-colors"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !amount}
                className={cn(
                  'w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2',
                  !submitting && amount
                    ? 'bg-gold text-charcoal hover:bg-gold/90 active:scale-[0.98]'
                    : 'bg-white/8 text-white/25 cursor-not-allowed'
                )}>
                <TrendingUp className="w-4 h-4" />
                {submitting ? 'Submitting...' : `Request from ${toAgent ? 'Agent' : 'Admin'}`}
              </button>
            </div>

            {/* Recent requests */}
            {requests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider px-1">Recent Requests</h3>
                {requests.slice(0, 5).map(req => (
                  <div key={req.id} className={cn(
                    'bg-slate-dark border rounded-2xl px-5 py-4 flex items-center gap-4',
                    req.status === 'pending' ? 'border-amber-500/25' :
                    req.status === 'approved' ? 'border-emerald-500/25' :
                    'border-white/8'
                  )}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: req.status === 'pending' ? 'rgba(245,158,11,0.1)' : req.status === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                      {req.status === 'pending' ? <Clock className="w-5 h-5 text-amber-400" /> :
                       req.status === 'approved' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
                       <XCircle className="w-5 h-5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-mono font-bold">{formatETB(req.amount)}</p>
                      {req.note && <p className="text-white/40 text-xs truncate mt-0.5">{req.note}</p>}
                      {req.admin_note && <p className="text-red-400 text-xs mt-0.5">{req.admin_note}</p>}
                      <p className="text-white/25 text-xs mt-0.5">{formatDate(req.created_at)}</p>
                    </div>
                    <StatusBadge status={req.status} type="request" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-slate-dark border border-white/8 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">All Requests</h3>
            <DataTable
              columns={[
                { key: 'amount', label: 'Amount', render: (v: any) => formatETB(v) },
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
  )
}