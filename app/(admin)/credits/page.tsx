'use client'

import { useState, useEffect } from 'react'
import {
  getCreditRequests,
  approveCreditRequest,
  declineCreditRequest,
} from '@/lib/actions/adminFinance'
import { addCreditsToUser }
  from '@/lib/actions/admin'
import { getAllUsers }
  from '@/lib/actions/admin'
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
  Search,
  Check,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function CreditsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] =
    useState('assign')
  const [requests, setRequests] =
    useState<any[]>([])
  const [pendingOnly, setPendingOnly] =
    useState<any[]>([])
  const [allRequests, setAllRequests] =
    useState<any[]>([])
  const [loadingReqs, setLoadingReqs] =
    useState(true)

  // Assign form
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] =
    useState<any[]>([])
  const [selectedUser, setSelectedUser] =
    useState<any>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [assigning, setAssigning] =
    useState(false)
  const [showSearch, setShowSearch] =
    useState(false)

  // Decline note modal
  const [showDecline, setShowDecline] =
    useState(false)
  const [declineReqId, setDeclineReqId] =
    useState('')
  const [declineNote, setDeclineNote] =
    useState('')

  // Credit history
  const [history, setHistory] =
    useState<any[]>([])

  useEffect(() => {
    loadRequests()
    loadHistory()
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { users: agents } = await getAllUsers('agent', { search, limit: 5 })
      const { users: cashiers } = await getAllUsers('cashier', { search, limit: 5 })
      const { users: bettors } = await getAllUsers('bettor', { search, limit: 5 })
      setSearchResults([...agents, ...cashiers, ...bettors])
      setShowSearch(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadRequests = async () => {
    setLoadingReqs(true)
    const { requests: all } =
      await getCreditRequests({ limit: 100 })
    setAllRequests(all)
    setPendingOnly(
      all.filter((r: any) => r.status === 'pending')
    )
    setLoadingReqs(false)
  }

  const loadHistory = async () => {
    const { createClient } = await import(
      '@/lib/supabase/client'
    )
    const supabase = createClient()
    const { data } = await supabase
      .from('credit_assignments')
      .select(
        `
        *,
        from_profile:profiles!credit_assignments_from_user_id_fkey (username),
        to_profile:profiles!credit_assignments_to_user_id_fkey (username)
      `
      )
      .order('created_at', { ascending: false })
      .limit(50)
    setHistory(data ?? [])
  }

  const handleAssign = async () => {
    if (!user || !selectedUser || !amount)
      return
    setAssigning(true)
    const result = await addCreditsToUser(
      user.id,
      selectedUser.id,
      parseFloat(amount),
      note
    )
    if (result.success) {
      toast.success(
        `ETB ${amount} assigned to @${selectedUser.username}`
      )
      setSelectedUser(null)
      setAmount('')
      setNote('')
      setSearch('')
      loadHistory()
    } else {
      toast.error(result.error)
    }
    setAssigning(false)
  }

  const handleApprove = async (
    reqId: string
  ) => {
    if (!user) return
    const result = await approveCreditRequest(
      reqId,
      user.id
    )
    if (result.success) {
      toast.success('Credit request approved')
      loadRequests()
    } else {
      toast.error(result.error)
    }
  }

  const handleDecline = async () => {
    if (!user || !declineReqId) return
    const result = await declineCreditRequest(
      declineReqId,
      declineNote,
      user.id
    )
    if (result.success) {
      toast.success('Request declined')
      setShowDecline(false)
      setDeclineNote('')
      loadRequests()
    }
  }

  const historyColumns = [
    {
      key: 'from_profile',
      label: 'From',
      render: (v: any) => (
        <span className="text-white/70 text-xs">
          @{v?.username ?? 'admin'}
        </span>
      ),
    },
    {
      key: 'to_profile',
      label: 'To',
      render: (v: any) => (
        <span className="text-gold text-xs font-medium">
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
        Credit Management
      </h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'assign', label: 'Assign Credits' },
          {
            key: 'requests',
            label: `Requests${pendingOnly.length > 0 ? ` (${pendingOnly.length})` : ''}`,
          },
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

      {/* ── ASSIGN TAB ── */}
      {activeTab === 'assign' && (
        <div className="space-y-6">
          {/* Admin balance */}
          <div className="bg-slate-dark border border-gold/30 rounded-xl p-5">
            <p className="text-white/60 text-sm mb-1">
              💰 Admin Balance
            </p>
            <p className="text-gold font-mono text-3xl font-bold">
              {formatETB(
                user?.credit_balance ?? 0
              )}
            </p>
            <p className="text-white/40 text-xs mt-1">
              Available to assign
            </p>
          </div>

          {/* Assign form */}
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-white">
              Assign Credits to User
            </h2>

            {/* User search */}
            <div className="relative">
              <label className="text-xs text-white/60 block mb-1">
                Search User
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={
                    selectedUser
                      ? `@${selectedUser.username} (${selectedUser.role})`
                      : search
                  }
                  onChange={(e) => {
                    if (selectedUser)
                      setSelectedUser(null)
                    setSearch(e.target.value)
                  }}
                  placeholder="Search agent, cashier or bettor..."
                  className="w-full bg-charcoal border border-gold/20 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none"
                />
              </div>
              {showSearch &&
                searchResults.length > 0 &&
                !selectedUser && (
                  <div className="absolute z-10 mt-1 w-full bg-slate-dark border border-nile-blue/40 rounded-lg overflow-hidden shadow-xl">
                    {searchResults.map(
                      (u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u)
                            setSearch(u.username)
                            setShowSearch(false)
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-nile-blue/20 flex items-center justify-between"
                        >
                          <span className="text-white text-sm">
                            @{u.username}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 text-xs capitalize">
                              {u.role}
                            </span>
                            <span className="text-gold font-mono text-xs">
                              {formatETB(
                                u.credit_balance
                              )}
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
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
              {selectedUser && amount && (
                <div className="mt-2 bg-charcoal/50 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      @{selectedUser.username}{' '}
                      after:
                    </span>
                    <span className="text-nile-success font-mono">
                      {formatETB(
                        (selectedUser.credit_balance ??
                          0) +
                          (parseFloat(amount) || 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">
                      Admin after:
                    </span>
                    <span className="text-nile-danger font-mono">
                      {formatETB(
                        (user?.credit_balance ??
                          0) -
                          (parseFloat(amount) || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-white/60 block mb-1">
                Note (optional)
              </label>
              <input
                value={note}
                onChange={(e) =>
                  setNote(e.target.value)
                }
                placeholder="Reason for credit..."
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none"
              />
            </div>

            <button
              onClick={handleAssign}
              disabled={
                assigning ||
                !selectedUser ||
                !amount
              }
              className={cn(
                'w-full py-3 rounded-lg font-semibold text-sm',
                !assigning &&
                  selectedUser &&
                  amount
                  ? 'bg-gold text-charcoal hover:bg-gold-light'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              )}
            >
              {assigning
                ? 'Assigning...'
                : 'Assign Credits'}
            </button>
          </div>

          {/* Credit history */}
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">
              Credit History
            </h3>
            <DataTable
              columns={historyColumns}
              data={history}
              emptyMessage="No credit assignments yet"
            />
          </div>
        </div>
      )}

      {/* ── REQUESTS TAB ── */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Pending requests */}
          {pendingOnly.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                Pending Requests
                <span className="bg-gold text-charcoal text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingOnly.length}
                </span>
              </h2>
              {pendingOnly.map((req: any) => (
                <div
                  key={req.id}
                  className="bg-slate-dark border border-gold/30 border-l-4 border-l-gold rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gold font-medium text-sm">
                        @{req.requester?.username}
                      </span>
                      <span className="text-white/40 text-xs capitalize">
                        ({req.requester?.role})
                      </span>
                    </div>
                    <p className="text-2xl font-mono font-bold text-white">
                      {formatETB(req.amount)}
                    </p>
                    {req.note && (
                      <p className="text-white/50 text-xs mt-1">
                        "{req.note}"
                      </p>
                    )}
                    <p className="text-white/30 text-xs mt-1">
                      {formatDate(req.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        handleApprove(req.id)
                      }
                      className="flex items-center gap-1.5 bg-nile-success text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-nile-success/80"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setDeclineReqId(req.id)
                        setShowDecline(true)
                      }}
                      className="flex items-center gap-1.5 border border-nile-danger/40 text-nile-danger px-4 py-2 rounded-lg text-sm hover:bg-nile-danger/10"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All requests table */}
          <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">
              All Requests
            </h3>
            <DataTable
              columns={[
                {
                  key: 'requester',
                  label: 'From',
                  render: (v: any) => (
                    <span className="text-gold text-xs font-medium">
                      @{v?.username}
                    </span>
                  ),
                },
                {
                  key: 'amount',
                  label: 'Amount',
                  render: (v: any) => (
                    <span className="font-mono text-xs text-white">
                      {formatETB(v)}
                    </span>
                  ),
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
                  key: 'admin_note',
                  label: 'Admin Note',
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
              data={allRequests}
              isLoading={loadingReqs}
              emptyMessage="No credit requests"
            />
          </div>
        </div>
      )}

      {/* Decline note modal */}
      <Dialog
        open={showDecline}
        onOpenChange={setShowDecline}
      >
        <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              Decline Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Reason (optional)
              </label>
              <textarea
                value={declineNote}
                onChange={(e) =>
                  setDeclineNote(e.target.value)
                }
                rows={3}
                placeholder="Enter reason..."
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setShowDecline(false)
                }
                className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 bg-nile-danger text-white py-2.5 rounded-lg text-sm font-semibold"
              >
                Decline Request
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}