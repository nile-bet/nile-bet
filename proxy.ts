import { NextResponse } from 'next/server'
import type { NextRequest }
  from 'next/server'
import { createServerClient }
  from '@supabase/ssr'

export async function proxy(
  request: NextRequest
) {
  let supabaseResponse =
    NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) =>
              request.cookies.set(name, value)
          )
          supabaseResponse =
            NextResponse.next({ request })
          cookiesToSet.forEach(
            ({ name, value, options }) =>
              supabaseResponse.cookies.set(
                name, value, options
              )
          )
        },
      },
    }
  )

  const { data: { user } } =
    await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const publicPaths = [
    '/',
    '/check-slip',
    '/results',
    '/weekend-jackpot',
    '/weekend-jackpot/results',
    '/rules',
    '/privacy',
    '/terms',
    '/about',
    '/login',
    '/register',
    '/maintenance',
    '/suspended',
  ]

  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/slip/') ||
    pathname.startsWith('/match/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')

  if (!user) {
    if (isPublic) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const { data: profile } =
    await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

  const role = profile?.role
  const status = profile?.status

  // Suspended
  if (
    status === 'suspended' &&
    pathname !== '/suspended'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/suspended'
    return NextResponse.redirect(url)
  }

  // Redirect from login/register
  if (
    pathname === '/login' ||
    pathname === '/register'
  ) {
    const url = request.nextUrl.clone()
    url.pathname =
      role === 'admin'
        ? '/dashboard'
        : role === 'agent'
        ? '/agent-dashboard'
        : role === 'cashier'
        ? '/cashier-dashboard'
        : '/'
    return NextResponse.redirect(url)
  }

  // Protect admin routes
  if (
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/matches') ||
      pathname.startsWith('/users') ||
      pathname.startsWith('/credits') ||
      pathname.startsWith('/coupons') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/broadcast') ||
      pathname.startsWith('/activity') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/jackpot')) &&
    role !== 'admin'
  ) {
    const url = request.nextUrl.clone()
    url.pathname =
      role === 'agent'
        ? '/agent-dashboard'
        : role === 'cashier'
        ? '/cashier-dashboard'
        : '/'
    return NextResponse.redirect(url)
  }

  // Protect agent routes
  if (
    pathname.startsWith('/agent-') &&
    role !== 'agent'
  ) {
    const url = request.nextUrl.clone()
    url.pathname =
      role === 'admin'
        ? '/dashboard'
        : role === 'cashier'
        ? '/cashier-dashboard'
        : '/'
    return NextResponse.redirect(url)
  }

  // Protect cashier routes
  if (
    pathname.startsWith('/cashier-') &&
    role !== 'cashier'
  ) {
    const url = request.nextUrl.clone()
    url.pathname =
      role === 'admin'
        ? '/dashboard'
        : role === 'agent'
        ? '/agent-dashboard'
        : '/'
    return NextResponse.redirect(url)
  }

  // Protect bettor routes
  if (
    (pathname.startsWith('/bettor-') ||
      pathname === '/bettor-bets' ||
      pathname === '/bettor-profile' ||
      pathname === '/notifications') &&
    !user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}