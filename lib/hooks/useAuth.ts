'use client'

import { useEffect } from 'react'
import { createClient }
  from '@/lib/supabase/client'
import { useAuthStore }
  from '@/lib/stores/authStore'
import type { PlatformSettings }
  from '@/types/database.types'
import { useNotificationStore }
  from '@/lib/stores/notificationStore'

function parseSettings(
  rows: { key: string; value: string }[]
): PlatformSettings {
  const get = (k: string, def = '0') =>
    rows.find((r) => r.key === k)
      ?.value ?? def

  return {
    minStake:
      parseFloat(get('min_stake', '10')),
    maxStakePerSlip: parseFloat(
      get('max_stake_per_slip', '50000')
    ),
    maxStakePerMarket: parseFloat(
      get('max_stake_per_market', '10000')
    ),
    maxOddPerSelection: parseFloat(
      get('max_odd_per_selection', '50')
    ),
    maxTotalOdds: parseFloat(
      get('max_total_odds', '5000')
    ),
    minSelections: parseInt(
      get('min_selections', '4')
    ),
    winningTaxPercent: parseFloat(
      get('winning_tax_percent', '15')
    ),
    maxPayout: parseFloat(
      get('max_payout', '500000')
    ),
    maxInstantRedemption: parseFloat(
      get('max_instant_redemption', '150000')
    ),
    cashierProfitPercent: parseFloat(
      get('cashier_profit_percent', '40')
    ),
    agentProfitPercent: parseFloat(
      get('agent_profit_percent', '60')
    ),
    topupExpiryHours: parseInt(
      get('topup_expiry_hours', '6')
    ),
    withdrawalExpiryHours: parseInt(
      get('withdrawal_expiry_hours', '6')
    ),
    loginAttemptLimit: parseInt(
      get('login_attempt_limit', '5')
    ),
    sessionTimeoutHours: parseInt(
      get('session_timeout_hours', '8')
    ),
    cancellationWindowMins: parseInt(
      get('cancellation_window_mins', '5')
    ),
    insuranceMinSelections: parseInt(
      get('insurance_min_selections', '10')
    ),
    insurance1LossPct: parseFloat(
      get('insurance_1_loss_pct', '2')
    ),
    insurance2LossPct: parseFloat(
      get('insurance_2_loss_pct', '1')
    ),
    insurance3LossRefund:
      get('insurance_3_loss_refund',
        'true') === 'true',
    welcomeBonusEnabled:
      get('welcome_bonus_enabled',
        'true') === 'true',
    welcomeBonusMinTopup: parseFloat(
      get('welcome_bonus_min_topup', '500')
    ),
    welcomeBonusAmount: parseFloat(
      get('welcome_bonus_amount', '50')
    ),
    jackpotFixedStake: parseFloat(
      get('jackpot_fixed_stake', '50')
    ),
    jackpotWinAllReward: parseFloat(
      get('jackpot_win_all_reward',
        '250000')
    ),
    jackpotNearWinReward: parseFloat(
      get('jackpot_near_win_reward',
        '25000')
    ),
  }
}

export function useAuth() {
  const {
    setUser,
    setSettings,
    logout,
    isLoading,
    isAuthenticated,
    user,
    role,
    settings,
  } = useAuthStore()
  const { setNotifications } = useNotificationStore()

  const supabase = createClient()

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { logout(); return }
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        logout()
        return
      }

      const { data: profile } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

      if (profile) {
        setUser(profile)
        // Load notifications
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('to_user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (notifData) setNotifications(notifData)
      }

      const { data: settingsRows } =
        await supabase
          .from('platform_settings')
          .select('key, value')

      if (settingsRows) {
        setSettings(
          parseSettings(settingsRows)
        )
      }
    }

    loadUser()

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
        if (event === 'SIGNED_IN') {
          await loadUser()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    role,
    isLoading,
    isAuthenticated,
    settings,
  }
}