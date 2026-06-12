'use server'

import { createClient }
  from '@/lib/supabase/server'

// ─── PUBLIC: Get active jackpot ───────

export async function getActiveJackpot() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('jackpots')
    .select(
      `
      *,
      jackpot_matches (*)
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

  // Validate jackpot is open
  const { data: jackpot } = await supabase
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
  const { data: bettor } = await supabase
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
  await supabase
    .from('profiles')
    .update({
      credit_balance:
        bettor.credit_balance - stake,
    })
    .eq('id', data.bettorId)

  // Insert jackpot slip
  const { data: slip, error: slipError } =
    await supabase
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
    // Refund balance
    await supabase
      .from('profiles')
      .update({
        credit_balance:
          bettor.credit_balance,
      })
      .eq('id', data.bettorId)

    return {
      success: false,
      error: 'Failed to place jackpot bet',
    }
  }

  // Fetch jackpot_match IDs for foreign key
  const { data: matchRows } = await supabase
    .from('jackpot_matches')
    .select('id, game_number')
    .eq('jackpot_id', data.jackpotId)

  const matchIdMap: Record<number, string> = {}
  matchRows?.forEach((m: any) => { matchIdMap[m.game_number] = m.id })

  // Insert selections with jackpot_match_id
  await supabase
    .from('jackpot_slip_selections')
    .insert(
      data.selections.map((sel) => ({
        jackpot_slip_id: slip.id,
        jackpot_match_id: matchIdMap[sel.gameNumber] ?? null,
        game_number: sel.gameNumber,
        selection: sel.selection,
        odd: sel.odd,
        result: 'pending',
      }))
    )

  // Activity log
  await supabase
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
  const supabase = await createClient()

  const { data } = await supabase
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

  return data ?? null
}

// ─── Get bettor's jackpot slips ───────

export async function getMyJackpotSlips(
  bettorId: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('jackpot_slips')
    .select(
      `
      *,
      jackpots (name, status),
      jackpot_slip_selections (
        game_number,
        selection,
        odd,
        result,
        jackpot_matches (
          home_team,
          away_team,
          result
        )
      )
    `
    )
    .eq('bettor_id', bettorId)
    .order('created_at', {
      ascending: false,
    })
    .limit(20)

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
        result
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}