'use server'

import { createClient }
  from '@/lib/supabase/server'
import { createAdminClient }
  from '@/lib/supabase/server'

// ─── STATS ───────────────────────────

type DateFilterInput =
  | string
  | {
      type: 'daily' | 'weekly' | 'monthly' | 'lifetime' | 'custom'
      startDate?: string
      endDate?: string
    }

function resolveDateRange(dateFilter: DateFilterInput): {
  startDate: string | null
  endDate: string | null
} {
  const now = new Date()
  const filter: {
    type: 'daily' | 'weekly' | 'monthly' | 'lifetime' | 'custom'
    startDate?: string
    endDate?: string
  } =
    typeof dateFilter === 'string'
      ? { type: dateFilter as 'daily' | 'weekly' | 'monthly' | 'lifetime' | 'custom' }
      : dateFilter

  if (filter.type === 'daily') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return { startDate: d.toISOString(), endDate: now.toISOString() }
  }
  if (filter.type === 'weekly') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return { startDate: d.toISOString(), endDate: now.toISOString() }
  }
  if (filter.type === 'monthly') {
    const d = new Date(now)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return { startDate: d.toISOString(), endDate: now.toISOString() }
  }
  if (filter.type === 'custom') {
    return {
      startDate: filter.startDate ?? null,
      endDate: filter.endDate ?? null,
    }
  }
  // lifetime
  return { startDate: null, endDate: null }
}

