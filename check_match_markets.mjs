import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: matches } = await supabase
  .from('matches')
  .select('id, home_team, away_team, kick_off_time')
  .order('created_at', { ascending: false })
  .limit(10)
console.log('Recent matches:')
console.log(JSON.stringify(matches, null, 2))
