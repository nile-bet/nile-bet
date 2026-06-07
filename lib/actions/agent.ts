'use server'

import { createClient }
  from '@/lib/supabase/server'
import { createAdminClient }
  from '@/lib/supabase/server'
import { applyWelcomeBonus }
  from '@/lib/actions/coupons'

// ─── STATS ───────────────────────────

export async function getAgentStats(
  agentId: string,
  dateFilter: string = 'daily'
) {
  const supabase = await createClient()

  let startDate: string | null = null
  const now = new Date()

  if (dateFilter === 'daily') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    startDate = d.toISOString()
  } else if (dateFilter === 'weekly') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    startDate = d.toISOString()
  } else if (dateFilter === 'monthly') {
    const d = new Date(now)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    startDate = d.toISOString()
  }

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('credit_balance, reserved_balance')
    .eq('id', agentId)
    .single()

  // Cashiers count
  const { count: totalCashiers } =
    await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', agentId)
      .eq('role', 'cashier')

  const { count: activeCashiers } =
    await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', agentId)
      .eq('role', 'cashier')
      .eq('status', 'active')

  // Bettors under agent's cashiers
  const { data: cashiers } = await supabase
    .from('profiles')
    .select('id')
    .eq('created_by', agentId)
    .eq('role', 'cashier')

  const cashierIds =
    cashiers?.map((c) => c.id) ?? []

  let totalBettors = 0
  if (cashierIds.length > 0) {
    const { count } = await supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .in('created_by', cashierIds)
      .eq('role', 'bettor')
    totalBettors = count ?? 0
  }

  // Slips
  let slipsQuery = supabase
    .from('slips')
    .select('stake, net_payout, status')
    .eq('placed_by', agentId)

  if (startDate) {
    slipsQuery = slipsQuery.gte(
      'created_at',
      startDate
    )
  }

  const { data: slips } = await slipsQuery

  const totalRevenue = (slips ?? []).reduce(
    (a, s) => a + (s.stake ?? 0),
    0
  )
  const activeSlips = (slips ?? []).filter(
    (s) => s.status === 'pending'
  ).length
  const paidOut = (slips ?? [])
    .filter((s) => s.status === 'won')
    .reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const grossProfit = totalRevenue - paidOut
  const agentShare = grossProfit * 0.6

  // Pending credit requests
  const { count: pendingRequests } =
    await supabase
      .from('credit_requests')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('requester_id', agentId)
      .eq('status', 'pending')

  return {
    myBalance:
      profile?.credit_balance ?? 0,
    reservedBalance:
      profile?.reserved_balance ?? 0,
    totalCashiers: totalCashiers ?? 0,
    activeCashiers: activeCashiers ?? 0,
    totalBettors,
    totalRevenue,
    pendingRequests: pendingRequests ?? 0,
    activeSlips,
    grossProfit,
    agentShare,
  }
}

// ─── CASHIERS ────────────────────────

export async function getCashiersUnderAgent(
  agentId: string
) {
  const supabase = await createClient()

  const { data: cashiers } = await supabase
    .from('profiles')
    .select('*')
    .eq('created_by', agentId)
    .eq('role', 'cashier')
    .order('created_at', { ascending: false })

  if (!cashiers) return []

  const enriched = await Promise.all(
    cashiers.map(async (cashier) => {
      const { count: bettorCount } =
        await supabase
          .from('profiles')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('created_by', cashier.id)
          .eq('role', 'bettor')

      const { data: slips } = await supabase
        .from('slips')
        .select('stake, status')
        .eq('placed_by', cashier.id)

      const slipCount = slips?.length ?? 0
      const totalCollected = (slips ?? [])
        .reduce(
          (a, s) => a + (s.stake ?? 0), 0
        )

      return {
        ...cashier,
        bettor_count: bettorCount ?? 0,
        slip_count: slipCount,
        total_collected: totalCollected,
      }
    })
  )

  return enriched
}

// ─── BETTORS ─────────────────────────

