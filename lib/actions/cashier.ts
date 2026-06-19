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
      'stake, net_payout, winning_tax, status, insurance_applied, insurance_payout, redeemed_at, placed_by, created_at, updated_at'
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
  // 'won'      = won, awaiting payout
  // 'paid'     = won and already redeemed/paid out
  // 'near_win' = insured, awaiting payout
  // Insured paid: near_win slips that have insurance_payout > 0 and redeemed_at set
  const wonSlips = all.filter((s) => s.status === 'won')
  const paidSlips = all.filter((s) => s.status === 'paid')
  const lostSlips = all.filter((s) => s.status === 'lost').length
  const cancelledSlips = all.filter((s) => s.status === 'cancelled').length
  const pendingSlips = all.filter((s) => s.status === 'pending')
  const nearWinSlips = all.filter((s) => s.status === 'near_win')

  // Won: 'won' = pending payout, 'paid' = already redeemed
  const wonRedeemed = paidSlips.length
  const wonPending = wonSlips.length

  // Insured (near_win): count those with insurance_payout redeemed vs awaiting
  // Near_win slips redeemed are tracked by redeemed_at being set
  const insuredSlips = nearWinSlips
  const insuredRedeemed = nearWinSlips.filter((s: any) => s.redeemed_at).length
  const insuredPending = insuredSlips.length - insuredRedeemed

  const inProgressSlips = pendingSlips.length

  const totalCollectedSlips = all.reduce((a, s) => a + (s.stake ?? 0), 0)

  // Paid out = all slips that have been settled with payout (paid + near_win)
  const totalPaidOutSlips = [
    ...paidSlips,
    ...nearWinSlips,
  ].reduce((a, s) => a + (s.net_payout ?? 0), 0)

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

  // 'won'      = won, awaiting cashier redemption (15% tax applies on payout)
  // 'near_win' = insured/stake-refund, awaiting cashier redemption (no tax)
  // 'paid'     = already redeemed by cashier (was won or near_win before redemption —
  //              cannot distinguish post-redemption without insurance flag, so treated as won)
  // 'lost'/'pending' = self-explanatory
  const jackpotTotal = allJackpot.length
  const jackpotWonUnredeemed = allJackpot.filter((s) => s.status === 'won')
  const jackpotNearWinUnredeemed = allJackpot.filter((s) => s.status === 'near_win')
  const jackpotPaidSlips = allJackpot.filter((s) => s.status === 'paid')
  const jackpotLost = allJackpot.filter((s) => s.status === 'lost').length
  const jackpotPending = allJackpot.filter((s) => s.status === 'pending')

  // Combined won (includes redeemed) for display/count purposes
  const jackpotWon = [...jackpotWonUnredeemed, ...jackpotPaidSlips]
  const jackpotNearWin = jackpotNearWinUnredeemed
  const jackpotInsured = jackpotNearWin.length
  const jackpotInProgress = 0

  const jackpotCollected = allJackpot.reduce((a, s) => a + (s.stake ?? 0), 0)
  // Paid out = redeemed (paid) + near_win (insured, always auto-payable) reward amounts
  const jackpotPaidOut = [...jackpotPaidSlips, ...jackpotNearWinUnredeemed].reduce((a, s) => a + (s.reward_amount ?? 0), 0)
  // Pending liability = won (not yet redeemed) + pending (not yet settled) reward amounts
  const jackpotPendingLiability = [...jackpotWonUnredeemed, ...jackpotPending].reduce((a, s) => a + (s.reward_amount ?? 0), 0)
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

  // Won amounts: 'paid' slips = redeemed, 'won' slips = pending payout
  const wonRedeemedAmount = paidSlips.reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const wonPendingAmount = wonSlips.reduce((a, s) => a + (s.net_payout ?? 0), 0)

  // Insured amounts: near_win slips (insurance_payout field)
  const insuredTotalSlips = nearWinSlips.reduce((a, s) => a + (s.insurance_payout ?? s.net_payout ?? 0), 0)
  const insuredRedeemedAmount = nearWinSlips
    .filter((s) => (s as any).redeemed_at)
    .reduce((a, s) => a + (s.insurance_payout ?? s.net_payout ?? 0), 0)
  const insuredPendingAmount = insuredTotalSlips - insuredRedeemedAmount

  // Total won = paid out (redeemed) + won pending + near_win + jackpot won
  const totalWonSlips = wonRedeemedAmount + wonPendingAmount
  const totalWon = totalWonSlips + jackpotWonTotal
  const insuredTotal = insuredTotalSlips + jackpotInsuredTotal

  // Pending payout = won slips not yet paid + near_win not yet redeemed + jackpot won pending (not yet redeemed)
  const jackpotWonPendingAmount = jackpotWonUnredeemed.reduce((a, s) => a + (s.reward_amount ?? 0), 0)
  const pendingPayout = wonPendingAmount + insuredPendingAmount + jackpotWonPendingAmount
  const redeemedSlips = wonRedeemed + insuredRedeemed
  const pendingPayoutSlips = wonPending + insuredPending + jackpotPending.length

  return {
    walletBalance,
    totalCollected,
    grossProfitLoss,
    pendingLiability,
    totalSlips: totalSlips + jackpotTotal,
    regularSlips: totalSlips,
    jackpotSlipsCount: jackpotTotal,
    wonSlips: wonSlips.length + paidSlips.length + jackpotWon.length,
    wonRegular: wonSlips.length + paidSlips.length,
    wonJackpot: jackpotWon.length,
    wonRedeemed,
    wonPending,
    insuredSlips: insuredSlips.length + jackpotInsured,
    insuredRedeemed,
    insuredPending: insuredPending + jackpotInsured,
    lostSlips: lostSlips + jackpotLost,
    lostRegular: lostSlips,
    lostJackpot: jackpotLost,
    cancelledSlips,
    pendingSlips: pendingSlips.length + jackpotPending.length,
    pendingRegular: pendingSlips.length,
    pendingJackpot: jackpotPending.length,
    inProgressSlips: pendingSlips.length + jackpotPending.length,
    userTopups,
    topupTransactions,
    accountTotal,
    netBalance,
    cashierProfit,
    agentPayable,
    totalWon,
    insuredTotal,
    wonRedeemedAmount,
    wonPendingAmount,
    insuredRedeemedAmount,
    insuredPendingAmount,
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
  const now = new Date()
  let startDate: string | null = null
  let endDate: string | null = null

  if (dateFilter.type === 'daily') {
    const d = new Date(now); d.setHours(0,0,0,0)
    startDate = d.toISOString(); endDate = now.toISOString()
  } else if (dateFilter.type === 'weekly') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    startDate = d.toISOString()
  } else if (dateFilter.type === 'monthly') {
    const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0)
    startDate = d.toISOString()
  } else if (dateFilter.type === 'custom') {
    startDate = dateFilter.startDate ?? null
    endDate = dateFilter.endDate ?? null
  }
  // 'all' type = no date filter

  // ── Regular slips: won (pending), near_win/insured (pending), paid (redeemed) ──
  let q = supabase
    .from('slips')
    .select(`
      slip_id, stake, total_odds, max_payout, winning_tax,
      net_payout, status, is_anonymous, insurance_applied,
      insurance_payout, insurance_tax, redeemed_at, created_at, updated_at,
      bettor:profiles!slips_bettor_id_fkey (username)
    `)
    .eq('placed_by', cashierId)
    .in('status', ['won', 'near_win', 'paid'])
    .order('created_at', { ascending: false })
  if (startDate) q = q.gte('created_at', startDate)
  if (endDate) q = q.lte('created_at', endDate)
  const { data: slips } = await q

  // ── Jackpot slips: won (pending), near_win/insured (pending), paid (redeemed) ──
  let jq = supabase
    .from('jackpot_slips')
    .select(`
      id, slip_id, stake, reward_amount, reward_tax, status, is_anonymous,
      created_at, updated_at,
      jackpots (name, fixed_stake),
      bettor:profiles!jackpot_slips_bettor_id_fkey (username)
    `)
    .eq('placed_by', cashierId)
    .in('status', ['won', 'near_win', 'paid'])
    .order('created_at', { ascending: false })
  if (startDate) jq = jq.gte('created_at', startDate)
  if (endDate) jq = jq.lte('created_at', endDate)
  const { data: jackpotSlips, error: jackpotSlipsError } = await jq
  if (jackpotSlipsError) console.error('[getCashierPayoutsReport] jackpot query error:', jackpotSlipsError)

  // Normalize regular slips
  // - status 'won'   → pending, not insured
  // - status 'near_win' → pending, insured (insurance_applied = true)
  // - status 'paid'  → redeemed. Check insurance_applied to know if it was insured
  const regularPayouts = (slips ?? []).map((s: any) => {
    const isRedeemed = s.status === 'paid'
    const isInsured = s.insurance_applied === true || s.status === 'near_win'
    const taxAmt = isInsured ? (s.insurance_tax ?? 0) : (s.winning_tax ?? 0)
    const netAmt = isInsured ? (s.insurance_payout ?? s.stake ?? 0) : (s.net_payout ?? 0)
    const grossAmt = isInsured ? (netAmt + taxAmt) : (s.max_payout ?? 0)
    return {
      slip_id: s.slip_id,
      stake: s.stake,
      total_odds: s.total_odds,
      max_payout: grossAmt,
      winning_tax: taxAmt,
      net_payout: netAmt,
      payout_status: isRedeemed ? 'redeemed' : 'pending',
      is_anonymous: s.is_anonymous,
      insurance_applied: isInsured,
      created_at: s.created_at,
      redeemed_at: s.redeemed_at ?? null,
      bettor: s.bettor,
      is_jackpot: false,
      is_insured: isInsured,
    }
  })

  // Normalize jackpot slips
  // - status 'won'      → pending, not insured, 15% tax on reward
  // - status 'near_win' → pending, insured (stake refund), no tax
  // - status 'paid'     → redeemed. Use redeemed_at presence + original reward to judge insured
  const jackpotPayouts = (jackpotSlips ?? []).map((j: any) => {
    const isRedeemed = j.status === 'paid'
    const isInsured = j.status === 'near_win' ||
      (isRedeemed && (j.reward_amount ?? 0) <= (j.jackpots?.fixed_stake ?? j.stake ?? 0) * 1.1)
    const tax = j.reward_tax ?? 0
    const net = j.reward_amount ?? 0
    const gross = net + tax
    return {
      slip_id: j.slip_id,
      stake: j.stake,
      total_odds: null,
      max_payout: gross,
      winning_tax: tax,
      net_payout: net,
      payout_status: isRedeemed ? 'redeemed' : 'pending',
      is_anonymous: j.is_anonymous,
      insurance_applied: isInsured,
      created_at: j.created_at,
      redeemed_at: isRedeemed ? (j.updated_at ?? null) : null,
      bettor: j.bettor,
      is_jackpot: true,
      jackpot_name: j.jackpots?.name,
      is_insured: isInsured,
    }
  })

  const allSlips = [...regularPayouts, ...jackpotPayouts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // ── Card 1: Total Won = all won slips (pending + redeemed) after tax, excl insured ──
  const totalWonNet = allSlips
    .filter(s => !s.is_insured)
    .reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const totalWonCount = allSlips.filter(s => !s.is_insured).length

  // ── Card 2: Won Redeemed = redeemed won slips after tax ──
  const wonRedeemedNet = allSlips
    .filter(s => !s.is_insured && s.payout_status === 'redeemed')
    .reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const wonRedeemedCount = allSlips.filter(s => !s.is_insured && s.payout_status === 'redeemed').length

  // ── Card 3: Insured Redeemed = redeemed insured slips after tax ──
  const insuredRedeemedNet = allSlips
    .filter(s => s.is_insured && s.payout_status === 'redeemed')
    .reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const insuredRedeemedCount = allSlips.filter(s => s.is_insured && s.payout_status === 'redeemed').length

  // ── Card 4: Pending Payout = won + insured but NOT redeemed ──
  const pendingPayoutNet = allSlips
    .filter(s => s.payout_status === 'pending')
    .reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const pendingCount = allSlips.filter(s => s.payout_status === 'pending').length

  const totalGross = allSlips.reduce((a, s) => a + (s.max_payout ?? 0), 0)
  const totalTax   = allSlips.reduce((a, s) => a + (s.winning_tax ?? 0), 0)
  const totalNet   = allSlips.reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const totalStake = allSlips.reduce((a, s) => a + (s.stake ?? 0), 0)

  return {
    slips: allSlips,
    totals: {
      grossWinTotal: totalGross,
      taxTotal: totalTax,
      netPayoutTotal: totalNet,
      stakeTotal: totalStake,
      totalWonNet,
      totalWonCount,
      wonRedeemedNet,
      wonRedeemedCount,
      insuredRedeemedNet,
      insuredRedeemedCount,
      pendingPayoutNet,
      pendingCount,
    },
  }
}

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
      max_payout,
      winning_tax,
      status,
      is_anonymous,
      insurance_applied,
      insurance_payout,
      insurance_tax,
      redeemed_at,
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
  const { data, error: slipsError } = await q
  if (slipsError) console.error('[getRecentSlipsCashier] slips query error:', slipsError)

  // Jackpot slips — mirrors the regular slips query exactly (same filter behavior)
  let jjq = supabase
    .from('jackpot_slips')
    .select(`
      id,
      slip_id,
      stake,
      reward_amount,
      reward_tax,
      status,
      is_anonymous,
      created_at,
      updated_at,
      jackpots (name, fixed_stake),
      bettor:profiles!jackpot_slips_bettor_id_fkey (username)
    `)
    .eq('placed_by', cashierId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (statusFilter && statusFilter !== 'all') {
    jjq = jjq.eq('status', statusFilter)
  }
  const { data: jackpotData, error: jackpotError } = await jjq
  if (jackpotError) console.error('[getRecentSlipsCashier] jackpot query error:', jackpotError)

  // Regular slips: compute payout_status + is_insured to match Payouts Report semantics
  const regularMapped = (data ?? []).map((s: any) => {
    const isRedeemed = s.status === 'paid'
    const isInsured = s.insurance_applied === true || s.status === 'near_win'
    const netAmt = isInsured ? (s.insurance_payout ?? s.stake ?? 0) : (s.net_payout ?? 0)
    return {
      id: s.id,
      slip_id: s.slip_id,
      stake: s.stake,
      total_odds: s.total_odds,
      net_payout: netAmt,
      status: s.status,
      payout_status: ['won', 'near_win', 'paid'].includes(s.status)
        ? (isRedeemed ? 'redeemed' : 'pending')
        : null,
      is_insured: isInsured,
      is_anonymous: s.is_anonymous,
      redeemed_at: s.redeemed_at ?? null,
      created_at: s.created_at,
      bettor: s.bettor,
      is_jackpot: false,
    }
  })

  // Jackpot slips: same tax-adjusted net + payout_status logic as Payouts Report
  const jackpotMapped = (jackpotData ?? []).map((j: any) => {
    const isRedeemed = j.status === 'paid'
    const isInsured = j.status === 'near_win' ||
      (isRedeemed && (j.reward_amount ?? 0) <= (j.jackpots?.fixed_stake ?? j.stake ?? 0) * 1.1)
    // reward_amount is already net (tax deducted at settlement time)
    const net = j.reward_amount ?? 0
    return {
      id: j.id,
      slip_id: j.slip_id,
      stake: j.stake,
      total_odds: null,
      net_payout: net,
      status: j.status,
      payout_status: ['won', 'near_win', 'paid'].includes(j.status)
        ? (isRedeemed ? 'redeemed' : 'pending')
        : null,
      is_insured: isInsured,
      is_anonymous: j.is_anonymous,
      redeemed_at: isRedeemed ? (j.updated_at ?? null) : null,
      created_at: j.created_at,
      bettor: j.bettor,
      is_jackpot: true,
      jackpot_name: j.jackpots?.name,
    }
  })

  const combined = [...regularMapped, ...jackpotMapped]
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
