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

  // Slips — via cashier IDs under this agent
  let totalRevenue = 0
  let activeSlips = 0
  let paidOut = 0

  if (cashierIds.length > 0) {
    let slipsQuery = supabase
      .from('slips')
      .select('stake, net_payout, winning_tax, status')
      .in('placed_by', cashierIds)

    if (startDate) {
      slipsQuery = slipsQuery.gte('created_at', startDate)
    }

    const { data: slips } = await slipsQuery
    totalRevenue = (slips ?? []).reduce((a, s) => a + (s.stake ?? 0), 0)
    activeSlips = (slips ?? []).filter((s) => s.status === 'pending').length
    paidOut = (slips ?? []).filter((s) => s.status === 'won').reduce((a, s) => a + (s.net_payout ?? 0), 0)
  }

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
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: target } = await adminClient
    .from('profiles')
    .select('username, created_by, role')
    .eq('id', targetId)
    .single()
  if (!target) return { success: false, error: 'User not found' }

  const { data: agent } = await adminClient
    .from('profiles')
    .select('username')
    .eq('id', agentId)
    .single()

  if (target.created_by !== agentId) {
    return { success: false, error: 'Unauthorized: this cashier does not belong to you' }
  }

  const newStatus = suspend ? 'suspended' : 'active'

  const { error: updateErr } = await adminClient
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', targetId)

  if (updateErr) return { success: false, error: 'Failed to update status: ' + updateErr.message }

  if (suspend) {
    await adminClient.auth.admin.signOut(targetId, 'global').catch(() => {})
  }

  await adminClient.from('notifications').insert({
    to_user_id: targetId,
    message: suspend
      ? 'Your account has been suspended. Contact your agent or admin.'
      : 'Your account has been reactivated.',
    type: 'broadcast',
    priority: 'urgent',
  })

  const { data: admin } = await adminClient.from('profiles').select('id').eq('role', 'admin').limit(1).single()
  if (admin) {
    await adminClient.from('notifications').insert({
      to_user_id: admin.id,
      message: `Agent @${agent?.username} ${suspend ? 'suspended' : 'activated'} @${target.username}`,
      type: 'broadcast',
    })
  }

  await adminClient.from('activity_logs').insert({
    user_id: agentId,
    action: suspend ? 'user_suspended' : 'user_activated',
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
  filters: { startDate?: string; endDate?: string } = {}
) {
  const supabase = await createClient()

  const { data: cashiers } = await supabase
    .from('profiles')
    .select('id, username, status, credit_balance')
    .eq('created_by', agentId)
    .eq('role', 'cashier')

  const cashierIds = (cashiers ?? []).map((c) => c.id)
  let allSlips: any[] = []
  let allJackpotSlips: any[] = []

  if (cashierIds.length > 0) {
    let q = supabase
      .from('slips')
      .select('stake, net_payout, winning_tax, status, insurance_tax, insurance_applied, created_at, placed_by')
      .in('placed_by', cashierIds)
    if (filters.startDate) q = q.gte('created_at', filters.startDate)
    if (filters.endDate) q = q.lte('created_at', filters.endDate)
    const { data } = await q
    allSlips = data ?? []

    let jq = supabase
      .from('jackpot_slips')
      .select('stake, reward_amount, reward_tax, status, created_at, placed_by')
      .in('placed_by', cashierIds)
    if (filters.startDate) jq = jq.gte('created_at', filters.startDate)
    if (filters.endDate) jq = jq.lte('created_at', filters.endDate)
    const { data: jData } = await jq
    allJackpotSlips = jData ?? []
  }
  const totalCollectedSlips = allSlips.reduce((a, s) => a + (s.stake ?? 0), 0)
  const totalPaidSlips = allSlips
    .filter((s) => s.status === 'won' || s.status === 'paid' || s.status === 'near_win')
    .reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const taxCollected = allSlips
    .filter((s) => s.status === 'won' || s.status === 'paid' || s.status === 'near_win')
    .reduce((a, s) => a + ((s.status === 'near_win' || s.insurance_applied) ? (s.insurance_tax ?? 0) : (s.winning_tax ?? 0)), 0)
  const jackpotTaxCollectedR = allJackpotSlips.reduce((a: number, s: any) => a + (s.reward_tax ?? 0), 0)
  const jackpotCollectedR = allJackpotSlips.reduce((a: number, s: any) => a + (s.stake ?? 0), 0)
  const jackpotPaidR = allJackpotSlips
    .filter((s: any) => s.status === 'won' || s.status === 'paid' || s.status === 'near_win')
    .reduce((a: number, s: any) => a + (s.reward_amount ?? 0), 0)
  const totalCollected = totalCollectedSlips + jackpotCollectedR
  const totalPaid = totalPaidSlips + jackpotPaidR
  const taxCollectedAll = taxCollected + jackpotTaxCollectedR
  const grossProfit = totalCollected - totalPaid - taxCollectedAll
  const agentShare = grossProfit * 0.6
  const grouped: Record<string, any> = {}
  allSlips.forEach((slip) => {
    const date = slip.created_at.split('T')[0]
    if (!grouped[date]) grouped[date] = { date, collected: 0, paid: 0, profit: 0 }
    grouped[date].collected += slip.stake ?? 0
    if (slip.status === 'won' || slip.status === 'paid' || slip.status === 'near_win') grouped[date].paid += slip.net_payout ?? 0
    grouped[date].profit = grouped[date].collected - grouped[date].paid
  })
  allJackpotSlips.forEach((slip: any) => {
    const date = slip.created_at.split('T')[0]
    if (!grouped[date]) grouped[date] = { date, collected: 0, paid: 0, profit: 0 }
    grouped[date].collected += slip.stake ?? 0
    if (slip.status === 'won' || slip.status === 'paid' || slip.status === 'near_win') grouped[date].paid += slip.reward_amount ?? 0
    grouped[date].profit = grouped[date].collected - grouped[date].paid
  })

  const cashierMap: Record<string, any> = {}
  for (const c of cashiers ?? []) {
    cashierMap[c.id] = { id: c.id, username: c.username, status: c.status, balance: c.credit_balance ?? 0, slipCount: 0, totalCollected: 0, totalPaid: 0, taxCollected: 0, grossProfit: 0, agentShare: 0 }
  }
  for (const slip of allSlips) {
    const c = cashierMap[slip.placed_by]
    if (!c) continue
    c.slipCount += 1
    c.totalCollected += slip.stake ?? 0
    if (slip.status === 'won' || slip.status === 'paid' || slip.status === 'near_win') c.totalPaid += slip.net_payout ?? 0
    if (slip.status === 'won' || slip.status === 'paid') c.taxCollected += slip.winning_tax ?? 0
    if (slip.status === 'near_win' || slip.insurance_applied) c.taxCollected += slip.insurance_tax ?? 0
  }
  for (const slip of allJackpotSlips) {
    const c = cashierMap[(slip as any).placed_by]
    if (!c) continue
    c.slipCount += 1
    c.totalCollected += (slip as any).stake ?? 0
    c.taxCollected += (slip as any).reward_tax ?? 0
    if ((slip as any).status === 'won' || (slip as any).status === 'paid' || (slip as any).status === 'near_win') c.totalPaid += (slip as any).reward_amount ?? 0
  }
  for (const c of Object.values(cashierMap) as any[]) {
    c.grossProfit = c.totalCollected - c.totalPaid - c.taxCollected
    c.agentShare = c.grossProfit * 0.6
  }

  return {
    summary: { totalCollected, totalPaid, taxCollected: taxCollectedAll, grossProfit, agentShare, slipCount: allSlips.length + allJackpotSlips.length },
    trendData: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
    cashierBreakdown: Object.values(cashierMap).sort((a: any, b: any) => b.grossProfit - a.grossProfit),
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

// ─── AGENT APPROVE/DECLINE CASHIER CREDIT REQUEST ─────────────────────────
export async function agentApproveCreditRequest(
  requestId: string,
  agentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Fetch request using regular client
  const { data: req } = await supabase
    .from('credit_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (!req || req.status !== 'pending') return { success: false, error: 'Invalid or already processed request' }

  // Get requester (cashier) current balance using adminClient
  const { data: cashierProfile } = await adminClient
    .from('profiles')
    .select('credit_balance, username')
    .eq('id', req.requester_id)
    .single()
  if (!cashierProfile) return { success: false, error: 'Cashier profile not found' }

  // Get agent current balance
  const { data: agentProfile } = await adminClient
    .from('profiles')
    .select('credit_balance, username')
    .eq('id', agentId)
    .single()
  if (!agentProfile) return { success: false, error: 'Agent profile not found' }
  if ((agentProfile.credit_balance ?? 0) < Number(req.amount)) {
    return { success: false, error: 'Insufficient agent balance' }
  }

  const newCashierBalance = (cashierProfile.credit_balance ?? 0) + Number(req.amount)
  const newAgentBalance = (agentProfile.credit_balance ?? 0) - Number(req.amount)

  // Update cashier balance
  const { error: cashierUpdateErr } = await adminClient
    .from('profiles')
    .update({ credit_balance: newCashierBalance })
    .eq('id', req.requester_id)
  if (cashierUpdateErr) return { success: false, error: 'Failed to update cashier balance: ' + cashierUpdateErr.message }

  // Update agent balance
  const { error: agentUpdateErr } = await adminClient
    .from('profiles')
    .update({ credit_balance: newAgentBalance })
    .eq('id', agentId)
  if (agentUpdateErr) return { success: false, error: 'Failed to update agent balance: ' + agentUpdateErr.message }

  // Mark request approved
  await adminClient.from('credit_requests').update({
    status: 'approved',
    updated_at: new Date().toISOString(),
  }).eq('id', requestId)

  // Log transaction
  await adminClient.from('transactions').insert({
    from_user_id: agentId,
    to_user_id: req.requester_id,
    amount: req.amount,
    type: 'credit_assigned',
    note: 'Agent approved cashier credit request: ' + (req.note ?? ''),
  })

  // Notify cashier
  await adminClient.from('notifications').insert({
    to_user_id: req.requester_id,
    from_user_id: agentId,
    message: 'Your credit request of ETB ' + Number(req.amount).toLocaleString() + ' has been approved by your agent @' + agentProfile.username + '!',
    type: 'balance_updated',
    priority: 'normal',
  })

  return { success: true }
}


export async function agentDeclineCreditRequest(
  requestId: string,
  agentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient()
    const { data: req } = await adminClient
      .from('credit_requests').select('requester_id').eq('id', requestId).single()

    await adminClient.from('credit_requests')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (req?.requester_id) {
      await adminClient.from('notifications').insert({
        to_user_id: req.requester_id,
        from_user_id: agentId,
        message: `❌ Your credit request has been declined by your agent.`,
        type: 'balance_updated',
        priority: 'normal',
      })
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ─── DEBUG: Test agent credit approval ────────────────────────────────────
export async function debugAgentApproval(requestId: string, agentId: string) {
  const adminClient = await createAdminClient()
  
  const { data: req, error: reqErr } = await adminClient
    .from('credit_requests').select('*').eq('id', requestId).single()
  
  const { data: agent, error: agentErr } = await adminClient
    .from('profiles').select('id, credit_balance').eq('id', agentId).single()
  
  const { data: cashier, error: cashierErr } = req ? await adminClient
    .from('profiles').select('id, credit_balance').eq('id', req.requester_id).single() : { data: null, error: null }

  return {
    req, reqErr: reqErr?.message,
    agent, agentErr: agentErr?.message,
    cashier, cashierErr: cashierErr?.message,
  }
}

// ─── AGENT NETWORK STATS ─────────────────────────────────────────────────────

export async function getAgentNetworkStats(
  agentId: string,
  dateFilter: {
    type: 'lifetime' | 'daily' | 'weekly' | 'monthly' | 'custom'
    startDate?: string
    endDate?: string
  }
) {
  const supabase = await createClient()

  let startDate: string | null = null
  let endDate: string | null = null
  const now = new Date()

  if (dateFilter.type === 'daily') {
    const d = new Date(now); d.setHours(0,0,0,0)
    startDate = d.toISOString(); endDate = now.toISOString()
  } else if (dateFilter.type === 'weekly') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    startDate = d.toISOString(); endDate = now.toISOString()
  } else if (dateFilter.type === 'monthly') {
    const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0)
    startDate = d.toISOString(); endDate = now.toISOString()
  } else if (dateFilter.type === 'custom') {
    startDate = dateFilter.startDate ?? null
    endDate = dateFilter.endDate ?? null
  }

  // Get agent profile
  const { data: profile } = await supabase
    .from('profiles').select('credit_balance, reserved_balance').eq('id', agentId).single()

  // Get all cashiers under agent
  const { data: cashiers } = await supabase
    .from('profiles').select('id, username, status, credit_balance').eq('created_by', agentId).eq('role', 'cashier')

  const cashierIds = (cashiers ?? []).map((c) => c.id)
  const totalCashiers = cashierIds.length
  const activeCashiers = (cashiers ?? []).filter((c) => c.status === 'active').length

  // Get all bettors under those cashiers
  let totalBettors = 0
  if (cashierIds.length > 0) {
    const { count } = await supabase
      .from('profiles').select('*', { count: 'exact', head: true }).in('created_by', cashierIds).eq('role', 'bettor')
    totalBettors = count ?? 0
  }

  // Fetch all slips via cashier IDs
  let all: any[] = []
  if (cashierIds.length > 0) {
    let q = supabase
      .from('slips')
      .select('stake, net_payout, winning_tax, status, insurance_applied, insurance_payout, insurance_tax, max_payout, placed_by, created_at, redeemed_at')
      .in('placed_by', cashierIds)
    if (startDate) q = q.gte('created_at', startDate)
    if (endDate) q = q.lte('created_at', endDate)
    const { data } = await q
    all = data ?? []
  }

  // Fetch all jackpot slips via cashier IDs
  let allJackpot: any[] = []
  if (cashierIds.length > 0) {
    let jq = supabase
      .from('jackpot_slips')
      .select('stake, reward_amount, reward_tax, status, placed_by, created_at')
      .in('placed_by', cashierIds)
    if (startDate) jq = jq.gte('created_at', startDate)
    if (endDate) jq = jq.lte('created_at', endDate)
    const { data } = await jq
    allJackpot = data ?? []
  }

  const totalSlips = all.length + allJackpot.length
  const wonSlips = all.filter((s) => s.status === 'won' || s.status === 'paid').length + allJackpot.filter((s) => s.status === 'won' || s.status === 'paid').length
  const lostSlips = all.filter((s) => s.status === 'lost').length + allJackpot.filter((s) => s.status === 'lost').length
  const pendingSlips = all.filter((s) => s.status === 'pending').length + allJackpot.filter((s) => s.status === 'pending').length
  const inProgressSlips = all.filter((s) => s.status === 'in_progress').length
  const cancelledSlips = all.filter((s) => s.status === 'cancelled').length
  const insuredSlips = all.filter((s) => s.status === 'near_win' || s.insurance_applied).length + allJackpot.filter((s) => s.status === 'near_win').length

  const totalCollectedSlips = all.reduce((a, s) => a + (s.stake ?? 0), 0)
  const totalPaidOutSlips = all.filter((s) => s.status === 'won' || s.status === 'paid' || s.status === 'near_win')
    .reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const taxCollectedSlips = all.filter((s) => s.status === 'won' || s.status === 'paid' || s.status === 'near_win')
    .reduce((a, s) => a + ((s.status === 'near_win' || s.insurance_applied) ? (s.insurance_tax ?? 0) : (s.winning_tax ?? 0)), 0)
  const pendingLiabilitySlips = all.filter((s) => s.status === 'pending')
    .reduce((a, s) => a + (s.max_payout ?? s.net_payout ?? 0), 0)

  // Jackpot financials
  const jackpotTaxCollected = allJackpot.reduce((a, s) => a + (s.reward_tax ?? 0), 0)
  const taxCollected = taxCollectedSlips + jackpotTaxCollected
  const jackpotCollected = allJackpot.reduce((a, s) => a + (s.stake ?? 0), 0)
  const jackpotPaidOut = allJackpot.filter((s) => s.status === 'won' || s.status === 'paid' || s.status === 'near_win')
    .reduce((a, s) => a + (s.reward_amount ?? 0), 0)
  const jackpotPendingLiability = allJackpot.filter((s) => s.status === 'pending')
    .reduce((a, s) => a + (s.reward_amount ?? 0), 0)

  // Regular vs jackpot split counts
  const regularSlips = all.length
  const jackpotSlipsCount = allJackpot.length

  // Won: redeemed (paid) vs awaiting payout (won)
  const wonRedeemed = all.filter((s) => s.status === 'paid').length + allJackpot.filter((s) => s.status === 'paid').length
  const wonPending = all.filter((s) => s.status === 'won').length + allJackpot.filter((s) => s.status === 'won').length

  // Insured: redeemed (has redeemed_at) vs pending (jackpot insured can't be split post-redemption)
  const insuredRegular = all.filter((s) => s.status === 'near_win')
  const insuredRedeemed = insuredRegular.filter((s: any) => s.redeemed_at).length
  const insuredPending = (insuredRegular.length - insuredRedeemed) + allJackpot.filter((s) => s.status === 'near_win').length

  // Lost / pending split
  const lostRegular = all.filter((s) => s.status === 'lost').length
  const lostJackpot = allJackpot.filter((s) => s.status === 'lost').length
  const pendingRegular = all.filter((s) => s.status === 'pending').length
  const pendingJackpot = allJackpot.filter((s) => s.status === 'pending').length

  const totalCollected = totalCollectedSlips + jackpotCollected
  const totalPaidOut = totalPaidOutSlips + jackpotPaidOut
  const pendingLiability = pendingLiabilitySlips + jackpotPendingLiability

  const grossProfit = totalCollected - totalPaidOut - taxCollected
  const agentProfit = grossProfit * 0.6
  const cashierProfit = grossProfit * 0.4

  // Jackpot status breakdown
  const jackpotTotal = allJackpot.length
  const jackpotWon = allJackpot.filter((s) => s.status === 'won' || s.status === 'paid').length
  const jackpotPending = allJackpot.filter((s) => s.status === 'pending').length
  const jackpotInsured = allJackpot.filter((s) => s.status === 'near_win').length
  const jackpotLost = allJackpot.filter((s) => s.status === 'lost').length
  const jackpotInProgress = 0
  const jackpotWonTotal = allJackpot.filter((s) => s.status === 'won' || s.status === 'paid')
    .reduce((a, s) => a + (s.reward_amount ?? 0), 0)

  // Pending credit requests
  const { count: pendingRequests } = await supabase
    .from('credit_requests').select('*', { count: 'exact', head: true }).eq('requester_id', agentId).eq('status', 'pending')

  return {
    myBalance: profile?.credit_balance ?? 0,
    reservedBalance: profile?.reserved_balance ?? 0,
    totalCashiers,
    activeCashiers,
    totalBettors,
    pendingRequests: pendingRequests ?? 0,
    // Slip counts
    totalSlips,
    wonSlips,
    lostSlips,
    pendingSlips,
    inProgressSlips,
    cancelledSlips,
    insuredSlips,
    regularSlips,
    jackpotSlipsCount,
    wonRedeemed,
    wonPending,
    insuredRedeemed,
    insuredPending,
    lostRegular,
    lostJackpot,
    pendingRegular,
    pendingJackpot,
    // Financial
    totalCollected,
    totalPaidOut,
    taxCollected,
    pendingLiability,
    grossProfit,
    agentProfit,
    cashierProfit,
    // Jackpot status
    jackpot: {
      total: jackpotTotal,
      won: jackpotWon,
      pending: jackpotPending,
      insured: jackpotInsured,
      lost: jackpotLost,
      inProgress: jackpotInProgress,
      wonTotal: jackpotWonTotal,
      collected: jackpotCollected,
      paidOut: jackpotPaidOut,
      pendingLiability: jackpotPendingLiability,
    },
  }
}

// ─── AGENT PAYOUT REPORT ─────────────────────────────────────────────────────
export async function getAgentPayoutsReport(
  agentId: string,
  dateFilter: { type: string; startDate?: string; endDate?: string } | string = 'daily'
) {
  const supabase = await createClient()
  let startDate: string | null = null
  let endDate: string | null = null
  const now = new Date()
  const ft = typeof dateFilter === 'string' ? dateFilter : (dateFilter as any).type
  if (ft === 'daily') {
    const d = new Date(now); d.setHours(0,0,0,0)
    startDate = d.toISOString(); endDate = now.toISOString()
  } else if (ft === 'weekly') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    startDate = d.toISOString(); endDate = now.toISOString()
  } else if (ft === 'monthly') {
    const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0)
    startDate = d.toISOString(); endDate = now.toISOString()
  } else if (ft === 'custom' && typeof dateFilter === 'object') {
    startDate = (dateFilter as any).startDate ?? null
    endDate = (dateFilter as any).endDate ?? null
  }

  // Get cashiers under agent
  const { data: cashiers } = await supabase
    .from('profiles').select('id, username').eq('created_by', agentId).eq('role', 'cashier')
  const cashierIds = (cashiers ?? []).map((c) => c.id)
  const emptyTotals = {
    grossWinTotal: 0, taxTotal: 0, netPayoutTotal: 0, stakeTotal: 0,
    totalWonNet: 0, totalWonCount: 0,
    wonRedeemedNet: 0, wonRedeemedCount: 0,
    insuredRedeemedNet: 0, insuredRedeemedCount: 0,
    pendingPayoutNet: 0, pendingCount: 0, insuredPendingNet: 0, insuredPendingCount: 0,
  }
  if (cashierIds.length === 0) return { slips: [], totals: emptyTotals }

  const cashierMap = Object.fromEntries((cashiers ?? []).map((c) => [c.id, c.username]))

  // ── Regular slips across all cashiers under this agent ──
  let q = supabase
    .from('slips')
    .select(`
      slip_id, stake, total_odds, max_payout, winning_tax, net_payout, status,
      is_anonymous, insurance_applied, insurance_payout, insurance_tax, redeemed_at,
      created_at, placed_by,
      bettor:profiles!slips_bettor_id_fkey (username)
    `)
    .in('placed_by', cashierIds)
    .in('status', ['won', 'near_win', 'paid'])
    .order('created_at', { ascending: false })
    .limit(200)
  if (startDate) q = q.gte('created_at', startDate)
  if (endDate) q = q.lte('created_at', endDate)
  const { data: slips } = await q

  // ── Jackpot slips across all cashiers under this agent ──
  let jq = supabase
    .from('jackpot_slips')
    .select(`
      slip_id, stake, reward_amount, reward_tax, status, is_anonymous, is_insured, placed_by,
      created_at, updated_at,
      jackpots (name, fixed_stake),
      bettor:profiles!jackpot_slips_bettor_id_fkey (username)
    `)
    .in('placed_by', cashierIds)
    .in('status', ['won', 'near_win', 'paid'])
    .order('created_at', { ascending: false })
    .limit(200)
  if (startDate) jq = jq.gte('created_at', startDate)
  if (endDate) jq = jq.lte('created_at', endDate)
  const { data: jackpotSlips } = await jq

  // Normalize regular slips (mirrors getCashierPayoutsReport)
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
      status: isRedeemed ? 'redeemed' : 'pending',
      is_anonymous: s.is_anonymous,
      is_insured: isInsured,
      created_at: s.created_at,
      redeemed_at: s.redeemed_at ?? null,
      bettor: s.bettor,
      is_jackpot: false,
      cashier_username: cashierMap[s.placed_by] ?? '—',
    }
  })

  // Normalize jackpot slips (mirrors getCashierPayoutsReport)
  const jackpotPayouts = (jackpotSlips ?? []).map((j: any) => {
    const isRedeemed = j.status === 'paid'
    const isInsured = j.is_insured === true || j.status === 'near_win'
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
      status: isRedeemed ? 'redeemed' : 'pending',
      is_anonymous: j.is_anonymous,
      is_insured: isInsured,
      created_at: j.created_at,
      redeemed_at: isRedeemed ? (j.updated_at ?? null) : null,
      bettor: j.bettor,
      is_jackpot: true,
      jackpot_name: j.jackpots?.name,
      cashier_username: cashierMap[j.placed_by] ?? '—',
    }
  })

  const enriched = [...regularPayouts, ...jackpotPayouts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // ── Card 1: Total Won = all won slips (pending + redeemed) after tax, excl insured ──
  const totalWonNet = enriched.filter(s => !s.is_insured).reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const totalWonCount = enriched.filter(s => !s.is_insured).length

  // ── Card 2: Won Redeemed = redeemed won slips after tax ──
  const wonRedeemedNet = enriched.filter(s => !s.is_insured && s.payout_status === 'redeemed').reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const wonRedeemedCount = enriched.filter(s => !s.is_insured && s.payout_status === 'redeemed').length

  // ── Card 3: Insured Redeemed ──
  const insuredRedeemedNet = enriched.filter(s => s.is_insured && s.payout_status === 'redeemed').reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const insuredPendingNet = enriched.filter(s => s.is_insured && s.payout_status === 'pending').reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const insuredPendingCount = enriched.filter(s => s.is_insured && s.payout_status === 'pending').length
  const insuredRedeemedCount = enriched.filter(s => s.is_insured && s.payout_status === 'redeemed').length

  // ── Card 4: Pending Payout = won + insured but NOT redeemed ──
  const pendingPayoutNet = enriched.filter(s => s.payout_status === 'pending').reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const pendingCount = enriched.filter(s => s.payout_status === 'pending').length

  const grossWinTotal = enriched.reduce((a, s) => a + (s.max_payout ?? 0), 0)
  const taxTotal = enriched.reduce((a, s) => a + (s.winning_tax ?? 0), 0)
  const netPayoutTotal = enriched.reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const stakeTotal = enriched.reduce((a, s) => a + (s.stake ?? 0), 0)

  return {
    slips: enriched,
    totals: {
      grossWinTotal, taxTotal, netPayoutTotal, stakeTotal,
      totalWonNet, totalWonCount,
      wonRedeemedNet, wonRedeemedCount,
      insuredRedeemedNet, insuredRedeemedCount,
      pendingPayoutNet, pendingCount, insuredPendingNet, insuredPendingCount,
    },
  }
}