export async function getPlatformStats(
  dateFilter: DateFilterInput = 'daily'
) {
  const supabase = await createClient()

  const { startDate, endDate } = resolveDateRange(dateFilter)

  // Get cashier + agent IDs to filter slips
  const { data: cashierAgentProfiles } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['cashier', 'agent'])
  const cashierAgentIds = (cashierAgentProfiles ?? []).map((p: any) => p.id)

  // Slips query - only placed by cashiers/agents
  let slipsQuery = supabase
    .from('slips')
    .select('stake, net_payout, winning_tax, insurance_applied, insurance_payout, insurance_tax, status, redeemed_at, is_insured')

  if (cashierAgentIds.length > 0) slipsQuery = slipsQuery.in('placed_by', cashierAgentIds)
  if (startDate) {
    slipsQuery = slipsQuery.gte(
      'created_at', startDate
    )
  }
  if (endDate) {
    slipsQuery = slipsQuery.lte(
      'created_at', endDate
    )
  }

  const { data: slips } = await slipsQuery

  // Jackpot slips - only placed by cashiers/agents
  let jpQuery = supabase
    .from('jackpot_slips')
    .select('stake, reward_amount, reward_tax, status, redeemed_at, is_insured')

  if (cashierAgentIds.length > 0) jpQuery = jpQuery.in('placed_by', cashierAgentIds)
  if (startDate) jpQuery = jpQuery.gte('created_at', startDate)
  if (endDate) jpQuery = jpQuery.lte('created_at', endDate)

  const { data: jackpotSlips } = await jpQuery

  const jpWonTax = (jackpotSlips ?? [])
    .filter((s) => s.status === 'paid' || (s.status === 'near_win' && (s as any).redeemed_at))
    .reduce((a, s) => a + (s.reward_tax ?? (s.reward_amount ?? 0) * 0.15), 0)

  const jpPendingPayout = (jackpotSlips ?? [])
    .filter((s) => s.status === 'pending' || s.status === 'won' || (s.status === 'near_win' && !(s as any).redeemed_at))
    .reduce((a, s) => a + (s.reward_amount ?? 0), 0)

  const totalRevenue =
    (slips ?? []).reduce((a, s) => a + (s.stake ?? 0), 0) +
    (jackpotSlips ?? []).reduce((a, s) => a + (s.stake ?? 0), 0)

  const pendingPayouts = (slips ?? [])
    .filter((s) => s.status === 'pending' || s.status === 'won' || (s.status === 'near_win' && !(s as any).redeemed_at))
    .reduce((a, s) => a + (s.status === 'near_win' ? (s.insurance_payout ?? s.net_payout ?? 0) : (s.net_payout ?? 0)), 0) + jpPendingPayout

  const taxCollected = (slips ?? [])
    .filter((s) => s.status === 'paid' || (s.status === 'near_win' && (s as any).redeemed_at))
    .reduce(
      (a, s) => a + ((s.status === 'near_win' || s.insurance_applied) ? (s.insurance_tax ?? 0) : (s.winning_tax ?? 0)), 0
    ) + jpWonTax

  // User counts
  const { count: activeBettors } =
    await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'bettor')
      .eq('status', 'active')

  const { count: totalCashiers } =
    await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'cashier')

  const { count: totalAgents } =
    await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'agent')

  // Admin balance <
  const { data: admin } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('role', 'admin')
    .limit(1)
    .single()

  // Calculate total paid out for gross profit
  const totalPaidOut =
    (slips ?? []).filter((s) => s.status === 'paid' || (s.status === 'near_win' && (s as any).redeemed_at))
      .reduce((a, s) => a + (s.net_payout ?? 0), 0) +
    (jackpotSlips ?? []).filter((s) => s.status === 'paid' || (s.status === 'near_win' && (s as any).redeemed_at))
      .reduce((a, s) => a + (s.reward_amount ?? 0), 0)

  const grossProfit = totalRevenue - totalPaidOut

  // Slip status counts
  const allSlips = slips ?? []
  const allJp = jackpotSlips ?? []
  const wonSlips = allSlips.filter(s => s.status === 'won' || s.status === 'paid').length + allJp.filter(s => s.status === 'won' || (s.status === 'paid' && !(s as any).is_insured)).length
  const wonRedeemed = allSlips.filter(s => s.status === 'paid').length + allJp.filter(s => s.status === 'paid' && !(s as any).is_insured).length
  const wonPending = allSlips.filter(s => s.status === 'won').length + allJp.filter(s => s.status === 'won').length
  const lostSlips = allSlips.filter(s => s.status === 'lost').length + allJp.filter(s => s.status === 'lost').length
  const pendingSlips = allSlips.filter(s => s.status === 'pending').length + allJp.filter(s => s.status === 'pending').length
  const insuredSlips = allSlips.filter(s => s.status === 'near_win').length + allJp.filter(s => s.status === 'near_win' || ((s as any).is_insured && s.status === 'paid')).length
  const insuredRedeemed = allSlips.filter(s => s.status === 'near_win' && (s as any).redeemed_at).length + allJp.filter(s => (s.status === 'near_win' && (s as any).redeemed_at) || ((s as any).is_insured && s.status === 'paid')).length
  const insuredPending = insuredSlips - insuredRedeemed
  const cancelledSlips = allSlips.filter(s => s.status === 'cancelled').length

  return {
    totalRevenue,
    totalPaidOut,
    grossProfit,
    activeBettors: activeBettors ?? 0,
    totalSlipsToday: allSlips.length + allJp.length,
    wonSlips,
    wonRedeemed,
    wonPending,
    lostSlips,
    pendingSlips,
    insuredSlips,
    insuredRedeemed,
    insuredPending,
    cancelledSlips,
    pendingPayouts,
    totalCashiers: totalCashiers ?? 0,
    totalAgents: totalAgents ?? 0,
    taxCollected,
    platformBalance: admin?.credit_balance ?? 0,
  }
}

export async function getRevenueByDay(
  days: number = 30
) {
  const supabase = await createClient()

  const start = new Date()
  start.setDate(start.getDate() - days)

  const { data: slips } = await supabase
    .from('slips')
    .select('stake, net_payout, winning_tax, insurance_applied, insurance_payout, insurance_tax, status, created_at')
    .gte('created_at', start.toISOString())
    .in('status', ['won', 'lost', 'pending', 'near_win'])

  const { data: jackpotSlips } = await supabase
    .from('jackpot_slips')
    .select('stake, reward_amount, reward_tax, status, created_at')
    .gte('created_at', start.toISOString())

  const grouped: Record<string, {
    date: string
    revenue: number
    payouts: number
    profit: number
  }> = {}

  ;(slips ?? []).forEach((slip) => {
    const date = slip.created_at
      .split('T')[0]
    if (!grouped[date]) {
      grouped[date] = {
        date,
        revenue: 0,
        payouts: 0,
        profit: 0,
      }
    }
    grouped[date].revenue +=
      slip.stake ?? 0
    if (slip.status === 'won' || slip.status === 'paid' || slip.status === 'near_win') {
      grouped[date].payouts += (slip.status === 'near_win' || slip.insurance_applied)
        ? (slip.insurance_payout ?? slip.net_payout ?? 0)
        : (slip.net_payout ?? 0)
    }
  })

  ;(jackpotSlips ?? []).forEach((slip) => {
    const date = slip.created_at.split('T')[0]
    if (!grouped[date]) {
      grouped[date] = { date, revenue: 0, payouts: 0, profit: 0 }
    }
    grouped[date].revenue += slip.stake ?? 0
    if (slip.status === 'won' || slip.status === 'paid' || slip.status === 'near_win') {
      grouped[date].payouts += (slip.reward_amount ?? 0) - (slip.reward_tax ?? (slip.reward_amount ?? 0) * 0.15)
    }
  })

  Object.values(grouped).forEach((d) => {
    d.profit = d.revenue - d.payouts
  })

  return Object.values(grouped)
    .sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    .slice(-days)
}

