'use server'

import { createClient }
  from '@/lib/supabase/server'
import type {
  BetSlipSelection,
  SlipWithSelections,
} from '@/types/database.types'

export async function placeBet(input: {
  selections: BetSlipSelection[]
  stake: number
  bettorId: string
  placedById: string
  isAnonymous: boolean
  copiedFromSlipId?: string
}): Promise<{
  success: boolean
  slipId?: string
  error?: string
}> {
  const supabase = await createClient()

  const {
    selections,
    stake,
    bettorId,
    placedById,
    isAnonymous,
    copiedFromSlipId,
  } = input

  // Get settings
  const { data: settingsRows } =
    await supabase
      .from('platform_settings')
      .select('key, value')

  const get = (k: string, def = '0') =>
    settingsRows?.find(
      (r: any) => r.key === k
    )?.value ?? def

  const minSelections = parseInt(
    get('min_selections', '4')
  )
  const minStake = parseFloat(
    get('min_stake', '10')
  )
  const maxStake = parseFloat(
    get('max_stake_per_slip', '50000')
  )
  const maxOdd = parseFloat(
    get('max_odd_per_selection', '50')
  )
  const maxTotalOdds = parseFloat(
    get('max_total_odds', '5000')
  )
  const maxPayout = parseFloat(
    get('max_payout', '500000')
  )
  const cancelMins = parseInt(
    get('cancellation_window_mins', '5')
  )

  // Validate
  if (selections.length < minSelections) {
    return {
      success: false,
      error: `Minimum ${minSelections} selections required`,
    }
  }

  if (stake < minStake) {
    return {
      success: false,
      error: `Minimum stake is ETB ${minStake}`,
    }
  }

  if (stake > maxStake) {
    return {
      success: false,
      error: `Maximum stake is ETB ${maxStake.toLocaleString()}`,
    }
  }

  const highOdd = selections.find(
    (s) => s.odd > maxOdd
  )
  if (highOdd) {
    return {
      success: false,
      error: `Maximum odd per selection is ${maxOdd}`,
    }
  }

  const totalOdds = selections.reduce(
    (acc, s) => acc * s.odd,
    1
  )

  if (totalOdds > maxTotalOdds) {
    return {
      success: false,
      error: `Total odds exceed maximum (${maxTotalOdds.toLocaleString()})`,
    }
  }

  // Check all matches upcoming
  const matchIds = [
    ...new Set(selections.map((s) => s.matchId)),
  ]
  const { data: matchCheck } = await supabase
    .from('matches')
    .select('id, status, home_team, away_team')
    .in('id', matchIds)

  const closedMatch = matchCheck?.find(
    (m: any) => m.status !== 'upcoming'
  )
  if (closedMatch) {
    return {
      success: false,
      error: `${closedMatch.home_team} vs ${closedMatch.away_team} has already started`,
    }
  }

  // Check placer balance
  const { data: placer } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', placedById)
    .single()

  if (
    !placer ||
    placer.credit_balance < stake
  ) {
    return {
      success: false,
      error: 'Insufficient balance',
    }
  }

  // Calculate
  const maxPayoutCalc = stake * totalOdds
  const winningTax = maxPayoutCalc * 0.15
  const netPayout = maxPayoutCalc - winningTax

  if (netPayout > maxPayout) {
    return {
      success: false,
      error: `Net payout exceeds maximum (ETB ${maxPayout.toLocaleString()})`,
    }
  }

  // Generate slip ID
  const { data: slipIdData } = await supabase
    .rpc('generate_slip_id')

  const slipId = slipIdData as string

  // Cancellation deadline
  const cancelDeadline = new Date()
  cancelDeadline.setMinutes(
    cancelDeadline.getMinutes() + cancelMins
  )

  // Insert slip
  const { data: slip, error: slipError } =
    await supabase
      .from('slips')
      .insert({
        slip_id: slipId,
        bettor_id: bettorId,
        placed_by: placedById,
        copied_from_slip_id:
          copiedFromSlipId ?? null,
        stake,
        total_odds: parseFloat(
          totalOdds.toFixed(2)
        ),
        max_payout: parseFloat(
          maxPayoutCalc.toFixed(2)
        ),
        winning_tax: parseFloat(
          winningTax.toFixed(2)
        ),
        net_payout: parseFloat(
          netPayout.toFixed(2)
        ),
        status: 'pending',
        is_anonymous: isAnonymous,
        cancellation_deadline:
          cancelDeadline.toISOString(),
      })
      .select('id')
      .single()

  if (slipError || !slip) {
    return {
      success: false,
      error: 'Failed to create slip',
    }
  }

  // Insert selections
  const selectionRows = selections.map(
    (s) => ({
      slip_id: slip.id,
      match_id: s.matchId,
      match_market_id: s.matchMarketId,
      selection: s.selection,
      odd_at_placement: s.odd,
      result: 'pending',
    })
  )

  const { error: selError } = await supabase
    .from('slip_selections')
    .insert(selectionRows)

  if (selError) {
    await supabase
      .from('slips')
      .delete()
      .eq('id', slip.id)
    return {
      success: false,
      error: 'Failed to save selections',
    }
  }

  // Deduct balance from placer
  await supabase
    .from('profiles')
    .update({
      credit_balance:
        placer.credit_balance - stake,
    })
    .eq('id', placedById)

  // Log transaction
  await supabase.from('transactions').insert({
    from_user_id: placedById,
    to_user_id: null,
    amount: stake,
    type: 'bet_placed',
    reference_id: slip.id,
    note: `Bet placed: ${slipId}`,
  })

  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: placedById,
    action: 'bet_placed',
    details: {
      slip_id: slipId,
      stake,
      selections: selections.length,
      total_odds: totalOdds,
    },
  })

  return { success: true, slipId }
}

