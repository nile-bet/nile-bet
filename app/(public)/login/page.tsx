'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { Logo }
  from '@/components/shared/Logo'
import { loginUser }
  from '@/lib/actions/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient }
  from '@/lib/supabase/client'
import { useAuthStore }
  from '@/lib/stores/authStore'

export default function LoginPage() {
  const [username, setUsername] =
    useState('')
  const [password, setPassword] =
    useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] =
    useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { setUser, setSettings } = useAuthStore()
  const supabase = createClient()

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()
    if (!username || !password) return

    setLoading(true)
    setError('')

    const result = await loginUser(
      username.trim(),
      password
    )

    if (result.success) {
      toast.success('Welcome back!')
      // Pre-fetch profile and set in store immediately
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (profile) setUser(profile)
        const { data: settingsRows } = await supabase
          .from('platform_settings')
          .select('key, value')
        if (settingsRows) {
          const get = (k: string, def = '0') =>
            settingsRows.find((r: any) => r.key === k)?.value ?? def
          setSettings({
            minStake: parseFloat(get('min_stake', '10')),
            maxStakePerSlip: parseFloat(get('max_stake_per_slip', '50000')),
            maxStakePerMarket: parseFloat(get('max_stake_per_market', '10000')),
            maxOddPerSelection: parseFloat(get('max_odd_per_selection', '50')),
            maxTotalOdds: parseFloat(get('max_total_odds', '5000')),
            minSelections: parseInt(get('min_selections', '4')),
            winningTaxPercent: parseFloat(get('winning_tax_percent', '15')),
            maxPayout: parseFloat(get('max_payout', '500000')),
            maxInstantRedemption: parseFloat(get('max_instant_redemption', '150000')),
            cashierProfitPercent: parseFloat(get('cashier_profit_percent', '40')),
            agentProfitPercent: parseFloat(get('agent_profit_percent', '60')),
            topupExpiryHours: parseInt(get('topup_expiry_hours', '6')),
            withdrawalExpiryHours: parseInt(get('withdrawal_expiry_hours', '6')),
            loginAttemptLimit: parseInt(get('login_attempt_limit', '5')),
            sessionTimeoutHours: parseInt(get('session_timeout_hours', '8')),
            cancellationWindowMins: parseInt(get('cancellation_window_mins', '5')),
            insuranceMinSelections: parseInt(get('insurance_min_selections', '10')),
            insurance1LossPct: parseFloat(get('insurance_1_loss_pct', '2')),
            insurance2LossPct: parseFloat(get('insurance_2_loss_pct', '1')),
            insurance3LossRefund: get('insurance_3_loss_refund', 'true') === 'true',
            welcomeBonusEnabled: get('welcome_bonus_enabled', 'true') === 'true',
            welcomeBonusMinTopup: parseFloat(get('welcome_bonus_min_topup', '500')),
            welcomeBonusAmount: parseFloat(get('welcome_bonus_amount', '50')),
            jackpotFixedStake: parseFloat(get('jackpot_fixed_stake', '50')),
            jackpotWinAllReward: parseFloat(get('jackpot_win_all_reward', '250000')),
            jackpotNearWinReward: parseFloat(get('jackpot_near_win_reward', '25000')),
          } as any)
        }
      }
      const role = result.role
      if (role === 'admin') {
        router.push('/dashboard')
      } else if (role === 'agent') {
        router.push('/agent-dashboard')
      } else if (role === 'cashier') {
        router.push('/cashier-dashboard')
      } else {
        router.push('/')
      }
      router.refresh()
    } else {
      setError(result.error ?? 'Login failed')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" showTagline />
        </div>

        {/* Card */}
        <div className="bg-slate-dark border border-nile-blue/40 rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold text-white mb-1">
            Welcome Back
          </h1>
          <p className="text-white/50 text-sm mb-8">
            Sign in to your account
          </p>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Username */}
            <div>
              <label className="text-sm text-white/70 block mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="Enter username"
                className="w-full bg-charcoal border border-gold/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 text-sm"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-white/70 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={
                    showPw ? 'text' : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter password"
                  className="w-full bg-charcoal border border-gold/20 rounded-lg px-4 py-3 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 text-sm"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPw(!showPw)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-nile-danger/10 border border-nile-danger/30 rounded-lg px-4 py-3">
                <p className="text-nile-danger text-sm">
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={
                loading ||
                !username ||
                !password
              }
              className={cn(
                'w-full py-3 rounded-lg font-semibold text-sm transition-colors',
                loading ||
                  !username ||
                  !password
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-gold text-charcoal hover:bg-gold-light'
              )}
            >
              {loading
                ? 'Signing in...'
                : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-gold hover:text-gold-light"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}