export async function getSlipStatusCounts() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('slips')
    .select('status')

  const { data: jackpotData } = await supabase
    .from('jackpot_slips')
    .select('status')

  const counts = {
    pending: 0,
    won: 0,
    lost: 0,
    cancelled: 0,
    near_win: 0,
  }

  ;(data ?? []).forEach((s) => {
    if (s.status in counts) {
      counts[s.status as keyof typeof counts]++
    }
  })

  ;(jackpotData ?? []).forEach((s) => {
    if (s.status in counts) {
      counts[s.status as keyof typeof counts]++
    }
  })

  return counts
}

export async function getAgentPerformance(
  dateFilter: DateFilterInput = 'daily'
) {
  const supabase = await createClient()

  const { startDate, endDate } = resolveDateRange(dateFilter)

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, username, credit_balance, status, created_at')
    .eq('role', 'agent')
    .eq('status', 'active')

  if (!agents) return []

  const results = await Promise.all(
    agents.map(async (agent) => {
      const { count: cashiersCount } =
        await supabase
          .from('profiles')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('created_by', agent.id)
          .eq('role', 'cashier')

      // Agent's own cashiers' slips (agent revenue flows through cashier network)
      const { data: cashiers } = await supabase
        .from('profiles')
        .select('id')
        .eq('created_by', agent.id)
        .eq('role', 'cashier')

      const cashierIds = (cashiers ?? []).map((c) => c.id)
      const placerIds = [agent.id, ...cashierIds]

      let slipsQuery = supabase
        .from('slips')
        .select('stake, net_payout, status, created_at')
        .in('placed_by', placerIds)

      if (startDate) slipsQuery = slipsQuery.gte('created_at', startDate)
      if (endDate) slipsQuery = slipsQuery.lte('created_at', endDate)

      const { data: agentSlips } = await slipsQuery

      const revenue = (agentSlips ?? [])
        .reduce(
          (a, s) => a + (s.stake ?? 0), 0
        )

      return {
        ...agent,
        cashiers_count: cashiersCount ?? 0,
        revenue,
        active_slips: (agentSlips ?? [])
          .filter((s) => s.status === 'pending')
          .length,
      }
    })
  )

  return results.sort(
    (a, b) => b.revenue - a.revenue
  )
}

