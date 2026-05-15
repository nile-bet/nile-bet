'use server'

import { createClient }
  from '@/lib/supabase/server'
import { applyWelcomeBonus }
  from '@/lib/actions/coupons'

// ─── CREDIT REQUESTS ─────────────────

export async function getCreditRequests(
  filters: {
    status?: string
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()
  const {
    status,
    page = 1,
    limit = 20,
  } = filters
  const offset = (page - 1) * limit

  let query = supabase
    .from('credit_requests')
    .select(
      `
      *,
      requester:profiles!credit_requests_requester_id_fkey (
        id, username, role, credit_balance
      ),
      recipient:profiles!credit_requests_to_user_id_fkey (
        id, username, role
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, count } = await query
  return {
    requests: data ?? [],
    total: count ?? 0,
  }
}

export async function approveCreditRequest(
  requestId: string,
  adminId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: req } = await supabase
    .from('credit_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (!req) {
    return {
      success: false,
      error: 'Request not found',
    }
  }

  if (req.status !== 'pending') {
    return {
      success: false,
      error: 'Request is no longer pending',
    }
  }

  // Validate admin balance
  const { data: admin } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', adminId)
    .single()

  if (
    !admin ||
    admin.credit_balance < req.amount
  ) {
    return {
      success: false,
      error: 'Insufficient admin balance',
    }
  }

  const { data: requester } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', req.requester_id)
    .single()

  if (!requester) {
    return {
      success: false,
      error: 'Requester not found',
    }
  }

  // Update request
  await supabase
    .from('credit_requests')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  // Deduct from admin
  await supabase
    .from('profiles')
    .update({
      credit_balance:
        admin.credit_balance - req.amount,
    })
    .eq('id', adminId)

  // Add to requester
  await supabase
    .from('profiles')
    .update({
      credit_balance:
        requester.credit_balance + req.amount,
    })
    .eq('id', req.requester_id)

  // Insert credit assignment
  await supabase
    .from('credit_assignments')
    .insert({
      from_user_id: adminId,
      to_user_id: req.requester_id,
      amount: req.amount,
      note: `Credit request approved: ${req.note ?? ''}`,
    })

  // Insert transaction
  await supabase.from('transactions').insert({
    from_user_id: adminId,
    to_user_id: req.requester_id,
    amount: req.amount,
    type: 'credit_assign',
    note: 'Credit request approved',
  })

  // Notify requester
  await supabase
    .from('notifications')
    .insert({
      to_user_id: req.requester_id,
      message: `✅ Credit request of ETB ${req.amount.toLocaleString()} approved!`,
      type: 'balance_updated',
    })

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'credit_request_approved',
      details: {
        request_id: requestId,
        amount: req.amount,
        requester_id: req.requester_id,
      },
    })

  return { success: true }
}

export async function declineCreditRequest(
  requestId: string,
  adminNote: string,
  adminId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: req } = await supabase
    .from('credit_requests')
    .select('requester_id, amount')
    .eq('id', requestId)
    .single()

  if (!req) {
    return {
      success: false,
      error: 'Request not found',
    }
  }

  await supabase
    .from('credit_requests')
    .update({
      status: 'declined',
      admin_note: adminNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  await supabase
    .from('notifications')
    .insert({
      to_user_id: req.requester_id,
      message: `❌ Credit request of ETB ${req.amount.toLocaleString()} was declined.${adminNote ? ` Reason: ${adminNote}` : ''}`,
      type: 'broadcast',
    })

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'credit_request_declined',
      details: {
        request_id: requestId,
        admin_note: adminNote,
      },
    })

  return { success: true }
}

// ─── COUPONS ─────────────────────────

export async function getAllCoupons(
  filters: {
    type?: string
    status?: string
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()
  const {
    type,
    status,
    page = 1,
    limit = 20,
  } = filters
  const offset = (page - 1) * limit

  let query = supabase
    .from('coupons')
    .select(
      `
      *,
      bettor:profiles!coupons_bettor_id_fkey (
        username
      ),
      redeemer:profiles!coupons_redeemed_by_fkey (
        username
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, count } = await query
  return {
    coupons: data ?? [],
    total: count ?? 0,
  }
}

export async function lookupCoupon(
  code: string
): Promise<{
  success: boolean
  coupon?: any
  error?: string
}> {
  const supabase = await createClient()

  const { data: coupon } = await supabase
    .from('coupons')
    .select(
      `
      *,
      bettor:profiles!coupons_bettor_id_fkey (
        id, username, credit_balance
      )
    `
    )
    .eq('code', code.toUpperCase())
    .eq('status', 'pending')
    .single()

  if (!coupon) {
    return {
      success: false,
      error: 'Coupon not found or already used',
    }
  }

  if (new Date(coupon.expires_at) < new Date()) {
    return {
      success: false,
      error: 'Coupon has expired',
    }
  }

  return { success: true, coupon }
}

export async function approveTopupByAdmin(
  code: string,
  adminId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const lookup = await lookupCoupon(code)
  if (!lookup.success || !lookup.coupon) {
    return {
      success: false,
      error: lookup.error,
    }
  }

  const coupon = lookup.coupon

  // Admin deducts
  const { data: admin } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', adminId)
    .single()

  if (
    !admin ||
    admin.credit_balance < coupon.amount
  ) {
    return {
      success: false,
      error: 'Insufficient admin balance',
    }
  }

  const { data: bettor } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', coupon.bettor_id)
    .single()

  if (!bettor) {
    return {
      success: false,
      error: 'Bettor not found',
    }
  }

  // Update coupon
  await supabase
    .from('coupons')
    .update({
      status: 'redeemed',
      redeemed_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coupon.id)

  // Credit bettor
  await supabase
    .from('profiles')
    .update({
      credit_balance:
        bettor.credit_balance + coupon.amount,
    })
    .eq('id', coupon.bettor_id)

  // Deduct from admin
  await supabase
    .from('profiles')
    .update({
      credit_balance:
        admin.credit_balance - coupon.amount,
    })
    .eq('id', adminId)

  // Transaction
  await supabase.from('transactions').insert({
    from_user_id: adminId,
    to_user_id: coupon.bettor_id,
    amount: coupon.amount,
    type: 'coupon_topup',
    reference_id: coupon.id,
  })

  // Notify bettor
  await supabase
    .from('notifications')
    .insert({
      to_user_id: coupon.bettor_id,
      message: `✅ Top-up of ETB ${coupon.amount.toLocaleString()} credited to your account!`,
      type: 'balance_updated',
    })

  // Welcome bonus
  await applyWelcomeBonus(
    coupon.bettor_id,
    coupon.amount
  ).catch(() => {})

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'coupon_topup_approved',
      details: {
        code,
        amount: coupon.amount,
        bettor_id: coupon.bettor_id,
      },
    })

  return { success: true }
}

export async function approveWithdrawalByAdmin(
  code: string,
  adminId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const lookup = await lookupCoupon(code)
  if (!lookup.success || !lookup.coupon) {
    return {
      success: false,
      error: lookup.error,
    }
  }

  const coupon = lookup.coupon

  const { data: admin } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', adminId)
    .single()

  const { data: bettor } = await supabase
    .from('profiles')
    .select(
      'credit_balance, reserved_balance'
    )
    .eq('id', coupon.bettor_id)
    .single()

  if (!bettor) {
    return {
      success: false,
      error: 'Bettor not found',
    }
  }

  // Update coupon
  await supabase
    .from('coupons')
    .update({
      status: 'redeemed',
      redeemed_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coupon.id)

  // Release reserved balance from bettor
  await supabase
    .from('profiles')
    .update({
      reserved_balance: Math.max(
        0,
        (bettor.reserved_balance ?? 0) -
          coupon.amount
      ),
    })
    .eq('id', coupon.bettor_id)

  // Add to admin (cash collected)
  if (admin) {
    await supabase
      .from('profiles')
      .update({
        credit_balance:
          admin.credit_balance + coupon.amount,
      })
      .eq('id', adminId)
  }

  // Transaction
  await supabase.from('transactions').insert({
    from_user_id: coupon.bettor_id,
    to_user_id: adminId,
    amount: coupon.amount,
    type: 'coupon_withdrawal',
    reference_id: coupon.id,
  })

  // Notify bettor
  await supabase
    .from('notifications')
    .insert({
      to_user_id: coupon.bettor_id,
      message: `✅ Withdrawal of ETB ${coupon.amount.toLocaleString()} processed. Collect your cash.`,
      type: 'balance_updated',
    })

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'coupon_withdrawal_approved',
      details: {
        code,
        amount: coupon.amount,
        bettor_id: coupon.bettor_id,
      },
    })

  return { success: true }
}

