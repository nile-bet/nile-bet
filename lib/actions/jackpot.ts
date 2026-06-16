'use server'

import { createClient, createAdminClient }
  from '@/lib/supabase/server'



// ─── PUBLIC: Get active jackpot ───────

export async function getActiveJackpot() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('jackpots')
    .select(
      `
      *,
      jackpot_matches (*, leagues (name, countries (name, flag_emoji)))
    `
    )
    .in('status', ['open', 'closed'])
    .order('created_at', {
      ascending: false,
    })
    .limit(1)
    .single()

  return data ?? null
}

// ─── PUBLIC: Place jackpot bet ────────

export async function placeJackpotBet(data: {
  jackpotId: string
  bettorId: string
  placedById: string
  isAnonymous: boolean
  selections: {
    gameNumber: number
    selection: 'home' | 'draw' | 'away'
    odd: number
  }[]
}): Promise<{
  success: boolean
  slipId?: string
  error?: string
}> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Validate jackpot is open
  const { data: jackpot } = await adminClient
    .from('jackpots')
    .select('*')
    .eq('id', data.jackpotId)
    .single()

  if (!jackpot) {
    return {
      success: false,
      error: 'Jackpot not found',
    }
  }

  if (jackpot.status !== 'open') {
    return {
      success: false,
      error: 'Jackpot is not open for betting',
    }
  }

  if (
    new Date(jackpot.closes_at) < new Date()
  ) {
    return {
      success: false,
      error: 'Jackpot betting has closed',
    }
  }

  // Validate all 12 selections
  if (data.selections.length !== 12) {
    return {
      success: false,
      error: 'You must select all 12 games',
    }
  }

  const gameNumbers = data.selections.map(
    (s) => s.gameNumber
  )
  const uniqueGames = new Set(gameNumbers)
  if (uniqueGames.size !== 12) {
    return {
      success: false,
      error: 'Each game must have exactly one selection',
    }
  }

  // Validate balance
  const { data: bettor } = await adminClient
    .from('profiles')
    .select('credit_balance')
    .eq('id', data.bettorId)
    .single()

  if (!bettor) {
    return {
      success: false,
      error: 'Bettor not found',
    }
  }

  const stake = jackpot.fixed_stake ?? 50

  if (bettor.credit_balance < stake) {
    return {
      success: false,
      error: `Insufficient balance. Need ETB ${stake}`,
    }
  }

  // Generate slip ID (JP + 8 digits)
  const slipId =
    'JP' +
    Math.floor(
      10000000 +
        Math.random() * 90000000
    ).toString()

  // Deduct balance
  const { error: deductError } = await adminClient
    .from('profiles')
    .update({
      credit_balance: bettor.credit_balance - stake,
    })
    .eq('id', data.bettorId)

  if (deductError) {
    return { success: false, error: 'Failed to deduct balance' }
  }

  // Insert jackpot slip
  const { data: slip, error: slipError } = await adminClient
    .from('jackpot_slips')
    .insert({
      slip_id: slipId,
      jackpot_id: data.jackpotId,
      bettor_id: data.bettorId,
      placed_by: data.placedById,
      is_anonymous: data.isAnonymous,
      stake,
      status: 'pending',
    })
    .select('id')
    .single()

  if (slipError || !slip) {
    // Refund balance on failure
    await adminClient
      .from('profiles')
      .update({ credit_balance: bettor.credit_balance })
      .eq('id', data.bettorId)
    return {
      success: false,
      error: 'Failed to create slip: ' + (slipError?.message ?? 'unknown'),
    }
  }

  // Fetch jackpot_match IDs for foreign key
  const { data: matchRows } = await adminClient
    .from('jackpot_matches')
    .select('id, game_number')
    .eq('jackpot_id', data.jackpotId)

  const matchIdMap: Record<number, string> = {}
  matchRows?.forEach((m: any) => { matchIdMap[m.game_number] = m.id })

  // Insert selections
  const { error: selError } = await adminClient
    .from('jackpot_slip_selections')
    .insert(
      data.selections.map((sel) => ({
        jackpot_slip_id: slip.id,
        jackpot_match_id: matchIdMap[sel.gameNumber] ?? null,
        game_number: sel.gameNumber,
        selection: sel.selection,
        result: 'pending',
      }))
    )

  if (selError) {
    return {
      success: false,
      error: 'Slip created but selections failed: ' + selError.message,
    }
  }

  // Activity log
  await adminClient
    .from('activity_logs')
    .insert({
      user_id: data.placedById,
      action: 'jackpot_bet_placed',
      details: {
        jackpot_id: data.jackpotId,
        slip_id: slipId,
        stake,
        bettor_id: data.bettorId,
      },
    })

  return { success: true, slipId }
}

// ─── Get jackpot slip by ID ───────────

export async function getJackpotSlipById(
  slipId: string
) {
  const adminClient = await createAdminClient()

  const { data, error } = await adminClient
    .from('jackpot_slips')
    .select(
      `
      *,
      jackpots (
        name,
        status,
        fixed_stake,
        win_all_reward,
        near_win_reward,
        closes_at
      ),
      jackpot_slip_selections (
        *,
        jackpot_matches (
          game_number,
          home_team,
          away_team,
          kick_off_time,
          result,
          home_odd,
          draw_odd,
          away_odd
        )
      ),
      bettor:profiles!jackpot_slips_bettor_id_fkey (
        username
      )
    `
    )
    .eq('slip_id', slipId.toUpperCase())
    .single()

  if (error) console.error('getJackpotSlipById error:', error)
  return data ?? null
}

// ─── Get bettor's jackpot slips ───────

export async function getMyJackpotSlips(
  bettorId: string
) {
  const adminClient = await createAdminClient()

  const { data } = await adminClient
    .from('jackpot_slips')
    .select(
      `
      id,
      slip_id,
      status,
      stake,
      correct_count,
      reward_amount,
      is_anonymous,
      created_at,
      jackpots (id, name, status, fixed_stake, win_all_reward, near_win_reward),
      jackpot_slip_selections (
        id,
        game_number,
        selection,
        result,
        jackpot_matches (
          id,
          game_number,
          home_team,
          away_team,
          kick_off_time,
          result,
          home_odd,
          draw_odd,
          away_odd
        )
      )
    `
    )
    .eq('bettor_id', bettorId)
    .order('created_at', { ascending: false })
    .limit(50)

  return data ?? []
}

// ─── Get jackpot leaderboard ──────────

export async function getJackpotLeaderboard(
  jackpotId: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('jackpot_slips')
    .select(
      `
      slip_id,
      correct_count,
      status,
      reward_amount,
      is_anonymous,
      created_at,
      bettor:profiles!jackpot_slips_bettor_id_fkey (
        username
      )
    `
    )
    .eq('jackpot_id', jackpotId)
    .order('correct_count', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(50)

  return data ?? []
}

// ─── Get all jackpots (public) ────────

export async function getAllJackpotsPublic() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('jackpots')
    .select(
      `
      id,
      name,
      status,
      fixed_stake,
      win_all_reward,
      near_win_reward,
      opens_at,
      closes_at,
      created_at,
      jackpot_matches (
        id,
        game_number,
        home_team,
        away_team,
        kick_off_time,
        result,
        league_id,
        leagues (name, countries (name, flag_emoji))
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}