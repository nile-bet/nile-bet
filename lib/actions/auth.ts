'use server'

import { createClient }
  from '@/lib/supabase/server'
import { createAdminClient }
  from '@/lib/supabase/server'

export async function loginUser(
  username: string,
  password: string
): Promise<{
  success: boolean
  error?: string
  role?: string
  attemptsLeft?: number
}> {
  try {
  const supabase = await createClient()

  // Get profile by username
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) {
    return {
      success: false,
      error: 'Invalid username or password',
    }
  }

  // Check if locked
  if (profile.locked_until) {
    const lockedUntil = new Date(
      profile.locked_until
    )
    if (lockedUntil > new Date()) {
      return {
        success: false,
        error:
          'Account locked due to too many failed attempts. Contact your admin.',
      }
    }
  }

  // Get settings
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', ['login_attempt_limit'])

  const limit = parseInt(
    settings?.find(
      (s: any) => s.key === 'login_attempt_limit'
    )?.value ?? '5'
  )

  // Attempt login
  const email = `${username}@nilebet.internal`
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })
  console.log("LOGIN DEBUG:", { error: authError?.message, hasUser: !!authData?.user })

  if (authError || !authData.user) {
    // Increment attempts
    const newAttempts =
      (profile.login_attempts ?? 0) + 1

    if (newAttempts >= limit) {
      // Lock account
      const lockedUntil = new Date()
      lockedUntil.setHours(
        lockedUntil.getHours() + 24
      )

      await supabase
        .from('profiles')
        .update({
          login_attempts: newAttempts,
          locked_until:
            lockedUntil.toISOString(),
        })
        .eq('id', profile.id)

      // Notify admin
      const { data: admin } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (admin) {
        await supabase
          .from('notifications')
          .insert({
            to_user_id: admin.id,
            message: `⚠️ Account @${username} has been locked after ${limit} failed login attempts`,
            type: 'account_locked',
            priority: 'urgent',
          })
      }

      return {
        success: false,
        error:
          'Account locked due to too many failed attempts. Contact your admin.',
      }
    }

    await supabase
      .from('profiles')
      .update({
        login_attempts: newAttempts,
      })
      .eq('id', profile.id)

    const attemptsLeft = limit - newAttempts

    return {
      success: false,
      error:
        attemptsLeft <= 2
          ? `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before lockout.`
          : 'Invalid username or password',
      attemptsLeft,
    }
  }

  // Success: reset attempts
  await supabase
    .from('profiles')
    .update({
      login_attempts: 0,
      locked_until: null,
      last_login: new Date().toISOString(),
    })
    .eq('id', profile.id)

  return {
    success: true,
    role: profile.role,
  }
  } catch (err) {
    console.error("loginUser error:", err)
    return { success: false, error: String(err) }
  }
}

export async function registerBettor(
  username: string,
  password: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Check username unique
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: 'Username already taken',
    }
  }

  // Validate
  if (
    username.length < 3 ||
    username.length > 20
  ) {
    return {
      success: false,
      error:
        'Username must be 3-20 characters',
    }
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      success: false,
      error:
        'Username can only contain letters, numbers and underscores',
    }
  }

  if (password.length < 8) {
    return {
      success: false,
      error:
        'Password must be at least 8 characters',
    }
  }

  // Create auth user
  const email = `${username}@nilebet.internal`
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    })

  if (authError || !authData.user) {
    return {
      success: false,
      error:
        authError?.message ??
        'Failed to create account',
    }
  }

  // Create profile
  const { error: profileError } =
    await adminClient.from('profiles').insert({
      id: authData.user.id,
      username,
      role: 'bettor',
      status: 'active',
      credit_balance: 0,
    })

  if (profileError) {
    // Cleanup auth user
    await adminClient.auth.admin.deleteUser(
      authData.user.id
    )
    return {
      success: false,
      error: 'Failed to create profile',
    }
  }

  // Auto sign in
  await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // Log activity
  await supabase.from('activity_logs').insert(
    {
      user_id: authData.user.id,
      action: 'register',
      details: { username, role: 'bettor' },
    }
  )

  return { success: true }
}

export async function checkUsernameAvailable(
  username: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  return !data
}