import { createBrowserClient }
  from '@supabase/ssr'

const SESSION_KEY = 'nile_session_active'

// If no sessionStorage marker, clear all supabase cookies/localStorage
if (typeof window !== 'undefined') {
  if (!sessionStorage.getItem(SESSION_KEY)) {
    // Window was closed and reopened - sign out
    const keys = Object.keys(localStorage)
    keys.forEach((k) => {
      if (k.startsWith('sb-') || k.includes('supabase')) {
        localStorage.removeItem(k)
      }
    })
    // Clear supabase cookies by expiring them
    document.cookie.split(';').forEach((c) => {
      const key = c.trim().split('=')[0]
      if (key.startsWith('sb-') || key.includes('supabase')) {
        document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      }
    })
  }
  sessionStorage.setItem(SESSION_KEY, '1')
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