// ─── ADMIN PLATFORM PAYOUTS REPORT ──────────────────────────────────────────
export async function getAdminPayoutsReport(
  dateFilter: DateFilterInput = 'daily'
) {
  const supabase = await createClient()
  const { startDate, endDate } = resolveDateRange(dateFilter)

  // Regular slips — all won/near_win/paid platform-wide
  let q = supabase
    .from('slips')
    .select(`
      slip_id, stake, total_odds, max_payout, winning_tax,
      net_payout, status, is_anonymous, insurance_applied,
      insurance_payout, insurance_tax, redeemed_at, created_at, placed_by,
      bettor:profiles!slips_bettor_id_fkey (username)
    `)
    .in('status', ['won', 'near_win', 'paid'])
    .order('created_at', { ascending: false })
    .limit(500)
  if (startDate) q = q.gte('created_at', startDate)
  if (endDate) q = q.lte('created_at', endDate)
  const { data: slips } = await q

  // Jackpot slips — all won/near_win/paid platform-wide
  let jq = supabase
    .from('jackpot_slips')
    .select(`
      slip_id, stake, reward_amount, reward_tax, status,
      is_anonymous, is_insured, redeemed_at, placed_by, created_at, updated_at,
      jackpots (name, fixed_stake),
      bettor:profiles!jackpot_slips_bettor_id_fkey (username)
    `)
    .in('status', ['won', 'near_win', 'paid'])
    .order('created_at', { ascending: false })
    .limit(500)
  if (startDate) jq = jq.gte('created_at', startDate)
  if (endDate) jq = jq.lte('created_at', endDate)
  const { data: jackpotSlips } = await jq

  // Resolve placed_by → cashier username
  const placedByIds = Array.from(new Set([
    ...(slips ?? []).map((s: any) => s.placed_by).filter(Boolean),
    ...(jackpotSlips ?? []).map((s: any) => s.placed_by).filter(Boolean),
  ])) as string[]
  const cashierMap: Record<string, string> = {}
  if (placedByIds.length > 0) {
    const { data: placers } = await supabase
      .from('profiles').select('id, username').in('id', placedByIds)
    ;(placers ?? []).forEach((p: any) => { cashierMap[p.id] = p.username })
  }

  // Normalize regular slips
  const regularPayouts = (slips ?? []).map((s: any) => {
    const isRedeemed = s.status === 'paid' || ((s.insurance_applied === true || s.status === 'near_win') && s.redeemed_at != null)
    const isInsured = s.insurance_applied === true || s.status === 'near_win'
    const taxAmt = isInsured ? (s.insurance_tax ?? 0) : (s.winning_tax ?? 0)
    const netAmt = isInsured ? (s.insurance_payout ?? s.stake ?? 0) : (s.net_payout ?? 0)
    const grossAmt = isInsured ? (netAmt + taxAmt) : (s.max_payout ?? 0)
    return {
      slip_id: s.slip_id, stake: s.stake, total_odds: s.total_odds,
      max_payout: grossAmt, winning_tax: taxAmt, net_payout: netAmt,
      payout_status: isRedeemed ? 'redeemed' : 'pending',
      status: isRedeemed ? 'redeemed' : 'pending',
      is_anonymous: s.is_anonymous, is_insured: isInsured,
      created_at: s.created_at, redeemed_at: s.redeemed_at ?? null,
      bettor: s.bettor, is_jackpot: false,
      cashier_username: cashierMap[s.placed_by] ?? '—',
    }
  })

  // Normalize jackpot slips
  const jackpotPayouts = (jackpotSlips ?? []).map((j: any) => {
    const isRedeemed = j.status === 'paid' || ((j.is_insured === true || j.status === 'near_win') && j.redeemed_at != null)
    const isInsured = j.is_insured === true || j.status === 'near_win'
    const tax = j.reward_tax ?? 0
    const net = j.reward_amount ?? 0
    return {
      slip_id: j.slip_id, stake: j.stake, total_odds: null,
      max_payout: net + tax, winning_tax: tax, net_payout: net,
      payout_status: isRedeemed ? 'redeemed' : 'pending',
      status: isRedeemed ? 'redeemed' : 'pending',
      is_anonymous: j.is_anonymous, is_insured: isInsured,
      created_at: j.created_at, redeemed_at: isRedeemed ? (j.updated_at ?? null) : null,
      bettor: j.bettor, is_jackpot: true, jackpot_name: j.jackpots?.name,
      cashier_username: cashierMap[j.placed_by] ?? '—',
    }
  })

  const enriched = [...regularPayouts, ...jackpotPayouts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalWonNet = enriched.filter(s => !s.is_insured).reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const totalWonCount = enriched.filter(s => !s.is_insured).length
  const wonRedeemedNet = enriched.filter(s => !s.is_insured && s.payout_status === 'redeemed').reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const wonRedeemedCount = enriched.filter(s => !s.is_insured && s.payout_status === 'redeemed').length
  const insuredRedeemedNet = enriched.filter(s => s.is_insured && s.payout_status === 'redeemed').reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const insuredRedeemedCount = enriched.filter(s => s.is_insured && s.payout_status === 'redeemed').length
  const insuredPendingNet = enriched.filter(s => s.is_insured && s.payout_status === 'pending').reduce((a, s) => a + (s.net_payout ?? 0), 0)
  const insuredPendingCount = enriched.filter(s => s.is_insured && s.payout_status === 'pending').length
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

export async function getHierarchyTree() {
  const supabase = await createClient()

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, username, credit_balance, status')
    .eq('role', 'agent')
    .order('created_at', { ascending: true })

  const { data: cashiers } = await supabase
    .from('profiles')
    .select('id, username, credit_balance, status, created_by')
    .eq('role', 'cashier')
    .order('created_at', { ascending: true })

  const { data: bettors } = await supabase
    .from('profiles')
    .select('id, created_by')
    .eq('role', 'bettor')

  const tree = (agents ?? []).map(
    (agent) => {
      const agentCashiers = (
        cashiers ?? []
      ).filter(
        (c) => c.created_by === agent.id
      )

      const enrichedCashiers =
        agentCashiers.map((cashier) => ({
          ...cashier,
          bettorsCount: (bettors ?? [])
            .filter(
              (b) => b.created_by === cashier.id
            ).length,
        }))

      return {
        ...agent,
        cashiers: enrichedCashiers,
      }
    }
  )

  return tree
}

// ─── USERS ───────────────────────────

export async function getAllUsers(
  role: string,
  filters: {
    status?: string
    search?: string
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()

  const {
    status,
    search,
    page = 1,
    limit = 20,
  } = filters
  const offset = (page - 1) * limit

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', role)
    .order('created_at', {
      ascending: false,
    })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.ilike(
      'username',
      `%${search}%`
    )
  }

  const { data, count, error } = await query

  if (error) return { users: [], total: 0 }
  return { users: data ?? [], total: count ?? 0 }
}

export async function createUser(data: {
  username: string
  password: string
  role: string
  initialBalance: number
  assignedAgentId?: string
  createdBy: string
}): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
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

  // Validate balance <
  if (data.initialBalance > 0) {
    const { data: creator } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', data.createdBy)
      .single()

    if (
      !creator ||
      creator.credit_balance <
        data.initialBalance
    ) {
      return {
        success: false,
        error: 'Insufficient balance to assign',
      }
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
  const profileData: any = {
    id: authData.user.id,
    username: data.username,
    role: data.role,
    status: 'active',
    credit_balance: data.initialBalance,
    created_by: data.createdBy,
  }

  if (
    data.role === 'cashier' &&
    data.assignedAgentId
  ) {
    profileData.created_by =
      data.assignedAgentId
  }

  const { error: profileError } =
    await supabase
      .from('profiles')
      .insert(profileData)

  if (profileError) {
    await adminClient.auth.admin.deleteUser(
      authData.user.id
    )
    return {
      success: false,
      error: 'Failed to create profile',
    }
  }

  // Deduct balance from creator
  if (data.initialBalance > 0) {
    const { data: creator } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', data.createdBy)
      .single()

    if (creator) {
      await supabase
        .from('profiles')
        .update({
          credit_balance:
            creator.credit_balance -
            data.initialBalance,
        })
        .eq('id', data.createdBy)

      await supabase
        .from('credit_assignments')
        .insert({
          from_user_id: data.createdBy,
          to_user_id: authData.user.id,
          amount: data.initialBalance,
          note: 'Initial balance on account creation',
        })
    }
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: data.createdBy,
      action: 'user_created',
      details: {
        username: data.username,
        role: data.role,
        initial_balance: data.initialBalance,
      },
    })

  return {
    success: true,
    userId: authData.user.id,
  }
}

export async function updateUserStatus(
  userId: string,
  status: 'active' | 'suspended' | 'deleted',
  adminId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId)

  if (status === 'suspended') {
    await adminClient.auth.admin.signOut(
      userId,
      'global'
    ).catch(() => {})
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single()

  await supabase
    .from('notifications')
    .insert({
      to_user_id: userId,
      message:
        status === 'suspended'
          ? 'Your account has been suspended. Contact admin.'
          : status === 'active'
          ? 'Your account has been reactivated.'
          : 'Your account has been closed.',
      type: 'account_suspended',
      priority: 'urgent',
    })

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'user_status_changed',
      details: {
        target_user_id: userId,
        username: profile?.username,
        new_status: status,
      },
    })

  return { success: true }
}

