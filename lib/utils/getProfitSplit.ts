import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reads cashier_profit_percent / agent_profit_percent from platform_settings
 * and returns them as decimals (e.g. 40 -> 0.4). Falls back to 40/60 split
 * if the settings row is missing so behavior degrades gracefully.
 */
export async function getProfitSplit(
  supabase: SupabaseClient
): Promise<{ cashierPct: number; agentPct: number }> {
  const { data } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', ['cashier_profit_percent', 'agent_profit_percent'])

  const map: Record<string, string> = {}
  data?.forEach((s: any) => {
    map[s.key] = s.value
  })

  const cashierPct = (parseFloat(map.cashier_profit_percent ?? '40') || 40) / 100
  const agentPct = (parseFloat(map.agent_profit_percent ?? '60') || 60) / 100

  return { cashierPct, agentPct }
}