export async function forceExpireCoupon(
  couponId: string,
  adminId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .single()

  if (!coupon) return { success: false }

  await supabase
    .from('coupons')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('id', couponId)

  // Release reserved if withdrawal
  if (coupon.type === 'withdrawal') {
    const { data: bettor } = await supabase
      .from('profiles')
      .select(
        'credit_balance, reserved_balance'
      )
      .eq('id', coupon.bettor_id)
      .single()

    if (bettor) {
      await supabase
        .from('profiles')
        .update({
          credit_balance:
            bettor.credit_balance +
            coupon.amount,
          reserved_balance: Math.max(
            0,
            (bettor.reserved_balance ?? 0) -
              coupon.amount
          ),
        })
        .eq('id', coupon.bettor_id)
    }
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'coupon_force_expired',
      details: { coupon_id: couponId },
    })

  return { success: true }
}

export async function getCouponStats() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: coupons } = await supabase
    .from('coupons')
    .select('type, status, amount, created_at')

  if (!coupons) {
    return {
      activeTopups: 0,
      activeTopupAmount: 0,
      activeWithdrawals: 0,
      activeWithdrawalAmount: 0,
      redeemedToday: 0,
      redeemedTodayAmount: 0,
      expiredToday: 0,
    }
  }

  const activeTopups = coupons.filter(
    (c) =>
      c.type === 'topup' &&
      c.status === 'pending'
  )
  const activeWithdrawals = coupons.filter(
    (c) =>
      c.type === 'withdrawal' &&
      c.status === 'pending'
  )
  const redeemedToday = coupons.filter(
    (c) =>
      c.status === 'redeemed' &&
      new Date(c.created_at) >= today
  )
  const expiredToday = coupons.filter(
    (c) =>
      c.status === 'expired' &&
      new Date(c.created_at) >= today
  )

  return {
    activeTopups: activeTopups.length,
    activeTopupAmount: activeTopups.reduce(
      (a, c) => a + c.amount,
      0
    ),
    activeWithdrawals: activeWithdrawals.length,
    activeWithdrawalAmount:
      activeWithdrawals.reduce(
        (a, c) => a + c.amount,
        0
      ),
    redeemedToday: redeemedToday.length,
    redeemedTodayAmount: redeemedToday.reduce(
      (a, c) => a + c.amount,
      0
    ),
    expiredToday: expiredToday.length,
  }
}