export async function addCreditsToUser(
  adminId: string,
  targetId: string,
  amount: number,
  note: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Validate admin balance <
  const { data: admin } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', adminId)
    .single()

  if (!admin || admin.credit_balance < amount) {
    return {
      success: false,
      error: 'Insufficient admin balance',
    }
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('credit_balance, username')
    .eq('id', targetId)
    .single()

  if (!target) {
    return {
      success: false,
      error: 'Target user not found',
    }
  }

  // Deduct from admin atomically
  await supabase.rpc('increment_balance', { user_id: adminId, delta: -amount })
  // Add to target atomically
  await supabase.rpc('increment_balance', { user_id: targetId, delta: amount })

  await supabase
    .from('credit_assignments')
    .insert({
      from_user_id: adminId,
      to_user_id: targetId,
      amount,
      note,
    })

  await supabase
    .from('transactions')
    .insert({
      from_user_id: adminId,
      to_user_id: targetId,
      amount,
      type: 'credit_assign',
      note,
    })

  await supabase
    .from('notifications')
    .insert({
      to_user_id: targetId,
      message: `ETB ${amount.toLocaleString()} credited to your account${note ? `: ${note}` : ''}`,
      type: 'balance_updated',
    })

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'credits_assigned',
      details: {
        target: target.username,
        amount,
        note,
      },
    })

  return { success: true }
}

