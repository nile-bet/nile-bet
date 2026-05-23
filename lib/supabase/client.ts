import { createBrowserClient }
  from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (key: string) =>
            sessionStorage.getItem(key),
          setItem: (key: string, value: string) =>
            sessionStorage.setItem(key, value),
          removeItem: (key: string) =>
            sessionStorage.removeItem(key),
        },
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  )
}