// ─── REPORTS ─────────────────────────

export async function getAgentProfitReport(
  filters: {
    agentId?: string
    startDate?: string
    endDate?: string
  } = {}
) {
  const supabase = await createClient()

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, username, credit_balance')
    .eq('role', 'agent')
    .eq('status', 'active')

  if (!agents) return []

  const results = await Promise.all(
    agents.map(async (agent) => {
      if (
        filters.agentId &&
        agent.id !== filters.agentId
      ) {
        return null
      }

      let slipsQuery = supabase
        .from('slips')
        .select(
          'stake, net_payout, winning_tax, status, placed_by'
        )
        .eq('placed_by', agent.id)

      if (filters.startDate) {
        slipsQuery = slipsQuery.gte(
          'created_at',
          filters.startDate
        )
      }
      if (filters.endDate) {
        slipsQuery = slipsQuery.lte(
          'created_at',
          filters.endDate
        )
      }

      const { data: slips } = await slipsQuery

      const totalCollected = (slips ?? [])
        .reduce(
          (a, s) => a + (s.stake ?? 0), 0
        )
      const totalPaidOut = (slips ?? [])
        .filter(
          (s) =>
            s.status === 'won' ||
            s.status === 'near_win'
        )
        .reduce(
          (a, s) => a + (s.net_payout ?? 0),
          0
        )
      const taxCollected = (slips ?? [])
        .filter((s) => s.status === 'won')
        .reduce(
          (a, s) =>
            a + (s.winning_tax ?? 0),
          0
        )
      const grossProfit =
        totalCollected - totalPaidOut
      const agentShare = grossProfit * 0.6
      const cashierShare = grossProfit * 0.4

      return {
        id: agent.id,
        username: agent.username,
        balance: agent.credit_balance,
        totalCollected,
        totalPaidOut,
        grossProfit,
        agentShare,
        cashierShare,
        taxCollected,
        slipCount: slips?.length ?? 0,
      }
    })
  )

  return results.filter(Boolean)
}

