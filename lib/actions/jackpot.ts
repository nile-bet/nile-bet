'use server'

import { createClient }
  from '@/lib/supabase/server'
import type { JackpotWithMatches }
  from '@/types/database.types'

export async function getActiveJackpot(): Promise<JackpotWithMatches | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('jackpots')
    .select(`
      *,
      jackpot_matches (*)
    `)
    .eq('status', 'open')
    .gt('closes_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  const result = {
    ...data,
    jackpot_matches: (
      data.jackpot_matches ?? []
    ).sort(
      (a: any, b: any) =>
        a.game_number - b.game_number
    ),
  }

  return result as unknown as JackpotWithMatches
}

export async function placeJackpotBet(input: {
  jackpotId: string
  bettorId: string
  placedById: string
  selections: {
    jackpotMatchId: string
    gameNumber: number
    selection: 'home' | 'draw' | 'away'
  }[]
  isAnonymous: boolean
}): Promise<{
  success: boolean
  slipId?: string
  error?: string
}> {
  const supabase = await createClient()

  const {
    jackpotId,
    bettorId,
    placedById,
    selections,
    isAnonymous,
  } = input

  // Validate 12 selections
  if (selections.length !== 12) {
    return {
      success: false,
      error: 'You must select all 12 games',
    }
  }

  // Check jackpot open
  const { data: jackpot } = await supabase
    .from('jackpots')
    .select('*')
    .eq('id', jackpotId)
    .eq('status', 'open')
    .single()

  if (!jackpot) {
    return {
      success: false,
      error: 'Jackpot is not available',
    }
  }

  // Check balance
  const stake = jackpot.fixed_stake ?? 50

  const { data: placer } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', placedById)
    .single()

  if (!placer || placer.credit_balance < stake) {
    return {
      success: false,
      error: `Insufficient balance. You need ETB ${stake} to enter the jackpot.`,
    }
  }

  // Generate JP slip ID
  const { data: slipIdData } = await supabase
    .rpc('generate_jackpot_slip_id')

  const slipId = slipIdData as string

  // Insert jackpot slip
  const { data: slip, error: slipError } =
    await supabase
      .from('jackpot_slips')
      .insert({
        slip_id: slipId,
        jackpot_id: jackpotId,
        bettor_id: bettorId,
        placed_by: placedById,
        stake,
        status: 'pending',
        is_anonymous: isAnonymous,
      })
      .select('id')
      .single()

  if (slipError || !slip) {
    return {
      success: false,
      error: 'Failed to create jackpot slip',
    }
  }

  // Insert selections
  const rows = selections.map((s) => ({
    jackpot_slip_id: slip.id,
    jackpot_match_id: s.jackpotMatchId,
    game_number: s.gameNumber,
    selection: s.selection,
    result: 'pending',
  }))

  await supabase
    .from('jackpot_slip_selections')
    .insert(rows)

  // Deduct balance
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
    amount: stake,
    type: 'bet_placed',
    reference_id: slip.id,
    note: `Jackpot entry: ${slipId}`,
  })

  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: placedById,
    action: 'jackpot_bet_placed',
    details: { slip_id: slipId, stake },
  })

  return { success: true, slipId }
}