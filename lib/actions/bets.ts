'use server'

import { createClient, createAdminClient }
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

  // Check placer balance <
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

  // Refund stake <
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
  const supabase = await createAdminClient()

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
export async function redeemWinningSlip(
  slipId: string,
  cashierId: string
): Promise<{ success: boolean; amount?: number; error?: string }> {
  const supabase = await createClient()
  const { data: slip } = await supabase
    .from('slips')
    .select('id, slip_id, status, net_payout, bettor_id, placed_by')
    .eq('slip_id', slipId)
    .single()
  if (!slip) return { success: false, error: 'Slip not found' }
  if (slip.status === 'paid') return { success: false, error: 'Slip already redeemed' }
  if (slip.status !== 'won') return { success: false, error: 'Slip is ' + slip.status + ', only won slips can be redeemed' }
  const { data: updatedRows, error: slipErr } = await supabase
    .from('slips')
    .update({ status: 'paid', redeemed_at: new Date().toISOString(), redeemed_by: cashierId })
    .eq('id', slip.id)
    .eq('status', 'won')
    .select('id')
  if (slipErr) return { success: false, error: 'Failed to update slip status: ' + slipErr.message }
  if ((updatedRows ?? []).length === 0) {
    return { success: false, error: 'Slip was already redeemed (possibly by another cashier)' }
  }
  await supabase.from('transactions').insert({
    profile_id: cashierId,
    type: 'winning_payout',
    amount: slip.net_payout,
    reference_id: slip.id,
    note: 'Winning payout redeemed for slip ' + slipId,
  })
  return { success: true, amount: slip.net_payout }
}

export async function redeemJackpotWinningSlip(
  slipId: string,
  cashierId: string
): Promise<{ success: boolean; amount?: number; status?: string; correctCount?: number; error?: string }> {
  const supabase = await createClient()

  const { data: slip } = await supabase
    .from('jackpot_slips')
    .select('id, slip_id, status, reward_amount, bettor_id')
    .eq('slip_id', slipId)
    .single()

  if (!slip) return { success: false, error: 'Jackpot slip not found' }
  if (slip.status === 'paid') {
    return { success: false, error: 'Slip already redeemed', status: slip.status }
  }
  if (!['won', 'near_win'].includes(slip.status)) {
    return { success: false, error: `Slip is ${slip.status} — only won/near_win slips can be redeemed`, status: slip.status }
  }
  if (!slip.reward_amount || slip.reward_amount <= 0) {
    return { success: false, error: 'No reward amount for this slip' }
  }

  // Atomic mark-as-paid: WHERE re-checks the original status at the DB level,
  // so concurrent/duplicate redemption attempts can only succeed once.
  const { data: updatedRows, error: slipErr } = await supabase
    .from('jackpot_slips')
    .update({ status: 'paid', redeemed_at: new Date().toISOString(), redeemed_by: cashierId })
    .eq('id', slip.id)
    .eq('status', slip.status)
    .select('id')

  if (slipErr) return { success: false, error: 'Failed to update slip status: ' + slipErr.message }
  if (!updatedRows || updatedRows.length === 0) {
    return { success: false, error: 'Slip was already redeemed (possibly by another cashier)' }
  }

  // Log transaction only — redemption does not change the redeemer's wallet balance.
  await supabase.from('transactions').insert({
    profile_id: cashierId,
    type: 'jackpot_payout',
    amount: slip.reward_amount,
    reference_id: slip.id,
    note: `Jackpot payout redeemed for slip ${slipId}`,
  })

  return { success: true, amount: slip.reward_amount }
}

export async function saveAnonymousSlip(input: {
  selections: BetSlipSelection[]
  stake: number
}): Promise<{
  success: boolean
  slipCode?: string
  error?: string
}> {
  const supabase = await createClient()

  const { selections, stake } = input

  // Generate 8-digit code (DB-checked for uniqueness)
  const { data: slipCodeData } = await supabase.rpc('generate_slip_id')
  const slipCode = slipCodeData as string

  // Calculate odds
  const totalOdds = selections.reduce((acc, s) => acc * s.odd, 1)
  const maxPayout = stake * totalOdds
  const winningTax = maxPayout * 0.15
  const netPayout = maxPayout - winningTax

  // Insert anonymous slip
  const { data: slip, error: slipError } = await supabase
    .from('slips')
    .insert({
      slip_id: slipCode,
      bettor_id: null,
      placed_by: null,
      stake,
      total_odds: parseFloat(totalOdds.toFixed(2)),
      max_payout: parseFloat(maxPayout.toFixed(2)),
      winning_tax: parseFloat(winningTax.toFixed(2)),
      net_payout: parseFloat(netPayout.toFixed(2)),
      status: 'pending',
      is_anonymous: true,
      cancellation_deadline: null,
    })
    .select('id')
    .single()

  if (slipError || !slip) {
    return { success: false, error: 'Failed to save slip' }
  }

  // Insert selections
  const selectionRows = selections.map((s) => ({
    slip_id: slip.id,
    match_id: s.matchId,
    match_market_id: s.matchMarketId,
    selection: s.selection,
    odd_at_placement: s.odd,
    result: 'pending',
  }))

  const { error: selError } = await supabase
    .from('slip_selections')
    .insert(selectionRows)

  if (selError) {
    await supabase.from('slips').delete().eq('id', slip.id)
    return { success: false, error: 'Failed to save selections' }
  }

  return { success: true, slipCode }
}