export async function getBettorsUnderAgent(
  agentId: string,
  filters: {
    cashierId?: string
    search?: string
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()

  // Get all cashier IDs under agent
  const { data: cashiers } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('created_by', agentId)
    .eq('role', 'cashier')

  const cashierIds =
    cashiers?.map((c) => c.id) ?? []
  if (cashierIds.length === 0) {
    return { bettors: [], total: 0 }
  }

  const {
    cashierId,
    search,
    page = 1,
    limit = 20,
  } = filters
  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select(
      `
      id, username, credit_balance,
      status, created_by, created_at
    `,
      { count: 'exact' }
    )
    .eq('role', 'bettor')
    .in(
      'created_by',
      cashierId ? [cashierId] : cashierIds
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike(
      'username',
      `%${search}%`
    )
  }

  const { data, count } = await query

  // Enrich with cashier name
  const cashierMap = Object.fromEntries(
    cashiers?.map((c) => [
      c.id,
      c.username,
    ]) ?? []
  )

  const enriched = await Promise.all(
    (data ?? []).map(async (bettor) => {
      const { data: slips } = await supabase
        .from('slips')
        .select('status')
        .eq('bettor_id', bettor.id)

      return {
        ...bettor,
        cashier_name:
          cashierMap[bettor.created_by] ??
          '—',
        bet_count: slips?.length ?? 0,
        won_count:
          slips?.filter(
            (s) => s.status === 'won'
          ).length ?? 0,
        lost_count:
          slips?.filter(
            (s) => s.status === 'lost'
          ).length ?? 0,
      }
    })
  )

  return {
    bettors: enriched,
    total: count ?? 0,
  }
}

// ─── CREATE CASHIER ───────────────────

export async function createCashierByAgent(data: {
  username: string
  password: string
  initialBalance: number
  agentId: string
}): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  try {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Check username unique
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', data.username)
    .single()

  if (existing) {
    return {
      success: false,
      error: 'Username already taken',
    }
  }

  // Check agent balance
  const { data: agent } = await supabase
    .from('profiles')
    .select('credit_balance, username')
    .eq('id', data.agentId)
    .single()

  if (
    !agent ||
    agent.credit_balance < data.initialBalance
  ) {
    return {
      success: false,
      error: 'Insufficient balance',
    }
  }

  // Create auth user
  const email =
    `${data.username}@nilebet.internal`
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    })

  if (authError || !authData.user) {
    return {
      success: false,
      error:
        authError?.message ??
        'Failed to create user',
    }
  }

  // Create profile
  const { error: profileError } =
    await adminClient.from('profiles').insert({
      id: authData.user.id,
      username: data.username,
      role: 'cashier',
      status: 'active',
      credit_balance: data.initialBalance,
      created_by: data.agentId,
    })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(
      authData.user.id
    )
    return {
      success: false,
      error: 'Failed to create profile',
    }
  }

  // Deduct from agent
  if (data.initialBalance > 0) {
    await supabase
      .from('profiles')
      .update({
        credit_balance:
          agent.credit_balance -
          data.initialBalance,
      })
      .eq('id', data.agentId)

    await supabase
      .from('credit_assignments')
      .insert({
        from_user_id: data.agentId,
        to_user_id: authData.user.id,
        amount: data.initialBalance,
        note: 'Initial cashier balance',
      })
  }

  // Notify admin
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
        message: `Agent @${agent.username} created cashier @${data.username}`,
        type: 'broadcast',
      })
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: data.agentId,
      action: 'cashier_created',
      details: {
        username: data.username,
        initial_balance: data.initialBalance,
      },
    })

  return {
    success: true,
    userId: authData.user.id,
  }
  } catch (e: any) {
    console.error('createCashierByAgent error:', e)
    return { success: false, error: e?.message ?? 'Unexpected error' }
  }
}

// ─── ASSIGN CREDITS ───────────────────

