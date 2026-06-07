'use client'

import { useState, useEffect } from 'react'
import {
  requestCreditsByCashier,
} from '@/lib/actions/cashier'
import { createClient }
  from '@/lib/supabase/client'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import {
  formatETB,
  formatDate,
} from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'

export default function CashierCreditsPage() {
  const { user } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [toAgent, setToAgent] = useState(true)
  const [submitting, setSubmitting] =
    useState(false)
  const [requests, setRequests] =
    useState<any[]>([])
  const [activeTab, setActiveTab] =
    useState('request')

  useEffect(() => {
    if (user) loadRequests()
  }, [user])

  // Realtime: refresh balance + requests when credit_request status changes
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const channel = supabase
      .channel(`cashier-credits-page-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'credit_requests',
          filter: `requester_id=eq.${user.id}`,
        },
        async (payload) => {
          const updated = payload.new as any
          loadRequests()
          if (updated.status === 'approved') {
            // Force refresh balance from DB
            const { data: profile } = await supabase
              .from('profiles')
              .select('credit_balance')
              .eq('id', user.id)
              .single()
            if (profile) {
              useAuthStore.getState().updateBalance(profile.credit_balance)
            }
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

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
      await requestCreditsByCashier(
        user.id,
        parseFloat(amount) || 0,
        note,
        toAgent
      )
    if (result.success) {
      toast.success('Credit request sent!')
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

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-white">
        Credits
      </h1>

      {/* Balance */}
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
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'request', label: 'Request Credits' },
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
        <div className="space-y-5">
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-white">
              Request Credits
            </h2>

            {/* Request from */}
            <div>
              <label className="text-xs text-white/60 block mb-2">
                Request from
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setToAgent(true)
                  }
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm border',
                    toAgent
                      ? 'bg-gold border-gold text-charcoal font-semibold'
                      : 'border-nile-blue/30 text-white/60 hover:text-white'
                  )}
                >
                  My Agent
                </button>
                <button
                  onClick={() =>
                    setToAgent(false)
                  }
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm border',
                    !toAgent
                      ? 'bg-gold border-gold text-charcoal font-semibold'
                      : 'border-nile-blue/30 text-white/60 hover:text-white'
                  )}
                >
                  Admin
                </button>
              </div>
            </div>

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
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) =>
                  setNote(e.target.value)
                }
                rows={2}
                placeholder="Reason for request..."
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
                : `Request from ${toAgent ? 'Agent' : 'Admin'}`}
            </button>
          </div>

          {/* Pending requests */}
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
                        <p className="text-nile-danger text-xs">
                          Note:{' '}
                          {req.admin_note}
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

      {activeTab === 'history' && (
        <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">
            All Requests
          </h3>
          <DataTable
            columns={[
              {
                key: 'amount',
                label: 'Amount',
                render: (v: any) =>
                  formatETB(v),
              },
              {
                key: 'status',
                label: 'Status',
                render: (v: any) => (
                  <StatusBadge
                    status={v}
                    type="request"
                  />
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
            ]}
            data={requests}
            emptyMessage="No requests yet"
          />
        </div>
      )}
    </div>
  )
}