'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

// =====================
// COUPONS
// =====================

export async function getAllCoupons({
  type,
  page = 1,
  limit = 20,
  status,
  username,
}: {
  type?: string
  page?: number
  limit?: number
  status?: string
  username?: string
} = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('coupons')
    .select(`
      *,
      bettor:profiles!coupons_bettor_id_fkey (username),
      redeemer:profiles!coupons_redeemed_by_fkey (username)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) return { coupons: [], total: 0 }

  // Filter by username client-side (Supabase doesn't support filtering on joined columns directly)
  let filtered = data ?? []
  if (username) {
    const lower = username.toLowerCase()
    filtered = filtered.filter((c: any) =>
      c.bettor?.username?.toLowerCase().includes(lower)
    )
  }

  return { coupons: filtered, total: username ? filtered.length : (count ?? 0) }
}

export async function getCouponStats() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('coupons')
    .select('status, amount, type, updated_at')
  if (!data) return {
    activeTopups: 0, activeTopupAmount: 0,
    activeWithdrawals: 0, activeWithdrawalAmount: 0,
    redeemedToday: 0, redeemedTodayAmount: 0,
    expiredToday: 0,
  }
  const today = new Date().toISOString().slice(0, 10)
  const activeTopups = data.filter(c => c.status === 'pending' && c.type === 'topup')
  const activeWithdrawals = data.filter(c => c.status === 'pending' && c.type === 'withdrawal')
  const redeemedToday = data.filter(c => c.status === 'redeemed' && (c.updated_at ?? '').slice(0, 10) === today)
  const expiredToday = data.filter(c => c.status === 'expired' && (c.updated_at ?? '').slice(0, 10) === today)
  return {
    activeTopups: activeTopups.length,
    activeTopupAmount: activeTopups.reduce((s, c) => s + Number(c.amount), 0),
    activeWithdrawals: activeWithdrawals.length,
    activeWithdrawalAmount: activeWithdrawals.reduce((s, c) => s + Number(c.amount), 0),
    redeemedToday: redeemedToday.length,
    redeemedTodayAmount: redeemedToday.reduce((s, c) => s + Number(c.amount), 0),
    expiredToday: expiredToday.length,
  }
}

export async function lookupCoupon(code: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('coupons')
    .select(`*, bettor:profiles!coupons_bettor_id_fkey (username)`)
    .eq('code', code.trim())
    .maybeSingle()
  if (error) return { success: false, error: 'DB error: ' + error.message }
  if (!data) return { success: false, error: 'Coupon not found' }
  if (data.status !== 'pending') return { success: false, error: 'Coupon already ' + data.status }
  return { success: true, coupon: data }
}

export async function approveTopupByAdmin(couponId: string, adminId?: string) {
  const adminClient = await createAdminClient()
  const { data: coupon, error } = await adminClient
    .from('coupons').select('*')
    .eq('code', couponId.trim())
    .maybeSingle()
  if (error) return { success: false, error: 'DB error: ' + error.message }
  if (!coupon) return { success: false, error: 'Coupon not found' }
  if (coupon.status !== 'pending') return { success: false, error: 'Coupon already ' + coupon.status }

  const { data: bettor } = await adminClient
    .from('profiles').select('credit_balance').eq('id', coupon.bettor_id).single()
  if (!bettor) return { success: false, error: 'Bettor not found' }

  const { error: balErr } = await adminClient
    .from('profiles')
    .update({ credit_balance: (bettor.credit_balance ?? 0) + Number(coupon.amount) })
    .eq('id', coupon.bettor_id)
  if (balErr) return { success: false, error: 'Failed to update balance: ' + balErr.message }

  await adminClient.from('coupons').update({
    status: 'redeemed', redeemed_by: adminId ?? null, updated_at: new Date().toISOString()
  }).eq('id', coupon.id)

  await adminClient.from('notifications').insert({
    to_user_id: coupon.bettor_id, from_user_id: adminId ?? null,
    message: 'Your top-up of ETB ' + Number(coupon.amount).toLocaleString() + ' has been credited!',
    type: 'balance_updated', priority: 'normal',
  })

  return { success: true }
}

export async function approveWithdrawalByAdmin(couponId: string, adminId?: string) {
  const adminClient = await createAdminClient()
  const { data: coupon, error } = await adminClient
    .from('coupons').select('*')
    .eq('code', couponId.trim())
    .maybeSingle()
  if (error) return { success: false, error: 'DB error: ' + error.message }
  if (!coupon) return { success: false, error: 'Coupon not found' }
  if (coupon.status !== 'pending') return { success: false, error: 'Coupon already ' + coupon.status }

  const { data: bettor } = await adminClient
    .from('profiles').select('credit_balance, reserved_balance').eq('id', coupon.bettor_id).single()
  if (!bettor) return { success: false, error: 'Bettor not found' }

  const { error: balErr } = await adminClient
    .from('profiles')
    .update({
      reserved_balance: Math.max(0, (bettor.reserved_balance ?? 0) - Number(coupon.amount)),
    })
    .eq('id', coupon.bettor_id)
  if (balErr) return { success: false, error: 'Failed to update balance: ' + balErr.message }

  await adminClient.from('coupons').update({
    status: 'redeemed', redeemed_by: adminId ?? null, updated_at: new Date().toISOString()
  }).eq('id', coupon.id)

  await adminClient.from('notifications').insert({
    to_user_id: coupon.bettor_id, from_user_id: adminId ?? null,
    message: 'Your withdrawal of ETB ' + Number(coupon.amount).toLocaleString() + ' has been processed!',
    type: 'balance_updated', priority: 'normal',
  })

  return { success: true }
}

export async function forceExpireCoupon(couponId: string, adminId?: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('coupons')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', couponId)
  return { success: !error }
}

// =====================
// CREDIT REQUESTS
// =====================

export async function getCreditRequests({
  limit = 100,
  page = 1,
}: { limit?: number; page?: number } = {}) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Get admin's own ID to filter only requests sent to admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { requests: [], total: 0 }

  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, error, count } = await adminClient
    .from('credit_requests')
    .select(`
      *,
      requester:profiles!credit_requests_requester_id_fkey (username, role),
      target:profiles!credit_requests_to_user_id_fkey (username, role)
    `, { count: 'exact' })
    .eq('to_user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) return { requests: [], total: 0 }
  return { requests: data ?? [], total: count ?? 0 }
}

export async function approveCreditRequest(requestId: string, adminId?: string) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: req } = await supabase
    .from('credit_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (!req || req.status !== 'pending') return { success: false, error: 'Invalid request' }

  // Get current balance of requester
  const { data: profile } = await adminClient
    .from('profiles')
    .select('credit_balance, username')
    .eq('id', req.requester_id)
    .single()
  if (!profile) return { success: false, error: 'User not found' }

  const newBalance = (profile.credit_balance ?? 0) + Number(req.amount)

  // Add credits to requester balance using admin client to bypass RLS
  const { error: balanceError } = await adminClient
    .from('profiles')
    .update({ credit_balance: newBalance })
    .eq('id', req.requester_id)
  if (balanceError) return { success: false, error: 'Failed to update balance: ' + balanceError.message }

  // Mark request approved
  await adminClient.from('credit_requests').update({
    status: 'approved',
    updated_at: new Date().toISOString()
  }).eq('id', requestId)

  // Log transaction
  await adminClient.from('transactions').insert({
    from_user_id: adminId ?? req.to_user_id,
    to_user_id: req.requester_id,
    amount: req.amount,
    type: 'credit_assigned',
    note: 'Credit request approved' + (req.note ? ': ' + req.note : ''),
  })

  // Notify requester
  await adminClient.from('notifications').insert({
    to_user_id: req.requester_id,
    from_user_id: adminId ?? req.to_user_id,
    message: 'Your credit request of ETB ' + Number(req.amount).toLocaleString() + ' has been approved!',
    type: 'balance_updated',
    priority: 'normal',
  })

  return { success: true }
}

export async function declineCreditRequest(requestId: string, note?: string, adminId?: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('credit_requests')
    .update({
      status: 'declined',
      admin_note: note ?? '',
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
  return { success: !error }
}

// =====================
// REPORTS
// =====================

interface DateFilters {
  startDate?: string
  endDate?: string
}

export async function getAgentProfitReport(filters?: DateFilters) {
  const supabase = await createClient()

  // Step 1: Get all agents
  const { data: agents } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('role', 'agent')

  if (!agents || agents.length === 0) return []

  // Step 2: For each agent, get their cashiers
  const agentIds = agents.map((a) => a.id)
  const { data: cashiers } = await supabase
    .from('profiles')
    .select('id, created_by')
    .eq('role', 'cashier')
    .in('created_by', agentIds)

  const cashiers_ = cashiers ?? []

  // Build cashier -> agent map
  const cashierToAgent: Record<string, string> = {}
  for (const c of cashiers_) {
    cashierToAgent[c.id] = c.created_by
  }

  const agentMap: Record<string, string> = {}
  for (const a of agents) {
    agentMap[a.id] = a.username
  }

  // Step 3: Fetch slips placed by any of those cashiers
  const cashierIds = cashiers_.map((c) => c.id)
  if (cashierIds.length === 0) return []

  let query = supabase
    .from('slips')
    .select('stake, net_payout, winning_tax, status, placed_by, created_at')
    .in('placed_by', cashierIds)
    .order('created_at', { ascending: false })
    .limit(5000)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)
  const { data } = await query
  const slips = data ?? []

  let jpQuery = supabase
    .from('jackpot_slips')
    .select('stake, reward_amount, status, placed_by, created_at')
    .in('placed_by', cashierIds)
    .order('created_at', { ascending: false })
    .limit(5000)
  if (filters?.startDate) jpQuery = jpQuery.gte('created_at', filters.startDate)
  if (filters?.endDate) jpQuery = jpQuery.lte('created_at', filters.endDate)
  const { data: jpData } = await jpQuery
  const jackpotSlips = jpData ?? []

  // Step 4: Group by agent
  const map: Record<string, any> = {}
  for (const slip of slips) {
    const agentId = cashierToAgent[slip.placed_by ?? '']
    if (!agentId) continue
    const username = agentMap[agentId] ?? 'unknown'
    if (!map[agentId]) {
      map[agentId] = { username, totalCollected: 0, totalPaidOut: 0, grossProfit: 0, taxCollected: 0, agentShare: 0, cashierShare: 0 }
    }
    map[agentId].totalCollected += slip.stake ?? 0
    if (slip.status === 'won') {
      map[agentId].totalPaidOut += slip.net_payout ?? 0
      map[agentId].taxCollected += slip.winning_tax ?? 0
    }
  }

  for (const slip of jackpotSlips) {
    const agentId = cashierToAgent[slip.placed_by ?? '']
    if (!agentId) continue
    const username = agentMap[agentId] ?? 'unknown'
    if (!map[agentId]) {
      map[agentId] = { username, totalCollected: 0, totalPaidOut: 0, grossProfit: 0, taxCollected: 0, agentShare: 0, cashierShare: 0 }
    }
    map[agentId].totalCollected += slip.stake ?? 0
    if (slip.status === 'won' || slip.status === 'near_win') {
      const tax = (slip.reward_amount ?? 0) * 0.15
      map[agentId].totalPaidOut += (slip.reward_amount ?? 0) - tax
      map[agentId].taxCollected += tax
    }
  }

  return Object.values(map).map((r: any) => {
    r.grossProfit = r.totalCollected - r.totalPaidOut - r.taxCollected
    r.agentShare = r.grossProfit * 0.6
    r.cashierShare = r.grossProfit * 0.4
    return r
  }).sort((a: any, b: any) => b.grossProfit - a.grossProfit)
}

export async function getTopUsersReport(role?: string, filters?: DateFilters) {
  const supabase = await createClient()

  let query = supabase
    .from('slips')
    .select('bettor_id, placed_by, stake, net_payout, status, created_at, profiles!slips_bettor_id_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)

  const { data } = await query
  const slips = data ?? []

  let jpQuery = supabase
    .from('jackpot_slips')
    .select('bettor_id, placed_by, stake, reward_amount, status, created_at, profiles!jackpot_slips_bettor_id_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (filters?.startDate) jpQuery = jpQuery.gte('created_at', filters.startDate)
  if (filters?.endDate) jpQuery = jpQuery.lte('created_at', filters.endDate)
  const { data: jpData } = await jpQuery
  const jackpotSlips = jpData ?? []

  if (role === 'cashiers') {
    // Resolve placed_by ids -> usernames
    const placedByIds = Array.from(new Set([
      ...slips.map((s) => s.placed_by).filter(Boolean),
      ...jackpotSlips.map((s) => s.placed_by).filter(Boolean),
    ])) as string[]

    const usernameMap: Record<string, string> = {}
    if (placedByIds.length > 0) {
      const { data: placerProfiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', placedByIds)
      ;(placerProfiles ?? []).forEach((p: any) => {
        usernameMap[p.id] = p.username
      })
    }

    // Group by placed_by (cashier username)
    const map: Record<string, any> = {}
    for (const slip of slips) {
      const key = slip.placed_by ?? 'unknown'
      const username = usernameMap[key] ?? key
      if (!map[key]) {
        map[key] = { username, slipCount: 0, jackpotSlipCount: 0, totalStaked: 0, totalPaid: 0, netProfit: 0 }
      }
      map[key].slipCount += 1
      map[key].totalStaked += slip.stake ?? 0
      if (slip.status === 'won') {
        map[key].totalPaid += slip.net_payout ?? 0
      }
    }
    for (const slip of jackpotSlips) {
      const key = slip.placed_by ?? 'unknown'
      const username = usernameMap[key] ?? key
      if (!map[key]) {
        map[key] = { username, slipCount: 0, jackpotSlipCount: 0, totalStaked: 0, totalPaid: 0, netProfit: 0 }
      }
      map[key].slipCount += 1
      map[key].jackpotSlipCount += 1
      map[key].totalStaked += slip.stake ?? 0
      if (slip.status === 'won' || slip.status === 'near_win') {
        map[key].totalPaid += (slip.reward_amount ?? 0) * 0.85
      }
    }
    return Object.values(map)
      .map((r) => ({ ...r, netProfit: r.totalStaked - r.totalPaid }))
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 20)
  } else {
    // Group by bettor username
    const map: Record<string, any> = {}
    for (const slip of slips) {
      const username = (slip.profiles as any)?.username ?? slip.bettor_id ?? 'unknown'
      if (!map[username]) {
        map[username] = { username, slipCount: 0, totalStaked: 0, wonBets: 0, lostBets: 0, jackpotWon: 0, jackpotLost: 0, winRate: 0 }
      }
      map[username].slipCount += 1
      map[username].totalStaked += slip.stake ?? 0
      if (slip.status === 'won') map[username].wonBets += 1
      if (slip.status === 'lost') map[username].lostBets += 1
    }
    for (const slip of jackpotSlips) {
      const username = (slip.profiles as any)?.username ?? slip.bettor_id ?? 'unknown'
      if (!map[username]) {
        map[username] = { username, slipCount: 0, totalStaked: 0, wonBets: 0, lostBets: 0, jackpotWon: 0, jackpotLost: 0, winRate: 0 }
      }
      map[username].slipCount += 1
      map[username].totalStaked += slip.stake ?? 0
      if (slip.status === 'won' || slip.status === 'near_win') {
        map[username].wonBets += 1
        map[username].jackpotWon += 1
      }
      if (slip.status === 'lost') {
        map[username].lostBets += 1
        map[username].jackpotLost += 1
      }
    }
    return Object.values(map)
      .map((r) => ({
        ...r,
        winRate: r.slipCount > 0 ? (r.wonBets / r.slipCount) * 100 : 0,
      }))
      .sort((a, b) => b.totalStaked - a.totalStaked)
      .slice(0, 20)
  }
}

export async function getPlatformProfitReport(granularity?: string, filters?: DateFilters) {
  const supabase = await createClient()
  let query = supabase
    .from('slips')
    .select('stake, net_payout, winning_tax, status, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)
  const { data } = await query
  const slips = data ?? []

  let jpQuery = supabase
    .from('jackpot_slips')
    .select('stake, reward_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (filters?.startDate) jpQuery = jpQuery.gte('created_at', filters.startDate)
  if (filters?.endDate) jpQuery = jpQuery.lte('created_at', filters.endDate)
  const { data: jpData } = await jpQuery
  const jackpotSlips = jpData ?? []

  const periodOf = (createdAt: string) => {
    const d = new Date(createdAt)
    if (granularity === 'weekly') {
      const week = Math.ceil(d.getDate() / 7)
      return `${d.getFullYear()}-W${String(d.getMonth() + 1).padStart(2,'0')}-${week}`
    } else if (granularity === 'monthly') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    return createdAt.slice(0, 10)
  }

  // Group by period
  const map: Record<string, any> = {}
  for (const slip of slips) {
    const period = periodOf(slip.created_at)
    if (!map[period]) {
      map[period] = { period, slipCount: 0, totalStaked: 0, totalPaidOut: 0, grossProfit: 0, taxCollected: 0 }
    }
    map[period].slipCount += 1
    map[period].totalStaked += slip.stake ?? 0
    if (slip.status === 'won') {
      map[period].totalPaidOut += slip.net_payout ?? 0
      map[period].taxCollected += slip.winning_tax ?? 0
    }
  }

  for (const slip of jackpotSlips) {
    const period = periodOf(slip.created_at)
    if (!map[period]) {
      map[period] = { period, slipCount: 0, totalStaked: 0, totalPaidOut: 0, grossProfit: 0, taxCollected: 0 }
    }
    map[period].slipCount += 1
    map[period].totalStaked += slip.stake ?? 0
    if (slip.status === 'won' || slip.status === 'near_win') {
      const tax = (slip.reward_amount ?? 0) * 0.15
      map[period].totalPaidOut += (slip.reward_amount ?? 0) - tax
      map[period].taxCollected += tax
    }
  }

  return Object.values(map).map((r) => {
    r.grossProfit = r.totalStaked - r.totalPaidOut - r.taxCollected
    return r
  }).sort((a: any, b: any) => a.period.localeCompare(b.period))
}

export async function getTaxReport(filters?: DateFilters) {
  const supabase = await createClient()
  let query = supabase
    .from('slips')
    .select('winning_tax, net_payout, stake, status, created_at')
    .eq('status', 'won')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)
  const { data } = await query
  const slips = data ?? []

  let jpQuery = supabase
    .from('jackpot_slips')
    .select('reward_amount, status, created_at')
    .in('status', ['won', 'near_win'])
    .order('created_at', { ascending: false })
    .limit(2000)
  if (filters?.startDate) jpQuery = jpQuery.gte('created_at', filters.startDate)
  if (filters?.endDate) jpQuery = jpQuery.lte('created_at', filters.endDate)
  const { data: jpData } = await jpQuery
  const jackpotSlips = jpData ?? []

  // Group by date
  const map: Record<string, any> = {}
  for (const slip of slips) {
    const date = slip.created_at.slice(0, 10)
    if (!map[date]) {
      map[date] = { date, winningSlips: 0, grossPayout: 0, taxAmount: 0, netPaidOut: 0 }
    }
    map[date].winningSlips += 1
    map[date].grossPayout += (slip.net_payout ?? 0) + (slip.winning_tax ?? 0)
    map[date].taxAmount += slip.winning_tax ?? 0
    map[date].netPaidOut += slip.net_payout ?? 0
  }

  for (const slip of jackpotSlips) {
    const date = slip.created_at.slice(0, 10)
    if (!map[date]) {
      map[date] = { date, winningSlips: 0, grossPayout: 0, taxAmount: 0, netPaidOut: 0 }
    }
    const gross = slip.reward_amount ?? 0
    const tax = gross * 0.15
    map[date].winningSlips += 1
    map[date].grossPayout += gross
    map[date].taxAmount += tax
    map[date].netPaidOut += gross - tax
  }

  return Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date))
}

// ─── COUPON HISTORY BY USER ───────────
export async function getCouponHistoryByUser(
  userId: string,
  filters: { page?: number; limit?: number; type?: string; status?: string } = {}
) {
  const supabase = await createClient()
  const { page = 1, limit = 20, type, status } = filters
  const offset = (page - 1) * limit

  let q = supabase
    .from('coupons')
    .select(`
      *,
      bettor:profiles!coupons_bettor_id_fkey (username),
      redeemer:profiles!coupons_redeemed_by_fkey (username)
    `, { count: 'exact' })
    .eq('redeemed_by', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type && type !== 'all') q = q.eq('type', type)
  if (status && status !== 'all') q = q.eq('status', status)

  const { data, count } = await q
  return { coupons: data ?? [], total: count ?? 0 }
}

// ─── JACKPOT PROFIT REPORT ────────────
export async function getJackpotProfitReport(filters?: DateFilters) {
  const supabase = await createClient()

  let query = supabase
    .from('jackpot_slips')
    .select('slip_id, stake, reward_amount, status, jackpot_id, created_at, jackpots(name)')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)
  const { data } = await query
  const slips = data ?? []

  const map: Record<string, any> = {}
  for (const slip of slips) {
    const date = slip.created_at.slice(0, 10)
    if (!map[date]) {
      map[date] = {
        date,
        totalSlips: 0,
        totalCollected: 0,
        won: 0,
        nearWin: 0,
        lost: 0,
        pending: 0,
        grossPayout: 0,
        taxCollected: 0,
        netPaidOut: 0,
        grossProfit: 0,
      }
    }
    map[date].totalSlips += 1
    map[date].totalCollected += slip.stake ?? 0

    if (slip.status === 'won') map[date].won += 1
    else if (slip.status === 'near_win') map[date].nearWin += 1
    else if (slip.status === 'lost') map[date].lost += 1
    else if (slip.status === 'pending') map[date].pending += 1

    if (slip.status === 'won' || slip.status === 'near_win') {
      const gross = slip.reward_amount ?? 0
      const tax = gross * 0.15
      map[date].grossPayout += gross
      map[date].taxCollected += tax
      map[date].netPaidOut += gross - tax
    }
  }

  return Object.values(map).map((r: any) => {
    r.grossProfit = r.totalCollected - r.netPaidOut - r.taxCollected
    return r
  }).sort((a: any, b: any) => a.date.localeCompare(b.date))
}