export async function forceLogout(
  userId: string,
  adminId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const adminClient = await createAdminClient()
  const supabase = await createClient()

  await adminClient.auth.admin.signOut(
    userId,
    'global'
  ).catch(() => {})

  await supabase
    .from('notifications')
    .insert({
      to_user_id: userId,
      message: 'Your session was ended by an administrator.',
      type: 'broadcast',
    })

  await supabase
    .from('activity_logs')
    .insert({
      user_id: adminId,
      action: 'force_logout',
      details: { target_user_id: userId },
    })

  return { success: true }
}

export async function sendBroadcast(data: {
  message: string
  priority: 'normal' | 'urgent'
  sendToBettors: boolean
  sendToAgents: boolean
  sendToCashiers: boolean
  sentBy: string
}): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Insert broadcast record
  await supabase
    .from('broadcast_messages')
    .insert({
      message: data.message,
      priority: data.priority,
      send_to_bettors: data.sendToBettors,
      send_to_cashiers: data.sendToCashiers,
      send_to_agents: data.sendToAgents,
      sent_by: data.sentBy,
    })

  // Build target roles
  const roles: string[] = []
  if (data.sendToBettors) roles.push('bettor')
  if (data.sendToAgents) roles.push('agent')
  if (data.sendToCashiers)
    roles.push('cashier')

  if (roles.length === 0) {
    return {
      success: false,
      error: 'No recipients selected',
    }
  }

  // Get all target users
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .in('role', roles)
    .eq('status', 'active')

  if (users && users.length > 0) {
    const notifications = users.map(
      (u) => ({
        to_user_id: u.id,
        from_user_id: data.sentBy,
        message: data.message,
        type: 'broadcast',
        priority: data.priority,
      })
    )

    // Insert in batches of 100
    for (
      let i = 0;
      i < notifications.length;
      i += 100
    ) {
      await supabase
        .from('notifications')
        .insert(notifications.slice(i, i + 100))
    }
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: data.sentBy,
      action: 'broadcast_sent',
      details: {
        roles,
        priority: data.priority,
        recipients: users?.length ?? 0,
      },
    })

  return { success: true }
}

