import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const COMBO_CATEGORY_ID = '80d1cc9e-ec0f-42cb-aa54-631f6bb83c2a'

const newTemplates = [
  {
    name: 'BTTS + Over/Under 1.5',
    selections: ['Yes & Over', 'Yes & Under', 'No & Over', 'No & Under'],
    is_dynamic: false,
    category_id: COMBO_CATEGORY_ID,
  },
  {
    name: 'Win & Over 1.5',
    selections: ['Home & Over', 'Away & Over'],
    is_dynamic: false,
    category_id: COMBO_CATEGORY_ID,
  },
  {
    name: 'Win & Under 1.5',
    selections: ['Home & Under', 'Away & Under'],
    is_dynamic: false,
    category_id: COMBO_CATEGORY_ID,
  },
  {
    name: 'Win & Over 3.5',
    selections: ['Home & Over', 'Away & Over'],
    is_dynamic: false,
    category_id: COMBO_CATEGORY_ID,
  },
  {
    name: 'Win & Under 3.5',
    selections: ['Home & Under', 'Away & Under'],
    is_dynamic: false,
    category_id: COMBO_CATEGORY_ID,
  },
]

const { data, error } = await supabase
  .from('market_templates')
  .insert(newTemplates)
  .select('id, name, selections')

if (error) {
  console.error('Error:', error)
} else {
  console.log(`Inserted ${data.length} new templates:`)
  console.log(JSON.stringify(data, null, 2))
}
