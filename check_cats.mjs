import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key in env')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data: categories, error: catErr } = await supabase
  .from('market_categories')
  .select('id, name, display_order')
  .order('display_order')

if (catErr) {
  console.error('Category fetch error:', catErr)
  process.exit(1)
}

for (const cat of categories) {
  const { count } = await supabase
    .from('market_templates')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', cat.id)
  console.log('"' + cat.name + '" (order ' + cat.display_order + '): ' + count + ' templates')
}

const { data: allTemplates } = await supabase
  .from('market_templates')
  .select('id, name, category_id')

const catIds = new Set(categories.map(c => c.id))
const orphaned = allTemplates?.filter(t => !catIds.has(t.category_id)) ?? []
console.log('')
console.log('Orphaned templates: ' + orphaned.length)
orphaned.forEach(t => console.log('  - ' + t.name + ' (category_id: ' + t.category_id + ')'))
