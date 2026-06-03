import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/authStore'
import type { PlatformSettings } from '@/types/database.types'

export function parseSettingsMap(sm: Record<string, string>): PlatformSettings {
  return {
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
  }
}

export async function refreshPlatformSettings(): Promise<void> {
  const supabase = createClient()
  const { data } = await supabase.from('platform_settings').select('key, value')
  if (!data) return
  const sm: Record<string, string> = {}
  data.forEach((s: any) => { sm[s.key] = s.value })
  useAuthStore.getState().setSettings(parseSettingsMap(sm))
}
