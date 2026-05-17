'use server'

import { createClient }
  from '@/lib/supabase/server'

// ─── DASHBOARD STATS ─────────────────

export async function getCashierDashboardStats(
  cashierId: string,
  dateFilter: {
    type:
      | 'lifetime'
      | 'daily'
      | 'weekly'
      | 'monthly'
      | 'custom'
    startDate?: string
    endDate?: string
  }
) {
  const supabase = await createClient()

  let startDate: string | null = null
  let endDate: string | null = null
  const now = new Date()

  if (dateFilter.type === 'daily') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    startDate = d.toISOString()
    endDate = now.toISOString()
  } else if (dateFilter.type === 'weekly') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    startDate = d.toISOString()
    endDate = now.toISOString()
  } else if (
    dateFilter.type === 'monthly'
  ) {
    const d = new Date(now)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    startDate = d.toISOString()
    endDate = now.toISOString()
  } else if (dateFilter.type === 'custom') {
    startDate = dateFilter.startDate ?? null
    endDate = dateFilter.endDate ?? null
  }

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('credit_balance, reserved_balance')
    .eq('id', cashierId)
    .single()

  // Slips
  let q = supabase
    .from('slips')
    .select(
      'stake, net_payout, winning_tax, status, insurance_applied, insurance_payout, placed_by, created_at'
    )
    .eq('placed_by', cashierId)

  if (startDate) {
    q = q.gte('created_at', startDate)
  }
  if (endDate) {
    q = q.lte('created_at', endDate)
  }

  const { data: slips } = await q

  const all = slips ?? []

  const totalSlips = all.length
  const wonSlips = all.filter(
    (s) => s.status === 'won'
  )
  const lostSlips = all.filter(
    (s) => s.status === 'lost'
  ).length
  const cancelledSlips = all.filter(
    (s) => s.status === 'cancelled'
  ).length
  const pendingSlips = all.filter(
    (s) => s.status === 'pending'
  )
  const nearWinSlips = all.filter(
    (s) => s.status === 'near_win'
  )

  // Separate redeemed vs pending payouts
  // For simplicity, count all won as pending
  // (in a real system you'd track redemption)
  const wonRedeemed = 0
  const wonPending = wonSlips.length

  const insuredSlips = nearWinSlips
  const insuredRedeemed = 0
  const insuredPending = insuredSlips.length

  // In-progress: at least one match started
  // but slip still pending
  const inProgressSlips = 0

  const totalCollected = all.reduce(
    (a, s) => a + (s.stake ?? 0),
    0
  )
  const totalPaidOut = [
    ...wonSlips,
    ...nearWinSlips,
  ].reduce(
    (a, s) => a + (s.net_payout ?? 0),
    0
  )
  const grossProfitLoss =
    totalCollected - totalPaidOut

  const pendingLiability = pendingSlips.reduce(
    (a, s) => a + (s.net_payout ?? 0),
    0
  )

  // User topups (coupon topups processed)
  const { data: couponsRedeemed } =
    await supabase
      .from('coupons')
      .select('amount, type')
      .eq('redeemed_by', cashierId)
      .eq('type', 'topup')
      .eq('status', 'redeemed')

  const userTopups = (
    couponsRedeemed ?? []
  ).reduce(
    (a, c) => a + (c.amount ?? 0),
    0
  )
  const topupTransactions =
    couponsRedeemed?.length ?? 0

  const walletBalance =
    profile?.credit_balance ?? 0
  const accountTotal =
    walletBalance + totalCollected

  const netBalance = totalPaidOut - totalCollected

  // Profit split
  const cashierProfit = grossProfitLoss * 0.4
  const agentPayable = grossProfitLoss * 0.6

  const totalWon = wonSlips.reduce(
    (a, s) => a + (s.net_payout ?? 0),
    0
  )
  const insuredTotal = nearWinSlips.reduce(
    (a, s) =>
      a + (s.insurance_payout ?? 0),
    0
  )
  const wonRedeemedAmount = 0
  const insuredRedeemedAmount = 0
  const pendingPayout = pendingLiability

  return {
    walletBalance,
    totalCollected,
    grossProfitLoss,
    pendingLiability,
    totalSlips,
    wonSlips: wonSlips.length,
    wonRedeemed,
    wonPending,
    insuredSlips: insuredSlips.length,
    insuredRedeemed,
    insuredPending,
    lostSlips,
    cancelledSlips,
    pendingSlips: pendingSlips.length,
    inProgressSlips,
    userTopups,
    topupTransactions,
    accountTotal,
    netBalance,
    cashierProfit,
    agentPayable,
    totalWon,
    insuredTotal,
    wonRedeemedAmount,
    insuredRedeemedAmount,
    pendingPayout,
  }
}

// ─── PAYOUTS REPORT ───────────────────

