'use client'

import { useState, useEffect } from 'react'
import {
  getCashiersUnderAgent,
  assignCreditsToSubUser,
  suspendUserByAgent,
} from '@/lib/actions/agent'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { ConfirmModal }
  from '@/components/shared/ConfirmModal'
import { formatETB, formatDate }
  from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'


export default function AgentCashiersPage() {
  const { user } = useAuthStore()
  const [cashiers, setCashiers] =
    useState<any[]>([])
  const [loading, setLoading] =
    useState(true)


  // Credits modal
  const [showCredits, setShowCredits] =
    useState(false)
  const [selectedCashier, setSelectedCashier] =
    useState<any>(null)
  const [creditAmount, setCreditAmount] =
    useState('')
  const [addingCredits, setAddingCredits] =
    useState(false)
  const [resettingBalance, setResettingBalance] = useState<string | null>(null)

  // Confirm modal
  const [showConfirm, setShowConfirm] =
    useState(false)
  const [confirmData, setConfirmData] =
    useState<any>(null)

  useEffect(() => {
    if (user) loadCashiers()
  }, [user])

  const loadCashiers = async () => {
    if (!user) return
    setLoading(true)
    const data =
      await getCashiersUnderAgent(user.id)
    setCashiers(data)
    setLoading(false)
  }


  const handleAddCredits = async () => {
    if (!user || !selectedCashier) return
    setAddingCredits(true)
    const result =
      await assignCreditsToSubUser(
        user.id,
        selectedCashier.id,
        parseFloat(creditAmount) || 0
      )
    if (result.success) {
      toast.success(
        `ETB ${creditAmount} assigned to @${selectedCashier.username}`
      )
      setShowCredits(false)
      setCreditAmount('')
      loadCashiers()
    } else {
      toast.error(result.error)
    }
    setAddingCredits(false)
  }

  const handleResetBalance = async (cashier: any) => {
    setResettingBalance(cashier.id)
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ credit_balance: 0 })
      .eq('id', cashier.id)
    if (!error) {
      toast.success(`@${cashier.username} balance reset to zero`)
      loadCashiers()
    } else {
      toast.error('Failed to reset balance')
    }
    setResettingBalance(null)
  }

  const handleSuspend = async () => {
    if (!user || !confirmData) return
    const isSuspended =
      confirmData.status === 'suspended'
    const result = await suspendUserByAgent(
      confirmData.id,
      user.id,
      !isSuspended
    )
    if (result.success) {
      toast.success(
        isSuspended
          ? `@${confirmData.username} activated`
          : `@${confirmData.username} suspended`
      )
      setShowConfirm(false)
      loadCashiers()
    } else {
      toast.error(result.error)
    }
  }

  const columns = [
    {
      key: 'username',
      label: 'Cashier',
      render: (v: any) => (
        <span className="text-nile-success font-medium">
          @{v}
        </span>
      ),
    },
    {
      key: 'credit_balance',
      label: 'Balance',
      sortable: true,
      render: (v: any) => (
        <span className="text-gold font-mono text-xs">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'slip_count',
      label: 'Slips',
      render: (v: any) => (
        <span className="text-white/60 text-xs">
          {v}
        </span>
      ),
    },
    {
      key: 'total_collected',
      label: 'Collected',
      sortable: true,
      render: (v: any) => (
        <span className="text-white/70 font-mono text-xs">
          {formatETB(v)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: any) => (
        <StatusBadge status={v} type="user" />
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (v: any) => (
        <span className="text-white/40 text-xs">
          {formatDate(v)}
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedCashier(row)
              setShowCredits(true)
            }}
            className="text-xs border border-gold/30 text-gold px-2 py-1 rounded hover:bg-gold/10"
          >
            💰
          </button>
          <button
            onClick={() => {
              setSelectedCashier(row)
              setConfirmData({ action: 'reset_balance', cashier: row })
              setShowConfirm(true)
            }}
            disabled={resettingBalance === row.id}
            className="text-xs border border-white/20 text-white/50 px-2 py-1 rounded hover:bg-white/10 hover:text-white disabled:opacity-40"
            title="Reset balance to zero"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setConfirmData(row)
              setShowConfirm(true)
            }}
            className={cn(
              'text-xs border px-2 py-1 rounded font-medium',
              row.status === 'active'
                ? 'border-nile-orange/30 text-nile-orange hover:bg-nile-orange/10'
                : 'border-nile-success/30 text-nile-success hover:bg-nile-success/10'
            )}
          >
            {row.status === 'active' ? 'Suspend' : 'Unsuspend'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">
          My Cashiers
        </h1>
        <div className="flex items-center gap-3">
          <div className="bg-slate-dark border border-gold/30 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-white/50">
              Balance:{' '}
            </span>
            <span className="text-gold font-mono font-bold">
              {formatETB(
                user?.credit_balance ?? 0
              )}
            </span>
          </div>

        </div>
      </div>

      <DataTable
        columns={columns}
        data={cashiers}
        isLoading={loading}
        emptyMessage="No cashiers assigned yet"
      />


      {/* Add credits modal */}
      <Dialog
        open={showCredits}
        onOpenChange={setShowCredits}
      >
        <DialogContent className="bg-slate-dark border-nile-blue/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              Assign Credits to @
              {selectedCashier?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm bg-charcoal/50 rounded-lg p-3">
              <span className="text-white/50">
                Your balance:
              </span>
              <span className="text-gold font-mono">
                {formatETB(
                  user?.credit_balance ?? 0
                )}
              </span>
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">
                Amount (ETB)
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) =>
                  setCreditAmount(e.target.value)
                }
                placeholder="0.00"
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-3 py-2.5 text-white font-mono focus:outline-none"
              />
            </div>
            {creditAmount && (
              <div className="bg-charcoal/50 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/50">
                    @{selectedCashier?.username}{' '}
                    after:
                  </span>
                  <span className="text-nile-success font-mono">
                    {formatETB(
                      (selectedCashier?.credit_balance ??
                        0) +
                        (parseFloat(creditAmount) ||
                          0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">
                    Your balance after:
                  </span>
                  <span className="text-nile-danger font-mono">
                    {formatETB(
                      (user?.credit_balance ?? 0) -
                        (parseFloat(creditAmount) ||
                          0)
                    )}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setShowCredits(false)
                }
                className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredits}
                disabled={
                  addingCredits || !creditAmount
                }
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-semibold',
                  !addingCredits && creditAmount
                    ? 'bg-gold text-charcoal hover:bg-gold-light'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                )}
              >
                {addingCredits
                  ? 'Assigning...'
                  : 'Assign Credits'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm suspend */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          if (confirmData?.action === 'reset_balance') {
            handleResetBalance(confirmData.cashier)
            setShowConfirm(false)
          } else {
            handleSuspend()
          }
        }}
        title={
          confirmData?.action === 'reset_balance'
            ? 'Reset Balance?'
            : confirmData?.status === 'active'
            ? 'Suspend Cashier?'
            : 'Activate Cashier?'
        }
        message={
          confirmData?.action === 'reset_balance'
            ? `Reset @${confirmData?.cashier?.username}'s balance to ETB 0? This cannot be undone.`
            : confirmData?.status === 'active'
            ? `Suspend @${confirmData?.username}? They will be logged out.`
            : `Reactivate @${confirmData?.username}?`
        }
        confirmText={
          confirmData?.action === 'reset_balance'
            ? 'Yes, Reset to Zero'
            : confirmData?.status === 'active'
            ? 'Yes, Suspend'
            : 'Yes, Activate'
        }
        variant={
          confirmData?.action === 'reset_balance'
            ? 'warning'
            : confirmData?.status === 'active'
            ? 'danger'
            : 'warning'
        }
      />
    </div>
  )
}