export async function getActivityLogs(
  filters: {
    userId?: string
    role?: string
    actionType?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  } = {}
) {
  const supabase = await createClient()

  const {
    page = 1,
    limit = 50,
  } = filters
  const offset = (page - 1) * limit

  let query = supabase
    .from('activity_logs')
    .select(
      `
      *,
      profiles (username, role)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.userId) {
    query = query.eq(
      'user_id', filters.userId
    )
  }

  if (filters.actionType) {
    query = query.eq(
      'action', filters.actionType
    )
  }

  if (filters.startDate) {
    query = query.gte(
      'created_at', filters.startDate
    )
  }

  if (filters.endDate) {
    query = query.lte(
      'created_at', filters.endDate
    )
  }

  const { data, count } = await query

  return {
    logs: data ?? [],
    total: count ?? 0,
  }
}

export async function updatePlatformSettings(
  settings: Record<string, string>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient()
    const updates = Object.entries(settings).map(([key, value]) =>
      adminClient
        .from('platform_settings')
        .upsert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    )
    const results = await Promise.all(updates)
    const errors = results.filter((r: any) => r.error)
    if (errors.length > 0) {
      console.error('Settings update errors:', errors)
      return { success: false, error: 'Some settings failed to update' }
    }
    await adminClient.from('activity_logs').insert({
      user_id: updatedBy,
      action: 'settings_updated',
      details: { keys: Object.keys(settings) },
    })
    return { success: true }
  } catch (e: any) {
    console.error('updatePlatformSettings error:', e)
    return { success: false, error: e.message }
  }
}

export async function getAdminProfile() {
  const supabase = await createClient()

  const { data: { user } } =
    await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
export async function deleteUser(
  userId: string,
  deletedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Get user info first
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', userId)
    .single()

  if (!profile) return { success: false, error: 'User not found' }
  if (profile.role === 'admin') return { success: false, error: 'Cannot delete admin users' }

  // Delete related data
  await supabase.from('notifications').delete().eq('to_user_id', userId)
  await supabase.from('activity_logs').delete().eq('user_id', userId)
  await supabase.from('credit_assignments').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)

  // Delete profile
  await supabase.from('profiles').delete().eq('id', userId)

  // Delete auth user
  await adminClient.auth.admin.deleteUser(userId)

  // Log the deletion
  await supabase.from('activity_logs').insert({
    user_id: deletedBy,
    action: 'user_deleted',
    details: { deleted_user_id: userId, username: profile.username, role: profile.role },
  })

  return { success: true }
}

// ─── DIRECT MESSAGE ───────────────────
export async function sendDirectMessage(data: {
  usernames: string[]
  message: string
  priority: 'normal' | 'urgent'
  sentBy: string
}): Promise<{ success: boolean; sent: number; notFound: string[]; error?: string }> {
  const supabase = await createClient()
  const normalized = data.usernames.map(u => u.trim().replace(/^@/, '').toLowerCase()).filter(Boolean)
  if (!normalized.length) return { success: false, sent: 0, notFound: [], error: 'No usernames provided' }

  const { data: users } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', normalized)

  const foundUsernames = (users ?? []).map((u: any) => u.username.toLowerCase())
  const notFound = normalized.filter(u => !foundUsernames.includes(u))

  if (!users?.length) return { success: false, sent: 0, notFound, error: 'No users found' }

  const notifications = users.map((u: any) => ({
    to_user_id: u.id,
    from_user_id: data.sentBy,
    message: data.message,
    type: 'broadcast',
    priority: data.priority,
  }))

  for (let i = 0; i < notifications.length; i += 100) {
    await supabase.from('notifications').insert(notifications.slice(i, i + 100))
  }

  await supabase.from('activity_logs').insert({
    user_id: data.sentBy,
    action: 'direct_message_sent',
    details: { usernames: normalized, sent: users.length, notFound, priority: data.priority },
  })

  return { success: true, sent: users.length, notFound }
}

export async function changeUserPassword(
  userId: string,
  newPassword: string,
  changedBy: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = await createAdminClient()

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) return { success: false, error: error.message }

  await adminClient.from('activity_logs').insert({
    user_id: changedBy,
    action: 'password_changed',
    details: { target_user_id: userId },
  })

  return { success: true }
}

// ─── JACKPOT DASHBOARD STATS ─────────
export async function getJackpotDashboardStats(
  dateFilter: DateFilterInput = 'daily'
) {
  const supabase = await createClient()
  const { startDate, endDate } = resolveDateRange(dateFilter)

  let slipsQuery = supabase
    .from('jackpot_slips')
    .select('status, created_at')

  if (startDate) slipsQuery = slipsQuery.gte('created_at', startDate)
  if (endDate) slipsQuery = slipsQuery.lte('created_at', endDate)

  const { data: slips } = await slipsQuery

  const counts = {
    total: slips?.length ?? 0,
    won: 0,
    pending: 0,
    insured: 0,
    lost: 0,
  }

  ;(slips ?? []).forEach((s) => {
    if (s.status === 'won') counts.won++
    else if (s.status === 'pending') counts.pending++
    else if (s.status === 'near_win') counts.insured++
    else if (s.status === 'lost') counts.lost++
  })

  const { count: inProgress } = await supabase
    .from('jackpots')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'closed'])

  return {
    ...counts,
    inProgress: inProgress ?? 0,
  }
}

export async function resetUserBalance(targetUserId: string, adminId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ credit_balance: 0 })
    .eq('id', targetUserId)
  if (error) return { success: false, error: error.message }
  await supabase.from('activity_logs').insert({
    action: 'balance_reset',
    performed_by: adminId,
    target_user_id: targetUserId,
    metadata: { note: 'Balance reset to zero by admin' },
  })
  return { success: true }
}
