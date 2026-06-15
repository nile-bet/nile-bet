'use client'

import { useState, useEffect } from 'react'
import { PublicNavbar }
  from '@/components/shared/PublicNavbar'
import { Footer }
  from '@/components/shared/Footer'
import { StatsCard }
  from '@/components/shared/StatsCard'
import { StatusBadge }
  from '@/components/shared/StatusBadge'
import { RoleBadge }
  from '@/components/shared/RoleBadge'
import { TopupFlowModal }
  from '@/components/bettor/TopupFlowModal'
import { WithdrawalFlowModal }
  from '@/components/bettor/WithdrawalFlowModal'
import {
  getBettorStats,
  getActiveCoupon,
  cancelCoupon,
} from '@/lib/actions/coupons'
import { useAuthStore }
  from '@/lib/stores/authStore'
import {
  formatETB,
  formatDate,
  formatCountdown,
} from '@/lib/utils/formatCurrency'
import { toast } from 'sonner'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  User,
  Gift,
} from 'lucide-react'

export default function ProfilePage() {
  const { user, settings } = useAuthStore()
  const [showTopup, setShowTopup] =
    useState(false)
  const [showWithdraw, setShowWithdraw] =
    useState(false)
  const [stats, setStats] = useState<any>(null)
  const [activeCoupons, setActiveCoupons] =
    useState<any[]>([])
  const [countdown, setCountdown] =
    useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    getBettorStats(user.id).then(setStats)
    getActiveCoupon(user.id).then(
      setActiveCoupons
    )
  }, [user])

  useEffect(() => {
    if (!activeCoupons.length) return
    const interval = setInterval(() => {
      const newCountdowns: Record<
        string,
        string
      > = {}
      activeCoupons.forEach((c) => {
        newCountdowns[c.id] =
          formatCountdown(c.expires_at)
      })
      setCountdown(newCountdowns)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeCoupons])

  const handleCancelCoupon = async (
    couponId: string
  ) => {
    if (!user) return
    const result = await cancelCoupon(
      couponId,
      user.id
    )
    if (result.success) {
      setActiveCoupons((prev) =>
        prev.filter((c) => c.id !== couponId)
      )
      toast.success('Coupon cancelled')
    } else {
      toast.error(result.error)
    }
  }

  if (!user) return null

  const netResultPositive =
    (stats?.netResult ?? 0) >= 0

  const showWelcomeBonus =
    settings?.welcomeBonusEnabled &&
    !user.welcome_bonus_claimed

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-white mb-6">
          My Profile
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Balance card */}
            <div className="bg-slate-dark border border-gold/30 rounded-xl p-5">
              <p className="text-white/60 text-sm mb-1">
                Available Balance
              </p>
              <p className="text-gold font-mono text-3xl font-bold mb-1">
                {formatETB(
                  user.credit_balance
                )}
              </p>
              {(user.reserved_balance ?? 0) >
                0 && (
                <p className="text-nile-orange text-xs mb-4">
                  Reserved:{' '}
                  {formatETB(
                    user.reserved_balance ?? 0
                  )}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() =>
                    setShowTopup(true)
                  }
                  className="flex-1 bg-gold text-charcoal py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-light"
                >
                  💳 Request Top-up
                </button>
                <button
                  onClick={() =>
                    setShowWithdraw(true)
                  }
                  className="flex-1 border border-nile-blue text-nile-blue-light py-2.5 rounded-lg text-sm font-medium hover:bg-nile-blue/20"
                >
                  💸 Withdraw
                </button>
              </div>
            </div>

            {/* Welcome bonus */}
            {showWelcomeBonus && (
              <div className="bg-gold/10 border border-gold/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Gift className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gold font-semibold text-sm">
                      🎁 Welcome Bonus Available!
                    </p>
                    <p className="text-white/60 text-xs mt-1">
                      Top up ETB{' '}
                      {settings?.welcomeBonusMinTopup}{' '}
                      or more to receive ETB{' '}
                      {settings?.welcomeBonusAmount}{' '}
                      bonus automatically.
                    </p>
                    <button
                      onClick={() =>
                        setShowTopup(true)
                      }
                      className="mt-2 text-xs bg-gold text-charcoal px-3 py-1 rounded-lg font-semibold"
                    >
                      Request Top-up Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active coupons */}
            {activeCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-nile-blue/20 border border-gold/30 rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-semibold text-sm">
                    {coupon.type === 'topup'
                      ? '🎫 Active Top-up Coupon'
                      : '💸 Active Withdrawal Coupon'}
                  </p>
                  <button
                    onClick={() =>
                      handleCancelCoupon(
                        coupon.id
                      )
                    }
                    className="text-xs text-nile-danger hover:text-nile-danger/80"
                  >
                    Cancel
                  </button>
                </div>

                {/* Code boxes */}
                <div className="flex gap-1.5 justify-center my-3">
                  {coupon.code
                    .split('')
                    .map((digit: string, i: number) => (
                      <div
                        key={i}
                        className="w-9 h-11 bg-charcoal border border-gold/50 rounded-lg flex items-center justify-center text-gold font-mono text-xl font-bold"
                      >
                        {digit}
                      </div>
                    ))}
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-white/50">
                    Amount:
                  </span>
                  <span className="text-gold font-mono">
                    {formatETB(coupon.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-white/50">
                    Expires in:
                  </span>
                  <span className="text-nile-orange">
                    {countdown[coupon.id] ?? '...'}
                  </span>
                </div>

                <p className="text-white/40 text-xs text-center mt-2">
                  {coupon.type === 'topup'
                    ? 'Show to any cashier to top up'
                    : 'Take to any cashier to collect cash'}
                </p>
              </div>
            ))}

            {activeCoupons.length === 0 && (
              <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5 text-center">
                <p className="text-white/40 text-sm">
                  No active coupons
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() =>
                      setShowTopup(true)
                    }
                    className="flex-1 border border-gold/30 text-gold text-xs py-2 rounded-lg hover:bg-gold/10"
                  >
                    Request Top-up
                  </button>
                  <button
                    onClick={() =>
                      setShowWithdraw(true)
                    }
                    className="flex-1 border border-nile-blue/30 text-white/60 text-xs py-2 rounded-lg hover:bg-nile-blue/20"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
              <p className="text-white font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                Betting Statistics
              </p>
              {/* Regular bets */}
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Regular Bets</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-charcoal/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white font-mono">{stats?.totalBets ?? 0}</p>
                  <p className="text-white/50 text-xs">Total Bets</p>
                </div>
                <div className="bg-nile-success/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-nile-success font-mono">{stats?.wonBets ?? 0}</p>
                  <p className="text-white/50 text-xs">Won</p>
                </div>
                <div className="bg-nile-danger/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-nile-danger font-mono">{stats?.lostBets ?? 0}</p>
                  <p className="text-white/50 text-xs">Lost</p>
                </div>
                <div className="bg-gold/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gold font-mono">{stats?.nearWinBets ?? 0}</p>
                  <p className="text-white/50 text-xs">Near Win 🛡️</p>
                </div>
              </div>

              {/* Jackpot stats */}
              {(stats?.jackpotEntries ?? 0) > 0 && (
                <>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mt-3 mb-2">🏆 Jackpot Entries</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-charcoal/50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-gold font-mono">{stats?.jackpotEntries ?? 0}</p>
                      <p className="text-white/50 text-[10px]">Entries</p>
                    </div>
                    <div className="bg-nile-success/10 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-nile-success font-mono">{stats?.jackpotWon ?? 0}</p>
                      <p className="text-white/50 text-[10px]">Won</p>
                    </div>
                    <div className="bg-gold/10 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-gold font-mono">{stats?.jackpotNearWin ?? 0}</p>
                      <p className="text-white/50 text-[10px]">Near Win</p>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-gold/10 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Total Staked:</span>
                  <span className="text-white font-mono">{formatETB(stats?.totalStaked ?? 0)}</span>
                </div>
                {(stats?.jackpotStaked ?? 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/30">· Jackpot Staked:</span>
                    <span className="text-white/50 font-mono">{formatETB(stats?.jackpotStaked ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Total Won:</span>
                  <span className="text-nile-success font-mono">{formatETB(stats?.totalWon ?? 0)}</span>
                </div>
                {(stats?.jackpotWon_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/30">· Jackpot Won (after tax):</span>
                    <span className="text-nile-success/70 font-mono">{formatETB(stats?.jackpotWon_amount ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2 mt-1">
                  <span className="text-white/70">Net Result:</span>
                  <span className={netResultPositive ? 'text-nile-success font-mono' : 'text-nile-danger font-mono'}>
                    {netResultPositive ? '+' : ''}{formatETB(stats?.netResult ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Account info */}
            <div className="bg-slate-dark border border-nile-blue/30 rounded-xl p-5">
              <p className="text-white font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-gold" />
                Account Information
              </p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">
                    Username:
                  </span>
                  <span className="text-white text-sm font-mono">
                    @{user.username}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">
                    Role:
                  </span>
                  <RoleBadge
                    role={user.role}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">
                    Status:
                  </span>
                  <StatusBadge
                    status={user.status}
                    type="user"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">
                    Member since:
                  </span>
                  <span className="text-white/70 text-sm">
                    {formatDate(
                      user.created_at
                    )}
                  </span>
                </div>
                {user.last_login && (
                  <div className="flex justify-between">
                    <span className="text-white/50 text-sm">
                      Last login:
                    </span>
                    <span className="text-white/70 text-sm">
                      {formatDate(
                        user.last_login
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">
                    Welcome bonus:
                  </span>
                  <span
                    className={
                      user.welcome_bonus_claimed
                        ? 'text-nile-success text-xs'
                        : 'text-nile-orange text-xs'
                    }
                  >
                    {user.welcome_bonus_claimed
                      ? '✅ Claimed'
                      : '🎁 Available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <TopupFlowModal
        isOpen={showTopup}
        onClose={() => {
          setShowTopup(false)
          if (user) {
            getActiveCoupon(user.id).then(
              setActiveCoupons
            )
          }
        }}
      />
      <WithdrawalFlowModal
        isOpen={showWithdraw}
        onClose={() => {
          setShowWithdraw(false)
          if (user) {
            getActiveCoupon(user.id).then(
              setActiveCoupons
            )
          }
        }}
      />
    </div>
  )
}