export async function cancelBet(
  slipId: string,
  userId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: slip } = await supabase
    .from('slips')
    .select('*')
    .eq('slip_id', slipId)
    .single()

  if (!slip) {
    return {
      success: false,
      error: 'Slip not found',
    }
  }

  if (slip.status !== 'pending') {
    return {
      success: false,
      error: 'Only pending bets can be cancelled',
    }
  }

  if (
    slip.bettor_id !== userId &&
    slip.placed_by !== userId
  ) {
    return {
      success: false,
      error: 'Unauthorized',
    }
  }

  if (slip.cancellation_deadline) {
    const deadline = new Date(
      slip.cancellation_deadline
    )
    if (deadline < new Date()) {
      return {
        success: false,
        error: 'Cancellation window has expired',
      }
    }
  }

  // Cancel the slip
  await supabase
    .from('slips')
    .update({ status: 'cancelled' })
    .eq('id', slip.id)

  // Refund stake
  try {
    await supabase.rpc(
      'refund_stake_to_placer',
      {
        p_placed_by: slip.placed_by,
        p_stake: slip.stake,
      }
    )
  } catch {
    // Fallback manual refund
    const { data } = await supabase
      .from('profiles')
      .select('credit_balance')
      .eq('id', slip.placed_by)
      .single()
    if (data) {
      await supabase
        .from('profiles')
        .update({
          credit_balance:
            data.credit_balance +
            slip.stake,
        })
        .eq('id', slip.placed_by)
    }



  // Refund bettor if different from placer
  if (
    slip.bettor_id &&
    slip.bettor_id !== slip.placed_by
  ) {
    // Notification to bettor
    await supabase
      .from('notifications')
      .insert({
        to_user_id: slip.bettor_id,
        message: `Your bet #${slipId} was cancelled. ETB ${slip.stake} refunded.`,
        type: 'slip_cancelled',
      })
  }

  await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      action: 'bet_cancelled',
      details: {
        slip_id: slipId,
        stake: slip.stake,
      },
    })

  return { success: true }
}

export async function getSlipById(
  slipId: string
): Promise<SlipWithSelections | null> {
  const supabase = await createClient()

  // Check if jackpot slip
  if (slipId.startsWith('JP')) {
    const { data } = await supabase
      .from('jackpot_slips')
      .select(`
        *,
        jackpot_slip_selections (
          *,
          jackpot_matches (*)
        )
      `)
      .eq('slip_id', slipId)
      .single()

    if (!data) return null
    return data as any
  }

  const { data, error } = await supabase
    .from('slips')
    .select(`
      *,
      slip_selections (
        *,
        matches (
          home_team,
          away_team,
          status,
          kick_off_time
        ),
        match_markets (
          market_templates (
            name,
            market_categories (name)
          )
        )
      )
    `)
    .eq('slip_id', slipId)
    .single()

  if (error || !data) return null
  return data as unknown as SlipWithSelections
}

export async function copySlip(
  slipId: string
): Promise<{
  success: boolean
  data?: {
    selections: (BetSlipSelection & {
      currentOdd: number
      originalOdd: number
      oddChanged: boolean
      matchStarted: boolean
    })[]
    originalSlipId: string
  }
  error?: string
}> {
  const supabase = await createClient()

  const { data: slip } = await supabase
    .from('slips')
    .select(`
      slip_id,
      slip_selections (
        *,
        matches (
          id,
          home_team,
          away_team,
          status,
          kick_off_time,
          leagues (name, countries (flag_emoji, name))
        ),
        match_markets (
          id,
          market_templates (
            name,
            market_categories (name)
          ),
          match_market_odds (
            selection,
            odd_value
          )
        )
      )
    `)
    .eq('slip_id', slipId)
    .single()

  if (!slip) {
    return {
      success: false,
      error: 'Slip not found',
    }
  }

  const selections =
    (slip.slip_selections as any[]) ?? []

  const enriched = selections.map((s) => {
    const match = s.matches as any
    const market = s.match_markets as any
    const template =
      market?.market_templates as any
    const currentOddRow =
      market?.match_market_odds?.find(
        (o: any) => o.selection === s.selection
      )

    const currentOdd =
      currentOddRow?.odd_value ??
      s.odd_at_placement

    const leagues = match?.leagues as any
    const countries =
      leagues?.countries as any

    return {
      matchId: match?.id ?? '',
      matchMarketId: market?.id ?? '',
      homeTeam: match?.home_team ?? '',
      awayTeam: match?.away_team ?? '',
      leagueName: leagues?.name ?? '',
      countryFlag:
        countries?.flag_emoji ?? '🏳️',
      marketName: template?.name ?? '',
      categoryName:
        template?.market_categories?.name ??
        '',
      selection: s.selection,
      odd: currentOdd,
      kickOffTime:
        match?.kick_off_time ?? '',
      matchStatus: match?.status ?? 'upcoming',
      currentOdd,
      originalOdd: s.odd_at_placement,
      oddChanged:
        currentOdd !== s.odd_at_placement,
      matchStarted:
        match?.status !== 'upcoming',
    }
  })

  return {
    success: true,
    data: {
      selections: enriched,
      originalSlipId: slip.slip_id,
    },
  }
}