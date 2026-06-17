import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { jackpotId, selections } = await req.json()
    const supabase = await createAdminClient()

    // Generate JP + 8 digit code, checked against existing jackpot_slips for uniqueness
    let slipCode = ''
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = 'JP' + Math.floor(10000000 + Math.random() * 90000000).toString()
      const { data: existing } = await supabase
        .from('jackpot_slips')
        .select('id')
        .eq('slip_id', candidate)
        .maybeSingle()
      if (!existing) {
        slipCode = candidate
        break
      }
    }
    if (!slipCode) {
      return NextResponse.json({ success: false, error: 'Failed to generate a unique slip ID, please try again' }, { status: 500 })
    }

    // Validate jackpot is open
    const { data: jackpot } = await supabase
      .from('jackpots').select('*').eq('id', jackpotId).single()

    if (!jackpot) return NextResponse.json({ success: false, error: 'Jackpot not found' }, { status: 404 })
    if (!['open', 'draft'].includes(jackpot.status)) return NextResponse.json({ success: false, error: 'Jackpot is not open for betting' }, { status: 400 })
    if (selections.length !== 12) return NextResponse.json({ success: false, error: 'Must select all 12 games' }, { status: 400 })

    // Insert anonymous slip
    const { data: slip, error: slipError } = await supabase
      .from('jackpot_slips')
      .insert({
        slip_id: slipCode,
        jackpot_id: jackpotId,
        bettor_id: null,
        placed_by: null,
        stake: jackpot.fixed_stake ?? 50,
        is_anonymous: true,
        status: 'pending',
      })
      .select('id')
      .single()

    if (slipError || !slip) {
      console.error('Slip insert error:', slipError)
      return NextResponse.json({ success: false, error: slipError?.message ?? 'Failed to save slip' }, { status: 500 })
    }

    // Insert selections
    const selectionRows = selections.map((s: any) => ({
      jackpot_slip_id: slip.id,
      game_number: s.gameNumber,
      selection: s.selection,
      result: 'pending',
    }))

    const { error: selError } = await supabase
      .from('jackpot_slip_selections')
      .insert(selectionRows)

    if (selError) {
      console.error('Selection insert error:', selError)
      await supabase.from('jackpot_slips').delete().eq('id', slip.id)
      return NextResponse.json({ success: false, error: selError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, slipCode })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
