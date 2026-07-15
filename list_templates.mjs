import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await supabase
  .from('market_templates')
  .select('id, name, selections, is_dynamic, category_id, market_categories(name)')
  .order('category_id')
console.log(JSON.stringify(data, null, 2))
