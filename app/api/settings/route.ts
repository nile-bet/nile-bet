import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createAdminClient()
    const { data } = await supabase.from('platform_settings').select('key, value')
    const map: Record<string, string> = {}
    ;(data ?? []).forEach((s: any) => { map[s.key] = s.value })
    return NextResponse.json({ success: true, settings: map })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
