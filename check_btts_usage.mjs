import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const ids = ['66b9de6e-e3a5-4933-83cc-1d7f60906b6b', '2f6df571-967b-400a-bd9b-12f8fa9ec179'] // BTTS & Over 2.5, BTTS & Under 2.5

const { data } = await supabase
  .from('match_markets')
  .select('id, match_id, market_template_id')
  .in('market_template_id', ids)

console.log(`Matches using these templates: ${data?.length ?? 0}`)
console.log(JSON.stringify(data, null, 2))
