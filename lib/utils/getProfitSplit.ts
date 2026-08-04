import { createAdminClient } from '@/lib/supabase/server'

/**
 * Reads cashier_profit_percent / agent_profit_percent from platform_settings
 * and returns them as decimals (e.g. 40 -> 0.4). Uses the admin (service role)
 * client since this table's RLS may not permit anon/authenticated reads, and
 * this is trusted internal calculation logic, not user-facing data.
 * Falls back to 40/60 split if the settings row is missing.
 */
export async function getProfitSplit(): Promise<{
  cashierPct: number
  agentPct: number
}> {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('platform_settings')
    .select('key, value')
    .in('key', ['cashier_profit_percent', 'agent_profit_percent'])

  if (error) {
    console.error('getProfitSplit error:', error)
  }

  const map: Record<string, string> = {}
  data?.forEach((s: any) => {
    map[s.key] = s.value
  })

  const cashierPct = (parseFloat(map.cashier_profit_percent ?? '40') || 40) / 100
  const agentPct = (parseFloat(map.agent_profit_percent ?? '60') || 60) / 100

  return { cashierPct, agentPct }
}
