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

  const totalCollectedSlips = all.reduce(
    (a, s) => a + (s.stake ?? 0),
    0
  )
  const totalPaidOutSlips = [
    ...wonSlips,
    ...nearWinSlips,
  ].reduce(
    (a, s) => a + (s.net_payout ?? 0),
    0
  )

  const pendingLiabilitySlips = pendingSlips.reduce(
    (a, s) => a + (s.net_payout ?? 0),
    0
  )

  // Jackpot slips for this cashier
  let jq = supabase
    .from('jackpot_slips')
    .select('stake, status, reward_amount, placed_by, created_at')
    .eq('placed_by', cashierId)

  if (startDate) {
    jq = jq.gte('created_at', startDate)
  }
  if (endDate) {
    jq = jq.lte('created_at', endDate)
  }

  const { data: jackpotSlips } = await jq
  const allJackpot = jackpotSlips ?? []

  const jackpotTotal = allJackpot.length
  const jackpotWon = allJackpot.filter((s) => s.status === 'won')
  const jackpotNearWin = allJackpot.filter((s) => s.status === 'near_win')
  const jackpotLost = allJackpot.filter((s) => s.status === 'lost').length
  const jackpotPending = allJackpot.filter((s) => s.status === 'pending')
  const jackpotInsured = jackpotNearWin.length
  const jackpotInProgress = 0

  const jackpotCollected = allJackpot.reduce((a, s) => a + (s.stake ?? 0), 0)
  const jackpotPaidOut = [...jackpotWon, ...jackpotNearWin].reduce((a, s) => a + (s.reward_amount ?? 0), 0)
  const jackpotPendingLiability = jackpotPending.reduce((a, s) => a + (s.reward_amount ?? 0), 0)
  const jackpotWonTotal = jackpotWon.reduce((a, s) => a + (s.reward_amount ?? 0), 0)
  const jackpotInsuredTotal = jackpotNearWin.reduce((a, s) => a + (s.reward_amount ?? 0), 0)

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

  // Combine slip + jackpot totals
  const totalCollected = totalCollectedSlips + jackpotCollected
  const totalPaidOut = totalPaidOutSlips + jackpotPaidOut
  const grossProfitLoss = totalCollected - totalPaidOut
  const pendingLiability = pendingLiabilitySlips + jackpotPendingLiability

  const walletBalance =
    profile?.credit_balance ?? 0
  const accountTotal =
    walletBalance + totalCollected

  const netBalance = totalPaidOut - totalCollected

  // Profit split
  const cashierProfit = grossProfitLoss * 0.4
  const agentPayable = grossProfitLoss * 0.6

  const totalWonSlips = wonSlips.reduce(
    (a, s) => a + (s.net_payout ?? 0),
    0
  )
  const insuredTotalSlips = nearWinSlips.reduce(
    (a, s) =>
      a + (s.insurance_payout ?? 0),
    0
  )
  const totalWon = totalWonSlips + jackpotWonTotal
  const insuredTotal = insuredTotalSlips + jackpotInsuredTotal
  const wonRedeemedAmount = 0
  const insuredRedeemedAmount = 0
  const pendingPayout = pendingLiability
  const redeemedSlips = wonRedeemed + insuredRedeemed
  const pendingPayoutSlips = wonPending + insuredPending + jackpotPending.length

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
    redeemedSlips,
    pendingPayoutSlips,
    // Jackpot stats
    jackpot: {
      total: jackpotTotal,
      won: jackpotWon.length,
      pending: jackpotPending.length,
      insured: jackpotInsured,
      lost: jackpotLost,
      inProgress: jackpotInProgress,
      wonTotal: jackpotWonTotal,
      insuredTotal: jackpotInsuredTotal,
      pendingPayout: jackpotPendingLiability,
      collected: jackpotCollected,
      paidOut: jackpotPaidOut,
    },
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
      redeemed_at,
      redeemed_by,
      created_at,
      bettor:profiles!slips_bettor_id_fkey (username)
    `
    )
    .eq('placed_by', cashierId)
    .in('status', ['won', 'near_win', 'paid'])
    .order('created_at', { ascending: false })

  if (startDate) {
    q = q.gte('created_at', startDate)
  }
  if (endDate) {
    q = q.lte('created_at', endDate)
  }

  const { data: slips } = await q

  // Jackpot winning slips
  let jq = supabase
    .from('jackpot_slips')
    .select(`
      slip_id,
      stake,
      reward_amount,
      status,
      is_anonymous,
      created_at,
      updated_at,
      jackpots (name),
      bettor:profiles!jackpot_slips_bettor_id_fkey (username)
    `)
    .eq('placed_by', cashierId)
    .in('status', ['won', 'near_win'])
    .order('created_at', { ascending: false })
  if (startDate) jq = jq.gte('created_at', startDate)
  if (endDate) jq = jq.lte('created_at', endDate)
  const { data: jackpotSlips } = await jq

  const jackpotPayouts = (jackpotSlips ?? []).map((j: any) => {
    const gross = j.reward_amount ?? 0
    // Jackpot: won slips pay 15% tax, near_win (insured) is tax-free
    const tax = gross * 0.15
    const net = gross - tax
    return {
      slip_id: j.slip_id,
      stake: j.stake,
      total_odds: null,
      max_payout: gross,
      winning_tax: tax,
      net_payout: net,
      status: j.status,
      is_anonymous: j.is_anonymous,
      insurance_applied: j.status === 'near_win',
      insurance_payout: j.status === 'near_win' ? gross : 0,
      created_at: j.created_at,
      updated_at: j.updated_at,
      redeemed_at: (j.status === 'paid') ? (j.redeemed_at ?? j.updated_at) : null,
      bettor: j.bettor,
      is_jackpot: true,
      jackpot_name: j.jackpots?.name,
    }
  })
  const regularPayouts = (slips ?? []).map((s: any) => ({
    ...s,
    redeemed_at: s.status !== 'pending' ? (s.updated_at ?? null) : null,
    is_jackpot: false,
  }))
  const allSlips = [...regularPayouts, ...jackpotPayouts].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const totalGross = allSlips.reduce((a: any, s: any) => a + (s.max_payout ?? 0), 0)
  const totalTax = allSlips.reduce((a: any, s: any) => a + (s.winning_tax ?? 0), 0)
  const totalNet = allSlips.reduce((a: any, s: any) => a + (s.net_payout ?? 0), 0)
  const totalStake = allSlips.reduce((a: any, s: any) => a + (s.stake ?? 0), 0)
  return {
    slips: allSlips,
    totals: {
      grossWinTotal: totalGross,
      taxTotal: totalTax,
      netPayoutTotal: totalNet,
      stakeTotal: totalStake,
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

  // Jackpot slips
  let jjq = supabase
    .from('jackpot_slips')
    .select(`
      id,
      slip_id,
      stake,
      reward_amount,
      status,
      is_anonymous,
      created_at,
      jackpots (name),
      bettor:profiles!jackpot_slips_bettor_id_fkey (username)
    `)
    .eq('placed_by', cashierId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (statusFilter && statusFilter !== 'all') {
    jjq = jjq.eq('status', statusFilter)
  }
  const { data: jackpotData } = await jjq

  const jackpotMapped = (jackpotData ?? []).map((j: any) => ({
    id: j.id,
    slip_id: j.slip_id,
    stake: j.stake,
    total_odds: null,
    net_payout: j.reward_amount,
    status: j.status,
    is_anonymous: j.is_anonymous,
    created_at: j.created_at,
    bettor: j.bettor,
    is_jackpot: true,
    jackpot_name: j.jackpots?.name,
  }))

  const combined = [...(data ?? []), ...jackpotMapped]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50)

  return combined
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
  // Find admin first
  const { data: admin } = await supabase
    .from('profiles').select('id').eq('role', 'admin').limit(1).single()

  let toUserId: string | null = null

  if (toAgent) {
    // Verify created_by is actually an agent
    if (cashier.created_by) {
      const { data: creator } = await supabase
        .from('profiles').select('id, role').eq('id', cashier.created_by).single()
      if (creator?.role === 'agent') {
        toUserId = creator.id
      }
    }
    // Fallback to admin if no agent found
    if (!toUserId) toUserId = admin?.id ?? null
  } else {
    toUserId = admin?.id ?? cashier.created_by
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

  // Only notify admin if the request was sent directly to admin

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
// ─── SLIP HISTORY ─────────────────────
export async function getCashierSlipHistory(
  cashierId: string,
  filters: {
    page?: number
    limit?: number
    category?: 'all' | 'normal' | 'jackpot'
    status?: string
    dateFrom?: string
    dateTo?: string
  } = {}
) {
  const supabase = await createClient()
  const { page = 1, limit = 20, category = 'all', status, dateFrom, dateTo } = filters
  const offset = (page - 1) * limit

  const normalSlips: any[] = []
  const jackpotSlips: any[] = []

  if (category === 'all' || category === 'normal') {
    let q = supabase
      .from('slips')
      .select(`
        id, slip_id, stake, total_odds, net_payout, max_payout, winning_tax,
        status, is_anonymous, created_at,
        bettor:profiles!slips_bettor_id_fkey (username)
      `, { count: 'exact' })
      .eq('placed_by', cashierId)
      .order('created_at', { ascending: false })
    if (status && status !== 'all') q = q.eq('status', status)
    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59')
    const { data } = await q
    normalSlips.push(...(data ?? []).map((s: any) => ({ ...s, _type: 'normal' })))
  }

  if (category === 'all' || category === 'jackpot') {
    let q = supabase
      .from('jackpot_slips')
      .select(`
        id, slip_id, stake, status, is_anonymous, created_at, correct_count, reward_amount,
        bettor:profiles!jackpot_slips_bettor_id_fkey (username),
        jackpots (name, fixed_stake, win_all_reward)
      `, { count: 'exact' })
      .eq('placed_by', cashierId)
      .order('created_at', { ascending: false })
    if (status && status !== 'all') q = q.eq('status', status)
    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59')
    const { data } = await q
    jackpotSlips.push(...(data ?? []).map((s: any) => ({ ...s, _type: 'jackpot' })))
  }

  // Merge and sort by date
  const all = [...normalSlips, ...jackpotSlips].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const total = all.length
  const paginated = all.slice(offset, offset + limit)

  return { slips: paginated, total }
}