export async function assignCreditsToSubUser(
  agentId: string,
  targetId: string,
  amount: number
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: agent } = await supabase
    .from('profiles')
    .select('credit_balance, username')
    .eq('id', agentId)
    .single()

  if (!agent || agent.credit_balance < amount) {
    return {
      success: false,
      error: 'Insufficient balance',
    }
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('credit_balance, username, created_by')
    .eq('id', targetId)
    .single()

  if (
    !target ||
    target.created_by !== agentId
  ) {
    return {
      success: false,
      error: 'Unauthorized',
    }
  }

  await supabase
    .from('profiles')
    .update({
      credit_balance:
        agent.credit_balance - amount,
    })
    .eq('id', agentId)

  await supabase
    .from('profiles')
    .update({
      credit_balance:
        target.credit_balance + amount,
    })
    .eq('id', targetId)

  await supabase
    .from('credit_assignments')
    .insert({
      from_user_id: agentId,
      to_user_id: targetId,
      amount,
      note: 'Agent credit assignment',
    })

  await supabase
    .from('notifications')
    .insert({
      to_user_id: targetId,
      message: `ETB ${amount.toLocaleString()} credited by your agent (@${agent.username})`,
      type: 'balance_updated',
    })

  // Notify admin
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
        message: `@${agent.username} assigned ETB ${amount.toLocaleString()} to @${target.username}`,
        type: 'broadcast',
      })
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: agentId,
      action: 'credits_assigned',
      details: {
        target: target.username,
        amount,
      },
    })

  return { success: true }
}

// ─── REQUEST CREDITS ──────────────────

export async function requestCreditsFromAdmin(
  agentId: string,
  amount: number,
  note: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: admin } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (!admin) {
    return {
      success: false,
      error: 'Admin not found',
    }
  }

  await supabase
    .from('credit_requests')
    .insert({
      requester_id: agentId,
      to_user_id: admin.id,
      amount,
      note,
      status: 'pending',
    })

  const { data: agent } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', agentId)
    .single()

  await supabase
    .from('notifications')
    .insert({
      to_user_id: admin.id,
      message: `💰 Credit request: @${agent?.username} needs ETB ${amount.toLocaleString()}`,
      type: 'balance_updated',
      priority: 'normal',
    })

  await supabase
    .from('activity_logs')
    .insert({
      user_id: agentId,
      action: 'credit_request_created',
      details: { amount, note },
    })

  return { success: true }
}

// ─── SUSPEND USER ─────────────────────

export async function suspendUserByAgent(
  targetId: string,
  agentId: string,
  suspend: boolean
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: target } = await supabase
    .from('profiles')
    .select('username, created_by, role')
    .eq('id', targetId)
    .single()

  if (!target) {
    return {
      success: false,
      error: 'User not found',
    }
  }

  // Verify ownership
  const { data: agent } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', agentId)
    .single()

  if (
    target.created_by !== agentId &&
    target.role !== 'bettor'
  ) {
    return {
      success: false,
      error: 'Unauthorized',
    }
  }

  const newStatus = suspend
    ? 'suspended'
    : 'active'

  await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', targetId)

  if (suspend) {
    await adminClient.auth.admin.signOut(
      targetId,
      'global'
    ).catch(() => {})
  }

  await supabase
    .from('notifications')
    .insert({
      to_user_id: targetId,
      message: suspend
        ? 'Your account has been suspended.'
        : 'Your account has been reactivated.',
      type: 'broadcast',
      priority: 'urgent',
    })

  // Notify admin
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
        message: `Agent @${agent?.username} ${suspend ? 'suspended' : 'activated'} @${target.username}`,
        type: 'broadcast',
      })
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: agentId,
      action: suspend
        ? 'user_suspended'
        : 'user_activated',
      details: { target: target.username },
    })

  return { success: true }
}

// ─── COUPON APPROVAL ──────────────────

