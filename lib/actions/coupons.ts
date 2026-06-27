'use server'

import { createClient, createAdminClient }
  from '@/lib/supabase/server'

export async function generateTopupCoupon(
  bettorId: string,
  amount: number
): Promise<{
  success: boolean
  code?: string
  expiresAt?: string
  error?: string
}> {
  const supabase = await createClient()

  if (amount <= 0) {
    return {
      success: false,
      error: 'Amount must be greater than 0',
    }
  }

  // Check for existing active coupon
  const { data: existing } = await supabase
    .from('coupons')
    .select('id, code, expires_at')
    .eq('bettor_id', bettorId)
    .eq('status', 'pending')
    .eq('type', 'topup')
    .single()

  if (existing) {
    return {
      success: false,
      error: `You already have an active top-up coupon (Code: ${existing.code}). Cancel it first.`,
    }
  }

  // Get expiry setting
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'topup_expiry_hours')
    .single()

  const expiryHours = parseInt(
    (settings as any)?.value ?? '6'
  )

  const expiresAt = new Date()
  expiresAt.setHours(
    expiresAt.getHours() + expiryHours
  )

  // Generate code
  const { data: code } = await supabase.rpc(
    'generate_coupon_code'
  )

  // Insert coupon
  const { error } = await supabase
    .from('coupons')
    .insert({
      code: code as string,
      bettor_id: bettorId,
      amount,
      type: 'topup',
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    return {
      success: false,
      error: 'Failed to generate coupon',
    }
  }

  await supabase.from('activity_logs').insert({
    user_id: bettorId,
    action: 'coupon_generated',
    details: {
      type: 'topup',
      amount,
      code,
    },
  })

  return {
    success: true,
    code: code as string,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function generateWithdrawalCoupon(
  bettorId: string,
  amount: number
): Promise<{
  success: boolean
  code?: string
  expiresAt?: string
  error?: string
}> {
  const supabase = await createClient()

  if (amount <= 0) {
    return {
      success: false,
      error: 'Amount must be greater than 0',
    }
  }

  // Check balance <
  const { data: profile } = await supabase
    .from('profiles')
    .select('credit_balance, reserved_balance')
    .eq('id', bettorId)
    .single()

  if (!profile) {
    return {
      success: false,
      error: 'Profile not found',
    }
  }

  const available =
    profile.credit_balance -
    (profile.reserved_balance ?? 0)

  if (amount > available) {
    return {
      success: false,
      error: `Insufficient balance. Available: ETB ${available.toFixed(2)}`,
    }
  }

  // Check existing withdrawal coupon
  const { data: existing } = await supabase
    .from('coupons')
    .select('id, code')
    .eq('bettor_id', bettorId)
    .eq('status', 'pending')
    .eq('type', 'withdrawal')
    .single()

  if (existing) {
    return {
      success: false,
      error: `You already have an active withdrawal coupon (Code: ${existing.code}). Cancel it first.`,
    }
  }

  // Get expiry setting
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'withdrawal_expiry_hours')
    .single()

  const expiryHours = parseInt(
    (settings as any)?.value ?? '6'
  )

  const expiresAt = new Date()
  expiresAt.setHours(
    expiresAt.getHours() + expiryHours
  )

  // Reserve balance <
  await supabase
    .from('profiles')
    .update({
      credit_balance:
        profile.credit_balance - amount,
      reserved_balance:
        (profile.reserved_balance ?? 0) +
        amount,
    })
    .eq('id', bettorId)

  // Generate code
  const { data: code } = await supabase.rpc(
    'generate_coupon_code'
  )

  const { error } = await supabase
    .from('coupons')
    .insert({
      code: code as string,
      bettor_id: bettorId,
      amount,
      type: 'withdrawal',
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    // Rollback balance <
    await supabase
      .from('profiles')
      .update({
        credit_balance:
          profile.credit_balance,
        reserved_balance:
          profile.reserved_balance ?? 0,
      })
      .eq('id', bettorId)

    return {
      success: false,
      error: 'Failed to generate coupon',
    }
  }

  await supabase.from('activity_logs').insert({
    user_id: bettorId,
    action: 'coupon_generated',
    details: {
      type: 'withdrawal',
      amount,
      code,
    },
  })

  return {
    success: true,
    code: code as string,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function cancelCoupon(
  couponId: string,
  bettorId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .eq('bettor_id', bettorId)
    .single()

  if (!coupon) {
    return {
      success: false,
      error: 'Coupon not found',
    }
  }

  if (coupon.status !== 'pending') {
    return {
      success: false,
      error: 'Only pending coupons can be cancelled',
    }
  }

  await supabase
    .from('coupons')
    .update({ status: 'cancelled' })
    .eq('id', couponId)

  // Release reserved balance for withdrawals
  if (coupon.type === 'withdrawal') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('credit_balance, reserved_balance')
      .eq('id', bettorId)
      .single()

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          credit_balance:
            profile.credit_balance +
            coupon.amount,
          reserved_balance: Math.max(
            0,
            (profile.reserved_balance ?? 0) -
              coupon.amount
          ),
        })
        .eq('id', bettorId)
    }
  }

  return { success: true }
}

