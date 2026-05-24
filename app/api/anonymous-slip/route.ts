import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { selections, stake } = await req.json()
    const supabase = await createAdminClient()

    // Generate 8-digit code
    const slipCode = Math.floor(10000000 + Math.random() * 90000000).toString()

    // Calculate
    const totalOdds = selections.reduce((acc: number, s: any) => acc * s.odd, 1)
    const maxPayout = stake * totalOdds
    const winningTax = maxPayout * 0.15
    const netPayout = maxPayout - winningTax

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
      return NextResponse.json({ success: false, error: slipError?.message ?? 'Failed to save slip' }, { status: 500 })
    }

    const selectionRows = selections.map((s: any) => ({
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
      return NextResponse.json({ success: false, error: selError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, slipCode })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
