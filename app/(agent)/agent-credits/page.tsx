'use client'

import { useState, useEffect } from 'react'
import {
  requestCreditsFromAdmin,
  getAgentCreditHistory,
  agentApproveCreditRequest,
  agentDeclineCreditRequest,
} from '@/lib/actions/agent'
import { createClient }
  from '@/lib/supabase/client'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { formatETB, formatDate }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'

export default function AgentCreditsPage() {
  const { user } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] =
    useState(false)
  const [requests, setRequests] =
    useState<any[]>([])
  const [history, setHistory] =
    useState<any[]>([])
  const [activeTab, setActiveTab] =
    useState('request')
  const [cashierRequests, setCashierRequests] =
    useState<any[]>([])
  const [approvingId, setApprovingId] =
    useState<string | null>(null)
  const [historyFilter, setHistoryFilter] =
    useState<'all' | 'admin_to_agent' | 'agent_to_cashier'>('all')

  useEffect(() => {
    if (user) {
      loadRequests()
      loadCashierRequests()
      getAgentCreditHistory(user.id).then(setHistory)
    }
  }, [user])

  const loadCashierRequests = async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('credit_requests')
      .select('*, requester:profiles!credit_requests_requester_id_fkey(username, credit_balance)')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setCashierRequests(data ?? [])
  }

  const handleApproveCashierRequest = async (reqId: string, amount: number, requesterId: string) => {
    if (!user) return
    setApprovingId(reqId)
    try {
      const result = await agentApproveCreditRequest(reqId, user.id)
      if (result.success) {
        toast.success('Request approved!')
        // Refresh agent balance
        const supabase = createClient()
        const { data: profile } = await supabase.from('profiles').select('credit_balance').eq('id', user.id).single()
        if (profile) useAuthStore.getState().updateBalance(profile.credit_balance)
        loadCashierRequests()
      } else {
        toast.error(result.error ?? 'Failed to approve')
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to approve')
    }
    setApprovingId(null)
  }

  const handleDeclineCashierRequest = async (reqId: string, requesterId: string) => {
    if (!user) return
    setApprovingId(reqId)
    const supabase = createClient()
    await supabase.from('credit_requests').update({
      status: 'declined', updated_at: new Date().toISOString()
    }).eq('id', reqId)
    await supabase.from('notifications').insert({
      to_user_id: requesterId,
      from_user_id: user.id,
      message: `❌ Your credit request has been declined by your agent.`,
      type: 'balance_updated',
      priority: 'normal',
    })
    toast.success('Request declined')
    loadCashierRequests()
    setApprovingId(null)
  }

  const loadRequests = async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', {
        ascending: false,
      })
      .limit(20)
    setRequests(data ?? [])
  }

  const handleSubmit = async () => {
    if (!user || !amount) return
    setSubmitting(true)
    const result =
      await requestCreditsFromAdmin(
        user.id,
        parseFloat(amount) || 0,
        note
      )
    if (result.success) {
      toast.success(
        'Credit request submitted!'
      )
      setAmount('')
      setNote('')
      loadRequests()
    } else {
      toast.error(result.error)
    }
    setSubmitting(false)
  }

  const isLowBalance =
    (user?.credit_balance ?? 0) < 1000

  const historyColumns = [
    {
      key: 'from_profile',
      label: 'From',
      render: (v: any) => (
        <span className="text-white/60 text-xs">
          @{v?.username ?? '—'}
        </span>
      ),
    },
    {
      key: 'to_profile',
      label: 'To',
      render: (v: any) => (
        <span className="text-gold text-xs">
          @{v?.username ?? '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (v: any) => (
        <span className="text-nile-success font-mono text-xs">
          +{formatETB(v)}
        </span>
      ),
    },
    {
      key: 'note',
      label: 'Note',
      render: (v: any) => (
        <span className="text-white/40 text-xs">
          {v ?? '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (v: any) => (
        <span className="text-white/40 text-xs">
          {formatDate(v)}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">
        Credits
      </h1>

      {/* Balance card */}
      <div
        className={cn(
          'rounded-xl p-5 border',
          isLowBalance
            ? 'bg-nile-danger/10 border-nile-danger/30'
            : 'bg-slate-dark border-gold/30'
        )}
      >
        <p className="text-white/60 text-sm mb-1">
          {isLowBalance
            ? '⚠️ Low Balance'
            : 'My Balance'}
        </p>
        <p className="text-gold font-mono text-3xl font-bold">
          {formatETB(
            user?.credit_balance ?? 0
          )}
        </p>
        {isLowBalance && (
          <p className="text-white/50 text-xs mt-1">
            Request credits from admin below
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'request', label: 'Request Credits' },
          { key: 'cashiers', label: `Cashier Requests${cashierRequests.filter(r => r.status === 'pending').length > 0 ? ` (${cashierRequests.filter(r => r.status === 'pending').length})` : ''}` },
          { key: 'history', label: 'History' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() =>
              setActiveTab(t.key)
            }
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              activeTab === t.key
                ? 'bg-gold text-charcoal'
                : 'bg-slate-dark border border-nile-blue/30 text-white/60 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'request' && (
        <div className="space-y-6">
          {/* Request form */}
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-white">
              Request Credits from Admin
            </h2>
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Amount (ETB)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="0.00"
                min="1"
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Note / Reason (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) =>
                  setNote(e.target.value)
                }
                rows={2}
                placeholder="Why do you need credits?"
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={
                submitting || !amount
              }
              className={cn(
                'w-full py-3 rounded-lg font-semibold text-sm',
                !submitting && amount
                  ? 'bg-gold text-charcoal hover:bg-gold-light'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {submitting
                ? 'Submitting...'
                : 'Submit Request'}
            </button>
          </div>

          {/* Pending requests status */}
          {requests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold">
                My Requests
              </h3>
              {requests.slice(0, 5).map(
                (req) => (
                  <div
                    key={req.id}
                    className={cn(
                      'bg-slate-dark border rounded-xl p-4 flex items-center gap-4',
                      req.status === 'pending'
                        ? 'border-gold/30'
                        : req.status ===
                          'approved'
                        ? 'border-nile-success/30'
                        : 'border-nile-danger/20'
                    )}
                  >
                    <div className="flex-shrink-0">
                      {req.status ===
                      'pending' ? (
                        <Clock className="w-5 h-5 text-gold" />
                      ) : req.status ===
                        'approved' ? (
                        <CheckCircle className="w-5 h-5 text-nile-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-nile-danger" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-mono font-bold">
                        {formatETB(req.amount)}
                      </p>
                      {req.note && (
                        <p className="text-white/50 text-xs">
                          {req.note}
                        </p>
                      )}
                      {req.admin_note && (
                        <p className="text-nile-danger text-xs mt-0.5">
                          Admin: {req.admin_note}
                        </p>
                      )}
                      <p className="text-white/30 text-xs">
                        {formatDate(
                          req.created_at
                        )}
                      </p>
                    </div>
                    <StatusBadge
                      status={req.status}
                      type="request"
                    />
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cashiers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Cashier Credit Requests</h3>
              <span className="text-white/40 text-xs">{cashierRequests.length} total</span>
            </div>
            {cashierRequests.length === 0 ? (
              <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-8 text-center">
                <p className="text-white/40 text-sm">No cashier requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cashierRequests.map((req) => (
                  <div key={req.id} className={cn(
                    'bg-slate-dark border rounded-xl p-4',
                    req.status === 'pending' ? 'border-gold/30' :
                    req.status === 'approved' ? 'border-nile-success/30' : 'border-nile-danger/20'
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-semibold text-sm">@{req.requester?.username ?? '—'}</p>
                        <p className="text-white/40 text-xs">{formatDate(req.created_at)}</p>
                        {req.note && <p className="text-white/50 text-xs mt-0.5">{req.note}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-gold font-mono font-bold text-lg">{formatETB(req.amount)}</p>
                        <StatusBadge status={req.status} type="request" />
                      </div>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApproveCashierRequest(req.id, req.amount, req.requester_id)}
                          disabled={approvingId === req.id}
                          className="flex-1 bg-nile-success text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-nile-success/80 disabled:opacity-50 transition-colors"
                        >
                          {approvingId === req.id ? 'Processing...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => handleDeclineCashierRequest(req.id, req.requester_id)}
                          disabled={approvingId === req.id}
                          className="flex-1 border border-nile-danger/40 text-nile-danger py-2.5 rounded-lg text-sm hover:bg-nile-danger/10 disabled:opacity-50 transition-colors"
                        >
                          ✗ Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {activeTab === 'history' && (
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-white font-semibold">Credit History</h3>
            <span className="text-white/40 text-xs">{history.length} records</span>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: '🔁 All' },
              { key: 'admin_to_agent', label: '⬇️ Admin → Me' },
              { key: 'agent_to_cashier', label: '⬆️ Me → Cashier' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setHistoryFilter(f.key as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  historyFilter === f.key
                    ? 'bg-gold text-charcoal'
                    : 'bg-charcoal border border-nile-blue/30 text-white/60 hover:text-white'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtered results */}
          {(() => {
            const filtered = history.filter((h: any) => {
              if (historyFilter === 'admin_to_agent') return h.to_profile?.username === user?.username
              if (historyFilter === 'agent_to_cashier') return h.from_profile?.username === user?.username
              return true
            })

            if (filtered.length === 0) {
              return (
                <div className="py-8 text-center text-white/30 text-sm">
                  No records for this filter
                </div>
              )
            }

            return (
              <div className="space-y-2">
                {filtered.map((h: any) => {
                  const isIncoming = h.to_profile?.username === user?.username
                  return (
                    <div key={h.id} className={cn(
                      'flex items-center gap-4 p-3 rounded-xl border transition-all',
                      isIncoming
                        ? 'bg-nile-success/5 border-nile-success/20'
                        : 'bg-gold/5 border-gold/20'
                    )}>
                      {/* Direction badge */}
                      <div className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                        isIncoming ? 'bg-nile-success/20 text-nile-success' : 'bg-gold/20 text-gold'
                      )}>
                        {isIncoming ? '↓' : '↑'}
                      </div>

                      {/* From → To */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-white/50">@{h.from_profile?.username ?? '—'}</span>
                          <span className="text-white/20">→</span>
                          <span className={isIncoming ? 'text-nile-success font-medium' : 'text-gold font-medium'}>
                            @{h.to_profile?.username ?? '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {h.note && <span className="text-white/30 text-xs truncate">{h.note}</span>}
                          <span className="text-white/20 text-xs">{formatDate(h.created_at)}</span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className={cn(
                        'font-mono font-bold text-sm flex-shrink-0',
                        isIncoming ? 'text-nile-success' : 'text-gold'
                      )}>
                        {isIncoming ? '+' : '-'}{formatETB(h.amount)}
                      </div>

                      {/* Direction label */}
                      <div className={cn(
                        'hidden sm:block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0',
                        isIncoming
                          ? 'bg-nile-success/10 text-nile-success border border-nile-success/20'
                          : 'bg-gold/10 text-gold border border-gold/20'
                      )}>
                        {isIncoming ? 'Admin → Me' : 'Me → Cashier'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}