import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await supabase
  .from('market_templates')
  .select('id, name, selections, category_id')
  .eq('category_id', '80d1cc9e-ec0f-42cb-aa54-631f6bb83c2a')
  .order('name')
console.log(JSON.stringify(data, null, 2))
