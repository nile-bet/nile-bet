'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient }
  from '@/lib/supabase/client'
import { useAuthStore }
  from '@/lib/stores/authStore'

const ROLE_REDIRECTS: Record<string, string> = {
  admin: '/dashboard',
  agent: '/agent-dashboard',
  cashier: '/cashier-dashboard',
  bettor: '/',
}

export function useAuth() {
  const {
    setUser,
    setSettings,
    logout,
  } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        return
      }

      const { data: profile } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

      if (!profile) return

      if (profile.status === 'suspended') {
        await supabase.auth.signOut()
        router.push(
          '/suspended?reason=suspended'
        )
        return
      }

      // Update last login
      await supabase
        .from('profiles')
        .update({
          last_login: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      // Load platform settings
      const { data: settingsData } =
        await supabase
          .from('platform_settings')
          .select('key, value')

      const settingsMap: Record<string, string> = {}
      ;(settingsData ?? []).forEach(
        (s: any) => {
          settingsMap[s.key] = s.value
        }
      )

      setSettings({
        minStake: parseFloat(settingsMap.min_stake ?? '10'),
        maxStakePerSlip: parseFloat(settingsMap.max_stake_per_slip ?? '50000'),
        maxStakePerMarket: parseFloat(settingsMap.max_stake_per_market ?? '10000'),
        maxOddPerSelection: parseFloat(settingsMap.max_odd_per_selection ?? '50'),
        maxTotalOdds: parseFloat(settingsMap.max_total_odds ?? '5000'),
        minSelections: parseInt(settingsMap.min_selections ?? '4'),
        winningTaxPercent: parseFloat(settingsMap.winning_tax_percent ?? '15'),
        maxPayout: parseFloat(settingsMap.max_payout ?? '500000'),
        maxInstantRedemption: parseFloat(settingsMap.max_instant_redemption ?? '150000'),
        cashierProfitPercent: parseFloat(settingsMap.cashier_profit_percent ?? '40'),
        agentProfitPercent: parseFloat(settingsMap.agent_profit_percent ?? '60'),
        topupExpiryHours: parseInt(settingsMap.topup_expiry_hours ?? '6'),
        withdrawalExpiryHours: parseInt(settingsMap.withdrawal_expiry_hours ?? '6'),
        loginAttemptLimit: parseInt(settingsMap.login_attempt_limit ?? '5'),
        sessionTimeoutHours: parseInt(settingsMap.session_timeout_hours ?? '8'),
        cancellationWindowMins: parseInt(settingsMap.cancellation_window_mins ?? '5'),
        insuranceMinSelections: parseInt(settingsMap.insurance_min_selections ?? '10'),
        insurance1LossPct: parseFloat(settingsMap.insurance_1_loss_pct ?? '2'),
        insurance2LossPct: parseFloat(settingsMap.insurance_2_loss_pct ?? '1'),
        insurance3LossRefund: settingsMap.insurance_3_loss_refund === 'true',
        welcomeBonusEnabled: settingsMap.welcome_bonus_enabled === 'true',
        welcomeBonusMinTopup: parseFloat(settingsMap.welcome_bonus_min_topup ?? '500'),
        welcomeBonusAmount: parseFloat(settingsMap.welcome_bonus_amount ?? '50'),
        jackpotFixedStake: parseFloat(settingsMap.jackpot_fixed_stake ?? '50'),
        jackpotWinAllReward: parseFloat(settingsMap.jackpot_win_all_reward ?? '250000'),
        jackpotNearWinReward: parseFloat(settingsMap.jackpot_near_win_reward ?? '25000'),
      })

      setUser(profile)

      // Redirect to correct section based on role
      const currentPath = window.location.pathname
      const roleRedirect = ROLE_REDIRECTS[profile.role as string] ?? '/'

      const rolePaths: Record<string, string[]> = {
        admin: ['/dashboard', '/matches', '/users', '/credits', '/coupons', '/reports', '/broadcast', '/activity', '/settings', '/jackpot'],
        agent: ['/agent-'],
        cashier: ['/cashier-'],
        bettor: ['/bettor-', '/check-slip', '/slip-lookup', '/results', '/match/'],
      }

      const allowedPrefixes = rolePaths[profile.role as string] ?? ['/']
      const isOnCorrectSection = allowedPrefixes.some(p => currentPath.startsWith(p)) || (profile.role === 'bettor' && (currentPath === '/' || currentPath.startsWith('/match')))
      const isOnPublicPage = ['/login', '/register', '/suspended', '/offline', '/maintenance'].includes(currentPath)

      if (!isOnPublicPage && !isOnCorrectSection) {
        router.replace(roleRedirect)
      }
    }

    initAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          event === 'SIGNED_OUT' ||
          !session
        ) {
          logout()
          return
        }
        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED'
        ) {
          initAuth()
        }
      }
    )

    // Listen for platform_settings changes — update store in real-time
    const settingsChannel = supabase
      .channel('platform-settings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_settings',
      }, async () => {
        // Re-fetch all settings and update store
        const { data: sd } = await supabase.from('platform_settings').select('key, value')
        const sm: Record<string, string> = {}
        ;(sd ?? []).forEach((s: any) => { sm[s.key] = s.value })
        setSettings({
          minStake: parseFloat(sm.min_stake ?? '10'),
          maxStakePerSlip: parseFloat(sm.max_stake_per_slip ?? '50000'),
          maxStakePerMarket: parseFloat(sm.max_stake_per_market ?? '10000'),
          maxOddPerSelection: parseFloat(sm.max_odd_per_selection ?? '50'),
          maxTotalOdds: parseFloat(sm.max_total_odds ?? '5000'),
          minSelections: parseInt(sm.min_selections ?? '4'),
          winningTaxPercent: parseFloat(sm.winning_tax_percent ?? '15'),
          maxPayout: parseFloat(sm.max_payout ?? '500000'),
          maxInstantRedemption: parseFloat(sm.max_instant_redemption ?? '150000'),
          cashierProfitPercent: parseFloat(sm.cashier_profit_percent ?? '40'),
          agentProfitPercent: parseFloat(sm.agent_profit_percent ?? '60'),
          topupExpiryHours: parseInt(sm.topup_expiry_hours ?? '6'),
          withdrawalExpiryHours: parseInt(sm.withdrawal_expiry_hours ?? '6'),
          loginAttemptLimit: parseInt(sm.login_attempt_limit ?? '5'),
          sessionTimeoutHours: parseInt(sm.session_timeout_hours ?? '8'),
          cancellationWindowMins: parseInt(sm.cancellation_window_mins ?? '5'),
          insuranceMinSelections: parseInt(sm.insurance_min_selections ?? '10'),
          insurance1LossPct: parseFloat(sm.insurance_1_loss_pct ?? '2'),
          insurance2LossPct: parseFloat(sm.insurance_2_loss_pct ?? '1'),
          insurance3LossRefund: sm.insurance_3_loss_refund === 'true',
          welcomeBonusEnabled: sm.welcome_bonus_enabled === 'true',
          welcomeBonusMinTopup: parseFloat(sm.welcome_bonus_min_topup ?? '500'),
          welcomeBonusAmount: parseFloat(sm.welcome_bonus_amount ?? '50'),
          jackpotFixedStake: parseFloat(sm.jackpot_fixed_stake ?? '50'),
          jackpotWinAllReward: parseFloat(sm.jackpot_win_all_reward ?? '250000'),
          jackpotNearWinReward: parseFloat(sm.jackpot_near_win_reward ?? '25000'),
        })
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(settingsChannel)
    }
  }, [])
}