// ─── Rebet: place a new slip identical to original, deduct balance ───
export async function rebetSlip(
  originalSlipId: string,
  placedById: string,
  bettorId: string,
  stake: number,
  isAnonymous: boolean
): Promise<{ success: boolean; newSlipId?: string; error?: string }> {
  const adminClient = await createAdminClient()

  // 1. Get original slip selections
  const { data: slip } = await adminClient
    .from('slips')
    .select(`slip_id, stake, is_anonymous, slip_selections(*, match_markets(id, match_market_odds(selection, odd_value)))`)
    .eq('slip_id', originalSlipId)
    .single()

  if (!slip) return { success: false, error: 'Original slip not found' }

  // 2. Check bettor balance
  const { data: bettor } = await adminClient
    .from('profiles')
    .select('credit_balance')
    .eq('id', bettorId)
    .single()

  if (!bettor) return { success: false, error: 'Bettor not found' }
  if ((bettor.credit_balance ?? 0) < stake) return { success: false, error: `Insufficient balance. Need ETB ${stake}` }

  // 3. Build selections with current odds
  const selections = (slip.slip_selections as any[]) ?? []
  if (selections.length === 0) return { success: false, error: 'No selections found' }

  const newSelections = selections.map((s: any) => {
    const currentOdd = s.match_markets?.match_market_odds?.find((o: any) => o.selection === s.selection)?.odd_value ?? s.odd_at_placement
    return { matchMarketId: s.match_market_id, selection: s.selection, oddAtPlacement: currentOdd }
  })

  // 4. Generate new slip ID (DB-checked for uniqueness)
  const { data: newSlipIdData } = await adminClient.rpc('generate_slip_id')
  const newSlipId = newSlipIdData as string

  // 5. Calculate total odds & max payout
  const totalOdds = newSelections.reduce((acc: number, s: any) => acc * s.oddAtPlacement, 1)
  const maxPayout = stake * totalOdds
  const winningTax = maxPayout * 0.15
  const netPayout = maxPayout - winningTax

  // 6. Deduct balance
  const { error: deductErr } = await adminClient
    .from('profiles')
    .update({ credit_balance: bettor.credit_balance - stake })
    .eq('id', bettorId)
  if (deductErr) return { success: false, error: 'Failed to deduct balance' }

  // 7. Insert new slip
  const { data: newSlip, error: slipErr } = await adminClient
    .from('slips')
    .insert({
      slip_id: newSlipId,
      bettor_id: bettorId,
      placed_by: placedById,
      stake,
      total_odds: totalOdds,
      max_payout: maxPayout,
      winning_tax: winningTax,
      net_payout: netPayout,
      status: 'pending',
      is_anonymous: isAnonymous,
    })
    .select('id')
    .single()

  if (slipErr || !newSlip) {
    // refund
    await adminClient.from('profiles').update({ credit_balance: bettor.credit_balance }).eq('id', bettorId)
    return { success: false, error: 'Failed to create new slip' }
  }

  // 8. Insert selections
  const { error: selErr } = await adminClient
    .from('slip_selections')
    .insert(newSelections.map((s: any) => ({
      slip_id: newSlip.id,
      match_market_id: s.matchMarketId,
      selection: s.selection,
      odd_at_placement: s.oddAtPlacement,
    })))

  if (selErr) {
    await adminClient.from('profiles').update({ credit_balance: bettor.credit_balance }).eq('id', bettorId)
    return { success: false, error: 'Failed to insert selections' }
  }

  // 9. Log
  await adminClient.from('activity_logs').insert({
    user_id: placedById,
    action: 'slip_rebet',
    details: { original_slip_id: originalSlipId, new_slip_id: newSlipId, stake },
  })

  return { success: true, newSlipId }
}

// ─── Rebet Jackpot: place new jackpot slip identical to original ───
export async function rebetJackpotSlip(
  originalSlipId: string,
  placedById: string,
  bettorId: string,
  isAnonymous: boolean
): Promise<{ success: boolean; newSlipId?: string; error?: string }> {
  const { placeJackpotBet, getJackpotSlipById } = await import('@/lib/actions/jackpot')
  const slip = await getJackpotSlipById(originalSlipId)
  if (!slip) return { success: false, error: 'Original jackpot slip not found' }

  const selections = ((slip as any).jackpot_slip_selections ?? []).map((s: any) => ({
    gameNumber: s.game_number,
    selection: s.selection as 'home' | 'draw' | 'away',
    odd: s.jackpot_matches?.home_odd ?? 1,
  }))

  const result = await placeJackpotBet({
    jackpotId: (slip as any).jackpot_id,
    bettorId,
    placedById,
    isAnonymous,
    selections,
  })

  return result.success
    ? { success: true, newSlipId: result.slipId }
    : { success: false, error: result.error }
}
