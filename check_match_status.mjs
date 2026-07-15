import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const matchIds = [
  'c80bccd1-9a85-4128-96a0-70f559bb2c02',
  '649fd53c-bf6d-4615-bac5-7843aeb9fc48',
  '01f0a298-47e9-4dab-ace9-5750ef387f16',
  '8c08f4b8-cdf6-4e75-af6f-fd8430240970',
  'cf42ed39-9727-4aea-a29e-c054250f5120',
]

const { data } = await supabase
  .from('matches')
  .select('id, home_team, away_team, status')
  .in('id', matchIds)

console.log(JSON.stringify(data, null, 2))