export async function getTopUsersReport(
  type: 'cashiers' | 'bettors',
  filters: {
    startDate?: string
    endDate?: string
    limit?: number
  } = {}
) {
  const supabase = await createClient()
  const limit = filters.limit ?? 10

  const role =
    type === 'cashiers' ? 'cashier' : 'bettor'
  const slipField =
    type === 'cashiers' ? 'placed_by' : 'bettor_id'

  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, credit_balance, created_by')
    .eq('role', role)
    .eq('status', 'active')

  if (!users) return []

  const results = await Promise.all(
    users.map(async (u) => {
      let q = supabase
        .from('slips')
        .select('stake, net_payout, status')
        .eq(slipField, u.id)

      if (filters.startDate) {
        q = q.gte(
          'created_at',
          filters.startDate
        )
      }
      if (filters.endDate) {
        q = q.lte(
          'created_at',
          filters.endDate
        )
      }

      const { data: slips } = await q

      const totalStaked = (slips ?? [])
        .reduce(
          (a, s) => a + (s.stake ?? 0), 0
        )
      const totalPaid = (slips ?? [])
        .filter((s) => s.status === 'won')
        .reduce(
          (a, s) =>
            a + (s.net_payout ?? 0),
          0
        )
      const netProfit = totalStaked - totalPaid
      const wonBets = (slips ?? []).filter(
        (s) => s.status === 'won'
      ).length
      const lostBets = (slips ?? []).filter(
        (s) => s.status === 'lost'
      ).length

      return {
        id: u.id,
        username: u.username,
        balance: u.credit_balance,
        created_by: u.created_by,
        slipCount: slips?.length ?? 0,
        totalStaked,
        totalPaid,
        netProfit,
        wonBets,
        lostBets,
        winRate:
          slips && slips.length > 0
            ? (wonBets / slips.length) * 100
            : 0,
      }
    })
  )

  return results
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, limit)
}

export async function getPlatformProfitReport(
  granularity: 'daily' | 'weekly' | 'monthly',
  filters: {
    startDate?: string
    endDate?: string
  } = {}
) {
  const supabase = await createClient()

  let q = supabase
    .from('slips')
    .select('stake, net_payout, winning_tax, status, created_at')
    .in('status', [
      'won',
      'lost',
      'near_win',
      'cancelled',
      'pending',
    ])

  if (filters.startDate) {
    q = q.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    q = q.lte('created_at', filters.endDate)
  }

  const { data: slips } = await q
  if (!slips) return []

  const grouped: Record<
    string,
    {
      period: string
      slipCount: number
      totalStaked: number
      totalPaidOut: number
      grossProfit: number
      taxCollected: number
      netProfit: number
    }
  > = {}

  slips.forEach((slip) => {
    const d = new Date(slip.created_at)
    let period = ''

    if (granularity === 'daily') {
      period = d.toISOString().split('T')[0]
    } else if (granularity === 'weekly') {
      const start = new Date(d)
      start.setDate(
        start.getDate() - start.getDay()
      )
      period = start.toISOString().split('T')[0]
    } else {
      period = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, '0')}`
    }

    if (!grouped[period]) {
      grouped[period] = {
        period,
        slipCount: 0,
        totalStaked: 0,
        totalPaidOut: 0,
        grossProfit: 0,
        taxCollected: 0,
        netProfit: 0,
      }
    }

    grouped[period].slipCount++
    grouped[period].totalStaked +=
      slip.stake ?? 0

    if (
      slip.status === 'won' ||
      slip.status === 'near_win'
    ) {
      grouped[period].totalPaidOut +=
        slip.net_payout ?? 0
    }

    if (slip.status === 'won') {
      grouped[period].taxCollected +=
        slip.winning_tax ?? 0
    }
  })

  Object.values(grouped).forEach((row) => {
    row.grossProfit =
      row.totalStaked - row.totalPaidOut
    row.netProfit =
      row.grossProfit - row.taxCollected
  })

  return Object.values(grouped).sort((a, b) =>
    a.period.localeCompare(b.period)
  )
}

export async function getTaxReport(
  filters: {
    startDate?: string
    endDate?: string
  } = {}
) {
  const supabase = await createClient()

  let q = supabase
    .from('slips')
    .select('stake, net_payout, winning_tax, created_at')
    .eq('status', 'won')

  if (filters.startDate) {
    q = q.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    q = q.lte('created_at', filters.endDate)
  }

  const { data: slips } = await q
  if (!slips) return []

  const grouped: Record<
    string,
    {
      date: string
      winningSlips: number
      grossPayout: number
      taxAmount: number
      netPaidOut: number
    }
  > = {}

  slips.forEach((slip) => {
    const date = slip.created_at.split('T')[0]
    if (!grouped[date]) {
      grouped[date] = {
        date,
        winningSlips: 0,
        grossPayout: 0,
        taxAmount: 0,
        netPaidOut: 0,
      }
    }
    grouped[date].winningSlips++
    grouped[date].grossPayout +=
      (slip.net_payout ?? 0) +
      (slip.winning_tax ?? 0)
    grouped[date].taxAmount +=
      slip.winning_tax ?? 0
    grouped[date].netPaidOut +=
      slip.net_payout ?? 0
  })

  return Object.values(grouped).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
}