export async function lookupCouponByAgent(
  code: string
) {
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

export async function approveCouponByAgent(
  code: string,
  agentId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const lookup =
    await lookupCouponByAgent(code)
  if (!lookup.success || !lookup.coupon) {
    return {
      success: false,
      error: lookup.error,
    }
  }

  const coupon = lookup.coupon
  const isTopup = coupon.type === 'topup'

  const { data: agent } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return {
      success: false,
      error: 'Agent not found',
    }
  }

  if (
    isTopup &&
    agent.credit_balance < coupon.amount
  ) {
    return {
      success: false,
      error: `Insufficient balance. You need ETB ${coupon.amount.toLocaleString()}`,
    }
  }

  const { data: bettor } = await supabase
    .from('profiles')
    .select('credit_balance, reserved_balance')
    .eq('id', coupon.bettor_id)
    .single()

  if (!bettor) {
    return {
      success: false,
      error: 'Bettor not found',
    }
  }

  // Update coupon
  await adminClient
    .from('coupons')
    .update({
      status: 'redeemed',
      redeemed_by: agentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coupon.id)

  if (isTopup) {
    // Agent pays bettor
    await adminClient
      .from('profiles')
      .update({
        credit_balance:
          agent.credit_balance - coupon.amount,
      })
      .eq('id', agentId)

    await adminClient
      .from('profiles')
      .update({
        credit_balance:
          bettor.credit_balance + coupon.amount,
      })
      .eq('id', coupon.bettor_id)

    // Apply welcome bonus
    await applyWelcomeBonus(
      coupon.bettor_id,
      coupon.amount
    ).catch(() => {})
  } else {
    // Withdrawal: credit_balance already deducted on creation, only release reserved_balance
    await adminClient
      .from('profiles')
      .update({
        reserved_balance: Math.max(0, (bettor.reserved_balance ?? 0) - coupon.amount),
      })
      .eq('id', coupon.bettor_id)

    await adminClient
      .from('profiles')
      .update({
        credit_balance:
          agent.credit_balance + coupon.amount,
      })
      .eq('id', agentId)
  }

  await supabase
    .from('notifications')
    .insert({
      to_user_id: coupon.bettor_id,
      message: isTopup
        ? `✅ Top-up of ETB ${coupon.amount.toLocaleString()} credited!`
        : `✅ Withdrawal of ETB ${coupon.amount.toLocaleString()} processed!`,
      type: 'balance_updated',
    })

  await supabase
    .from('activity_logs')
    .insert({
      user_id: agentId,
      action: isTopup
        ? 'coupon_topup_approved'
        : 'coupon_withdrawal_approved',
      details: {
        code,
        amount: coupon.amount,
      },
    })

  return { success: true }
}

// ─── PLACE BET ────────────────────────

export async function placeBetByAgent(data: {
  agentId: string
  bettorId: string | null
  isAnonymous: boolean
  selections: any[]
  stake: number
  copiedFromSlipId?: string
}): Promise<{
  success: boolean
  slipId?: string
  error?: string
}> {
  const { placeBet } =
    await import('@/lib/actions/bets')

  return placeBet({
    selections: data.selections,
    stake: data.stake,
    bettorId:
      data.bettorId ?? data.agentId,
    placedById: data.agentId,
    isAnonymous: data.isAnonymous,
    copiedFromSlipId: data.copiedFromSlipId,
  })
}

// ─── AGENT REPORTS ───────────────────

export async function getAgentReport(
  agentId: string,
  filters: {
    startDate?: string
    endDate?: string
  } = {}
) {
  const supabase = await createClient()

  let q = supabase
    .from('slips')
    .select('stake, net_payout, winning_tax, status, created_at')
    .eq('placed_by', agentId)

  if (filters.startDate) {
    q = q.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    q = q.lte('created_at', filters.endDate)
  }

  const { data: slips } = await q

  const totalCollected = (slips ?? [])
    .reduce((a, s) => a + (s.stake ?? 0), 0)
  const totalPaid = (slips ?? [])
    .filter(
      (s) =>
        s.status === 'won' ||
        s.status === 'near_win'
    )
    .reduce(
      (a, s) => a + (s.net_payout ?? 0), 0
    )
  const taxCollected = (slips ?? [])
    .filter((s) => s.status === 'won')
    .reduce(
      (a, s) => a + (s.winning_tax ?? 0), 0
    )

  const grossProfit = totalCollected - totalPaid
  const agentShare = grossProfit * 0.6

  const grouped: Record<string, any> = {}
  ;(slips ?? []).forEach((slip) => {
    const date =
      slip.created_at.split('T')[0]
    if (!grouped[date]) {
      grouped[date] = {
        date,
        collected: 0,
        paid: 0,
        profit: 0,
      }
    }
    grouped[date].collected += slip.stake ?? 0
    if (
      slip.status === 'won' ||
      slip.status === 'near_win'
    ) {
      grouped[date].paid += slip.net_payout ?? 0
    }
    grouped[date].profit =
      grouped[date].collected -
      grouped[date].paid
  })

  return {
    summary: {
      totalCollected,
      totalPaid,
      taxCollected,
      grossProfit,
      agentShare,
      slipCount: slips?.length ?? 0,
    },
    trendData: Object.values(grouped).sort(
      (a, b) => a.date.localeCompare(b.date)
    ),
  }
}

// ─── AGENT CREDIT HISTORY ────────────

export async function getAgentCreditHistory(
  agentId: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('credit_assignments')
    .select(
      `
      *,
      from_profile:profiles!credit_assignments_from_user_id_fkey (username),
      to_profile:profiles!credit_assignments_to_user_id_fkey (username)
    `
    )
    .or(
      `from_user_id.eq.${agentId},to_user_id.eq.${agentId}`
    )
    .order('created_at', { ascending: false })
    .limit(50)

  return data ?? []
}

// ─── AGENT ACTIVITY LOG ──────────────

export async function getAgentActivityLog(
  agentId: string,
  filters: {
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()

  const { page = 1, limit = 30 } = filters
  const offset = (page - 1) * limit

  const { data: cashiers } = await supabase
    .from('profiles')
    .select('id')
    .eq('created_by', agentId)
    .eq('role', 'cashier')

  const cashierIds = [
    agentId,
    ...(cashiers?.map((c) => c.id) ?? []),
  ]

  const { data, count } = await supabase
    .from('activity_logs')
    .select('*, profiles(username, role)', {
      count: 'exact',
    })
    .in('user_id', cashierIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return {
    logs: data ?? [],
    total: count ?? 0,
  }
}
export async function declineCouponByAgent(
  code: string,
  agentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const lookup = await lookupCouponByAgent(code)
  if (!lookup.success || !lookup.coupon) {
    return { success: false, error: lookup.error }
  }

  const coupon = lookup.coupon
  if (coupon.status !== 'pending') {
    return { success: false, error: 'Coupon already ' + coupon.status }
  }

  // Mark as expired/declined
  await adminClient.from('coupons').update({
    status: 'expired',
    updated_at: new Date().toISOString(),
  }).eq('id', coupon.id)

  // Release reserved balance if withdrawal
  if (coupon.type === 'withdrawal') {
    const { data: bettor } = await supabase
      .from('profiles').select('credit_balance, reserved_balance').eq('id', coupon.bettor_id).single()
    if (bettor) {
      await adminClient.from('profiles').update({
        reserved_balance: Math.max(0, (bettor.reserved_balance ?? 0) - coupon.amount),
        credit_balance: (bettor.credit_balance ?? 0) + coupon.amount,
      }).eq('id', coupon.bettor_id)
    }
  }

  await supabase.from('notifications').insert({
    to_user_id: coupon.bettor_id,
    message: coupon.type === 'withdrawal'
      ? `Your withdrawal of ETB ${coupon.amount.toLocaleString()} was declined. Balance restored.`
      : `Your top-up request of ETB ${coupon.amount.toLocaleString()} was declined.`,
    type: 'balance_updated',
  })

  return { success: true }
}