export async function getMyBets(
  bettorId: string,
  options: {
    status?: string
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()

  const {
    status,
    page = 1,
    limit = 10,
  } = options
  const offset = (page - 1) * limit

  let query = supabase
    .from('slips')
    .select(
      `
      *,
      slip_selections (
        *,
        matches (
          home_team,
          away_team,
          status,
          kick_off_time
        ),
        match_markets (
          market_templates (
            name,
            market_categories (name)
          )
        )
      )
    `,
      { count: 'exact' }
    )
    .eq('bettor_id', bettorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const {
    data,
    error,
    count,
  } = await query

  if (error) return { slips: [], total: 0 }

  return {
    slips: data ?? [],
    total: count ?? 0,
  }
}

export async function getMyJackpotBets(
  bettorId: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('jackpot_slips')
    .select(
      `
      *,
      jackpots (name, status),
      jackpot_slip_selections (
        *,
        jackpot_matches (*)
      )
    `
    )
    .eq('bettor_id', bettorId)
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

export async function getBettorStats(
  bettorId: string
) {
  const supabase = await createClient()

  const [{ data: slips }, { data: jackpotSlips }] = await Promise.all([
    supabase.from('slips').select('status, stake, net_payout, insurance_applied').eq('bettor_id', bettorId),
    supabase.from('jackpot_slips').select('status, stake, reward_amount').eq('bettor_id', bettorId),
  ])

  const s = slips ?? []
  const j = jackpotSlips ?? []

  // 'won'  = won, awaiting payout | 'paid' = won and already redeemed — both count as "won"
  const regularWon    = s.filter(x => x.status === 'won' || x.status === 'paid').length
  const regularLost   = s.filter(x => x.status === 'lost').length
  const regularCancel = s.filter(x => x.status === 'cancelled').length
  const regularNear   = s.filter(x => x.status === 'near_win').length
  const regularStaked = s.reduce((a, x) => a + (x.stake ?? 0), 0)
  const regularWonAmt = s
    .filter(x => x.status === 'won' || x.status === 'paid')
    .reduce((a, x) => a + (x.net_payout ?? 0), 0)

  // jackpot_slips: 'won' = pending redemption, 'paid' = redeemed by cashier — both count as "won"
  const jpWon     = j.filter(x => x.status === 'won' || x.status === 'paid').length
  const jpLost    = j.filter(x => x.status === 'lost').length
  const jpNear    = j.filter(x => x.status === 'near_win').length
  const jpStaked  = j.reduce((a, x) => a + (x.stake ?? 0), 0)
  // 15% tax applies to 'won'/'paid' jackpot rewards; near_win (insured) is a tax-free stake refund
  const jpWonAmt  = j
    .filter(x => x.status === 'won' || x.status === 'paid')
    .reduce((a, x) => a + ((x.reward_amount ?? 0) * 0.85), 0)
  const jpNearAmt = j.filter(x => x.status === 'near_win').reduce((a, x) => a + (x.reward_amount ?? 0), 0)

  const totalBets     = s.length + j.length
  const wonBets       = regularWon + jpWon
  const lostBets      = regularLost + jpLost
  const cancelledBets = regularCancel
  const nearWinBets   = regularNear + jpNear
  const totalStaked   = regularStaked + jpStaked
  const totalWon      = regularWonAmt + jpWonAmt + jpNearAmt
  const netResult     = totalWon - totalStaked

  return {
    totalBets,
    wonBets,
    lostBets,
    cancelledBets,
    nearWinBets,
    totalStaked,
    totalWon,
    netResult,
    jackpotEntries: j.length,
    jackpotWon: jpWon,
    jackpotNearWin: jpNear,
    jackpotStaked: jpStaked,
    jackpotWonAmount: jpWonAmt,
    jackpotNearWinAmount: jpNearAmt,
  }
}
export async function getActiveCoupon(
  bettorId: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('bettor_id', bettorId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(2)

  return data ?? []
}

export async function applyWelcomeBonus(
  bettorId: string,
  topupAmount: number
): Promise<void> {
  const supabase = await createAdminClient()

  // Get settings
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', [
      'welcome_bonus_enabled',
      'welcome_bonus_min_topup',
      'welcome_bonus_amount',
    ])

  const get = (k: string) =>
    settings?.find((s: any) => s.key === k)
      ?.value ?? ''

  if (get('welcome_bonus_enabled') !== 'true')
    return

  const minTopup = parseFloat(
    get('welcome_bonus_min_topup') || '500'
  )
  const bonusAmount = parseFloat(
    get('welcome_bonus_amount') || '50'
  )

  if (topupAmount < minTopup) return

  // Check if already claimed
  const { data: profile } = await supabase
    .from('profiles')
    .select('welcome_bonus_claimed')
    .eq('id', bettorId)
    .single()

  if (!profile || profile.welcome_bonus_claimed)
    return

  // Fetch current balance
  const { data: bettor } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', bettorId)
    .single()

  if (!bettor) return

  // Credit bonus and mark claimed — eq on welcome_bonus_claimed=false prevents race condition
  const { error: creditError } = await supabase
    .from('profiles')
    .update({
      credit_balance: bettor.credit_balance + bonusAmount,
      welcome_bonus_claimed: true,
    })
    .eq('id', bettorId)
    .eq('welcome_bonus_claimed', false)

  if (creditError) return

  // Log transaction
  await supabase.from('transactions').insert({
    to_user_id: bettorId,
    amount: bonusAmount,
    type: 'welcome_bonus',
    note: `Welcome bonus of ETB ${bonusAmount} credited`,
  })

  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: bettorId,
    action: 'welcome_bonus_credited',
    details: { amount: bonusAmount, bettor_id: bettorId },
  })

  // Notify bettor
  await supabase.from('notifications').insert({
    to_user_id: bettorId,
    message: `🎁 Welcome bonus of ETB ${bonusAmount} has been added to your account!`,
    type: 'welcome_bonus',
    priority: 'normal',
  })
}