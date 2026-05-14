import { redirect } from 'next/navigation'
import { createClient }
  from '@/lib/supabase/server'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } =
    await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-charcoal px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-white mb-6">
        My Profile
      </h1>
      <p className="text-white/50">
        Full profile page coming in Phase 6.
      </p>
    </div>
  )
}