import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const MATCH_ID = '8c08f4b8-cdf6-4e75-af6f-fd8430240970' // Manchester Utd vs Arsenal

const { data } = await supabase
  .from('match_markets')
  .select(`
    id,
    is_enabled,
    market_templates (
      id,
      name,
      market_categories (name)
    )
  `)
  .eq('match_id', MATCH_ID)

const combo = (data ?? []).filter(m => m.market_templates?.market_categories?.name === 'COMBO')
console.log(`Total match_markets: ${data?.length}`)
console.log(`COMBO category markets: ${combo.length}`)
console.log(JSON.stringify(combo, null, 2))
