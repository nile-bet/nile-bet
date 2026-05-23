'use server'

import { createClient } from '@/lib/supabase/server'

// =====================
// COUPONS
// =====================

export async function getAllCoupons({
  type,
  page = 1,
  limit = 20,
}: {
  type?: string
  page?: number
  limit?: number
} = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('coupons')
    .select(`
      *,
      profiles!coupons_bettor_id_fkey (username),
      redeemer:profiles!coupons_redeemed_by_fkey (username)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) return { coupons: [], total: 0 }
  return { coupons: data ?? [], total: count ?? 0 }
}

export async function getCouponStats() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('coupons')
    .select('status, amount, type')
  if (!data) return { total: 0, pending: 0, redeemed: 0, expired: 0, totalAmount: 0 }
  return {
    total: data.length,
    pending: data.filter(c => c.status === 'pending').length,
    redeemed: data.filter(c => c.status === 'redeemed').length,
    expired: data.filter(c => c.status === 'expired').length,
    totalAmount: data.reduce((sum, c) => sum + Number(c.amount), 0),
  }
}

export async function lookupCoupon(code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coupons')
    .select(`*, profiles!coupons_bettor_id_fkey (username)`)
    .eq('code', code)
    .maybeSingle()
  if (error || !data) return { success: false, error: 'Coupon not found' }
  return { success: true, coupon: data }
}

export async function approveTopupByAdmin(couponId: string, adminId?: string) {
  const supabase = await createClient()
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .single()
  if (!coupon || coupon.status !== 'pending') return { success: false, error: 'Invalid coupon' }

  await supabase.from('profiles').update({
    credit_balance: supabase.rpc('increment', { x: coupon.amount })
  }).eq('id', coupon.bettor_id)

  await supabase.from('coupons').update({
    status: 'redeemed',
    updated_at: new Date().toISOString()
  }).eq('id', couponId)

  return { success: true }
}

export async function approveWithdrawalByAdmin(couponId: string, adminId?: string) {
  const supabase = await createClient()
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .single()
  if (!coupon || coupon.status !== 'pending') return { success: false, error: 'Invalid coupon' }

  await supabase.from('coupons').update({
    status: 'redeemed',
    updated_at: new Date().toISOString()
  }).eq('id', couponId)

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
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, error, count } = await supabase
    .from('credit_requests')
    .select(`
      *,
      requester:profiles!credit_requests_requester_id_fkey (username, role),
      target:profiles!credit_requests_to_user_id_fkey (username, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) return { requests: [], total: 0 }
  return { requests: data ?? [], total: count ?? 0 }
}

export async function approveCreditRequest(requestId: string, adminId?: string) {
  const supabase = await createClient()
  const { data: req } = await supabase
    .from('credit_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (!req || req.status !== 'pending') return { success: false, error: 'Invalid request' }

  await supabase.from('credit_requests').update({
    status: 'approved',
    updated_at: new Date().toISOString()
  }).eq('id', requestId)

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
  let query = supabase
    .from('transactions')
    .select('from_user_id, to_user_id, amount, type, created_at')
    .in('type', ['bet_placed', 'payout', 'refund'])
    .order('created_at', { ascending: false })
    .limit(500)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)
  const { data } = await query
  return data ?? []
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

  if (role === 'cashiers') {
    // Group by placed_by (cashier username)
    const map: Record<string, any> = {}
    for (const slip of slips) {
      const key = slip.placed_by ?? 'unknown'
      if (!map[key]) {
        map[key] = { username: key, slipCount: 0, totalStaked: 0, totalPaid: 0, netProfit: 0 }
      }
      map[key].slipCount += 1
      map[key].totalStaked += slip.stake ?? 0
      if (slip.status === 'won') {
        map[key].totalPaid += slip.net_payout ?? 0
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
        map[username] = { username, slipCount: 0, totalStaked: 0, wonBets: 0, lostBets: 0, winRate: 0 }
      }
      map[username].slipCount += 1
      map[username].totalStaked += slip.stake ?? 0
      if (slip.status === 'won') map[username].wonBets += 1
      if (slip.status === 'lost') map[username].lostBets += 1
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
    .from('transactions')
    .select('amount, type, created_at')
    .in('type', ['tax', 'bet_placed', 'payout', 'insurance'])
    .order('created_at', { ascending: false })
    .limit(500)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)
  const { data } = await query
  return data ?? []
}

export async function getTaxReport(filters?: DateFilters) {
  const supabase = await createClient()
  let query = supabase
    .from('slips')
    .select('winning_tax, net_payout, status, created_at')
    .eq('status', 'won')
    .order('created_at', { ascending: false })
    .limit(500)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)
  const { data } = await query
  return data ?? []
}
