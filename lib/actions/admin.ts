'use server'

import { createClient }
  from '@/lib/supabase/server'
import { createAdminClient }
  from '@/lib/supabase/server'

// ─── STATS ───────────────────────────

export async function getPlatformStats(
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

  // Slips query
  let slipsQuery = supabase
    .from('slips')
    .select('stake, net_payout, winning_tax, status')

  if (startDate) {
    slipsQuery = slipsQuery.gte(
      'created_at', startDate
    )
  }

  const { data: slips } = await slipsQuery

  const totalRevenue = (slips ?? [])
    .filter((s) => s.status === 'won')
    .reduce(
      (a, s) => a + (s.winning_tax ?? 0), 0
    )

  const pendingPayouts = (slips ?? [])
    .filter((s) => s.status === 'pending')
    .reduce(
      (a, s) => a + (s.net_payout ?? 0), 0
    )

  const taxCollected = (slips ?? [])
    .filter((s) => s.status === 'won')
    .reduce(
      (a, s) => a + (s.winning_tax ?? 0), 0
    )

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

  return {
    totalRevenue,
    activeBettors: activeBettors ?? 0,
    totalSlipsToday: slips?.length ?? 0,
    pendingPayouts,
    totalCashiers: totalCashiers ?? 0,
    totalAgents: totalAgents ?? 0,
    taxCollected,
    platformBalance:
      admin?.credit_balance ?? 0,
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
    .select('stake, net_payout, winning_tax, status, created_at')
    .gte('created_at', start.toISOString())
    .in('status', ['won', 'lost', 'pending', 'near_win'])

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
    if (slip.status === 'won') {
      grouped[date].payouts +=
        slip.net_payout ?? 0
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

  return counts
}

export async function getAgentPerformance(
  dateFilter: string = 'daily'
) {
  const supabase = await createClient()

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

      const { data: agentSlips } =
        await supabase
          .from('slips')
          .select('stake, net_payout, status')
          .eq('placed_by', agent.id)

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

  // Deduct from admin
  await supabase
    .from('profiles')
    .update({
      credit_balance:
        admin.credit_balance - amount,
    })
    .eq('id', adminId)

  // Add to target
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