export async function getCashierPayoutsReport(
  cashierId: string,
  dateFilter: {
    type: string
    startDate?: string
    endDate?: string
  }
) {
  const supabase = await createClient()

  let startDate: string | null = null
  let endDate: string | null = null
  const now = new Date()

  if (dateFilter.type === 'daily') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    startDate = d.toISOString()
    endDate = now.toISOString()
  } else if (dateFilter.type === 'weekly') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    startDate = d.toISOString()
  } else if (
    dateFilter.type === 'monthly'
  ) {
    const d = new Date(now)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    startDate = d.toISOString()
  } else if (dateFilter.type === 'custom') {
    startDate = dateFilter.startDate ?? null
    endDate = dateFilter.endDate ?? null
  }

  let q = supabase
    .from('slips')
    .select(
      `
      slip_id,
      stake,
      total_odds,
      max_payout,
      winning_tax,
      net_payout,
      status,
      is_anonymous,
      insurance_applied,
      insurance_payout,
      created_at,
      bettor:profiles!slips_bettor_id_fkey (username)
    `
    )
    .eq('placed_by', cashierId)
    .in('status', ['won', 'near_win'])
    .order('created_at', { ascending: false })

  if (startDate) {
    q = q.gte('created_at', startDate)
  }
  if (endDate) {
    q = q.lte('created_at', endDate)
  }

  const { data: slips } = await q

  const totalGross = (slips ?? []).reduce(
    (a, s) => a + (s.max_payout ?? 0),
    0
  )
  const totalTax = (slips ?? []).reduce(
    (a, s) => a + (s.winning_tax ?? 0),
    0
  )
  const totalNet = (slips ?? []).reduce(
    (a, s) => a + (s.net_payout ?? 0),
    0
  )

  return {
    slips: slips ?? [],
    totals: {
      grossWinTotal: totalGross,
      taxTotal: totalTax,
      netPayoutTotal: totalNet,
    },
  }
}

// ─── RECENT SLIPS ─────────────────────

export async function getRecentSlipsCashier(
  cashierId: string,
  statusFilter?: string
) {
  const supabase = await createClient()

  let q = supabase
    .from('slips')
    .select(
      `
      id,
      slip_id,
      stake,
      total_odds,
      net_payout,
      status,
      is_anonymous,
      created_at,
      bettor:profiles!slips_bettor_id_fkey (username)
    `
    )
    .eq('placed_by', cashierId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (
    statusFilter &&
    statusFilter !== 'all'
  ) {
    q = q.eq('status', statusFilter)
  }

  const { data } = await q
  return data ?? []
}

// ─── REQUEST CREDITS ──────────────────

export async function requestCreditsByCashier(
  cashierId: string,
  amount: number,
  note: string,
  toAgent: boolean = true
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: cashier } = await supabase
    .from('profiles')
    .select('created_by, username')
    .eq('id', cashierId)
    .single()

  if (!cashier) {
    return {
      success: false,
      error: 'Cashier not found',
    }
  }

  let toUserId = cashier.created_by

  // If not to agent, find admin
  if (!toAgent) {
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()
    toUserId = admin?.id ?? cashier.created_by
  }

  if (!toUserId) {
    return {
      success: false,
      error: 'No recipient found',
    }
  }

  await supabase
    .from('credit_requests')
    .insert({
      requester_id: cashierId,
      to_user_id: toUserId,
      amount,
      note,
      status: 'pending',
    })

  // Notify recipient
  await supabase
    .from('notifications')
    .insert({
      to_user_id: toUserId,
      message: `💰 Cashier @${cashier.username} requests ETB ${amount.toLocaleString()}. Note: ${note || 'No note'}`,
      type: 'balance_updated',
      priority: 'normal',
    })

  // Also notify admin if request to agent
  if (toAgent) {
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (admin) {
      await supabase
        .from('notifications')
        .insert({
          to_user_id: admin.id,
          message: `Cashier @${cashier.username} requested ETB ${amount.toLocaleString()} from their agent`,
          type: 'broadcast',
        })
    }
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: cashierId,
      action: 'credit_request_created',
      details: { amount, note, to_agent: toAgent },
    })

  return { success: true }
}

// ─── ACTIVITY LOG ─────────────────────

export async function getCashierActivityLog(
  cashierId: string,
  filters: {
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()

  const { page = 1, limit = 30 } = filters
  const offset = (page - 1) * limit

  const { data, count } = await supabase
    .from('activity_logs')
    .select('*, profiles(username, role)', {
      count: 'exact',
    })
    .eq('user_id', cashierId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return {
    logs: data ?? [],
    total: count ?? 0,
  }
}

// ─── REPORT ───────────────────────────

export async function generateCashierReportData(
  cashierId: string,
  dateFilter: any
) {
  const [stats, payouts, recentSlips] =
    await Promise.all([
      getCashierDashboardStats(
        cashierId,
        dateFilter
      ),
      getCashierPayoutsReport(
        cashierId,
        dateFilter
      ),
      getRecentSlipsCashier(cashierId),
    ])

  return { stats, payouts, recentSlips }
}