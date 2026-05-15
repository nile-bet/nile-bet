'use client'

import { useState, useEffect } from 'react'
import {
  getAllCoupons,
  getCouponStats,
  lookupCoupon,
  approveTopupByAdmin,
  approveWithdrawalByAdmin,
  forceExpireCoupon,
} from '@/lib/actions/adminFinance'
import { StatsCard }
  from '@/components/shared/StatsCard'
import { DataTable }
  from '@/components/shared/DataTable'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import {
  formatETB,
  formatDate,
  formatCountdown,
} from '@/lib/utils/formatCurrency'
import { useAuthStore }
  from '@/lib/stores/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Ticket,
  TrendingUp,
  Check,
  X,
  Clock,
} from 'lucide-react'

export default function AdminCouponsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] =
    useState('topup')
  const [stats, setStats] =
    useState<any>(null)
  const [coupons, setCoupons] =
    useState<any[]>([])
  const [loading, setLoading] =
    useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Lookup
  const [code, setCode] = useState('')
  const [lookedUp, setLookedUp] =
    useState<any>(null)
  const [lookupError, setLookupError] =
    useState('')
  const [lookupLoading, setLookupLoading] =
    useState(false)
  const [approving, setApproving] =
    useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    loadCoupons()
  }, [activeTab, page])

  const loadStats = async () => {
    const s = await getCouponStats()
    setStats(s)
  }

  const loadCoupons = async () => {
    setLoading(true)
    const { coupons: data, total: t } =
      await getAllCoupons({
        type: activeTab,
        page,
        limit: 20,
      })
    setCoupons(data)
    setTotal(t)
    setLoading(false)
  }

  const handleLookup = async () => {
    if (!code.trim()) return
    setLookupLoading(true)
    setLookedUp(null)
    setLookupError('')

    const result = await lookupCoupon(
      code.trim()
    )
    if (result.success) {
      setLookedUp(result.coupon)
    } else {
      setLookupError(
        result.error ??
          'Coupon not found'
      )
    }
    setLookupLoading(false)
  }

  const handleApprove = async () => {
    if (!user || !lookedUp) return
    setApproving(true)

    const result =
      lookedUp.type === 'topup'
        ? await approveTopupByAdmin(
            code.trim(),
            user.id
          )
        : await approveWithdrawalByAdmin(
            code.trim(),
            user.id
          )

    if (result.success) {
      toast.success(
        `Coupon ${lookedUp.type === 'topup' ? 'top-up' : 'withdrawal'} approved!`
      )
      setLookedUp(null)
      setCode('')
      loadStats()
      loadCoupons()
    } else {
      toast.error(result.error)
    }
    setApproving(false)
  }

  const handleForceExpire = async (
    couponId: string
  ) => {
    if (!user) return
    const result = await forceExpireCoupon(
      couponId,
      user.id
    )
    if (result.success) {
      toast.success('Coupon expired')
      loadCoupons()
      loadStats()
    }
  }

  const columns = [
    {
      key: 'code',
      label: 'Code',
      render: (v: any) => (
        <span className="text-gold font-mono font-bold">
          {v}
        </span>
      ),
    },
    {
      key: 'bettor',
      label: 'Bettor',
      render: (v: any) => (
        <span className="text-white/70 text-xs">
          @{v?.username ?? '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (v: any) => (
        <span className="font-mono text-xs text-gold">
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
          type="coupon"
        />
      ),
    },
    {
      key: 'expires_at',
      label: 'Expires',
      render: (v: any, row: any) =>
        row.status === 'pending' ? (
          <span className="text-nile-orange text-xs">
            {formatCountdown(v)}
          </span>
        ) : (
          <span className="text-white/30 text-xs">
            {formatDate(v)}
          </span>
        ),
    },
    {
      key: 'redeemer',
      label: 'Redeemed By',
      render: (v: any) => (
        <span className="text-white/40 text-xs">
          {v?.username
            ? `@${v.username}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_: any, row: any) =>
        row.status === 'pending' ? (
          <button
            onClick={() =>
              handleForceExpire(row.id)
            }
            className="text-xs border border-nile-orange/30 text-nile-orange px-2 py-1 rounded hover:bg-nile-orange/10"
          >
            Force Expire
          </button>
        ) : null,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">
        Coupon Management
      </h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Active Top-ups"
            value={stats.activeTopups}
            subtitle={formatETB(
              stats.activeTopupAmount
            )}
            icon={Ticket}
            variant="gold"
          />
          <StatsCard
            title="Active Withdrawals"
            value={stats.activeWithdrawals}
            subtitle={formatETB(
              stats.activeWithdrawalAmount
            )}
            icon={TrendingUp}
            variant="warning"
          />
          <StatsCard
            title="Redeemed Today"
            value={stats.redeemedToday}
            subtitle={formatETB(
              stats.redeemedTodayAmount
            )}
            icon={Check}
            variant="success"
          />
          <StatsCard
            title="Expired Today"
            value={stats.expiredToday}
            icon={Clock}
            variant="danger"
          />
        </div>
      )}

      {/* Lookup panel */}
      <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">
          🔍 Redeem Coupon
        </h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^0-9]/g, '')
                  .slice(0, 6)
              )
            }
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              handleLookup()
            }
            placeholder="6-digit code"
            maxLength={6}
            className="w-48 bg-charcoal border border-gold/30 rounded-lg px-4 py-3 text-gold font-mono text-xl text-center focus:outline-none tracking-widest"
          />
          <button
            onClick={handleLookup}
            disabled={
              code.length !== 6 ||
              lookupLoading
            }
            className={cn(
              'px-6 py-3 rounded-lg font-semibold text-sm',
              code.length === 6 &&
                !lookupLoading
                ? 'bg-gold text-charcoal hover:bg-gold-light'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            )}
          >
            {lookupLoading
              ? 'Searching...'
              : 'Look Up'}
          </button>
        </div>

        {lookupError && (
          <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg p-3">
            <p className="text-nile-danger text-sm">
              ❌ {lookupError}
            </p>
          </div>
        )}

        {lookedUp && (
          <div className="bg-nile-blue/20 border border-gold/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold">
                  @{lookedUp.bettor?.username}
                </p>
                <p className="text-gold font-mono text-2xl font-bold mt-1">
                  {formatETB(lookedUp.amount)}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  Type:{' '}
                  <span className="capitalize text-nile-blue-light">
                    {lookedUp.type}
                  </span>{' '}
                  • Expires:{' '}
                  <span className="text-nile-orange">
                    {formatCountdown(
                      lookedUp.expires_at
                    )}
                  </span>
                </p>
                {lookedUp.type === 'withdrawal' && (
                  <p className="text-nile-orange text-xs mt-1">
                    💵 Give bettor{' '}
                    {formatETB(lookedUp.amount)}{' '}
                    cash
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex items-center gap-1.5 bg-nile-success text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-nile-success/80 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setLookedUp(null)
                    setCode('')
                  }}
                  className="flex items-center gap-1.5 border border-nile-danger/40 text-nile-danger px-4 py-2 rounded-lg text-sm hover:bg-nile-danger/10"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'topup', label: 'Top-up Coupons' },
          { key: 'withdrawal', label: 'Withdrawals' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key)
              setPage(1)
            }}
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={coupons}
        isLoading={loading}
        emptyMessage="No coupons found"
      />

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-3">
          <button
            onClick={() =>
              setPage((p) =>
                Math.max(1, p - 1)
              )
            }
            disabled={page === 1}
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-white/50 text-sm py-2">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() =>
              setPage((p) => p + 1)
            }
            disabled={
              page >= Math.ceil(total / 20)
            }
            className="px-4 py-2 border border-nile-blue/30 text-white/60 rounded-lg text-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}